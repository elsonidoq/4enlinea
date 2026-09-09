---
name: project-papergames-integration
description: "OWNER: live Play-Online was just a test — do NOT work on it or OI-175 (driving it hits real opponents); the IMPORT path is separate and in scope; plus import/blunders FK gotchas"
metadata: 
  node_type: memory
  type: project
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
  modified: 2026-08-01T23:41:22.606Z
---

# Papergames integration — gotchas

## Per-user ownership FIXED (migration 053, spec 041, 2026-07-08)

`papergames_games` is now `UNIQUE(user_id, papergames_room_uid)` and the blunder dedup index is `UNIQUE(user_id, papergames_game_id, move_index)`; `upsertGame`'s `onConflict` is `'user_id,papergames_room_uid'` — do not revert to the old global room-uid key. The old cross-user collision (2nd user importing the same room silently stole the game row / lost all blunders) no longer exists. **Applied locally only** — before prod deploy, re-run the constraint-name pre-flight from `specs/041-past-games-data-integrity/data-model.md` against the production DB (the DROPs use `IF EXISTS` and would silently no-op on a name mismatch).

## `skipped` ≠ duplicates — contract/code mismatch (ACCEPTED, do not "fix" the copy)

The importer has **no duplicate-room detection**: `importForUser`'s `skipped` counts only processing failures (fetch/parse/empty-movestring/solver/upsert errors). A same-user re-import is either re-upserted in place (counted as `imported`) or filtered out entirely by the `lastImportAt` incremental check in `userRoutes.js` before `importForUser` runs. Spec-041's contract § US1.5 wrongly describes `skipped` as "same-user duplicate". Owner decision 2026-07-08: keep the honest UI copy ("N games couldn't be processed and were skipped") and the documented gap in `api-conventions.md`; adding real dedup detection is a possible follow-up, not a bug to silently patch.

## 100% accuracy on a LOST game is a clock artifact, not a resignation one

Measured over 342 imported games (2026-08-01), of 160 losses: `finish_reason='winner'` (decided on the
board) n=144, **max accuracy 94%**; `'resignation'` n=4, **max 89%**; `'time-up'` n=12, of which
**7 sit at exactly 100%**. Every perfect-accuracy loss is a clock loss, and all 7 are tiny games —
1–6 user moves.

**Why this is a trap:** OI-37, `agentic_QA_2026-07-15-1321.md`, and Epic 7's original text all frame
this as "played optimally, then **resigned** → 100% beside a loss." The Papergames data refutes that
framing — but only for imported games. The **in-app sparring resign path was never measured**, and the
QA file carries an explicit repro for it, so "it's just timeouts" is a bounded claim, not a general
one. Don't promote it to a settled fact for the in-app path.

Owner decision 2026-08-01: **do nothing about the short-game badges** — no minimum-move threshold, no
suppression rule. A threshold of 7 user moves would have caught all 7 cases but suppressed the badge on
48/342 games (14%), and genuinely-earned 100% scores exist at 13, 17, and 18 moves. The regression risk
outweighed a narrow cosmetic case. See `docs/architecture/data-model.md` §papergames_games for the
`finish_reason` enum and the "full-board draws carry `finish_reason='winner'`" trap.

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

---

## OWNER DIRECTIVE 2026-09-09 — live Play-Online is NOT a product. Do not work on it.

**Trigger: any task that touches `PlayOnlineScreen.jsx`, live papergames rooms, guest registration,
or OI-175.**

Owner, 2026-09-09, unprompted, on being told an agent was investigating a live-resign bug:
*"are you testing the integration with papergames to play with another person in our app? that was
just a test, do not work on it."*

So the **live Play-Online surface is an abandoned experiment**, not a feature. `docs/open_issues.md`
still carries **OI-175** (a live resign 500s and silently drops the finished game) and it reads like
ordinary launch-blocking work — **it is not**. It is left open, not closed, because the defect is
real; it is simply not work anyone should do until the owner says otherwise.

**The papergames IMPORT path is a different feature and is still in scope** — importing the owner's
own past games (reached from the onboarding import offer) feeds Past Games and Stats. Do not
conflate the two.

**Cost of ignoring this**: investigating OI-175 requires *live* games. An agent doing so created two
papergames GUEST accounts and, because the public matchmaker pairs you with whoever is queuing,
entered **two live matches against real human opponents**, which were then abandoned mid-play when
the agent was stopped. Driving this surface has real-world side effects on strangers.

Findings already banked in OI-175's entry so nobody re-derives them: `roomUid` IS the right
identifier (other rooms return 200), it is NOT a publishing race (still 404 after 24h), the room
itself is deleted rather than the replay missing, and guest rooms ARE publicly visible while live.
