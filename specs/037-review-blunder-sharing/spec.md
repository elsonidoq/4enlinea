# Feature Specification: Review & Blunder Sharing

**Feature Branch**: `037-review-blunder-sharing`  
**Created**: 2026-06-17  
**Status**: Draft  

## Overview

Three focused improvements to the game-review and blunder surfaces:

1. **Player-color clarity** — every review screen shows a persistent chip indicating whether the user played Green or Gray.
2. **Game-navigation sorting** — the past-games list can be reordered by "played well", "worst blunders", or "recent".
3. **Blunder permalinks** — each blunder has a shareable URL that anyone with the link can view without signing in.

---

## User Scenarios & Testing

### User Story 1 — Player-Color Chip on Review Screens (Priority: P1)

A player finishes a sparring game and taps "Review". After reviewing several moves, they can always see a persistent "You played Green" or "You played Gray" chip so they never lose track of which discs are theirs while stepping through the board.

The same chip appears when they browse their past blunders list and open an individual blunder detail.

**Why this priority**: Orientation is the most fundamental need on any review surface. Without it every other review feature is harder to use. It unblocks correct interpretation of board highlights, threat cells, and the coach commentary.

**Independent Test**: Navigate to the post-game review screen for any completed sparring game; verify a persistent chip reading "You played Green" or "You played Gray" is visible throughout the review.

**Acceptance Scenarios**:

1. **Given** a completed sparring game where the user played first (Green), **When** the user enters the review screen, **Then** a persistent "You played Green" chip is visible on screen at all times during review navigation.
2. **Given** a completed sparring game where the user played second (Gray), **When** the user enters the review screen, **Then** a persistent "You played Gray" chip is visible.
3. **Given** the user opens the Explorer from a review, **When** the Explorer screen loads, **Then** the same color chip is visible.
4. **Given** the user opens the mistakes list and browses a blunder item, **Then** each blunder item shows the color the user was playing during that position (derived from `board_state` length: even-length = Green turn = user was Green; odd-length = Gray turn = user was Gray).
5. **Given** the user opens an individual blunder detail screen, **Then** the color chip is visible and consistent with the blunder list entry.

---

### User Story 2 — Sort Past Games by Usefulness (Priority: P2)

A player wants to focus their review time on games where they made the most blunders. They tap a sort control on the past-games list and select "Worst Blunders". The list instantly reloads with their highest-blunder games at the top.

They can also switch to "Played Well" to celebrate their best-accuracy games, or return to "Recent" for chronological order.

**Why this priority**: Sorting transforms a flat game history into a learning tool. Players with many games would otherwise have to scan chronologically to find high-value review material.

**Independent Test**: With at least 3 past games that have different blunder counts, select "Worst Blunders" sort; verify the game with the most blunders appears first.

**Acceptance Scenarios**:

1. **Given** the past-games list is open, **When** the user selects "Worst Blunders", **Then** games are reloaded in descending blunder count order; games with equal blunder counts are ordered newest-first.
2. **Given** the user selects "Played Well", **Then** games are reloaded in descending accuracy order; games with no accuracy score (not yet analyzed) appear after games that have an accuracy score; among equal-accuracy games, newest-first.
3. **Given** the user selects "Recent", **Then** games are in descending creation-date order (matches current default behavior).
4. **Given** the user first selects "Worst Blunders" and then "Recent", **Then** the list updates correctly for each selection.
5. **Given** the user visits the past-games list for the first time (no explicit sort chosen), **Then** the list shows games in "Recent" order (no change from current behavior).

---

### User Story 3 — Share a Blunder via Permalink (Priority: P3)

A player finds an interesting blunder they made, wants to share it with a friend on social media or in a chat. They copy the URL of the blunder page and send it. Their friend opens the link without an account and sees the full blunder: the board position, which move was played, what the correct move was, and the pattern type. The "Mark as reviewed" button is not visible to the friend (it's a write action that belongs to the owner). Deep Reveal shows a "Sign in to unlock" prompt instead of being hidden.

The blunder URL is not indexed by search engines.

**Why this priority**: Sharing is a growth feature. It depends on the endpoint and routing work from Stories 1 and 2 being stable, so it lands third.

**Independent Test**: Copy a `/blunder/:id` URL, open it in a private/incognito browser window (no session), and verify the blunder renders fully with the board, pattern label, and severity; "Mark as reviewed" is absent; Deep Reveal shows a sign-in prompt.

**Acceptance Scenarios**:

1. **Given** a signed-in user is on their blunder detail screen, **When** they copy the URL, **Then** the URL has the form `/blunder/<uuid>`.
2. **Given** an unauthenticated visitor navigates directly to `/blunder/<uuid>`, **Then** the full blunder detail renders (board state, pattern category, severity, move played vs correct move) without requiring sign-in.
3. **Given** an unauthenticated visitor on `/blunder/<uuid>`, **Then** the "Mark as reviewed" button is not visible.
4. **Given** an unauthenticated visitor on `/blunder/<uuid>`, **Then** the Deep Reveal section is visible but shows a "Sign in to unlock" prompt rather than the Deep Reveal content.
5. **Given** a signed-in user who is NOT the owner of the blunder navigates to `/blunder/<uuid>`, **Then** "Mark as reviewed" is not visible; Deep Reveal is visible normally (they are authenticated).
6. **Given** a visitor navigates to `/blunder/<uuid>` for a non-existent blunder, **Then** the app renders a not-found state rather than crashing.
7. **Given** the URL `/blunder/<uuid>` is shared on social media, **Then** the link preview shows a meaningful title ("Connect Four blunder — \<pattern_category\>") and description; the page is not indexed by search engines.
8. **Given** a user on the blunder detail screen copies and immediately opens the URL in a new tab (cold load — no prior navigation state), **Then** MistakeDetailScreen loads and renders the blunder fully.

---

### Edge Cases

- Blunder with no linked game (`game_id = null`): color chip on MistakeDetailScreen falls back to the `board_state`-length heuristic; no chip is hidden.
- Game with `accuracy = null` (not yet analyzed): sorted under "Played Well" after all games that have an accuracy value; not excluded from the list.
- `GET /api/blunders/:id` called with a malformed non-UUID string: returns `400 { "error": "invalid id" }`.
- `GET /api/blunders/:id` called with a valid UUID that does not exist: returns `404 { "error": "not found" }`.
- Past-games list called with an unrecognised `?sort=` value: returns `400 { "error": "invalid sort" }`.
- User opens `/blunder/:id` cold boot when the server fetch for OG tags fails: page still loads as plain SPA (noindex still injected); MistakeDetailScreen fetches the blunder client-side and renders or shows a not-found state.
- Visiting `/blunder/:id` cold boot with the screen previously in SESSION_ONLY_SCREENS: redirect to `home` no longer fires; the screen fetches data from the API and renders.

---

## Requirements

### Functional Requirements

**Server — player-color data**

- **FR-001**: `GET /api/games` MUST include `side` (`'first'` | `'second'`) in every game object in the response, sourced from the `games` table (AI games) and `papergames_games` table (paper games). `'first'` means the user moved first (Green); `'second'` means the user moved second (Gray).

**Frontend — player-color chip**

- **FR-002**: `ReviewScreen` MUST display a persistent chip reading "You played Green" or "You played Gray" derived from `analysis.side` (`'first'` → Green, `'second'` → Gray). The chip MUST remain visible throughout all move-navigation states.
- **FR-003**: `ExplorerScreen` MUST display the same persistent chip using the `side` prop it already receives.
- **FR-004**: `MistakesListScreen` MUST display a color chip on each blunder list item. The chip color is derived from the blunder's `board_state` length: even length → user was Green (it was Green's turn, so the user — who always owns their blunders — played Green); odd length → user was Gray. This is the canonical heuristic until per-blunder `side` data is available.
- **FR-005**: `MistakeDetailScreen` MUST display a color chip using the same heuristic as FR-004. The existing color derivation is already correct; the only change required is to restyle the current inline text into a persistent chip matching the visual treatment in FR-002/FR-003.
- **FR-006**: The chip label MUST use the color names "Green" and "Gray" (matching the app's existing disc color terminology), not "Player 1"/"Player 2" or "Red"/"Yellow".

**Server — game sorting**

- **FR-007**: `GET /api/games` MUST accept an optional `?sort=` query parameter with three valid values: `recent`, `played_well`, `worst_blunders`.
- **FR-008**: When `?sort=` is absent, the endpoint MUST default to `recent` order (no behavior change for existing callers).
- **FR-009**: `sort=recent` MUST sort by `created_at` descending.
- **FR-010**: `sort=played_well` MUST sort by `accuracy` descending with null values last, then by `created_at` descending as a tiebreaker. Games with `accuracy = null` MUST be included (not excluded) and appear after all games that have an accuracy value.
- **FR-011**: `sort=worst_blunders` MUST sort by `blunder_count` descending, then by `created_at` descending as a tiebreaker.
- **FR-012**: Any `?sort=` value other than the three valid values MUST return `400 { "error": "invalid sort" }`.
- **FR-013**: Sorting MUST be applied in JavaScript on the merged array of AI and paper games (after fetching both tables), not via SQL `ORDER BY` — because the two tables are fetched separately and merged before slicing.

**Frontend — sort picker**

- **FR-014**: `PastGamesListScreen` MUST display a sort-picker control (segmented control or select element) with three options labelled "Recent", "Played Well", "Worst Blunders".
- **FR-015**: Changing the sort selection MUST trigger a new fetch of `GET /api/games?sort=<value>` and replace the displayed list with the new results.
- **FR-016**: The sort picker MUST default to "Recent" on first load. Sort selection MUST be stored in component state only and MUST reset to "Recent" every time the screen mounts. No localStorage or store persistence is required.

**Server — blunder permalink endpoint**

- **FR-017**: A new `GET /api/blunders/:id` endpoint MUST exist. It requires no authentication. It MUST NOT apply a `user_id` filter when querying the database.
- **FR-018**: `GET /api/blunders/:id` MUST validate that `:id` is a valid UUID format; invalid values MUST return `400 { "error": "invalid id" }`.
- **FR-019**: `GET /api/blunders/:id` MUST return `404 { "error": "not found" }` when the UUID is valid but no matching row exists.
- **FR-020**: `GET /api/blunders/:id` MUST return `200` with a blunder object containing: `id`, `board_state`, `move_played`, `correct_move`, `pattern_category`, `created_at`, `resolved_at`, `severity`, `blunder_severity`, `game_id`, `moveIndex`, `threat_cells`, and one additional boolean field `is_owner`. With the exception of `is_owner`, the shape MUST be field-for-field identical to `GET /api/coach/queue` items so `MistakeDetailScreen` needs no adapter.

**Server — OG meta injection**

- **FR-021**: The SPA catch-all handler MUST match `/blunder/:id` URLs and inject server-side `<head>` meta tags: `og:title` ("Connect Four blunder — \<pattern_category\>"), `og:description` ("See this Connect Four mistake on DecodeC4."), and `<meta name="robots" content="noindex, nofollow">`.
- **FR-022**: If the blunder fetch for OG injection fails or returns 404, the handler MUST still serve `index.html` with at minimum the `noindex` meta tag.

**Frontend — routing and cold-boot**

- **FR-023**: `blunderDetail` MUST be removed from `SESSION_ONLY_SCREENS` in `urlMapping.js`.
- **FR-024**: The existing `/blunder` entry in `URL_MAP` in `urlMapping.js` (which currently has `paramNames: []`) MUST be replaced with an entry using `paramNames: ['id']`. A literal add would produce two `blunderDetail` entries; this is a replacement, not an addition. All existing `go('blunderDetail', ...)` call sites throughout the codebase MUST be updated to include `id` in the params object; any call site that does not pass `id` will produce a URL of `/blunder/undefined`.
- **FR-025**: `MistakeDetailScreen` MUST support a cold-boot path: when the screen is loaded with an `id` prop but no `blunderNavList`, it MUST fetch `GET /api/blunders/:id`, construct a single-item `blunderNavList` array from the response, and render normally using the existing `blunderNavList + index` props (no new prop API). While the fetch is in flight, the screen MUST show a loading indicator (spinner or skeleton). If the fetch returns 404, the screen MUST render a not-found state ("Blunder not found"). If the fetch returns any other error, the screen MUST render a generic error state.
- **FR-026**: `MistakeDetailScreen` MUST render a not-found state (e.g., "Blunder not found") when the cold-boot fetch returns 404. (Generic errors are covered by FR-025.)

**Frontend — read-only view for non-owners**

- **FR-027**: The "Mark as reviewed" button on `MistakeDetailScreen` MUST only be rendered when the signed-in user is the owner of the blunder. For signed-out users and non-owners, the button MUST be hidden (JSX gate).
- **FR-028**: The Deep Reveal section on `MistakeDetailScreen` MUST be visible to all visitors (including signed-out). For signed-out users, it MUST show a "Sign in to unlock" prompt instead of the Deep Reveal trigger/content. For signed-in users (owner or not), Deep Reveal functions normally.

**Ownership determination**

- **FR-029**: Ownership is signalled by the `is_owner` boolean in the `GET /api/blunders/:id` response (see FR-020). The server MUST compute `is_owner = (req.user?.id === row.user_id)` and include it in the response. No `user_id` UUID is exposed to the client. `MistakeDetailScreen` MUST gate the "Mark as reviewed" button and Deep Reveal state on `blunderItem.is_owner` (from the `blunderNavList` entry) rather than performing any client-side user-id comparison.

### Key Entities

- **Blunder**: a recorded mistake from a past game. Has `id` (UUID), `board_state` (movestring), `move_played`, `correct_move`, `pattern_category`, `severity`, `blunder_severity`, `game_id`, `moveIndex`, `threat_cells`, `created_at`, `resolved_at`, `user_id`.
- **Game** (unified): merged AI + paper games record. Gains `side` field in the API response. `blunder_count` is already present.
- **`side`**: `'first'` = user moved first (Green discs); `'second'` = user moved second (Gray discs).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: On every game-review and blunder-review screen, a user can identify their disc color within 2 seconds of the screen loading — without tapping, scrolling, or opening any menu.
- **SC-002**: A user can sort their past-games list by any of the three sort options and see the reordered list within one interaction (a single tap/select).
- **SC-003**: A blunder permalink URL can be opened in a fresh browser session (no account, no prior navigation) and the full blunder detail renders correctly 100% of the time the blunder exists.
- **SC-004**: Unauthenticated visitors to a blunder permalink see a read-only view — "Mark as reviewed" is absent and Deep Reveal shows a sign-in prompt — on every visit without exception.
- **SC-005**: The `/blunder/:id` page is not returned in search engine results (noindex confirmed by inspecting page source).

---

## Not Included

- Public discovery of blunders (no sitemap entries, no public blunder directory, no indexing).
- Social auto-posting or a sharing UI beyond copying the existing URL.
- Any change to the owner-scoped write or delete model for blunders.
- Paid-tier gating on viewing blunder permalinks.
- Per-blunder `side` data stored on the `blunders` table (the heuristic from `board_state.length` is the current approach; a future epic may add a `side` column to `blunders`).
- Token-scoped or expiring share links.

---

## Assumptions

- The `blunders` table has a `user_id` column that identifies the owner. `GET /api/blunders/:id` exposes ownership via the `is_owner` boolean (server-computed from `req.user?.id === row.user_id`) rather than exposing the raw `user_id` UUID to the client.
- The `blunders` table has a `blunder_severity` column (already confirmed in the coach queue contract).
- `side` is already stored in the `games` table and `papergames_games` table and selected by the existing `GET /api/games` query — the only change needed is forwarding it into the unified response object.
- The `board_state`-length heuristic for color (even length → Green's turn, meaning the blunder was committed by Green; odd length → Gray's turn) is the best available signal until a `side` column is added to the `blunders` table. This heuristic is correct for standard blunders recorded during post-game review where the move that was played is at the `board_state` position.
- The app's existing `/game/:id` OG catch-all pattern (server-side fetch + `<head>` injection) is the correct model for `/blunder/:id`; no new infrastructure is needed.
- Existing `MistakeDetailScreen` prop aliases (`blunderNavList` as `navList`, `index` as `initialIndex`) are preserved; the cold-boot path constructs a single-item array rather than introducing new props.
- The Deep Reveal feature on `MistakeDetailScreen` already has a conditional rendering path; adding a "Sign in to unlock" branch for unauthenticated users is a small JSX change, not an architectural change.
