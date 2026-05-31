# Feature Specification: Challenges — Set Picker, Single-Move Board & Tier-1 Feedback (Epic 2a)

**Feature Branch**: `101-new-design`  
**Created**: 2026-05-30  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and Enter a Challenge Set (Priority: P1)

An anonymous or signed-in user opens Challenges from the Home Hub. They see a list of challenge sets with category names, difficulty stars, and actual puzzle counts sourced from the server. They tap a free set and the board screen opens immediately with their first puzzle.

**Why this priority**: The Set Picker is the entry point to the entire Challenges surface. Without it, nothing else in this epic is reachable.

**Independent Test**: Navigate to the `setpicker` screen, verify the list renders with live counts from `GET /api/puzzles/counts`, tap a free set, verify the `challenge` screen opens with the drawn puzzles for that category.

**Acceptance Scenarios**:

1. **Given** the user is on the Set Picker, **When** `GET /api/puzzles/counts` responds, **Then** each set card shows the actual approved count (e.g., "8 positions"); sets with count = 0 are hidden entirely.
2. **Given** a free set card is tapped, **When** navigation occurs, **Then** the `challenge` screen opens and the first puzzle is loaded via `GET /api/puzzles/draw?category=<slug>&n=8`.
3. **Given** a Pro set card is tapped, **When** the user is on a free tier, **Then** the `UpgradeModal` (waitlist capture) appears; no navigation to the challenge screen occurs.
4. **Given** the user is on the Set Picker, **When** they tap the back arrow, **Then** they navigate to the `home` screen.
5. **Given** the Set Picker mounts, **When** analytics fires, **Then** `track('screen_viewed', { screen: 'setpicker' })` is called. *(Note: the Epic 2a doc used `set_picker`; `setpicker` is correct — matches the screen registry. The Epic doc contained a typo.)*

---

### User Story 2 — Solve a Single-Move Puzzle (Priority: P1)

A user on the challenge board sees a board position and a category prompt in the Coach dialog. They tap a column to commit their move. The board shows the placed disc with a drop animation and a quality badge on that column.

**Why this priority**: This is the core interactive loop of the Challenges surface. All feedback and analytics depend on this move being committed correctly.

**Independent Test**: Load a puzzle in the `challenge` screen, tap a column, verify the disc animates in, a badge appears on that column, and `POST /api/evaluate-move` is called with the correct `movestring` and `col`.

**Acceptance Scenarios**:

1. **Given** the board is in pre-move state, **When** the user taps a column, **Then** the disc animates into the lowest available row in that column (drop animation).
2. **Given** the move is committed, **When** the response from `POST /api/evaluate-move` arrives, **Then** a column badge (`good`/`mid`/`bad`) appears on the played column.
3. **Given** the move is committed, **When** it is marked `good` (optimal), **Then** the win-line overlay (`win` type) highlights the four-in-a-row if the position is a win.
4. **Given** the move is committed, **When** any quality is returned, **Then** the CoachDialog updates with the resolved phrase (`t(coachPhraseKey)`) and the correct mood.
5. **Given** the board is in pre-move state, **When** the user taps the Hint button, **Then** the CoachDialog shows a hint from `coach.<category>.hint.*` pool that names the task without revealing the column; accuracy is not affected.
6. **Given** the board is in pre-move state, **When** the user has NOT yet played, **Then** the Toolbar shows only the Hint button (no Undo, no Retry).

---

### User Story 3 — Receive Tier-1 Post-Move Feedback (Priority: P1)

After playing a move, the user sees the quality tag, a one-line summary, and a "Learn more ▼" link below the board. The coach phrase in the dialog corresponds to the move quality and the detected category.

**Why this priority**: Tier-1 feedback is the immediate educational payoff for every puzzle attempt. It is what distinguishes this experience from a bare puzzle checker.

**Independent Test**: Commit a move, verify the Tier-1 strip appears with a quality tag, summary line (resolved from `summaryLineKey`), and "Learn more ▼" button. Verify the Toolbar shows only "Next →".

**Acceptance Scenarios**:

1. **Given** the move is evaluated as `optimal`, **When** Tier-1 strip renders, **Then** quality tag reads "✓ Optimal", badge is `good` (green).
2. **Given** the move is evaluated as `suboptimal`, **When** Tier-1 strip renders, **Then** quality tag reads "? Suboptimal", badge is `mid` (amber).
3. **Given** the move is evaluated as `blunder`, **When** Tier-1 strip renders, **Then** quality tag reads "✕ Blunder", badge is `bad` (red).
4. **Given** the user taps "Learn more ▼" and is anonymous, **When** the AuthModal gate is checked, **Then** `AuthModal` appears instead of Deep Reveal.
5. **Given** the user taps "Learn more ▼" and is authenticated with weekly limit reached, **When** the quota gate is checked, **Then** `UpgradeModal` appears.
6. **Given** the post-move state, **When** the user taps "Next →", **Then** the session advances to the next puzzle (or to the `summary` screen if all puzzles are done). *(Flag icon is Epic 2b scope.)*

---

### User Story 4 — Progress Through a Session (Priority: P2)

The user sees a progress counter ("3 / 8") and a progress bar that fills as they advance. When all 8 puzzles are completed, navigation goes to the Post-Set Summary screen.

**Why this priority**: Session continuity and completion tracking are required for accuracy rollup in the Post-Set Summary (Epic 2b). The progress counter gives the user orientation during the session.

**Independent Test**: Complete all drawn puzzles (or advance through all), verify the counter increments correctly and that the final "Next →" navigates to the `summary` screen with the session results.

**Acceptance Scenarios**:

1. **Given** 3 of 8 puzzles have been completed, **When** the Challenge Board renders, **Then** the progress counter shows "3 / 8" and the ProgressBar fill is 37.5%.
2. **Given** the last puzzle (8 of 8) is completed and "Next →" is tapped, **When** navigation fires, **Then** the user arrives at the `summary` screen; session results (`results` array) are passed as navigation params.
3. **Given** the user taps the back arrow during an active session, **When** the confirmation dialog appears, **Then** options are "Keep going" and "Leave"; choosing "Leave" discards the session and navigates to `setpicker`.
4. **Given** `store.recordPuzzleAttempt(...)` is called for each puzzle, **When** the session ends, **Then** solved-puzzle exclusion will work correctly in future sessions for this category.

---

### Edge Cases

- **Zero-count categories**: Set Picker hides sets with count = 0 (does not show them as locked or disabled — hidden entirely per Gap 6a).
- **Fewer than 8 approved puzzles**: `GET /api/puzzles/draw` returns all available; session runs with fewer puzzles (e.g., "5 / 5"); UI adapts without error.
- **Empty board special case**: `POST /api/evaluate-move` uses the hardcoded `EMPTY_BOARD_SCORES` constant if the movestring is empty.
- **Full column**: Board blocks tapping a full column; no move committed.
- **Losing position**: All scores are negative; scorer applies the losing-position rule (Optimal = least negative; Blunder = more than 4 score points below least negative).
- **Tied moves**: A move matching the best available score is Optimal (no separate "tie" state).
- **Pro user flow**: Pro users see all sets unlocked; `category=mixed` is available.
- **Anonymous "Learn more" tap**: Opens AuthModal, not Deep Reveal, not UpgradeModal.
- **Quota-exhausted "Learn more" tap (authenticated)**: Opens UpgradeModal.
- **Back during first puzzle**: Confirmation dialog still appears (no "first puzzle" exception).

## Requirements *(mandatory)*

### Functional Requirements

**Set Picker Screen**

- **FR-001**: On mount the Set Picker MUST call `GET /api/puzzles/counts` and display the returned approved count for each category in its corresponding set card.
- **FR-002**: The Set Picker MUST hide any set card whose approved count is 0 (not show it as locked — hidden entirely).
- **FR-003**: The Set Picker MUST render set cards for all categories defined in `server/challengeSets.js`, in the order specified by that module.
- **FR-004**: Free set cards MUST be tappable and navigate to the `challenge` screen with `{ category }` param passed to `go('challenge', { category })`.
- **FR-005**: Pro set cards MUST render with a padlock icon and grayed appearance; tapping MUST open the `UpgradeModal` (waitlist capture with email input and "Notify me" button; no Stripe redirect).
- **FR-006**: Each set card MUST display the category's display name, star difficulty rating, and approved position count.
- **FR-007**: The Set Picker MUST fire `track('screen_viewed', { screen: 'setpicker' })` on mount. *(The Epic 2a doc used `set_picker`; `setpicker` is the canonical key per the screen registry. The epic doc was a typo.)*
- **FR-008**: The back arrow MUST navigate to `go('home')` without a confirmation dialog.

**Challenge Board — Pre-Move**

- **FR-009**: On entering the `challenge` screen the board MUST call `GET /api/puzzles/draw?category=<slug>&n=8` to load the session's puzzle set.
- **FR-010**: The CoachDialog MUST show a prompt resolved from the `coach.<category>.prompt.*` i18n key pool; the client MUST pick one key at random per puzzle. The `goal_prompt` field from the puzzle row MUST NOT be used.
- **FR-011**: The progress indicator MUST show "N / M" (N = puzzles completed, M = total in session) and update after each puzzle advance.
- **FR-012**: The ProgressBar fill MUST reflect N/M.
- **FR-013**: The Toolbar in pre-move state MUST contain only the Hint button. There is no Undo button in Challenge mode (Gap 8).
- **FR-014**: Tapping Hint MUST update the CoachDialog with a phrase from `coach.<category>.hint.*` pool. The hint MUST name the task or threat without revealing the column. No numeric scores are shown. Hint usage does not affect accuracy.
- **FR-015**: Tapping the back arrow MUST show a confirmation dialog with "Leave this set? Your progress won't be saved." The dialog MUST offer "Keep going" (dismiss) and "Leave" (navigate to `setpicker`, discard session).
- **FR-016**: `track('puzzle_attempted', { puzzleId, category })` MUST be fired when the user taps a column (before the result is known).

**Challenge Board — Move Commit**

- **FR-017**: Move commit MUST be immediate on column tap (commit-first, no confirmation step). The disc MUST animate into the lowest available row via the `lastDrop` prop.
- **FR-018**: After commit the board MUST call `POST /api/evaluate-move` with `{ movestring, col }` where `movestring` is the position BEFORE the move (0-indexed).
- **FR-019**: On response the column badge MUST be set on the played column: `good` for optimal, `mid` for suboptimal, `bad` for blunder.
- **FR-020**: On an optimal move that results in a win, the board MUST render `win` overlays on the four-in-a-row cells.
- **FR-021**: `store.recordPuzzleAttempt({ puzzleId, category, correct: quality === 'optimal', ... })` MUST be called on every committed move.
- **FR-022**: `track('puzzle_solved_correct', { puzzleId, category })` MUST be fired for optimal moves; `track('puzzle_solved_wrong', { puzzleId, category })` for suboptimal or blunder moves.

**Challenge Board — Tier-1 Feedback**

- **FR-023**: The Tier-1 strip MUST appear below the board after a move is committed. It MUST show: quality tag (with glyph and label), summary line (resolved from `t(summaryLineKey)`), and "Learn more ▼" button. No Flag icon in Epic 2a — the flag mechanism is scoped to the Deep Reveal Panel (Epic 2b).
- **FR-024**: The CoachDialog MUST update with the phrase resolved from `t(coachPhraseKey)` and the mood from `coachMood` returned by `POST /api/evaluate-move`.
- **FR-025**: Tapping "Learn more ▼" for an anonymous user MUST open `AuthModal`.
- **FR-026**: Tapping "Learn more ▼" for an authenticated user who has reached the weekly Deep Reveal limit MUST open `UpgradeModal`.
- **FR-027**: Tapping "Learn more ▼" for an eligible authenticated user MUST open the Deep Reveal Panel (Epic 2b scope; this epic wires the button and gate logic, not the panel itself).
- **FR-028**: *(Deferred to Epic 2b.)* The Flag icon is not shown in the Tier-1 strip in this epic. Flag functionality is part of the Deep Reveal Panel surface added in Epic 2b.
- **FR-029**: The Toolbar in post-move state MUST contain only the "Next →" button (no Undo, no Retry).

**Backend — `server/challengeSets.js`**

- **FR-030**: `challengeSets.js` MUST export a mapping of category slug → `{ displayName, stars, description, free: bool }` for all categories available in this epic: `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat` (all free) plus Pro categories `mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`.
- **FR-031**: `server/categories.js` `PAID_CATEGORIES` MUST be updated: remove `claimeven` and `z_threat`; add `mixed`.

**Backend — `server/moveQualityScorer.js`**

- **FR-032**: The scorer module MUST export `scoreMove(scores, playedCol)` which returns `{ badge, quality, bestCol }` using the classification rules:
  - `score(played) === score(best)` → `quality: 'optimal'`, `badge: 'good'`
  - `sign(score(played)) === sign(score(best))` but played ≠ best → `quality: 'suboptimal'`, `badge: 'mid'`
  - `sign(score(played)) < sign(score(best))` → `quality: 'blunder'`, `badge: 'bad'`
  - Losing position (all scores negative): Optimal = least negative; Blunder = more than 4 score points below least negative.
- **FR-033**: Sign ordering MUST be: positive (win) > 0 (draw) > negative (loss).
- **FR-034**: The scorer MUST be importable by both `POST /api/evaluate-move` (this epic) and `POST /api/games/analyze` (Epic 3b).

**Backend — `POST /api/evaluate-move`**

- **FR-035**: The endpoint MUST accept `{ movestring: string, col: number, category?: string }` where `movestring` is the position before the move (0-indexed digits 0–6), `col` is 0-indexed, and `category` is an optional slug. When `category` is provided (challenge puzzles), it is used as the phrase-pool key. When absent (Sparring/Epic 3a reuse), the phrase-pool key falls back to the `classify()` output.
- **FR-036**: The endpoint MUST validate `movestring` against `/^[0-6]{0,42}$/` and `col` as integer 0–6; return 400 on invalid input.
- **FR-037**: The endpoint MUST call the persistent solver to get scores for the position and run `scoreMove()`. It MUST also call `classify()` and return its output as `patternTag` (for display only). The phrase-pool key is derived from the request's `category` field (when present), NOT from `classify()` output — `classify()` output is display metadata only.
- **FR-038**: The endpoint MUST randomly select one i18n key from the `coach.<phrasePoolKey>.<quality>.*` pool and return it as `coachPhraseKey`, where `phrasePoolKey` is the request `category` when present, else the `classify()` output slug. It MUST NOT return resolved English strings.
- **FR-039**: The endpoint MUST return `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`. `coachMood` is `'happy'` for optimal, `'think'` for suboptimal, `'oops'` for blunder.
- **FR-040**: The endpoint MUST be accessible to anonymous users (no auth gate). `loadUser` middleware runs but is not a blocker.

**Backend — `GET /api/puzzles/draw`**

- **FR-041**: The endpoint MUST accept `category` (slug string) and `n` (integer, default 8, max 8) as query parameters.
- **FR-042**: `category` MUST be validated against `VALID_CATEGORIES` plus `'mixed'`; return 400 for invalid values. `mixed` is in `PAID_CATEGORIES` but deliberately NOT in `VALID_CATEGORIES` (it is a pseudo-category with no DB slug). The draw endpoint special-cases `mixed` before the standard `VALID_CATEGORIES` check: if `category === 'mixed'`, check Pro access first (403 if not Pro), then sample across all free-or-owned categories. This special-case branch runs before any `VALID_CATEGORIES` membership test.
- **FR-043**: For a standard category, the endpoint MUST return up to `n` randomly-drawn approved (`is_active = true`) puzzles for that category, without replacement within the draw.
- **FR-044**: For `category=mixed`, the endpoint MUST sample without replacement across all approved puzzles of all free-or-owned categories; it is Pro-gated (`userCanAccessCategory()` returning false → 403).
- **FR-045**: Access control MUST apply: paid categories return 403 for non-paid users.
- **FR-046**: The response MUST be `{ puzzles: [{id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player}] }`.

**Backend — `GET /api/puzzles/counts`**

- **FR-047**: The endpoint MUST return `{ counts: { [category]: number }, sets: ChallengeSet[] }`. `counts` covers all categories in `CATEGORY_ORDER`; `sets` is the ordered array from `CHALLENGE_SETS` in `server/challengeSets.js`.
- **FR-048**: The count MUST reflect approved (`is_active = true`) puzzles per category.
- **FR-049**: Categories with zero approved puzzles MUST still appear in the response with `count: 0`.
- **FR-050**: No authentication is required for this endpoint.
- **FR-050a** *(implementation constraint)*: `GET /api/puzzles/draw` and `GET /api/puzzles/counts` MUST be registered in `server/index.js` BEFORE `GET /api/puzzles/:id`. Express route matching is first-match; registering after `:id` causes `/draw` and `/counts` to be silently swallowed as if `id = 'draw'` / `id = 'counts'`.

**i18n Key Pools**

- **FR-050b**: `en.json` MUST contain `challenge.quality.optimal`, `challenge.quality.suboptimal`, and `challenge.quality.blunder` string keys for the quality label text rendered in the Tier-1 strip. These are resolved client-side via `t('challenge.quality.<quality>')`.
- **FR-051**: `en.json` MUST contain prompt pools `coach.<category>.prompt.0` … `.2` for each free category (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`). 2–3 variants each.
- **FR-052**: `en.json` MUST contain hint pools `coach.<category>.hint.0` … `.1` for each free category. Hint text MUST NOT name a specific column.
- **FR-053**: `en.json` MUST contain coach phrase pools `coach.<category>.optimal.*`, `.suboptimal.*`, `.blunder.*` for each free category. Existing keys MUST be preserved; missing quality variants MUST be added.
- **FR-054**: `en.json` MUST contain summary line pools `eval.<category>.optimal.summary.0`, `.suboptimal.summary.0`, `.blunder.summary.0` for each free category. The `eval.<category>.<quality>.summary.<n>` sub-namespace is introduced by this epic and registered here as the canonical i18n convention for Tier-1 summary lines. It follows the same per-category, per-quality, indexed-variant pattern as `coach.*` keys. The endpoint returns the full key string as `summaryLineKey`; the client resolves it via `t(summaryLineKey)`.
- **FR-055**: `src/lib/categories.js` `PAID_CATEGORIES` MUST be updated in sync with the server-side remap (FR-031).

### Key Entities

- **ChallengeSet**: `{ slug, displayName, stars, description, free: bool }` — defined in `server/challengeSets.js`; drives the Set Picker list.
- **DrawnPuzzle**: `{ id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player }` — returned by `GET /api/puzzles/draw`; stored in challenge session state.
- **MoveEvaluation**: `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }` — returned by `POST /api/evaluate-move`; drives Tier-1 feedback rendering.
- **ChallengeSessionResult**: `{ puzzleId, quality, category }` — accumulated in the `results` array client-side for handoff to Post-Set Summary (Epic 2b).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the Set Picker, browse at least 5 free challenge sets, select one, and play their first puzzle within 15 seconds of entering Challenges.
- **SC-002**: Every committed move produces a Tier-1 quality badge and coach phrase with no perceptible loading delay (response from `POST /api/evaluate-move` under 1 second in non-solver-bottlenecked conditions).
- **SC-003**: The Set Picker never shows a set with 0 approved puzzles; all displayed counts match server-side approved counts.
- **SC-004**: The `results` array passed to the summary screen contains the correct per-puzzle `quality` value for every puzzle in the session (verifiable by inspecting navigation params). Accuracy percentage display is deferred to Epic 2b Post-Set Summary.
- **SC-005**: Pro-gated sets are inaccessible to free-tier users — no puzzle data is returned and no challenge board opens.
- **SC-006**: All user-facing strings are resolved through i18n keys; no hardcoded English strings appear in the component code.
- **SC-007**: Analytics events (`puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `screen_viewed`) fire for every corresponding action; verified by checking the `tracks` table after a session.

## Assumptions

- The Epic 1a component library (Board, CoachDialog, CoachAvatar, SetCard, UpgradeModal, Toolbar, ToolButton, ProgressBar, TopBar) is fully built and its prop contracts (Board API in `specs/010-design-tokens-component-library/contracts/board-api.md`) are stable.
- The Epic 1b screen navigator (`go()`, `track()`, `setActiveScreen()`, `SURFACE_BG`) is wired and functional.
- The Epic 7 store interface (`recordPuzzleAttempt`, `getProfile` for tier, `getLastChallengeSession`) is implemented in both `IndexedDBStore` and `SupabaseStore`.
- The `classify()` function in `server/classifier.js` is stable and synchronous for all 11 current categories.
- The persistent solver process is running when `POST /api/evaluate-move` is called; empty-board handling uses the hardcoded `EMPTY_BOARD_SCORES` constant.
- `PuzzlesPage.jsx` is the reference implementation for session accuracy, optimistic placement, solved-puzzle exclusion, and the claimeven trace overlay; this epic ports that logic into the new `challenge` screen rather than rewriting from scratch.
- The "Learn more ▼" button in this epic gates access to Deep Reveal (implemented in Epic 2b) but does not implement the panel itself — a placeholder or stub is acceptable here.
- `store.saveChallengeSession(...)` is called in Epic 2b's Post-Set Summary, not in this epic; this epic only accumulates the `results` array and passes it via navigation params.
- The `mixed` pseudo-category requires no DB category slug — it is handled entirely in the draw endpoint's routing logic.
- Provisional star ratings for `double_threat=2` are used; final values are confirmed in Epic 6.
- The mockup's `CHAL_SETS` array is illustrative only; category order, star ratings, and locked flags are driven by `challengeSets.js` + `GET /api/puzzles/counts`.
- The mockup's Undo/Retry button in the Toolbar is a mockup divergence; Gap 8 (no Undo in Challenges) governs.
- **Mockup divergence — numeric eval tag**: Mockup Variant A renders a numeric score tag (`f.num`: e.g., `+0.6`, `−4.0`, `WIN`) in the Tier-1 strip. This is deliberately NOT built. No raw solver scores are surfaced to users in any form. The Tier-1 strip shows only the quality tag glyph+label (`Optimal`/`Suboptimal`/`Blunder`) and the summary line.
- **`forced_win` and `forbidden_columns` absent from Epic 2a**: These two free categories do not appear in `challengeSets.js` in this epic. They are added in Epic 2b. This is intentional — their puzzle-set mechanics (sequence interaction mode, multi-step commits) require additional infrastructure not built here.
- All coordinates in puzzle data and API calls are 0-indexed; the only 1-indexed conversion boundary is `c4solver-wrapper.js`.
