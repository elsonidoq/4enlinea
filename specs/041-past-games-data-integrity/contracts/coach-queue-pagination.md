# Contract: `GET /api/coach/queue` pagination (US1.1)

Extends the existing endpoint documented in `docs/architecture/api-conventions.md` §
"GET /api/coach/queue". This contract describes only the delta.

## Query params (additive)

| Param | Type | Default | Validation |
|---|---|---|---|
| `limit` | integer | 50 | 400 `{ "error": "invalid limit" }` if non-numeric, < 1, or > 200 |
| `offset` | integer | 0 | 400 `{ "error": "invalid offset" }` if non-numeric or < 0 |

Existing params (`status`, `category`, `game_id`, `papergames_game_id`) are unchanged and compose
with the new ones (filters apply, then pagination is applied to the filtered set).

## Response shape (unchanged field set, changed `total` semantics)

```json
{ "blunders": [ /* up to `limit` rows, same per-row shape as today */ ], "total": 137 }
```

- `blunders`: exact current field set per `server/index.js`'s `/api/coach/queue` handler — `id`,
  `board_state`, `move_played`, `correct_move`, `pattern_category`, `quality`, `created_at`,
  `resolved_at`, `severity`, `blunder_severity`, `threat_cells`, `game_id`,
  `papergames_game_id`, `moveIndex`. No field is added or removed by this change.
- `total`: **BEHAVIOR CHANGE** — must be the true count of all rows matching the current filters
  (before `limit`/`offset` are applied), computed via a DB-side `count()` query
  (`{ count: 'exact', head: true }` Supabase option, or a second query with `.select('id',
  {count:'exact', head:true})`) run with the same `.eq()`/`.is()`/`.not()` filter chain as the
  main query, minus `.order()`/`.range()`. Today's implementation
  (`total: enriched.length`) is a latent bug (silently `min(true_total, limit)`) that must be
  fixed as part of this change, not preserved.

## Ordering guarantee (unchanged, FR-002)

`ORDER BY severity DESC, created_at ASC` — worst-first, oldest-tie-break-first — is preserved
identically across pages. Page `N` (`offset = N * limit`) must return the next `limit` rows in
this same total order; no re-sorting or re-windowing between pages within one paging session.

## Consumers that MUST page to completion (FR-003a)

Per the fragile-area verification in `research.md`, exactly two of the four `/api/coach/queue`
call sites are list-reads that must be updated to page to completion:

1. `connect-four/src/screens/MistakesListScreen.jsx:38` (per-category list) — loop fetching
   `offset += limit` until `blunders.length < limit` or accumulated rows `=== total`, accumulate
   into one client-side array before rendering.
2. `connect-four/src/screens/ReviewScreen.jsx:102` (sibling-blunder list for chip/stepper nav) —
   same pattern.

`CategoryListScreen.jsx:35` is **not** patched to page — it is redirected entirely to
`GET /api/coach/category-counts` (see `coach-category-counts.md`), per epic decision D2.
`MistakeDetailScreen.jsx:201` calls the `resolve` endpoint, not the list endpoint — unaffected.

## Backward compatibility

Existing callers that don't pass `limit`/`offset` get the same 50-row page they get today (only
`total`'s value changes — from "silently capped at page size" to "true total"; any caller that
was already comparing `blunders.length === total` to detect "no more pages" will now see
`total` possibly exceed `blunders.length` for the first time, which is the intended fix, not a
regression — those callers were previously fooled into thinking a truncated page was complete).
