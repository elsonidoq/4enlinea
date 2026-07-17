// Unit tests for computeWeaknessMapFallback — spec 041 (Past Games & Mistakes: Server Data
// Integrity), User Story 3, contracts/scale-correct-aggregates.md § 3.
//
// GET /api/coach/weakness-map's fallback (only reached when the primary `coach_weakness_map`
// RPC call errors) used to fetch ALL of a user's `puzzle_attempts` rows and aggregate in JS —
// unbounded, silently truncated past ~1000 rows. Per research.md Decision 4, this is a pure
// unit test of the extracted function against a stubbed client — it does NOT force the real
// RPC to fail against live infra (that's an unscoped reliability-engineering concern).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeaknessMapFallback } from '../../server/weaknessMapFallback.js';

/**
 * Stub Supabase client for `puzzle_attempts` grouped-count queries.
 * Distinguishes the "all attempts" query from the "missed-only" query by whether
 * `.eq('first_attempt_correct', false)` was chained.
 */
function makeStub({ attempted, missed }) {
  return {
    from() {
      return {
        select() {
          const filters = {};
          const builder = {
            eq(col, val) {
              filters[col] = val;
              return builder;
            },
            then(resolve) {
              const missedOnly = filters.first_attempt_correct === false;
              resolve({ data: missedOnly ? missed : attempted, error: null });
            },
          };
          return builder;
        },
      };
    },
  };
}

test('computeWeaknessMapFallback: matches ground truth for >1000 rows, sorted worst-first', async () => {
  const supabase = makeStub({
    attempted: [
      { count: 1200, puzzles: { category: 'forced_win' } },
      { count: 400, puzzles: { category: 'undercut' } },
    ],
    missed: [
      { count: 300, puzzles: { category: 'forced_win' } }, // missRate 0.25
      { count: 320, puzzles: { category: 'undercut' } }, // missRate 0.8
    ],
  });

  const result = await computeWeaknessMapFallback(supabase, 'user-1');

  assert.equal(result.weaknessMap.length, 2);
  // Sorted worst (highest missRate) first.
  assert.deepEqual(result.weaknessMap[0], { category: 'undercut', attempted: 400, missRate: 0.8 });
  assert.deepEqual(result.weaknessMap[1], { category: 'forced_win', attempted: 1200, missRate: 0.25 });
});

test('computeWeaknessMapFallback: returns an empty map for a brand-new user', async () => {
  const supabase = makeStub({ attempted: [], missed: [] });
  const result = await computeWeaknessMapFallback(supabase, 'user-none');
  assert.deepEqual(result, { weaknessMap: [] });
});

test('computeWeaknessMapFallback: a category with zero misses has missRate 0', async () => {
  const supabase = makeStub({
    attempted: [{ count: 1500, puzzles: { category: 'z_threat' } }],
    missed: [],
  });
  const result = await computeWeaknessMapFallback(supabase, 'user-2');
  assert.deepEqual(result.weaknessMap, [{ category: 'z_threat', attempted: 1500, missRate: 0 }]);
});
