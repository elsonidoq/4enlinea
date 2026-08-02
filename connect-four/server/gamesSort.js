// Pure comparators for GET /api/games' in-JS "unified" pagination sort.
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so the comparator logic lives here and is unit-tested; index.js only wires it.
//
// FR-010/FR-011 (spec 054 Epic 4 US2 / OI-47): GET /api/games has no SQL-level
// ORDER BY/OFFSET/LIMIT — it fetches all matching rows from `games` and
// `papergames_games`, merges them into one `unified` array, sorts that array in
// JS, then slices unified.slice(offset, offset + limit). Array.prototype.sort is
// stable, but the underlying (unordered) Postgres fetch is NOT guaranteed to
// return rows in the same relative order across separate requests — so two rows
// sharing the same primary sort-key value (created_at / accuracy / blunder_count)
// could land in a different relative order on page N vs page N+1, causing
// unified.slice() to skip or duplicate whichever row crossed the page boundary.
// Fix: append a final deterministic `id`-based tiebreaker to each comparator.

/**
 * Comparator for sortBy === 'played_well': accuracy desc, then created_at desc,
 * then id asc as the final deterministic tiebreaker.
 * @param {{accuracy: number|null, created_at: string, id: string}} a
 * @param {{accuracy: number|null, created_at: string, id: string}} b
 * @returns {number}
 */
export function comparePlayedWell(a, b) {
  const aAcc = a.accuracy ?? -Infinity;
  const bAcc = b.accuracy ?? -Infinity;
  if (bAcc !== aAcc) return bAcc - aAcc;
  const aTime = new Date(a.created_at).getTime();
  const bTime = new Date(b.created_at).getTime();
  if (bTime !== aTime) return bTime - aTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Comparator for sortBy === 'worst_blunders': blunder_count desc, then
 * created_at desc, then id asc as the final deterministic tiebreaker.
 * @param {{blunder_count: number, created_at: string, id: string}} a
 * @param {{blunder_count: number, created_at: string, id: string}} b
 * @returns {number}
 */
export function compareWorstBlunders(a, b) {
  if (b.blunder_count !== a.blunder_count) return b.blunder_count - a.blunder_count;
  const aTime = new Date(a.created_at).getTime();
  const bTime = new Date(b.created_at).getTime();
  if (bTime !== aTime) return bTime - aTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Comparator for the default sortBy === 'recent': created_at desc, then id asc
 * as the final deterministic tiebreaker.
 * @param {{created_at: string, id: string}} a
 * @param {{created_at: string, id: string}} b
 * @returns {number}
 */
export function compareRecent(a, b) {
  const aTime = new Date(a.created_at).getTime();
  const bTime = new Date(b.created_at).getTime();
  if (bTime !== aTime) return bTime - aTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
