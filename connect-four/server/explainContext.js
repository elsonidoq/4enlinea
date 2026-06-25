/**
 * Unified two-sided grounding flow for the LLM explain-move endpoint.
 * Extracted from index.js for testability.
 *
 * buildExplainContext(movestring, col, rounds, solver) → { prompt, allowedSet }
 *   Returns null if the contrast move could not be determined.
 *   Returns { prompt: null, allowedSet: null, allMovesEqual: true } when all moves are settled.
 */

import { classifyPattern, tagBlunder, Board, getMajorThreatCells } from './classifier.js';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from './blunderReasons.js';
import {
  checkAllMovesEqual,
  getGapAndFraming,
  getPositionTier,
  selectContrastMove,
  getBoardVisualization,
  buildBlunderExplainPrompt,
  loadKBShortSummary,
  PATTERN_KB,
} from './llmCoachHelpers.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;
const COLS = 7;

// Build a set of all disc-pair keys from major threat windows (3 player discs + 1 empty).
// Each pair is stored as a canonical sorted string "r1,c1|r2,c2" for all C(3,2)=3 pairs
// within each major window. Used to filter shadow minor threats.
function buildMajorDiscPairSet(rawBoard, disc) {
  const opponent = disc === 1 ? 2 : 1;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const pairSet = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        let player = 0, opp = 0, valid = true;
        const discCells = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
          if (rawBoard[nr][nc] === disc) { player++; discCells.push([nr, nc]); }
          else if (rawBoard[nr][nc] === opponent) opp++;
        }
        if (!valid || player !== 3 || opp !== 0) continue;
        // Record all 3 pairs from the 3 disc cells
        for (let i = 0; i < discCells.length; i++) {
          for (let j = i + 1; j < discCells.length; j++) {
            const [r1, c1] = discCells[i], [r2, c2] = discCells[j];
            pairSet.add(`${r1},${c1}|${r2},${c2}`);
          }
        }
      }
    }
  }
  return pairSet;
}

// Return all distinct 4-windows with exactly 2 of `disc` and 2 empty cells (no opponent discs),
// excluding windows whose disc pair is a subset of any major threat window's disc triplet
// (those are "shadow" windows that arise from sliding along the same run as a major threat).
// Each window is enumerated once by its (r, c, direction) starting point — no double-counting.
// Returns Array<Array<[number,number]>> — each window is an array of 4 [r, c] pairs (0-indexed).
export function getMinorThreatWindows(rawBoard, disc) {
  const majorPairs = buildMajorDiscPairSet(rawBoard, disc);
  const opponent = disc === 1 ? 2 : 1;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const windows = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        let player = 0, opp = 0, valid = true;
        const cells = [];
        const discCells = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
          cells.push([nr, nc]);
          if (rawBoard[nr][nc] === disc) { player++; discCells.push([nr, nc]); }
          else if (rawBoard[nr][nc] === opponent) opp++;
        }
        if (!valid || player !== 2 || opp !== 0) continue;
        // Skip if these 2 discs are both present in any major threat window
        const [r1, c1] = discCells[0], [r2, c2] = discCells[1];
        if (majorPairs.has(`${r1},${c1}|${r2},${c2}`)) continue;
        windows.push(cells);
      }
    }
  }
  return windows;
}

// Return deduplicated sorted "cNrM" strings for the empty cells within a list of windows.
function emptyCellsFromWindows(rawBoard, windows) {
  const seen = new Set();
  for (const window of windows) {
    for (const [r, c] of window) {
      if (rawBoard[r][c] === 0) seen.add(`c${c + 1}r${r + 1}`);
    }
  }
  return [...seen].sort();
}

// Convert a sorted array of "cNrM" cell strings to a zone spec where each cell is its own window.
//   "windows:c2r4|c5r3"
// Returns 'tg' for an empty list so the gate skips it gracefully (same as tg vacuous-valid rule).
function cellsToZoneSpec(cells) {
  if (!cells || cells.length === 0) return 'tg';
  return 'windows:' + cells.join('|');
}

// Convert a list of windows to the zone alias expansion spec:
//   "windows:c2r4,c3r4,c4r4,c5r4|c3r5,c4r5,c5r5,c6r5"
// Each window becomes a pipe-separated group; cells within a window are comma-separated.
function windowsToZoneSpec(windows) {
  if (!windows || windows.length === 0) return 'windows:';
  return 'windows:' + windows
    .map(w => w.map(([r, c]) => `c${c + 1}r${r + 1}`).join(','))
    .join('|');
}

// Replace [zone:alias] / [/zone:alias] tokens in LLM output with their expanded
// [zone:windows:...] / [/zone:windows:...] equivalents.
// Expansion must happen before annotation validation so the gate sees valid specs.
export function expandZoneAliases(text, aliasMap) {
  let result = text;
  for (const [alias, spec] of Object.entries(aliasMap)) {
    result = result.replaceAll(`[zone:${alias}]`, `[zone:${spec}]`);
    result = result.replaceAll(`[/zone:${alias}]`, `[/zone:${spec}]`);
  }
  return result;
}

// Green = player 1 (rm/rn in getMajorThreatCells); wins on 0-indexed even rows (0,2,4).
// Gray  = player 2 (ym/yn in getMajorThreatCells); wins on 0-indexed odd rows  (1,3,5).
function summarizeThreats(board, perspective) {
  const threatMap = getMajorThreatCells(board.board);
  const pMaj = perspective === 1 ? 'rm' : 'ym';
  const oMaj = perspective === 1 ? 'ym' : 'rm';
  const playerDisc   = perspective === 1 ? 1 : 2;
  const opponentDisc = perspective === 1 ? 2 : 1;

  const playerMajorCells   = [];
  const opponentMajorCells = [];
  for (const [key, flags] of Object.entries(threatMap)) {
    const [r, c] = key.split(',').map(Number);
    const gt = r === board.colHeights[c];
    // Exclude immediately-playable cells — those are covered by the immediate_threat tag.
    if (gt) continue;
    if (flags[pMaj]) playerMajorCells.push(`c${c + 1}r${r + 1}`);
    if (flags[oMaj]) opponentMajorCells.push(`c${c + 1}r${r + 1}`);
  }
  playerMajorCells.sort();
  opponentMajorCells.sort();

  const playerWindows   = getMinorThreatWindows(board.board, playerDisc);
  const opponentWindows = getMinorThreatWindows(board.board, opponentDisc);
  const playerMinorCells   = emptyCellsFromWindows(board.board, playerWindows);
  const opponentMinorCells = emptyCellsFromWindows(board.board, opponentWindows);

  return {
    playerMajor: playerMajorCells.length,
    playerMajorCells,
    playerMinor: playerMinorCells.length,
    playerMinorCells,
    opponentMajor: opponentMajorCells.length,
    opponentMajorCells,
    opponentMinor: opponentMinorCells.length,
    opponentMinorCells,
    playerWindows,
    opponentWindows,
  };
}

function formatThreatStats(
  s,
  playerMajorAlias, opponentMajorAlias,
  playerMinorAlias, opponentMinorAlias,
  showPlayerMajor = true, showOpponentMajor = true,
  showPlayerMinor = true, showOpponentMinor = true,
) {
  const fmt = (count, alias) => {
    if (count === 0) return '0';
    return `[zone:${alias}]${count}[/zone:${alias}]`;
  };
  const lines = [];
  if (showPlayerMajor)   lines.push(`- Your major threats: ${fmt(s.playerMajor,   playerMajorAlias)}`);
  if (showPlayerMinor)   lines.push(`- Your minor threats: ${fmt(s.playerMinor,   playerMinorAlias)}`);
  if (showOpponentMajor) lines.push(`- Opponent major threats: ${fmt(s.opponentMajor, opponentMajorAlias)}`);
  if (showOpponentMinor) lines.push(`- Opponent minor threats: ${fmt(s.opponentMinor, opponentMinorAlias)}`);
  return lines.join('\n');
}

// Priority cascade for positive-framing on optimal moves (FR-013).
// First matching tag wins.
const POSITIVE_CASCADE = [
  'forced_win',
  'double_threat',
  'immediate_threat',
  'undercut',
  'overcut',
  'figure_7',
  'j_shape',
  'z_threat',
  'odd_even_threat',
  'claimeven',
  'drawing_move',
  'suboptimal_move',
];

// Tier 1 tags: detectors that return concrete cells[].
const TIER1_TAGS = new Set([
  'immediate_threat', 'double_threat',
  'undercut', 'overcut', 'figure_7', 'j_shape',
]);

// Tier 2 tags: z_threat returns cells:[] but can derive a capsule column.
const TIER2_TAGS = new Set(['z_threat']);

// Tier 3 tags: position-global, not added to allowedSet.
// const TIER3_TAGS = new Set(['forced_win', 'forced_block', 'forbidden_columns', 'odd_even_threat', 'claimeven']);

/**
 * Safely run classifyPattern and return an empty Map on error.
 * c4solver errors on won positions; we need graceful fallback.
 */
async function safeClassifyPattern(ms, perspective, solver) {
  try {
    return await classifyPattern(ms, perspective, solver);
  } catch {
    return new Map();
  }
}

/**
 * Build allowedSet from the union of all classifyPattern Map results.
 *
 * Tier 1 (concrete cells): immediate_threat, double_threat, undercut, overcut, figure_7, j_shape
 *   → emit { cells, zoneSpec: 'tg' }
 * Tier 2 (z_threat, cells []): derive capsuleCol from the board at `boardForCapsule`
 *   → emit { col: capsuleCol, parity: 'odd', zoneSpec: 'tg' }
 * Tier 3 (forced_win, forced_block, forbidden_columns, odd_even_threat, claimeven): skip.
 *
 * NULL rule: if no Tier 1 or Tier 2 entry exists across all calls, return null.
 *
 * @param {Array<Map<string,{cells:string[]}>>} patternMaps  array of classifyPattern results
 * @param {Board} boardForCapsule  board used for z_threat capsule column derivation
 * @returns {Array|null}
 */
function buildAllowedSetFromPatternMaps(patternMaps, boardForCapsule) {
  const entries = [];
  const seenCells = new Set();

  for (const { map, owner } of patternMaps) {
    for (const [tag, { cells }] of map) {
      if (TIER1_TAGS.has(tag) && cells.length > 0) {
        const dedupedCells = cells.filter(c => {
          if (seenCells.has(c)) return false;
          seenCells.add(c);
          return true;
        });
        if (dedupedCells.length > 0) entries.push({ cells: dedupedCells, zoneSpec: 'tg', owner });
      } else if (TIER2_TAGS.has(tag)) {
        // Derive capsule column: first col where (ROWS - colHeights[c]) % 2 === 1
        const { colHeights } = boardForCapsule;
        let capsuleCol = -1;
        for (let c = 0; c < 7; c++) {
          if (colHeights[c] < ROWS && (ROWS - colHeights[c]) % 2 === 1) {
            capsuleCol = c;
            break;
          }
        }
        if (capsuleCol >= 0) {
          entries.push({ col: capsuleCol, parity: 'odd', zoneSpec: 'tg', owner });
        }
        // If no odd-parity column exists, treat as Tier 3 (skip)
      }
      // Tier 3: skip
    }
  }

  return entries.length > 0 ? entries : null;
}

/**
 * Shared: build the LLM prompt for a given (movestring, col) without calling the LLM.
 *
 * @param {string} movestring   movestring of the position before the user's move
 * @param {number} col          0-indexed column the user played
 * @param {number} [rounds=1]   number of simulation rounds (currently unused in new flow)
 * @param {object} solver       c4solver wrapper (required)
 * @returns {Promise<{prompt: string, allowedSet: Array|null}
 *                  |{prompt: null, allowedSet: null, allMovesEqual: true}
 *                  |null>}
 */
export async function buildExplainContext(movestring, col, rounds = 1, solver) {
  const board = new Board(movestring);
  const perspective = movestring.length % 2 === 0 ? 1 : 2;
  const playerName = perspective === 1 ? 'Green' : 'Gray';
  const opponentPerspective = perspective === 1 ? 2 : 1;

  // ── Step 1: Solver scores + settled check + contrast move ─────────────────
  const preScores = movestring.length > 0
    ? await solver.query(movestring)
    : EMPTY_BOARD_SCORES;

  const { isSettled } = checkAllMovesEqual(preScores, board);
  if (isSettled) {
    return { prompt: null, allowedSet: null, allMovesEqual: true };
  }

  const contrast = selectContrastMove(preScores, col, board);
  if (contrast === null) return null;
  const { contrastCol, isOptimal } = contrast;

  const { gap, gapBucket } = getGapAndFraming(preScores, col, contrastCol);

  // ── Trivial-optimal guard ──────────────────────────────────────────────────
  // When the user played an optimal move and the gap is small, all alternatives
  // are equivalent in practice. Calling the LLM forces it to fabricate nuance.
  // Return a canned message instead.
  const positionTier = getPositionTier(preScores, board);
  if (isOptimal && gapBucket === 'small') {
    let trivialExplanation;
    if (positionTier === 'WINNING') {
      trivialExplanation = `All available moves maintain your winning position — this is solid. No single column decisively outperforms the others here.`;
    } else if (positionTier === 'LOSING') {
      trivialExplanation = `All available moves lead to difficult positions — your opponent holds the advantage regardless. No column changes the fundamental outlook.`;
    } else {
      trivialExplanation = `All available moves are roughly equivalent. There is no clear best choice in this balanced position.`;
    }
    return { prompt: null, allowedSet: null, trivial: true, trivialExplanation };
  }

  // ── Step 2: Determine bestCol ─────────────────────────────────────────────
  // isOptimal = true → user played the best move; bestCol = col (their move)
  // isOptimal = false → user made a blunder; bestCol = contrastCol (the better move)
  const bestCol = isOptimal ? col : contrastCol;

  // ── Step 3 / 4: Blunder or Optimal path ───────────────────────────────────
  let tag = null;
  let direction = null;
  let humanReason = null;
  let positiveReason = null;

  // correctMovePatterns: patterns at the best-move position
  const correctMovePatterns = await safeClassifyPattern(
    movestring + bestCol, perspective, solver
  );

  if (!isOptimal) {
    // Blunder path
    const blunderResult = await tagBlunder(movestring, col, bestCol, solver);
    tag = blunderResult.tag;
    direction = blunderResult.direction;
    humanReason = REASON_TEMPLATES.get(`${tag}:${direction}`) ?? 'A stronger move was available.';
    positiveReason = null;
  } else {
    // Optimal path — use priority cascade (NOT Map insertion order)
    let matchedTag = null;
    for (const t of POSITIVE_CASCADE) {
      if (correctMovePatterns.has(t)) {
        matchedTag = t;
        break;
      }
    }
    positiveReason = matchedTag
      ? (POSITIVE_TEMPLATES.get(matchedTag) ?? 'This was the strongest move available.')
      : 'This was the strongest move available.';
  }

  // ── Step 5: allowedSet derivation ─────────────────────────────────────────
  // Base union: patterns at played position + patterns at best-move position
  // Each entry carries an `owner` so cell references can be labeled in the prompt
  // as belonging to "you" or "your opponent" (prevents the LLM from guessing/flipping
  // threat ownership). Player-perspective maps → 'you'; opponent-perspective → 'opponent'.
  const patMaps = [];

  const patPlayed = await safeClassifyPattern(movestring, perspective, solver);
  patMaps.push({ map: patPlayed, owner: 'you' });
  patMaps.push({ map: correctMovePatterns, owner: 'you' }); // already computed above

  // Direction-specific augmentations
  if (!isOptimal && direction === 'enabled_opponent') {
    // Opponent's best response after the blunder
    try {
      const oppScores = await solver.query(movestring + col);
      const validOppScores = oppScores.map((s, i) => ({ s, i })).filter(({ s }) => s !== -1000);
      if (validOppScores.length > 0) {
        const oppBestCol = validOppScores.reduce((best, cur) => cur.s > best.s ? cur : best).i;
        const patOpp = await safeClassifyPattern(
          movestring + col + oppBestCol, opponentPerspective, solver
        );
        patMaps.push({ map: patOpp, owner: 'opponent' });
      }
    } catch {
      // solver error on won position or other; skip augmentation
    }
  } else if (!isOptimal && direction === 'defensive_miss') {
    // Opponent's existing threats before the move
    const patOppPre = await safeClassifyPattern(movestring, opponentPerspective, solver);
    // Restrict to forced_block and immediate_threat only
    const restricted = new Map();
    for (const t of ['forced_block', 'immediate_threat']) {
      if (patOppPre.has(t)) restricted.set(t, patOppPre.get(t));
    }
    if (restricted.size > 0) patMaps.push({ map: restricted, owner: 'opponent' });
  }

  const postBestBoard = new Board(movestring + bestCol);
  const allowedSet = buildAllowedSetFromPatternMaps(patMaps, postBestBoard);

  // Whitelist the played column and contrast column in P5Strong when allowedSet is non-null.
  // P5Strong only fires when allowedSet is provided; if null, all column refs are unchecked.
  // Landing squares (1-indexed display form, matching cell refs elsewhere). The played
  // and better moves are alternatives from the same pre-move board, so both heights
  // come from `board`. These give the LLM a concrete anchor even when no threats exist.
  const playedCell = `c${col + 1}r${board.colHeights[col] + 1}`;
  const bestCell   = `c${bestCol + 1}r${board.colHeights[bestCol] + 1}`;

  if (allowedSet !== null) {
    allowedSet.push({ col, validationOnly: true }); // the move being explained
    // Whitelist the exact cell where the played disc landed (1-indexed cNrM).
    allowedSet.push({ cells: [playedCell], validationOnly: true });
    if (!isOptimal) {
      allowedSet.push({ col: contrastCol, validationOnly: true }); // the better move
      allowedSet.push({ cells: [bestCell], validationOnly: true }); // where it lands
    }
  }

  // ── Step 6: Board visualizations ──────────────────────────────────────────
  const postMovestring = movestring + col;
  const bestMovestring = movestring + bestCol;
  const [boardViz, bestMoveBoardViz, postBoardViz] = await Promise.all([
    getBoardVisualization(movestring || ''),
    getBoardVisualization(bestMovestring),
    getBoardVisualization(postMovestring),
  ]);

  // ── Step 7: KB terms section ───────────────────────────────────────────────
  // Gather pattern keys from all three boards + the blunder tag itself.
  const patPostBlunder = await safeClassifyPattern(postMovestring, perspective, solver);

  const relevantPatternKeys = new Set();
  for (const key of patPlayed.keys()) relevantPatternKeys.add(key);
  for (const key of correctMovePatterns.keys()) relevantPatternKeys.add(key);
  for (const key of patPostBlunder.keys()) relevantPatternKeys.add(key);
  if (tag) relevantPatternKeys.add(tag);

  // ── Step 7a: Threat stats (needed for KB term filtering and threat comparison) ──
  // Compute here so they're available both for conditional KB term inclusion and
  // for the threat comparison section (Step 8), avoiding duplicate computation.
  const preStats     = summarizeThreats(board, perspective);
  const bestBoard    = new Board(bestMovestring);
  const blunderBoard = new Board(postMovestring);
  const bestStats    = summarizeThreats(bestBoard, perspective);
  const blunderStats = summarizeThreats(blunderBoard, perspective);

  // major_threat / minor_threat: include their KB definitions only when threats
  // actually exist across the three board states. On empty or near-empty boards
  // the LLM hallucinates threats when it sees these definitions without any
  // concrete instances to reference.
  const hasMajorThreats =
    preStats.playerMajor + preStats.opponentMajor +
    bestStats.playerMajor + bestStats.opponentMajor +
    blunderStats.playerMajor + blunderStats.opponentMajor > 0;
  const hasMinorThreats =
    preStats.playerMinor + preStats.opponentMinor +
    bestStats.playerMinor + bestStats.opponentMinor +
    blunderStats.playerMinor + blunderStats.opponentMinor > 0;
  if (hasMajorThreats) relevantPatternKeys.add('major_threat');
  if (hasMinorThreats) relevantPatternKeys.add('minor_threat');

  const kbTermLines = [];
  const seenKbIds = new Set();
  for (const [patternKey, kbEntry] of Object.entries(PATTERN_KB)) {
    // Only entries with a file-backed KB article
    if (!kbEntry.id) continue;
    // forced_win is excluded from term annotation (LANGUAGE_RULE bans it from LLM output)
    if (patternKey === 'forced_win') continue;
    // Include if always_include (glossary terms visible on every board) OR if the
    // pattern actually fired in this position
    if (!kbEntry.always_include && !relevantPatternKeys.has(patternKey)) continue;

    if (seenKbIds.has(kbEntry.id)) continue;
    seenKbIds.add(kbEntry.id);

    const shortSummary = loadKBShortSummary(kbEntry.id);
    if (!shortSummary) continue;

    // Always use the pattern key as the tag id so the LLM writes e.g. [term:fork].
    // Display name is the human-readable pattern key (underscores → spaces).
    // KB article slugs with provenance prefixes (community-/allen-) must not appear
    // in the prompt — the LLM copies them verbatim into its output.
    const tagId = patternKey;
    const displayName = patternKey.replace(/_/g, ' ');
    kbTermLines.push(
      `- [term:${tagId}] **${displayName}** (${tagId}): ${shortSummary}`
    );
  }

  const kbTermsSection = kbTermLines.length > 0
    ? `## KB term definitions\n\nThe following tactical concepts apply to this position:\n\n${kbTermLines.join('\n')}`
    : '';

  // ── Step 8: Threat comparison section ─────────────────────────────────────
  // preStats / bestStats / blunderStats / bestBoard / blunderBoard computed in Step 7a.

  // Only show a threat metric when the comparison is directionally meaningful:
  // player threats: best move should give MORE of your own threats
  // opponent threats: best move should leave opponent with FEWER threats
  // Rows are hidden entirely when not meaningful — this also prevents the LLM from
  // hallucinating zone tags for aliases that are absent from the map.
  const showPlayerMajor   = bestStats.playerMajor   > blunderStats.playerMajor;
  const showOpponentMajor = bestStats.opponentMajor < blunderStats.opponentMajor;
  const showPlayerMinor   = bestStats.playerMinor   > blunderStats.playerMinor;
  const showOpponentMinor = bestStats.opponentMinor < blunderStats.opponentMinor;

  // Aliases are only added when their row appears in the prompt — alias in map ↔ row shown.
  const zoneAliasMap = {};
  if (showPlayerMajor) {
    zoneAliasMap['player-major-pre']    = cellsToZoneSpec(preStats.playerMajorCells);
    zoneAliasMap['player-major-best']   = cellsToZoneSpec(bestStats.playerMajorCells);
    zoneAliasMap['player-major-played'] = cellsToZoneSpec(blunderStats.playerMajorCells);
  }
  if (showOpponentMajor) {
    zoneAliasMap['opponent-major-pre']    = cellsToZoneSpec(preStats.opponentMajorCells);
    zoneAliasMap['opponent-major-best']   = cellsToZoneSpec(bestStats.opponentMajorCells);
    zoneAliasMap['opponent-major-played'] = cellsToZoneSpec(blunderStats.opponentMajorCells);
  }
  if (showPlayerMinor) {
    zoneAliasMap['player-minor-pre']    = cellsToZoneSpec(preStats.playerMinorCells);
    zoneAliasMap['player-minor-best']   = cellsToZoneSpec(bestStats.playerMinorCells);
    zoneAliasMap['player-minor-played'] = cellsToZoneSpec(blunderStats.playerMinorCells);
  }
  if (showOpponentMinor) {
    zoneAliasMap['opponent-minor-pre']    = cellsToZoneSpec(preStats.opponentMinorCells);
    zoneAliasMap['opponent-minor-best']   = cellsToZoneSpec(bestStats.opponentMinorCells);
    zoneAliasMap['opponent-minor-played'] = cellsToZoneSpec(blunderStats.opponentMinorCells);
  }

  const minorNoteClause = (showPlayerMajor || showOpponentMajor || showPlayerMinor || showOpponentMinor)
    ? ' Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.'
    : '';

  const threatComparisonSection = [
    '## Threat comparison',
    '',
    `Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.${minorNoteClause}`,
    '',
    'Before the move:',
    formatThreatStats(
      preStats,
      'player-major-pre', 'opponent-major-pre',
      'player-minor-pre', 'opponent-minor-pre',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
    '',
    `After the best move (column ${bestCol + 1}):`,
    formatThreatStats(
      bestStats,
      'player-major-best', 'opponent-major-best',
      'player-minor-best', 'opponent-minor-best',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
    '',
    `After the move played (column ${col + 1}):`,
    formatThreatStats(
      blunderStats,
      'player-major-played', 'opponent-major-played',
      'player-minor-played', 'opponent-minor-played',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
  ].join('\n');

  // Whitelist all threat cells across all three board states so P5Strong passes
  // after alias expansion (expanded windows: specs are validated against these cells).
  if (allowedSet !== null) {
    const allThreatCells = new Set([
      ...preStats.playerMajorCells,
      ...preStats.opponentMajorCells,
      ...preStats.playerMinorCells,
      ...preStats.opponentMinorCells,
      ...bestStats.playerMajorCells,
      ...bestStats.opponentMajorCells,
      ...bestStats.playerMinorCells,
      ...bestStats.opponentMinorCells,
      ...blunderStats.playerMajorCells,
      ...blunderStats.opponentMajorCells,
      ...blunderStats.playerMinorCells,
      ...blunderStats.opponentMinorCells,
    ]);
    if (allThreatCells.size > 0) {
      allowedSet.push({ cells: [...allThreatCells], validationOnly: true });
    }
  }

  // ── Step 9: Build prompt ───────────────────────────────────────────────────
  // Suppress threat comparison when tag is immediate_threat: one board state is
  // terminal (the game-ending move), so post-move threat counts are incoherent.
  const effectiveThreatComparison = tag === 'immediate_threat' ? undefined : threatComparisonSection;

  const prompt = buildBlunderExplainPrompt({
    tag,
    direction,
    humanReason,
    positiveReason,
    correctMovePatterns,
    boardViz,
    bestMoveBoardViz,
    postBoardViz,
    playerName,
    gap,
    gapBucket,
    allowedSet,
    playedCol: col,
    contrastCol: isOptimal ? undefined : contrastCol,
    playedCell,
    bestCell: isOptimal ? undefined : bestCell,
    kbTermsSection: kbTermsSection || undefined,
    threatComparisonSection: effectiveThreatComparison,
  });

  return { prompt, allowedSet, zoneAliasMap, contrastCol: isOptimal ? undefined : contrastCol };
}
