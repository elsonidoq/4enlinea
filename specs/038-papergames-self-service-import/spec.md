# Feature Specification: Papergames Self-Service Import

**Feature Branch**: `038-papergames-self-service-import`
**Created**: 2026-06-17
**Status**: Draft

## Overview

A signed-in user can save their Papergames hex account ID to their profile and trigger a one-click import of their recent Connect 4 games from papergames.io. The import runs as a background job, writes game records and blunder records, and surfaces the results in the existing past-games list — giving players access to their real game history for blunder review without leaving the app.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Save Papergames Account ID (Priority: P1)

A signed-in user wants to link their Papergames account to DecodeC4. They tap the gear icon next to the stats button on the home screen and are taken to a new Settings screen. They paste their Papergames hex account ID into an input field and tap Save. The input persists across sessions so they only need to do this once.

**Why this priority**: The account ID is the prerequisite for every other story. Without it, no import can run.

**Independent Test**: Can be fully tested by saving a hex string and reloading the screen — the input is pre-filled on re-open, delivering persistent profile storage.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Settings screen, **When** they type a valid hex account ID (1–64 chars) and tap Save, **Then** the ID is persisted and the input remains pre-filled after a page reload.
2. **Given** a user submitting an empty string, **When** they tap Save, **Then** an inline error appears and no save request is made.
3. **Given** a string longer than 64 characters, **When** the user taps Save, **Then** an inline validation error is shown and the save is rejected.
4. **Given** the settings panel is rendered, **When** the "Find your account ID" link is visible, **Then** tapping it opens `https://papergames.io/en/account` in a new browser tab.

---

### User Story 2 — Import Papergames Games (Priority: P2)

A user with a saved Papergames ID taps the Import button. The app immediately acknowledges the request and shows a progress indicator. In the background, games are fetched from the Papergames API, analyzed with the solver, and stored. When done, the past-games list refreshes to show the newly imported games with papergames metadata (opponent name, opponent avatar, accuracy chip).

**Why this priority**: This is the core value delivery — making a user's real game history visible in the app.

**Independent Test**: Can be fully tested end-to-end: trigger an import, wait for the status to reach "done", and verify that the game list shows the imported rows.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a saved Papergames ID, **When** they tap Import, **Then** the UI shows a spinner/progress state immediately (no blocking wait).
2. **Given** an import is running, **When** the user polls for status, **Then** the response reports `status: "running"` with `imported` and `skipped` counts.
3. **Given** a completed import, **When** the status reaches `"done"`, **Then** the game list is refreshed and newly imported games are visible with opponent metadata and accuracy.
4. **Given** an import where the Papergames API returns an error for one game, **When** that game is skipped, **Then** the job still completes successfully and the `skipped` count reflects the skipped game.
5. **Given** a completed import, **When** the user triggers a second import, **Then** only games newer than the previous import are fetched (incremental); already-stored games are not duplicated.

---

### User Story 3 — Free-Tier Import Cap (Priority: P3)

A free-tier user who has already imported 15 games taps Import again. The job completes immediately with `imported: 0` and an informational message that they have reached their 15-game lifetime cap.

**Why this priority**: Quota enforcement protects the service from abuse; free users still get a usable baseline of 15 games.

**Independent Test**: Can be tested by mocking 15 existing rows for the test user and triggering an import — the job should return `done` with `imported: 0`.

**Acceptance Scenarios**:

1. **Given** a free-tier user with fewer than 15 imported games, **When** they import, **Then** up to `15 − current_count` new games are imported.
2. **Given** a free-tier user who has already imported 15 games, **When** they trigger an import, **Then** the job completes immediately with `imported: 0`, `status: "done"`, and `capReached: true`; the UI displays "You've reached your 15-game limit" (not "Imported 0 games").
3. **Given** a paid-tier user, **When** they import, **Then** up to 50 games per run are processed (no lifetime cap applies).

---

### Edge Cases

- What happens if the Papergames API is unreachable? The job fails with `status: "error"` and an error message; `last_import_at` is not updated.
- What happens if `papergames_id` is cleared after an import has been triggered? The background job runs to completion using the ID that was read at job-start time.
- What happens if the user navigates away while the import is running? The background job continues on the server; the user can return and poll using the same jobId (if retained in session state).
- What happens if a game's movestring contains no user plies (e.g., opponent resigned on move 1)? The game is stored but `accuracy` is null; no blunder rows are created.
- What happens if the job's in-memory state is lost (server restart)? A restart causes all pending jobs to disappear; subsequent polls for those jobIds return 404.

---

## Requirements *(mandatory)*

### Functional Requirements

**Profile storage**

- **FR-001**: The system MUST allow signed-in users to save a Papergames hex account ID to their profile via `PUT /api/user/profile`. The endpoint MUST require authentication (401 if missing), accept a JSON body `{ "papergames_id": "<string>" }`, validate that the value is non-empty and at most 64 characters (400 `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` on failure), persist the value to the `users` row, and respond 204 No Content on success. On DB or upstream failure the endpoint returns 503 or 500.
- **FR-002**: The system MUST reject `papergames_id` values that are empty or exceed 64 characters with an explicit 400 error response (see FR-001).
- **FR-003**: The `GET /api/user/profile` handler (or the `loadUser` middleware it depends on) MUST query `papergames_id` and `last_import_at` from the `users` row and include them in the profile response as `papergames_id` (string or null) and `last_import_at` (ISO timestamp or null) so the frontend can pre-fill the input. The current hard-coded 4-field projection must be extended to include these two columns.

**Profile UI**

- **FR-004**: A gear icon button MUST be added to `HomeScreen` next to the stats button; tapping it navigates to the new `settings` screen. The button MUST be visible to all users (authenticated and anonymous); unauthenticated users who tap it are shown the auth modal instead of the settings screen.
- **FR-005**: A new `settings` screen MUST be registered in `screenRegistry.jsx` (route key `settings`). For this epic it contains only the Papergames section; it is designed to accommodate future settings (e.g. audio) in later epics.
- **FR-006**: The Papergames settings block (ID input, Save button, Import button) on the Settings screen MUST only be rendered for authenticated users; unauthenticated users see a prompt to sign in.
- **FR-006a**: A "Find your account ID" link MUST be rendered next to the input field and MUST open `https://papergames.io/en/account` in a new browser tab.
- **FR-006b**: The input MUST be pre-filled with the user's stored `papergames_id` on screen load.

**Background import**

- **FR-007**: `POST /api/user/papergames/import` MUST return 202 Accepted immediately with a `jobId` and execute the import asynchronously. If a job for the authenticated user is already `pending` or `running` in the in-memory Map, the endpoint MUST return the existing `jobId` with 202 Accepted rather than starting a new job (one-in-flight guard per user).
- **FR-008**: The server MUST read `papergames_id` from the user's DB row (not from the request body) to prevent importing on behalf of other users.
- **FR-009**: The import MUST be incremental: pagination stops when a room's `createdAt` is older than `users.last_import_at`; after a successful run `last_import_at` is updated to the current timestamp.
- **FR-010**: Free-tier users MUST be capped at 15 lifetime imported games. The job processes `max(0, 15 − current_count)` new games. Paid-tier users are limited to 50 games per import run.
- **FR-011**: Re-importing MUST be idempotent: an existing game row (same `papergames_room_uid`) is upserted (not duplicated); existing blunder rows for the same position are silently skipped via the unique index on `blunders(papergames_game_id, move_index)` (see FR-021b).
- **FR-012**: For each imported game, the system MUST compute move-level blunder data (solver accuracy, blunder tag, severity) and write blunder rows to the `blunders` table by calling `insertGameBlunder()` with `papergames_game_id` set and `game_id` null. This preserves dedup guarantees and severity normalization enforced by that function.

**Import status**

- **FR-013**: `GET /api/user/papergames/import/status?jobId=<id>` MUST return the current status (`pending | running | done | error`), `imported` count, `skipped` count, `capReached` boolean (true only when a free-tier user's cap short-circuits the job at C2b; false for all other runs), and an optional `error` string.
- **FR-014**: The status endpoint MUST return 404 for unknown or expired jobIds. It MUST also return 404 (not 403) when `job.userId !== req.user.id` — ownership mismatch is treated identically to not found to avoid leaking job existence.

**Import UI**

- **FR-015**: The Import button MUST be disabled while an import is already running for this session.
- **FR-016**: While the import is running the UI MUST display a progress indicator.
- **FR-017**: When the import completes with `status: "done"`, the UI MUST display the result (e.g., "Imported 7 games") and refresh the game list.
- **FR-018**: When the import fails with `status: "error"`, the UI MUST display the error message and re-enable the Import button.

**Importer module**

- **FR-019**: A new server module `papergamesImporter.js` MUST export `importForUser(supabase, userId, papergamesAccountId, gameLimit, lastImportAt)` returning `{ imported, skipped }`. The function MUST spawn a dedicated short-lived solver child process for the duration of the import job (rather than sharing the request-path singleton) to prevent import analysis from starving interactive users; the process is terminated when `importForUser` resolves or rejects.
- **FR-020**: The existing CLI script (`import_papergames_blunders.mjs`) MUST be updated to import its core logic from `papergamesImporter.js` so no duplicate logic exists.

**DB migration**

- **FR-021**: Migration `047_papergames_user_columns.sql` MUST add `papergames_id text` (nullable, no unique constraint) and `last_import_at timestamptz` (nullable) to the `users` table.
- **FR-021b**: The same migration (or a follow-on `048_blunders_papergames_index.sql`) MUST add a unique index on `blunders(papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`. This index enforces idempotency for re-imports and is the dedup surface used by `insertGameBlunder()` for the papergames path.
- **FR-021c**: `insertGameBlunder()` MUST be extended to accept either `game_id` (UUID, existing sparring path) or `papergames_game_id` (UUID, new import path) — exactly one must be non-null. On conflict with the unique index for the papergames path the function MUST silently skip (upsert no-op).

**Documentation**

- **FR-022**: `docs/architecture/db-schema.md` MUST be updated to document the `papergames_games` table (the table exists but is absent from the doc).

### Key Entities

- **PapergamesImportJob**: Ephemeral server-side record of an in-flight or completed import. Fields: `jobId` (uuid), `userId` (string — the authenticated user's id), `status` (`pending | running | done | error`), `imported` (integer), `skipped` (integer), `capReached` (boolean — true only when a free-tier user's cap short-circuits the job at C2b; false for all other runs), `error` (string or null). Stored in an in-memory Map keyed by `jobId`; not persisted to the DB. `userId` is used by the status endpoint for ownership checks (FR-014) and by the one-in-flight guard (FR-007).
- **PapergamesGame** (`papergames_games` table): A Connect 4 game imported from papergames.io. Unique by `papergames_room_uid`. Linked to `blunders` via `papergames_game_id`.
- **User profile extension**: Two new nullable columns on `users`: `papergames_id text` and `last_import_at timestamptz`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can enter and save their Papergames account ID and see it pre-filled on the next visit without any additional action.
- **SC-002**: Tapping Import shows a response within 1 second; the user is never blocked waiting for the full analysis to complete.
- **SC-003**: After a completed import, the game list shows all newly imported games with opponent metadata (name, avatar, accuracy) within one screen refresh.
- **SC-004**: Triggering an import twice in succession for the same user produces no duplicate game rows in the database.
- **SC-005**: Free-tier users with 15 already-imported games see `imported: 0` on every subsequent import attempt.
- **SC-006**: The existing CLI import script continues to work correctly after the module extraction refactor.

---

## Assumptions

- Users are responsible for finding and copy-pasting their own Papergames hex account ID; no server-side username lookup or validation of the ID format against Papergames is performed at save time.
- The Papergames public API (`/api/profile/:id/rooms` and `/api/room/:uid/replay`) remains publicly accessible without authentication from the server.
- In-memory job state is acceptable for MVP; a server restart clears all in-flight job records (users must retry if this occurs).
- `importForUser` spawns its own dedicated solver child process per job (FR-019); it does not share the server's request-path solver singleton. The spawning mechanism reuses the same binary and IPC protocol as the existing solver wrapper.
- The paid tier import limit of 50 games per run is sufficient for MVP; raising it (or enabling full-history import) requires changing the `IMPORT_GAME_LIMIT` constant in `papergamesImporter.js`.
- No i18n keys are required for the Settings screen for MVP; English strings are embedded directly.
- The `papergames_games` table grants (`GRANT SELECT TO anon, authenticated`) added in migration 046 are sufficient; no new grants are needed for the two new `users` columns (the server uses the service role key).
