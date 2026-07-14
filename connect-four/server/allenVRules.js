// Allen (2010) V1–V5 victory rules + T4 Case A / Case B operators.
//
// Spec: specs/044-puzzle-generation-correctness (User Story 5, FR-020/FR-021/FR-022/FR-023).
// Each function below is a literal translation of its own KB entry's `formal_predicate` block —
// docs/knowledge-base/allen-v1.md … allen-v5.md and allen-t4.md (Case A / Case B). Read the KB
// entry before touching a function; approved set only (V1–V5, T4 Case A, T4 Case B) — FR-021
// forbids adding any other Allen rule here.
//
// Contract: V1–V5 operators take the SIMPLIFIED-THREAT-SET shape returned by
// `simplifyThreats()` (server/allenTransforms.js, T027) — i.e. `{ threats, t3Pairs, ... }` — NOT
// a raw threat array. This is because V1/V2's counting logic needs T3's "row-2+row-5 pair counts
// as two odd-threated columns" metadata (see allen-v1.md/allen-v2.md "related"/"known_limitations"),
// which is not recoverable from `threats` alone. Callers MUST run `simplifyThreats(rawThreats)`
// first and check `decidedBy` (a T1 win) before calling any V-rule operator — T1 is decisive and
// short-circuits the V1–V5 scan entirely (allen-t1.md: "No further transformation rules need to
// be checked for this column"). There is NO board-mutation step in any of these functions.
//
// Index-base translation (IMPORTANT — read before editing): every KB V-rule's `formal_predicate`
// checks `t.row % 2 == 1` for "odd row", written in ALLEN's own 1-indexed row numbering (see
// allenTransforms.js's "Index-base translation" note). This module's `row` field is 0-indexed
// per project convention, so every "Allen odd row" check below goes through `isAllenOddRow0`
// (imported from allenTransforms.js) rather than a literal `row % 2` — copying the KB's literal
// would silently invert Red/Black zugzwang parity.

import { RED, BLACK, isAllenOddRow0 } from './allenTransforms.js';

// Count of distinct columns in which `player` holds an (Allen-)odd-row major threat, per
// allen-v1.md/allen-v2.md's `red_odd_cols`/`black_odd_cols` set-of-columns construction, with
// the T3 "row-2+row-5 same-player pair counts as TWO odd-threated columns" bonus applied
// (allen-v1.md related: "[[allen-t3]] — row-2+row-5 same player counts as TWO odd-threated
// columns in V1"; allen-v2.md known_limitations: "T3 can contribute to Black's V2 count").
function countOddThreatColumns(threats, player, t3Pairs) {
  const cols = new Set(
    threats.filter((t) => t.player === player && isAllenOddRow0(t.row)).map((t) => t.col)
  );
  let count = cols.size;
  for (const pair of t3Pairs) {
    if (pair.player === player && cols.has(pair.col)) count += 1;
  }
  return count;
}

// True if `player` holds at least one (Allen-)even-row major threat anywhere in `threats`, per
// allen-v4.md's `black_even = any(t for t in threats_after_t1_t7 if t.player == BLACK and
// t.row % 2 == 0)`.
function hasEvenThreat(threats, player) {
  return threats.some((t) => t.player === player && !isAllenOddRow0(t.row));
}

// ── V1 — docs/knowledge-base/allen-v1.md ──────────────────────────────────────────────────
// "Red wins with three major odd-row threats in separate columns." Odd count >= 3 of
// uncancelled Red odd-row threats in separate columns => Red wins. Checked FIRST among V1–V5.
export function v1_evaluator(simplified) {
  const redOddCount = countOddThreatColumns(simplified.threats, RED, simplified.t3Pairs);
  return redOddCount >= 3 && redOddCount % 2 === 1;
}

// ── V2 — docs/knowledge-base/allen-v2.md ──────────────────────────────────────────────────
// "Black wins with two odd-row threats in separate columns." Even count >= 2 of uncancelled
// Black odd-row threats in separate columns => Black wins. Checked second (after V1).
export function v2_evaluator(simplified) {
  const blackOddCount = countOddThreatColumns(simplified.threats, BLACK, simplified.t3Pairs);
  return blackOddCount >= 2 && blackOddCount % 2 === 0;
}

// ── V3 — docs/knowledge-base/allen-v3.md ──────────────────────────────────────────────────
// "Red wins with an odd-row threat." Exactly one uncancelled Red odd-row threat and zero Black
// odd-row threats => Red wins. Checked third (after V1, V2).
export function v3_evaluator(simplified) {
  const redOddCount = countOddThreatColumns(simplified.threats, RED, simplified.t3Pairs);
  const blackOddCount = countOddThreatColumns(simplified.threats, BLACK, simplified.t3Pairs);
  return redOddCount === 1 && blackOddCount === 0;
}

// ── V4 — docs/knowledge-base/allen-v4.md ──────────────────────────────────────────────────
// "Black wins with an even-row threat." Fires only when V1/V2/V3 all fail to fire AND Black
// holds at least one even-row major threat. Checked fourth (after V1, V2, V3).
export function v4_evaluator(simplified) {
  const noV1 = !v1_evaluator(simplified);
  const noV2 = !v2_evaluator(simplified);
  const noV3 = !v3_evaluator(simplified);
  const blackEven = hasEvenThreat(simplified.threats, BLACK);
  return noV1 && noV2 && noV3 && blackEven;
}

// ── V5 — docs/knowledge-base/allen-v5.md ──────────────────────────────────────────────────
// "Otherwise the game is drawn." The else-branch of the V1–V4 decision tree — catch-all Draw.
export function v5_evaluator(simplified) {
  return (
    !v1_evaluator(simplified) &&
    !v2_evaluator(simplified) &&
    !v3_evaluator(simplified) &&
    !v4_evaluator(simplified)
  );
}

// ── T4 Case A — docs/knowledge-base/allen-t4.md ───────────────────────────────────────────
// "Same player, same parity, same column": no cumulative V1/V2 bonus — the pair counts as a
// single effective threat for that player in that column. Operates on a RAW threat array (not
// the simplifyThreats() output), matching the base t4_applies(threats, col) template shape
// (per R5 / allen-t4.md's own formal_predicate signature).
export function t4_case_a_evaluator(threats, col) {
  const columnThreats = threats.filter((t) => t.col === col);
  for (let i = 0; i < columnThreats.length; i++) {
    for (let j = i + 1; j < columnThreats.length; j++) {
      const a = columnThreats[i];
      const b = columnThreats[j];
      if (a.player === b.player && a.row % 2 === b.row % 2) return true;
    }
  }
  return false;
}

// ── T4 Case B — docs/knowledge-base/allen-t4.md ───────────────────────────────────────────
// "Opposite players, same parity, same column": both threats remain active; neither cancels the
// other (T7 does not apply within a single column — cross-column only).
export function t4_case_b_evaluator(threats, col) {
  const columnThreats = threats.filter((t) => t.col === col);
  for (let i = 0; i < columnThreats.length; i++) {
    for (let j = i + 1; j < columnThreats.length; j++) {
      const a = columnThreats[i];
      const b = columnThreats[j];
      if (a.player !== b.player && a.row % 2 === b.row % 2) return true;
    }
  }
  return false;
}
