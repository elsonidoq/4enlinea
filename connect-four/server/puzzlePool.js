// Single source of truth for which `puzzles` rows are visible to players.
//
// Why this module exists: `/api/puzzles/counts` and `/api/puzzles/draw` used to build their
// filters independently, and they drifted — `draw` additionally required `position IS NOT NULL`
// while `counts` did not, so `/setpicker` advertised sets the draw endpoint could not serve
// (docs/open_issues.md OI-170). Both endpoints now go through `applyVisibilityFilter`, so the
// two can no longer disagree about what a playable puzzle is.
//
// `position` is a *shape-diversity ordering hint* assigned by POST /api/admin/puzzles/reindex
// (round-robin over `shape_key` groups). It is an ordering input, never a visibility gate:
// a freshly promoted row is born with `position = NULL` and must still be drawable.

import { CATEGORY_ORDER } from './categories.js';

export const PUZZLE_ROW_COLUMNS =
  'id, category, move_string, interaction_mode, highlight_metadata, correct_cols, user_player, shape_key, highlight_cells';

/**
 * The ONE definition of "this puzzle row can be shown to a player".
 * Both the counts endpoint and the draw endpoint must funnel through this.
 */
export function applyVisibilityFilter(query, category) {
  let q = query.eq('is_active', true);
  if (category) q = q.eq('category', category);
  return q;
}

/**
 * Deterministic ordering for a drawable pool: shape-diversity order first (rows the reindexer
 * has visited), then un-indexed rows, with `id` as a stable tiebreak so the wrap-around query
 * pages over the same sequence the offset query did.
 */
export function applyPoolOrder(query) {
  return query
    .order('position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });
}

/** Per-category count of player-visible puzzles. Returns { counts } or throws. */
export async function countVisiblePuzzles(supabase) {
  const { data, error } = await applyVisibilityFilter(
    supabase.from('puzzles').select('category, count()'),
  );
  if (error) throw error;

  const counts = {};
  for (const slug of CATEGORY_ORDER) counts[slug] = 0;
  for (const row of (data || [])) {
    if (row.category in counts) counts[row.category] = Number(row.count);
  }
  return counts;
}

/** Draw up to `n` rows for one real category, using a random offset over the ordered pool. */
export async function drawCategoryPool(supabase, category, n) {
  const { count: total, error: countErr } = await applyVisibilityFilter(
    supabase.from('puzzles').select('*', { count: 'exact', head: true }),
    category,
  );
  if (countErr) throw countErr;
  if (!total) return [];

  const offset = Math.floor(Math.random() * Math.max(0, total - n + 1));
  const { data: result, error: resultErr } = await applyPoolOrder(
    applyVisibilityFilter(supabase.from('puzzles').select(PUZZLE_ROW_COLUMNS), category),
  ).range(offset, offset + n - 1);
  if (resultErr) throw resultErr;

  let puzzles = result || [];
  if (puzzles.length < n && total > puzzles.length) {
    const remaining = n - puzzles.length;
    const { data: wrap } = await applyPoolOrder(
      applyVisibilityFilter(supabase.from('puzzles').select(PUZZLE_ROW_COLUMNS), category),
    ).range(0, remaining - 1);
    puzzles = puzzles.concat(wrap || []);
  }
  return puzzles;
}

/** Draw an interleaved `mixed` pool: one row per category per position index. */
export async function drawMixedPool(supabase, n) {
  const pools = {};
  for (const cat of CATEGORY_ORDER) {
    const { data } = await applyPoolOrder(
      applyVisibilityFilter(supabase.from('puzzles').select(PUZZLE_ROW_COLUMNS), cat),
    ).limit(n);
    pools[cat] = data || [];
  }

  const puzzles = [];
  for (let posIdx = 0; posIdx < n && puzzles.length < n; posIdx++) {
    for (const cat of CATEGORY_ORDER) {
      if (posIdx < pools[cat].length && puzzles.length < n) puzzles.push(pools[cat][posIdx]);
    }
  }
  return puzzles;
}
