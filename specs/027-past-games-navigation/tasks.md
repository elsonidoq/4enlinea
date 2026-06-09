# Tasks: Past Games Navigation (Epic A)

**Input**: Design documents from `specs/027-past-games-navigation/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/api-games.md

**Organization**: Tasks follow the dependency-ordered phases from plan.md:
Phase 1 (migration) blocks everything. Phase 2 (server endpoints) depends on Phase 1.
Phase 3 (colsToBoard utility) depends on Phase 1 conceptually.
Phase 4 (screen + CSS + icon + i18n + app shell) depends on Phases 2 and 3.
Phase 5 (Home card) depends on screen registration.
Phase 6 (tests + docs) can run after Phase 2 and Phase 4 respectively.

**Critical path**: T001 → T002 → T005 → T007 → T014 (Home card placement is the final visible deliverable).

---

## Phase 1: Database Migration

**Purpose**: Create the DB columns that all server code depends on. This is the single foundational blocker.

**CRITICAL**: No other task in this epic may begin until T001 is complete and the migration has been applied.

- [ ] T001 Create `connect-four/server/migrations/036_past_games_schema.sql` with:
  - `ALTER TABLE blunders ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE SET NULL` (nullable, FK)
  - `CREATE INDEX idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL` (non-unique, partial index)
  - `ALTER TABLE games ADD COLUMN accuracy real` (nullable)
  - Apply the migration against the Supabase DB (FR-001, FR-002)

**Checkpoint**: `blunders.game_id` and `games.accuracy` columns exist in Supabase. Phase 2 can proceed.

---

## Phase 2: Server Endpoints

**Purpose**: Build the API that the frontend consumes. All three modifications touch `server/index.js` — ordered to minimize merge conflicts.

### Implementation for GET /api/games (new endpoint)

- [ ] T002 [US1] Create `GET /api/games` endpoint in `connect-four/server/index.js`:
  - Register after `loadUser` middleware (after the existing game endpoints block, before `POST /api/games/analyze` per convention)
  - Auth gate: return `401 { error: 'Unauthorized' }` if `req.user` is null — no `device_uuid` fallback (FR-013)
  - Validate query params: `limit` (default 50, max 50), `outcome` (only "won"|"lost"), `has_blunder` (only "true"); return 400 on invalid values (FR-008)
  - Query `games` with LEFT JOIN on `blunders`:
    ```sql
    SELECT g.id, g.result, g.created_at, g.difficulty, g.accuracy, g.moves,
           COUNT(b.id) AS blunder_count
    FROM games g
    LEFT JOIN blunders b ON b.game_id = g.id AND b.user_id = $1
    WHERE g.user_id = $1
    [AND g.result = $2]       -- when outcome param present; map "won"→"win", "lost"→"loss"
    [HAVING COUNT(b.id) > 0]  -- when has_blunder=true
    GROUP BY g.id
    ORDER BY g.created_at DESC
    LIMIT $N
    ```
  - Map `games.result` values: `'win'`→`"won"`, `'loss'`→`"lost"`, `'draw'`→`"draw"` (FR-009)
  - Include `user_id` filter on blunders JOIN per FR-011: `AND b.user_id = $1`
  - Compute `cols` from `games.moves` using the inline `movesToCols` algorithm (4-line string iteration; `g` at even indices, `d` at odd indices; O(moves.length), no solver calls) (FR-010)
  - Compute `move_count` as `moves.length`
  - Hardcode `source: "ai"` for all records (FR-009)
  - Response shape: `{ games: GameRecord[] }` where each GameRecord has: `id`, `outcome`, `date`, `source`, `difficulty`, `accuracy`, `blunder_count`, `move_count`, `cols` (FR-009)
  - Cap results at `limit` parameter (FR-012)
  - Return 503 if `supabase` is not configured (FR-007 through FR-013)

### Implementation for POST /api/games — accuracy extension

- [ ] T003 Extend `POST /api/games` in `connect-four/server/index.js` (lines ~1264–1311):
  - Destructure `accuracy` from `req.body` (optional)
  - If `accuracy` is present, validate: must be a number, `0 ≤ accuracy ≤ 100`; return 400 on invalid
  - Include `accuracy` in the `supabase.from('games').insert(...)` call when present
  - No change to the 201 response shape (FR-003)

### Implementation for POST /api/games/analyze — game_id + gameDate

- [ ] T004 [US1] Extend `POST /api/games/analyze` in `connect-four/server/index.js` (lines ~1348–1500):
  - **SELECT change**: Add `created_at` to the game row fetch: `.select('id, moves, side, difficulty, created_at')` (line ~1363)
  - **Response change**: Add `gameDate: game.created_at` (ISO 8601 string) to the response JSON (after `side`, before closing brace) (FR-006)
  - **Blunder insert change**: Add `game_id: gameId` to the `insertGameBlunder()` call arguments (inside the `if (req.user && quality === 'blunder')` block, line ~1455) (FR-004, FR-005)
  - Verify: anonymous users (`req.user` is null) still skip the INSERT — no change to the gate condition

- [ ] T005 [US1] Extend `connect-four/server/insertGameBlunder.js`:
  - Add `game_id` to the destructured fields in the function signature: `const { user_id, board_state, move_played, correct_move, pattern_category, reason, direction, severity, blunder_severity, game_id } = row;` (line ~14)
  - Update the JSDoc `@param {object} row` to list `game_id` (nullable)
  - Add `game_id: game_id ?? null` to the INSERT object (after `puzzle_id: null`)
  - Backward compatibility: callers that omit `game_id` get `null` stored automatically via the `?? null` coalescing — no existing call sites break (FR-004, FR-005)

**Checkpoint**: `GET /api/games` returns 401 for anonymous and a populated list for authenticated users. `POST /api/games` accepts `accuracy`. `POST /api/games/analyze` response includes `gameDate` and blunders are inserted with `game_id`. Phase 3 can proceed.

---

## Phase 3: Frontend Utilities

**Purpose**: Build the `colsToBoard` conversion that GameCard depends on.

- [ ] T006 Create `colsToBoard(cols)` utility in `connect-four/src/lib/board.js`:
  - Export `colsToBoard` as a named export
  - Thin wrapper delegating to the existing `boardSpecToBoard(boardSpec)` (lines ~117–126 of board.js)
  - Input validation: if `!Array.isArray(cols) || cols.length !== 7`, return an empty 6×7 board (all `'empty'`)
  - Try/catch around `boardSpecToBoard(cols)` — return empty 6×7 board on any error (graceful fallback)
  - JSDoc: `@param {string[]} cols — 7 strings in g/d encoding, bottom-to-top per column; @returns {string[][]} board[row][col] with 'empty'|'red'|'yellow'` (FR-024)

- [ ] T007 [P] Write `node --test` unit tests in `connect-four/tests/colsToBoard.test.js`:
  - **Valid 2-ply**: `colsToBoard(["g", "d", "", "", "", "", ""])` → row 0 col 0 = `'red'`, row 0 col 1 = `'yellow'`, all other cells `'empty'`
  - **Valid multi-column**: `colsToBoard(["gg", "dd", "g", "", "", "", ""])` → correct 2-row stacking
  - **Empty cols**: `colsToBoard(["", "", "", "", "", "", ""])` → all cells `'empty'`
  - **null input**: `colsToBoard(null)` → all cells `'empty'` (no throw)
  - **Wrong length**: `colsToBoard(["g"])` → all cells `'empty'` (no throw)
  - **Malformed chars**: `colsToBoard(["g", "x", "", "", "", "", ""])` → graceful fallback (no throw) — the existing `boardSpecToBoard` maps `'x'` to `'yellow'` (non-`g` → yellow), which is acceptable; the guard is on array shape, not content validity
  - Run with `node --test connect-four/tests/colsToBoard.test.js` and confirm all tests pass

**Checkpoint**: `colsToBoard` is exported and tested. The utility is ready for GameCard rendering.

---

## Phase 4: PastGamesList Screen + Supporting Assets

**Purpose**: Build the screen, its CSS, icons, i18n keys, and register it in the app shell. Tasks marked [P] are independent of each other and can run in parallel.

**Independent Test** (for T008): Sign in as a user with existing game records, navigate to Past Games, confirm all games render with correct board thumbnail, outcome chip, date, difficulty, accuracy, and blunder count.

### Screen implementation

- [ ] T008 [US1] [US2] [US4] Create `connect-four/src/screens/PastGamesListScreen.jsx`:
  
  **Imports**: `useState`, `useEffect`, `useMemo` from React; `useTranslation` from react-i18next; `TopBar`, `Board`, `CoachAvatar`, `Icon` components; `useStore` from ProfileStore; `colsToBoard` from lib/board.js; `track` from lib/track.js; `AuthModal` component.
  
  **Component signature**: `export function PastGamesListScreen({ go, goBack })`
  
  **Internal state**:
  - `authOpen` (boolean, for AuthModal) — local `useState` pattern matching `HomeScreen` (research §4)
  - `games` (array, fetched data)
  - `loading` (boolean)
  - `error` (string|null)
  - `filter` ('all'|'won'|'lost'|'blunder')
  - `abortRef` (useRef for AbortController)
  
  **gamesVariant derivation** (internal, no app-level prop — research §3):
  - `session` from `useStore()`
  - If no `session` → variant `"out"` (signed-out gate) (FR-019)
  - If `session` and `games.length === 0` and not loading → variant `"empty"` (FR-021)
  - If `session` and `games.length > 0` → variant `"in"` (FR-016, FR-017)
  
  **Data fetching** (useEffect on mount):
  - Set `loading = true`, create `AbortController`, set `abortRef.current`
  - Fire `track('screen_viewed', { screen: 'past_games' })` on mount (FR-031)
  - Fetch `GET /api/games?limit=50` with `Authorization: Bearer <token>` header
  - On success: set `games`, set `loading = false`
  - On 401: set `games = []`, `loading = false` (triggers signed-out variant)
  - On other error: set `error`, `loading = false`
  - Cleanup: `abortRef.current.abort()` to cancel in-flight request on unmount (FR-016 edge case)
  
  **Filtering** (client-side, O(n), useMemo — no network request on tab change):
  - `filteredGames = useMemo(() => { ... }, [games, filter])`
  - All: no filter; Won: `g.outcome === 'won'`; Lost: `g.outcome === 'lost'`; Blunder: `g.blunder_count > 0` (FR-017)
  
  **Signed-out gate** (variant "out") (FR-020):
  - Icon (lock or user icon), headline `t('games.signed_out.headline')`, body `t('games.signed_out.body')`
  - "Create free account" primary button → `setAuthOpen(true)`
  - "Maybe later" ghost button → `goBack()` or `go('home')`
  - Render `<AuthModal>` when `authOpen` is true
  
  **Empty state** (variant "empty") (FR-021):
  - `CoachAvatar` (mood: "happy"), headline `t('games.empty.headline')`, message `t('games.empty.body')`
  - "Play a game" CTA button → `go('difficulty')`
  
  **Populated list** (variant "in"):
  - `TopBar` with title `t('games.title')` and back button
  - Four filter tabs: All, Won, Lost, Blunder — using `t('games.filter.*')` keys (FR-017)
  - When active filter returns zero results: display `t('games.empty_filter')` message (FR-022)
  - Scrollable list of `GameCard` components
  
  **Loading state**: Display spinner (centered, muted color) while fetch is in flight (FR-016)
  
  **Error state**: Display error message + retry button; retry re-triggers the fetch effect
  
  **GameCard sub-component** (defined in the same file, or as a separate component in `components/`):
  - Props: `game` (GameRecord), `onTap` (() => void)
  - **Board thumbnail**: `<Board>` in `compact` mode (80px wide, non-interactive), using `colsToBoard(game.cols)` (FR-018). `compact` mode means: smaller cell size, no tap handlers, `pointer-events: none` style. If the Board component doesn't yet support a `compact` prop, render a scaled-down Board via CSS transform or by passing reduced dimensions through existing Board props.
  - **Outcome chip**: Won (green background, `--eval-good-bg`, text `#1c8a4a`), Lost (red background, `--eval-bad-bg`, text `#c23a26`), Draw (neutral gray: `background: color-mix(in srgb, var(--ink-faint) 20%, transparent)`, `color: var(--ink-soft)`) — use CSS class `outcome-chip` (FR-018)
  - **Date**: Client-formatted from ISO 8601 `game.date` using `Intl.DateTimeFormat` with month+day format (e.g., "Jun 7") — do NOT format on the server (research §10)
  - **Difficulty pill**: Easy=green (`--eval-good-bg`), Medium=amber (`--eval-mid-bg`), Hard=red (`--eval-bad-bg`), Perfect=dark (`background: #2b2a28, color: #fff`) (research §6)
  - **Accuracy display**: `game.accuracy !== null ? `${game.accuracy}%` : '--'` — display `--` when null (pre-migration games) (FR-023)
  - **Blunder indicator**: When `game.blunder_count > 0`, render amber flag chip with count using `t('games.card.blunders_one')` / `t('games.card.blunders_other')` (i18n plural forms via `t()` + `count` interpolation); when 0, render muted text `t('games.card.no_blunders')` (FR-018)
  - **Chevron right**: `<Icon name="chevR" size={22} color="var(--ink-faint)" />` on the right side
  - **Tap handler**: `onClick={() => { track('game_history_opened', { gameId: game.id }); onTap(); }}` (FR-032)
  - Card navigates to `go('review', { id: game.id })` — the `review` screen uses `props.id` per the existing navigation param contract (FR-027)
  - **Papergames structural slot**: Reserve space for opponent avatar/name but conditionally render — always hidden for MVP (`source === "ai"`). The slot is a CSS comment and a conditional render block: `{game.source !== 'ai' && (<div className="opponent-av">...</div>)}` — never triggered in MVP but documents the extension point
  
  **Note on NAV_GROUPS**: The production `App.jsx` does not have `NAV_GROUPS` (it exists only in the mockup). The spec's original FR-027 (NAV_GROUPS registration) was deleted — screen grouping in production is handled by `SCREENS`, `URL_MAP`, and `SURFACE_BG` registrations (tasks T012, T013, T014). No `app.jsx` NAV_GROUPS modification is needed.

### Parallel assets (can run concurrently with T008)

- [ ] T009 [P] Add CSS classes to `connect-four/src/styles/index.css` (FR-034):
  - **`game-card`**: Full-width tappable row — `display: flex; flex-direction: row; align-items: center; gap: 14px; padding: 14px; background: var(--card, #fff); border-radius: var(--radius, 16px); box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.06)); cursor: pointer; border: none; width: 100%; text-align: left; WebkitTapHighlightColor: transparent; user-select: none;`
  - **`gc-body`**: Flex-column middle section — `flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0;`
  - **`gc-blunder-chip`**: Amber flag chip — `display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 10px; background: var(--eval-mid-bg, rgba(217,119,6,0.12)); color: #b9760a; font-size: 11px; font-weight: 700;`
  - **`gc-no-blunder-chip`**: Muted text — `font-size: 11px; color: var(--ink-faint);`
  - **`outcome-chip`**: Small pill base — `display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; line-height: 1.3;`
  - **`outcome-chip.won`**: `background: var(--eval-good-bg); color: #1c8a4a;`
  - **`outcome-chip.lost`**: `background: var(--eval-bad-bg); color: #c23a26;`
  - **`outcome-chip.draw`**: `background: color-mix(in srgb, var(--ink-faint) 20%, transparent); color: var(--ink-soft);` (research §7)
  - **`opponent-av`**: Circular avatar — `width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: var(--ink-faint); color: var(--ink-soft);` (MVP structural placeholder — never rendered when `source === 'ai'`)

- [ ] T010 [P] Add `clock` icon SVG path to `connect-four/src/components/Icon.jsx` (FR-015):
  - Add `clock` entry to the `paths` object:
    ```jsx
    clock: <g {...p}><circle cx="12" cy="13" r="8" /><path d="M12 7v6l4 2" /></g>,
    ```
  - Simple clock face: outer circle (radius 8, centered at 12,13) + hour+minute hands (vertical line to 6 o'clock, diagonal to 4 o'clock direction)
  - The `{...p}` spread applies consistent stroke styling matching all other icons

- [ ] T011 [P] Add i18n keys to `connect-four/src/i18n/en.json` (FR-033):
  - Add `"games"` top-level namespace with keys:
    - `"title"`: `"Past Games"`
    - `"filter.all"`: `"All"`
    - `"filter.won"`: `"Won"`
    - `"filter.lost"`: `"Lost"`
    - `"filter.blunder"`: `"Blunder"`
    - `"empty_filter"`: `"Nothing here — switch tabs to see your other games."`
    - `"signed_out.headline"`: `"Sign up to see your games"`
    - `"signed_out.body"`: `"Create a free account to save your games, review them with the Coach, and track your progress over time."`
    - `"empty.headline"`: `"No games yet"`
    - `"empty.body"`: `"Play a sparring game against the AI and it'll show up here for review."`
    - `"card.blunders_one"`: `"{{count}} blunder"`
    - `"card.blunders_other"`: `"{{count}} blunders"`
    - `"card.no_blunders"`: `"no blunders"`
    - `"card.accuracy"`: `"Accuracy"`
  - Add `"home.past_games"` keys under the existing `"home"` namespace:
    - `"home.past_games.title"`: `"Past Games"`
    - `"home.past_games.subtitle"`: `"Review your game history"`

### App shell registration (can run concurrently with T008-T011)

- [ ] T012 [P] Register `pastGames` screen in `connect-four/src/lib/screenRegistry.jsx` (FR-025):
  - Import `PastGamesListScreen` from `../screens/PastGamesListScreen.jsx`
  - Add entry to `SCREENS`: `pastGames: PastGamesListScreen`

- [ ] T013 [P] Add `pastGames` to `connect-four/src/lib/urlMapping.js` (FR-029, FR-030):
  - Add `{ pattern: '/pastGames', screenKey: 'pastGames', paramNames: [] }` to `URL_MAP` — place before the catch-all entries (e.g., after the `/stats` entry and before saga entries, maintaining the "no-params screens first" convention)
  - Do NOT add `'pastGames'` to `SESSION_ONLY_SCREENS` — the screen survives cold URL boots (FR-030)

- [ ] T014 [P] Add `pastGames` to `connect-four/src/lib/surfaceGroups.js` (FR-028):
  - Add `pastGames: '--bg-spar'` to `SURFACE_BG` — groups with existing sparring surface (same tint as difficulty/game/review/explorer)

**Checkpoint**: The `PastGamesListScreen` is functional. Navigating to `/pastGames` renders the screen with loading spinner, then either the signed-out gate, empty state, or game list. Filter tabs work client-side. Tapping a game card navigates to review.

---

## Phase 5: Home Screen Entry Point

**Purpose**: Add the Past Games discovery card on the Home screen below the Sparring card.

- [ ] T015 [US3] Add Past Games FeatureCard to `connect-four/src/screens/HomeScreen.jsx` (FR-014):
  - Place a new `<FeatureCard>` component below the existing Sparring `FeatureCard` (line ~68) and above the `CoachDialog` (line ~70)
  - Props:
    - `title={t('home.past_games.title')}`
    - `subtitle={t('home.past_games.subtitle')}`
    - `background="linear-gradient(170deg, #fff, #e8faf8)"` (teal gradient)
    - `icon={<Icon name="clock" size={28} color="#1a8a7c" />}`
    - `iconBg="#c7f0ea"`
    - `iconColor="#1a8a7c"`
    - `onClick={() => go('pastGames')}`
    - `wide` (full-width row layout, matching the Sparring card)
  - Verify: the card renders below Sparring card, visually distinct via teal gradient + clock icon (FR-014, SC-007)

**Checkpoint**: The Home screen shows the Past Games card. Tapping it navigates to the PastGamesList screen. The signed-out gate works for anonymous users.

---

## Phase 6: Verification & Documentation

**Purpose**: Integration tests for the new endpoint and documentation updates.

- [ ] T016 Write `node --test` integration tests in `connect-four/tests/api-games.test.js`:
  - **Setup**: Use a test user with known game records, or create test game rows via a helper. Tests run against the real Supabase DB.
  - **401 for unauthenticated**: Call `GET /api/games` without auth header → 401
  - **200 with empty list**: Authenticated user with no games → `{ games: [] }`
  - **200 with games**: Authenticated user with games → `{ games: [...] }` with correct shape (id, outcome, date, source, difficulty, accuracy, blunder_count, move_count, cols)
  - **outcome filter**: `?outcome=won` returns only won games
  - **has_blunder filter**: `?has_blunder=true` returns only games with blunder_count > 0
  - **limit cap**: `?limit=100` → 400 error (`limit must be ≤ 50`)
  - **invalid outcome**: `?outcome=draw` → 400 error (draw is not a filter value, only won/lost)
  - **cols encoding**: Verify `cols` array has 7 strings, `g` at even indices, `d` at odd indices for a known movestring
  - **blunder_count correctness**: Verify count matches actual blunders rows for the game
  - Run with `node --test connect-four/tests/api-games.test.js` and confirm all tests pass

- [ ] T017 [P] Update `docs/architecture/data-model.md`:
  - Add `game_id` column on `blunders` table (uuid, nullable, FK → games.id ON DELETE SET NULL)
  - Add `accuracy` column on `games` table (real, nullable)
  - Add `GameRecord` response entity documentation (shape, source fields, mapping rules)
  - Document `cols` encoding contract: `g` = first-player disc (even indices), `d` = second-player disc (odd indices)

- [ ] T018 [P] Update `docs/architecture/api-conventions.md`:
  - Add `GET /api/games` endpoint entry: auth required, query params, response shape, error codes
  - Note the `POST /api/games` `accuracy` field extension (optional, 0–100)
  - Note the `POST /api/games/analyze` `gameDate` response field addition

- [ ] T019 [P] Update `docs/architecture/frontend-conventions.md`:
  - Document `colsToBoard(cols)` utility in `src/lib/board.js` — input/output contract, graceful fallback behavior
  - Document `GameCard` component pattern: props (game, onTap), sub-elements, CSS class usage
  - Document `PastGamesList` screen pattern: internal variant derivation, filter mechanism, auth gate pattern

**Final Checkpoint**: All tasks complete. `npm run test:fast` passes. The full flow works: Home → Past Games card → PastGamesList → GameCard tap → PostGameReview.

---

## Task Summary

| # | Phase | Task | Depends On | Parallel? |
|---|-------|------|------------|-----------|
| T001 | 1 — Migration | 036_past_games_schema.sql | — | — |
| T002 | 2 — Server | GET /api/games endpoint | T001 | — |
| T003 | 2 — Server | POST /api/games accuracy extension | T001 | — |
| T004 | 2 — Server | POST /api/games/analyze game_id + gameDate | T001 | — |
| T005 | 2 — Server | insertGameBlunder game_id param | T001 | — |
| T006 | 3 — Utility | colsToBoard utility | — (conceptual: T001) | — |
| T007 | 3 — Utility | colsToBoard unit tests | T006 | [P] with T008–T014 |
| T008 | 4 — Screen | PastGamesListScreen + GameCard | T002, T006 | — |
| T009 | 4 — Assets | CSS classes | — | [P] with T008 |
| T010 | 4 — Assets | Clock icon | — | [P] with T008 |
| T011 | 4 — Assets | i18n keys | — | [P] with T008 |
| T012 | 4 — Shell | Screen registry | — | [P] with T008 |
| T013 | 4 — Shell | URL mapping | — | [P] with T008 |
| T014 | 4 — Shell | Surface groups | — | [P] with T008 |
| T015 | 5 — Home | Past Games FeatureCard | T012 (screen registered) | — |
| T016 | 6 — Verify | GET /api/games integration tests | T002 | [P] with T017–T019 |
| T017 | 6 — Docs | Update data-model.md | T001 | [P] with T016 |
| T018 | 6 — Docs | Update api-conventions.md | T002 | [P] with T016 |
| T019 | 6 — Docs | Update frontend-conventions.md | T006, T008 | [P] with T016 |

---

## Handoff context

### Task ordering decisions and rationale

1. **Migration-first is non-negotiable**: The `blunders.game_id` FK and `games.accuracy` column must exist before any server code references them. A single migration file (036) handles both — splitting across two migrations would create an unnecessary sequence dependency.

2. **Server endpoints before frontend utilities**: While `colsToBoard` could technically be written before the API, the screen integration test (verifying the full flow) requires the endpoint to return real data. Building the endpoint first lets the screen developer test against live API responses.

3. **insertGameBlunder extraction as a separate task (T005)**: The `game_id` parameter addition is small and self-contained, but it crosses two files (`insertGameBlunder.js` + the call site in `server/index.js`). Extracting it as a separate task prevents the T004 diff from becoming a grab-bag of unrelated changes.

4. **App shell registration parallel with screen development (T012–T014)**: These are 2-line additions to config files that don't depend on the screen implementation. They can be done in the same branch alongside screen development. However, the Home card (T015) must wait until the screen is registered so `go('pastGames')` resolves.

5. **Home card is the last visual deliverable (T015)**: Placed after screen registration to ensure the navigation target exists. It's the final "wiring" step that makes the feature discoverable.

### Non-obvious dependencies

1. **T008 depends on T002 (server endpoint) conceptually but not mechanically**: The screen fetches `GET /api/games`, but it can be built against the documented contract (contracts/api-games.md) before the endpoint is live. However, for integration testing, T002 should be complete first.

2. **T015 depends on T012 (screen registration)**: The Home card calls `go('pastGames')`, which requires `SCREENS.pastGames` to exist. Navigation won't throw (the Navigator guards against unknown keys), but it'll log a warning and fail silently.

3. **T004 (analyze endpoint) reuses the existing `insertGameBlunder` call**: The `game_id` is added to the existing call, not a new call. The same gate (`req.user && quality === 'blunder'`) protects the insert — anonymous users skip it entirely.

4. **`Board` compact mode**: The spec calls for a compact Board (80px wide, non-interactive). If the production Board component doesn't support a `compact` prop, the task writer should implement it as part of T008 (GameCard) — either by passing smaller `cellSize`/`width` props if they exist, or by wrapping the Board in a CSS `transform: scale()` container.

### Judgment calls

1. **No FR-026 task**: FR-026 (frontend blunder-write removal) is explicitly excluded per the handoff context. Research §5 confirmed there are zero `POST /api/blunders` calls in the frontend — nothing to remove.

2. **NAV_GROUPS requirement was deleted from the spec**: The production `App.jsx` has no `NAV_GROUPS` constant (mockup-only). Screen grouping is handled by `SCREENS` (screenRegistry.jsx), `URL_MAP` (urlMapping.js), and `SURFACE_BG` (surfaceGroups.js). All three registrations are covered by T012–T014. The spec's original FR-027 (NAV_GROUPS) was deleted; a note in T008 documents this decision for future readers.

3. **`gamesVariant` is purely internal (no app-level state)**: Per the handoff context and research §3, no `useState` in `app.jsx`, no prop threading. The screen derives its variant from `useStore().session` + fetch results — exactly the pattern `MistakesListScreen` uses.

4. **Difficulty pill colors**: Perfect difficulty uses hardcoded dark background (`#2b2a28`) with white text — not a CSS token. The three eval-based difficulties use existing tokens. No new CSS token is created for a single consumer (research §6).

5. **Papergames slot is structural placeholder only**: The GameCard has conditional rendering for `source !== 'ai'` with an `opponent-av` CSS class defined. The slot is never visible in MVP — it exists to document the extension point and prevent a redesign when papergames are added.

### What the reviewer should verify

1. **Migration number 036 is still the next available**: If another migration landed on `036` before this tasks.md is executed, renumber accordingly.

2. **`cols` encoding parity is consistent**: Verify `g` at even indices, `d` at odd indices matches `boardSpecToBoard` (lines 118–126 of board.js: `colStr[r] === 'g' ? 'red' : 'yellow'`). The spec's FR-010 originally had this inverted — the plan and research corrected it.

3. **No task creates `NAV_GROUPS` or a `gamesVariant` prop**: Any task that introduces app-level state or mockup-only infrastructure is a scope violation. The reviewer should grep the task list (and final implementation) for these terms.

4. **`POST /api/blunders` is not removed**: The endpoint stays for puzzle blunders. Only the game-blunder write path changes (server-side `insertGameBlunder` now includes `game_id`).

5. **`SESSION_ONLY_SCREENS` does not include `pastGames`**: FR-030 requires cold-boot survival. The screen fetches its own data on mount, so it handles the cold-boot case naturally.
