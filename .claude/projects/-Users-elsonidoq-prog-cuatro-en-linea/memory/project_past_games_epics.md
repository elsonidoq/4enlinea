---
name: project-past-games-epics
description: Past Games navigation and blunder category redesign — two epics in docs/mvp/past_games_epics.md; full speckit pipeline complete for both Epic A (2026-06-09) and Epic B (2026-06-10)
metadata: 
  node_type: memory
  type: project
  originSessionId: a92b750d-c217-4da0-bd63-3bfb02181583
---

Two epics defined in `docs/mvp/past_games_epics.md`. **Epic A** (Past Games Navigation) and **Epic B** (Blunder Category Navigation) have both completed the full speckit pipeline (critique→spec→plan→tasks).

**Locked decisions from Epic A pipeline (do not re-open):**
- Game ID passed via navigation param: `go('review', { id: g.id })`. PostGameReview reads `props.id`. No `selGameId` app-level state. [[project_past_games_epics]]
- `accuracy` stored at game-end: client computes from solver scores, sends in `POST /api/games`. Stored in `games.accuracy real` column. No solver at list time.
- `cols` encoding: `g` = first player at **even** 0-based indices, `d` = second player at odd indices. Matches `boardSpecToBoard` in `src/lib/board.js`. The spec originally had this inverted (odd=first) — corrected during plan critique.
- `colsToBoard` utility created in `src/lib/board.js`: converts the API's `cols` array (7 g/d strings) into a 2D `board[row][col]` array for the Board component. `mkCols` does NOT exist in production (mockup-only).
- Blunder writes are already server-side in `POST /api/games/analyze` via `insertGameBlunder`. Zero `POST /api/blunders` calls exist in the frontend. Epic A adds `game_id` to the existing insert; no client-side removal needed. `POST /api/blunders` stays for puzzle blunders only.
- `gamesVariant` is internal component state (derived from auth + fetch), NOT app-level. Production has no app-level variant infrastructure. Matches `MistakesListScreen` pattern.
- `NAV_GROUPS` constant does NOT exist in production `App.jsx` — it's mockup-only. Production screen grouping uses SCREENS + URL_MAP + SURFACE_BG registries.
- `pastGames` is NOT in `SESSION_ONLY_SCREENS` — survives cold URL boots. Fetches own data on mount.
- Anonymous games not surfaced in `GET /api/games` — intentional MVP cut, no `device_uuid` fallback.
- `gameDate` field added to `POST /api/games/analyze` response but NOT persisted in Epic A state. Left for Epic B.
- Draw outcome chip: neutral gray (`.draw` variant on `.outcome-chip`).
- CTA button on signed-out gate opens AuthModal (same pattern as other gated screens).

**Epic A spec directory:** `specs/027-past-games-navigation/` — spec.md, plan.md, tasks.md (19 tasks).

**DB migration (Epic A):** `036_past_games_schema.sql` — `blunders.game_id uuid FK games ON DELETE SET NULL` + partial index + `games.accuracy real`.

**Epic A spec directory:** `specs/027-past-games-navigation/` — spec.md, plan.md, tasks.md (19 tasks).

**Epic B spec directory:** `specs/028-blunder-category-nav/` — spec.md, plan.md, tasks.md (16 tasks). **FULLY IMPLEMENTED** on `101-new-design` (2026-06-10), all 16 tasks done.

**Locked decisions from Epic B pipeline:**
- `selCategory`, `selMistake`, `blunderNavList`, `mistakeContext`, `mistakeSource` are **navigation params**, NOT app-level state. Production Navigator holds only `screen + params`; nav context flows through `go(key, params)` spread as direct screen props.
- Mistakes surface three levels: `mistakes`→`CategoryListScreen` (new), `mistakeDetail`→`MistakesListScreen` (refactored, requires `category` prop), `blunderDetail`→`MistakeDetailScreen` (refactored, new nav param shape).
- `blunderDetail` is `SESSION_ONLY_SCREENS` — cold-boot redirects to home. URL is `/blunder` with no params.
- `GET /api/coach/queue` extended with `?game_id=` and `?category=` optional filters; `moveIndex` (`board_state.length`) added to response.
- `displayMoveNumber = board_state.length + 1` (1-indexed, preserving current behavior). Raw `board_state.length` is the internal join key only.
- Timeline-to-blunder match: `globalPlyIndex = 2*(move.moveIndex-1)` for side='first', `2*(move.moveIndex-1)+1` for side='second'. Match blunder where `board_state.length === globalPlyIndex`.
- `navigateToMistake(moveIndex)` in ReviewScreen takes a **number** (user-move ordinal). Since the 2026-06-21 unification, it routes ALL non-optimal moves to `blunderDetail` via globalPlyIndex match — no Explorer fallback. See [[reference-review-screen-navigate-to-mistake]].
- US1 (screen registry repoint) + US2 (blunder card tap rewrite) must ship atomically.
- Null-category flat-list view is OUT OF SCOPE per Epic B. `MistakesListScreen` requires `category` prop.
- `SeverityMeter` extracted to `src/components/SeverityMeter.jsx`; `MistakesGate` extracted to `src/components/MistakesGate.jsx`.

**Why:** The epic originally had several mockup-vs-production mismatches (NAV_GROUPS, app-level state, fake severity scale, missing endpoint extensions). The pipeline corrected all of them.

**How to apply:** Use these locked decisions during implementation. The `navigateToMistake` signature and the `globalPlyIndex` formula are the two most likely areas to get wrong without this context.
