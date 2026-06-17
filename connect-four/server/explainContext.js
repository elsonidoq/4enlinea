/**
 * Unified two-sided grounding flow for the LLM explain-move endpoint.
 * Extracted from index.js for testability.
 *
 * buildExplainContext(movestring, col, rounds, solver) → { prompt, allowedSet }
 *   Returns null if the contrast move could not be determined.
 *   Returns { prompt: null, allowedSet: null, allMovesEqual: true } when all moves are settled.
 */

import { classifyPattern, tagBlunder, Board } from './classifier.js';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from './blunderReasons.js';
import {
  checkAllMovesEqual,
  getGapAndFraming,
  getPositionTier,
  selectContrastMove,
  getBoardVisualization,
  buildBlunderExplainPrompt,
} from './llmCoachHelpers.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;

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

  for (const map of patternMaps) {
    for (const [tag, { cells }] of map) {
      if (TIER1_TAGS.has(tag) && cells.length > 0) {
        const dedupedCells = cells.filter(c => {
          if (seenCells.has(c)) return false;
          seenCells.add(c);
          return true;
        });
        if (dedupedCells.length > 0) entries.push({ cells: dedupedCells, zoneSpec: 'tg' });
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
          entries.push({ col: capsuleCol, parity: 'odd', zoneSpec: 'tg' });
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
    const opponentName = perspective === 1 ? 'Gray' : 'Green';
    let trivialExplanation;
    if (positionTier === 'WINNING') {
      trivialExplanation = `All available moves maintain ${playerName}'s winning position — this is solid. No single column decisively outperforms the others here.`;
    } else if (positionTier === 'LOSING') {
      trivialExplanation = `All available moves lead to difficult positions — ${opponentName} holds the advantage regardless. No column changes the fundamental outlook.`;
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
  const patMaps = [];

  const patPlayed = await safeClassifyPattern(movestring, perspective, solver);
  patMaps.push(patPlayed);
  patMaps.push(correctMovePatterns); // already computed above

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
        patMaps.push(patOpp);
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
    if (restricted.size > 0) patMaps.push(restricted);
  }

  const postBestBoard = new Board(movestring + bestCol);
  const allowedSet = buildAllowedSetFromPatternMaps(patMaps, postBestBoard);

  // Whitelist the played column and contrast column in P5Strong when allowedSet is non-null.
  // P5Strong only fires when allowedSet is provided; if null, all column refs are unchecked.
  if (allowedSet !== null) {
    allowedSet.push({ col, validationOnly: true }); // the move being explained
    // Also whitelist the exact cell where the disc landed (pre-move column height = row index)
    const playedRow = board.colHeights[col];
    allowedSet.push({ cells: [`c${col}r${playedRow}`], validationOnly: true });
    if (!isOptimal) {
      allowedSet.push({ col: contrastCol, validationOnly: true }); // the better move
    }
  }

  // ── Step 6: Board visualizations ──────────────────────────────────────────
  const postMovestring = movestring + col;
  const [boardViz, postBoardViz] = await Promise.all([
    getBoardVisualization(movestring || ''),
    getBoardVisualization(postMovestring),
  ]);

  // ── Step 7: Build prompt ───────────────────────────────────────────────────
  const prompt = buildBlunderExplainPrompt({
    tag,
    direction,
    humanReason,
    positiveReason,
    correctMovePatterns,
    boardViz,
    postBoardViz,
    playerName,
    gap,
    gapBucket,
    allowedSet,
    playedCol: col,
    contrastCol: isOptimal ? undefined : contrastCol,
  });

  return { prompt, allowedSet };
}
