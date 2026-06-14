# Implementation Plan: Past Games Navigation

**Branch**: `101-new-design` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/027-past-games-navigation/spec.md`

## Summary

Add a "Past Games" entry point on the Home screen and a new `PastGamesList` screen that lets authenticated users browse, filter, and tap into previous sparring games. Introduces `GET /api/games`, the `cols` column-thumbnail format, a `colsToBoard` utility, and a DB migration adding `game_id` to blunders and `accuracy` to games. Extends `POST /api/games/analyze` to write blunders with `game_id` server-side (the existing `insertGameBlunder` call, no client-side removal needed). Epic A of the Past Games & Blunder Navigation epics; does not include Epic B (blunder category navigation, two-way links).

## Technical Context

**Language/Version**: JavaScript (Node.js 20.10+, React 18 JSX via Vite)
**Primary Dependencies**: Express 5, Supabase JS client (`@supabase/supabase-js`), react-i18next, Vite (build)
**Storage**: PostgreSQL (Supabase, service-role-key access from server, anon-key auth from client)
**Testing**: `npm run test:fast` (node --test, excludes candidate-generator.test.js)
**Target Platform**: Web SPA served by Express, PWA-capable, no SSR
**Project Type**: Web application (monorepo: `connect-four/server/` + `connect-four/src/`)
**Performance Goals**: 50-game card list without scroll jank; <100ms filter transition; <3s time-to-list from Home tap (SC-001)
**Constraints**: 50-game cap (no pagination); auth required for `GET /api/games`; client-side filtering only; `cols` computation must be O(moves.length) — no solver calls
**Scale/Scope**: 1 new screen, 1 new endpoint, 2 DB column additions, ~10 new CSS classes, ~15 i18n keys

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine**: Not applicable. This feature reads game records; it does not generate move explanations or pattern labels. The existing `POST /api/games/analyze` endpoint (which routes through the Explanation Engine) is only extended to populate `game_id` on blunder inserts and add `gameDate` to the response — no new explanation logic.

**Principle II — Code Quality & Simplicity**:
- [x] No speculative abstractions. The `colsToBoard` utility is a thin wrapper around existing `boardSpecToBoard` — zero new algorithmic code.
- [x] No half-finished implementations. Papergames slot is rendered structurally but always shows "ai" — clearly documented as post-MVP.
- [x] Storage-agnostic interface honored. `PastGamesList` fetches via `fetch()` and `Authorization` header; neither IndexedDBStore nor SupabaseStore gains new methods.

**Principle III — Testing Standards**:
- [x] `cols` computation and `colsToBoard` do NOT depend on the solver — pure string iteration. Unit-testable with simple fixtures.
- [x] `GET /api/games` endpoint can be integration-tested against the real Supabase DB.
- [x] UI features will be manually verified against the mockup (golden-path + signed-out + empty + error states).
- [x] Test data will be deterministic movestrings from DB-sourced game records, not random.

**Principle IV — UX Consistency**:
- [x] Difference pill colors match existing evaluation token colors: Easy=`--eval-good`, Medium=`--eval-mid`, Hard=`--eval-bad`, Perfect=dark (planner adds styling).
- [x] Outcome chips use existing green/red scale for Won/Lost. Draw uses neutral gray.
- [x] Blunder count chip uses amber, consistent with existing blunder indicator styling.
- [x] Signed-out gate pattern matches existing `MistakesListScreen` pattern (icon, headline, body, CTA, ghost dismiss).
- [x] No Deep Reveal content on this screen — progressive disclosure not applicable.

**Principle V — Performance Requirements**:
- [x] `GET /api/games` is a single DB query (games JOIN blunders count, ORDER BY created_at DESC LIMIT 50) — well within latency budget.
- [x] `cols` computation is O(moves.length) string iteration — no solver calls.
- [x] Filtering is client-side on already-loaded data — O(n) array `.filter()`, well under 100ms for 50 items.
- [x] Analytics writes fire-and-forget (FR-031, FR-032) — no blocking.
- [x] Loading spinner shown within 200ms of navigation (AbortController handles unmount race).

**Principle VI — Implementation & Debugging Methodology**:
- [x] Before writing `cols` server code, will test with a concrete movestring from DB to validate the `g`/`d` encoding.
- [x] Data dependencies mapped: UI fields → GameRecord shape → DB columns (see data-model.md).
- [x] No solver-dependent signals in this feature — `move_count` is `moves.length`, `cols` is pure iteration.
- [x] Load-bearing assumptions documented: `g`/`d` encoding parity rule, 50-game cap, auth-required gate.

**Principle VII — Software Design Philosophy**:
- [x] Explicit over implicit: `cols` encoding is documented in data-model.md with parity rules.
- [x] Flat over nested: `GameCard` is a single row component; filter tabs are flat buttons.
- [x] Errors do not pass silently: fetch errors render a user-visible error state; malformed `cols` data returns an empty board instead of crashing.
- [x] One obvious way: `colsToBoard` is the single entry point for `cols`→board conversion.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (`docs/architecture/`) were read before this plan was drafted.
- [x] `data-model.md` will be updated for new DB columns (`blunders.game_id`, `games.accuracy`).
- [x] `api-conventions.md` will be updated for `GET /api/games` endpoint.
- [x] `frontend-conventions.md` will be updated for `colsToBoard` utility and `GameCard` component pattern.
- [x] `tasks.md` will include explicit documentation tasks (data-model.md update, api-conventions.md update, frontend-conventions.md update).

**Tier & Access Control**:
- [x] `GET /api/games` requires authentication (401 for anonymous). No `device_uuid` fallback.
- [x] `POST /api/games/analyze` blunder writes skip when `req.user` is null (anonymous users) — existing behavior preserved.
- [x] No new paid-tier gates. Past Games is a free-tier feature.
- [x] Signed-out gate on `PastGamesList` shows AuthModal, consistent with the tier constraint (anonymous = no Deep Reveal, but can play games).

**GATE RESULT**: All checks pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/027-past-games-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-games.md     # GET /api/games contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js                          # [MODIFY] Add GET /api/games endpoint
│   │                                     # [MODIFY] Extend POST /api/games (accuracy field)
│   │                                     # [MODIFY] Extend POST /api/games/analyze (add game_id to existing insertGameBlunder call, add gameDate to response)
│   ├── insertGameBlunder.js              # [MODIFY] Add game_id parameter
│   ├── migrations/
│   │   └── 036_past_games_schema.sql     # [NEW] game_id on blunders, accuracy on games
│   └── routes/                           # (no new route file — endpoint added inline in index.js per convention)
├── src/
│   ├── lib/
│   │   ├── board.js                      # [MODIFY] Add colsToBoard utility
│   │   ├── surfaceGroups.js              # [MODIFY] Add pastGames → --bg-spar mapping
│   │   ├── screenRegistry.jsx             # [MODIFY] Register PastGamesList screen
│   │   ├── urlMapping.js                 # [MODIFY] Add /pastGames URL pattern
│   │   └── track.js                      # (no changes — track() is generic)
│   ├── screens/
│   │   ├── HomeScreen.jsx                # [MODIFY] Add Past Games feature card
│   │   └── PastGamesListScreen.jsx       # [NEW] PastGamesList + GameCard components
│   ├── components/
│   │   └── Icon.jsx                      # [MODIFY] Add clock icon SVG path
│   ├── styles/
│   │   └── index.css                     # [MODIFY] Add game-card, outcome-chip, gc-* classes
│   └── i18n/
│       └── en.json                       # [MODIFY] Add games.* and home.past_games.* keys
└── tests/
    ├── api-games.test.js                 # [NEW] GET /api/games endpoint tests
    └── colsToBoard.test.js               # [NEW] colsToBoard utility unit tests
```

**Structure Decision**: Single web application monorepo (`connect-four/`). The `src/` directory follows the existing pattern: screens in `screens/`, shared utilities in `lib/`, components in `components/`. Server endpoints live in `server/index.js` (inline per convention, not separate route files). CSS additions go in `src/styles/index.css` (follows existing pattern for screen-specific classes). Tests go in `connect-four/tests/`.

## Complexity Tracking

> No violations to justify. All constitution principles pass.

---

## Phase 0 — Research

All technical unknowns identified in the spec and architecture review have been resolved. See [research.md](./research.md) for full details.

### Key Research Findings

See [research.md](./research.md) for the full analysis of all 11 research items. Key decisions summarized below:

1. **`cols` encoding**: `g` = first-player disc (even indices), `d` = second-player (odd indices). Matches `boardSpecToBoard`. See §1. **Note: The spec's FR-010 originally stated the inverse (odd = first player). This has been corrected. The plan uses the correct rule — even indices for first player.**

2. **`colsToBoard`**: Thin wrapper around `boardSpecToBoard` with graceful fallback. See §1.

3. **`gamesVariant`**: Internal component concern — no app-level state. Matches existing `MistakesListScreen` pattern. See §3.

4. **Draw outcome chip**: Neutral gray tokens. See §7.

5. **AuthModal trigger**: Local `useState` pattern matching `HomeScreen` (`setAuthOpen(true)` → render `<AuthModal>`). ProfileStore does NOT expose `setShowAuthModal`. See §4.

6. **`clock` icon**: Simple SVG clock face. See plan §7.

7. **Perfect difficulty pill**: `background: #2b2a28` (near-black), `color: #fff`. See §6.

8. **Migration number**: `036_past_games_schema.sql`. See §10.

9. **`POST /api/games/analyze` `gameDate`**: Extend SELECT to include `created_at`. See §2.

10. **Blunder write is already server-side**: Code verification confirmed there are zero `POST /api/blunders` calls in the frontend codebase (`connect-four/src/`). `POST /api/games/analyze` (lines 1454-1466 of `server/index.js`) already writes game blunders server-side via `insertGameBlunder`. The only change needed is adding `game_id` to that existing insert. No frontend removal is required. See §5.

11. **`insertGameBlunder` backward compatibility**: Add `game_id` to destructured fields with `null` default. See §11.

---

## Phase 1 — Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for the full entity specification. Summary of changes:

**New column on `blunders`**:
- `game_id` uuid nullable, FK → `games(id) ON DELETE SET NULL`
- Index: `idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL`

**New column on `games`**:
- `accuracy` real nullable (stores percentage of optimal user moves, 0–100)

**New response shape — `GameRecord`** (from `GET /api/games`):
- `id` (UUID), `outcome` ("won"|"lost"|"draw"), `date` (ISO 8601), `source` ("ai"), `difficulty` ("easy"|"medium"|"hard"|"perfect"), `accuracy` (number|null), `blunder_count` (number), `move_count` (number), `cols` (string[7] in g/d encoding)

**Extended response — `POST /api/games/analyze`**:
- Adds `gameDate` (string, ISO 8601) to the existing response shape

### API Contracts

See [contracts/api-games.md](./contracts/api-games.md) for the full endpoint specification.

**New endpoint**: `GET /api/games`
- Auth: Required (Bearer token), 401 for unauthenticated
- Query params: `outcome` ("won"|"lost"), `has_blunder` ("true"), `limit` (default 50, max 50)
- Response: `{ games: GameRecord[] }`
- `cols` computed server-side from `games.moves`
- `blunder_count` via LEFT JOIN COUNT on `blunders WHERE game_id = games.id AND user_id = req.user.id`

**Modified endpoint**: `POST /api/games`
- Accepts optional `accuracy` field (number, 0–100 inclusive)
- Stores in `games.accuracy`

**Modified endpoint**: `POST /api/games/analyze`
- Blunder inserts now include `game_id` from request `gameId`
- Response now includes `gameDate` (ISO 8601 from `games.created_at`)

### Component Contracts

**`colsToBoard(cols)`** — new utility in `src/lib/board.js`:
- Input: `cols` (string[7]) — each string is `g`/`d` encoded, bottom-to-top
- Output: `board[row][col]` (6×7, values `'empty'`|`'red'`|`'yellow'`)
- Delegates to existing `boardSpecToBoard` internally
- Returns empty 6×7 board on malformed data (graceful fallback)

**`PastGamesList` screen** — new component, props:
- `go(key, params)`: navigation function
- `goBack()`: back navigation
- Component internally manages `gamesVariant` (`"in"` | `"empty"` | `"out"`) by checking auth state (`useStore()`) and fetch results. No app-level variant prop.

**`GameCard` sub-component** — props:
- `game: GameRecord`: the game data object
- `onTap: () => void`: tap handler

**`HomeScreen` modification**:
- Add `FeatureCard` with `wide` prop below Sparring card

### CSS Classes

| Class | Purpose |
|---|---|
| `game-card` | Full-width tappable row (flex row, white bg, rounded corners, shadow) |
| `gc-body` | Flex-column middle section of GameCard |
| `gc-blunder-chip` | Amber flag chip for "N blunder(s)" |
| `gc-no-blunder-chip` | Muted text "no blunders" |
| `outcome-chip` | Small pill base; `.won` (green), `.lost` (red), `.draw` (neutral gray) |
| `opponent-av` | Circular avatar for Papergames opponent initials (structural placeholder) |

### i18n Keys

All in `en.json`:
- `games.title`, `games.filter.all`, `games.filter.won`, `games.filter.lost`, `games.filter.blunder`
- `games.empty_filter`, `games.signed_out.headline`, `games.signed_out.body`
- `games.empty.headline`, `games.empty.body`
- `games.card.blunders_one`, `games.card.blunders_other`, `games.card.no_blunders`, `games.card.accuracy`
- `home.past_games.title`, `home.past_games.subtitle`

### Screen Registry & URL Mapping

- Screen key: `pastGames` → `PastGamesList` component
- URL pattern: `/pastGames` (no params)
- NOT in `SESSION_ONLY_SCREENS` (survives cold boot)
- Surface group: `--bg-spar`

---

## Phase 2 — Implementation Tasks

*Generated by `/speckit-tasks` — not part of this plan. See [tasks.md](./tasks.md) when available.*

### Task Sequencing Rationale

The implementation order is constrained by these dependencies:

1. **Migration first** (DB columns must exist before server code references them)
2. **Server endpoints second** (frontend needs the API to fetch and display data)
3. **`colsToBoard` utility third** (GameCard rendering depends on it)
4. **`PastGamesList` screen fourth** (depends on API + utility)
5. **Home Screen card fifth** (navigation target must exist first)
6. **App shell wiring + CSS + i18n** can be done in parallel with the screen

Critical path: Migration → Server endpoints → `colsToBoard` utility → PastGamesList screen
