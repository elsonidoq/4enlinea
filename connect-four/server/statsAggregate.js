// Pure helper for GET /api/stats — spec 041 (Past Games & Mistakes: Server Data Integrity),
// User Story 3, contracts/scale-correct-aggregates.md § 1.
//
// The original handler did `supabase.from('puzzle_attempts').select('first_attempt_correct,
// puzzles!inner(category)').eq('user_id', ...)` with no `.limit()`/`.range()` — an unbounded
// select silently truncated by PostgREST's default row cap (~1000), corrupting both `accuracy`
// and every `byPattern[category]` entry past that point.
//
// Fix: two DB-side GROUPED count() queries through the `puzzles!inner(category)` join —
// mirroring the already-working `/api/puzzles/counts` precedent (`select('category,
// count()')`) — one for all attempts, one restricted to `first_attempt_correct = true`. This
// was verified live against a local Supabase instance (2026-07-07): `supabase
// .from('puzzle_attempts').select('puzzles!inner(category), count()').eq('user_id', id)`
// returns rows shaped `{ count: <n>, puzzles: { category: '<slug>' } }`, grouped correctly
// through the join with no special RPC needed — so the RPC fallback described in the contract
// was not needed here.
//
// Same `.eq('user_id', ...)` filter as before; no `quality` filter added (FR-008 — a
// `quality='blunder'` row and a `quality='suboptimal'` row are not applicable here since this
// table is `puzzle_attempts`, not `blunders`, but the invariant is preserved: no new filter of
// any kind was introduced).

/**
 * Compute `/api/stats`'s response shape via DB-side grouped counts (scale-correct past 1000
 * rows).
 *
 * @param {object} supabase - Supabase client (service-role).
 * @param {string} userId
 * @returns {Promise<{ accuracy: number, totalPuzzles: number, byPattern: Record<string, { accuracy: number, attempted: number }> }>}
 */
export async function computeStatsAggregate(supabase, userId) {
  const [{ data: attemptedRows, error: attemptedError }, { data: correctRows, error: correctError }] =
    await Promise.all([
      supabase
        .from('puzzle_attempts')
        .select('puzzles!inner(category), count()')
        .eq('user_id', userId),
      supabase
        .from('puzzle_attempts')
        .select('puzzles!inner(category), count()')
        .eq('user_id', userId)
        .eq('first_attempt_correct', true),
    ]);

  if (attemptedError) throw new Error(attemptedError.message);
  if (correctError) throw new Error(correctError.message);

  const correctByCategory = {};
  for (const row of correctRows || []) {
    const category = row.puzzles?.category;
    if (!category) continue;
    correctByCategory[category] = Number(row.count);
  }

  const byPattern = {};
  let totalPuzzles = 0;
  let totalCorrect = 0;
  for (const row of attemptedRows || []) {
    const category = row.puzzles?.category;
    if (!category) continue;
    const attempted = Number(row.count);
    const correct = correctByCategory[category] || 0;
    byPattern[category] = {
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      attempted,
    };
    totalPuzzles += attempted;
    totalCorrect += correct;
  }

  return {
    accuracy: totalPuzzles > 0 ? Math.round((totalCorrect / totalPuzzles) * 100) : 0,
    totalPuzzles,
    byPattern,
  };
}
