// Collect blunder positions covering all 35 evaluation predicates.
// Run from connect-four/:
//   node server/scripts/generate_eval_set.mjs [output.json]
//
// Stops when all 35 predicates are satisfied or 10 000 games played.
// Writes eval_set.json after each newly satisfied predicate (crash-safe).

import { writeFileSync } from 'fs';
import { Board, getMajorThreatCells, tagBlunder } from '../classifier.js';
import { buildExplainContext, getMinorThreatWindows } from '../explainContext.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { harvestBlunders } from '../gameSampling.js';

const MAX_GAMES = 10_000;

// Minimum number of SPARSE / "anchorless" boards the eval set must exercise: positions
// where the deep-reveal forward look-ahead actually triggers. The authoritative gate is
// buildExplainContext's `isSparse` flag (isAnchorlessPosition: no threat-comparison row
// shown AND allowedSet === null) — NOT a pre-move Tier-1/2 scan. A pre-move scan diverges:
// the better move's own board can introduce a Tier-1/2 pattern (→ allowedSet non-null →
// not anchorless), and a "quiet" board can still show a meaningful threat row. So we ask
// buildExplainContext directly (with the look-ahead search skipped — we only need the gate).
const SPARSE_TARGET = 10;

const outPath = process.argv[2] || 'server/scripts/eval_set.json';

// Game simulation + blunder-ply iteration live in ../gameSampling.js
// (harvestBlunders). This script only adds the predicate-coverage logic on top.

// ── Predicate definitions ──────────────────────────────────────────────────────

// Maps "tag:direction" → predicate ID for P11–P31
const TAG_PREDICATE = new Map([
  ['immediate_threat:missed_own',       'P11'],
  ['immediate_threat:enabled_opponent', 'P12'],
  ['forced_block:defensive_miss',       'P13'],
  ['forced_win:missed_own',             'P14'],
  ['forced_win:enabled_opponent',       'P15'],
  ['double_threat:missed_own',          'P16'],
  ['double_threat:enabled_opponent',    'P17'],
  ['undercut:enabled_opponent',         'P18'],
  ['overcut:missed_own',                'P19'],
  ['figure_7:missed_own',              'P20'],
  ['figure_7:enabled_opponent',        'P21'],
  ['j_shape:missed_own',               'P22'],
  ['j_shape:enabled_opponent',         'P23'],
  ['z_threat:missed_own',              'P24'],
  ['z_threat:enabled_opponent',        'P25'],
  ['odd_even_threat:missed_own',       'P26'],
  ['odd_even_threat:enabled_opponent', 'P27'],
  ['claimeven:missed_own',             'P28'],
  ['claimeven:enabled_opponent',       'P29'],
  ['drawing_move:missed_own',          'P30'],
  ['suboptimal_move:missed_own',       'P31'],
]);

// P09 removed: structurally impossible — placing your own disc cannot create
// new major threats for the opponent (you add your disc, not theirs).
//
// P33 redefined: prompt contains ONLY always-include KB terms (no position-specific
// pattern fired). always-include IDs: allen-major-threat, allen-minor-threat,
// community-gravity-top, allen-parity.
// These are PATTERN_KB keys (not article IDs) — always_include entries use patternKey as tagId
// because patternKey !== kbEntry.id makes them look like aliases in buildExplainContext.
const ALWAYS_INCLUDE_TERM_IDS = new Set([
  'major_threat', 'minor_threat', 'gravity_top', 'parity',
]);

// Returns true if the KB term definitions section contains at least one term beyond
// the always-include entries. Scans only the ## KB term definitions block to avoid
// matching the [term:CONCEPT_ID] placeholder in the LLM format-instruction section.
function hasPositionSpecificKBTerms(prompt) {
  const sectionMatch = prompt.match(/## KB term definitions\n[\s\S]*?(?=\n##|$)/);
  if (!sectionMatch) return false;
  const section = sectionMatch[0];
  const matches = section.matchAll(/\[term:([^\]]+)\]/g);
  for (const [, id] of matches) {
    if (!ALWAYS_INCLUDE_TERM_IDS.has(id)) return true;
  }
  return false;
}

const ALL_PREDICATES = new Set([
  'P01','P02','P03','P04','P05','P06','P07','P08','P10',
  'P11','P12','P13','P14','P15','P16','P17','P18','P19','P20',
  'P21','P22','P23','P24','P25','P26','P27','P28','P29','P30',
  'P31','P32','P33','P34','P35','P36',
]); // P09 removed (35 predicates total)

const TAG_PREDICATES = new Set([...TAG_PREDICATE.values()]);

// ── Cheap predicate computation (no solver calls) ──────────────────────────────

function computeCheapPredicates(boardState, move, bestCol, severity, preBoard, postBoard, perspective) {
  const preds = new Set();

  // P01/P02: which player is blundering
  if (boardState.length % 2 === 0) preds.add('P01'); // Red
  else preds.add('P02'); // Yellow

  // P03/P04: blunder severity
  if (severity >= 1 && severity <= 3) preds.add('P03');
  if (severity >= 7) preds.add('P04');

  // P05–P08: minor threats before the move
  const playerDisc = perspective;
  const oppDisc = 3 - perspective;
  const playerMinor = getMinorThreatWindows(preBoard.board, playerDisc).length;
  const opponentMinor = getMinorThreatWindows(preBoard.board, oppDisc).length;
  if (playerMinor === 0 && opponentMinor === 0) preds.add('P05');
  if (playerMinor > 0 && opponentMinor === 0) preds.add('P06');
  if (playerMinor === 0 && opponentMinor > 0) preds.add('P07');
  if (playerMinor > 0 && opponentMinor > 0) preds.add('P08');

  // P10: opponent major threat count unchanged after the blunder
  const oppMajorFlag = perspective === 1 ? 'ym' : 'rm';
  const countOppMajor = (board) =>
    Object.values(getMajorThreatCells(board)).filter(f => f[oppMajorFlag]).length;
  const preMajor = countOppMajor(preBoard.board);
  const postMajor = countOppMajor(postBoard.board);
  if (postMajor === preMajor) preds.add('P10');

  // P34–P36: game phase
  if (boardState.length < 10) preds.add('P34');
  if (boardState.length >= 10 && boardState.length <= 24) preds.add('P35');
  if (boardState.length >= 25) preds.add('P36');

  return preds;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const solver = createSolverProcess();

  const predicateCounts = new Map(); // how many boards each predicate has appeared in
  const satisfied = new Set();       // predicates that have appeared in >= 2 boards
  const collected = [];
  let boardCount = 0;
  let gameCount = 0;
  let sparseCount = 0; // anchorless boards collected (forward look-ahead would trigger)

  const tagPredsDone   = () => [...TAG_PREDICATES].every(p => satisfied.has(p));
  const kbPredsDone    = () => satisfied.has('P32') && satisfied.has('P33');
  const sparseDone     = () => sparseCount >= SPARSE_TARGET;
  const allGoalsDone   = () => satisfied.size >= ALL_PREDICATES.size && sparseDone();

  // harvestBlunders plays mistake-weighted games and yields every non-optimal ply.
  for await (const ply of harvestBlunders(solver, { maxGames: MAX_GAMES })) {
    if (allGoalsDone()) break;

    const { boardState, movePlayed: move, correctCol: bestCol, severity, perspective } = ply;
    gameCount = ply.gameIndex;

    boardCount++;
    if (boardCount % 100 === 0) {
      const missing = [...ALL_PREDICATES].filter(p => !satisfied.has(p));
      process.stderr.write(`board ${boardCount}  game ${ply.gameIndex}  satisfied ${satisfied.size}/35  sparse ${sparseCount}/${SPARSE_TARGET}  missing: ${missing.join(' ')}\n`);
    }

    const preBoard  = new Board(boardState);
    const postBoard = new Board(boardState + move);

    const cheapPreds = computeCheapPredicates(
      boardState, move, bestCol, severity, preBoard, postBoard, perspective
    );

    // Skip if no cheap preds are new AND tag predicates are done AND KB predicates
    // are done AND we already have enough no-Tier-1/2 boards (nothing to gain).
    const newCheap = [...cheapPreds].filter(p => !satisfied.has(p));
    if (newCheap.length === 0 && tagPredsDone() && kbPredsDone() && sparseDone()) continue;

    // Call tagBlunder when tag predicates still need coverage
    let tagResult = null;
    if (!tagPredsDone() || newCheap.length > 0) {
      tagResult = await tagBlunder(boardState, move, bestCol, solver);
    }

    const allPreds = new Set(cheapPreds);
    if (tagResult) {
      const tagPred = TAG_PREDICATE.get(`${tagResult.tag}:${tagResult.direction}`);
      if (tagPred) allPreds.add(tagPred);
    }

    // One buildExplainContext call (forward look-ahead SKIPPED — we only need the gate
    // decision, not the expensive search) serves both the KB-term predicates (P32/P33)
    // and the sparse/anchorless determination. `ctx.isSparse` is the authoritative
    // forward-look-ahead trigger (isAnchorlessPosition), so collected sparse boards are
    // exactly the boards on which the look-ahead would fire.
    //   P32 = at least one position-specific KB term fired (beyond always-include entries).
    //   P33 = prompt has only always-include KB terms (no position-specific pattern).
    let isSparse = false;
    if (!kbPredsDone() || !sparseDone()) {
      try {
        const ctx = await buildExplainContext(boardState, move, 1, solver, { skipLookahead: true });
        if (ctx?.prompt) {
          if (!kbPredsDone()) {
            if (hasPositionSpecificKBTerms(ctx.prompt)) allPreds.add('P32');
            else allPreds.add('P33');
          }
          if (!sparseDone()) isSparse = ctx.isSparse === true;
        }
      } catch {
        // solver error on degenerate position; skip
      }
    }

    const newPreds = [...allPreds].filter(p => !satisfied.has(p));

    // Keep the board if it advances predicate coverage OR it is a still-needed
    // sparse / anchorless board.
    if (newPreds.length === 0 && !isSparse) continue;

    if (newPreds.length > 0) {
      const newlySatisfied = [];
      newPreds.forEach(p => {
        const count = (predicateCounts.get(p) || 0) + 1;
        predicateCounts.set(p, count);
        if (count >= 2) {
          satisfied.add(p);
          newlySatisfied.push(p);
        }
      });
      process.stderr.write(`  seen: ${newPreds.join(' ')}  done(×2): ${newlySatisfied.join(' ')} (${satisfied.size}/${ALL_PREDICATES.size} satisfied)\n`);
    }

    if (isSparse) {
      sparseCount++;
      process.stderr.write(`  sparse / anchorless board — look-ahead would fire (${sparseCount}/${SPARSE_TARGET})\n`);
    }

    // Build threat_cells from major threat flags at pre-blunder position
    const threatMap = getMajorThreatCells(preBoard.board);
    const threat_cells = Object.entries(threatMap)
      .filter(([, f]) => f.rm || f.ym)
      .map(([key]) => {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
      });

    collected.push({
      id: `eval-${collected.length}`,
      board_state: boardState,
      move_played: move,
      correct_move: bestCol,
      threat_cells,
      severity,
      blunder_severity: null,
      pattern_category: tagResult?.tag ?? null,
      predicates: [...allPreds].sort(),
      is_sparse: isSparse,
    });

    // Write incrementally so a kill mid-run preserves progress.
    writeFileSync(outPath, JSON.stringify(collected, null, 2));
  }

  solver.destroy();

  const missing = [...ALL_PREDICATES].filter(p => !satisfied.has(p));
  process.stderr.write(`\nDone: ${gameCount} games, ${collected.length} entries → ${outPath}\n`);
  if (missing.length > 0) {
    process.stderr.write(`MISSING predicates (structurally rare): ${missing.join(' ')}\n`);
  } else {
    process.stderr.write('All 35 predicates satisfied.\n');
  }
  if (sparseDone()) {
    process.stderr.write(`Collected ${sparseCount} sparse/anchorless boards (target ${SPARSE_TARGET}).\n`);
  } else {
    process.stderr.write(`WARNING: only ${sparseCount}/${SPARSE_TARGET} sparse/anchorless boards collected.\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
