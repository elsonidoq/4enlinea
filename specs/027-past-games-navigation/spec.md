# Feature Specification: Past Games Navigation

**Feature Branch**: `101-new-design`
**Created**: 2026-06-09
**Status**: Draft
**Input**: User description: "Past Games Navigation (Epic A) — Add a Past Games entry point on the Home screen and a new PastGamesList screen that lets authenticated users browse, filter, and tap into previous sparring games."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Past Games (Priority: P1)

An authenticated user opens the Past Games screen and sees a scrollable list of their previously played sparring games, ordered most recent first. Each card shows a compact board thumbnail, the outcome (Won/Lost), the date, the difficulty and accuracy, and a blunder count. Tapping a card opens the Post-Game Review for that game so the user can re-examine each move with the Coach.

**Why this priority**: This is the core feature value — giving users access to their game history with enough context (board thumbnail, outcome, date, difficulty, accuracy, blunders) to decide which game to revisit. Without this, the feature does not exist.

**Independent Test**: Can be fully tested by signing in as a user with existing game records, navigating to Past Games, and confirming all games render with correct data. Delivers value even without filters or the Home screen entry point.

**Acceptance Scenarios**:

1. **Given** an authenticated user with 3+ past games, **When** they navigate to Past Games, **Then** a scrollable list of game cards appears, ordered most recent first, each showing a board thumbnail, outcome chip, date, difficulty pill, accuracy percentage, and blunder count.
2. **Given** an authenticated user with at least one past game, **When** they tap a game card, **Then** the app navigates to Post-Game Review showing that game's move timeline and analysis.
3. **Given** an authenticated user with no past games, **When** they navigate to Past Games, **Then** an empty state is shown with a Coach avatar, "No games yet" headline, encouraging message, and a "Play a game" CTA that navigates to the difficulty picker.
4. **Given** a loading state while games are being fetched, **When** the user waits, **Then** a spinner is displayed until the data arrives.

---

### User Story 2 - Filter Past Games (Priority: P2)

A user with many past games can filter the list by outcome (All, Won, Lost) or by whether the game contains blunders. Filtering is instant — it operates on the already-loaded data without a new network request.

**Why this priority**: Filtering becomes valuable once a user has more than a handful of games. It is a pure client-side operation on already-fetched data, so it adds significant navigation value at low cost. It is P2 because the unfiltered list (P1) already delivers core value.

**Independent Test**: Load the Past Games screen with mixed outcome games. Tap Won, Lost, and Blunder tabs and verify the list updates correctly. Tap All to return to the full list. Verifiable without the Home screen entry point.

**Acceptance Scenarios**:

1. **Given** a user viewing the full list with both won and lost games, **When** they tap the "Won" tab, **Then** only games with outcome "won" are displayed.
2. **Given** a user viewing the full list, **When** they tap the "Blunder" tab, **Then** only games with at least one blunder are displayed.
3. **Given** a user with a filter applied that matches zero games, **When** the filter is active, **Then** a "Nothing here — switch tabs to see your other games." message is displayed.
4. **Given** a user on any filter tab, **When** they tap "All", **Then** the full list reappears.

---

### User Story 3 - Discover Past Games from Home Screen (Priority: P3)

A user on the Home screen sees a new wide-row "Past Games" feature card below the Sparring section. The card has a teal tint and a clock icon, distinguishing it visually from other feature cards. Tapping it navigates to the Past Games list.

**Why this priority**: This is the discovery mechanism. Without it, users cannot find the Past Games screen. It is P3 because the Past Games screen can be tested and delivered independently — the Home card is a thin entry point.

**Independent Test**: On the Home screen with the new card rendered, tap it and confirm navigation to Past Games. Verify the card's visual styling matches the mockup (teal gradient, clock icon). Verifiable without any game data.

**Acceptance Scenarios**:

1. **Given** a user on the Home screen, **When** they view the feature cards, **Then** a "Past Games" card appears below the Sparring card with a teal gradient background, clock icon, title, and subtitle.
2. **Given** a user viewing the Past Games card, **When** they tap it, **Then** the app navigates to the Past Games screen.

---

### User Story 4 - Signed-Out Gate (Priority: P3)

An anonymous user who taps "Past Games" from the Home screen sees a sign-up gate instead of the game list. The gate explains the value (games are saved and reviewable with the Coach) and offers a "Create free account" CTA and a "Maybe later" dismiss button.

**Why this priority**: The signed-out state is a required variant for any authenticated feature, but it should be tested and delivered alongside the populated state. It is P3 because it handles the absence of the primary user flow.

**Independent Test**: As an anonymous user, navigate to Past Games. Confirm the sign-up gate is displayed with the correct messaging and both buttons. Tap "Maybe later" to return to Home.

**Acceptance Scenarios**:

1. **Given** an anonymous user, **When** they navigate to Past Games, **Then** a sign-up gate is displayed with an icon, "Sign up to see your games" headline, explanatory body text, a "Create free account" primary button, and a "Maybe later" ghost button.
2. **Given** an anonymous user on the Past Games sign-up gate, **When** they tap "Create free account", **Then** the AuthModal opens.
3. **Given** an anonymous user on the Past Games sign-up gate, **When** they tap "Maybe later", **Then** they return to the Home screen.

---

### Edge Cases

- What happens when the `GET /api/games` request fails (network error or server error)? The user should see a user-friendly error state, not a blank screen or a crash.
- What happens when a game has `accuracy: null` (played before the migration that added the accuracy column)? The accuracy display should show `--` or a muted placeholder.
- What happens when a game has zero blunders (either pre-migration or a clean game)? The blunder row shows "no blunders" in muted text — no flag icon.
- What happens when a game result is "draw"? The GameCard must handle draw as a valid outcome — it is not an error state. The outcome chip should display "Draw" with appropriate styling.
- What happens when the user rapidly switches filter tabs? The filter is synchronous on already-loaded data, so no race conditions.
- What happens when the component unmounts while a fetch is in flight? The in-flight request is cancelled (via AbortController) to avoid setting state on an unmounted component.
- What happens when `GET /api/games` returns exactly 50 games? The list renders all 50. No "load more" UI appears. The 50-cap is invisible to the user — they simply see their most recent 50 games.
- What happens when the board position cannot be rendered from `cols` (malformed data)? The `colsToBoard`/`movesToBoardSpec` helper should handle graceful fallback; the Board component should render an empty board rather than crashing.

## Requirements *(mandatory)*

### Functional Requirements

**Database**

- **FR-001**: System MUST add a `game_id` column (UUID, nullable, FK to `games.id` ON DELETE SET NULL) to the `blunders` table, with a non-unique index `idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL`.
- **FR-002**: System MUST add an `accuracy` column (real, nullable) to the `games` table. The column stores the percentage of optimal user moves (rounded to the nearest integer), computed client-side at game-end. NULL for games played before this migration.

**Backend — Save Game**

- **FR-003**: `POST /api/games` MUST accept an optional `accuracy` field (number, nullable) in the request body. When present, it MUST be validated as a number between 0 and 100 inclusive. Stored in `games.accuracy`. No change to the 201 response shape.

**Backend — Analyze Game**

- **FR-004**: `POST /api/games/analyze` MUST write blunders server-side (via `supabase.from('blunders').insert(...)`) with the `game_id` field populated from the request's `gameId`. Blunder writes MUST be skipped when `req.user` is null (anonymous users).
- **FR-005**: `POST /api/games/analyze` MUST write blunders with the `game_id` field populated from the request's `gameId`. Blunders from games are written exclusively server-side inside this endpoint. `POST /api/blunders` remains for puzzle blunders only (where `puzzle_id IS NOT NULL`).
- **FR-006**: `POST /api/games/analyze` response MUST include a `gameDate` field (ISO 8601 string from `games.created_at`).

**Backend — List Games**

- **FR-007**: System MUST provide `GET /api/games`, which requires authentication (401 for unauthenticated requests). Response shape: `{ games: GameRecord[] }`.
- **FR-008**: `GET /api/games` MUST accept optional query parameters `outcome` ("won" | "lost"), `has_blunder` ("true"), and `limit` (default 50, max 50).
- **FR-009**: Each `GameRecord` in the response MUST contain: `id` (UUID), `outcome` ("won" | "lost" | "draw"), `date` (ISO 8601 from `created_at`), `source` ("ai"), `difficulty` ("easy" | "medium" | "hard" | "perfect"), `accuracy` (number | null), `blunder_count` (number), `move_count` (number), and `cols` (7-element string array in g/d encoding).
- **FR-010**: `cols` MUST be computed server-side by iterating the game's `moves` movestring. Encoding: `g` = first-player disc (move at even 0-based index), `d` = second-player disc (move at odd 0-based index). Each string in the array represents a column's discs bottom-to-top.
- **FR-011**: `blunder_count` MUST be computed via LEFT JOIN COUNT on `blunders WHERE game_id = games.id AND user_id = req.user.id`. The WHERE clause on `user_id` ensures correct counts even if multiple users played the same game.
- **FR-012**: Results MUST be ordered by `games.created_at DESC` (most recent first) and capped at the `limit` parameter.
- **FR-013**: Anonymous users (no `req.user`) MUST receive 401. No `device_uuid` fallback is provided.

**Frontend — Home Screen**

- **FR-014**: Home screen MUST display a "Past Games" wide-row feature card below the Sparring section. Styling: teal gradient background (`linear-gradient(170deg, #fff, #e8faf8)`), clock icon in `#1a8a7c` on `#c7f0ea` background. Tapping navigates to `go('pastGames')`.
- **FR-015**: A `clock` icon MUST be added to the shared Icon component SVG set.

**Frontend — PastGamesList Screen**

- **FR-016**: `PastGamesList` MUST fetch game data on mount via `GET /api/games`, display a loading spinner during fetch, and cancel the in-flight request on unmount (via AbortController).
- **FR-017**: `PastGamesList` MUST render four filter tabs: All, Won, Lost, Blunder. Filtering is client-side on already-fetched data; no additional server requests on tab change.
- **FR-018**: `PastGamesList` MUST render a `GameCard` for each game in the active filter. Each `GameCard` MUST display: a compact Board thumbnail (80px wide, non-interactive, `compact` mode), an outcome chip (Won in green, Lost in red, Draw in neutral gray — `background: var(--ink-faint)` at low opacity, text `var(--ink-soft)`), the date (client-formatted from ISO 8601), source information (difficulty pill + accuracy for AI games; avatar circle + opponent name for papergames), a blunder indicator (amber flag chip with count when > 0; muted "no blunders" text when 0), and a chevron right icon. Tapping the card navigates to `go('review', { id: game.id })`.
- **FR-019**: `PastGamesList` MUST internally derive and manage three state-machine variants via an internal `gamesVariant` derivation: signed-out gate (`"out"`), empty state (`"empty"`), and populated list (`"in"`).
- **FR-020**: The signed-out gate MUST display an icon, "Sign up to see your games" headline, explanatory body text, "Create free account" primary button, and "Maybe later" ghost button. The "Create free account" button MUST open the AuthModal (via `setShowAuthModal(true)` or the equivalent auth-trigger mechanism used by other gated screens).
- **FR-021**: The empty state MUST display a CoachAvatar (mood: happy), "No games yet" headline, encouraging coach message, and a "Play a game" CTA navigating to the difficulty picker.
- **FR-022**: When an active filter returns zero results, a "Nothing here — switch tabs to see your other games." message MUST be displayed.
- **FR-023**: The `accuracy` field MUST display as `--` when null (games predating the accuracy migration) or when `scored_moves = 0`.

**Frontend — Utilities**

- **FR-024**: A `colsToBoard` utility function MUST be created in `src/lib/board.js` that converts the `cols` array (7 strings in `g`/`d` encoding, bottom-to-top per column) into a 2D `board[row][col]` array (`'red'` for `g`, `'yellow'` for `d`, `'empty'` for absent cells) suitable for the production `Board` component's `board` prop. This function MUST handle malformed data gracefully (returning an empty board) rather than throwing.

**Frontend — App Shell Wiring**

- **FR-025**: `pastGames` MUST be registered in the screen registry (`src/lib/screenRegistry.js`) mapping the key to the `PastGamesList` component.

- **FR-027**: PostGameReview MUST read the game ID from `props.id` — the existing `review` navigation param contract (`{ id: string }` in `data-model.md`). No additional state mechanism is introduced.
- **FR-028**: `pastGames` MUST be added to the sparring surface group in `src/lib/surfaceGroups.js` so it receives the `--bg-sparring` tint.

**Frontend — URL Mapping**

- **FR-029**: A URL mapping entry for `pastGames` MUST be added to `src/lib/urlMapping.js`. The `pastGames` screen has no URL params — its route path does not carry state.
- **FR-030**: `pastGames` MUST NOT be added to `SESSION_ONLY_SCREENS`. The screen fetches its data on mount and survives a cold URL boot — a user who bookmarks `/pastGames` and revisits should land on the Past Games screen (with a loading spinner while data fetches, or the signed-out gate if not authenticated).

**Analytics**

- **FR-031**: PastGamesList MUST fire `track('screen_viewed', { screen: 'past_games' })` on mount. `setActiveScreen('pastGames')` MUST be called before `track()`.
- **FR-032**: GameCard tap MUST fire `track('game_history_opened', { gameId })`.

**i18n**

- **FR-033**: All user-facing strings on the new screen MUST use `t('key')` lookups from the `games.*` and `home.past_games.*` namespaces. Keys: `games.title`, `games.filter.all`, `games.filter.won`, `games.filter.lost`, `games.filter.blunder`, `games.empty_filter`, `games.signed_out.headline`, `games.signed_out.body`, `games.empty.headline`, `games.empty.body`, `games.card.blunders_one`, `games.card.blunders_other`, `games.card.no_blunders`, `games.card.accuracy`, `home.past_games.title`, `home.past_games.subtitle`.

**CSS**

- **FR-034**: New CSS classes MUST be added for the Past Games UI: `game-card` (full-width tappable row, flex row, white bg, rounded corners, shadow), `gc-body` (flex-column middle section), `gc-blunder-chip` (amber flag chip), `gc-no-blunder-chip` (muted text), `outcome-chip` with `.won` (green), `.lost` (red), and `.draw` (neutral gray — `background: var(--ink-faint)` at low opacity, text `var(--ink-soft)`) variants, and `opponent-av` (circular avatar for papergames initials).

### Key Entities

- **GameRecord** (response shape for `GET /api/games`): Represents a completed sparring game in the user's history. Key attributes: unique id, outcome (won/lost/draw), date played, source (always "ai" in MVP), difficulty level, accuracy percentage, blunder count, move count, and a 7-element column thumbnail array (`cols`) encoding the final board state in g/d notation.
- **Blunder** (extended): Gains a new optional relationship to `Game` via `game_id`. Puzzle blunders continue to have `game_id = NULL`. This enables blunder-count-per-game aggregation and the two-way blunder-to-game navigation link (consumed by Epic B).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated user with past games can navigate from Home to Past Games and see their full game list within 3 seconds of tapping the card (including network fetch and render).
- **SC-002**: The Past Games list can display up to 50 game cards without visible scroll jank or layout thrashing.
- **SC-003**: Filtering between All, Won, Lost, and Blunder tabs produces an instant visual update (under 100ms) with no network request.
- **SC-004**: An anonymous user who taps Past Games sees the sign-up gate immediately; the gated screen does not flash the game list before the gate renders.
- **SC-005**: Tapping any game card navigates to Post-Game Review and displays that game's move timeline and analysis correctly (the review screen shows data for the tapped game, not a different game).
- **SC-006**: All user-facing text on the Past Games screen displays correctly via i18n keys (no hardcoded strings, no missing key fallbacks).
- **SC-007**: The Home screen Past Games card is visually distinguishable from adjacent feature cards (Sparring) via its teal color treatment and clock icon.

## Assumptions

- The `games` table and `POST /api/games` endpoint already exist from the Sparring epic. This spec extends them; it does not create them.
- The `boardSpecToBoard` / `movesToBoardSpec` helper function exists server-side (used for lesson board rendering) and can be reused for `cols` computation.
- A `colsToBoard` utility function will be created in `src/lib/board.js` to convert the `cols` array (7 strings in `g`/`d` encoding, bottom-to-top per column) into a 2D `board[row][col]` array (`'red'` for `g`, `'yellow'` for `d`, `'empty'` for absent cells) suitable for the production `Board` component's `board` prop.
- The PostGameReview screen already accepts `props.id` as the game ID via navigation params (from GameBoard after save). No changes to PostGameReview's prop interface are needed.
- The `gamesVariant` state pattern follows the same three-state model as `mistakesVariant` (signed-in, empty, signed-out), reusing the same rail selector pattern in the mockup app shell.
- The `clock` icon follows the existing Icon component pattern (SVG path in a shared set, referenced by name string).
- Difficulty pill colors match the existing evaluation color tokens: Easy = green (`--eval-good`), Medium = amber (`--eval-mid`), Hard = red (`--eval-bad`), Perfect = dark.
- The papergames slot (opponent avatar, initials, name) is rendered structurally in the `GameCard` but always shows `source: "ai"` in MVP. No papergames data is fetched or displayed.
- Screen grouping in production uses `SCREENS` (screenRegistry.jsx) + `URL_MAP` (urlMapping.js) + `SURFACE_BG` (surfaceGroups.js); there is no `NAV_GROUPS` constant in the production `App.jsx`. The mockup's `NAV_GROUPS` infrastructure does not apply to the production codebase.
- Sprint capacity and developer availability are not specified; the epic estimate of 26–32 tasks and 130–155 spec lines is noted but not binding on the spec.
