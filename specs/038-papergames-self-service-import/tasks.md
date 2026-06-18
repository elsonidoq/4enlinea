# Tasks: Papergames Self-Service Import

**Input**: Design documents from `/specs/038-papergames-self-service-import/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/ (3 files), research.md

**Tests**: Not requested — manual golden-path verification per constitution §III.

**Organization**: Tasks are grouped by user story. US1 (profile save) is fully independent.
US2 (background import) depends on US1's foundational server work (loadUser extension) and
on T003 (insertGameBlunder extension). US3 (free-tier cap) has no separate tasks — its logic
is inline within T011 (POST handler, step C2b).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)

---

## Phase 1: Setup (DB Migration — blocks everything)

**Purpose**: Apply the DB migration that all server code depends on. No server or frontend
task can be deployed to production before this lands.

**⚠️ CRITICAL**: Run `node server/migrate.js` from `connect-four/` after writing this file.

- [x] T001 Write migration `connect-four/server/migrations/047_papergames_user_columns.sql`:
  (1) `ALTER TABLE users ADD COLUMN IF NOT EXISTS papergames_id text;`
  (2) `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_import_at timestamptz;`
  (3) `ALTER TABLE blunders ADD COLUMN IF NOT EXISTS move_index integer;`
  (4) `CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_papergames_unique ON blunders (papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL;`
  Order matters: column (3) must appear before index (4). Apply via `node server/migrate.js`.

**Checkpoint**: Migration applied — `users` has `papergames_id` + `last_import_at`; `blunders` has `move_index` and the partial unique index.

---

## Phase 2: Foundational (Blocking Server Prerequisites)

**Purpose**: Server-side infrastructure that MUST be complete before any user story endpoint
can be implemented. B1 (loadUser) gates every downstream req.user field access. B4
(insertGameBlunder) must precede papergamesImporter.js or the dedup unique index silently
receives NULL for all move_index values (two NULLs are distinct in PostgreSQL unique indexes,
defeating the constraint).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend `loadUser` in `connect-four/server/index.js` at **all three sites** to SELECT
  `papergames_id, last_import_at` from `users`:
  - **Line 344** — normal SELECT for an existing `users` row: add `, papergames_id, last_import_at` to the projection.
  - **Line 350** — insert-then-reselect for a brand-new user row: add the same two columns to the reselect.
  - **Line 354** — fallback literal object returned when the `users` row is absent: add `papergames_id: null, last_import_at: null`.
  Missing any one of the three leaves `req.user.papergames_id` as `undefined` on that code path.

- [x] T003 Extend `insertGameBlunder()` in `connect-four/server/insertGameBlunder.js` to populate `move_index`:
  - In the row object passed to `.insert()`, add `move_index: row.board_state?.length ?? null`.
  - The existing `23505` error catch (unique-constraint violation) is already present and handles the papergames idempotent-skip path — do not remove it.
  - No change to the sparring path is required: sparring rows have `papergames_game_id = null`, which excludes them from the partial unique index.

**Checkpoint**: Foundation ready — `req.user` carries `papergames_id` and `last_import_at`; `insertGameBlunder()` stamps `move_index` and silently skips duplicates via the unique index.

---

## Phase 3: User Story 1 — Save Papergames Account ID (Priority: P1) — MVP

**Goal**: Signed-in users can enter their Papergames hex account ID on a new Settings screen,
save it, and see it pre-filled on the next visit.

**Independent Test**: Save a hex string via the Settings screen, reload the page — the input
is pre-filled. Verify empty string and 65-char string are rejected with inline errors.
Unauthenticated users tapping the gear icon see the auth modal.

### Implementation for User Story 1

- [x] T004 [P] [US1] Extend `GET /api/user/profile` response in `connect-four/server/userRoutes.js`
  to include `papergames_id` and `last_import_at` in the returned object. Both fields already
  exist on `req.user` after T002 — add them to the response literal. No additional DB query
  is needed.

- [x] T005 [P] [US1] Add `PUT /api/user/profile` handler in `connect-four/server/userRoutes.js`
  immediately after the existing GET handler:
  - Require auth: return 401 if `req.user` is null.
  - Validate `papergames_id`: must be a non-empty string, max 64 chars.
    On failure: `400 { "error": "papergames_id must be a non-empty string (max 64 chars)" }`.
  - On valid input: `supabase.from('users').update({ papergames_id }).eq('id', req.user.id)`.
    Use `.update()`, not `.upsert()` — the row is guaranteed to exist.
  - On success: `204 No Content`.
  - On DB error: `500`.
  Manually verify: valid input → 204, empty string → 400, 65-char string → 400, no auth → 401.

- [x] T006 [P] [US1] Register the `settings` screen in `connect-four/src/lib/screenRegistry.jsx`:
  add `settings: () => import('../screens/SettingsScreen')` (or equivalent lazy-import pattern
  matching existing entries). Do not change any existing entry.

- [x] T007 [P] [US1] Add `/settings` to `connect-four/src/lib/urlMapping.js`:
  add an entry mapping route key `'settings'` to path `'/settings'`. Not SESSION_ONLY —
  the screen is cold-bootable from a direct URL. Follow the existing entry format exactly.

- [x] T008 [P] [US1] Add a gear icon button to `connect-four/src/screens/HomeScreen.jsx`
  alongside the existing stats button (around line 83–89):
  - The button is visible to all users (authenticated and anonymous).
  - Authenticated users: `go('settings')`.
  - Unauthenticated users: show the auth modal instead.
  - Use the same icon library and size convention as adjacent buttons on the screen.

- [x] T009 [US1] Create `connect-four/src/screens/SettingsScreen.jsx` — the new Settings screen:
  - For **unauthenticated users**: render a sign-in prompt only (no Papergames block).
  - For **authenticated users**, render the Papergames section:
    - A text input pre-filled with `profile.papergames_id` on load (read via the store's
      profile data; re-fetch profile from `GET /api/user/profile` on mount to get latest value).
    - A "Find your account ID" link opening `https://papergames.io/en/account` in a new tab
      (`target="_blank" rel="noopener noreferrer"`), rendered next to the input.
    - A Save button that calls `PUT /api/user/profile` with `{ papergames_id }`.
      - Inline validation: empty or >64-char input shows an error without making a network request.
      - On 400 from server: show the error message inline.
      - On 204: show a brief success confirmation.
    - An Import button (disabled until US2/E1 wiring is complete — stub as disabled for now).
  - Use inline English strings (no i18n keys per spec assumption).
  - Screen must be independently loadable from `/settings`.

**Checkpoint**: User Story 1 fully functional — settings screen accessible from gear icon,
Papergames ID saves and pre-fills, validation works, "Find your account ID" link works.

---

## Phase 4: User Story 2 — Import Papergames Games (Priority: P2)

**Goal**: A user with a saved Papergames ID taps Import, the server starts a background job,
and on completion the past-games list shows newly imported games.

**Independent Test**: Trigger `POST /api/user/papergames/import` for a user with a saved ID.
Receive `202 { jobId }`. Poll `GET /api/user/papergames/import/status?jobId=<id>` until
`status === "done"`. Verify `papergames_games` rows exist in the DB and the past-games list
shows them with opponent metadata and accuracy.

**Note on US3**: The free-tier cap logic (US3) is implemented inline in T011 (step C2b of the
POST handler). No separate task is created — the cap check is inseparable from the POST handler
flow.

### Implementation for User Story 2

- [x] T010 [US2] Create `connect-four/server/papergamesImporter.js` — the new import module.
  This task refactors the existing logic from `connect-four/server/scripts/import_papergames_blunders.mjs`
  into an exported module. Steps:
  - Export `async function importForUser(supabase, userId, papergamesId, gameLimit, lastImportAt)`
    returning `Promise<{ imported, skipped }>`.
  - At function entry: call `createSolverProcess()` (import from `c4solver-wrapper.js`) to spawn
    a dedicated solver child process. In a `finally` block, call `.destroy()` to tear it down.
  - Internal helpers (not exported): `fetchRooms`, `fetchReplay`, `parseMoves`, `getUserSide`,
    `getResult`, `extractBlunders` — port from the existing CLI script.
  - The fetch loop: paginate `GET https://papergames.io/api/profile/:papergamesId/rooms` until
    either `gameLimit` is reached or the room's `createdAt` is older than `lastImportAt`
    (incremental stop).
  - For each room: fetch replay, parse moves, determine user side, call `extractBlunders()` to
    run solver analysis, write `papergames_games` row via upsert on `papergames_room_uid` —
    the upsert row MUST include `user_id: userId` (this field is the linchpin of the free-tier
    cap count in C2b and the ownership guard on `GET /api/games`; omitting it silently makes
    the cap always return 0 and breaks game-list filtering) — then call `insertGameBlunder()`
    per blunder (do NOT bulk-insert directly to `blunders`).
  - `insertGameBlunder()` is already imported from `insertGameBlunder.js`; it handles dedup via
    the unique index (23505 catch). Pass `papergames_game_id` (not `game_id`) for all blunder rows.
  - On any per-game error: increment `skipped`, continue to next room (do not throw).
  - On fatal error (e.g., solver spawn fails, Papergames API unreachable after retries): throw
    so the caller can set `status: 'error'`.
  - `importForUser` must NOT write to `users.last_import_at` — that is the endpoint's
    responsibility (Decision 1 in plan.md).
  Verify: the function accepts injected `supabase` and solver factory — no hidden global state.

- [x] T011 [US2] Register `POST /api/user/papergames/import` and `GET /api/user/papergames/import/status`
  endpoints in `connect-four/server/userRoutes.js`. Implement the POST handler in the exact
  sub-step order from plan.md:
  - **Declare** a module-level `Map<jobId, JobState>` (the in-memory job store) at the top of
    the routes file (or in an extracted `papergamesJobMap.js` if the file is too large).
  - **C2a** (first guard): Read `papergames_id` from `req.user`. If null or empty string,
    return `400 { "error": "no papergames_id configured" }` immediately. This is the
    FIRST check — before any DB query or in-flight guard.
  - **C2b** (cap check): Query `SELECT COUNT(*) FROM papergames_games WHERE user_id = req.user.id`.
    Derive `gameLimit`: free tier → `Math.max(0, 15 - count)`; paid tier → `IMPORT_GAME_LIMIT`
    constant (50). If `gameLimit === 0`, write a synthetic job entry to the Map with
    `status: 'done', imported: 0, skipped: 0, capReached: true`, and return `202 { jobId }`
    immediately — do NOT call `importForUser` or spawn a solver. This covers US3's cap enforcement.
    All other job entries (normal runs) MUST set `capReached: false`.
  - **C2c** (one-in-flight guard): Iterate the Map to find any entry where
    `entry.userId === req.user.id` and `entry.status` is `'pending'` or `'running'`. If found,
    return `202 { jobId: entry.jobId }` immediately.
  - **C2d** (spawn job): Generate a new `jobId` (uuid). Insert `{ jobId, userId: req.user.id, status: 'pending', imported: 0, skipped: 0, error: null }` into the Map. Return `202 { jobId }`.
    Then asynchronously (via `setImmediate` or `Promise.resolve().then(...)`):
    - Update job to `status: 'running'`.
    - Call `importForUser(supabase, req.user.id, papergamesId, gameLimit, req.user.last_import_at)`.
    - On resolve `{ imported, skipped }`: update job to `status: 'done'`, set counts; write
      `new Date().toISOString()` to `users.last_import_at` via supabase update.
    - On reject: update job to `status: 'error'`, set `error` string; do NOT update `last_import_at`.
  - **GET handler** (`/api/user/papergames/import/status?jobId=<uuid>`):
    - Validate `jobId` query param (present + UUID regex). Return 400 if invalid.
    - Look up `jobMap.get(jobId)`. Return 404 if not found.
    - Check ownership: `if (job.userId !== req.user.id) return 404` (treat mismatch as not-found).
    - Return `200 { status, imported, skipped, error }`.
  Manually verify: 400 for missing papergames_id, 202+jobId for valid trigger, 202+same jobId
  for second trigger while first is running, 200 with status on poll, 404 for unknown jobId.

- [x] T012 [P] [US2] Refactor `connect-four/server/scripts/import_papergames_blunders.mjs` to be
  a thin wrapper over `papergamesImporter.js`:
  - Replace the body of `main()` (or the top-level logic) with a call to
    `importForUser(supabase, userId, papergamesId, gameLimit, lastImportAt)`.
  - The CLI script's argument parsing, supabase client setup, and console output can remain.
  - No import/analysis logic should remain in the script itself — it all lives in `papergamesImporter.js`.
  - Verify SC-006: run the CLI script with a real papergames ID and confirm it still imports correctly.

- [x] T013 [US2] Wire import polling and status display in `connect-four/src/screens/SettingsScreen.jsx`
  (extends T009):
  - Enable the Import button (remove the stub-disabled state from T009).
  - On Import button tap: call `POST /api/user/papergames/import` with the auth header.
    Disable the button immediately; show a progress indicator.
  - Store `jobId` in component state. Start polling `GET /api/user/papergames/import/status?jobId=<id>`
    every 2 seconds (use `setInterval` or recursive `setTimeout`; clear on unmount).
  - While `status === 'running'` or `'pending'`: keep showing progress indicator.
  - On `status === 'done'`: stop polling. If `capReached` is true, display the cap message
    ("You've reached your 15-game limit") — do NOT show "Imported N games". If `capReached`
    is false, display "Imported N games". In both cases re-enable the Import button and trigger
    a refresh of the past-games list (invalidate the store's games cache or call the relevant
    store method).
  - On `status === 'error'`: stop polling, display the error message, re-enable Import button.
  - On 202 with existing jobId (one-in-flight guard hit): resume polling with the returned jobId —
    do not show an error.
  Verify: import runs to completion, game list updates, error state shows message, button
  re-enables correctly after both success and error.

**Checkpoint**: User Story 2 fully functional — import runs in background, UI shows progress,
game list refreshes on completion, per-game errors are skipped gracefully (skipped count reflects
them), incremental re-import fetches only newer games.

---

## Phase 5: User Story 3 — Free-Tier Import Cap (Priority: P3)

**Goal**: Free-tier users at the 15-game lifetime cap see `imported: 0` immediately; import
does not spawn a solver or call the Papergames API.

**Independent Test**: With a free-tier test user that has 15 `papergames_games` rows,
trigger `POST /api/user/papergames/import`. The job immediately transitions to
`status: "done"` with `imported: 0`. No new `papergames_games` rows are created.

**Note**: This story has no dedicated tasks — the cap logic is fully embedded in T011 (C2b).
This phase exists to document the independent test criteria and confirm T011 covers it.

**Verification checklist for T011's C2b**:
- [x] T014 [US3] Manually verify free-tier cap behavior against the POST handler from T011:
  - Free-tier user with <15 imported games: import runs, new games are added up to the cap.
  - Free-tier user with exactly 15 imported games: job returns `done, imported: 0` immediately;
    no solver spawned, no Papergames API call made.
  - Paid-tier user: up to 50 games processed per run regardless of prior count.

**Checkpoint**: Free-tier cap enforced — quota protection confirmed for all three sub-scenarios.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates required by constitution Principle VIII. These are mandatory
— the feature is not "shipped" until all three doc tasks are complete.

- [x] T015 [P] Update `connect-four/docs/architecture/db-schema.md` (FR-022):
  - Add the `papergames_games` table (currently absent from the doc).
  - Add the two new `users` columns: `papergames_id text` (nullable), `last_import_at timestamptz` (nullable).
  - Add the new `blunders.move_index integer` column (nullable).
  - Document the new partial unique index `idx_blunders_papergames_unique`.

- [x] T016 [P] Update `connect-four/docs/architecture/api-conventions.md`:
  - Add the three new endpoints: `PUT /api/user/profile`, `POST /api/user/papergames/import`,
    `GET /api/user/papergames/import/status`.
  - Document the 202-immediate pattern for the POST endpoint (async job with jobId).
  - Document the 404-for-ownership-mismatch convention (privacy-preserving 404 on status endpoint).

- [x] T017 [P] Update `connect-four/docs/architecture/server-conventions.md`:
  - Document the extended `insertGameBlunder()` signature: accepts either `game_id` (sparring path)
    or `papergames_game_id` (import path); exactly one must be non-null.
  - Document `move_index` stamping: computed as `row.board_state?.length ?? null`.
  - Document the in-memory job Map pattern (module-level Map keyed by jobId; not persisted;
    restarts clear all entries).

**Checkpoint**: Documentation complete — all three architecture docs reflect the new endpoints,
DB schema, and server patterns.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Migration)**: No dependencies — write the SQL file immediately; apply via migrate.js.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user story phases.
- **Phase 3 (US1)**: Depends on Phase 2. Can start immediately after foundational tasks complete.
- **Phase 4 (US2)**: Depends on Phase 2 (T002 for loadUser, T003 for insertGameBlunder).
  T010 (papergamesImporter) depends on T003 specifically.
  T011 (endpoints) depends on T010.
  T012 (CLI refactor) depends on T010 and can run parallel to T011.
  T013 (UI polling) depends on T011 AND T009 (US1 SettingsScreen base).
- **Phase 5 (US3)**: T014 is a verification task; it depends on T011 being complete.
- **Phase 6 (Docs)**: Depends on all implementation phases being complete.

### Within-Phase Parallelism

**Phase 3** — all tasks can run in parallel EXCEPT T009, which depends on T004–T008:
- T004, T005, T006, T007, T008 are all `[P]` — different files, no shared state.
- T009 (SettingsScreen) should follow after T004 so the profile GET response is known.

**Phase 4** — strict ordering within C2 sub-steps:
- T010 (papergamesImporter) must complete before T011 (endpoints) and T012 (CLI refactor).
- T011 and T012 can run in parallel once T010 is done.
- T013 (UI polling) depends on both T009 (from Phase 3) and T011.

**Phase 6** — T015, T016, T017 are all `[P]` (different doc files).

---

## Parallel Execution Examples

### Phase 3 (US1) — after Phase 2 complete

```text
Parallel batch 1 (all [P]):
  T004 — extend GET /api/user/profile response
  T005 — add PUT /api/user/profile handler
  T006 — register 'settings' in screenRegistry.jsx
  T007 — add /settings to urlMapping.js
  T008 — add gear icon to HomeScreen.jsx

Sequential:
  T009 — create SettingsScreen.jsx (after T004–T008)
```

### Phase 4 (US2) — after Phase 2 complete

```text
Sequential:
  T010 — create papergamesImporter.js

Parallel batch (after T010):
  T011 — register import endpoints in userRoutes.js
  T012 — refactor CLI script (import_papergames_blunders.mjs)

Sequential:
  T013 — wire import polling in SettingsScreen (after T011 + T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (migration).
2. Complete Phase 2 (foundational server changes).
3. Complete Phase 3 (US1 — save Papergames ID + Settings screen).
4. **STOP and VALIDATE**: Test profile save, pre-fill, validation, gear icon navigation.
5. Deploy/demo if ready.

### Incremental Delivery

1. Phase 1 + Phase 2 → DB and server foundation ready.
2. Phase 3 → Settings screen ships (US1 complete, independently testable).
3. Phase 4 → Background import ships (US2 complete; US3 cap enforcement is inline).
4. Phase 5 → Verification of cap behavior.
5. Phase 6 → Documentation complete — feature marked shipped.

---

## Notes

- `[P]` tasks = different files, no cross-task dependencies within the same phase.
- The US3 cap logic is embedded in T011 (POST handler C2b) — not a separate task.
- T002 names all three `loadUser` sites explicitly to prevent the common mistake of patching
  only the main SELECT and missing the insert-reselect or the fallback literal.
- T003's `23505` note is load-bearing: do not add a new catch — the existing one already handles it.
- T010 must NOT write to `users.last_import_at` — that write lives in T011's async done path.
- Stop at any checkpoint to validate the story independently before proceeding.
