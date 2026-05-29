/**
 * CLI PoC: LLM-grounded recommendation for the next Connect Four move.
 *
 * Usage:
 *   ./recommend_next_move.sh <movestring> [rounds=1]
 *
 *   movestring  — current board position (0-indexed column digits, or "" for opening)
 *   rounds      — simulation depth (default 1); numPlies = 2*rounds+1
 *
 * Requires OPENAI_API_KEY and OPENAI_MODEL in connect-four/server/.env
 * (loaded via --env-file in the shell wrapper; no dotenv needed).
 *
 * Output order:
 *   1. Position summary header + board
 *   2. Full LLM prompt (delimited)
 *   3. LLM response
 */

import { Board, getImmediateThreats } from '../classifier.js';
import { explainSimulate } from '../explainSimulate.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import {
  TIER_ORDER, IMMEDIATE_WIN_OUTCOMES,
  isMajorThreatForPlayer, getScoreTier,
  getBoardVisualization, buildKBSection,
  buildRecommendPrompt, callLLM,
} from '../llmCoachHelpers.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Solver helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getScores(solver, movestring) {
  if (movestring === '') return EMPTY_BOARD_SCORES;
  return solver.query(movestring);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [,, rawMoves = '', rawRounds = '1'] = process.argv;

  // Parse rounds
  const rounds = parseInt(rawRounds, 10);
  if (isNaN(rounds) || rounds < 1) {
    console.error('Error: rounds must be a positive integer');
    process.exit(1);
  }
  const numPlies = 2 * rounds + 1;

  // Validate movestring
  if (!/^[0-6]{0,42}$/.test(rawMoves)) {
    console.error('Error: movestring must be 0–42 digits in range 0–6');
    process.exit(1);
  }

  let board;
  try {
    board = new Board(rawMoves);
  } catch (e) {
    console.error(`Error parsing movestring: ${e.message}`);
    process.exit(1);
  }

  const playableCols = [0,1,2,3,4,5,6].filter(c => board.colHeights[c] < ROWS);
  if (playableCols.length === 0) {
    console.log('Board is full — no moves available.');
    return;
  }

  const perspective  = rawMoves.length % 2 === 0 ? 1 : 2;
  const opponent     = perspective === 1 ? 2 : 1;
  const playerName   = perspective === 1 ? 'Red' : 'Yellow';
  const opponentName = perspective === 1 ? 'Yellow' : 'Red';

  const solver = createSolverProcess();

  try {
    // ── 1. Solver scores (for tier labeling of non-immediate columns) ─────────
    const scores = await getScores(solver, rawMoves);

    // ── 2. Special case detection via board logic (NOT solver scores) ─────────
    //
    // IMMEDIATE WIN: columns where the current player wins immediately.
    // Do NOT derive from solver scores — see reference_cat5_forced_block_detection
    // memory: in forced-win terminals all scores are flat, giving no signal.
    const immediateWinSet = new Set(
      getImmediateThreats(board.board, board.colHeights, perspective)
    );

    // FORCED BLOCK: columns where the opponent already has an immediate threat.
    // Playing elsewhere hands the opponent an instant win.
    const forcedBlockCols = playableCols.filter(c =>
      isMajorThreatForPlayer(board, c, board.colHeights[c], opponent)
    );

    // IMMEDIATE LOSS: columns where playing creates an opponent immediate win.
    // Check only non-immediate-win columns (immediate wins override anyway).
    const immediateLossSet = new Set();
    for (const c of playableCols) {
      if (immediateWinSet.has(c)) continue;
      const postBoard = new Board(rawMoves + c);
      const oppThreats = getImmediateThreats(postBoard.board, postBoard.colHeights, opponent);
      if (oppThreats.length > 0) immediateLossSet.add(c);
    }

    // ── 3. Run explainSimulate for all non-immediate-win columns in parallel ──
    //
    // Immediate-win columns get placeholder outcomes — c4solver rejects positions
    // reached through a winning alignment, so calling explainSimulate on those
    // children would error.
    const simResults = await Promise.all(
      playableCols.map(c => {
        if (immediateWinSet.has(c)) {
          return Promise.resolve({ patterns: {}, outcomes: IMMEDIATE_WIN_OUTCOMES });
        }
        const anchorCell = { col: c, row: board.colHeights[c] };
        return explainSimulate(rawMoves + c, numPlies, anchorCell, perspective, solver);
      })
    );

    // ── 4. Assemble per-column data and sort ──────────────────────────────────
    const colData = playableCols.map((c, i) => ({
      col:      c,
      score:    scores[c],
      tier:     getScoreTier(c, scores[c], immediateWinSet, immediateLossSet),
      outcomes: simResults[i].outcomes,
      patterns: simResults[i].patterns,
    }));

    // Sort best-first (IMMEDIATE WIN → WINS → DRAWS → LOSES → IMMEDIATE LOSS),
    // then by column index for stable ordering within a tier.
    colData.sort((a, b) =>
      (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || (a.col - b.col)
    );

    // ── 5. Overall position assessment ───────────────────────────────────────
    let positionAssessment;
    if (immediateWinSet.size > 0) {
      positionAssessment = 'winning (an immediate winning move is available)';
    } else {
      const bestScore = Math.max(
        ...playableCols.map(c => scores[c]).filter(s => s > -1000)
      );
      if (bestScore > 0)    positionAssessment = 'in a winning position';
      else if (bestScore === 0) positionAssessment = 'in a drawing position';
      else                  positionAssessment = 'in a losing position';
    }

    // ── 6. Board visualization ────────────────────────────────────────────────
    const boardViz = getBoardVisualization(rawMoves || '');

    // ── 7. KB section for all patterns with ratio > 0 in any column ──────────
    const activePatternSet = new Set();
    for (const { patterns } of colData) {
      for (const [name, entry] of Object.entries(patterns)) {
        if (entry.ratio > 0) activePatternSet.add(name);
      }
    }
    const kbSection = buildKBSection([...activePatternSet]);

    // ── 8. Build prompt ───────────────────────────────────────────────────────
    const prompt = buildRecommendPrompt({
      boardViz,
      playerName,
      opponentName,
      positionAssessment,
      colData,
      immediateWinSet,
      forcedBlockCols,
      immediateLossSet,
      kbSection,
      rounds,
    });

    // ── 9. Print summary, prompt, LLM response ────────────────────────────────
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  Position: ${rawMoves || '(opening)'}`);
    console.log(`  Player:   ${playerName} (player ${perspective})`);
    console.log(`  Rounds:   ${rounds}  (numPlies=${numPlies})`);
    console.log(`  Playable: cols ${playableCols.map(c => c+1).join(', ')} (1-indexed)`);
    console.log(`${'═'.repeat(70)}\n`);
    console.log(boardViz);

    console.log(`\n${'─'.repeat(70)}`);
    console.log('  PROMPT');
    console.log(`${'─'.repeat(70)}\n`);
    console.log(prompt);

    console.log(`\n${'─'.repeat(70)}`);
    console.log('  LLM RESPONSE');
    console.log(`${'─'.repeat(70)}\n`);
    const response = await callLLM(prompt);
    console.log(response);
    console.log('');

  } finally {
    solver.destroy();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
