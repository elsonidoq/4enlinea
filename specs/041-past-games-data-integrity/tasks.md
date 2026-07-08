---

description: "Task list for Past Games & Mistakes — Server Data Integrity"
---

# Tasks: Past Games & Mistakes — Server Data Integrity

**Input**: Design documents from `/specs/041-past-games-data-integrity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Epic source**: `polish_epic.md` § Epic 1 — Past Games & Mistakes: Server Data Integrity

**Tests**: Story-scoped unit tests are included where a contract explicitly requires them: User
Story 3's pure-function extraction (`contracts/scale-correct-aggregates.md` § Test strategy) and
User Story 1's pagination param-validation/page-loop-stop-condition extraction (T001a, per
`contracts/coach-queue-pagination.md` and `quickstart.md`'s regression-gate reference to it) — no
supertest harness exists in this repo. Other stories rely on the manual `quickstart.md`
verification steps plus the regression gate (`npm run test:fast`), per this feature's
testing-conventions.md constraints (no HTTP test harness).

**Organization**: Tasks are grouped by user story (US1–US6, matching spec.md's User Story 1–6 /
epic's US1.1–US1.6) so each story is independently implementable, testable, and shippable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to its user story (US1–US6)
- Every task names an exact file path

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready; this feature adds no new dependencies.

- [x] T001 Confirm `cd connect-four && npm install` succeeds with no new dependencies added by
  this feature, and that `node server/migrate.js` applies cleanly up through
  `050_explanation_cache_audio.sql`/`051_blunders_quality.sql`/`052_blunders_parity_threat_tags.sql`
  (the migration this feature adds, `053_...`, is created in Phase 6 / US4).

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by every user story.

**None required.** Per `research.md`'s fragile-area verification, all six user stories touch
independent files/endpoints (`/api/coach/queue`, a brand-new `/api/coach/category-counts` route,
three unrelated aggregate endpoints, the papergames migration + `upsertGame`, the import-status
response, and `SettingsScreen`'s CTA) with no shared code path that must be built first. Story
ordering constraints that do exist — **US2 depends on US1/T005** (US2's drill-down acceptance
scenario renders via `MistakesListScreen`, which only pages to completion after US1's T005 lands;
US2's own endpoint work, T009-T011, is otherwise self-contained per plan.md's Story ordering note)
and **US5 depends on US4 shipping first** — are captured in **Dependencies & Execution Order**
below, not as a separate blocking phase.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Review all blunders despite the queue cap (Priority: P1) 🎯 MVP

**Goal**: Remove the `/api/coach/queue` 50-row hard cap by adding offset/limit pagination with a
true `total` count, and make every list-reading consumer page to completion.

**Independent Test**: Seed a user with 137 blunders across categories (including undercut and
forced_win). Page `/api/coach/queue` to completion and confirm all 137 are reachable with no
duplicates, in `severity DESC, created_at ASC` order preserved across pages.

### Implementation for User Story 1

- [x] T001a [P] [US1] Extract two pure functions and cover them with `node --test`, in
  `connect-four/tests/unit/coachQueuePagination.test.js` (write the tests first, confirm they
  fail before extraction, per this repo's test-first convention):
  1. `parseQueuePaginationParams(query)` — `limit` (default 50, max 200, 400-worthy on
     non-numeric/`< 1`/`> 200`) and `offset` (default 0, 400-worthy on non-numeric/`< 0`), per
     `contracts/coach-queue-pagination.md` § Query params.
  2. `shouldContinuePaging({ pageLength, limit, accumulated, total })` — the **dual guard**
     `pageLength < limit || accumulated === total` (not `accumulated === total` alone, which can
     spin forever if a row is deleted mid-session and `total` becomes unreachable).
  Extract both into a small shared module (e.g. `connect-four/server/coachQueuePagination.js` for
  #1; a client-side equivalent under `connect-four/src/lib/` for #2, or a single isomorphic module
  if the repo's build supports it — implementer's call, document the choice inline). T002 wires in
  #1; T005/T006 wire in #2.
- [x] T002 [US1] Add `limit` (default 50, max 200, 400 on invalid) and `offset` (default 0, 400 on
  invalid) query-param parsing/validation to the `GET /api/coach/queue` handler in
  `connect-four/server/index.js` (~:2477), using T001a's `parseQueuePaginationParams`, per
  `contracts/coach-queue-pagination.md`.
- [x] T003 [US1] Replace the hard-coded `.limit(50)` (~:2508) with `.range(offset, offset + limit - 1)`
  in the same handler, preserving the existing `status`/`category`/`game_id`/`papergames_game_id`
  filters and the `ORDER BY severity DESC, created_at ASC` clause unchanged.
- [x] T004 [US1] Fix the `total` field in the `GET /api/coach/queue` response to be a true DB-side
  `count()` of all rows matching the current filters (same `.eq()`/`.is()`/`.not()` chain, minus
  `.order()`/`.range()`) instead of today's `enriched.length` (silently `min(true_total, limit)`).
- [x] T005 [P] [US1] Update `connect-four/src/screens/MistakesListScreen.jsx` (~:38) to page
  `GET /api/coach/queue?status=all&category=<cat>` to completion — loop `offset += limit`, stopping
  on T001a's dual guard (`blunders.length < limit || accumulated === total` — **not**
  `accumulated === total` alone), accumulating into one client-side array before rendering
  (FR-003a).
- [x] T006 [P] [US1] Update `connect-four/src/screens/ReviewScreen.jsx` (~:102) to page
  `GET /api/coach/queue` to completion for its sibling-blunder queue fetch (chip/stepper
  navigation), same dual-guard stop condition and accumulation pattern as T005 (FR-003a).
- [x] T007 [P] [US1] Update `docs/architecture/api-conventions.md` § GET /api/coach/queue to
  document the new `limit`/`offset` query params, the corrected `total` semantics (true count, not
  page size), and the "page to completion" contract for list-reading consumers (FR-003a).
- [x] T008 [US1] Manually verify `quickstart.md` SC-001/SC-002 step 3 (seed 137 blunders, page
  `offset=0,50,100`, concatenate, assert length 137 with no duplicate `id`s and preserved
  ordering) and run `cd connect-four && npm run test:fast` — confirm green, including T001a.

**Checkpoint**: All of a user's blunders are reachable via pagination; `MistakesListScreen` and
`ReviewScreen` never silently truncate.

---

## Phase 4: User Story 2 - See a card for every category with blunders (Priority: P2)

**Depends on User Story 1 / T005**: FR-006 and this story's Acceptance Scenario 2 require
drilling down from a category card into the **full** per-category blunder list, which is rendered
by `MistakesListScreen` — that screen only pages to completion once US1's T005 lands. The
endpoint work in this story (T009-T011) has no US1 dependency and can start any time, but T012's
drill-down and T014's Acceptance Scenario 2 verification must not be considered done until T005 is
in place. Sequence US1 before US2 (see **Dependencies & Execution Order**).

**Goal**: Deliver the new `GET /api/coach/category-counts` endpoint (epic decision D2) and switch
`CategoryListScreen` to consume it directly — created and consumed entirely within this story, per
plan.md's Story ordering note (not deferred to or shared with User Story 3).

**Independent Test**: Seed a user with blunders spanning every valid category, including ones that
would fall outside a 50-row page. Confirm the mistakes overview shows one card per category with
≥1 blunder (including undercut and forced_win), each with an accurate count.

### Implementation for User Story 2

- [x] T009 [US2] Add a new `GET /api/coach/category-counts` route in
  `connect-four/server/index.js`, registered under `/api/coach/*`, with inline `requireAuth`
  (401 `{ "error": "unauthorized" }` if no `req.user`), scoped to `req.user.id`, per
  `contracts/coach-category-counts.md`.
- [x] T010 [US2] Implement the grouped `count()` query in the new route:
  `supabase.from('blunders').select('pattern_category, count()').eq('user_id', req.user.id)`-equivalent
  (RPC fallback only if the grouped-count form misbehaves — document the choice inline), returning
  `{ categories: [{ category, count }] }` with only `count ≥ 1` rows and no `quality` filter added
  (FR-008/FR-009 — `blunder`- and `suboptimal`-quality rows both counted, matching today's
  `/api/coach/queue` filter set).
- [x] T011 [US2] Add `503 { "error": "database unavailable" }` (no `supabase` client) and
  `500 { "error": "<message>" }` (DB error) responses to the new route per
  `contracts/coach-category-counts.md` § Errors.
- [x] T012 [US2] Update `connect-four/src/screens/CategoryListScreen.jsx` (~:35) to replace its
  `fetch('/api/coach/queue?status=all')` call with `fetch('/api/coach/category-counts')`, mapping
  `categories` directly to cards (no more deriving categories from a truncated blunder page);
  confirm the drill-down still passes `?category=` into `MistakesListScreen` (which now pages to
  completion per US1/T005).
- [x] T013 [P] [US2] Update `docs/architecture/api-conventions.md` to document the new
  `GET /api/coach/category-counts` endpoint (auth level, request/response shape, error cases) per
  `contracts/coach-category-counts.md`.
- [x] T014 [US2] Manually verify `quickstart.md` SC-001/SC-002 steps 2 and 4 (`/api/coach/category-counts`
  returns every category incl. undercut/forced_win with the exact count; `CategoryListScreen`
  renders a card for each) and run `cd connect-four && npm run test:fast` — confirm green.

**Checkpoint**: The mistakes overview shows a complete, accurate set of category cards regardless
of total blunder count, independent of `/api/coach/queue`'s page size.

---

## Phase 5: User Story 3 - Correct aggregate counts at any scale (Priority: P1)

**Goal**: Convert three JS-side "select all rows, aggregate in Node" aggregates
(`/api/stats`, `/api/games` blunder-count enrichment, `/api/coach/weakness-map`'s RPC-failure
fallback) to DB-side `count()`/grouped queries, replicating each one's exact current filter set
(FR-008) — `/api/puzzles/counts` is already correct and out of scope.

**Independent Test**: Seed a user with >1,000 blunder rows and >1,000 puzzle-attempt rows. Confirm
every aggregate endpoint in scope (stats, per-game mistake counts, weakness map, category counts)
returns the true count, not a row-cap-truncated one.

### Tests for User Story 3 (required by `contracts/scale-correct-aggregates.md` § Test strategy)

> Write these tests FIRST against a stubbed Supabase client; confirm they fail before extraction.

- [x] T015 [P] [US3] Unit test `computeStatsAggregate` in
  `connect-four/tests/unit/statsAggregate.test.js` with a stubbed Supabase client returning >1000
  synthetic `puzzle_attempts`/`puzzles` rows; assert `accuracy`/`totalPuzzles`/`byPattern` match
  ground truth (not silently capped at ~1000).
- [x] T016 [P] [US3] Unit test `computeBlunderCountsForGames` in
  `connect-four/tests/unit/blunderCountsForGames.test.js` with a stubbed client and a set of
  `gameIds`; assert per-game counts are correct and the query is scoped only to the given ids
  (no unbounded select).
- [x] T017 [P] [US3] Unit test `computeWeaknessMapFallback` in
  `connect-four/tests/unit/weaknessMapFallback.test.js` with a stubbed client returning >1000
  synthetic rows; assert `{ category, attempted, missRate }` entries match ground truth. Does
  **not** force the real `coach_weakness_map` RPC to fail (per `research.md` Decision 4 — this is
  a unit test of the extracted pure function only).

### Implementation for User Story 3

- [x] T018 [P] [US3] Extract `computeStatsAggregate(supabase, userId)` into
  `connect-four/server/statsAggregate.js`, replacing the unbounded
  `puzzle_attempts.select('first_attempt_correct, puzzles!inner(category)')` select in
  `GET /api/stats` (`connect-four/server/index.js:1242`) with a DB-side grouped `count()` query
  through the `puzzles!inner(category)` join (Postgres RPC fallback only if the grouped-count
  form misbehaves through the join — document whichever is chosen inline). Response shape
  (`{ accuracy, totalPuzzles, byPattern }`) unchanged; same `.eq('user_id', ...)` filter, no
  `quality` filter added.
- [x] T019 [P] [US3] Extract `computeBlunderCountsForGames(supabase, userId, gameIds)` into
  `connect-four/server/blunderCountsForGames.js`, replacing the unbounded blunder-count
  enrichment in `GET /api/games` (`connect-four/server/index.js:1877-1898`) with a grouped
  `count()` query scoped to only the current page's `aiIds`/`pgIds` (`.in('game_id', gameIds)`).
  `blunder_count` field semantics unchanged.
- [x] T020 [P] [US3] Extract `computeWeaknessMapFallback(supabase, userId)` into
  `connect-four/server/weaknessMapFallback.js`, replacing the unbounded `puzzle_attempts` select
  in the `GET /api/coach/weakness-map` fallback (`connect-four/server/index.js:2446-2470`, only
  reached on RPC error) with the same `count()`-grouped approach as T018. Add a code comment
  noting this path is dormant (exercised only when `coach_weakness_map` RPC errors) — no
  investigation into RPC reliability, per `research.md` Decision 4. Response shape
  (`{ weaknessMap: [{ category, attempted, missRate }] }`) unchanged.
- [x] T021 [US3] Wire T018/T019/T020's extracted functions into their respective route handlers in
  `connect-four/server/index.js`, removing the now-dead inline JS-aggregation code at each call
  site.
- [x] T022 [US3] Manually verify `quickstart.md` SC-003 (seed >1200 `blunders` + >1200
  `puzzle_attempts` rows; confirm `/api/stats`, `/api/games` `blunder_count`, and
  `/api/coach/category-counts` each match an independent direct-SQL `count()` ground truth) and
  run `cd connect-four && npm run test:fast` — confirm green, including T015-T017.

**Checkpoint**: Every in-scope aggregate stays correct past 1,000 rows with no filter-set drift.

---

## Phase 6: User Story 4 - Each user gets their own imported game and blunders (Priority: P1)

**Goal**: Fix the cross-user ownership collision — change `papergames_games` from a global
`UNIQUE(papergames_room_uid)` to `UNIQUE(user_id, papergames_room_uid)`, update `upsertGame`'s
`onConflict` key, and re-scope the blunder dedup index per-user.

**Independent Test**: As user A, import room X. As user B, import the same room X. Confirm both
users retain their own independent game row and their own blunders, with neither disturbed by the
other's import.

### Implementation for User Story 4

- [x] T023 [P] [US4] Confirm `connect-four/server/userRoutes.js:532`'s `papergames_games` query is
  read-only (per `research.md`'s open item) — verify it is not a second upsert-by-room-uid path
  that would need its own `onConflict` fix before the migration lands.
- [x] T024 [US4] Create migration
  `connect-four/server/migrations/053_papergames_ownership_and_blunder_index.sql` per
  `data-model.md`: (1) `ALTER TABLE papergames_games DROP CONSTRAINT IF EXISTS
  papergames_games_papergames_room_uid_key`, (2) `DROP INDEX IF EXISTS
  idx_blunders_papergames_unique`, (3) the `DO $$ ... RAISE EXCEPTION` post-drop guard that fails
  loudly if a stray global `UNIQUE(papergames_room_uid)` constraint remains under another name,
  (4) `ADD CONSTRAINT papergames_games_user_room_unique UNIQUE (user_id, papergames_room_uid)`,
  (5) recreate `idx_blunders_papergames_unique` as
  `UNIQUE (user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`. No data
  UPDATE step (Out of Scope: historical-data repair).
- [x] T025 [US4] Pre-flight (immediately before applying migration 053 to production): re-run the
  constraint-name verification queries from `data-model.md` § Constraint-name verification against
  the production Supabase instance (session-pooler `DATABASE_URL`); confirm the names still match
  `papergames_games_papergames_room_uid_key` / `idx_blunders_papergames_unique` used in T024's
  DROP statements, updating them if production has diverged.
- [x] T026 [US4] Update `upsertGame()` in `connect-four/server/papergamesImporter.js:163` — change
  `.upsert(gameRow, { onConflict: 'papergames_room_uid', ignoreDuplicates: false })` to
  `onConflict: 'user_id,papergames_room_uid'`. Confirm this one change point fixes both
  `importForUser` (self-service batch import) and `saveLiveGame` (live-game save), which share
  this function.
- [x] T027 [US4] Verify `insertGameBlunder()` (`connect-four/server/insertGameBlunder.js`) collision
  semantics against the new `(user_id, papergames_game_id, move_index)` index — confirm no code
  change is needed (existing `23505`-as-success handling already inserts `user_id` on every row;
  only the index's column scope changed).
- [x] T028 [P] [US4] Update `docs/architecture/db-schema.md` for both constraint changes:
  `papergames_games`'s new composite unique constraint, and `blunders`'s
  `idx_blunders_papergames_unique` gaining `user_id`.
- [x] T029 [P] [US4] Update `docs/architecture/data-model.md` for both constraint changes,
  referencing migration `053_papergames_ownership_and_blunder_index.sql`.
- [x] T030 [US4] Manually verify `quickstart.md` SC-004/SC-005 (user A imports room X; user B
  imports the same room X → both get independent game rows and blunders, A's data untouched; user
  A re-imports room X → no duplicate rows) against a local/staging Supabase instance, and run
  `cd connect-four && npm run test:fast` — confirm green.

**Checkpoint**: Two different users importing the same external room never collide; re-imports by
the same user stay idempotent.

---

## Phase 7: User Story 5 - Trustworthy import result reporting (Priority: P2)

**Goal**: Surface the already-computed `blunderErrors` count in the import-status response and
render it distinctly from `skipped` (genuine duplicate) in `SettingsScreen` — only meaningful once
User Story 4 has removed the cross-user-collision false positive (spec Acceptance Scenario 2).

**Independent Test**: Import a room, then re-import the identical room as the same user. Confirm
the result reports skipped-as-duplicate counts (not a generic error), and that a first-time
cross-user import (post-US4) reports zero collisions.

### Implementation for User Story 5

- [x] T031 [P] [US5] Verify `blunderErrors` is already returned by the
  `GET /api/user/papergames/import/status` handler in `connect-four/server/userRoutes.js`
  (~:648 — `blunderErrors: job.blunderErrors ?? 0`) and ensure it is documented per
  `contracts/papergames-ownership-migration.md` § US1.5 (this task is verification + doc-check
  only — no code change; the substantive US5 work is T032's frontend distinct copy and T033's
  `api-conventions.md` update). VERIFIED: `blunderErrors` and `skipped` are both already returned
  (userRoutes.js:646-648) — no code change needed. **Contract mismatch found**: § US1.5 describes
  `skipped` as a same-user duplicate-detection count; `importForUser` (papergamesImporter.js
  ~:305-350) actually counts room-processing failures and has no duplicate-room detection at all.
  Documented as a flagged gap in api-conventions.md rather than silently reproducing the incorrect
  claim in the frontend.
- [x] T032 [P] [US5] Update `connect-four/src/screens/SettingsScreen.jsx` import result copy to
  render `skipped` ("N blunders skipped as duplicates") and `blunderErrors` (genuine error count)
  as distinct messages; add i18n keys under the existing import-result copy namespace. DONE with a
  deviation: copy describes `skipped` as "couldn't be processed and were skipped" (accurate to
  what the field measures per T031's finding) rather than "duplicates" (which the code does not
  support). SettingsScreen.jsx has no i18n usage anywhere today (unlike every other screen, which
  uses `react-i18next`); per the escalation instruction, plain string literals matching the file's
  own existing convention were used instead of introducing i18n only for this one section.
- [x] T033 [P] [US5] Update `docs/architecture/api-conventions.md` § GET /api/user/papergames/import/status
  to document the `blunderErrors` field in the response contract. DONE — also documents `skipped`'s
  real semantics and flags the contract-vs-implementation gap.
- [x] T034 [US5] Manually verify `quickstart.md` SC-005 (re-import same room as same user →
  `skipped > 0`, `blunderErrors: 0`) and the US4-dependent regression check (a second user's
  first-time import of an already-imported room reports `skipped: 0` with no error attributed to
  the now-fixed cross-user collision — Acceptance Scenario 2), and run
  `cd connect-four && npm run test:fast` — confirm green. PARTIAL: `npm run test:fast` is green
  (908/908). The literal `skipped > 0` re-import scenario could not be produced — see T031's
  finding: same-user re-import typically re-processes 0 rooms (blocked by the `lastImportAt`
  incremental-stop check before `importForUser` runs) rather than reporting `skipped > 0`, and even
  if rooms were reprocessed, a clean re-import produces `imported++`, not `skipped++`. Verified via
  full code trace of `userRoutes.js` (import route + status route) and `papergamesImporter.js`
  instead of a live import (no test papergames.io account with real game history was available in
  this environment). The US4 regression check (Acceptance Scenario 2) IS verified structurally: migration
  053's `(user_id, papergames_room_uid)` unique constraint plus `upsertGame`'s
  `onConflict: 'user_id,papergames_room_uid'` (both already shipped, unmodified) mean a second
  user's import of an already-imported room inserts a new row keyed to their own `user_id` with no
  constraint violation — confirmed by reading the migration + importer code together.

**Checkpoint**: Import results honestly distinguish duplicates from real errors, with no residual
false positives from the User Story 4 collision.

---

## Phase 8: User Story 6 - Get to imported games right after importing (Priority: P3)

**Goal**: Add a post-import CTA in `SettingsScreen` that navigates to Past Games.

**Independent Test**: Complete a papergames import and confirm the success state presents an
interactive element that navigates to Past Games, in both full-success and partial-success states.

### Implementation for User Story 6

- [x] T035 [US6] Add an interactive CTA (button/link) to `connect-four/src/screens/SettingsScreen.jsx`'s
  import success state that navigates to Past Games (`go('pastGames')` or equivalent per the
  existing screen registry — no new navigation param needed, Past Games already lists all of a
  user's games). Present in both full-success and partial-success (`skipped > 0` or
  `blunderErrors > 0`) states; never hidden. DONE — "View imported games" button renders whenever
  `importResult` is set (covers full success, capReached, and partial success with
  skipped/blunderErrors), and is never shown for a hard job failure (`job.status === 'error'`,
  which only sets `importError`).
- [x] T036 [US6] i18n the CTA copy under the existing import-result namespace, and confirm the
  partial-success copy accurately reflects skipped/error counts without misrepresenting them as a
  full failure (FR-017). DONE with the same plain-string-literal decision as T032 (file has no
  i18n usage). Partial-success copy always leads with "Imported N game(s)." before appending the
  skipped/blunderErrors detail, so it never reads as a full failure.
- [x] T037 [US6] Manually verify `quickstart.md` SC-006 (fresh import and partial-success import
  both show the CTA with accurate copy, and the CTA navigates to Past Games) and run
  `cd connect-four && npm run test:fast` — confirm green. VERIFIED via code trace of all
  `job.status === 'done'` branches (full success, capReached, skipped>0, blunderErrors>0) —
  `importResult` is set and the CTA renders in every one, calling `go('pastGames')` which is
  registered in `screenRegistry.jsx:36` → `PastGamesListScreen`. `npm run test:fast` green
  (908/908). No live browser session was used (see T034 note on environment constraints); this is
  a static trace, not a driven UI QA pass.

**Checkpoint**: All six user stories are independently functional and shippable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final regression sweep and guardrail confirmation across all six stories.

- [x] T038 Run `cd connect-four && npm run test:fast` once with all six stories merged, confirming
  no cross-story regression (queue pagination + category counts + scale-correct aggregates +
  ownership migration + import reporting + CTA all coexist cleanly). DONE — 908 tests, 908 pass,
  0 fail, ~24s. Matches the pre-batch baseline exactly (no new tests added this batch — US5/US6
  are frontend-copy/CTA changes with no new pure-function extraction to unit-test).
- [x] T039 Re-run `quickstart.md` end-to-end (SC-001 through SC-006) against a single seeded
  local/staging Supabase environment to confirm the full epic's acceptance criteria hold together,
  not just per-story. SC-001–SC-004 were owned and verified by prior batches (US1–US4, unchanged
  this batch). SC-005 and SC-006 were verified this batch by code trace rather than a live seeded
  run — see T034/T037 notes for exact scope and the SC-005 contract/implementation gap discovered.
  No cross-story defect was found; the gap is confined to US5's own field semantics, not an
  interaction between stories.
- [x] T040 Confirm Out-of-Scope guardrails held across all stories: no `quality` filter was added
  to any converted aggregate (FR-008); `GET /api/user/session-stats/all`'s `byPattern` was not
  touched; no MistakesList/coach-queue UI redesign beyond count-driven cards (User Story 2); no
  historical-data backfill/repair was performed for pre-existing rows (Out of Scope). VERIFIED:
  (1) `grep quality` on `server/statsAggregate.js`, `server/blunderCountsForGames.js`,
  `server/weaknessMapFallback.js`, `server/coachQueuePagination.js` finds only explanatory comments
  ("no `quality` filter added"), no actual filter code. (2) `git diff main -- userRoutes.js` shows
  no changes to `/api/user/session-stats/all` or its `byPattern` computation (lines 42-89,
  untouched). (3) `git diff main` on `MistakesListScreen.jsx`/`ReviewScreen.jsx`/
  `CategoryListScreen.jsx` shows only count-driven card additions per US2, no broader redesign.
  (4) `migrations/053_papergames_ownership_and_blunder_index.sql` explicitly contains "No data
  UPDATE step" per spec's Out-of-Scope historical-repair exclusion; no backfill script exists or
  was run this batch.

**Architecture documentation** (Constitution Principle VIII — already covered above, not
duplicated here): `docs/architecture/api-conventions.md` (T007, T013, T033),
`docs/architecture/db-schema.md` (T028), `docs/architecture/data-model.md` (T029).

---

## Dependencies & Execution Order

**Phase numbers (3–8) are story identifiers, matching spec.md's User Story 1–6 numbering — they
are NOT an execution priority order.** Phase 4 (US2, P2) appearing before Phase 6 (US4, P1) in the
task list is purely organizational (US1→US6 numbering); it does not mean US2 should be built
before US4. The **Incremental Delivery** section below is the authoritative execution order; this
Dependencies section and that section must agree (they do, as of this revision).

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty (see rationale above) — does not block any story.
- **User Stories (Phase 3–8)**: Two explicit story-to-story ordering constraints exist; all other
  stories are mutually independent:
  - **US2 (Phase 4) depends on US1 (Phase 3) / T005** — FR-006/US2 Acceptance Scenario 2 need the
    full per-category blunder list, which `MistakesListScreen` only renders after US1's T005
    (page-to-completion) lands. US2's endpoint work (T009-T011) has no US1 dependency and may
    start any time, but T012 (frontend drill-down) and T014 (Acceptance Scenario 2 verification)
    must follow T005. **US2's `/api/coach/category-counts` endpoint is still created and consumed
    entirely within US2** (plan.md's Story ordering note) — this dependency is only on US1's
    `MistakesListScreen` change, not on US2's own endpoint being merged with US3.
  - **US5 (Phase 7) depends on US4 (Phase 6) being complete** — per spec.md's own framing ("without
    [US4] shipping first, any 'error' surfaced here would be a false positive from the cross-user
    collision rather than a genuine one") and Acceptance Scenario 2. Do not implement/verify US5's
    regression check before US4's migration and `upsertGame` fix are in place.
  - US1, US3, US4, US6 have no story-to-story dependency on each other. US2 depends on US1 as
    above; US5 depends on US4 as above.
- **Polish (Phase 9)**: Depends on all six user stories being complete.

### Within Each User Story

- Route/handler edits before the frontend consumer that depends on the new/changed response shape
  (e.g., T009-T011 before T012; T024/T026 before T030's verification).
- Extraction + its unit test before wiring the extracted function into the live route handler
  (US1: T001a before T002 and before T005/T006; US3: T015-T017 before T018-T020, both before T021).
- Documentation tasks ([P] within a story) can run any time after the shape they document is
  finalized, and in parallel with other same-story doc/frontend tasks touching different files.
- Each story ends with its manual `quickstart.md` verification + `npm run test:fast` green task.

### Parallel Opportunities

- Setup: T001 only — nothing to parallelize.
- US1: T001a (test-first extraction) before T002/T005/T006; T005 and T006 (different frontend
  files) in parallel once T001a lands; T007 (docs) in parallel with either.
- US2: T013 (docs) in parallel with T012 (frontend) once T009-T011 (endpoint) land — but T012/T014
  cannot be called *complete* until US1's T005 has also landed (see Dependencies above).
- US3: T015/T016/T017 (three independent test files) in parallel; T018/T019/T020 (three
  independent pure-function modules) in parallel — but each test must precede its own extraction.
- US4: T023 (read-only verification) in parallel with early migration drafting; T028/T029 (two
  independent doc files) in parallel once the migration is finalized.
- US5: T031/T032/T033 (server field, frontend copy, docs — three independent files) in parallel.
- US6: T035/T036 touch related but distinct files (component vs. locale file); low risk to run
  sequentially given the shared copy requirement.
- Across stories: US1, US3, US4, US6 have no inter-story file overlap and can be staffed in
  parallel by independent workstreams. US2 can be staffed in parallel too for its own endpoint
  work (T009-T011, T013), but its drill-down completion (T012/T014) must wait on US1/T005; US5
  must wait on US4.

---

## Parallel Example: User Story 3

```bash
# Launch all three extraction unit tests together (write first, confirm failing):
Task: "Unit test computeStatsAggregate in connect-four/tests/unit/statsAggregate.test.js"
Task: "Unit test computeBlunderCountsForGames in connect-four/tests/unit/blunderCountsForGames.test.js"
Task: "Unit test computeWeaknessMapFallback in connect-four/tests/unit/weaknessMapFallback.test.js"

# Then launch all three pure-function extractions together (different files):
Task: "Extract computeStatsAggregate into connect-four/server/statsAggregate.js"
Task: "Extract computeBlunderCountsForGames into connect-four/server/blunderCountsForGames.js"
Task: "Extract computeWeaknessMapFallback into connect-four/server/weaknessMapFallback.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Skip Phase 2 (empty).
3. Complete Phase 3: User Story 1 (queue pagination) — the confirmed QA-major defect blocking the
   most blunders (87/137 unreachable today).
4. **STOP and VALIDATE**: run `quickstart.md` SC-001/SC-002 step 3 + `npm run test:fast`.
5. Ship if ready — US1 alone already makes every blunder reachable via paging, even before US2's
   category cards land.

### Incremental Delivery (recommended order — this is the authoritative execution order; the
phase numbering above is a story index, not a sequence)

1. Setup → **US1** (P1, queue pagination) → validate → ship.
2. **US4** (P1, ownership migration) → validate → ship (independent of US1; both are P1 QA
   blocker/major fixes and can be delivered in either order relative to US1, or in parallel with
   it — but see step 4 below for US2's dependency on step 1).
3. **US3** (P1, scale-correct aggregates) → validate → ship.
4. **US2** (P2, category cards) — **after US1/T005 is live** → validate → ship.
5. **US5** (P2, honest import reporting) — **only after US4 is live** → validate → ship.
6. **US6** (P3, post-import CTA) → validate → ship.
7. Phase 9: Polish — full regression + guardrail confirmation.

Summary: US1 → US4 → US3 form the P1 core (US1 first if US2 is wanted soon after; US4/US3 can
interleave with US1 in any order). US2 waits on US1. US5 waits on US4. US6 is last (P3, no
dependents).

### Parallel Team Strategy

With multiple developers/agents:

1. Skip Foundational (empty).
2. Assign in parallel: Developer/Agent A → US1; Developer/Agent B → US4; Developer/Agent C → US3.
   Each is independently testable and touches non-overlapping files.
3. Developer/Agent D can start US2's endpoint work (T009-T011, T013) in parallel with the above —
   but must hold T012 (frontend drill-down) and T014 (Acceptance Scenario 2 verification) until
   Agent A's US1/T005 checkpoint is reached.
4. US6 can be picked up by whichever agent frees up first (small, independent).
5. Hold US5 until US4's Phase 6 checkpoint is reached, then assign it.
6. Converge on Phase 9 once all six stories are individually validated.
