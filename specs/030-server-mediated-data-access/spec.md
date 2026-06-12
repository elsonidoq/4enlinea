# Feature Specification: Server-Mediated Data Access (Security Hardening)

**Feature Branch**: `030-server-mediated-data-access`
**Created**: 2026-06-12
**Status**: Draft

## Overview

Today, the browser communicates directly with Supabase using the anon key to read and write user data (stats, puzzle attempts, lesson progress, sparring record, challenge sessions, streak). This exposes the database schema and bypasses server-side business logic. This feature moves all data operations behind server endpoints, so the browser never touches the database directly. The Supabase anon key is retained exclusively for authentication (`supabase.auth.*` calls).

---

## User Scenarios & Testing

### User Story 1 — Signed-In User Data Persists Correctly (Priority: P1)

A user signs in and plays several puzzles, completes a challenge session, and views their stats. All progress is saved and reloaded correctly through the server. The user sees no difference in behavior compared to the current direct-Supabase path.

**Why this priority**: Core correctness guarantee. If user data does not persist correctly, all other value is lost.

**Independent Test**: Sign in, solve 3 puzzles, visit the dashboard, sign out, sign in again. Stats, lesson progress, and streak all match what was recorded during the session.

**Acceptance Scenarios**:

1. **Given** a signed-in user solves a puzzle, **When** `recordPuzzleAttempt` is called, **Then** the attempt is stored server-side and appears in the user's stats on the next page load.
2. **Given** a signed-in user completes a challenge session, **When** `saveChallengeSession` is called, **Then** the session is retrievable via `getLastChallengeSession` on any subsequent load.
3. **Given** a signed-in user's streak is active, **When** `recordActivityDay` is called on two consecutive days, **Then** `getStreak` returns `streak_count + 1` and the new `last_active_date`.
4. **Given** a signed-in user saves their sparring record, **When** `saveSparringRecord('win')` is called, **Then** `getSparringRecord` returns the incremented W count.
5. **Given** a signed-in user saves lesson progress, **When** `saveLessonProgress(id, 'complete')` is called, **Then** `getLessonProgress` returns that lesson as `complete`.

---

### User Story 2 — Anonymous-to-Signed-In Data Migration (Priority: P1)

A user plays as an anonymous user (data in IndexedDB), then signs in for the first time. All anonymous data — puzzle attempts, lesson progress, session stats, sparring record, and streak — is migrated to the server in a single atomic step. After migration, the user's signed-in experience reflects their full history.

**Why this priority**: Migration is the critical handoff between anonymous and authenticated modes. Data loss here is permanently unrecoverable.

**Independent Test**: Play 5 puzzles anonymously, record a win in sparring, complete a lesson, sign in. Verify the dashboard shows all 5 puzzle attempts, the lesson as complete, the sparring win, and a non-zero streak.

**Acceptance Scenarios**:

1. **Given** a user has anonymous data in IndexedDB (puzzle attempts, lesson progress, session stats, sparring record, streak), **When** they sign in and `migrateToSupabase` is called, **Then** all 5 data types are transferred to the server and IndexedDB is cleared.
2. **Given** a migration request is received by the server, **When** the request body includes `puzzle_attempts`, `session_stats`, `lesson_progress`, `sparring_record`, and `streak`, **Then** all are written to their respective server-side storage locations.
3. **Given** a migration call fails mid-flight (server error), **When** the failure is detected, **Then** IndexedDB data is NOT cleared (no partial migration).

---

### User Story 3 — Security: No Direct Database Access from Browser (Priority: P1)

After this feature ships, the browser makes zero direct Supabase data calls. A security scan of the client code finds no `.from(...)` or `.rpc(...)` calls outside of `supabase.auth.*`.

**Why this priority**: This is the primary security objective of the epic. Without it, the feature has not shipped.

**Independent Test**: Run `rg "\.from\(|\.rpc\(" src/` — output must be empty outside `supabase.auth.*` usage.

**Acceptance Scenarios**:

1. **Given** the feature is deployed, **When** `rg "\.from\(|\.rpc\(" src/` is run, **Then** zero hits appear outside of `supabase.auth.*` lines.
2. **Given** a client-side request is made with a tampered user ID, **When** the server processes it, **Then** the server enforces `user_id = req.user.id` regardless of the request body and returns the requesting user's data only.
3. **Given** a request arrives at any `/api/user/*` endpoint without a valid `Authorization: Bearer <token>` header, **When** the server processes it, **Then** it returns `401 Unauthorized`.

---

### User Story 4 — Vulnerability Scan Passes (Priority: P2)

The project passes an npm dependency audit and a manual security review of the new server code. No high or critical findings remain unresolved.

**Why this priority**: The scan outcome is a formal acceptance gate. Moderate findings may exist; they are tracked as issues but do not block shipping.

**Independent Test**: Run `npm audit --omit=dev` in `connect-four/`. No high or critical findings in production dependencies. Run `/security-review` over the new endpoint diff and resolve all high/critical findings.

**Acceptance Scenarios**:

1. **Given** the feature diff, **When** `/security-review` is run over new server endpoints, **Then** all high and critical findings are documented and resolved before merge.
2. **Given** `npm audit --omit=dev` is run, **When** production-only findings are evaluated, **Then** no high or critical vulnerabilities remain unaddressed.
3. **Given** moderate or dev-only critical findings exist, **When** they are found, **Then** they are logged as GitHub issues and do not block the merge.

---

### Edge Cases

- **Session token absent at fetch time**: If `supabase.auth.getSession()` returns no token inside a `SupabaseStore` method, the method must return the same default value as today (e.g., `getProfile()` returns `{ device_uuid: null, tier: 'free', ... }`). It must not throw.
- **Same-day double write to session_stats**: If `saveSessionStats` and `saveChallengeSession` are both called for the same `(user_id, date)`, the last write wins (full-replace upsert). This matches current production behavior and is the accepted trade-off; no merge is attempted.
- **Migration with empty IndexedDB**: If any of the 5 data types is empty (e.g., no puzzle attempts), the migration endpoint accepts and no-ops for that type without error.
- **Migration with a duplicate puzzle attempt**: If `puzzle_attempts` contains a record already on the server, the insert must not fail. Use `ignoreDuplicates: true` or equivalent.
- **recordActivityDay called twice on the same day**: Must be a no-op; streak_count must not increment twice.
- **getLastChallengeSession with no rows**: Must return `null`, not throw.

---

## Requirements

### Functional Requirements

**Server endpoints — all `/api/user/*`**

- **FR-001**: The server MUST expose `GET /api/user/profile` returning `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }` for the authenticated user.
- **FR-002**: The server MUST expose `GET /api/user/session-stats?date=YYYY-MM-DD` returning the full row `{ user_id, date, stats }` for the matching `(user_id, date)` row, or `null` if no row exists. (Returning only the inner `stats` object would break `SupabaseStore.getSessionStats`, whose caller reads `prev.stats` from the returned value.)
- **FR-003**: The server MUST expose `POST /api/user/session-stats` accepting `{ date, stats: {...} }` and upserting into `session_stats` with a full-replace of the `stats` column on conflict `(user_id, date)`. The server stores **`req.body.stats`** (the inner stats object) as the `stats` jsonb column — not the whole body. Storing the whole body would double-nest it as `{ date, stats: {...} }`. Last writer wins. Returns 204.
- **FR-004**: The server MUST expose `GET /api/user/session-stats/all` returning `{ rows: [...], byPattern: { [slug]: { accuracy, attempted } } }` — the same shape currently computed by `getAllSessionStats()`.
- **FR-005**: The server MUST expose `POST /api/user/puzzle-attempts` accepting `{ puzzle_id, moves_tried, outcome, first_attempt_correct, time_ms }` and inserting a row into `puzzle_attempts` with `user_id = req.user.id`, `device_uuid = req.user.device_uuid` (sourced from `req.user`, never from the request body), and `created_at` set server-side. Returns 204.
- **FR-006**: The server MUST expose `GET /api/user/lesson-progress` returning `Array<{ lessonId, status: 'complete'|'incomplete' }>`.
- **FR-007**: The server MUST expose `POST /api/user/lesson-progress` accepting `{ lessonId, status }` and upserting into `lesson_progress` on conflict `(user_id, lesson_id)`. Only `status = 'complete'` is accepted; any other value MUST return `400 { "error": "status must be 'complete'" }`. Returns 204 on success.
- **FR-008**: The server MUST expose `GET /api/user/sparring-record` returning `{ W, L, D }` from `users.sparring_record` for the authenticated user.
- **FR-009**: The server MUST expose `POST /api/user/sparring-record` accepting `{ result: 'win'|'loss'|'draw' }` and incrementing the corresponding counter in `users.sparring_record` via read-then-write. Returns 204.
- **FR-010**: The server MUST expose `GET /api/user/challenge-session` returning the `stats` jsonb from the most-recent `session_stats` row by date descending, or `null` if none.
- **FR-011**: The server MUST expose `POST /api/user/challenge-session` accepting `{ date, ...sessionFields }` and upserting into `session_stats` with a full-replace of the `stats` column on conflict `(user_id, date)`. Last writer wins. Returns 204.
- **FR-012**: The server MUST expose `GET /api/user/streak` returning `{ streak_count, last_active_date }` from the `users` table.
- **FR-013**: The server MUST expose `POST /api/user/streak/record-day` accepting an empty body `{}`. Logic: if `last_active_date` is today → no-op; if yesterday → increment `streak_count` by 1; otherwise → reset to 1. Updates `streak_count` and `last_active_date` on the `users` row. Returns 204.
- **FR-014**: The server MUST expose `POST /api/user/migrate` accepting `{ puzzle_attempts: [...], session_stats: [...], lesson_progress: [...], sparring_record: { W, L, D }, streak: { streak_count, last_active_date } }` and writing all 5 data types server-side. Returns 204 only after all writes succeed; returns 500 on any failure. IndexedDB is **not** cleared on failure; all 5 write operations are idempotent so a retry will converge to a complete migration. Write-target mappings:
  - `puzzle_attempts` → bulk insert into the `puzzle_attempts` table; set `user_id = req.user.id` and `device_uuid = req.user.device_uuid` on every row (never taken from the request body).
  - `session_stats` → upsert each element as `{ user_id: req.user.id, date: <element.date>, stats: <whole element> }` into the `session_stats` table on conflict `(user_id, date)`.
  - `lesson_progress` → upsert each element into `lesson_progress`; map `lessonId → lesson_id`; set `user_id = req.user.id`; set `completed_at = now()`; only write entries where `status === 'complete'` (skip others silently).
  - `sparring_record` → write `{ W, L, D }` to `users.sparring_record` jsonb column for `req.user.id`.
  - `streak` → write `streak_count` and `last_active_date` to their respective columns on the `users` row for `req.user.id`.

**Server endpoint invariants**

- **FR-015**: Every `/api/user/*` endpoint MUST require authentication — return 401 if `req.user` is null.
- **FR-016**: Every `/api/user/*` endpoint MUST enforce ownership by filtering all queries with `user_id = req.user.id`. No endpoint may read or write another user's data.
- **FR-017**: All endpoints MUST use the service-role Supabase key server-side. The client MUST NOT receive the service-role key.
- **FR-018**: Error responses MUST use the shape `{ "error": "<message>" }` per project API conventions.

**`session_stats` upsert semantics**

- **FR-019**: `POST /api/user/session-stats` and `POST /api/user/challenge-session` MUST both upsert using a **full-replace** of the `stats` column on conflict `(user_id, date)`. Last writer wins. The `||` jsonb merge operator MUST NOT be used — the two endpoints store incompatible shapes and a merge would produce a corrupted hybrid blob. **Asymmetry in what is stored**: `POST /api/user/session-stats` stores `req.body.stats` (the inner stats object) as the `stats` jsonb column; `POST /api/user/challenge-session` stores the entire `req.body` as the `stats` jsonb column. The callers send different shapes so different extraction is required.

**`SupabaseStore` rewrite**

- **FR-020**: Every `SupabaseStore` method that currently calls `.from(...)` on `this._supabase` MUST be rewritten to call the corresponding `/api/user/*` endpoint with `Authorization: Bearer <token>` (token from `this._supabase.auth.getSession()`).
- **FR-021**: `SupabaseStore.getStats()` MUST NOT be changed — it already calls `GET /api/stats` via fetch.
- **FR-022**: The public method signatures of `SupabaseStore` MUST NOT change. Return shapes must match existing contracts exactly.
- **FR-023**: `SupabaseStore.migrateToSupabase()` MUST continue to throw `Error('migrateToSupabase called on SupabaseStore — use IndexedDBStore')`.

**`IndexedDBStore.migrateToSupabase` rewrite**

- **FR-024**: `IndexedDBStore.migrateToSupabase(supabaseStore, supabaseClient)` MUST be rewritten to read all 5 data types from IndexedDB, POST them to `POST /api/user/migrate` in a single request, and — only on success — clear all 5 IndexedDB stores.
- **FR-025**: The method signature `migrateToSupabase(supabaseStore, supabaseClient)` MUST be preserved.
- **FR-026**: On migration failure (server error), IndexedDB MUST NOT be cleared. The method should throw to signal failure to `ProfileStore`.

**Vulnerability scan**

- **FR-027**: `npm audit --omit=dev` MUST return zero high or critical findings in production dependencies before merge. Dev-only criticals are tracked as GitHub issues, not a merge blocker. "Accept-with-issue" is valid only for dev-only dependencies and moderate-severity findings. Production high/critical CVEs with no available patch must be resolved by removing or replacing the dependency — not by accepting with an issue.
- **FR-028**: The `/security-review` skill MUST be run over the new server endpoint diff. All high and critical findings MUST be resolved before merge. Moderate findings are tracked as GitHub issues.
- **FR-029**: A written vulnerability scan report MUST exist in `specs/030-server-mediated-data-access/security-report.md` before the feature is considered complete.

**RLS posture**

- **FR-030**: No new RLS policies are required. The service-role key bypasses RLS. Existing RLS policies remain as defense-in-depth. `docs/architecture/db-schema.md` MUST receive a new "Security posture" section documenting this arrangement.

### Key Entities

- **session_stats row**: Keyed by `(user_id, date)`. Contains a single `stats` jsonb column. Both `POST /api/user/session-stats` and `POST /api/user/challenge-session` write the full `stats` column as a full-replace upsert. Last writer wins on the same day; this matches current production behavior.
- **users row**: Stores `sparring_record` (jsonb `{ W, L, D }`), `streak_count` (integer), and `last_active_date` (date). These are per-user singleton values updated in place.
- **puzzle_attempts row**: Append-only. Each `recordPuzzleAttempt` call inserts a new row; no upsert or deduplication for regular puzzle play (deduplication only applies to game-blunder-linked attempts added separately).
- **lesson_progress row**: Keyed by `(user_id, lesson_id)`. Upserted on save.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: After the feature ships, `rg "\.from\(|\.rpc\(" src/` produces zero results outside of `supabase.auth.*` call sites.
- **SC-002**: A signed-in user's complete history (stats, attempts, lessons, sparring, streak) survives a server restart and a browser refresh — no data loss compared to the pre-refactor behavior.
- **SC-003**: Anonymous-to-signed-in migration transfers all 5 data types without data loss in 100% of test runs with non-empty IndexedDB state.
- **SC-004**: The vulnerability scan produces zero unresolved high or critical findings before merge.
- **SC-005**: All 14 new `/api/user/*` endpoints respond correctly to the happy-path and 401 scenarios as verified by the test helpers described in the plan.

---

## Assumptions

- The `loadUser` middleware is already globally registered in `server/index.js`; no changes to middleware registration are required.
- `supabase.auth.getSession()` is always available inside `SupabaseStore` — it was already used in `getStats()`.
- The `session_stats` table has exactly 3 columns (`user_id`, `date`, `stats jsonb`); no migration is needed to change the schema.
- The `users` table already has `sparring_record` (jsonb), `streak_count` (integer), and `last_active_date` (date) columns; no migration is needed.
- The `lesson_progress` table uses `lesson_id` as the column name server-side; `SupabaseStore` maps it to `lessonId` in the returned object (as today).
- Race conditions on `saveSparringRecord` and `recordActivityDay` are acceptable: these are per-user, single-player counters, and concurrent writes from the same user are not a realistic scenario.
- The Supabase service-role key is available in the server environment as `SUPABASE_SERVICE_ROLE_KEY` (already present per `server-conventions.md`).
- Anonymous-mode operations (IndexedDB reads/writes while not signed in) are out of scope — `IndexedDBStore` methods not involved in migration are unchanged.
- No new database tables or columns are required for this feature.
- The `getStats()` method in `SupabaseStore` already calls `GET /api/stats` via fetch and requires no changes.
