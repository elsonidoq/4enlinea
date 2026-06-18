# Implementation Plan: Papergames Self-Service Import

**Branch**: `038-papergames-self-service-import` | **Date**: 2026-06-17 | **Spec**: `specs/038-papergames-self-service-import/spec.md`  
**Input**: Feature specification from `/specs/038-papergames-self-service-import/spec.md`

---

## Summary

Allow signed-in users to save their Papergames hex account ID to their profile and trigger a
background import of their recent Connect 4 games. The import fetches from papergames.io, runs
solver analysis, writes `papergames_games` rows (upsert) and `blunders` rows (idempotent via
unique index), and streams job status back to the client via a polling endpoint. A new
`SettingsScreen` hosts the ID input and the Import button. The feature reuses existing
infrastructure: `createSolverProcess()` (factory, not singleton), `insertGameBlunder()` (extended
with `move_index`), and `userRoutes.js` (two new endpoints + one extended GET).

---

## Technical Context

**Language/Version**: Node 20.10+ (server), React 18 (frontend)  
**Primary Dependencies**: Express 5, Supabase service-role client, c4solver binary (existing)  
**Storage**: Supabase PostgreSQL (via service-role key); in-memory `Map` for job state  
**Testing**: `node --test` for server helpers; manual golden-path for UI flows (constitution §III)  
**Target Platform**: Railway (Node), browser (React SPA)  
**Project Type**: web-service + SPA  
**Performance Goals**: 202 response within 200 ms of POST (constitution §V); import runs async  
**Constraints**: free-tier cap = 15 lifetime imports; paid = 50 per run; server restart resets job Map  
**Scale/Scope**: ~3 new server endpoints, 1 new frontend screen, 2 DB migrations

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] Import uses the existing solver + `tagBlunder()` + `computeBlunderSeverity()` pipeline.
  No independent blunder evaluation is introduced.

**Principle II — Code Quality & Simplicity**:
- [x] `papergamesImporter.js` extracts logic from the existing CLI script — no duplication.
- [x] `createSolverProcess()` is a factory; spawning a dedicated process per job does not
  require new abstractions, just a new call-site.
- [x] In-memory job Map is the simplest approach for MVP; no persistence abstraction added.
- [x] All storage access goes through `supabase` (service role) passed as argument — no direct
  DB access from components.

**Principle III — Testing Standards**:
- [x] `importForUser()` is designed to be unit-testable: it accepts `supabase` and solver
  injection. Golden-path and edge cases must be verified manually before marking tasks complete.
- [x] `PUT /api/user/profile` validation must be tested with valid input, empty string, and
  oversized string before marking the endpoint done.

**Principle IV — UX Consistency & Progressive Disclosure**:
- [x] No evaluative scores are surfaced in the import UI. Progress shows "Imported N games",
  not solver scores.
- [x] Import button locked while in-flight. Status polling is transparent.

**Principle V — Performance Requirements**:
- [x] `POST /api/user/papergames/import` returns 202 immediately, never blocks on solver.
- [x] Dedicated solver child process prevents import from starving interactive solver queries.

**Principle VI — Implementation & Debugging Methodology**:
- [x] Data dependencies pre-mapped: `papergames_id` + `last_import_at` → `users`; solver →
  `blunders`; game upsert → `papergames_games`. Every field traced to its source before coding.
- [x] `createSolverProcess()` verified to be a factory (line 10 of `c4solver-wrapper.js`) —
  it can be instantiated independently per job without sharing the request-path singleton.

**Principle VII — Software Design Philosophy**:
- [x] Explicit flags (`papergames_game_id`, `game_id`) rather than absent-field branching
  (per `feedback_explicit_server_flags.md`).
- [x] One-in-flight guard uses the in-memory Map already being introduced — no new state.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] `docs/architecture/db-schema.md` updated for `users` columns + `blunders.move_index`
  + `papergames_games` table (currently absent from doc, FR-022).
- [x] `docs/architecture/api-conventions.md` updated for the three new endpoints.
- [x] `docs/architecture/server-conventions.md` updated for `insertGameBlunder` extended shape.
- [x] tasks.md will include explicit doc tasks for each of the above.

---

## Project Structure

### Documentation (this feature)

```text
specs/038-papergames-self-service-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── put-user-profile.md
│   ├── post-papergames-import.md
│   └── get-papergames-import-status.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code

```text
connect-four/
├── server/
│   ├── migrations/
│   │   ├── 047_papergames_user_columns.sql   # NEW — users columns + move_index + unique index
│   │   └── (048_ only if 047 grows too large)
│   ├── papergamesImporter.js                 # NEW — importForUser() exported module
│   ├── insertGameBlunder.js                  # MODIFY — populate move_index from board_state.length
│   ├── userRoutes.js                         # MODIFY — PUT /api/user/profile, POST+GET import
│   ├── index.js                              # MODIFY — loadUser SELECT extended (papergames_id, last_import_at)
│   └── scripts/
│       └── import_papergames_blunders.mjs    # MODIFY — thin wrapper over papergamesImporter.js
└── src/
    ├── screens/
    │   └── SettingsScreen.jsx                # NEW
    └── lib/
        ├── screenRegistry.jsx                # MODIFY — register 'settings'
        └── urlMapping.js                     # MODIFY — add /settings entry
    (HomeScreen.jsx MODIFY — add gear icon)
```

---

## Phase 0: Research

All NEEDS CLARIFICATION items were resolved by reading the source before writing this plan.

### Finding 1 — `createSolverProcess()` is a factory, not a singleton

`c4solver-wrapper.js` exports `createSolverProcess()` as a plain function with no module-level
state. The server's singleton (`solver`) is the result of calling it once at startup. Calling it
again inside `importForUser()` spawns a fresh child process with its own stdin/stdout IPC.
The import job calls `.destroy()` in `finally` when done.

**Decision**: `importForUser()` calls `createSolverProcess()` at entry and `.destroy()` in a
`finally` block. No new factory or abstraction needed.

### Finding 2 — `GET /api/user/profile` reads from `req.user`, which comes from `loadUser`

`loadUser` (server/index.js) SELECTs `tier, deep_reveal_count, deep_reveal_reset_at, device_uuid`
from `users`. The profile endpoint returns exactly those four fields. To add `papergames_id` and
`last_import_at` (FR-003), the SELECT in `loadUser` must be extended — both fields will then
be available via `req.user` without any new DB query in the profile handler.

**Decision**: Extend `loadUser` at **all three sites** to include `papergames_id, last_import_at`:
- Line 344 — the normal SELECT for an existing `users` row.
- Line 350 — the insert-then-reselect for a brand-new user row.
- Line 354 — the fallback literal `{ id, tier, deep_reveal_count, ... }` returned when the
  `users` row is absent; both new fields default to `null` here.

Missing any one site leaves `req.user.papergames_id` as `undefined` on the affected code path.
The profile GET handler then adds them to its response.

### Finding 3 — No `PUT /api/user/profile` exists

`userRoutes.js` has only `GET /api/user/profile`. The PUT handler must be added in the same
function as a new `app.put(...)` registration.

**Decision**: Add `app.put('/api/user/profile', ...)` immediately after the GET in `userRoutes.js`.
Validation: non-empty string, max 64 chars → 400 with spec error message. Success → 204.

### Finding 4 — `insertGameBlunder.js` already handles `papergames_game_id`

The function already accepts `row.papergames_game_id` and passes it to the insert. However the
current `.insert()` + `23505` catch pattern only works if a unique index exists. Migration 041
dropped the old `idx_blunders_game_unique` index, and no papergames-specific dedup index exists
yet. The function does not currently populate `move_index` (column does not exist yet).

**Decision**: Migration 047 adds `move_index integer` to `blunders` + the partial unique index
on `(papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`. `insertGameBlunder()`
is modified to set `move_index: row.board_state?.length ?? null`. The existing `23505` catch
handles the idempotent path. No change to the sparring path (sparring rows have
`papergames_game_id = null` so the index's `WHERE` clause excludes them).

### Finding 5 — `import_papergames_blunders.mjs` currently uses raw `.insert()` for blunders

The existing CLI script calls `supabase.from('blunders').insert(toInsert)` directly (bypassing
`insertGameBlunder()`). After the refactor, `importForUser()` must route all blunder writes
through `insertGameBlunder()` so the dedup logic, tag guard, and `move_index` stamping are
centralized.

**Decision**: `papergamesImporter.js` imports and calls `insertGameBlunder()` per blunder, not
a bulk insert. This matches FR-012's requirement.

### Finding 6 — Migration numbering

Latest migration on disk: `046_papergames_games_grants.sql`. Next numbers: **047** (users
columns + blunders `move_index` + unique index). If the SQL grows unwieldy, split into `047` +
`048`. Decision: single file `047_papergames_user_columns.sql` covering all three DDL changes
(two `ALTER TABLE` statements + one `CREATE INDEX`). Keep `048` as a placeholder only.

### Finding 7 — `blunders` table does not have `move_index` column

The schema doc and migration history confirm no `move_index` column. It must be added by
migration 047 as `move_index integer` (nullable — legacy rows and sparring rows have no need
for it; only papergames blunders populate it).

### Finding 8 — `GET /api/games` already merges papergames rows

`GET /api/games` was extended in a prior epic to include `papergames_games` rows in the unified
list. No new endpoint is needed to surface the newly imported games — refreshing the existing
list after a completed import is sufficient (FR-017).

### Finding 9 — `screenRegistry.jsx` adds screen components by key

`src/lib/screenRegistry.jsx` is the canonical map. The `settings` key must be added there and
to `urlMapping.js` as `/settings` (non-session-only, cold-bootable). HomeScreen has a stats
button (line 83-89); the gear icon should sit alongside it.

---

## Phase 1: Design & Contracts

### Data Model (`data-model.md`)

See `specs/038-papergames-self-service-import/data-model.md` (generated alongside this plan).

Summary of changes:

| Table | Change |
|---|---|
| `users` | + `papergames_id text` nullable, + `last_import_at timestamptz` nullable |
| `blunders` | + `move_index integer` nullable; new partial unique index |
| `PapergamesImportJob` | In-memory only (Map). Fields: `jobId`, `userId`, `status`, `imported`, `skipped`, `error`. |

### API Contracts (`contracts/`)

Three new endpoints:

1. **`PUT /api/user/profile`** — save `papergames_id`  
2. **`POST /api/user/papergames/import`** — start background import, return `jobId`  
3. **`GET /api/user/papergames/import/status?jobId=<uuid>`** — poll job state

Full contracts in `specs/038-papergames-self-service-import/contracts/`.

### Implementation Steps (ordered by dependency)

```
Group A — DB Migration (prerequisite for all server changes)
  A1. Migration 047: ALTER TABLE users ADD ...; ALTER TABLE blunders ADD ...; CREATE INDEX ...

Group B — Server: existing code extension (depends on A)
  B1. Extend loadUser in index.js at all three sites (line 344 SELECT, line 350 insert-reselect SELECT, line 354 fallback literal) to include papergames_id, last_import_at
  B2. Extend GET /api/user/profile response (papergames_id, last_import_at)
  B3. Add PUT /api/user/profile in userRoutes.js
  B4. Extend insertGameBlunder() to populate move_index from board_state.length

Group C — New server module (depends on B4)
  C1. Create papergamesImporter.js (importForUser + fetch helpers + extractBlunders)
  C2. Register POST + GET import endpoints in userRoutes.js
      Sub-steps for the POST handler (executed in order before spawning a job):
        C2a. Read papergames_id from req.user (populated by loadUser). If null or empty string,
             return 400 { "error": "no papergames_id configured" } immediately.
        C2b. Query COUNT(*) FROM papergames_games WHERE user_id = req.user.id. Derive gameLimit:
             free tier → Math.max(0, 15 - count); paid tier → IMPORT_GAME_LIMIT (50).
             If gameLimit === 0 (free-tier user at cap), write a job entry with status "done"
             and { imported: 0, skipped: 0 } to the Map and return 202 immediately — do NOT
             call importForUser or spawn a solver (Decision 2: cap check before incremental fetch).
        C2c. One-in-flight guard (existing design): if a pending/running job exists for this
             userId in the Map, return its jobId with 202.
        C2d. Create job entry (status "pending"), spawn importForUser asynchronously, pass
             gameLimit derived in C2b. On successful resolution, update last_import_at to
             new Date().toISOString() via supabase .update() on the users row (Decision 1:
             endpoint owns last_import_at write, importForUser does not touch it).
  C3. Refactor import_papergames_blunders.mjs to delegate to papergamesImporter.js

Group D — Frontend: Settings screen (depends on B)
  D1. Create SettingsScreen.jsx (ID input, Save, Import button, auth gate)
  D2. Register 'settings' in screenRegistry.jsx
  D3. Add /settings to urlMapping.js
  D4. Add gear icon button to HomeScreen.jsx

Group E — Frontend: Import UX (depends on D, C)
  E1. Wire import polling + status display in SettingsScreen

Group F — Documentation
  F1. Update docs/architecture/db-schema.md (papergames_games table, users columns, blunders.move_index)
  F2. Update docs/architecture/api-conventions.md (three new endpoints)
  F3. Update docs/architecture/server-conventions.md (insertGameBlunder extended shape)
```

---

## Complexity Tracking

No constitution violations. All design choices are within established conventions.

---

## Handoff context

### Key architectural decisions

1. **`move_index` column added to `blunders`** (not computed from `board_state.length` in the
   index). This is the spec's intended approach (FR-021b). It is nullable so sparring blunders
   and legacy rows are unaffected. `insertGameBlunder()` computes it as `row.board_state.length`
   at insert time. The unique partial index `WHERE papergames_game_id IS NOT NULL` means the
   sparring path never hits the dedup constraint.

2. **Single migration 047** covers all three DDL changes (users columns + blunders.move_index +
   unique index). Rationale: they must be applied atomically before any server code uses them.
   The spec allows a separate 048; it is not needed unless the migration becomes unwieldy.

3. **`loadUser` extended** to SELECT `papergames_id, last_import_at` from `users`. This is the
   cheapest path: the profile GET already returns from `req.user`, so no extra query is needed
   in the handler. Side-effect: every authenticated request carries these two fields in memory.
   Given they're small scalars, this is acceptable.

4. **`importForUser()` uses `insertGameBlunder()` per row** (not bulk insert). This ensures the
   tag guard, `move_index` stamping, and `23505` dedup catch are centralized. The per-row
   overhead is acceptable: import is background/async and not latency-sensitive for the user.

5. **One-in-flight guard uses an in-memory `Map` keyed by `userId`** (not `jobId`). On a new
   `POST`, the handler iterates the Map to find any entry with `userId === req.user.id` and
   `status` in `{pending, running}`. If found, returns the existing `jobId` with 202. This
   avoids allowing multiple concurrent solver child processes per user.

6. **`papergamesImporter.js` is a pure ESM module** in `connect-four/server/`. It imports
   `createSolverProcess` from `c4solver-wrapper.js`, `insertGameBlunder` from
   `insertGameBlunder.js`, and the analysis helpers from `moveQualityScorer.js` and
   `classifier.js` — all existing files. No new files beyond the module itself are required.

7. **`SettingsScreen` uses inline English strings** (no i18n keys per spec assumption). Future
   i18n can be added without structural changes.

8. **`settings` screen is not SESSION_ONLY**: it is cold-bootable from `/settings`. URL added
   to `urlMapping.js`; screen added to `screenRegistry.jsx`. The gear icon navigates
   authenticated users to `settings`; unauthenticated users see `AuthModal`.

### Non-obvious dependencies / ordering constraints

- **A1 must land in DB before any server code is deployed** that references `papergames_id`,
  `last_import_at`, or `move_index`. In local dev: run `node server/migrate.js` from
  `connect-four/`. On Railway: migration runs before server start automatically.

- **B4 (`insertGameBlunder` extension) must precede C1 (`papergamesImporter.js`)** — the
  importer calls `insertGameBlunder()` and relies on the `move_index` field being populated.
  Without B4, the dedup index would receive `NULL` for all `move_index` values, defeating the
  unique constraint (two NULL values in a unique index are treated as distinct in PostgreSQL —
  so the dedup would never trigger).

- **C1 precedes C3** — the CLI refactor replaces the script's `main()` body with a call to
  `importForUser()`, so the function must exist first.

- **D1+D2+D3+D4 can be done in parallel with B and C** — frontend and server are independent
  until E1 wires the polling logic. E1 must wait for C2 (import endpoints registered).

### Trade-offs and deferrals

- **No persistent job storage**: In-memory Map only. A server restart loses all in-flight job
  records. Subsequent polls for those jobIds return 404. Acceptable for MVP per spec assumption.

- **No rate limit on import endpoint**: The spec does not mention one. The one-in-flight guard
  is the abuse protection. A future hardening pass can add express-rate-limit if needed.

- **`blunders` bulk insert replaced by per-row `insertGameBlunder()` calls**: Slightly slower
  for large imports, but guarantees correctness (tag guard, move_index, dedup) without
  duplicating logic. The background async nature of import means this is not user-facing latency.

- **`last_import_at` is written by the import endpoint, not `importForUser`**: The endpoint
  writes `last_import_at` after `importForUser()` resolves successfully (async done path). If
  a game fetch fails and is skipped, `importForUser` still resolves successfully and
  `last_import_at` is updated; the `skipped` count reflects the skipped game. Only if
  `importForUser` rejects (e.g., unreachable Papergames API) is `last_import_at` left unchanged.
  Keeping the write in the endpoint rather than inside `importForUser` makes the function
  testable without side effects on the `users` table.

### What reviewers should pay close attention to

1. **Migration 047 constraint order**: Add the `move_index` column before creating the index on
   it. Drop nothing — this migration is additive only. See `feedback_migration_constraint_order.md`.

2. **`loadUser` SELECT extension — all three sites**: Confirm `papergames_id` and `last_import_at`
   are added to (a) the line 344 normal SELECT, (b) the line 350 insert-reselect SELECT for new
   users, and (c) the line 354 fallback literal `{ id, tier, deep_reveal_count, ... }` (both
   new fields default to `null` there). Missing any one of the three leaves the field `undefined`
   on that code path, causing silent 400s or runtime errors downstream.

3. **Unique index NULL semantics**: PostgreSQL treats two NULL values as distinct in unique
   indexes. The partial index `WHERE papergames_game_id IS NOT NULL` combined with `move_index`
   being computed from `board_state.length` (which is always an integer for real blunders) means
   the dedup triggers correctly when the same game is re-imported.

4. **`PUT /api/user/profile` uses `.update()` with `eq('id', req.user.id)`** — not `.upsert()`.
   The `users` row is guaranteed to exist (created by `loadUser` on first auth). Using `.update()`
   avoids accidentally overwriting other columns.

5. **One-in-flight guard scans the Map by `userId`** — the Map is keyed by `jobId` for O(1)
   lookups on the status endpoint, but the guard must iterate values to find by `userId`. Given
   the Map will typically be small (one entry per active user), O(n) iteration is acceptable and
   simpler than maintaining a separate user→jobId reverse index.

6. **400 guard for missing `papergames_id` must be the first check** in the POST handler (step
   C2a), before the cap query or the in-flight guard. A null or empty `papergames_id` would
   otherwise be silently forwarded to `importForUser` and then to the Papergames API call,
   producing a nonsensical URL and a misleading error.

7. **Cap check (C2b) must precede incremental-fetch logic** (Decision 2). The gameLimit is
   computed from a COUNT query in the endpoint, not inside `importForUser`. If `gameLimit === 0`
   the handler short-circuits with a synthetic done-job in the Map and returns 202 — no solver
   is spawned and no Papergames API call is made. The `last_import_at` cutoff (incremental
   pagination) is applied later, only inside the actual fetch loop in `importForUser`.

8. **`last_import_at` is written by the import endpoint, not by `importForUser`** (Decision 1).
   After `importForUser()` resolves successfully (on the async background path), the endpoint
   writes `new Date().toISOString()` to `users.last_import_at` via `.update()`. `importForUser`
   itself does not touch `last_import_at` — keeping the function pure and testable in isolation.
   On error/reject the update is skipped, leaving `last_import_at` unchanged (consistent with
   the trade-off described above).
