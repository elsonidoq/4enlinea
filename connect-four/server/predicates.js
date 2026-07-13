// Goal predicate evaluator for puzzle categories.
// Each category defines what "correct" means for a puzzle.

// ── Spec 044 / T013 — exhaustive `evaluatePredicate` caller sweep (multi-solution 'tied' fix) ──
// Run: `rg -n 'evaluatePredicate' connect-four` (2026-07-10). Every hit, classified:
//
//   fix-needed (branches on result === 'correct' only, ignoring 'tied'):
//     - server/candidate-generator.js:493 (inside checkPredicateRaw's correctCols filter) — this
//       IS the T016 fix itself (changed in this same commit to accept 'correct' || 'tied').
//
//   no-fix-needed (already treats 'tied' as accepted, or is category-agnostic passthrough,
//   or is a non-production caller — test/debug script):
//     - server/index.js:1646  (POST /api/evaluate-move/inline) — never branches on
//       `result === 'correct'` at all; `quality`/`badge` come from scoreMove (solver-score
//       comparison), and evaluatePredicate's result is only used to additively expose
//       `correctCol`/`threatCells`/`forbiddenCols`. Category-agnostic passthrough — no fix needed.
//     - server/index.js:2317  (POST /api/puzzles/:id/check) — already computes
//       `isSuccess = evaluation.result === 'correct' || evaluation.result === 'tied'`.
//     - server/index.js:3101  (GET /api/admin/scores, curation tool) — already computes
//       `predicatePass = evalResult.result === 'correct' || evalResult.result === 'tied'`.
//     - server/debug-immediate-threat.js:9 — standalone CLI debug script, prints raw
//       `JSON.stringify(result)`; not a production caller, no accept/reject branch at all.
//     - tests/predicates/predicates.test.js, tests/integration/claimeven.test.js,
//       tests/integration/undercut_overcut.test.js, tests/integration/z_threat.test.js — test
//       assertions read `evaluation.result` directly (asserting the exact expected string), they
//       do not implement accept/reject business logic that could reintroduce the "false wrong" bug.
//
// Conclusion: exactly ONE production caller needed the fix (candidate-generator.js:493, the T016
// change). The three server/index.js endpoints that gate on evaluatePredicate's result were
// already written to accept 'tied' as correct — no T017 caller updates were required beyond T016.
// `/api/evaluate-move` (server/index.js ~1543, the endpoint ChallengeScreen.jsx actually uses for
// the puzzle-draw path) does NOT call evaluatePredicate at all today — see T015/T020 below, which
// is a separate gap (client never got a category-aware verdict in the first place, not a 'tied'
// mishandling) addressed by extending that endpoint in place.

import { Board, detectDoubleThreat, detectForcedWin } from './classifier.js';

const ROWS = 6;
const COLS = 7;

// Returns a fresh board + heights from a move string.
function parseBoard(moveString) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moveString.length; i++) {
    const col = parseInt(moveString[i], 10);
    board[heights[col]][col] = (i % 2 === 0) ? 1 : 2;
    heights[col]++;
  }
  return { board, heights };
}

// Returns the current player: 1 if even moves played, 2 if odd.
function currentPlayer(moveCount) {
  return (moveCount % 2 === 0) ? 1 : 2;
}

// Spec 049 (Epic 9) T005 — single shared constructor for the object passed into
// evaluatePredicate() from either POST /api/evaluate-move or POST /api/evaluate-move/inline.
// Both handlers must build this object identically (FR-006's single-code-path mandate) — do not
// add a second construction path in either handler.
//
// Plan.md Decision D2: goalPredicateType/goalPredicateParams are passed through, defaulted from
// `puzzle` when present, matching the /inline handler's pre-existing
// `puzzle.goalPredicateType || category` / `puzzle.goalPredicateParams ?? null` logic — this is
// what keeps /inline's forced_win/forbidden_columns categories working once T007 routes it
// through this same helper (those two categories read goalPredicateType/goalPredicateParams, not
// correctCol/highlightMetadata).
//
// @param {string} category - the puzzle category slug
// @param {string} movestring - 0-indexed move string for the position being evaluated
// @param {object} [opts]
// @param {number} [opts.correctCol] - camelCase scalar answer column (claimeven/figure_7/j_shape)
// @param {object} [opts.highlightMetadata] - camelCase answer metadata (z_threat/undercut/overcut)
// @param {object} [opts.puzzle] - optional richer puzzle object (as sent to /inline) to source
//   goalPredicateType/goalPredicateParams/moveString overrides from
// @returns {object} a predicate-ready puzzle object for evaluatePredicate()
export function buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle } = {}) {
  return {
    moveString: puzzle?.moveString || movestring,
    category,
    goalPredicateType: puzzle?.goalPredicateType || category,
    goalPredicateParams: puzzle?.goalPredicateParams ?? null,
    highlightMetadata: highlightMetadata ?? puzzle?.highlightMetadata ?? null,
    correctCol: correctCol !== undefined ? correctCol : puzzle?.correctCol,
  };
}

// Evaluate a puzzle attempt given the puzzle definition and solver scores.
//
// @param {object} puzzle  - { id, category, moveString, goalPredicateType, goalPredicateParams, cooperativeAiMoves }
// @param {number} candidateCol  - 0-indexed column the user chose
// @param {number[]} scores      - solver scores for all 7 columns
// @returns {{ result: 'correct'|'wrong'|'tied', correctCol?: number, tiedWith?: number[] }}
export function evaluatePredicate(puzzle, candidateCol, scores) {
  const moveCount = puzzle.moveString.length;

  switch (puzzle.category) {
    case 'immediate_threat': return evalImmediateThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_block': return evalForcedBlock(candidateCol, puzzle.moveString);
    case 'double_threat': return evalDoubleThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_win': return evalForcedWin(candidateCol, puzzle);
    case 'forbidden_columns': return evalForbiddenColumns(candidateCol, scores, puzzle.moveString);
    case 'z_threat': return evalZThreat(candidateCol, puzzle);
    case 'claimeven': return evalClaimeven(candidateCol, puzzle);
    case 'undercut': return evalUndercut(candidateCol, puzzle);
    case 'overcut': return evalOvercut(candidateCol, puzzle);
    case 'figure_7': return evalFigure7(candidateCol, puzzle);
    case 'j_shape': return evalJShape(candidateCol, puzzle);
    case 'odd_even_threat': return evalOddEvenThreat(candidateCol, puzzle);
    default: return { result: 'wrong' };
  }
}

// immediate_threat: Play the immediate winning move.
function evalImmediateThreat(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const player = currentPlayer(moveString.length);
  const winningCols = [];
  for (let i = 0; i < COLS; i++) {
    if (heights[i] >= ROWS) continue;
    board[heights[i]][i] = player;
    if (checkWin(board, heights[i], i, player)) winningCols.push(i);
    board[heights[i]][i] = 0;
  }

  if (winningCols.length === 0) return { result: 'wrong' };
  if (winningCols.includes(candidateCol)) {
    const others = winningCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: winningCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: winningCols[0] };
}

// Returns true if `opponent` has at least one immediately playable winning move.
function opponentWinsImmediately(board, heights, opponent) {
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    board[heights[c]][c] = opponent;
    const wins = checkWin(board, heights[c], c, opponent);
    board[heights[c]][c] = 0;
    if (wins) return true;
  }
  return false;
}

// forced_block: Block the opponent's immediate winning threat.
// Uses direct board checks (not score thresholds) to determine whether the
// opponent can win immediately — avoids the floor/ceil scoring ambiguity.
function evalForcedBlock(candidateCol, moveString) {
  const { board, heights } = parseBoard(moveString);
  const player = currentPlayer(moveString.length);
  const opponent = 3 - player;

  const safeCols = [];
  let hasImmediateThreat = false;
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    board[heights[c]][c] = player;
    heights[c]++;
    const oppWins = opponentWinsImmediately(board, heights, opponent);
    heights[c]--;
    board[heights[c]][c] = 0;
    if (oppWins) {
      hasImmediateThreat = true;
    } else {
      safeCols.push(c);
    }
  }

  if (!hasImmediateThreat || safeCols.length === 0) return { result: 'wrong' };

  if (safeCols.includes(candidateCol)) {
    const others = safeCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: safeCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: safeCols[0] };
}

// double_threat: Create a double threat (≥2 simultaneous winning threats after the move).
function evalDoubleThreat(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const player = currentPlayer(moveCount);

  function getThreatCells(b, h, p) {
    // Returns cells where p has an immediate winning threat (not pre-empted by opponent).
    const opp = 3 - p;
    const cells = [];
    for (let col = 0; col < COLS; col++) {
      const row = h[col];
      if (row >= ROWS) continue;
      b[row][col] = p;
      const playerWins = checkWin(b, row, col, p);
      b[row][col] = 0;
      if (!playerWins) continue;
      b[row][col] = opp;
      const oppWins = checkWin(b, row, col, opp);
      b[row][col] = 0;
      if (!oppWins) cells.push({ col, row });
    }
    return cells;
  }

  function threatCellsAfterMove(col) {
    const row = heights[col];
    if (row >= ROWS) return [];
    const b = board.map(r => [...r]);
    const h = [...heights];
    b[row][col] = player;
    h[col]++;
    return getThreatCells(b, h, player);
  }

  // Find all columns that create ≥2 threats
  const doubleThreatCols = [];
  for (let col = 0; col < COLS; col++) {
    if (scores[col] > 0 && threatCellsAfterMove(col).length >= 2) {
      doubleThreatCols.push(col);
    }
  }

  if (doubleThreatCols.length === 0) {
    // Fallback: positive score moves
    const bestScore = Math.max(...scores.filter(s => s > 0));
    const bestCols = scores.reduce((acc, s, i) => { if (s === bestScore) acc.push(i); return acc; }, []);
    if (bestCols.includes(candidateCol)) {
      return { result: 'tied', tiedWith: bestCols.filter(c => c !== candidateCol), correctCol: bestCols[0] };
    }
    return { result: 'wrong', correctCol: bestCols[0] };
  }

  if (doubleThreatCols.includes(candidateCol)) {
    const others = doubleThreatCols.filter(c => c !== candidateCol);
    const threatCells = threatCellsAfterMove(candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: doubleThreatCols[0], threatCells }
      : { result: 'correct', correctCol: candidateCol, threatCells };
  }
  const threatCells = threatCellsAfterMove(doubleThreatCols[0]);
  return { result: 'wrong', correctCol: doubleThreatCols[0], threatCells };
}

// forced_win: Does candidateCol initiate a forced-win chain?
// Board-based: the move must create exactly 1 immediate threat (not 0, not 2+),
// and from there a chain of single-threat forcing steps must reach a terminal
// (immediate win or double threat). Works for both Red and Yellow as initiator.
function evalForcedWin(candidateCol, puzzle) {
  const board = new Board(puzzle.moveString);
  const player = board.currentPlayer;
  const row = board.colHeights[candidateCol];
  if (row >= ROWS) return { result: 'wrong' };

  const afterMove = board.withMove(candidateCol);

  // Cannot initiate a forced win by winning immediately — that's immediate_threat.
  if (afterMove.checkWin(row, candidateCol, player)) return { result: 'wrong' };

  // First move already creates a double threat — that's Category 3 (double_threat).
  if (detectDoubleThreat(afterMove, player).matched) return { result: 'wrong' };

  // Core check: does candidateCol initiate a forced-win chain?
  const candidateMatches = detectForcedWin(afterMove, player).matched;

  // Scan all columns to find every forced-win initiator.
  const initCols = [];
  for (let c = 0; c < COLS; c++) {
    if (board.colHeights[c] >= ROWS) continue;
    const otherAfter = board.withMove(c);
    const otherRow = board.colHeights[c];
    if (otherAfter.checkWin(otherRow, c, player)) continue;
    if (detectDoubleThreat(otherAfter, player).matched) continue;
    if (detectForcedWin(otherAfter, player).matched) initCols.push(c);
  }

  if (initCols.length === 0) return { result: 'wrong' };  // no column initiates a forced win
  const correctCol = initCols[0];

  if (!candidateMatches) return { result: 'wrong', correctCol };

  if (initCols.length > 1) {
    const others = initCols.filter(c => c !== candidateCol);
    return { result: 'tied', tiedWith: others, correctCol: candidateCol };
  }
  return { result: 'correct', correctCol: candidateCol };
}

// forbidden_columns: Identify columns that would hand the opponent an immediate win.
// A column is forbidden if: Red plays there (and does NOT win), and then Yellow plays
// in that same column one row above and wins.
function evalForbiddenColumns(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const red = currentPlayer(moveCount);
  const yellow = 3 - red;

  const forbiddenCols = [];
  for (let c = 0; c < COLS; c++) {
    const h = heights[c];
    if (h >= ROWS || h + 1 >= ROWS) continue;
    const b = board.map(r => [...r]);
    b[h][c] = red;
    if (checkWin(b, h, c, red)) continue;
    b[h + 1][c] = yellow;
    if (checkWin(b, h + 1, c, yellow)) forbiddenCols.push(c);
  }

  if (forbiddenCols.length === 0) return { result: 'wrong', forbiddenCols: [] };
  if (forbiddenCols.includes(candidateCol)) return { result: 'wrong', forbiddenCols };
  return { result: 'correct', forbiddenCols };
}

// ── New category evaluators (T012) ───────────────────────────────────────────

// z_threat: correct column is stored in highlightMetadata.column
function evalZThreat(candidateCol, puzzle) {
  const correctCol = puzzle.highlightMetadata?.column;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// claimeven: correct column stored as correctCol on puzzle
function evalClaimeven(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// undercut: any column except the killing_threat column is correct
function evalUndercut(candidateCol, puzzle) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const killing = cells.find(c => c.role === 'killing_threat');
  if (!killing) return { result: 'wrong' };
  if (candidateCol === killing.column) return { result: 'wrong', correctCol: null };
  return { result: 'correct' };
}

// overcut: must play the major_threat column
function evalOvercut(candidateCol, puzzle) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const major = cells.find(c => c.role === 'major_threat');
  if (!major) return { result: 'wrong' };
  if (candidateCol === major.column) return { result: 'correct', correctCol: major.column };
  return { result: 'wrong', correctCol: major.column };
}

// figure_7: correct column stored as correctCol on puzzle
function evalFigure7(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// j_shape: correct column stored as correctCol on puzzle
function evalJShape(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// odd_even_threat: correct column stored as correctCol on puzzle
function evalOddEvenThreat(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// ── Board utilities ───────────────────────────────────────────────────────────

function checkWin(board, row, col, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let d = 1; d <= 3; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cnt++;
      else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cnt++;
      else break;
    }
    if (cnt >= 4) return true;
  }
  return false;
}
