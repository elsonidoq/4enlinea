---
name: project-papergames-integration
description: "Durable gotchas for papergames import and blunders FK"
metadata: 
  node_type: memory
  type: project
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
---

# Papergames integration — gotchas

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
**Real-account play (game showing on the user's papergames.io profile) was investigated and shelved** — a guest game cannot be re-attributed to a real account, and real-account play is blocked by reCAPTCHA + the web cross-origin sandbox. See [[reference-papergames-auth]].

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
