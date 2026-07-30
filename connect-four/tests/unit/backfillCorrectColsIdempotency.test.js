// Spec 051 (Epic 1, US3) T045 — backfill idempotency regression test.
//
// FR-016: re-running the backfill's core recompute-and-write logic against already-backfilled
// rows MUST produce the identical answer set both times, identical in ORDER as well as
// membership (a fixed order matters because correct_col is synced as correctCols[0] — see D6/
// checkPredicate's centralized sort+sync, already regression-tested for all 12 categories in
// tests/unit/checkPredicateSortAndScalarSync.test.js).
//
// This exercises buildBackfillPlan() — the pure core extracted from
// server/scripts/backfill-correct-cols.mjs (Pure Function Extraction pattern,
// testing-conventions.md) — twice against the SAME real, solver-verified fixture rows and the
// real checkPredicate (never a stub re-derivation, mirroring FR-015's "same detection logic"
// requirement), and asserts the two plans are byte-identical in both correct_cols (members +
// order) and correct_col.
//
// Fixtures below are the same real, checkPredicate-passing boards used by
// tests/unit/checkPredicateSortAndScalarSync.test.js (harvested via gameSampling.js#playGame /
// reused from existing production fixtures, never hand-constructed) — non-claimeven categories
// only, to keep this test fast (claimeven's own solver cost is already covered by
// tests/integration/claimeven.test.js).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackfillPlan } from '../../server/scripts/backfill-correct-cols.mjs';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

// Real rows: id/table are synthetic (this test never touches Supabase — buildBackfillPlan takes
// plain row objects), category/move_string are real solver-verified boards.
const ROWS = [
  { id: 'p1', table: 'puzzles', category: 'immediate_threat', move_string: '33343063631016044110624245' },
  { id: 'p2', table: 'puzzles', category: 'forced_block', move_string: '333332020011060444031' },
  { id: 'p3', table: 'candidates', category: 'double_threat', move_string: '3344' },
  { id: 'p4', table: 'puzzles', category: 'undercut', move_string: '333330654544210414405513' },
];

describe('buildBackfillPlan() — T045 idempotency (FR-016)', () => {
  test('re-running against the same rows produces byte-identical correct_cols (order + members) and correct_col', async () => {
    const first = await buildBackfillPlan(ROWS, solver);
    const second = await buildBackfillPlan(ROWS, solver);

    assert.equal(first.updates.length, ROWS.length, 'sanity: all fixture rows should pass and produce an update, none deactivated');
    assert.equal(first.deactivations.length, 0);
    assert.equal(second.updates.length, first.updates.length);
    assert.equal(second.deactivations.length, first.deactivations.length);

    // Compare row-for-row (both runs iterate ROWS in the same order, so index alignment holds).
    for (let i = 0; i < first.updates.length; i++) {
      const a = first.updates[i];
      const b = second.updates[i];
      assert.equal(a.id, b.id);
      assert.deepEqual(a.correct_cols, b.correct_cols, `${a.id}: correct_cols must be byte-identical (members + order) across runs`);
      assert.equal(a.correct_col, b.correct_col, `${a.id}: correct_col must be identical across runs`);
    }
  });
});
