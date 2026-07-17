# Contract: `GET /api/coach/category-counts` (new endpoint, US1.2 / epic decision D2)

## Route registration

Registered under `/api/coach/*` per `docs/architecture/api-conventions.md` § Route Naming.
No path-segment collision risk with `/api/coach/queue` or `/api/coach/weakness-map` (Express
first-match ordering constraint doesn't apply — this is a distinct literal path, not a
parameterized one).

## Auth

Inline `requireAuth` (401 if `req.user` is null) — same pattern as `/api/coach/queue` and
`/api/coach/queue/:blunderId/resolve` (not `requirePaid`; available to all authenticated users,
matching the epic's framing of Epic 1 as free-tier-inclusive data integrity, consistent with
`/api/coach/queue`'s current access level).

## Request

`GET /api/coach/category-counts` — no query params. Always scoped to the authenticated user via
`user_id = req.user.id`.

## Response

```json
{ "categories": [ { "category": "undercut", "count": 8 }, { "category": "forced_win", "count": 1 } ] }
```

- `categories`: array, one entry per `pattern_category` value with `count ≥ 1` for this user.
  Categories with zero blunders are omitted (FR-005, Edge Cases: "cards are driven by actual
  data, not the static category list").
- `count`: true DB-side count via `count()` grouped by `pattern_category`
  (`supabase.from('blunders').select('pattern_category, count()').eq('user_id',
  req.user.id).group(...)`-equivalent, or an RPC if Supabase JS's grouped-count support requires
  one — implementation detail for `/speckit-tasks`), scale-correct beyond 1000 rows (FR-009) since
  it never materializes individual rows into Node. Filter set is `eq('user_id', ...)` only — same
  as today's `/api/coach/queue` query — no `quality` filter is added; `blunder`- and
  `suboptimal`-quality rows are both counted (see FR-008/spec.md Out of Scope).
- Sort order: unspecified by the spec (no acceptance criterion depends on card order); implement
  detector alignment with `CATEGORY_ORDER` (`server/categories.js`) for a stable, predictable
  card layout, but this is not a hard contract requirement.

## Errors

- `401 { "error": "unauthorized" }` — no `req.user`.
- `503 { "error": "database unavailable" }` — `!supabase`.
- `500 { "error": "<message>" }` — DB error, per standard error shape.

## Consumer

`connect-four/src/screens/CategoryListScreen.jsx:35` replaces its current
`fetch('/api/coach/queue?status=all')` call with `fetch('/api/coach/category-counts')` and maps
`categories` directly to cards — no more deriving categories from a truncated blunder list.
Selecting a card still drills into `MistakesListScreen.jsx` via `?category=`, which now pages
`/api/coach/queue` to completion (see `coach-queue-pagination.md`) for that category's full list.

## Non-goals

Does not replace `/api/puzzles/counts` (unrelated: puzzle catalog counts, not user blunder
counts — already `count()`-based and out of scope per the epic). Does not change
`VALID_BLUNDER_TAGS` or `VALID_CATEGORIES` — purely a read aggregate over existing data.
