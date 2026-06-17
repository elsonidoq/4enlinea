import { evaluatePredicate } from './predicates.js';
import {
  classify, checkWin, getImmediateThreats, parseBoardState,
  hasActiveDoubleThreat, Board, hasWon,
  detectZThreat, detectClaimeven, detectUndercut, detectOvercut,
  detectFigure7, detectJShape, detectOddEvenThreat,
  detectDoubleThreat, detectForcedWin,
} from './classifier.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { VALID_CATEGORIES, CATEGORY_ORDER } from './categories.js';

/** @import { HighlightCell, HighlightMetadata } from './classifier.js' */
const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// mulberry32 PRNG — 4 lines, no dependency
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function softmaxSample(legalCols, scores, T, rng) {
  const raw = legalCols.map(c => scores[c]);
  const minS = Math.min(...raw);
  const maxS = Math.max(...raw);
  const range = maxS - minS;
  const normalized = range === 0
    ? raw.map(() => 0)
    : raw.map(s => (s - minS) / range * 2 - 1);
  const logits = normalized.map(n => n / T);
  const maxLogit = Math.max(...logits);
  const weights = logits.map(l => Math.exp(l - maxLogit));
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map(w => w / total);

  let r = rng(), cum = 0;
  for (let j = 0; j < legalCols.length; j++) {
    cum += probs[j];
    if (r < cum) return legalCols[j];
  }
  return legalCols[legalCols.length - 1];
}

// Return true if the position is finished (someone won or board is full).
function isGameOver(moveString) {
  const board = new Board(moveString).board;
  return hasWon(board, 1) || hasWon(board, 2) || moveString.length === ROWS * COLS;
}

function copyBoard(board) {
  return board.map(row => [...row]);
}

// immediate_threat/forced_block/double_threat — single hint cell
function computeLowCategoryHighlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];
  const heights = new Board(moveString).colHeights;
  const col = correctCols[0];
  return [{ column: col, row: heights[col], role: 'hint' }];
}

// ── Trace connectedness ──────────────────────────────────────────────────────
// Ensures each initiator move in the forcing chain builds toward the eventual win,
// rather than creating a disconnected side threat whose block column is never
// involved in any later step.

// Returns true if every initiator move's threat column (which the opponent blocks
// at trace[i+1]) appears again later in the trace — as a later initiator move or
// as a later block. This catches traces where the initiator plays in an unrelated
// column, forces a block elsewhere, and then wins through completely different columns.
function isTraceConnected(trace) {
  // Walk initiator steps: i = 0, 2, 4, ... (even indices, up to third-to-last).
  for (let i = 0; i < trace.length - 2; i += 2) {
    const threatCol = trace[i + 1];  // opponent blocks the initiator's sole threat column
    const rest = trace.slice(i + 2);  // everything after the block
    if (!rest.includes(threatCol)) {
      return false;  // threat column never used again — disconnected
    }
  }
  return true;
}

// Recursively trace a forced-win sequence starting with initiator playing initiatorCol on ms.
// Returns an array [initiatorCol, opponentBlockCol, ..., finalWinnerCol] or null.
// depth = number of initiator plays so far (starts at 1, max 4).
//
// Board-based (no solver): mirrors detectForcedWin's logic exactly.
//   After initiator plays initiatorCol → must have exactly 1 immediate threat.
//   Opponent blocks it → must NOT gain a counter-threat.
//   Initiator continues → terminal (win or double threat) or recurse.
//
// Traces are always odd-length, always ending with the initiator's winning move:
//   Immediate-win terminal:  [I1, O1, I2]  (3 elements — I2 wins)
//   Double-threat terminal:  [I1, O1, I2, O2, I3]  (5 elements — I3 wins after O2 blocks one threat)
//   Deeper chains grow by 2 elements per forcing step.
//
// Backtracking: collects all structurally valid traces across all continuation columns,
// then returns the first one where every initiator move's threat column is reused later
// in the chain (not a disconnected side threat).
//
// Works for both Red and Yellow as initiator.
function traceForcedWin(ms, initiatorCol, depth, maxInitiatorMoves = 4) {
  const ms1 = ms + initiatorCol;
  if (isGameOver(ms1)) return null;

  const board = new Board(ms1);
  // After initiator's move, currentPlayer is the opponent.
  const initiator = board.opponent;
  const opponent = board.currentPlayer;

  // Must have exactly 1 immediate threat for the chain to continue.
  const threats = board.immediateThreats(initiator);
  if (threats.length !== 1) return null;

  // Must not already be a double threat (shouldn't happen with length === 1, but defensive).
  if (detectDoubleThreat(board, initiator).matched) return null;

  const blockCol = threats[0];
  if (board.colHeights[blockCol] >= ROWS) return null;

  // Opponent is forced to block.
  const afterBlock = board.withMove(blockCol);
  if (isGameOver(afterBlock.movestring)) return null;

  // Opponent's block must NOT create a counter-threat (chain is broken if it does).
  if (afterBlock.immediateThreats(opponent).length > 0) return null;

  if (depth >= maxInitiatorMoves) return null;

  // Collect all structurally valid traces across all continuation columns,
  // then pick the first one where every initiator disc is geometrically connected
  // to a later threat or winning line (backtracking — not greedy).
  const candidates = [];
  for (let c = 0; c < COLS; c++) {
    if (afterBlock.colHeights[c] >= ROWS) continue;

    const row = afterBlock.colHeights[c];
    const afterInit = afterBlock.withMove(c);

    // Terminal 1: initiator wins immediately with this continuation.
    if (afterInit.checkWin(row, c, initiator)) {
      candidates.push([initiatorCol, blockCol, c]);
      continue;
    }

    // Terminal 2: initiator creates a double threat.
    // Extend the trace past the double threat: opponent blocks one threat column,
    // initiator wins in the other (or one row higher for same-column consecutive threats).
    // Note: counter-threats from the opponent's block are irrelevant — the game ends
    // on the initiator's next move, so the opponent never gets to use their threat.
    const dtResult = detectDoubleThreat(afterInit, initiator);
    if (dtResult.matched) {
      const dtCols = dtResult.cols;
      if (dtCols.length >= 2) {
        // Case A: gravity-top threats in ≥2 distinct columns.
        // Opponent blocks dtCols[0]; initiator wins in dtCols[1].
        const oppBlockBoard = afterInit.withMove(dtCols[0]);
        const winRow = oppBlockBoard.colHeights[dtCols[1]];
        if (winRow < ROWS &&
            oppBlockBoard.withMove(dtCols[1]).checkWin(winRow, dtCols[1], initiator)) {
          candidates.push([initiatorCol, blockCol, c, dtCols[0], dtCols[1]]);
        }
        continue;
      }
      if (dtCols.length === 1) {
        // Case B: consecutive-row threats in the same column.
        // Opponent blocks the lower threat; initiator wins one row higher.
        const oppBlockBoard = afterInit.withMove(dtCols[0]);
        const winRow = oppBlockBoard.colHeights[dtCols[0]];
        if (winRow < ROWS &&
            oppBlockBoard.withMove(dtCols[0]).checkWin(winRow, dtCols[0], initiator)) {
          candidates.push([initiatorCol, blockCol, c, dtCols[0], dtCols[0]]);
        }
        continue;
      }
    }

    // Recurse: continue the forcing chain.
    const subTrace = traceForcedWin(ms1 + blockCol, c, depth + 1, maxInitiatorMoves);
    if (subTrace !== null) candidates.push([initiatorCol, blockCol, ...subTrace]);
  }

  // Return the first connected trace.
  for (const t of candidates) {
    if (isTraceConnected(t)) return t;
  }
  return null;
}

// forced_win predicate: exactly one column initiates a valid forced-win sequence.
// Board-based: uses detectForcedWin for exhaustive validation and traceForcedWin for
// trace generation. Works for both Red and Yellow as initiator.
export function checkForcedWinPredicate(ms) {
  const board = new Board(ms);
  const heights = board.colHeights;
  const initiator = board.currentPlayer;
  const correctCols = [];

  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;

    const row = heights[c];
    const afterMove = board.withMove(c);

    // Immediate win is not a forced win — that's immediate_threat.
    if (afterMove.checkWin(row, c, initiator)) continue;

    // First move creates double threat — that's Category 3 (double_threat).
    if (detectDoubleThreat(afterMove, initiator).matched) continue;

    // Exhaustive check: does this column initiate a forced-win chain?
    if (!detectForcedWin(afterMove, initiator).matched) continue;

    // Generate the specific trace for highlight purposes.
    const trace = traceForcedWin(ms, c, 1);
    if (trace === null) continue;

    // Require at least 3-ply sequence: [I1, O1, I2].
    // A 3-element trace is the minimum valid forced win: initiator move →
    // opponent forced block → initiator terminal (win or double threat).
    if (trace.length < 3) continue;

    // Verify the final position is a win for the initiator.
    let msEnd = ms;
    for (const col of trace) msEnd += col;
    if (new Board(msEnd).hasWon(initiator)) correctCols.push(c);
  }

  return { passes: correctCols.length === 1, correctCols, correct_col: correctCols[0] ?? null };
}

// Forbidden columns predicate: a column is forbidden if Red plays there (without winning),
// and then Yellow plays in that same column one row above and wins.
export function checkForbiddenColumnsPredicate(ms) {
  const { board, colHeights: heights } = new Board(ms);
  const red = ms.length % 2 === 0 ? 1 : 2;
  const yellow = 3 - red;

  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  const forbiddenCols = legalCols.filter(c => {
    const h = heights[c];
    if (h + 1 >= ROWS) return false;
    const b = copyBoard(board);
    b[h][c] = red;
    if (checkWin(b, h, c, red)) return false;
    b[h + 1][c] = yellow;
    return checkWin(b, h + 1, c, yellow);
  });

  const safeCols = legalCols.filter(c => !forbiddenCols.includes(c));
  return {
    passes: forbiddenCols.length >= 1 && safeCols.length >= 1,
    correctCols: safeCols,
    correct_col: safeCols[0] ?? null,
  };
}

// forced_win highlight — trace forced sequence from the initiating move.
export function computeForcedWinHighlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];

  const initiatorCol = correctCols[0];
  const trace = traceForcedWin(moveString, initiatorCol, 1);
  if (!trace) return [];

  const cells = [];
  let ms = moveString;

  for (let i = 0; i < trace.length; i++) {
    const col = trace[i];
    const h = new Board(ms).colHeights;
    if (h[col] >= ROWS) break;

    const isLast = (i === trace.length - 1);
    const isInitiatorTurn = (i % 2 === 0);  // index 0 is always initiator, regardless of color

    if (isLast) {
      cells.push({ column: col, row: h[col], role: 'winner' });
    } else if (isInitiatorTurn) {
      cells.push({ column: col, row: h[col], role: 'hint' });
    } else {
      cells.push({ column: col, row: h[col], role: 'loser' });
    }

    ms += col;
  }

  return cells;
}

// Forbidden columns highlight — mark each forbidden column with role 'loser'.
function computeForbiddenColumnsHighlight(moveString, correctCols) {
  const heights = new Board(moveString).colHeights;
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  const forbiddenCols = legalCols.filter(c => !correctCols.includes(c));
  return forbiddenCols.map(col => ({ column: col, row: heights[col], role: 'loser' }));
}

// highlight_cells: per-step animation for sequence categories (immediate_threat, forced_block,
//   double_threat, forced_win, forbidden_columns). Shape: [{ column, row, role }]. 0-indexed.
// highlight_metadata: static pattern for tactical categories (z_threat, undercut, overcut,
//   claimeven, figure_7, j_shape). Shape: { type, cells: [{ column, row, role }] } or capsule.
// These are never both populated for the same candidate. New categories → use highlight_metadata.
async function computeHighlightCells(category, moveString, scores, correctCols, solver) {
  if (['immediate_threat', 'forced_block', 'double_threat'].includes(category)) return computeLowCategoryHighlight(moveString, correctCols);
  if (category === 'forced_win') return computeForcedWinHighlight(moveString, correctCols);
  if (category === 'forbidden_columns') return computeForbiddenColumnsHighlight(moveString, correctCols);
  if (category === 'odd_even_threat') return []; // No cell highlights needed
  return [];
}

// Simulate a softmax-weighted game up to maxMoves plies, calling onPosition(moveString, scores)
// after each solver query. Returns { moveString, scores, trace } on first match, null otherwise.
async function solverWeightedPositionSoftmax(solver, maxMoves, rng, onPosition) {
  const T1 = rng() * 4 + 0.1;
  const T2 = rng() * 4 + 0.1;
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < maxMoves; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);

    if (await onPosition(moveString, scores)) {
      return { moveString, scores, trace: { temperature_p1: T1, temperature_p2: T2, termination: 'predicate_match', plies } };
    }

    const T = temps[player - 1];
    const rawWeights = legal.map(c => Math.exp(scores[c] / T));
    const total = rawWeights.reduce((a, b) => a + b, 0);
    const probs = Array(COLS).fill(0);
    legal.forEach((c, j) => { probs[c] = rawWeights[j] / total; });

    const col = softmaxSample(legal, scores, T, rng);
    plies.push({ ply: i, player, scores: [...scores], weights: probs, sampled_col: col });

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += col.toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return null;
}

// Simulate a mistake-probability-weighted game up to maxMoves plies, calling onPosition(moveString, scores)
// after each solver query. Returns { moveString, scores, trace } on first match, null otherwise.
// Each player gets a random mistake probability in [0, 0.5). On each move:
//   - With probability mp: play the second-best column (deliberate mistake).
//   - Otherwise: pick uniformly at random among the best columns.
async function solverWeightedPosition(solver, maxMoves, rng, onPosition) {
  const MP1 = rng() * 0.25;
  const MP2 = rng() * 0.25;
  const mistakeProbs = [MP1, MP2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < maxMoves; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);

    if (await onPosition(moveString, scores)) {
      return { moveString, scores, trace: { mistake_prob_p1: MP1, mistake_prob_p2: MP2, termination: 'predicate_match', plies } };
    }

    const mp = mistakeProbs[player - 1];
    let col;
    let mistakeMade = false;

    if (legal.length > 1 && rng() < mp) {
      // Deliberate mistake: pick second-best column among legal columns.
      const maxScore = Math.max(...legal.map(c => scores[c]));
      const belowMax = legal.filter(c => scores[c] < maxScore);
      if (belowMax.length > 0) {
        const secondBestScore = Math.max(...belowMax.map(c => scores[c]));
        const tiedSecond = belowMax.filter(c => scores[c] === secondBestScore);
        col = tiedSecond[Math.floor(rng() * tiedSecond.length)];
        mistakeMade = true;
      }
    }

    if (!mistakeMade) {
      // No mistake: pick uniformly at random among the best columns.
      const maxScore = Math.max(...legal.map(c => scores[c]));
      const tiedBest = legal.filter(c => scores[c] === maxScore);
      col = tiedBest[Math.floor(rng() * tiedBest.length)];
    }

    plies.push({ ply: i, player, scores: [...scores], sampled_col: col, mistake: mistakeMade });

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += col.toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return null;
}

// T011 — check* functions for the 6 new tactical categories

export function checkZThreatPredicate(ms, scores) {
  const result = detectZThreat(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  const correctCol = result.highlightMetadata.column;
  return {
    passes: true,
    correctCols: [correctCol],
    correct_col: correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export async function checkClaimevenPredicate(ms, scores, solver) {
  const result = await detectClaimeven(new Board(ms), solver);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata, // null for claimeven
    category_evidence: result.categoryEvidence,
  };
}

export function checkUndercutPredicate(ms, scores) {
  const b = new Board(ms);
  const result = detectUndercut(b, scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  // For undercut, "correct" = any column except the killing_threat column
  const killingCol = result.highlightMetadata.cells.find(c => c.role === 'killing_threat').column;
  const correctCols = [];
  for (let c = 0; c < COLS; c++) {
    if (b.colHeights[c] < ROWS && c !== killingCol) correctCols.push(c);
  }
  return {
    passes: correctCols.length >= 1,
    correctCols,
    correct_col: null, // undercut has no single correct col; eval derives from highlight_metadata
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkOvercutPredicate(ms, scores) {
  const result = detectOvercut(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  const majorCol = result.highlightMetadata.cells.find(c => c.role === 'major_threat').column;
  return {
    passes: true,
    correctCols: [majorCol],
    correct_col: null, // overcut eval derives from highlight_metadata
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkFigure7Predicate(ms, scores) {
  const result = detectFigure7(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkJShapePredicate(ms, scores) {
  const result = detectJShape(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkOddEvenThreatPredicate(ms, scores) {
  const result = detectOddEvenThreat(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata, // null for odd_even_threat
    category_evidence: result.categoryEvidence,
  };
}

// Check whether the current position satisfies the category predicate.
// Returns { passes, correctCols, correct_col?, highlight_metadata?, category_evidence? }.
async function checkPredicate(category, moveString, scores, solver) {
  if (category === 'forced_win') return checkForcedWinPredicate(moveString);
  if (category === 'forbidden_columns') return checkForbiddenColumnsPredicate(moveString);

  // New tactical categories — priority order per Decision 5
  if (category === 'z_threat') return checkZThreatPredicate(moveString, scores);
  if (category === 'undercut') return checkUndercutPredicate(moveString, scores);
  if (category === 'overcut') return checkOvercutPredicate(moveString, scores);
  if (category === 'claimeven') return checkClaimevenPredicate(moveString, scores, solver);
  if (category === 'figure_7') return checkFigure7Predicate(moveString, scores);
  if (category === 'j_shape') return checkJShapePredicate(moveString, scores);
  if (category === 'odd_even_threat') return checkOddEvenThreatPredicate(moveString, scores);

  const puzzle = { category, moveString };
  const heights = new Board(moveString).colHeights;
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  // immediate_threat/forced_block/double_threat: exactly one legal column must return 'correct'
  const correctCols = legalCols.filter(c => {
    const r = evaluatePredicate(puzzle, c, scores);
    return r.result === 'correct';
  });
  return { passes: correctCols.length === 1, correctCols, correct_col: correctCols[0] ?? null };
}

// Reject positions that violate per-category board-quality constraints.
function isClean(category, ms) {
  const { board, colHeights } = parseBoardState(ms);
  const player = (ms.length % 2 === 0) ? 1 : 2;
  const playerThreats = getImmediateThreats(board, colHeights, player).length;

  if (category === 'immediate_threat') {
    // Exactly one winning column, and no stacked double-threat structure
    return playerThreats === 1 && !hasActiveDoubleThreat(board, colHeights, player);
  }

  // All other categories: current player must not already be able to win immediately
  if (playerThreats > 0) return false;

  if (category === 'forced_block') {
    // Opponent must have exactly one immediate threat → uniquely blockable
    // and no active double threat for the opponent (which would make blocking futile)
    const opponent = 3 - player;
    return getImmediateThreats(board, colHeights, opponent).length === 1 &&
      !hasActiveDoubleThreat(board, colHeights, opponent);
  }

  if (category === 'forced_win') {
    // Opponent must NOT have any immediate threat — they would just win instead of being forced.
    const opponent = 3 - player;
    return getImmediateThreats(board, colHeights, opponent).length === 0;
  }

  if (category === 'forbidden_columns') {
    // Current player must not be in a position where the opponent already has a double threat
    const opponent = 3 - player;
    return !hasActiveDoubleThreat(board, colHeights, opponent);
  }

  if (category === 'odd_even_threat') {
    // Must be Red's turn (ensured by predicate check). Guard: not already winning.
    // playerThreats === 0 is already enforced by the early return above.
    // No additional constraints needed — the predicate handles all FR-006 conditions.
    return true;
  }

  return true;
}

/**
 * Generate up to `count` puzzle candidates for `category`.
 * Returns { candidates[], seed, durationMs }.
 */
export async function generateCandidates(category, count, seed) {
  const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32);
  console.log('generateCandidates called', { category, count, seed: usedSeed });
  const rng = mulberry32(usedSeed);
  const t0 = Date.now();

  const solver = createSolverProcess();

  const candidates = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 400;
  let lastLogTime = t0;
  const LOG_INTERVAL_MS = 5000;

  const stats = { noMatch: 0, depthFilter: 0, accepted: 0 };

  try {
    while (candidates.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;

      const rawMinMoves = 8 + Math.floor(rng() * 10);
      // const maxMoves = ['immediate_threat', 'forced_block'].includes(category) ? 20 : Math.max(rawMinMoves, 34);
      const maxMoves = Math.max(rawMinMoves, 34);
      const minMoves = Math.min(rawMinMoves, maxMoves);

      let matchedCorrectCols = null;
      let matchedHighlightMetadata = null;
      let matchedCategoryEvidence = null;
      let matchedCorrectCol = null;
      const onPosition = async (ms, sc) => {
        if (ms.length < minMoves) return false;
        if (!isClean(category, ms)) return false;
        const predicateResult = await checkPredicate(category, ms, sc, solver);
        if (!predicateResult.passes) return false;
        matchedCorrectCols = predicateResult.correctCols;
        matchedHighlightMetadata = predicateResult.highlight_metadata ?? null;
        matchedCategoryEvidence = predicateResult.category_evidence ?? null;
        matchedCorrectCol = predicateResult.correct_col ?? null;
        return true;
      };

      const result = await solverWeightedPosition(solver, maxMoves, rng, onPosition);
      if (!result) { stats.noMatch++; continue; }

      const { moveString, scores, trace } = result;
      const correctCols = matchedCorrectCols;

      const tags = [];
      if (correctCols.length > 0) {
        const cls = classify(moveString, correctCols[0], scores);
        if (cls?.tag) tags.push(cls.tag);
      }

      const highlight_cells = await computeHighlightCells(category, moveString, scores, correctCols, solver);
      if (highlight_cells === null) {
        stats.depthFilter++;
        continue;
      }

      stats.accepted++;
      candidates.push({
        category,
        move_string: moveString,
        solver_scores: scores,
        classifier_tags: tags,
        debug_trace: trace,
        highlight_cells,
        highlight_metadata: matchedHighlightMetadata,
        category_evidence: matchedCategoryEvidence,
        correct_col: matchedCorrectCol,
      });

      const now = Date.now();
      if (now - lastLogTime >= LOG_INTERVAL_MS) {
        lastLogTime = now;
        const elapsed = ((now - t0) / 1000).toFixed(1);
        console.log(
          `[generateCandidates cat=${category}] ${elapsed}s | attempt=${attempts}/${MAX_ATTEMPTS} found=${candidates.length}/${count}` +
          ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
        );
      }
    }
  } finally {
    solver.destroy();
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[generateCandidates cat=${category}] DONE ${elapsed}s | attempts=${attempts} found=${candidates.length}/${count}` +
    ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
  );

  return { candidates, seed: usedSeed, durationMs: Date.now() - t0 };
}
