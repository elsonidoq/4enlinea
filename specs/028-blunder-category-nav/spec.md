# Feature Specification: Blunder Category Navigation & Two-Way Links

**Feature Branch**: `101-new-design`  
**Created**: 2026-06-09  
**Status**: Draft  

## Overview

Redesign the Past Mistakes surface with a three-level category drill-down and add two-way navigation between blunders and their source games. After this epic the Mistakes surface has three navigable levels: a category overview (Level 1), a filtered blunder list per category (Level 2), and the individual blunder detail (Level 3). Blunders that originate from a sparring game are linked back to their source game from the detail view.

**Depends on**: Epic A (already landed — migration 036 adds `game_id` to `blunders`, `GET /api/games` is live).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse mistakes by category (Priority: P1)

A signed-in user opens Past Mistakes and sees their blunders grouped by tactical pattern category, sorted by severity so the most important weaknesses appear first. Each category row shows the total count and how many are still unreviewed.

**Why this priority**: This is the primary entry point for the redesigned surface. Without it, Levels 2 and 3 are unreachable.

**Independent Test**: Navigate to `/mistakes`. Verify category rows appear, sorted by max-severity-of-unreviewed descending, with per-category unreviewed badge and total count.

**Acceptance Scenarios**:

1. **Given** a signed-in user with blunders in ≥2 categories, **When** they open the `mistakes` route, **Then** they see one row per category, each showing a board thumbnail of the highest-severity unreviewed blunder, a category label (from `mistakes.pattern.*`), an unreviewed badge ("N new" or "done"), total blunder count, and a chevron.
2. **Given** a category where all blunders are resolved, **When** the category list is rendered, **Then** that category row shows a "done" chip instead of an "N new" badge and is sorted to the bottom.
3. **Given** no blunders exist (authenticated user), **When** the `mistakes` route is opened, **Then** an empty state is shown with a "Play a game" CTA.
4. **Given** an unauthenticated user, **When** the `mistakes` route is opened, **Then** a signed-out gate is shown with "Create free account" and "Maybe later" buttons.
5. **Given** there are unreviewed blunders, **When** the `mistakes` TopBar is rendered, **Then** the meta slot shows "{N} to review".

---

### User Story 2 — Drill into a category's blunder list (Priority: P1)

A user taps a category row and sees all blunders for that pattern, defaulting to the "Unreviewed" tab. The TopBar title shows the category name and a total count.

**Why this priority**: Equally critical as Level 1 — the drill-down is the core navigational action.

**Independent Test**: From Level 1, tap a category. Verify the `mistakeDetail` route renders `MistakesListScreen` with the correct category filter applied, showing only that category's blunders.

**Acceptance Scenarios**:

1. **Given** a user taps a category row, **When** `mistakeDetail` loads, **Then** `MistakesListScreen` is rendered with `category` = the tapped slug, the TopBar title is the category display name, the TopBar meta shows the total count for that category, and the default tab is "Unreviewed".
2. **Given** the user switches to the "Reviewed" tab, **When** the tab changes, **Then** only reviewed blunders for that category are shown.
3. **Given** all blunders in the category are unreviewed and the user selects "Reviewed" tab, **When** the tab is active, **Then** an empty-tab message is shown ("None reviewed yet…").
4. **Given** all blunders in the category are reviewed and the user is on "Unreviewed" tab, **When** the tab is active, **Then** an empty-tab message is shown ("All caught up…").
5. **Given** the user is on Level 2 with a category, **When** they tap back, **Then** they return to Level 1 (`mistakes` route).

---

### User Story 3 — Review an individual blunder with context (Priority: P2)

A user taps a blunder card in the category list and sees the blunder detail view. The toolbar shows their position within the category's list. The TopBar meta shows the move number.

**Why this priority**: The actual learning happens here. This is the end state of the drill-down flow.

**Independent Test**: Tap any blunder card from Level 2. Verify the `blunderDetail` route renders `MistakeDetailScreen` with the blunder, the correct nav list for Prev/Next, and the right meta text.

**Acceptance Scenarios**:

1. **Given** a user taps a blunder card from Level 2, **When** `blunderDetail` loads, **Then** `MistakeDetailScreen` is rendered showing the board at the blunder position, the played-cell overlay, threat-cell overlays, and coach dialog.
2. **Given** `mistakeContext === 'list'`, **When** the user taps Back, **Then** they return to Level 2 (`mistakeDetail`).
3. **Given** the user is on blunder N of M, **When** they tap Next, **Then** the next blunder in `blunderNavList` is shown and the toolbar counter updates to "(N+1) of M".
4. **Given** the user is on the first blunder, **When** they tap Prev, **Then** the action is disabled (no wrap-around out of bounds).
5. **Given** `mistakeSource` is null, **When** the TopBar meta is rendered, **Then** it shows "Move {moveIndex} / {blunderNavList.length}" as plain text.
6. **Given** the user marks a blunder as reviewed, **When** the resolve API call succeeds, **Then** the "Mark as reviewed" button state updates to "Marked as reviewed".

---

### User Story 4 — Navigate from a game review to a specific blunder (Priority: P2)

After reviewing a past game, a user taps a `✕` blunder node in the move timeline and is taken directly to that blunder's detail view with full context: the source game date, total moves, and Prev/Next scoped to the game's blunders.

**Why this priority**: The two-way link from game → blunder is the differentiating feature of this epic that makes blunder review contextually meaningful.

**Independent Test**: Open any past game's Review screen, confirm it fetches blunders via `GET /api/coach/queue?game_id=<id>`, then tap a `✕` node and verify navigation to `blunderDetail` with `mistakeContext === 'game'` and `mistakeSource` populated.

**Acceptance Scenarios**:

1. **Given** a signed-in user on `ReviewScreen` for a game with blunders, **When** the game analysis loads, **Then** the screen also fetches `GET /api/coach/queue?game_id=<id>` and stores the result ordered by `moveIndex` asc.
2. **Given** the game blunders list is populated, **When** the user taps a `✕` node in the move timeline, **Then** the app navigates to `blunderDetail` with `mistakeContext: 'game'`, `mistakeSource: { date, gameId, totalMoves }`, `blunderNavList` = game blunders, and `index` = the matched blunder's index.
3. **Given** `mistakeContext === 'game'` and `mistakeSource` is set, **When** the `blunderDetail` TopBar meta is rendered, **Then** it shows a tappable button: "Move {moveIndex} / {totalMoves} · {date} ›".
4. **Given** the user taps the "› {date} game" link in the TopBar, **When** the tap fires, **Then** the app navigates to `go('review', { id: mistakeSource.gameId })`.
5. **Given** `mistakeContext === 'game'`, **When** the user taps Back, **Then** they navigate to `go('review', { id: mistakeSource.gameId })`.
6. **Given** a `✕` node has no matching blunder in `gameBlunderList` (e.g. anonymous user or race condition), **When** the node is tapped, **Then** the app falls back to navigating to the Explorer screen as before.

---

### Edge Cases

- **Empty `blunderNavList`**: `MistakeDetailScreen` must not crash when `blunderNavList` is empty or `index` is out of range. Render a "no blunder found" fallback state.
- **`moveIndex` mismatch**: When a `✕` timeline node's move index does not match any entry in `gameBlunderList`, fall back to the Explorer flow (no crash, no stale navigation).
- **Category fetch failure**: If `GET /api/coach/queue?category=<slug>` returns an error, Level 2 renders an error state with a Retry button (same pattern as existing `MistakesListScreen` error state).
- **`mistakeSource` absent on `blunderDetail`**: The route must degrade gracefully — `mistakeSource: null` renders plain-text meta, Back uses `goBack()`, no crash.
- **Blunder with `severity === 0`**: `SeverityMeter` returns null for score 0 — no chip rendered for legacy blunders.
- **Cold URL boot to `/blunder` or `/mistakeDetail`**: Both are in `SESSION_ONLY_SCREENS`; the app redirects to `home`.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Backend

- **FR-001**: `GET /api/coach/queue` MUST accept an optional `?category=<slug>` query param and filter results to blunders matching `pattern_category = slug`. Invalid slugs return 400.
- **FR-002**: `GET /api/coach/queue` MUST accept an optional `?game_id=<uuid>` query param and filter results to blunders matching `game_id = game_id`. When absent, all sources are returned (existing behaviour).
- **FR-003**: The `GET /api/coach/queue` response MUST include `game_id` (string|null) and `moveIndex` (integer, derived as `board_state.length`) on each blunder object. `moveIndex` is the 0-indexed global ply count (counts both players' plies) and is used exclusively as an internal join key. For user-facing display use `moveIndex + 1` (see FR-027/FR-028).
- **FR-004**: `POST /api/games/analyze` MUST include `gameDate` (ISO 8601 timestamp from `games.created_at`) in its response.

#### Frontend — SeverityMeter extraction

- **FR-005**: `SeverityMeter` MUST be extracted from `MistakesListScreen.jsx` to `connect-four/src/components/SeverityMeter.jsx` and exported. Prop: `{ score: number }` (0–10). Returns null for score 0. Display buckets: Minor (1), Moderate (2–3), Critical (4–10).

#### Frontend — Level 1: `CategoryListScreen`

- **FR-006**: A new `CategoryListScreen` component MUST be created at `connect-four/src/screens/CategoryListScreen.jsx`. The `mistakes` route MUST be updated to render it.
- **FR-007**: `CategoryListScreen` MUST fetch all blunders via `GET /api/coach/queue?status=all` on every mount (no caching). Skip the fetch when `session` is null.
- **FR-008**: `CategoryListScreen` MUST group blunders by `pattern_category` slug client-side. Each category entry carries: `slug`, `items`, `unreviewed` (items where `resolved_at === null`), `maxSev` (max severity among unreviewed; 0 if all reviewed), `thumb` (most-critical unreviewed, or most-critical overall if all reviewed).
- **FR-009**: Category rows MUST be sorted by `maxSev` descending. Categories with `maxSev === 0` (all reviewed) sorted to the bottom. Within equal `maxSev`, preserve insertion order.
- **FR-010**: Each category row MUST display: a compact board thumbnail (built from `thumb.board_state`, with played-cell overlay of type `'tr'` at col=`thumb.move_played`, row=`buildBoard(thumb.board_state).heights[thumb.move_played]`), the category label via `t('mistakes.pattern.' + slug)`, a `SeverityMeter` with `score = maxSev` (0–10) for that category, an unreviewed badge ("N new" in amber or "done" chip in green), a total blunder count, and a chevron icon.
- **FR-011**: `CategoryListScreen` TopBar MUST show title `t('mistakes.title')`, back button that calls `go('stats')`, and meta "{N} to review" (via `t('mistakes.to_review', { count })`) when `totalUnreviewed > 0`; meta omitted when 0.
- **FR-012**: `CategoryListScreen` MUST use `MistakesGate` (see FR-040) for its signed-out gate, loading, error, and authenticated-empty states. The signed-out gate shows a user icon, heading, "Create free account" → `go('stats')`, "Maybe later" → `go('stats')`. The authenticated-empty state shows CoachAvatar, "No mistakes captured yet", "Play a game" → `go('difficulty')`.
- **FR-013**: Tapping a category row MUST navigate to `go('mistakeDetail', { category: slug })`.
- **FR-014**: `CategoryListScreen` MUST fire `track('screen_viewed', { screen: 'mistake_categories' })` on mount.
- **FR-015**: All layout in `CategoryListScreen` MUST use inline styles. No new CSS class names.

#### Frontend — Level 2: `MistakesListScreen` refactor

- **FR-016**: `MistakesListScreen` MUST accept a `category: string | null` prop (nav param from `mistakeDetail` route). Default: `null`.
- **FR-017**: The `mistakeDetail` route MUST be updated to render `MistakesListScreen` (was `MistakeDetailScreen`).
- **FR-018**: `MistakesListScreen` MUST fetch `GET /api/coach/queue?status=all&category=${category}`. The `category` prop is required for this screen to render content.
- **FR-018a** (null guard): If `category` is null or undefined, `MistakesListScreen` MUST render null or return early — it MUST NOT render a flat list of all blunders. Null-category cross-category flat view is explicitly NOT included in this epic.
- **FR-019**: `MistakesListScreen` MUST show only "Unreviewed" and "Reviewed" filter tabs (no "All" tab). Default active tab: "Unreviewed".
- **FR-020**: The TopBar title MUST be `t('mistakes.pattern.' + category)`, meta MUST show the total count via `t('mistakes.detail.meta_count')`/`t('mistakes.detail.meta_count_pl')`, and Back MUST navigate to `go('mistakes')`.
- **FR-021**: Tapping a blunder card in `MistakesListScreen` MUST navigate to `go('blunderDetail', { blunderNavList: currentList, index: cardIndex, mistakeContext: 'list', mistakeSource: null })`, where `currentList` is the currently displayed ordered list and `cardIndex` is the tapped card's position within it.
- **FR-022**: `MistakesListScreen` MUST fire `track('mistake_category_detail_viewed', { category })` when `category` is set; otherwise fire the existing `screen_viewed` event.

#### Frontend — Level 3: `MistakeDetailScreen` extension

- **FR-023**: `MistakeDetailScreen` MUST be updated to accept nav params: `blunderNavList: Blunder[]`, `index: number`, `mistakeContext: 'list' | 'game'` (default `'list'`), `mistakeSource: { date: string, gameId: string, totalMoves: number } | null` (default `null`).
- **FR-024**: The `blunderDetail` route MUST be registered in `SCREENS` pointing to `MistakeDetailScreen`.
- **FR-025**: The `blunderDetail` route MUST be added to `SESSION_ONLY_SCREENS`.
- **FR-026**: `MistakeDetailScreen` Back button: `mistakeContext === 'list'` → `goBack()`; `mistakeContext === 'game'` → `go('review', { id: mistakeSource.gameId })`.
- **FR-027**: `MistakeDetailScreen` TopBar meta when `mistakeSource` is present: let `displayMoveNumber = blunderNavList[index].moveIndex + 1` (1-indexed; preserves existing behavior). Render a `<button>` with text "Move {displayMoveNumber} / {totalMoves} · {date} ›", tapping it calls `go('review', { id: mistakeSource.gameId })`.
- **FR-028**: `MistakeDetailScreen` TopBar meta when `mistakeSource` is null: let `displayMoveNumber = blunderNavList[index].moveIndex + 1` (1-indexed). Render plain text "Move {displayMoveNumber} / {blunderNavList.length}". Note: `blunderNavList[index].moveIndex` is the raw 0-indexed join key from the API (FR-003); add 1 for display only.
- **FR-029**: `MistakeDetailScreen` Prev/Next toolbar MUST navigate within `blunderNavList`. Counter: "{index + 1} of {blunderNavList.length}". Prev button is disabled when `index === 0`. Next button is disabled when `index === blunderNavList.length - 1`. No wrap-around at either end. `deepRevealOpen` MUST reset to false on each navigation.
- **FR-030**: `MistakeDetailScreen` MUST NOT crash when `blunderNavList` is empty or `index` is out of range.

#### Frontend — `ReviewScreen` changes

- **FR-031**: After `POST /api/games/analyze` succeeds, `ReviewScreen` MUST fire `GET /api/coach/queue?game_id=${id}` (with auth header) when `session` is non-null, and store the result as `gameBlunderList: Blunder[]` sorted by `moveIndex` asc.
- **FR-032**: Tapping a `✕` (blunder-quality) node in the move timeline MUST compute `globalPlyIndex` from the timeline node's `move.moveIndex` (1-indexed user-move ordinal, counting only the user's own plies) and `reviewContext.side` as follows:
  - `side === 'first'`: `globalPlyIndex = 2 * (move.moveIndex - 1)`
  - `side === 'second'`: `globalPlyIndex = 2 * (move.moveIndex - 1) + 1`

  Note: `move.moveIndex` is the user-move ordinal (1-indexed, user's plies only); `globalPlyIndex` is the 0-indexed global ply count across both players, matching the `moveIndex` field on blunder objects (FR-003) which is derived as `board_state.length`.

  Then look up `matchedIdx` as the index of the entry in `gameBlunderList` where `entry.moveIndex === globalPlyIndex`. If found, navigate to `go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, mistakeContext: 'game', mistakeSource: { date: formattedGameDate, gameId: id, totalMoves: analysis.fullMovestring.length } })`.
- **FR-033**: If no matching blunder is found (anonymous user, race condition, or game predating migration 036), tapping a `✕` node MUST fall back to the existing Explorer navigation.
- **FR-034**: `ReviewScreen` MUST format `gameDate` client-side from the ISO 8601 `gameDate` field returned by `POST /api/games/analyze` (e.g. "Jun 7").

#### Frontend — `MistakesGate` shared component

- **FR-040**: A `MistakesGate` component MUST be extracted from `MistakesListScreen.jsx` to `connect-four/src/components/MistakesGate.jsx`. It encapsulates the four non-populated states: signed-out gate, loading spinner, error state with Retry button, and authenticated-empty state. Callers pass the current auth/loading/error/data status and render callbacks for the empty-authenticated and signed-out content. Both `CategoryListScreen` (FR-012) and `MistakesListScreen` (its existing gate logic) MUST use `MistakesGate` rather than duplicating these states inline.

#### App shell wiring

- **FR-035**: `screenRegistry.jsx` MUST register `mistakes → CategoryListScreen`, `mistakeDetail → MistakesListScreen`, `blunderDetail → MistakeDetailScreen`.
- **FR-036**: `urlMapping.js` MUST add `{ pattern: '/blunder', screenKey: 'blunderDetail', paramNames: [] }`.
- **FR-037**: `SESSION_ONLY_SCREENS` in `urlMapping.js` MUST include `'blunderDetail'`. (`'mistakeDetail'` is already present.)
- **FR-038**: `surfaceGroups.js` MUST add `blunderDetail: '--bg-home'`.

#### i18n

- **FR-039**: The following i18n keys MUST be added to `connect-four/src/i18n/en.json` under the `mistakes` namespace:
  - `mistakes.to_review`: `"{{count}} to review"`
  - `mistakes.cat.done`: `"done"`
  - `mistakes.cat.new`: `"{{count}} new"`
  - `mistakes.detail.all_caught_up`: `"All caught up in this category!"`
  - `mistakes.detail.none_reviewed`: `"None reviewed yet — tap a blunder to study it."`
  - `mistakes.detail.meta_count`: `"{{count}} blunder"`
  - `mistakes.detail.meta_count_pl`: `"{{count}} blunders"`
  - `mistakes.detail.source_game`: `"{{date}} game"`

  Note: the "Unreviewed" / "Reviewed" tab labels in `MistakesListScreen` MUST reuse the existing `mistakes.filter.unreviewed` and `mistakes.filter.reviewed` keys. Do NOT add `mistakes.detail.tab_unreviewed` or `mistakes.detail.tab_reviewed` — those keys would be duplicates and are dead on arrival.

  Additionally, the following `mistakes.pattern.*` keys MUST be added (the two most common fallback categories from the classifier that are currently missing):
  - `mistakes.pattern.suboptimal_move`: `"Suboptimal move"`
  - `mistakes.pattern.drawing_move`: `"Drawing move"`

  The source of truth for which `mistakes.pattern.*` keys are required is `VALID_BLUNDER_TAGS` in `connect-four/server/blunderTags.js`. Every slug that can appear as `pattern_category` in the database MUST have a corresponding `mistakes.pattern.<slug>` key. Do NOT add a `mistakes.category.*` namespace.

---

### Key Entities

- **Blunder** (from `GET /api/coach/queue`): `id`, `board_state`, `move_played`, `correct_move`, `pattern_category`, `created_at`, `resolved_at`, `severity` (0–10), `threat_cells`, `game_id` (new), `moveIndex` (new, derived).
- **CategoryEntry** (client-side): `slug`, `label`, `items`, `unreviewed`, `maxSev`, `thumb`.
- **MistakeSource** (nav param): `{ date: string, gameId: string, totalMoves: number }` — context passed from `ReviewScreen` to `MistakeDetailScreen` for game-linked blunders.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with blunders in ≥3 categories can navigate from the Mistakes home to a specific blunder in under 5 taps.
- **SC-002**: After tapping a `✕` node in the Post-Game Review timeline, the user reaches the blunder detail in a single tap (with correct category, move index, and source-game link visible).
- **SC-003**: The category list correctly reflects the current reviewed/unreviewed state on every visit (no stale counts after returning from Level 3).
- **SC-004**: `MistakesListScreen` does not crash when the `category` prop is missing or undefined — it renders null or returns early. A null-category cross-category flat list is explicitly **NOT** in scope for this epic (see Epic B "NOT included: cross-category flat view").
- **SC-005**: All three levels of the Mistakes surface are reachable and functional for authenticated users; unauthenticated users see the signed-out gate at Level 1 and cannot reach Level 2 or 3.

---

## Assumptions

- Epic A has already been merged to this branch (migration 036 applied, `game_id` column exists in `blunders`, `GET /api/games` is live).
- The `POST /api/games/analyze` endpoint exists and is reachable from `ReviewScreen`; the `gameDate` field will be added as a non-breaking addition.
- `mistakes.pattern.*` i18n keys cover all DB slugs that can appear in `pattern_category`. If a new slug is introduced by future epics, its `mistakes.pattern.<slug>` key must be added at that time.
- The `blunderNavList` array is never serialised to the URL — it is passed only via the `go()` in-memory params. Deep links to `/blunder` redirect to `home` (already enforced by `SESSION_ONLY_SCREENS`).
- The `SeverityMeter` component has identical visual output before and after extraction (no style changes during refactor).
- Production screens use inline styles exclusively — no new CSS class names will be introduced.
- The existing `MistakeDetailScreen` `blunders` + `status` nav params from the (now-replaced) `mistakeDetail` route do not need backward-compatibility shims, since `mistakeDetail` is being repurposed to `MistakesListScreen` and `blunderDetail` is a new route.
