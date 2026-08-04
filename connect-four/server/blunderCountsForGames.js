// Pure helper for GET /api/games's blunder-count enrichment — spec 041 (Past Games & Mistakes:
// Server Data Integrity), User Story 3, contracts/scale-correct-aggregates.md § 2.
//
// The original handler fetched ALL of a user's blunder rows unbounded (`supabase
// .from('blunders').select('game_id').not('game_id', 'is', null).eq('user_id', userId)`, no
// `.limit()`) and counted occurrences in a JS Map — past ~1000 blunder rows for the user, this
// silently truncates and produces wrong `blunder_count` values.
//
// Fix choice (documented per constitution §VI / the T019 handoff trap): `/api/games` itself
// fetches ALL of a user's games unbounded (sorts by `worst_blunders`/`played_well`/`recent`
// across the FULL set before slicing to the requested page), so `gameIds` here can be as large
// as the user's total game count, not just the current page's `limit` (~50) ids. The contract's
// suggested `.in('game_id', gameIds)` therefore does NOT bound the query the way it looks like
// it would — with enough games it reintroduces the exact URL-length 400 Bad Request trap
// (`.in()` with >~200 ids) that the ORIGINAL `.not()`-based query was deliberately avoiding
// (see the comment at the original call site).
//
// So: do NOT use `.in()` at all. Instead, issue one DB-side GROUPED count() query per column,
// scoped only by `user_id` and a not-null filter (identical filter chain to today's query, just
// aggregated server-side instead of fetched row-by-row) — this returns one row per DISTINCT
// game id for the user (bounded by the user's distinct game count, not by blunder-row count),
// then filter down to the ids the caller actually asked about in JS. This is scale-correct at
// any blunder-row count AND avoids the `.in()` URL-length ceiling, at any game count.

/**
 * Compute per-game blunder counts, scoped to a user and a set of game ids, via a DB-side
 * grouped count() (scale-correct past 1000 underlying blunder rows; never uses `.in()`).
 *
 * @param {object} supabase - Supabase client (service-role).
 * @param {string} userId
 * @param {string[]} gameIds - the ids to return counts for (e.g. the current page's `aiIds` or
 *   `pgIds`, or the full set — see file header note on why this may exceed the page size).
 * @param {'game_id'|'papergames_game_id'} [column] - which blunders column to group by.
 * @returns {Promise<Record<string, number>>} map of requested game id -> blunder count (ids
 *   with zero blunders are simply absent — same as the original `Map`-based lookup, where
 *   callers do `map[g.id] || 0`).
 */
export async function computeBlunderCountsForGames(supabase, userId, gameIds, column = 'game_id') {
  if (!gameIds || gameIds.length === 0) return {};

  // NO_QUALITY_FILTER_ON_BLUNDER_COUNTS (server/blunderCountInvariant.js, OI-125/FR-021):
  // no `.eq('quality', ...)` here — both blunder- and suboptimal-severity rows count.
  const { data, error } = await supabase
    .from('blunders')
    .select(`${column}, count()`)
    .not(column, 'is', null)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const wanted = new Set(gameIds);
  const counts = {};
  for (const row of data || []) {
    const id = row[column];
    if (wanted.has(id)) counts[id] = Number(row.count);
  }
  return counts;
}
