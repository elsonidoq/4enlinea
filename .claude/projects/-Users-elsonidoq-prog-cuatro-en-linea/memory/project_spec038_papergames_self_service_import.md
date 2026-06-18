---
name: project-spec038-papergames-self-service-import
description: "Spec 038 — Papergames Self-Service Import: spec/plan/tasks complete at specs/038-papergames-self-service-import/; 17 tasks; key architecture decisions locked"
metadata:
  type: project
---

# Spec 038 — Papergames Self-Service Import (2026-06-17)

**Status**: spec/plan/tasks complete; ready for implementation via `/coordinate-implementation specs/038-papergames-self-service-import`.

## Key architecture decisions (locked)

- **Entry point**: gear icon added to `HomeScreen` next to the stats button → new `settings` screen (route key `settings`). Settings screen designed to also host Epic 10 audio settings.
- **Execution model**: `POST /api/user/papergames/import` returns `202 { jobId }` immediately; client polls `GET /api/user/papergames/import/status?jobId=`. In-memory `Map<jobId, JobState>` on server; lost on restart is acceptable for MVP.
- **Tier caps**: free = 15 lifetime games (counted via `papergames_games WHERE user_id`); paid = `IMPORT_GAME_LIMIT` constant defaulting to 50; set to `Infinity` for full-history.
- **Incremental**: `last_import_at timestamptz` on `users` row; pagination stops when room.createdAt < last_import_at; updated by endpoint (not `importForUser`) after successful resolve.
- **No cooldown**: redundant imports find 0 new rooms and return immediately.
- **Cap short-circuit**: free-tier cap check runs before any Papergames API call; returns `{ status:'done', imported:0, capReached:true }` with 202.
- **Full blunder extraction**: `importForUser()` calls `insertGameBlunder()` per blunder (not bulk); `insertGameBlunder` extended to accept `papergames_game_id` (one of `game_id`/`papergames_game_id` must be non-null).
- **Dedicated solver per import**: import job spawns its own short-lived solver process, not the request-path singleton.
- **One-in-flight guard**: second `POST` for the same user returns existing jobId (202) instead of spawning a new job.

## DB changes (migration 047)

- `users`: add `papergames_id text NULLABLE`, `last_import_at timestamptz NULLABLE`
- `blunders`: add `move_index integer NULLABLE`; partial unique index `(papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`

## New module

`server/papergamesImporter.js` — exports `importForUser(supabase, userId, papergamesAccountId, gameLimit, lastImportAt)`. The existing CLI script `import_papergames_blunders.mjs` is refactored to delegate to this module (it currently has module-level side effects and cannot be imported as-is).

## loadUser trap

`index.js` has **two** SELECT projections for the `users` row (line 344 normal path, line 350 insert-reselect for brand-new users) plus a fallback literal on line 354. All three must be extended with `papergames_id, last_import_at` — missing any one leaves the field as `undefined` on that code path.

## 17 tasks breakdown

- T001: migration 047
- T002: extend loadUser (3 sites)
- T003: extend `insertGameBlunder()` for `papergames_game_id`
- T004–T009: US1 — save Papergames ID (PUT endpoint, GET profile extension, settings screen + gear icon)
- T010: `papergamesImporter.js` module
- T011: POST import endpoint (C2a 400 guard → C2b cap check → C2c in-flight guard → C2d job spawn)
- T012: GET import status endpoint
- T013: UI polling + result display
- T014: US3 cap verification (no code, test-only task)
- T015–T017: docs (db-schema, server-conventions, spec index)
