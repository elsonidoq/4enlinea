# Research: Past Games & Mistakes — Server Data Integrity

## Sources read (Principle VIII gate)

- `polish_epic.md` § Epic 1 — Settled decisions, Non-obvious facts, Authoritative sources of
  truth, Acceptance criteria, NOT included (reflected verbatim below and in plan.md).
- `specs/041-past-games-data-integrity/spec.md` (this feature's spec).
- `specs/030-server-mediated-data-access/spec.md` — governing contract: all data flows through
  `/api/*`; no direct client DB access; server-side aggregation only.
- Memory: `project_spec030_server_mediated_data_access.md`, `project_stats_architecture.md`,
  `project_spec038_papergames_self_service_import.md`, `reference_supabase_connection.md`.
- `docs/architecture/api-conventions.md`, `db-schema.md`, `data-model.md`, `server-conventions.md`,
  `testing-conventions.md`.
- `docs/best_practices_spec_driven_development.md`.
- `.specify/memory/constitution.md` v1.3.2.

## Decision 1 — Pagination style: offset/limit (not cursor)

**Decision**: `GET /api/coach/queue` gets `limit`/`offset` query params, mirroring the pattern
already implemented on `GET /api/games` (`server/index.js:1808`, `limit` 1–50 default 20,
`offset` ≥0) and the documented admin-list convention in `api-conventions.md` § Pagination
(`limit` default 50 max 100, `offset`, `{ data, total }` shape).

**Rationale**:
- Consistency: this codebase has exactly one existing pagination paradigm (offset/limit) across
  every paginated endpoint (`GET /api/games`, all admin list endpoints). Introducing cursor
  pagination for this one endpoint would violate constitution §VII ("there should be one — and
  preferably only one — obvious way to do it") for no functional gain.
- The spec's own Edge Cases section explicitly downgrades the "list shifts mid-paging" concern to
  best-effort ("this feature does not require cursor-based pagination to eliminate that
  possibility") — the harder guarantee cursor pagination buys is explicitly not required.
- Implementation cost: offset/limit is a 2-line change to the existing Supabase query builder
  (`.range(offset, offset + limit - 1)` or `.limit(limit).range(...)`); cursor pagination would
  need a new sort-key encoding scheme for the `(severity DESC, created_at ASC)` compound order,
  which is unjustified complexity for a single-user, per-user-scoped list that tops out in the
  low thousands of rows.

**Alternatives considered**: Keyset/cursor pagination on `(severity, created_at, id)` — rejected
per above. Unbounded response with a very large cap (e.g. `limit=10000`) — rejected explicitly by
FR-001 ("An unbounded default response is itself a defect this feature must not reintroduce").

**Response shape**: Preserve `{ blunders: [...], total: number }`. Add `limit`/`offset` query
params (default `limit=50` to preserve current behavior for callers that don't yet page, max
`limit=200` to bound worst-case single-page cost; `offset` default `0`). **`total` must become a
true DB-side count of all matching rows** (see Fragile-area finding below — today `total` is
`enriched.length`, i.e. silently equal to the page size, not the true total). This is the field
`CategoryListScreen`/`MistakesListScreen`/`ReviewScreen` and any future consumer use to know when
to stop paging.

## Decision 2 — Migration ordering: DROP-before-ADD

**Decision**: The single migration for User Story 4 (`0NN_papergames_per_user_ownership.sql`)
executes in this order:
1. `DROP INDEX IF EXISTS <name of the current idx_blunders_papergames_unique>` (blunders table).
2. `DROP INDEX IF EXISTS` / `ALTER TABLE papergames_games DROP CONSTRAINT` the existing
   `UNIQUE(papergames_room_uid)` — the exact constraint name must be looked up from the live
   schema (likely a system-generated name from migration 038's inline `UNIQUE` column
   constraint) before this migration is written.
3. No data UPDATE step — per the spec's Out of Scope ("Historical-data repair"), no existing rows
   need remapping; the DB has no real users yet and rows may be reset/recreated cleanly.
4. `ADD` the two new unique indexes: `UNIQUE (user_id, papergames_room_uid)` on
   `papergames_games`, and `UNIQUE (user_id, papergames_game_id, move_index) WHERE
   papergames_game_id IS NOT NULL` on `blunders`.

**Rationale**: `data-model.md` → Migration Naming states the general rule ("DROP old constraints,
UPDATE data, ADD new constraints... never run an UPDATE before the DROP CONSTRAINT when the new
value isn't in the old allowed set"). This migration is a unique-index change, not a CHECK-value
change, but the same ordering hazard exists in the opposite direction: attempting to `CREATE
UNIQUE INDEX` for `(user_id, papergames_room_uid)` while the old single-column
`UNIQUE(papergames_room_uid)` is still active is harmless (Postgres allows multiple unique
indexes to coexist), but leaving the *old* index in place after adding the new one would silently
preserve the bug (the old constraint still fires first on `ON CONFLICT` resolution order
ambiguity, and it still blocks two users from ever holding a row with the same
`papergames_room_uid}` regardless of the new index). So DROP-before-ADD is not just
convention-following here — it is required for correctness, not merely stylistic. Order the drops
before the adds in a single migration file, both migrations combined (blunders index +
papergames_games constraint) since they are part of one atomic fix per the epic's "necessary but
not sufficient" framing (fixing the blunder index alone does not fix ownership; both changes ship
together in the acceptance criteria for User Story 4).

**No backfill**: Confirmed against spec.md Out of Scope + Assumptions — "the production database
has no real users yet... any schema or ownership migration needed to satisfy User Story 4 may
cleanly recreate affected records rather than repair them in place." No migration step is needed
to remap any existing `papergames_games`/`blunders` rows.

## Decision 3 — Grouped-count query form: PostgREST `.select('category, count()')`

**Decision**: All grouped-count aggregates introduced or converted by this feature (US2's
`/api/coach/category-counts`, and the `/api/stats`/weakness-map-fallback conversions in US3) use
the PostgREST grouped-count form already proven in this codebase —
`supabase.from(table).select('<group_col>, count()').eq('user_id', ...)` — rather than a new
Postgres RPC function per endpoint.

**Rationale**: Precedent already exists twice in `server/index.js` (`:1339` and `:2822`,
`/api/puzzles/counts`'s `select('category, count()')` pattern, confirmed working and already
excluded from this feature's defect list) — reusing a proven mechanism satisfies constitution
§VII ("one obvious way to do it") and avoids introducing a new RPC-authoring/deployment step
(RPC changes require a migration + `supabase functions`/SQL deploy, whereas a `.select()` change
ships in the same PR as the route handler). An RPC (mirroring `coach_weakness_map`) is the
documented fallback only if the grouped-`count()` form is found at implementation time to
misbehave through the specific `puzzles!inner(category)` join `/api/stats` requires (join +
grouped-count support in Supabase JS's PostgREST wrapper is the one unverified mechanism swap in
this plan — flagged, not blocking, since `/api/puzzles/counts` doesn't exercise a join).

**Applies to**: `contracts/coach-category-counts.md` (single-table group, no join — lowest risk)
and `contracts/scale-correct-aggregates.md` §1 (`/api/stats`, single joined group) and §3
(weakness-map fallback, single joined group, dormant path — see Decision 4 below).

## Decision 4 — Weakness-map fallback: cheap correctness fix only, not a redesign

**Decision**: The `/api/coach/weakness-map` fallback (`server/index.js:2446–2470`, only reached
when the primary `coach_weakness_map` RPC call errors) gets the same `count()`-grouped conversion
as `/api/stats` (Decision 3) — a mechanical fix, not new investment. No investigation into
*why* the RPC might fail, no monitoring/alerting addition, no redesign of the fallback's shape.
A code comment notes the path is dormant (exercised only on RPC failure) so a future reader
understands why it receives the same care as the primary path despite rarely running.

**Rationale**: The path is defense-in-depth for an already-working primary path; the feature's
job (FR-007) is "stay correct beyond 1,000 rows through whichever path actually executes," which
this satisfies without the added cost of root-causing RPC reliability (out of scope — not named
in any user story or requirement).

**Test-scope implication**: the `>1,000`-row seeded test in `quickstart.md` SC-003 step 4 is
satisfied by a unit-level test of the extracted pure function
(`computeWeaknessMapFallback(supabase, userId)`, per `contracts/scale-correct-aggregates.md` §
Test strategy) with a stubbed Supabase client returning >1000 synthetic rows — **not** a seeded
integration test forcing the live RPC to fail, since forcing genuine RPC failure is itself an
unscoped reliability-engineering task. This narrows `quickstart.md`'s SC-003 step 4 (see that
file) from "force the RPC to fail against real infra" to "unit-test the extracted fallback
function directly."

## Fragile-area verification (performed against current code, not memory)

### 1. All consumers of `/api/coach/queue`

```
rg -n "coach/queue" connect-four/src
```
Four call sites, none of which page today:
- `connect-four/src/screens/MistakeDetailScreen.jsx:201` — `POST .../resolve` (not the list
  endpoint; unaffected by pagination).
- `connect-four/src/screens/CategoryListScreen.jsx:35` — `GET /api/coach/queue?status=all`, the
  exact truncated-page source the epic calls out; **must be replaced** by the new
  `/api/coach/category-counts` endpoint (US1.2/D2), not merely paginated.
- `connect-four/src/screens/MistakesListScreen.jsx:38` — `GET
  /api/coach/queue?status=all&category=<cat>`; **must page to completion** (FR-003a) since this
  is the per-category detail list that must show every blunder in that category.
- `connect-four/src/screens/ReviewScreen.jsx:102` — `GET /api/coach/queue?<queueParam>`; **must
  page to completion** — this is the sibling-blunder list used to build the chip/stepper
  navigation for a given game; a truncated page here would silently drop siblings from
  navigation.

**Conclusion**: FR-003a applies to `MistakesListScreen.jsx` and `ReviewScreen.jsx` (page to
completion). `CategoryListScreen.jsx` is not "made to page" — it is redirected entirely to the
new category-counts endpoint per D2, which is the correct fix (US1.2), not a pagination retrofit.

### 2. Other FR-007 endpoints for "default returns everything" client assumptions

Checked `server/index.js` line-by-line for the three in-scope aggregate endpoints:

- **`GET /api/stats`** (`:1242`) — `supabase.from('puzzle_attempts').select(...).eq('user_id',
  ...)` with **no `.limit()`/`.range()` at all** — an unbounded select subject to PostgREST's
  default page cap (commonly 1000). Confirmed bug exactly as the epic describes. Frontend
  consumer: `connect-four/src/store/SupabaseStore.js:108` calls `GET /api/stats` and trusts the
  single JSON response as complete — no client-side paging assumption to unwind (the endpoint
  itself must become scale-correct via `count()`/grouped aggregation, not paginated from the
  client).
- **`GET /api/games`** (`:1808`) — already has documented, working `limit`/`offset` query
  params (max `limit=50`) for the **games** themselves, but the **blunder-count enrichment**
  inside the handler (`:1877–1898`) does a full unbounded
  `supabase.from('blunders').select('game_id'/'papergames_game_id').not(...).eq('user_id',
  ...)` and counts in JS via a `Map` — this is the actual FR-007 defect ("per-game mistake
  counts"), not the games list pagination (which is fine and unaffected). Frontend consumer:
  `connect-four/src/screens/PastGamesListScreen.jsx:166` already pages the games list correctly;
  it just receives wrong `blunder_count` values past ~1000 blunder rows for the user. Fix is
  server-side only (convert the blunder-count enrichment query to `count()` grouped by
  `game_id`/`papergames_game_id`, or a scoped per-page `.in()` query since only the current
  page's game ids need counts) — no frontend change required for this sub-fix.
- **`GET /api/coach/weakness-map`** (`:2442`) — primary path calls
  `supabase.rpc('coach_weakness_map', ...)` (already DB-side aggregation, out of scope — this is
  not the fallback the epic means). The **fallback** (triggered only if the RPC call errors,
  `:2446–2470`) does an unbounded `puzzle_attempts` select and aggregates in JS — this is the
  exact "weakness-map fallback" the epic and spec call out. Confirmed present and matches the
  epic's non-obvious-facts description exactly.
- **`GET /api/puzzles/counts`** (`:1333`) — confirmed already `count()`-based
  (`select('category, count()')`) — **excluded from this feature's scope** per the epic's
  explicit note and spec's Out of Scope; no change needed.

**Also discovered** (undocumented until now, added to Constitution-VIII gate item above): the
current `GET /api/coach/queue` response's `total` field (`server/index.js` handler, `res.json({
blunders: enriched, total: enriched.length })`) is **not a true count** — it always equals the
returned page's length (currently capped at 50), so it is silently `min(true_total, 50)` today.
Any future pagination fix must replace this with a genuine `count()` query, otherwise
"page to completion" consumers have no reliable stop condition other than "server returned fewer
rows than `limit`."

### 3. Other consumers of `papergames_room_uid` / `papergames_games.id` besides `upsertGame`

```
rg -n "papergames_room_uid" connect-four/server
rg -n "papergames_game_id|papergames_games" connect-four/server -l
```

- `papergames_room_uid` as an `onConflict`/uniqueness key: **only** one call site —
  `papergamesImporter.js:166` (`upsertGame`, `onConflict: 'papergames_room_uid'`). This is the
  single place the `onConflict` key needs updating to `'user_id,papergames_room_uid'`. The
  column itself (`papergames_room_uid`) is also referenced at insert-shape construction
  (`papergamesImporter.js:69`) and in the migration DDL (`038_papergames_games.sql:8`) — neither
  needs a logic change, only the migration adds the new composite unique constraint alongside.
- `papergames_games`/`papergames_game_id` consumers beyond the importer and
  `insertGameBlunder`:
  - `server/index.js` — `/api/games/from-position` (`:1789,1808` reads by `id`, unaffected by
    the ownership-uniqueness change since it already scopes reads by row `id`, not room uid),
    `/api/games` blunder-count enrichment (`:1854,1881,1894` — the FR-007 defect above, also
    reads `papergames_game_id`), `POST /api/user/papergames/save-live-game` handler
    (`:1994,2011,2189` — writes a `papergames_games` row per live game; see the "Correction after
    deeper check" below — `saveLiveGame()` calls the same shared `upsertGame()` helper as the
    self-service importer, so it is fixed by the single `onConflict` change rather than being
    exempt from it), and `/api/coach/queue`'s
    `papergames_game_id` filter (`:2496,2503,2525,2544` — filters by an already-resolved game
    id, unaffected).
  - `server/userRoutes.js:532` — reads from `papergames_games` (need to confirm at
    implementation time this is a read-only per-user-scoped query, not a second upsert path —
    likely `GET /api/user/papergames/...` status or profile read).
  - `server/scripts/reprocess_blunders.mjs:98,136` and `server/scripts/delete-user.mjs:83,139` —
    offline maintenance scripts, not part of the production request path; `delete-user.mjs`
    already deletes `blunders` before `papergames_games` (documented FK order), unaffected by the
    uniqueness-key change since it deletes by `user_id`, not by room uid.

**Conclusion**: `upsertGame`'s `onConflict` key is the only production write path that must
change. No other production read path assumes the old single-column uniqueness in a way that
breaks under the new composite key — all other consumers key off `id` (the surrogate PK) or
`user_id`, which are unaffected.

**Correction after deeper check**: `POST /api/user/papergames/save-live-game` → `saveLiveGame()`
(`papergamesImporter.js:188`) also calls the **same shared `upsertGame()` helper**
(`papergamesImporter.js:163`) used by the self-service batch importer. Fixing `upsertGame`'s
`onConflict` key in the one shared function therefore fixes **both** the self-service import
path and the live-game save path — no separate change needed for save-live-game.

## Open items carried into Phase 1 design (not decisions — need contract-level detail)

- ~~Exact current constraint name for `papergames_games`'s inline `UNIQUE(papergames_room_uid)`~~
  — **RESOLVED in Phase 1**: verified 2026-07-07 against a reachable Supabase instance (same
  migration history as production) via `information_schema.table_constraints`/`pg_indexes`;
  confirmed exactly `papergames_games_papergames_room_uid_key` and
  `idx_blunders_papergames_unique`. See `data-model.md` § Migration →
  "Constraint-name verification" for the query, output, and the production re-verification +
  DO-block guard this finding is pinned behind.
- `server/userRoutes.js:532`'s exact query — confirm read-only status in Phase 1 data-model
  design pass, not assumed here.
