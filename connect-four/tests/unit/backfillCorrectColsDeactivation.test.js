// Spec 051 (Epic 1, US3) T046 — FR-016b deactivation path regression test.
//
// FR-016b: an empty-but-non-null `correct_cols` (checkPredicate returns
// `{ passes: false, correctCols: [] }` for a previously-active row) is a data defect, not a valid
// state for an active row. The backfill MUST deactivate the row (puzzles: is_active -> false;
// candidates: status -> 'rejected', per backfill-correct-cols.mjs's own documented mapping, since
// candidates has no is_active column) rather than write `correct_cols: []` to a row left active.
//
// Uses a stub Supabase client (pure-function extraction + stub-client pattern, per
// tests/blunder/insertGameBlunder.test.js / testing-conventions.md "Pure Function Extraction") —
// no live DB, no live solver. buildBackfillPlan's `fetchResult` injection point is used to seed a
// row whose recomputed correctCols comes back empty (deterministically, without depending on live
// solver output) alongside a normal passing row, so the test also proves the empty-set row does
// NOT contaminate the other row's update.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackfillPlan, applyPlan } from '../../server/scripts/backfill-correct-cols.mjs';

// Real board harvested from the US2 pool-measurement run (pool-thresholds.md's "After" undercut
// section) — checkUndercutPredicate + the relative-solver-safety floor genuinely collapses this
// board's entire non-killing answer set to empty (a real NO-CONCEPT case, not fabricated), so the
// stub below reproduces a result checkPredicate itself is known to actually return for this exact
// board rather than an invented shape.
const NO_CONCEPT_ROW = { id: 'puzzle-empty-1', table: 'puzzles', category: 'undercut', move_string: '3333334512652222610601001264' };
const PASSING_ROW = { id: 'puzzle-ok-1', table: 'puzzles', category: 'double_threat', move_string: '3344' };
const CANDIDATE_EMPTY_ROW = { id: 'cand-empty-1', table: 'candidates', category: 'overcut', move_string: '355230660352552323326664210500114' };

function stubFetchResult(category, moveString) {
  if (moveString === NO_CONCEPT_ROW.move_string || moveString === CANDIDATE_EMPTY_ROW.move_string) {
    return { passes: false, correctCols: [] };
  }
  return { passes: true, correctCols: [2, 5], correct_col: 2 };
}

// Mirrors applyPlan's real usage: `.update({correct_cols, correct_col}).eq('id', id)` per row for
// updates (a real supabase upsert's INSERT-path NOT NULL checks fire even on a conflict-bound
// row — verified against the real local DB, see backfill-correct-cols.mjs's applyPlan comment —
// so applyPlan uses per-row `.update().eq()`, not `.upsert()`), and
// `.update({...}).in('id', ids)` per batch for deactivations.
function makeStubSupabase() {
  const calls = { rowUpdates: [], batchUpdates: [] };
  return {
    calls,
    from: (table) => ({
      update: (payload) => ({
        eq: async (col, value) => { calls.rowUpdates.push({ table, payload, col, value }); return { error: null }; },
        in: async (col, ids) => { calls.batchUpdates.push({ table, payload, col, ids }); return { error: null }; },
      }),
    }),
  };
}

describe('buildBackfillPlan() + applyPlan() — T046 FR-016b deactivation path', () => {
  test('a row with empty recomputed correctCols is planned as a deactivation, not an update', async () => {
    const plan = await buildBackfillPlan([NO_CONCEPT_ROW, PASSING_ROW], null, { fetchResult: stubFetchResult });

    assert.equal(plan.deactivations.length, 1);
    assert.equal(plan.deactivations[0].id, NO_CONCEPT_ROW.id);
    assert.equal(plan.updates.length, 1);
    assert.equal(plan.updates[0].id, PASSING_ROW.id);
  });

  test('applyPlan issues an is_active=false batch update for puzzles, never a row-update with correct_cols: [] for that row', async () => {
    const plan = await buildBackfillPlan([NO_CONCEPT_ROW, PASSING_ROW], null, { fetchResult: stubFetchResult });
    const supabase = makeStubSupabase();
    await applyPlan(supabase, plan);

    // The deactivation must be an is_active=false batch update targeting the empty-correctCols row.
    const deacCall = supabase.calls.batchUpdates.find((u) => u.table === 'puzzles');
    assert.ok(deacCall, 'expected a batch update() call on puzzles for the deactivation');
    assert.equal(deacCall.payload.is_active, false);
    assert.deepEqual(deacCall.ids, [NO_CONCEPT_ROW.id]);

    // The correct_cols row-update must only ever be issued for the passing row — never with an
    // empty array for the NO_CONCEPT row, and never targeting its id at all.
    const rowUpdatesForPuzzles = supabase.calls.rowUpdates.filter((u) => u.table === 'puzzles');
    assert.equal(rowUpdatesForPuzzles.length, 1, 'expected exactly one row-update on puzzles (the passing row)');
    assert.equal(rowUpdatesForPuzzles[0].value, PASSING_ROW.id);
    assert.ok(!rowUpdatesForPuzzles.some((u) => u.value === NO_CONCEPT_ROW.id), 'the empty-correctCols row must never receive a correct_cols row-update');
    for (const u of rowUpdatesForPuzzles) {
      assert.ok(u.payload.correct_cols.length > 0, 'no row-update should carry an empty correct_cols array');
    }
  });

  test('candidates table deactivation uses status=rejected (no is_active column on candidates)', async () => {
    const plan = await buildBackfillPlan([CANDIDATE_EMPTY_ROW], null, { fetchResult: stubFetchResult });
    const supabase = makeStubSupabase();
    await applyPlan(supabase, plan);

    const deacCall = supabase.calls.batchUpdates.find((u) => u.table === 'candidates');
    assert.ok(deacCall, 'expected a batch update() call on candidates for the deactivation');
    assert.equal(deacCall.payload.status, 'rejected');
    assert.ok(deacCall.payload.rejection_reason, 'expected a rejection_reason to be recorded');
    assert.deepEqual(deacCall.ids, [CANDIDATE_EMPTY_ROW.id]);

    const rowUpdatesForCandidates = supabase.calls.rowUpdates.filter((u) => u.table === 'candidates');
    assert.equal(rowUpdatesForCandidates.length, 0, 'no row-update should be issued for a fully-deactivated candidate batch');
  });

  test('no plan calls applyPlan with an empty correct_cols array on any row', async () => {
    const plan = await buildBackfillPlan([NO_CONCEPT_ROW, PASSING_ROW, CANDIDATE_EMPTY_ROW], null, { fetchResult: stubFetchResult });
    for (const u of plan.updates) {
      assert.ok(u.correct_cols.length > 0, `update for ${u.id} must never carry an empty correct_cols`);
    }
    assert.equal(plan.deactivations.length, 2);
  });
});
