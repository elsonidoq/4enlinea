---
name: project-past-games-epics
description: Past Games navigation and blunder category redesign — two epics in docs/mvp/past_games_epics.md; full speckit pipeline complete for Epic A 2026-06-09
metadata: 
  node_type: memory
  type: project
  originSessionId: a92b750d-c217-4da0-bd63-3bfb02181583
---

Two epics defined in `docs/mvp/past_games_epics.md`. **Epic A** (Past Games Navigation) completed the full speckit pipeline (critique→spec→plan→tasks) on 2026-06-09. **Epic B** (Blunder Category Navigation) is defined but not yet specked.

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

**Epic B — Blunder Category Navigation & Two-Way Links (not yet specked)**
- `selCategory`, `selMistake`, `blunderNavList`, `mistakeContext`, `mistakeSource` remain as app-level state for Epic B.
- Mistakes surface redesigned to three levels: `mistakes`→CategoryList, `mistakeDetail`→MistakesList(category), `blunderDetail`→MistakeDetail.
- Depends on Epic A's `game_id` column.

**Why:** The epic originally had several mockup-vs-production mismatches (NAV_GROUPS, mkCols, selGameId app state, client-side blunder write). The pipeline corrected all of them. Future agents should not reintroduce these mockup-only concepts into production.

**How to apply:** For Epic B, start from the updated epic doc + the spec at `specs/027-past-games-navigation/`. Respect the mockup-vs-production gap pattern — verify every mockup concept exists in production before speccing it.
