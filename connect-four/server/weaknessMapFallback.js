// Pure helper for GET /api/coach/weakness-map's RPC-failure fallback — spec 041 (Past Games &
// Mistakes: Server Data Integrity), User Story 3, contracts/scale-correct-aggregates.md § 3.
//
// DORMANT PATH: only reached when the primary `supabase.rpc('coach_weakness_map', ...)` call
// errors (`server/index.js` `GET /api/coach/weakness-map`). The RPC itself is already DB-side
// aggregation and is out of scope. This fallback previously did an unbounded `puzzle_attempts`
// select (`select('puzzle_id, first_attempt_correct, puzzles(category)').eq('user_id', ...)`,
// no `.limit()`) and aggregated in JS — same class of scale bug as `/api/stats`. Per
// research.md Decision 4, this gets the same mechanical count()-grouped fix as
// `computeStatsAggregate` — no investigation into RPC reliability, no redesign of when the
// fallback triggers. Kept "correct whenever it runs" rather than invested in as a primary path.

/**
 * Compute the weakness-map fallback's response shape via DB-side grouped counts (scale-correct
 * past 1000 rows). Mirrors `computeStatsAggregate`'s two-grouped-query approach.
 *
 * @param {object} supabase - Supabase client (service-role).
 * @param {string} userId
 * @returns {Promise<{ weaknessMap: Array<{ category: string, attempted: number, missRate: number }> }>}
 */
export async function computeWeaknessMapFallback(supabase, userId) {
  const [{ data: attemptedRows, error: attemptedError }, { data: missedRows, error: missedError }] =
    await Promise.all([
      supabase
        .from('puzzle_attempts')
        .select('puzzles!inner(category), count()')
        .eq('user_id', userId),
      supabase
        .from('puzzle_attempts')
        .select('puzzles!inner(category), count()')
        .eq('user_id', userId)
        .eq('first_attempt_correct', false),
    ]);

  if (attemptedError) throw new Error(attemptedError.message);
  if (missedError) throw new Error(missedError.message);

  const missedByCategory = {};
  for (const row of missedRows || []) {
    const category = row.puzzles?.category;
    if (!category) continue;
    missedByCategory[category] = Number(row.count);
  }

  const weaknessMap = [];
  for (const row of attemptedRows || []) {
    const category = row.puzzles?.category;
    if (!category) continue;
    const attempted = Number(row.count);
    const missed = missedByCategory[category] || 0;
    weaknessMap.push({
      category,
      attempted,
      missRate: attempted > 0 ? missed / attempted : 0,
    });
  }

  weaknessMap.sort((a, b) => b.missRate - a.missRate);

  return { weaknessMap };
}
