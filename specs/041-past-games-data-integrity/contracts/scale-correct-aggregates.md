# Contract: Scale-correct aggregates (US1.3 / FR-007–FR-009)

Three existing endpoints convert their internal query from "select all matching rows, aggregate
in Node" to DB-side `count()`/grouped-count queries. **No response shape changes** for any of the
three — this is purely an internal query-implementation fix. `/api/puzzles/counts` is explicitly
excluded (already `count()`-based, confirmed in `research.md`).

**Filter-set invariant (FR-008)**: for each of the three endpoints below, the DB-side conversion
MUST replicate the *exact* current `.eq()`/`.not()`/join filter chain — verified inline per
endpoint below — and change only the aggregation mechanism. None of the three currently apply a
`quality` filter (confirmed by reading `server/index.js` — `blunder`- and `suboptimal`-quality
rows in `blunders` are both counted today); do not add one. This is a distinct concern from the
new `/api/coach/category-counts` endpoint (User Story 2, `contracts/coach-category-counts.md`),
which is created and consumed entirely within User Story 2, not part of this contract's scope.

## 1. `GET /api/stats` (`server/index.js:1242`)

**Current defect**: `supabase.from('puzzle_attempts').select('first_attempt_correct,
puzzles!inner(category)').eq('user_id', ...)` has no `.limit()`/`.range()` — silently truncated
by PostgREST's default row cap past ~1000 attempts, corrupting both `accuracy` and every
`byPattern[category]` entry.

**Fix**: Replace the full-row select with DB-side aggregation using the PostgREST grouped-count
form (`research.md` Decision 3) — `select('category, count()')`-equivalent through the
`puzzles!inner(category)` join, mirroring `/api/puzzles/counts`'s already-working precedent
(`server/index.js:1339`, `:2822`). Two `count()` queries per category (`attempted` = grouped
count, `correct` = same with `.eq('first_attempt_correct', true)` added) if a single grouped call
through the join doesn't cleanly express both. Fall back to a Postgres RPC
(`coach_weakness_map`-style) only if the grouped-count-through-join form is found at
implementation time to misbehave — document whichever is chosen in the endpoint's code comment
per constitution §VI.

**Response shape unchanged**: `{ accuracy: number, totalPuzzles: number, byPattern: {
[category]: { accuracy: number, attempted: number } } }`. `byPattern` here is **NOT** the same
broken computation flagged for `GET /api/user/session-stats/all` in memory
`project_stats_architecture` — this endpoint already computes correctly from
`puzzle_attempts JOIN puzzles`, it's just scale-unsafe. Fixing it for scale must not touch its
correctness (Out of Scope: "The `byPattern` aggregate... belongs to
`/api/user/session-stats/all`... It is already correct and is not touched by this feature" — that
sentence refers to the *other* endpoint's `byPattern`; this endpoint's `byPattern` is a distinct,
already-correct computation that only needs a scale fix, not a correctness fix).

## 2. `GET /api/games` blunder-count enrichment (`server/index.js:1877–1898`)

**Current defect**: after fetching the current page of `games`/`papergames_games` rows (already
correctly paginated via `limit`/`offset`), the handler does a **second, unbounded** query —
`supabase.from('blunders').select('game_id').not('game_id', 'is', null).eq('user_id',
userId)` (and the `papergames_game_id` equivalent) — then counts occurrences in a JS `Map`. Past
~1000 blunder rows for the user, this silently truncates and produces wrong `blunder_count`
values for games that should show more blunders.

**Fix**: Scope the blunder-count query to only the game ids on the current page (the `aiIds`/
`pgIds` arrays already computed at `:1876`), e.g. `supabase.from('blunders').select('game_id,
count()').in('game_id', aiIds).eq('user_id', userId).group('game_id')`-equivalent, or a `count()`
per game id via a single grouped query. This bounds the query to at most `limit` (≤50) game ids
per request rather than the user's entire blunder history — correct at any scale without needing
a full `count()`-over-everything call, since the enrichment only ever needs counts for the
current page's games.

**Response shape unchanged**: `blunder_count` field semantics identical; only its accuracy at
scale changes.

## 3. `GET /api/coach/weakness-map` fallback (`server/index.js:2446–2470`)

**Current defect**: only reached when the primary `coach_weakness_map` RPC call errors. The
fallback does an unbounded `puzzle_attempts` select (`select('puzzle_id, first_attempt_correct,
puzzles(category)').eq('user_id', ...)`, no `.limit()`) and aggregates in JS — same class of bug
as `/api/stats`.

**Fix** (`research.md` Decision 4 — cheap correctness fix, not a redesign): the fallback delegates
to the same `count()`-grouped query as the `/api/stats` fix (Decision 3), mirroring its structure.
No investigation into *why* the RPC would fail and no change to when the fallback triggers — both
are explicitly out of scope (the requirement, FR-007, is only that the endpoint stay correct
beyond 1000 rows via whichever path actually executes). Add a code comment noting this path is
dormant (runs only on RPC failure) so the mechanical-fix-despite-rarely-running choice is
legible to a future reader.

**Response shape unchanged**: `{ weaknessMap: [{ category, attempted, missRate }] }`.

## Test strategy (Constitution III / testing-conventions.md)

No supertest harness exists in this repo (`testing-conventions.md` § Pure Function Extraction
Pattern). Each of the three converted queries should be extracted into a small pure function
(e.g. `computeStatsAggregate(supabase, userId)`, `computeBlunderCountsForGames(supabase, userId,
gameIds)`, `computeWeaknessMapFallback(supabase, userId)`) taking a stub Supabase client, so
`node --test` can seed >1000 fake rows via the stub's `.select()`/`.eq()` chain mock and assert
the returned count matches, without needing a live Supabase instance with 1000+ real rows. This
follows the exact pattern already used for `insertGameBlunder` (`tests/blunder/insertGameBlunder.test.js`).

For `computeWeaknessMapFallback` specifically (Decision 4): the automated test exercises the
extracted pure function directly with a stubbed client — it does not need to force the real
`coach_weakness_map` RPC to fail against live infra. Forcing genuine RPC failure is an unscoped
reliability-engineering concern; the unit test covers FR-007's actual requirement (the fallback
computation is correct at scale, whenever it runs).
