// OI-125 / FR-021 (spec 057): named invariant, not five independently-written comments.
//
// INVARIANT: no query that counts `blunders` rows toward a "how many mistakes" total
// (per-game counts, per-category counts, queue pagination totals) may filter on
// `quality`. Both `'blunder'`- and `'suboptimal'`-severity rows are mistakes for
// counting purposes — `quality` is a severity label to DISPLAY, never a filter to
// narrow a count by. (This does not restrict detail/read queries that SELECT
// `quality` to show it — only queries whose purpose is producing a count.)
//
// Guarded at (see also T036 in specs/057-mvp-launch-gate/tasks.md for the full,
// verified call-site audit):
//   - server/blunderCountsForGames.js (computeBlunderCountsForGames) — per-game counts
//   - server/index.js  GET /api/coach/category-counts                — per-category counts
//   - server/index.js  GET /api/coach/queue countQuery                — queue pagination total
//
// This module is DOCUMENTATION-ONLY — say so plainly rather than let the export imply
// something it isn't. `NO_QUALITY_FILTER_ON_BLUNDER_COUNTS` is imported by nothing except
// `tests/unit/blunderCountQualityInvariant.test.js` (which only asserts it is a non-empty
// string); the three governed sites above cite it in a COMMENT, not an import — the name
// itself enforces nothing at runtime. The actual enforcement is
// `tests/unit/blunderCountQualityInvariant.test.js`'s source-scan of `server/index.js` (regex
// for `.eq('quality', ...)` inside each route handler's region, with a positive control) plus
// `tests/unit/blunderCountsForGames.test.js` for the `blunderCountsForGames.js` site. If a
// fourth counting site is ever added, it will NOT be caught automatically by importing this
// constant — it must be added to the source-scan test (or its own regression test) by hand.
export const NO_QUALITY_FILTER_ON_BLUNDER_COUNTS =
  'OI-125/FR-021: a blunders count() query must never filter on quality — both severities are mistakes';
