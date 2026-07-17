// Allen (2010) T1–T7 threat-simplification detectors.
//
// Spec: specs/044-puzzle-generation-correctness (User Story 4, FR-016/FR-017/FR-018/FR-019).
// Each function below is a literal, pure translation of its own KB entry's `formal_predicate`
// block — docs/knowledge-base/allen-t1.md … allen-t7.md. Read the KB entry before touching a
// function; do not "harmonize" signatures across rules — R5 confirmed shapes differ (T4/T5
// return bool for a given column; T1/T6/T7 operate over the whole threat set; T2 returns a set
// of neutralized threats; T3 returns column/player pairs).
//
// Contract (FR-017): input is a THREAT SET, not a board. A threat is
//   { player: 1 | 2, col: 0-6, row: 0-5 }   (0-indexed, per project convention)
// where player 1 = Red = first player = green in-app, player 2 = Black = second player = gray
// in-app (see CLAUDE.md "Player color aliases"). There is NO board-mutation step and NO
// gravity/reachability check in any of these functions — that is explicitly out of scope
// (Edge Case 3 of spec.md).

export const RED = 1; // Allen "Red" == first player == P1 == green in-app
export const BLACK = 2; // Allen "Black" == second player == P2 == gray in-app

function threatKey(t) {
  return `${t.player}:${t.col}:${t.row}`;
}

// ── Index-base translation (IMPORTANT — read before editing any absolute row constant) ─────
// Every KB entry's prose and `formal_predicate` (allen-t1.md … allen-t7.md) is written in
// Allen's OWN row numbering, which is 1-indexed with row 1 = bottom (confirmed against
// `visualize_board.mjs`'s "Major threats" list, which prints `col${col+1} row${row+1}` — i.e.
// the KB's "col4 row3" text is that tool's 1-indexed output, not the project's 0-indexed
// convention). CLAUDE.md's coordinate convention is a hard, project-wide invariant: rows here
// are 0-indexed (row 0 = bottom, row 5 = top).
//
// Consequence: Allen's "odd row" (rows 1, 3, 5 in his 1-indexed numbering) is rows {0, 2, 4} in
// this module's 0-indexed `row` field — i.e. EVEN in 0-indexed arithmetic. Allen's "even row"
// (2, 4, 6) is rows {1, 3, 5} here — ODD in 0-indexed arithmetic. Any KB pseudocode that does a
// *relative* parity comparison between two threat rows (`a.row % 2 === b.row % 2`, T2/T4) is
// basis-independent and needs no change — shifting both operands by the same constant preserves
// whether they match. Any KB pseudocode that checks an *absolute* parity or literal row number
// (T3's rows 2/5, T5's rows 3/6, T6's "even row", T7's "odd row") DOES need translation — that
// translation is applied explicitly below via the ALLEN_ROW_* / isAllenOddRow0 helpers, not by
// copying the KB's `row % 2 == 1` literal, which would silently invert Red/Black zugzwang parity
// if applied directly to a 0-indexed row.
const ALLEN_ROW2_0 = 1; // Allen row 2 (T3) → 0-indexed row 1
const ALLEN_ROW3_0 = 2; // Allen row 3 (T5) → 0-indexed row 2
const ALLEN_ROW5_0 = 4; // Allen row 5 (T3) → 0-indexed row 4
const ALLEN_ROW6_0 = 5; // Allen row 6 (T5) → 0-indexed row 5

// True if a 0-indexed row corresponds to one of Allen's ODD rows (1, 3, 5 in his numbering).
// Exported (Batch 4 / US5) so allenVRules.js can translate the KB V-rules' `row % 2 == 1`
// (Allen-indexed) literals into this project's 0-indexed row field without duplicating the
// translation table — see the "Index-base translation" note above.
export function isAllenOddRow0(row0) {
  return row0 % 2 === 0;
}

// ── T1 — docs/knowledge-base/allen-t1.md ──────────────────────────────────────────────────
// "If a player has two major threats at consecutive rows r and r+1 in the same column, that
// player wins unconditionally." KB's own formal_predicate returns just `player`; the KB's
// documented Output shape is "(player, col) pair", so we return { player, col } using the
// column at which the adjacent pair was found (both are recoverable from the same loop the KB
// pseudocode already runs).
export function t1_winner(threats) {
  const byPlayerCol = new Map();
  for (const t of threats) {
    const key = `${t.player}:${t.col}`;
    if (!byPlayerCol.has(key)) byPlayerCol.set(key, { player: t.player, col: t.col, rows: [] });
    byPlayerCol.get(key).rows.push(t.row);
  }
  for (const { player, col, rows } of byPlayerCol.values()) {
    const sorted = [...rows].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] === sorted[i] + 1) {
        return { player, col };
      }
    }
  }
  return null;
}

// ── T2 — docs/knowledge-base/allen-t2.md ──────────────────────────────────────────────────
// Opposite-player, opposite-parity threats in the same column: the lower threat neutralizes
// (undercuts) the upper one. Sub-case 3 (lower = odd, upper = even) additionally requires the
// rows to be immediately adjacent. Returns the set of neutralized (upper) threats.
export function t2_neutralized(threats) {
  const neutralized = new Map();
  const byCol = new Map();
  for (const t of threats) {
    if (!byCol.has(t.col)) byCol.set(t.col, []);
    byCol.get(t.col).push(t);
  }
  for (const colThreats of byCol.values()) {
    const sorted = [...colThreats].sort((a, b) => a.row - b.row);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const lower = sorted[i];
        const upper = sorted[j];
        if (lower.player === upper.player) continue; // opposite players required
        if (lower.row % 2 === upper.row % 2) continue; // opposite parity required (relative — basis-independent)
        // Sub-case 3 (lower Allen-odd, upper Allen-even) requires immediate adjacency. This is an
        // ABSOLUTE parity check (not a relative one), so it must go through isAllenOddRow0 — see
        // the "Index-base translation" note above.
        if (isAllenOddRow0(lower.row) && upper.row !== lower.row + 1) continue;
        const key = threatKey(upper);
        if (!neutralized.has(key)) neutralized.set(key, { player: upper.player, col: upper.col, row: upper.row });
      }
    }
  }
  return new Set(neutralized.values());
}

// ── T3 — docs/knowledge-base/allen-t3.md ──────────────────────────────────────────────────
// Same-player row-2 + row-5 pair in one column: equivalent to two independent odd-threated
// columns for V1/V2 counting purposes. Explicitly extends to minor threats (t3_pairs_minor).
export function t3_pairs(threats) {
  const byPlayerCol = new Map();
  for (const t of threats) {
    const key = `${t.player}:${t.col}`;
    if (!byPlayerCol.has(key)) byPlayerCol.set(key, { player: t.player, col: t.col, rows: new Set() });
    byPlayerCol.get(key).rows.add(t.row);
  }
  const result = [];
  for (const { player, col, rows } of byPlayerCol.values()) {
    if (rows.has(ALLEN_ROW2_0) && rows.has(ALLEN_ROW5_0)) result.push({ col, player });
  }
  return result;
}

// T3 also applies to minor threats (Allen: "this important rule also applies to minor threats").
// Same structure as t3_pairs, applied to a caller-supplied minor-threat set.
export function t3_pairs_minor(minorThreats) {
  return t3_pairs(minorThreats);
}

// ── T4 — docs/knowledge-base/allen-t4.md ──────────────────────────────────────────────────
// "Threats with the same row parity have no influence on each other." Returns whether ANY pair
// of major threats in `col` (regardless of owning player) shares row parity. Per R5, this KB
// entry's own formal_predicate is the template shape: t4_applies(threats, col) -> bool.
export function t4_applies(threats, col) {
  const columnThreats = threats.filter((t) => t.col === col);
  if (columnThreats.length < 2) return false;
  for (let i = 0; i < columnThreats.length; i++) {
    for (let j = i + 1; j < columnThreats.length; j++) {
      if (columnThreats[i].row % 2 === columnThreats[j].row % 2) return true;
    }
  }
  return false;
}

// ── T5 — docs/knowledge-base/allen-t5.md ──────────────────────────────────────────────────
// "Third-row and sixth-row threats do not influence each other." Returns whether `col` contains
// both a row-3 and a row-6 threat (any player(s)).
export function t5_applies(threats, col) {
  const columnThreats = threats.filter((t) => t.col === col);
  const rows = new Set(columnThreats.map((t) => t.row));
  return rows.has(ALLEN_ROW3_0) && rows.has(ALLEN_ROW6_0);
}

// ── T6 — docs/knowledge-base/allen-t6.md ──────────────────────────────────────────────────
// "Red's isolated even-row threats have no value." Returns the set of Red (player 1) major
// threats on an even row that are NOT exempted by the T1 (adjacent-pair) or T3 (row-2+row-5
// pair) exceptions.
export function t6_worthless(threats) {
  const worthless = new Map();
  const redThreats = new Map();
  for (const t of threats) {
    if (t.player === RED) redThreats.set(`${t.col}:${t.row}`, t);
  }
  for (const t of redThreats.values()) {
    if (isAllenOddRow0(t.row)) continue; // only Allen-even rows are candidates
    const hasAdjacentRedOdd =
      (redThreats.has(`${t.col}:${t.row - 1}`) && isAllenOddRow0(redThreats.get(`${t.col}:${t.row - 1}`).row)) ||
      (redThreats.has(`${t.col}:${t.row + 1}`) && isAllenOddRow0(redThreats.get(`${t.col}:${t.row + 1}`).row));
    const isT3Component = t.row === ALLEN_ROW2_0 && redThreats.has(`${t.col}:${ALLEN_ROW5_0}`);
    if (!hasAdjacentRedOdd && !isT3Component) {
      const key = threatKey(t);
      if (!worthless.has(key)) worthless.set(key, { player: t.player, col: t.col, row: t.row });
    }
  }
  return new Set(worthless.values());
}

// ── T7 — docs/knowledge-base/allen-t7.md ──────────────────────────────────────────────────
// "Red and Black odd-row threats in separate columns cancel each other." Pairwise, one-for-one
// cancellation of uncancelled Red/Black odd-row major threats across DIFFERENT columns. Intended
// to run on an already T1–T6-simplified threat set (per the KB's own "Input" comment).
export function t7_cancellations(threats) {
  const redOdd = threats
    .filter((t) => t.player === RED && isAllenOddRow0(t.row))
    .map((t) => ({ col: t.col, row: t.row }));
  const blackOdd = threats
    .filter((t) => t.player === BLACK && isAllenOddRow0(t.row))
    .map((t) => ({ col: t.col, row: t.row }));

  const cancellations = [];
  let rIdx = 0;
  let bIdx = 0;
  while (rIdx < redOdd.length && bIdx < blackOdd.length) {
    const r = redOdd[rIdx];
    const b = blackOdd[bIdx];
    if (r.col !== b.col) {
      cancellations.push([
        { player: RED, col: r.col, row: r.row },
        { player: BLACK, col: b.col, row: b.row },
      ]);
      rIdx += 1;
      bIdx += 1;
    } else {
      // Same column — governed by T2/T4/T5, not T7. Skip this Red threat and try the next.
      rIdx += 1;
    }
  }
  return cancellations;
}

// ── T027 — composition helper ──────────────────────────────────────────────────────────────
// Runs the applicable T1–T7 detectors, in the precedence order documented across the KB entries
// (T1 first — "must be checked before T2–T7 because an adjacent pair resolves the column
// instantly"; T3 before T6 — "T3 fires first and treats the pair as two independent odd-row
// columns... a correct implementation must check T3 before T4[/T6]"; T2/T6 remove threats from
// the set before T7 runs, per each rule's own "Effect" section), and returns the SIMPLIFIED
// THREAT SET for downstream V1–V5 consumption (FR-019, Batch 4).
//
// Only T2, T6, and T7 remove threats from the set (per their own KB "Effect" sections — T3/T4/T5
// are metadata-only: they change how a column is COUNTED by V1–V5, not which threats survive).
// T1 is decisive and short-circuits: if it fires, no further simplification is meaningful (per
// its own KB note: "No further transformation rules need to be checked for this column").
//
// Returns:
//   {
//     threats: Threat[],              // simplified threat set (T2/T6/T7 removals applied)
//     decidedBy: { rule: 'T1', winner: number, col: number } | null,
//     t3Pairs: { col, player }[],     // metadata: columns counting double for V1/V2
//     t4Cols: number[],               // metadata: columns where same-parity threats coexist
//     t5Cols: number[],               // metadata: columns where row-3+row-6 coexist
//     t7Cancellations: [Threat, Threat][],
//   }
export function simplifyThreats(threats) {
  const t1 = t1_winner(threats);
  if (t1) {
    return {
      threats,
      decidedBy: { rule: 'T1', winner: t1.player, col: t1.col },
      t3Pairs: [],
      t4Cols: [],
      t5Cols: [],
      t7Cancellations: [],
    };
  }

  const t3Pairs = t3_pairs(threats);

  const t2Neutralized = t2_neutralized(threats);
  let remaining = threats.filter((t) => ![...t2Neutralized].some((n) => threatKey(n) === threatKey(t)));

  const t6Worthless = t6_worthless(remaining);
  remaining = remaining.filter((t) => ![...t6Worthless].some((w) => threatKey(w) === threatKey(t)));

  const t7Cancellations = t7_cancellations(remaining);
  const cancelledKeys = new Set();
  for (const [r, b] of t7Cancellations) {
    cancelledKeys.add(threatKey(r));
    cancelledKeys.add(threatKey(b));
  }
  remaining = remaining.filter((t) => !cancelledKeys.has(threatKey(t)));

  const cols = [...new Set(remaining.map((t) => t.col))];
  const t4Cols = cols.filter((col) => t4_applies(remaining, col));
  const t5Cols = cols.filter((col) => t5_applies(remaining, col));

  return {
    threats: remaining,
    decidedBy: null,
    t3Pairs,
    t4Cols,
    t5Cols,
    t7Cancellations,
  };
}
