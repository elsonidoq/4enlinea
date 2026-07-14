// Unit tests for computeBlunderCountsForGames — spec 041 (Past Games & Mistakes: Server Data
// Integrity), User Story 3, contracts/scale-correct-aggregates.md § 2.
//
// GET /api/games used to fetch ALL of a user's blunder rows (`.not('game_id', 'is',
// null).eq('user_id', userId)`, no `.limit()`) and count occurrences in a JS Map — unbounded,
// silently truncated past ~1000 blunder rows. The fix must scope to a DB-side grouped count()
// WITHOUT reintroducing the `.in(column, gameIds)` URL-length bug (>~200 ids -> 400 Bad
// Request) that the original `.not()`-based query was deliberately avoiding.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBlunderCountsForGames } from '../../server/blunderCountsForGames.js';

/**
 * Stub Supabase client for a `blunders` grouped-count query.
 * Throws if `.in()` is called — the fix must not reintroduce the URL-length trap.
 */
function makeStub(groupedRows) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(cols) {
          const filters = {};
          const notFilters = [];
          const builder = {
            eq(col, val) {
              filters[col] = val;
              return builder;
            },
            not(col, op, val) {
              notFilters.push([col, op, val]);
              return builder;
            },
            in() {
              throw new Error('.in() must not be used — reintroduces the URL-length 400 trap');
            },
            then(resolve) {
              calls.push({ table, cols, filters, notFilters });
              resolve({ data: groupedRows, error: null });
            },
          };
          return builder;
        },
      };
    },
  };
}

test('computeBlunderCountsForGames: per-game counts correct, scoped to requested ids', async () => {
  // Simulate a user with far more than 1000 underlying blunder rows: the grouped query
  // returns one row per distinct game_id with its true count, not per blunder row.
  const groupedRows = [
    { game_id: 'game-a', count: 1200 },
    { game_id: 'game-b', count: 3 },
    { game_id: 'game-c', count: 900 },
    { game_id: 'game-not-requested', count: 50 },
  ];
  const supabase = makeStub(groupedRows);

  const result = await computeBlunderCountsForGames(supabase, 'user-1', ['game-a', 'game-b'], 'game_id');

  assert.deepEqual(result, { 'game-a': 1200, 'game-b': 3 });
  assert.ok(!('game-not-requested' in result), 'must not include ids outside the requested set');
  assert.equal(supabase.calls.length, 1, 'exactly one grouped query should be issued');
  assert.equal(supabase.calls[0].filters.user_id, 'user-1');
});

test('computeBlunderCountsForGames: supports the papergames_game_id column', async () => {
  const groupedRows = [{ papergames_game_id: 'pg-1', count: 1500 }];
  const supabase = makeStub(groupedRows);

  const result = await computeBlunderCountsForGames(supabase, 'user-2', ['pg-1'], 'papergames_game_id');

  assert.deepEqual(result, { 'pg-1': 1500 });
});

test('computeBlunderCountsForGames: returns {} when gameIds is empty (no query issued)', async () => {
  const supabase = makeStub([]);
  const result = await computeBlunderCountsForGames(supabase, 'user-1', [], 'game_id');
  assert.deepEqual(result, {});
  assert.equal(supabase.calls.length, 0, 'no query should be issued for an empty id list');
});

// Spec 042 (Mistake Review Unification), User Story 4, T033/FR-006/SC-006 regression.
//
// A game with 0 `quality: 'blunder'` rows and >=1 `quality: 'suboptimal'` row must still
// produce a non-zero count here — this helper's `count()` query is issued against the
// `blunders` table with no `.eq('quality', ...)` filter (see the query built above), so a
// game whose rows are entirely suboptimal-severity contributes to its count() exactly like
// any other row. This test locks that guarantee in as an explicit regression, and asserts
// the query itself never filters on `quality`.
test('computeBlunderCountsForGames: game with only suboptimal-severity rows still yields a non-zero count (FR-006)', async () => {
  // The grouped count() the real query issues is quality-agnostic: a game where every
  // underlying blunder row is quality:'suboptimal' (zero quality:'blunder' rows) still has
  // its rows counted, so `count` here reflects that mixed-severity reality.
  const groupedRows = [{ game_id: 'game-suboptimal-only', count: 2 }];
  const supabase = makeStub(groupedRows);

  const result = await computeBlunderCountsForGames(supabase, 'user-3', ['game-suboptimal-only'], 'game_id');

  assert.deepEqual(result, { 'game-suboptimal-only': 2 });
  assert.ok(
    result['game-suboptimal-only'] > 0,
    'FR-006: 0 blunder-severity + >=1 suboptimal-severity mistakes must not be reported as zero'
  );
  assert.equal(
    supabase.calls[0].filters.quality,
    undefined,
    'the count() query must never filter on quality — both severities must be counted'
  );
});
