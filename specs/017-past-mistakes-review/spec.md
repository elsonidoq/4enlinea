# Feature Specification: Past Mistakes Review (Epic 3c)

**Feature Branch**: `017-past-mistakes-review`  
**Created**: 2026-06-01  
**Status**: Draft  
**Epic**: Epic 3c — Past Mistakes Review

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Past Blunders (Priority: P1)

An authenticated user navigates from the Stats screen to the Past Mistakes screen and sees a scrollable list of blunders captured during their post-game reviews, with a compact board thumbnail, pattern tag, date, and "Reviewed" badge per card. They can filter by All / Unreviewed / Reviewed.

**Why this priority**: The list screen is the entry point for the entire feature. Nothing else can be tested without blunders being visible.

**Independent Test**: Can be fully tested by signing in, having at least one blunder in the DB, navigating `go('mistakes')` from Stats, and verifying blunder cards render with correct board thumbnails and metadata.

**Acceptance Scenarios**:

1. **Given** an authenticated user with blunders in the DB, **When** they navigate to the `mistakes` screen, **Then** a scrollable list of blunder cards is shown, each with a compact board thumbnail, a pattern tag (unless `unknown`), a date, and a `Reviewed` chip when `resolved_at` is set.
2. **Given** the list is showing, **When** the user taps the "Unreviewed" filter tab, **Then** only blunders whose `resolved_at` is null are shown.
3. **Given** the user is on the "Reviewed" tab and no reviewed blunders exist, **When** the tab renders, **Then** an empty-tab message is shown: "Nothing here — switch tabs to see your other moves."
4. **Given** an authenticated user with no blunders in the DB, **When** they navigate to `mistakes`, **Then** the empty state is shown: CoachAvatar (happy), heading "No mistakes captured yet", body copy, "Play a game" CTA leading to the `difficulty` screen.
5. **Given** an unauthenticated (anonymous) user, **When** they navigate to `mistakes`, **Then** the anonymous gate is shown: user icon circle, heading "Sign up to save your mistakes", body copy, "Create free account" button, "Maybe later" ghost button — both leading to `stats`.

---

### User Story 2 — Review a Single Blunder (Priority: P1)

An authenticated user taps a blunder card and is taken to the Mistake Detail screen, where they see the board at the moment of the mistake with their played column highlighted, a pattern tag, a Coach one-liner, and a "What should I have played?" button.

**Why this priority**: The detail view is the core review action. Without it the list is a dead end.

**Independent Test**: Can be tested by tapping any blunder card in the list and verifying the board renders the correct position, the played column has the `tr` overlay, opponent threat cells have `td` overlays, and the Coach dialog text reflects the 1-indexed column number.

**Acceptance Scenarios**:

1. **Given** the user taps a blunder card, **When** the `mistakeDetail` screen loads, **Then** the board is rendered from `blunder.board_state` via `buildBoard()` with a `tr` overlay on the column the user played and `td` overlays on the opponent's major threat cells (sourced from the API response field `threat_cells`).
2. **Given** the detail screen is open, **When** the user reads the CoachDialog, **Then** it shows "You played column N here." (1-indexed) and "Let me show you what worked better."
3. **Given** the detail screen is open, **When** the user reads the TopBar, **Then** it shows "Mistake" as the title and "Move N" in the meta slot, where N is `board_state.length + 1` (the 1-based move number of the blunder).
4. **Given** the user taps the Toolbar "Next" button, **When** on the last blunder in the list, **Then** navigation wraps around to the first blunder (wrap-around), and the Deep Reveal panel (if open) is closed.
5. **Given** the user taps "Mark as reviewed", **When** the server call succeeds, **Then** the button changes to a ghost "Marked as reviewed" with a check icon, and the card in the list is updated with the Reviewed chip on next render.

---

### User Story 3 — Ask the Coach What to Play (Deep Reveal) (Priority: P2)

From the Mistake Detail screen, the user taps "What should I have played?" and sees an LLM explanation for the correct move, including a best line, with the ability to flag the explanation.

**Why this priority**: The Deep Reveal is the core learning moment, but the list and detail screens deliver value independently.

**Independent Test**: Can be tested by tapping "What should I have played?" and verifying the Deep Reveal bottom sheet opens with an explanation, bestLine chips, and a "Flag this explanation" button.

**Acceptance Scenarios**:

1. **Given** the user taps "What should I have played?", **When** the explanation is loading, **Then** a spinner is shown inside the bottom sheet.
2. **Given** the explanation loads from a cache hit, **When** the sheet renders, **Then** the explanation and bestLine chips appear instantly with no spinner (cached response).
3. **Given** the explanation loads from the LLM, **When** the sheet renders, **Then** pattern tags, the LLM explanation paragraph, bestLine chips (first chip = correct_move + 1 as "Col N"), and a "Flag this explanation" button are all shown.
4. **Given** the LLM call takes more than 6 seconds, **When** the timeout fires, **Then** the sheet shows the Tier-1 fallback text and "Detailed explanation unavailable." instead of the LLM response.
5. **Given** the user taps "Flag this explanation", **When** the request completes, **Then** a brief confirmation "Thanks — flagged for review" is shown; the explanation panel remains visible and open.

---

### Edge Cases

- **Anonymous user accesses `mistakes` screen directly**: The `out` variant gate is shown; no API call to `GET /api/coach/queue` is made.
- **Empty filtered list within the `in` variant** (e.g., user taps "Reviewed" but has no reviewed blunders): show "Nothing here — switch tabs to see your other moves." inline within the list area; the filter tabs and top bar remain visible.
- **`pattern_category === 'unknown'`**: The pattern tag element is not rendered on either the list card or the detail screen. All other card content renders normally.
- **Deep Reveal quota exhausted**: The `/api/explain-move-llm` endpoint returns 429. The sheet shows "Your weekly Coach limit has been reached." with an upgrade prompt (reuses `UpgradeModal`).
- **Resolve endpoint returns an error**: Show no UI change; the "Mark as reviewed" button reverts to its prior state; no silent failure.
- **Blunder list longer than 50**: The API caps at 50 rows; no pagination UI is required. If the user has more than 50 blunders only the 50 most recent are shown.
- **Navigating back from `mistakeDetail` while a filter is active**: The `mistakes` list screen preserves the active filter tab from the session (state held in component).
- **Board thumbnail for a blunder**: `board_state` may be an empty string (degenerate case). In that case, render an empty board thumbnail; do not throw.

---

## Requirements *(mandatory)*

### Functional Requirements

**List screen (`mistakes`)**

- **FR-001**: The `mistakes` screen MUST show the anonymous gate variant when `req.user` is null (no signed-in session).
- **FR-002**: The `mistakes` screen MUST show the empty-state variant when the authenticated user has no blunders (`blunders` array is empty from the API).
- **FR-003**: The `mistakes` screen MUST show the blunder list variant when the authenticated user has one or more blunders.
- **FR-004**: The list MUST have three filter tabs: All, Unreviewed, Reviewed. The default active tab MUST be "All".
- **FR-005**: Each blunder card MUST display: compact non-interactive Board thumbnail with `tr` overlay on the played column and `td` overlays on opponent major threat cells (from `threat_cells`), pattern category tag (hidden for `unknown`), date string, and Reviewed chip when `resolved_at` is set.
- **FR-006**: Tapping a blunder card MUST set the selected blunder ID in shared state and navigate to `mistakeDetail`.
- **FR-007**: Data MUST be fetched from `GET /api/coach/queue?status=all` once on screen mount; tab filtering (All / Unreviewed / Reviewed) MUST be performed client-side by filtering the in-memory array on `resolved_at`. This allows mark-as-reviewed to update the tab counts in-memory without a re-fetch. The `?status` query parameter MUST still be implemented server-side for API contract completeness.
- **FR-008**: The list MUST track the `screen_viewed` analytics event on mount.

**Detail screen (`mistakeDetail`)**

- **FR-009**: The `mistakeDetail` screen MUST build the board from `blunder.board_state` using `buildBoard()`.
- **FR-010**: The `tr` overlay MUST be placed on the column the user played (`move_played`, 0-indexed), at the row `buildBoard(board_state).heights[move_played]` — this is the landing row of the blunder disc, since `board_state` is the position *before* the blunder move was placed (verified: server writes `board_state: puzzle.move_string` at evaluation time). `td` overlays MUST be placed on each cell in `threat_cells` returned by the API.
- **FR-011**: The CoachDialog MUST show "You played column N here." (1-indexed from `move_played`) and "Let me show you what worked better." with `mood: 'think'`.
- **FR-012**: The TopBar meta slot MUST show "Move N" where N is `board_state.length + 1` (the 1-based move number of the blunder, derived from the movestring length; no denominator is shown because total game length is not stored).
- **FR-013**: Tapping "What should I have played?" MUST render a `<DeepRevealButton moves={board_state} candidateCol={correct_move} trackingContext="past_mistakes" />`. The component will be extended (as part of this feature) to call `POST /api/explain-move-llm` with `{ movestring: moves, col: candidateCol }`; caching is handled server-side. Note: `DeepRevealButton` accepts `moves` (movestring string) and `candidateCol` (0-indexed integer) — not `movestring`/`col`. The component currently calls `/api/explain-move` and must be updated.
- **FR-014**: The Deep Reveal bottom sheet MUST display the LLM explanation, bestLine column chips, and a "Flag this explanation" button. Note: the `/api/explain-move-llm` response does not include a `patternTag` field — pattern context for the mistake comes from `blunder.pattern_category` and may be shown above the button separately if desired, but the sheet itself renders `explanation` + `bestLine` + Flag button from the LLM response.
- **FR-015**: Tapping "Flag this explanation" MUST call `POST /api/llm-feedback` with `feature: 'past_mistakes'` and show a brief inline confirmation.
- **FR-016**: The "Mark as reviewed" button MUST call `POST /api/coach/queue/:blunderId/resolve` and, on success, update local state so the button becomes a ghost "Marked as reviewed" with a check icon.
- **FR-017**: Toolbar Prev/Next buttons MUST navigate through the current filtered list with wrap-around, and MUST reset the Deep Reveal panel to closed on each navigation.
- **FR-018**: The `mistake_reviewed` analytics event MUST be tracked when the detail screen loads for a blunder.
- **FR-019**: The `deep_reveal_viewed` analytics event MUST be tracked when the Deep Reveal panel opens, with `{ context: 'past_mistakes', cached }`. Implementation note: `DeepRevealButton` internally calls `track('deep_reveal_viewed', ...)` on success; the `trackingContext` prop is threaded into that call to add `context`. The `MistakeDetailScreen` must NOT fire a second `deep_reveal_viewed` event via `onReveal` to avoid double-counting.

**Backend: `GET /api/coach/queue`**

- **FR-020**: The endpoint MUST be protected by `requireAuth` (401 if unauthenticated). The existing `requirePaid` gate MUST be removed.
- **FR-021**: The endpoint MUST accept a `?status` query parameter with values `all` (default), `unreviewed`, `reviewed`, and filter accordingly.
- **FR-022**: The response MUST return `{ blunders: [...], total: number }` where each blunder object is `{ id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at, threat_cells }`. The `threat_cells` field is an array of `{ col, row }` objects for the opponent's major threat cells after the blunder move. It is computed server-side by building `new Board(board_state + move_played)`, calling `.majorThreatCells()` (which returns a `"row,col"` → `{ rm, rn, ym, yn }` map), then filtering for entries where the opponent's major-threat flag (`rm` for Red opponents, `ym` for Yellow opponents) is true, and mapping to `{ col, row }`. The opponent is the player whose turn it is in the post-blunder position. This avoids a client-side round-trip and reuses the existing server-side `Board` class.
- **FR-023**: The response MUST be capped at 50 rows. No pagination.
- **FR-024**: The puzzle join MUST be removed from the query.

**Backend: `POST /api/coach/queue/:blunderId/resolve`**

- **FR-025**: The endpoint MUST be protected by `requireAuth` (401 if unauthenticated). The existing `requirePaid` gate MUST be removed.
- **FR-026**: The `blunderId` path parameter MUST be used as a raw UUID string (the existing `parseInt()` call MUST be removed). A non-empty string validation MUST replace the `isNaN` check.
- **FR-027**: Ownership check (`eq('user_id', req.user.id)`) MUST remain in place.

### Key Entities

- **Blunder**: A record in the `blunders` table representing a sub-optimal move made during a sparring game and captured during post-game review. Key fields for this feature: `id` (uuid), `board_state` (movestring of the position *before* the blunder move — equal to `puzzle.move_string`), `move_played` (0-indexed column of the blunder), `correct_move` (0-indexed column of the better move), `pattern_category` (slug), `created_at`, `resolved_at` (null = unreviewed).
- **ExplanationCache**: The `explanation_cache` table stores LLM deep-reveal responses keyed by `SHA256(movestring + ":" + col)` (verified in server `index.js` line 694). Cache hits are served without an LLM call and without consuming weekly quota.
- **ThreatCells**: An array of `{ col, row }` objects representing the opponent's major threat cells in the post-blunder position. Computed server-side and returned in the `GET /api/coach/queue` response to avoid a client-side round-trip.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated user with at least one blunder can open Past Mistakes from Stats, read the board thumbnail and pattern tag on a card, and navigate to the detail screen in under 3 taps.
- **SC-002**: The "What should I have played?" Deep Reveal serves a cached explanation instantly (no spinner) when the same board position + correct_move has been requested before by any user.
- **SC-003**: Tapping "Mark as reviewed" reflects the change immediately in the UI (optimistic update style) with no page reload.
- **SC-004**: All three list variants (anonymous gate, empty state, populated list) render correctly without errors regardless of auth state or blunder count.
- **SC-005**: The `pattern_category === 'unknown'` slug never produces a visible tag label anywhere in the UI.
- **SC-006**: The resolve endpoint correctly identifies and updates the blunder record by UUID; no blunder owned by a different user is modified.

---

## Assumptions

- Migration 027 (adding `'unknown'` to the `blunders.pattern_category` CHECK constraint) was applied in Epic 3b. This epic does not create a new migration.
- **[CORRECTED]** `DeepRevealButton` (`connect-four/src/components/DeepRevealButton.jsx`) is NOT reusable as-is. The component currently calls `POST /api/explain-move` with `{ moves, candidateCol, requestDeepReveal: true }` and renders only `patternTag` + `fullText` from `data.deepReveal`. It must be extended to: call `POST /api/explain-move-llm` with `{ movestring: moves, col: candidateCol }`; unwrap the response directly (no `.deepReveal` wrapper); render `explanation` + bestLine chips + Flag button. An optional `trackingContext` prop is added. Props remain `moves` (movestring string) and `candidateCol` (0-indexed integer).
- A `requireAuth` middleware (or equivalent inline check for `req.user`) exists or will be added; the existing `requirePaid` middleware is replaced by this lighter guard on both coach endpoints.
- **[VERIFIED]** The `board_state` column in `blunders` is set to `puzzle.move_string` at evaluation time (server line 1488: `board_state: puzzle.move_string`). This is the movestring *before* the blunder move was placed. Building `buildBoard(board_state)` gives the pre-blunder board state. The blunder disc lands at row `heights[move_played]` (not `heights[move_played] - 1`).
- `td` overlays for opponent major threat cells are included in the `GET /api/coach/queue` response as `threat_cells`, computed server-side via `board.majorThreatCells()` (the Board class method — not the standalone `getMajorThreatCells` export). No additional client-side round-trip is needed.
- The blunder list is ordered by `created_at` ascending (oldest first) to match the pre-existing query order on the server. This is the order for Prev/Next navigation.
- Anonymous users see the gate variant immediately; no API call is made to `GET /api/coach/queue` for unauthenticated sessions.
- The `blunders` table is populated by Epic 3b's post-game analysis flow. This epic adds no new write paths to `blunders`.
- The Prev/Next navigation and filter state are held in component-local React state; they are not persisted to the store or URL.
- i18n keys for pattern tag labels follow the `mistakes.pattern.<slug>` namespace (e.g., `mistakes.pattern.forced_block` → "Forced block"). All user-facing strings use `t()`.
- **[VERIFIED]** The `explain-move-llm` endpoint computes its cache key as `SHA256(movestring + ":" + col)` (server line 694), which matches `SHA256(board_state + ":" + correct_move)` when called from this feature. Explanations are shared across features for the same position+col pair.

---

## Out of Scope

- Spaced-repetition scheduling or requeue ordering
- Weakness map / prescriptive drills (Gap 22)
- Anonymous blunder history (blunders require `user_id`)
- Server-side async jobs
- Stripe / payment gating
- `CoachPage.jsx` (retired in Epic 1b; this epic builds the UI new from the mockup)
- Prev/Next navigation crossing filter boundaries
- Pagination beyond 50 blunders
- Any new DB migrations
