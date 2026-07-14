---
name: project_games_dont_migrate
description: "Anon sparring games live only server-side (user_id null, no IndexedDB store); SHIPPED 2026-07-13 they re-associate to the account on migrate via device_uuid — but the two anon read-paths still differ"
metadata: 
  node_type: memory
  type: project
  originSessionId: b76d374f-d8ee-4c88-9b58-7d71cf8b1d9a
---

Sparring games are **not** replicated into IndexedDB like challenges/lessons — a finished game is
written **directly to the server** `games` table via `POST /api/games` (`GameScreen.jsx`) for every
user, keyed by `device_uuid`, with `user_id: null` when anonymous. The only local sparring artifact
is the aggregate W/L/D `sparring_record` tally (not per-game rows/moves).

**SHIPPED 2026-07-13 (Feature 3 / onboarding follow-ups): anon games now DO survive sign-up.**
`/api/user/migrate` re-associates them server-side — the client (`migrateToSupabase`) sends its
`device_uuid` in the migrate body, and the endpoint runs
`UPDATE games SET user_id = req.user.id WHERE device_uuid = <body.device_uuid> AND user_id IS NULL`
as one more entry in the atomic `operations[]`. **Non-obvious trap it was built around:** it must
key on the **client's** `body.device_uuid`, NOT the endpoint's locally-derived `deviceUuid` — for a
brand-new user that server value is freshly generated and would never match the anon game rows.
Absent/empty `device_uuid` is a silent no-op. There is still **no `games` object store in
IndexedDB** and the migrate allowlist otherwise unchanged (`puzzle_attempts`, `session_stats`,
`lesson_progress`, `sparring_record`, `streak`, `onboarding_status`). Verified end-to-end
(browser + DB): anon game `user_id: null` → new user id after dev-skip-auth first sign-in, then
appears in Past games. Docs: `api-conventions.md` Migrate Endpoint, `data-model.md` Games. OI-20 CLOSED.

**Still true — the two anon read-paths diverge (do not "unify"):**
- `PastGamesListScreen` reads `GET /api/games`, which **401s anonymous users** and filters
  `.eq('user_id', <signed-in id>)` — so an anon game only appears **after** sign-up (once
  re-associated). This fits the arc: play → review → sign up → it's in your history.
- BUT `POST /api/games/analyze` (the review screen) **deliberately supports** anonymous
  `user_id: null` games (it does not compare `device_uuid` to `req.user.id` — different id
  namespaces; the handler comment warns against re-adding that check). So a just-played anon game
  *can* be reviewed by id while still logged out. This is why the onboarding flow reviews the game
  before sign-up. See [[project_user_column_propagation]] for the profile-column allowlist side.
