import { evaluatePredicate } from './predicates.js';
import { answerSetHolds, isSolverSafe } from './answerSetInvariant.js';
import {
  classify, checkWin, getImmediateThreats, parseBoardState,
  hasActiveDoubleThreat, Board, hasWon,
  detectZThreat, detectClaimeven, detectUndercutVictim, detectOvercutBeneficiary,
  detectFigure7, detectJShape, detectOddEvenThreat,
  detectDoubleThreat, detectForcedWin, detectForcedBlock,
} from './classifier.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { VALID_CATEGORIES, CATEGORY_ORDER } from './categories.js';
import { playGame } from './gameSampling.js';

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

  return { passes: correctCols.length === 1, correctCols };
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
async function computeHighlightCells(category, moveString, scores, correctCols) {
  if (['immediate_threat', 'forced_block', 'double_threat'].includes(category)) return computeLowCategoryHighlight(moveString, correctCols);
  if (category === 'forced_win') return computeForcedWinHighlight(moveString, correctCols);
  if (category === 'forbidden_columns') return computeForbiddenColumnsHighlight(moveString, correctCols);
  if (category === 'odd_even_threat') return []; // No cell highlights needed
  return [];
}

// T011 — check* functions for the 6 new tactical categories

export function checkZThreatPredicate(ms, scores) {
  const result = detectZThreat(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  // T016: consume detectZThreat's own correctCols field (T014) rather than re-deriving the
  // single column from highlightMetadata.column. detectZThreat's existing candidates.length !== 1
  // rejection keeps this a singleton — no cardinality relaxation (FR-010).
  const correctCols = result.correctCols;
  return {
    passes: true,
    correctCols,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

// T019 (spec 051): consume detectClaimeven's now-genuine `correctCols` enumeration (T018) rather
// than the old one-element `[result.correctCol]` wrap. Solver cost: each odd-height column tested
// runs its own `runClaimevenSimulation` (classifier.js), which simulates up to MAX_PAIRS=60
// red/yellow move-pairs, one `solver.query(...)` per pair — in typical practice this terminates
// early on a decided win/loss after roughly 20 queries, not the full 60-pair ceiling. Full
// enumeration therefore costs up to (number of odd-height columns) × ~20 solver queries per
// accepted claimeven candidate, versus one such rollout (~20 queries) before this change. This
// cost lands entirely at generation/backfill time (never per learner request — FR-011); it is
// never incurred on the `/api/evaluate-move` request path.
export async function checkClaimevenPredicate(ms, scores, solver) {
  const result = await detectClaimeven(new Board(ms), solver);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: result.correctCols,
    highlight_metadata: result.highlightMetadata, // null for claimeven
    category_evidence: result.categoryEvidence,
  };
}

export function checkUndercutPredicate(ms, scores) {
  const b = new Board(ms);
  const result = detectUndercutVictim(b, scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  // For undercut, "correct" = any column except the killing_threat column, AND itself safe under
  // the relative solver-safety floor (T024, FR-005, closes OI-61 item 1 on the generation path) —
  // a non-killing column that concedes strictly more than the board's own optimum must not enter
  // the answer set. `isSolverSafe` already encodes the relative floor uniformly for both won and
  // fully-lost boards (LOST-POSITION exemption lives in classifyAnswerSet, not here).
  const killingCol = result.highlightMetadata.cells.find(c => c.role === 'killing_threat').column;
  const correctCols = [];
  for (let c = 0; c < COLS; c++) {
    if (b.colHeights[c] < ROWS && c !== killingCol && isSolverSafe(c, scores)) correctCols.push(c);
  }
  return {
    passes: correctCols.length >= 1,
    correctCols,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkOvercutPredicate(ms, scores) {
  // Beneficiary, not Victim (spec 052 T008, verified at plan review): this call already runs as
  // the side to move (two args, no perspective) and consumes result.correctCols — the closest
  // direct migration of the original detectOvercut loop (contracts C2). Behavior-preserving by
  // construction since the mover-wins framing is unchanged.
  const result = detectOvercutBeneficiary(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  // T016: consume detectOvercutBeneficiary's own correctCols field (T015) rather than re-deriving
  // the single column from highlightMetadata.cells.
  // T032 (Finding F1, FR-010 sub-decision): a board with 2+ structurally valid overcut columns
  // must not silently enter the pool with only the first-found column recorded — the aggregate
  // answerSetHolds check never sees the second column to catch it. Mirrors detectZThreat's own
  // `candidates.length !== 1` singleton guard.
  if (result.correctCols.length !== 1) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: result.correctCols,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkFigure7Predicate(ms) {
  const board = new Board(ms);

  // T011 (spec 051 Epic 1, FR-009): accumulate every matching column, not only the first —
  // control-flow change only, no detector logic re-derived.
  const correctCols = [];
  let firstMatch = null;
  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] >= 6) continue;
    const nextMs = ms + col.toString();
    const nextBoard = new Board(nextMs);
    // Pattern belongs to the player who just moved (last mover)
    const patternOwner = 3 - nextBoard.currentPlayer;
    const result = detectFigure7(nextBoard, null, patternOwner);
    if (!result.matched) continue;

    // Guard: pattern must NOT have been present before the completing move
    const prevResult = detectFigure7(board, null, patternOwner);
    if (prevResult.matched) continue;

    correctCols.push(col);
    if (firstMatch === null) firstMatch = result;
  }
  if (correctCols.length === 0) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols,
    highlight_metadata: firstMatch.highlightMetadata,
    category_evidence: firstMatch.categoryEvidence,
  };
}

export function checkJShapePredicate(ms) {
  const board = new Board(ms);

  // T011 (spec 051 Epic 1, FR-009): accumulate every matching column, not only the first —
  // control-flow change only, no detector logic re-derived.
  const correctCols = [];
  let firstMatch = null;
  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] >= 6) continue;
    const nextMs = ms + col.toString();
    const nextBoard = new Board(nextMs);
    const patternOwner = 3 - nextBoard.currentPlayer;
    const result = detectJShape(nextBoard, null, patternOwner);
    if (!result.matched) continue;

    const prevResult = detectJShape(board, null, patternOwner);
    if (prevResult.matched) continue;

    correctCols.push(col);
    if (firstMatch === null) firstMatch = result;
  }
  if (correctCols.length === 0) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols,
    highlight_metadata: firstMatch.highlightMetadata,
    category_evidence: firstMatch.categoryEvidence,
  };
}

export function checkOddEvenThreatPredicate(ms, scores) {
  const result = detectOddEvenThreat(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: result.correctCols ?? [result.correctCol],
    highlight_metadata: result.highlightMetadata, // null for odd_even_threat
    category_evidence: result.categoryEvidence,
  };
}

// Check whether the current position satisfies the category predicate.
// Returns { passes, correctCols, highlight_metadata?, category_evidence? }.
// Wraps checkPredicateRaw with two cross-cutting generation-time rejection rules (spec 044 US1/US2):
//   US1 (FR-001-003): immediate_threat/forced_block candidates that would cast the learner as the
//     wrong color are rejected outright, not silently corrected.
//   US2 (FR-006-009): any candidate outside forced_block that also contains an unrelated, live
//     (gravity-top) forced-block situation is rejected, unless that forced-block's blocking column
//     coincides with the puzzle's own answer column(s).
export async function checkPredicate(category, moveString, scores, solver) {
  const result = await checkPredicateRaw(category, moveString, scores, solver);
  if (!result.passes) return result;

  // US1: color-cast guard. The learner always plays as `Board(moveString).currentPlayer` — the
  // player to move at the stored puzzle position. immediate_threat requires that player to be P1
  // (green, the side with the winning move); forced_block requires P2 (gray, the side that must
  // block). Empirically: currentPlayer = moveString.length % 2 === 0 ? 1 : 2 (see Board ctor and
  // predicates.js's local currentPlayer() — both derive it the same way).
  if (category === 'immediate_threat' || category === 'forced_block') {
    const learnerPlayer = new Board(moveString).currentPlayer;
    const requiredPlayer = category === 'immediate_threat' ? 1 : 2;
    if (learnerPlayer !== requiredPlayer) {
      return { passes: false, correctCols: [] };
    }
  }

  // US2: stray forced-block distraction guard. detectForcedBlock's default perspective
  // (board.currentPlayer) is exactly "the player about to move at this puzzle position" — the same
  // player the learner plays as, regardless of category. Only gravity-top-reachable blocking
  // columns are ever returned (getImmediateThreats/immediateThreats are gravity-top-only by
  // construction), so a non-reachable forced-block never triggers this rejection.
  if (category !== 'forced_block') {
    const fb = detectForcedBlock(new Board(moveString), scores);
    if (fb.matched) {
      const blockCols = fb.cols ?? [];
      const answerCols = result.correctCols ?? [];
      const coincides = answerCols.some(c => blockCols.includes(c));
      if (!coincides) return { passes: false, correctCols: [] };
    }
  }

  // Answer-set invariant (2026-07-28) — see server/answerSetInvariant.js for the rule and why it
  // exists. One cross-cutting guard rather than a per-category patch, because the failure is
  // generic: a detector says "the pattern is here" while saying nothing about whether playing it
  // is best. Measured need — `checkUndercutPredicate` marks every column EXCEPT the killing one
  // correct without ever checking the killing column is bad, so it emitted boards whose single
  // best move was the one the drill punishes (2 of 7 sampled). The same hole exists wherever an
  // instance detector supplies the answer.
  //
  // forbidden_columns is exempt: checkForbiddenColumnsPredicate returns `correctCols: safeCols` —
  // the ACCEPTED/safe columns, not the columns to avoid — but those safe columns are already
  // whatever remains after the caller's own forbidden-column exclusion, so re-running the
  // answer-set-invariant subset check against them here would be meaningless (double-filtering
  // the same set against itself under a different rule).
  if (category !== 'forbidden_columns' && !answerSetHolds(result.correctCols, scores)) {
    return { passes: false, correctCols: [] };
  }

  // Centralized sort (D6, FR-016a/FR-019) — the single point both generation (T039/T040) and the
  // backfill (T043) write from. Do NOT duplicate this rule inside any individual check*Predicate
  // function. The scalar-sync step that used to live here was removed by the correct-column
  // retirement feature (Commit 2) — correctCols is now the only source of truth.
  result.correctCols = [...result.correctCols].sort((a, b) => a - b);

  return result;
}

async function checkPredicateRaw(category, moveString, scores, solver) {
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

  // immediate_threat/forced_block/double_threat (spec 044 US3 / FR-010, FR-011): one or more
  // legal columns must independently satisfy the category's condition. evaluatePredicate returns
  // 'correct' only when a column is the SOLE satisfying column, and 'tied' when 2+ columns satisfy
  // it — so both outcomes must be accepted here, or a multi-solution board collects zero correctCols
  // (every column evaluates to 'tied', none to 'correct') and is wrongly rejected.
  const correctCols = legalCols.filter(c => {
    const r = evaluatePredicate(puzzle, c, scores);
    return r.result === 'correct' || r.result === 'tied';
  });
  return { passes: correctCols.length >= 1, correctCols };
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

      // FR-011: draw the per-rollout minimum move count from randint(14, 34) (one rng()
      // call). Positions shorter than minMoves are skipped; the rollout is abandoned once
      // it reaches maxMoves without a match.
      const rawMinMoves = 14 + Math.floor(rng() * 21);  // [14, 34] inclusive
      const maxMoves = Math.max(rawMinMoves, 34);
      const minMoves = Math.min(rawMinMoves, maxMoves);

      // Play one mistake-weighted game via the canonical simulator (gameSampling.js),
      // breaking the moment a position satisfies the category predicate. playGame yields
      // each position BEFORE its move with the solver scores at that position — exactly the
      // (moveString, scores) the former onPosition callback received.
      let matched = null;
      let matchedHighlightMetadata = null;
      let matchedCategoryEvidence = null;
      const plies = [];
      for await (const pos of playGame(solver, rng, { maxMistakeProb: 0.25 })) {
        plies.push({ ply: pos.plyIndex, player: pos.player, scores: [...pos.scores], sampled_col: pos.movePlayed });
        if (pos.ms.length >= maxMoves) break;       // abandon this game, try another
        if (pos.ms.length < minMoves) continue;
        if (!isClean(category, pos.ms)) continue;
        const predicateResult = await checkPredicate(category, pos.ms, pos.scores, solver);
        if (!predicateResult.passes) continue;
        matched = { moveString: pos.ms, scores: pos.scores, correctCols: predicateResult.correctCols };
        matchedHighlightMetadata = predicateResult.highlight_metadata ?? null;
        matchedCategoryEvidence = predicateResult.category_evidence ?? null;
        break;
      }
      if (!matched) { stats.noMatch++; continue; }

      const { moveString, scores, correctCols } = matched;
      const trace = { termination: 'predicate_match', plies };

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
        correctCols,
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
