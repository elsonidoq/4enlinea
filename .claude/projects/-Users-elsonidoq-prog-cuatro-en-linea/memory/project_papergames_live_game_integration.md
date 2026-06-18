---
name: project-papergames-live-game-integration
description: "Play Online live games: guest play + room-UID import (real-account shelved); useBoardState; save-live-game endpoint; known bugs"
metadata:
  node_type: memory
  type: project
---

# Papergames live-game integration (PlayOnlineScreen) — 2026-06-18

Plan: `docs/mvp/papergames_play_game_integration.md`. Implemented in 2 batches (T0–T7), **uncommitted** on branch `stagging`. Builds on [[project-papergames-integration]].

## Product decision (locked)
Online games are played as an **anonymous papergames guest**. The finished game is imported into OUR DB by **room UID** (public `GET /api/room/{uid}/replay`, no auth) — same value captured from the `room:join-auto` WS event. This gives full in-app value (review, coach, blunders) with zero credentials.
**Real-account play (game showing on the user's papergames.io profile) was investigated and shelved** — a guest game cannot be re-attributed to a real account, and real-account play is blocked by reCAPTCHA + the web cross-origin sandbox. See [[reference-papergames-auth]].

## Implementation
- `src/lib/useBoardState.js` (new) — pure board mechanics; `commitMove` returns `{won,draw,row,color}`, no `onGameEnd`. `useGameBoard` refactored onto it (public API unchanged).
- `src/screens/PlayOnlineScreen.jsx` — production `Board` + GameScreen layout; `boardApiRef` "latest ref" pattern carries `{commitMove,heights,gameOver,moveHistory,saveAndReview}` so the once-built `ws.onmessage` closure isn't stale (`start` deps are `[]`; WS handlers call `boardApiRef.current.saveAndReview`). `savedRef` single-save guard; anonymous 401 → `showLoginPrompt`; "Play again" shown when game over. A **DEBUG-ONLY** "Open room on papergames" link (uses `roomUid`) is rendered for debugging — hide before launch.
- `server/papergamesImporter.js` — `saveLiveGame()` (row only, fast) + `extractAndSaveBlunders()` (fire-and-forget; solver torn down with `solver.destroy()`, NOT `.kill()`). Both reuse existing private helpers.
- Endpoint `POST /api/user/papergames/save-live-game` lives in **`server/userRoutes.js`** (the plan wrongly said `index.js`) next to the other `/api/user/papergames/*` routes. Body `{ roomUid, papergamesAccountId }`; `papergamesAccountId` = the guest socket id (`gameRef.ourUserId`), sent from client.

## Known/suspected bugs (handed to a debug agent)
1. **Second-player win/loss inversion**: `handleColumnClick` uses `won ? (userColor==='red'?'win':'loss') : 'draw'` — wrong when `side==='second'` (userColor `yellow`). Impl wrongly assumes "our player is always red". DB `result` is computed server-side from replay, so this corrupts on-screen status + analytics, not the stored row.
2. **Identity mismatch (verify first)**: `gameRef.ourUserId` is set at `user:connect` then overwritten at `game:start` (`currentPlayer.id`), and sent as `papergamesAccountId`. Server `getUserSide/getOpponent/getResult` match it against replay `actions[].userId`/`players[].accountId` — confirm these are equal for a guest, else side/blunders/opponent are wrong.
3. Replay availability/timing for a just-finished room (may 404/partial).
4. Resign: `game:resign` event name is a guess; `handleResign` calls `saveAndReview` directly while `game:finish` may also fire (savedRef should dedupe — verify).

## Status
Tests at baseline (480/481; the 1 fail is pre-existing classifier). Touched files lint-clean. T7 docs updated (see api-conventions + frontend-conventions). Browser QA not yet run.
