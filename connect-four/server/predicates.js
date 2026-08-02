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

import { Board, detectDoubleThreat, detectForcedWin, detectOddEvenThreat } from './classifier.js';
import { isSolverSafe } from './answerSetInvariant.js';

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
  switch (puzzle.category) {
    case 'immediate_threat': return evalImmediateThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_block': return evalForcedBlock(candidateCol, puzzle.moveString);
    case 'double_threat': return evalDoubleThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_win': return evalForcedWin(candidateCol, puzzle);
    case 'forbidden_columns': return evalForbiddenColumns(candidateCol, scores, puzzle.moveString);
    case 'z_threat': return evalZThreat(candidateCol, puzzle);
    case 'claimeven': return evalClaimeven(candidateCol, puzzle);
    case 'undercut': return evalUndercut(candidateCol, puzzle, scores);
    case 'overcut': return evalOvercut(candidateCol, puzzle);
    case 'figure_7': return evalFigure7(candidateCol, puzzle);
    case 'j_shape': return evalJShape(candidateCol, puzzle);
    case 'odd_even_threat': return evalOddEvenThreat(candidateCol, puzzle, scores);
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

// double_threat: Create a double threat — a move after which the opponent cannot answer every
// winning cell.
//
// The definition of "double threat" lives in ONE place: classifier.js#detectDoubleThreat, which
// recognises both routes —
//   Case A: gravity-top threats in ≥2 distinct columns;
//   Case B: two threats stacked on consecutive rows of ONE column (the opponent must block the
//           lower, which hands over the upper).
// This evaluator must never re-derive it. It previously did, with a private helper that only read
// cells at the current column height, so it saw Case A only and graded every Case-B fork wrong —
// the reported lesson-06 bug (board '104300405142342531': cols 1 and 5 are Case-B forks).
//
// There is deliberately NO "no fork -> grade by highest positive solver score" fallback. That
// fallback used to make a fork drill silently become a best-move drill, and — because
// candidate-generator.js grades through this same function — it admitted boards with no fork at
// all into the double_threat puzzle pool. A board where no column forks is not a double_threat
// puzzle: every column is wrong and checkPredicate reports passes: false.
function evalDoubleThreat(candidateCol, scores, moveString) {
  const board = new Board(moveString);
  const player = board.currentPlayer;

  // The winning cells the fork leaves behind, in the historical { col, row } shape (0-indexed),
  // read from the same primitive detectDoubleThreat itself walks (classifier.js:1430-1432).
  function threatCellsAfterMove(col) {
    const cells = [];
    for (const [c, rows] of board.withMove(col).reachableThreats(player)) {
      for (const row of rows) cells.push({ col: c, row });
    }
    return cells;
  }

  const doubleThreatCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!(scores[col] > 0)) continue;   // a structural fork that still loses is not the answer
    if (detectDoubleThreat(board.withMove(col), player).matched) doubleThreatCols.push(col);
  }

  if (doubleThreatCols.length === 0) return { result: 'wrong' };

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

// z_threat: correct column is stored in highlightMetadata.column. FR-003/FR-010: graded as set
// membership against a solver-gated one-element set (detectZThreat's own candidates.length !== 1
// rejection keeps this a singleton — no cardinality relaxation), not a bare scalar equality check.
function evalZThreat(candidateCol, puzzle) {
  const correctCol = puzzle.highlightMetadata?.column;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  const correctCols = [correctCol];
  if (correctCols.includes(candidateCol)) return { result: 'correct', correctCol: candidateCol };
  return { result: 'wrong', correctCol: correctCols[0] };
}

// claimeven (T020, FR-003/FR-011/FR-012): set membership, not equality against a single stored
// scalar. Threaded, not recomputed: detectClaimeven is async and solver-simulating — one
// `runClaimevenSimulation` rollout (~20 solver queries) per odd-height column tested — which is
// exactly the per-request cost FR-011 forbids on this evaluator's row-less/computed-live branch.
// Applying Batch 2's recompute-vs-thread finding (see evalFigure7 above) to claimeven specifically:
// recomputing live here would additionally re-run the same solver-simulation cost on every graded
// request, not just re-derive a cheap structural predicate — a strictly worse violation of FR-011
// than the figure_7/j_shape case (which only risked a stale *notion* of "correct", not a live
// solver call). So this evaluator reads the already-enumerated `puzzle.correctCols` (falling back
// to the legacy scalar `puzzle.correctCol` for callers that don't thread a set — same fallback
// shape as evalFigure7/evalJShape/evalOddEvenThreat). Deliberately NO uniqueness constraint
// (FR-012) — claimeven legitimately has no uniqueness rule; a board with 2+ independently valid
// response columns keeps every one of them correct.
function evalClaimeven(candidateCol, puzzle) {
  const correctCols = puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : []);
  if (correctCols.length === 0) return { result: 'wrong' };
  if (correctCols.includes(candidateCol)) {
    const others = correctCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: correctCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: correctCols[0] };
}

// undercut: any column except the killing_threat column is correct, AND itself safe under the
// relative solver-safety floor (T025, FR-004, closes OI-61 item 1 on the grading path). T024
// (checkUndercutPredicate) and this are independent implementations of the same fix — both are
// required; fixing only one leaves the other's defect live. Per checkPredicate's own convention
// (immediate_threat/forced_block are legitimately checked with `scores = []` — see
// answerSetInvariant.js's classifyAnswerSet NO-SCORES verdict), an unusable/empty scores array
// means "cannot verify the floor" and the check is skipped rather than failed closed — only a
// real, full-length score array can prove a column unsafe.
function evalUndercut(candidateCol, puzzle, scores) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const killing = cells.find(c => c.role === 'killing_threat');
  if (!killing) return { result: 'wrong' };
  if (candidateCol === killing.column) return { result: 'wrong', correctCol: null };
  if (Array.isArray(scores) && scores.length === COLS && !isSolverSafe(candidateCol, scores)) {
    return { result: 'wrong', correctCol: null };
  }
  return { result: 'correct' };
}

// overcut: must play the major_threat column. FR-003/FR-010: graded as set membership against a
// solver-gated one-element set (uniqueness now enforced by T032's guard on the generation path,
// `checkOvercutPredicate`'s `correctCols.length !== 1` check — Finding F1), not a bare scalar
// equality check.
function evalOvercut(candidateCol, puzzle) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const major = cells.find(c => c.role === 'major_threat');
  if (!major) return { result: 'wrong' };
  const correctCols = [major.column];
  if (correctCols.includes(candidateCol)) return { result: 'correct', correctCol: candidateCol };
  return { result: 'wrong', correctCol: correctCols[0] };
}

// figure_7 (T012, FR-003/FR-009): set membership, not equality against a single stored scalar.
// Threaded, not recomputed: checkFigure7Predicate's "does playing this column COMPLETE the
// 5-cell kernel" notion (candidate-generator.js) is generation-time-specific and does not match
// every figure_7 board's teaching intent — lesson-13-figure-7.json teaches a board where the
// kernel is already fully formed and the correct move exploits the resulting threat column
// (verified at source 2026-07-29: detectFigure7 matches identically before AND after that move,
// since the answer column sits outside the kernel entirely). Recomputing detectFigure7 live here
// broke that lesson's answer set; reading the stored/threaded `correctCols` (falling back to the
// legacy scalar `correctCol` for callers that don't yet thread a set — buildPredicatePuzzle,
// spec 051 US1, was not extended to carry `correctCols`) preserves both the old scalar callers
// and the new multi-column T011 fixtures.
function evalFigure7(candidateCol, puzzle) {
  const correctCols = puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : []);
  if (correctCols.length === 0) return { result: 'wrong' };
  if (correctCols.includes(candidateCol)) {
    const others = correctCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: correctCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: correctCols[0] };
}

// j_shape (T012, FR-003/FR-009): set membership, same threaded/fallback reasoning as evalFigure7.
function evalJShape(candidateCol, puzzle) {
  const correctCols = puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : []);
  if (correctCols.length === 0) return { result: 'wrong' };
  if (correctCols.includes(candidateCol)) {
    const others = correctCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: correctCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: correctCols[0] };
}

// odd_even_threat (FR-006, spec 051 Epic 1, closes OI-75): set membership against
// detectOddEvenThreat's own correctCols, not equality against a single stored scalar.
// detectOddEvenThreat already produces a correctCols array (classifier.js) — no detector change
// needed; this evaluator recomputes it live from moveString + scores, exactly as evalDoubleThreat
// recomputes detectDoubleThreat live (contract shape only — this is not a copy-paste of that sweep).
function evalOddEvenThreat(candidateCol, puzzle, scores) {
  const board = new Board(puzzle.moveString);
  const result = detectOddEvenThreat(board, scores);
  if (!result.matched) return { result: 'wrong' };
  const correctCols = result.correctCols;
  if (correctCols.includes(candidateCol)) {
    const others = correctCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: correctCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: correctCols[0] };
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
