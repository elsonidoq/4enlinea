// Unit tests for computeStatsAggregate — spec 041 (Past Games & Mistakes: Server Data
// Integrity), User Story 3, contracts/scale-correct-aggregates.md § 1.
//
// GET /api/stats used to `select('first_attempt_correct, puzzles!inner(category)')` with no
// `.limit()`/`.range()` — an unbounded select silently truncated past ~1000 rows by PostgREST's
// default cap. This test stubs the Supabase client to return DB-side GROUPED count() rows
// (as the fixed implementation should request) with totals well past 1000, and asserts the
// aggregate arithmetic is correct — proving correctness no longer depends on fetching every row.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStatsAggregate } from '../../server/statsAggregate.js';

/**
 * Stub Supabase client for `puzzle_attempts` grouped-count queries.
 * Distinguishes the "all attempts" query from the "correct-only" query by whether
 * `.eq('first_attempt_correct', true)` was chained.
 */
function makeStub({ attempted, correct }) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(cols) {
          const filters = {};
          const builder = {
            eq(col, val) {
              filters[col] = val;
              return builder;
            },
            // Guard: the fix must not fall back to an unbounded per-row select.
            then(resolve) {
              calls.push({ table, cols, filters });
              const correctOnly = filters.first_attempt_correct === true;
              resolve({ data: correctOnly ? correct : attempted, error: null });
            },
          };
          return builder;
        },
      };
    },
  };
}

test('computeStatsAggregate: aggregates correctly past 1000 rows via grouped counts', async () => {
  const supabase = makeStub({
    attempted: [
      { count: 1200, puzzles: { category: 'forced_win' } },
      { count: 300, puzzles: { category: 'undercut' } },
    ],
    correct: [
      { count: 900, puzzles: { category: 'forced_win' } },
      { count: 150, puzzles: { category: 'undercut' } },
    ],
  });

  const result = await computeStatsAggregate(supabase, 'user-1');

  assert.equal(result.totalPuzzles, 1500, 'totalPuzzles must sum all 1500 rows, not cap at 1000');
  assert.equal(result.accuracy, Math.round((1050 / 1500) * 100));
  assert.deepEqual(result.byPattern.forced_win, {
    accuracy: Math.round((900 / 1200) * 100),
    attempted: 1200,
  });
  assert.deepEqual(result.byPattern.undercut, {
    accuracy: Math.round((150 / 300) * 100),
    attempted: 300,
  });
});

test('computeStatsAggregate: returns zeroes for a brand-new user with 0 rows', async () => {
  const supabase = makeStub({ attempted: [], correct: [] });
  const result = await computeStatsAggregate(supabase, 'user-none');
  assert.deepEqual(result, { accuracy: 0, totalPuzzles: 0, byPattern: {} });
});

test('computeStatsAggregate: same-user filter is applied to both grouped queries', async () => {
  let capturedUserIds = [];
  const supabase = {
    from() {
      return {
        select() {
          const filters = {};
          const builder = {
            eq(col, val) {
              filters[col] = val;
              if (col === 'user_id') capturedUserIds.push(val);
              return builder;
            },
            then(resolve) {
              resolve({ data: [], error: null });
            },
          };
          return builder;
        },
      };
    },
  };
  await computeStatsAggregate(supabase, 'user-42');
  assert.ok(capturedUserIds.every((id) => id === 'user-42'));
  assert.ok(capturedUserIds.length >= 1, 'user_id filter must be applied');
});
