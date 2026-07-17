---
name: project-papergames-integration
description: "Durable gotchas for papergames import and blunders FK"
metadata: 
  node_type: memory
  type: project
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
---

# Papergames integration — gotchas

## Per-user ownership FIXED (migration 053, spec 041, 2026-07-08)

`papergames_games` is now `UNIQUE(user_id, papergames_room_uid)` and the blunder dedup index is `UNIQUE(user_id, papergames_game_id, move_index)`; `upsertGame`'s `onConflict` is `'user_id,papergames_room_uid'` — do not revert to the old global room-uid key. The old cross-user collision (2nd user importing the same room silently stole the game row / lost all blunders) no longer exists. **Applied locally only** — before prod deploy, re-run the constraint-name pre-flight from `specs/041-past-games-data-integrity/data-model.md` against the production DB (the DROPs use `IF EXISTS` and would silently no-op on a name mismatch).

## `skipped` ≠ duplicates — contract/code mismatch (ACCEPTED, do not "fix" the copy)

The importer has **no duplicate-room detection**: `importForUser`'s `skipped` counts only processing failures (fetch/parse/empty-movestring/solver/upsert errors). A same-user re-import is either re-upserted in place (counted as `imported`) or filtered out entirely by the `lastImportAt` incremental check in `userRoutes.js` before `importForUser` runs. Spec-041's contract § US1.5 wrongly describes `skipped` as "same-user duplicate". Owner decision 2026-07-08: keep the honest UI copy ("N games couldn't be processed and were skipped") and the documented gap in `api-conventions.md`; adding real dedup detection is a possible follow-up, not a bug to silently patch.

## FK separation

`blunders.papergames_game_id` FK is separate from `blunders.game_id` (which links to AI sparring games). Never conflate the two when querying blunders.

## Import script API path bug

In `server/scripts/import_papergames_blunders.mjs`, the game result is at `replayData.game.outcome.winnerAccountId`, NOT `replayData.outcome.winnerAccountId`. The wrong path silently returns `undefined`.

## Bulk insert dedup trap (migration 041 fixed the constraint)

Before migration 041, a single `insert(allBlunders)` per game would silently roll back the entire batch if any row hit a unique constraint on `board_state`. The script swallowed the error and reported success — leaving 0 blunders in the DB while `accuracy` on the game row appeared correct. If blunder counts look wrong but accuracy looks right, suspect a dedup rollback.


---

## (merged from `project_papergames_live_game_integration` — Play Online live games: guest play + room-UID import (real-account shelved); useBoardState; save-live-game endpoint; known bugs)

# Papergames live-game integration (PlayOnlineScreen)

## Product decision (locked)
Online games are played as an **anonymous papergames guest**. The finished game is imported into OUR DB by **room UID** (public `GET /api/room/{uid}/replay`, no auth) — same value captured from the `room:join-auto` WS event. This gives full in-app value (review, coach, blunders) with zero credentials.
**Real-account play (game showing on the user's papergames.io profile) was investigated and shelved** — a guest game cannot be re-attributed to a real account, and real-account play is blocked by reCAPTCHA + the web cross-origin sandbox. See `reference-papergames-auth` (merged into this file).

## Key architectural notes
- Endpoint `POST /api/user/papergames/save-live-game` lives in **`server/userRoutes.js`** (not `index.js`) next to the other `/api/user/papergames/*` routes. Body `{ roomUid, papergamesAccountId }`.
- Solver teardown in `papergamesImporter.js` uses `solver.destroy()`, NOT `.kill()`.
- `boardApiRef` "latest ref" pattern used in `PlayOnlineScreen.jsx` so the once-built `ws.onmessage` closure isn't stale (`start` deps are `[]`).
- A DEBUG-ONLY "Open room on papergames" link (uses `roomUid`) is rendered in `PlayOnlineScreen.jsx` — must be hidden before launch.

## Known/suspected bugs
1. **Second-player win/loss inversion**: `handleColumnClick` uses `won ? (userColor==='red'?'win':'loss') : 'draw'` — wrong when `side==='second'` (userColor `yellow`). Impl wrongly assumes "our player is always red". DB `result` is computed server-side from replay, so this corrupts on-screen status + analytics, not the stored row.
2. **Identity mismatch (verify first)**: `gameRef.ourUserId` is set at `user:connect` then overwritten at `game:start` (`currentPlayer.id`), and sent as `papergamesAccountId`. Server `getUserSide/getOpponent/getResult` match it against replay `actions[].userId`/`players[].accountId` — confirm these are equal for a guest, else side/blunders/opponent are wrong.
3. Replay availability/timing for a just-finished room (may 404/partial).
4. Resign: `game:resign` event name is a guess; `handleResign` calls `saveAndReview` directly while `game:finish` may also fire (`savedRef` single-save guard should dedupe — verify).


---

## (merged from `reference_papergames_auth` — papergames.io auth API: login needs reCAPTCHA (blocks server-side login); refresh works without it; token lifetimes)

# Papergames.io authentication API (reverse-engineered 2026-06-18)

Captured live via Chrome DevTools MCP network inspection during a real login. No secrets stored here.

- **Login**: `POST https://papergames.io/api/authentication/login`, body `{ username: <email>, password }`. **Requires a reCAPTCHA v2 token** sent as `recaptcha: <token>` + `recaptchaversion: v2` headers (site key `6LcerRsrAAAAAH3yoyyl415MZqI9a116JH24dmkt`). Returns `{ access, refresh }` (JWTs) and sets HttpOnly cookies `Authentication`/`Refresh`/`connect.sid`. The reCAPTCHA token is **domain-bound to papergames.io** — cannot be generated from our origin, so **fully server-side automated login is impossible**.
- **Refresh**: `POST https://papergames.io/api/authentication/refresh`, empty body, **no reCAPTCHA** — authenticates purely via the `Refresh` cookie/token. 401 if no valid refresh token.
- **Token lifetimes** (from JWT `exp`): access ≈ **30 min** (`Max-Age=1800`); refresh ≈ **366 days** (`Max-Age≈31.6M`). JWT payload = `{ username, id, iat, exp }` where `id` is the papergames account id.
- **Guest** path (what the app uses today): `POST /api/authentication/guest-registration` → throwaway token; the WS handshake frame is `40{"token":"<token>"}` (same for guest or real access token).

**Consequence for real-account play**: the only viable path is a one-time human login (solves reCAPTCHA) → capture the long-lived `Refresh` token → server mints access tokens via `/refresh`. In a pure web app the resulting session is unreadable (HttpOnly, cross-origin sandbox), so capture would need a browser extension or desktop/webview. This is why real-account play was **shelved** — see [[project_papergames_integration]].


---

## (merged from `project_spec038_papergames_self_service_import` — Spec 038 — Papergames Self-Service Import: loadUser trap for new columns)

# Spec 038 — Papergames Self-Service Import

## loadUser trap

`index.js` has **two** SELECT projections for the `users` row (normal path and insert-reselect for brand-new users) plus a fallback literal. All three must be extended whenever new columns are added to `users` — missing any one leaves the field as `undefined` on that code path. Affected columns added by this spec: `papergames_id`, `last_import_at`.
