# Feature Specification: Challenges — Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary (Epic 2b)

**Feature Branch**: `101-new-design`  
**Created**: 2026-05-31  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open the Deep Reveal Panel After a Move (Priority: P1)

An authenticated user with quota remaining plays a move in the Challenges surface and taps "Learn more ▼" in the Tier-1 strip. A bottom-sheet panel slides up showing a loading spinner briefly, then displays the pattern tag(s), quality badge, an LLM explanation paragraph, a "Best line" chip row, and a "Flag this explanation" button. If the position is cached, the panel opens instantly with no spinner.

**Why this priority**: The Deep Reveal panel is the primary educational payoff of the Challenges surface — it is the unique value proposition over bare puzzle checkers. Everything else in this epic depends on this panel existing.

**Independent Test**: Play any single-move puzzle, commit a move, tap "Learn more ▼". Verify: panel opens; if uncached, spinner appears then explanation loads; if cached, no spinner; pattern tag and quality badge from evaluate-move state are correct; explanation and bestLine arrive from the LLM endpoint; "Flag" button exists.

**Acceptance Scenarios**:

1. **Given** the user is authenticated with quota remaining and taps "Learn more ▼", **When** the panel opens, **Then** a loading spinner is shown until the LLM response arrives; on cache hit, no spinner is shown (instant render).
2. **Given** the LLM response arrives within 6 seconds, **When** the panel is loaded, **Then** the panel shows in order: (a) pattern tag(s) and quality badge sourced from the already-held evaluate-move state, (b) a non-interactive compact Board with evaluate-move overlays, (c) the LLM explanation paragraph, (d) a "Best line" chip row with solver PV columns in 1-indexed notation.
3. **Given** the LLM response takes more than 6 seconds, **When** the timeout fires, **Then** the panel shows the Tier-1 summary line text plus "Detailed explanation unavailable." — no crash, no retry button.
4. **Given** the panel is open, **When** the user taps "Flag this explanation", **Then** a row is written to the `llm_feedback` table, the button changes to "Thanks — flagged" (non-interactive), and `track('deep_reveal_flagged', { puzzleId })` fires.
5. **Given** the panel is open, **When** the user taps "Collapse" or the backdrop, **Then** the panel closes without affecting the challenge board state.
6. **Given** the user is anonymous and taps "Learn more ▼", **When** the gate is checked, **Then** `AuthModal` appears — no Deep Reveal panel opens.
7. **Given** the user is authenticated and has exhausted their weekly quota and taps "Learn more ▼", **When** the gate is checked, **Then** `UpgradeModal` appears — no Deep Reveal panel opens.

---

### User Story 2 — Play a Forbidden Columns Puzzle (Priority: P1)

A user enters the Forbidden Columns challenge set. The board renders in multi-select mode — tapping a column marks it with a red tint and ✕ badge (tap again to untoggle). When at least one column is marked, the "Submit" button in the Toolbar becomes active. After submit, correct columns flash green, incorrect/missed columns are revealed simultaneously, and the feedback strip shows a partial-credit score.

**Why this priority**: Forbidden Columns is a free set added in this epic. Without it, the Set Picker lists a missing entry and the set is unreachable.

**Independent Test**: Navigate to the Forbidden Columns set, play one puzzle, tap columns to mark/untoggle, submit, verify the reveal behavior and feedback strip copy.

**Acceptance Scenarios**:

1. **Given** the user enters a Forbidden Columns puzzle, **When** the board renders, **Then** the Board is in multi-select mode (`onColToggle` wired, `selectedCols` state initialized to `[]`); tapping a column adds it to `selectedCols` with red tint and ✕ badge; tapping again removes it.
2. **Given** zero columns are selected, **When** the Toolbar renders, **Then** the "Submit" button is disabled.
3. **Given** at least one column is selected, **When** the user taps "Submit", **Then** the scoring logic runs: correct forbidden columns receive a green flash, false-positive tags and missed forbidden columns are revealed simultaneously.
4. **Given** the user submits an exact match (all forbidden columns and no extras), **When** feedback renders, **Then** quality is Optimal, badge is `good`.
5. **Given** the user submits a partial match with no false positives (found some but missed others), **When** feedback renders, **Then** quality is Suboptimal, badge is `mid`, feedback strip shows e.g. "3 / 4 forbidden columns found".
6. **Given** the user submits at least one false positive (tagged a safe column) or zero correct columns, **When** feedback renders, **Then** quality is Blunder, badge is `bad`.
7. **Given** the puzzle result is recorded, **When** `store.recordPuzzleAttempt` is called, **Then** it is called with the existing 6-field shape: `{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }` where `outcome = quality` and `first_attempt_correct = quality === 'optimal'`.
8. **Given** the user submits, **When** analytics fires, **Then** `track('puzzle_attempted', { puzzleId, category: 'forbidden_columns', submittedCols, correctCols })` is called.

---

### User Story 3 — Play a Forced Win Sequence Puzzle (Priority: P2)

A user enters the Forced Win challenge set. The Coach says "Force the win — play the line that leaves your opponent no escape." The board is interactive across multiple moves: the user plays a move, the engine responds with the best defense, the user plays again, and so on until the forcing line is complete. Success or failure is pass/fail on the whole line.

**Why this priority**: Forced Win is a free set in this epic. It is functionally distinct (multi-move, sequence mode) from all single-move categories in Epic 2a, so it must be wired here before the Challenges surface is considered complete.

**Independent Test**: Enter the Forced Win set, play a known forcing line to completion, verify pass/fail feedback is shown at the end of the sequence. Verify that no per-move `POST /api/evaluate-move` call is made mid-sequence.

**Acceptance Scenarios**:

1. **Given** the user enters a Forced Win puzzle, **When** the board renders, **Then** `interactionMode` is `'sequence'` on the Board component; the Board never self-locks after a user move mid-sequence.
2. **Given** the user plays a move in the sequence, **When** the engine processes it, **Then** the `SequenceHandler`/`completionStrategies.js` path handles evaluation — `POST /api/evaluate-move` is NOT called.
3. **Given** the user completes the entire forcing line correctly, **When** the sequence ends, **Then** the result is Optimal (pass); the board advances to the next puzzle on "Next →".
4. *(Post-MVP — deferred)* **Given** the user plays an off-sequence move at any point, **When** the sequence ends, **Then** the result is Blunder (fail); the board shows failure feedback. **MVP behavior**: `SequenceHandler.onNext` has no pass/fail argument, so failure detection is not implemented in this epic. The sequence always records a pass (see FR-028).
5. **Given** the challenge set entry in `challengeSets.js`, **When** the Set Picker renders, **Then** `forced_win` appears as a free set with `stars: 3` (provisional, confirmed in Epic 6) and is accessible without authentication gating beyond tier check.

---

### User Story 4 — View Post-Set Summary After Completing a Set (Priority: P1)

After playing all puzzles in any challenge set (single-move, Forbidden Columns, or Forced Win), the user is taken to the Post-Set Summary screen. It shows overall accuracy, a by-pattern breakdown, and a Coach recommendation CTA. Single-category sets show one breakdown row; mixed sets show multiple rows.

**Why this priority**: Post-Set Summary is the closing loop of the Challenges surface. Without it, the session results cannot be displayed, `store.saveChallengeSession` is never called, and analytics for set completion are lost.

**Independent Test**: Complete all puzzles in a single-category free set, verify the `summary` screen appears with correct accuracy %, one breakdown row, and a CTA pointing to the lesson for the category's weakest pattern (or congratulatory CTA at 100%).

**Acceptance Scenarios**:

1. **Given** the last puzzle is completed and "Next →" is tapped, **When** navigation fires, **Then** the user arrives at the `summary` screen with the session results array passed as navigation params.
2. **Given** the `summary` screen mounts, **When** the data is computed, **Then** `store.saveChallengeSession({ category, results, accuracy, timestamp })` is called exactly once; `track('set_completed', { category, accuracy, optimalCount, blunderCount, byPattern })` fires.
3. **Given** the set is single-category and accuracy < 100%, **When** the summary renders, **Then** the CTA reads "Go to [Lesson Name] lesson" and navigates to that lesson's concept screen; the by-pattern breakdown has exactly one row.
4. **Given** the set is single-category and accuracy = 100%, **When** the summary renders, **Then** the Coach phrase is a congratulatory phrase (e.g., "Perfect set. Try a harder one.") and the CTA reads "Back to Challenges" (no lesson link).
5. **Given** the recommended lesson is Pro-gated and the user is on the free tier, **When** the CTA is tapped, **Then** `UpgradeModal` appears instead of navigating to the lesson.
6. **Given** the set is Mixed (multi-category), **When** the summary renders, **Then** the by-pattern breakdown shows one row per category that appeared in the session; the Coach recommends the lesson for the pattern with the lowest accuracy (tie-break: earliest in lesson order).
7. **Given** the back arrow is tapped from the summary screen, **When** navigation fires, **Then** the user returns to the `setpicker` screen.

---

### Edge Cases

- **Anonymous user taps "Learn more ▼"**: `AuthModal` appears; no quota is decremented; no LLM call is made.
- **Quota-exhausted authenticated user taps "Learn more ▼"**: `UpgradeModal` appears; no LLM call is made.
- **Cache hit on Deep Reveal**: Panel opens instantly with no spinner; quota is NOT decremented.
- **LLM timeout (>6 seconds)**: Panel shows Tier-1 summary line + "Detailed explanation unavailable." — no retry button, no error modal.
- **Forbidden Columns: all columns forbidden in a position**: User must still tap at least one before Submit enables.
- **Forced Win: first move is wrong**: Sequence fails immediately; failure feedback shown.
- **Empty session (0 puzzles completed)**: Cannot occur — the summary screen is only reached after all puzzles are completed.
- **Single puzzle in session (n=1)**: Summary accuracy is either 0% or 100%; single by-pattern row; appropriate CTA.
- **Forced Win puzzle with no forcing line in DB**: Blocked at puzzle generation level (Epic 6); the challenge screen must not crash on malformed `interaction_mode: 'sequence'` data.
- **`bestLine` is null from server (legacy cache row)**: `bestLine` is always ≥1 element on newly cached rows. Legacy `explanation_cache` rows written before this epic lack the `bestLine` field and return `null`; the Deep Reveal panel omits the "Best line" section for those rows rather than crashing.
- **Flag already tapped**: Button shows "Thanks — flagged" and cannot be tapped again within the same panel session.

## Requirements *(mandatory)*

### Functional Requirements

**Deep Reveal Panel — Frontend**

- **FR-001**: A `DeepRevealPanel` bottom-sheet component MUST be wired to the "Learn more ▼" button in the Tier-1 strip on the Challenge Board. It MUST be built on top of the existing `DeepRevealButton.jsx` / `ExplainMoveButton.jsx` foundation, preserving the existing auth-gate and quota-gate logic.
- **FR-002**: On open, the panel MUST call `POST /api/explain-move-llm` with `{ movestring, col }` where `movestring` is the position BEFORE the user's move (0-indexed digits 0–6) and `col` is the 0-indexed column played. The panel MUST NOT call `POST /api/evaluate-move` — classifier fields are sourced from the already-held evaluate-move response in client state.
- **FR-003**: While the LLM response is pending (cache miss path), the panel MUST show a spinner and "Reading the position…" label.
- **FR-004**: On a cache hit (instant response), the panel MUST render with no spinner and no perceptible loading delay.
- **FR-005**: Once loaded, the panel MUST display, in order: (a) pattern tag chip(s) and quality badge sourced from the Epic 2a evaluate-move client state, (b) a non-interactive compact `Board` component with `compact` prop set and `overlays` from the evaluate-move state — positioned after the tag row and before the explanation paragraph, matching the mockup layout, (c) the `explanation` string from the endpoint, (d) a "BEST LINE" section with `bestLine` displayed as chip-separated 1-indexed column labels (e.g., "Col 5 › Col 2 › Col 6"). `bestLine` always contains ≥1 element by construction (the played move is always included); the `bestLine?.length > 0` guard in the client render is purely defensive for legacy cached rows that pre-date this epic and lack the `bestLine` field (those rows return `null` for the field). The "BEST LINE" section is omitted only when `bestLine` is `null` or absent (legacy cache rows), not in normal operation.
- **FR-006**: The panel MUST include a "Flag this explanation" button. On tap: POST to `POST /api/llm-feedback` with `{ movestring, llm_prompt: '', llm_response: explanation, human_note: '', feature: 'challenges' }`, show "Thanks — flagged" confirmation, fire `track('deep_reveal_flagged', { puzzleId })`. The flag action MUST NOT close the panel.
- **FR-007**: If the LLM response does not arrive within 6 seconds, the panel MUST show the Tier-1 summary line text (already in client state) plus "Detailed explanation unavailable." with no retry button.
- **FR-008**: `track('deep_reveal_viewed', { puzzleId, cached })` MUST be fired when the panel opens; `cached` is read directly from the `cached` field in the server response. No latency-threshold heuristic is used.
- **FR-009**: The panel MUST be dismissible by tapping the backdrop or the "Collapse" button; closing it MUST NOT affect board state.

**Deep Reveal Panel — Server-side modifications to `POST /api/explain-move-llm`**

- **FR-010**: Before calling the LLM, the handler MUST check `explanation_cache` for a row where `position_hash = SHA256(movestring + ":" + col)`. On cache hit, return `{ explanation: cached.deep_reveal_json.explanation, bestLine: cached.deep_reveal_json.bestLine, cached: true }` immediately.
- **FR-011**: Quota decrement (`checkAndDecrementQuota`) MUST run ONLY on cache miss, AFTER the cache check. Cache hits MUST NOT decrement the quota counter.
- **FR-012**: On cache miss and LLM success, the handler MUST write `{ position_hash, one_liner: '', deep_reveal_json: { explanation, bestLine } }` to `explanation_cache`. The write MUST be fire-and-forget (does not block the response).
- **FR-013**: The handler MUST compute `bestLine` from the solver principal variation (PV) for the played move using solver simulation (the `explainSimulate` function or a dedicated extension of it), NOT book-only lookup (book coverage is insufficient). The PV is walked move-by-move via the existing solver process in `c4solver-wrapper.js` patterns. The result is returned as an array of 1-indexed column label strings (e.g., `["Col 5", "Col 2", "Col 6"]`). The computation is server-side; no client-side PV logic is added. If `explainSimulate`'s output covers the PV path, reuse it directly; if not, create a dedicated `computeBestLine(movestring, col)` function in the same file and document the reason in a comment.
- **FR-014**: The endpoint response shape MUST be `{ explanation: string, bestLine: string[], cached?: boolean }`. No other new fields are added.
- **FR-015**: The 401 gate for unauthenticated users MUST be preserved — anonymous users receive 401 before any cache or quota check.

**Forbidden Columns — Frontend**

- **FR-016**: `connect-four/server/challengeSets.js` MUST be extended to include a `forbidden_columns` entry with shape `{ slug: 'forbidden_columns', displayNameKey: 'challengeSet.forbidden_columns.displayName', descriptionKey: 'challengeSet.forbidden_columns.description', stars: 2, free: true }`. Note: there is no frontend `src/lib/challengeSets.js` — `connect-four/server/challengeSets.js` is the sole source. Callers that render display name or description MUST resolve via `t(set.displayNameKey)` / `t(set.descriptionKey)` (SC-007). The corresponding `en.json` keys are added in FR-040. The existing `challengeSets.js` entries use literal `displayName`/`description` fields; this epic migrates ALL entries to the i18n-key shape, and the Set Picker MUST be updated to use `t()` for all entries. The provisional `stars: 2` is confirmed in Epic 6. Additionally, `forbidden_columns` MUST be removed from `PAID_CATEGORIES` in BOTH `connect-four/server/categories.js` (controls `/draw` 403 gate) AND `connect-four/src/lib/categories.js` (controls frontend tier-lock UI) atomically in the same task.
- **FR-017**: When a `forbidden_columns` puzzle is loaded (detected via `interaction_mode !== 'sequence'` and `category === 'forbidden_columns'`), the Challenge Board MUST render the Board with the `onColToggle` handler and `selectedCols` state; `onColumnClick` MUST NOT be passed to avoid placing discs.
- **FR-018**: The Toolbar for Forbidden Columns MUST show a "Submit" button in place of the normal next/hint flow; the button MUST be disabled when `selectedCols.length === 0`.
- **FR-019**: The CoachDialog for Forbidden Columns pre-submit MUST show the prompt: resolved from `coach.forbidden_columns.prompt.*` i18n key pool.
- **FR-020**: On "Submit", the scoring logic (ported from `PuzzlesPage.handleForbiddenSubmit`) MUST: (a) call `POST /api/puzzles/:id/check` for each selected column (in parallel) and read the authoritative `forbiddenCols` array from the first response (`results[0].data.forbiddenCols`) — this is the same mechanism used in `PuzzlesPage.handleForbiddenSubmit`; do NOT read `puzzle.correct_cols` (that field does not exist on the puzzle object), (b) apply the exact-match quality predicate (Optimal = all forbidden columns selected and no extras; Suboptimal = no false positives but missed ≥1 forbidden column; Blunder = any false positive OR zero true positives), (c) reveal correct columns with green flash, incorrect tags (`'tr'` overlay), and missed forbidden columns simultaneously, matching the overlay logic in `PuzzlesPage.handleForbiddenSubmit`.
- **FR-021**: The feedback strip after Forbidden Columns submit MUST show: partial-credit copy ("N / M forbidden columns found") where N = correct columns found (true positives) and M = total correct forbidden columns.
- **FR-022**: `store.recordPuzzleAttempt` MUST be called on submit using the existing 6-field shape: `{ puzzle_id: current.id, device_uuid: store.deviceUuid, moves_tried: selectedCols.length, outcome: quality, first_attempt_correct: quality === 'optimal', time_ms }`. Zero store changes are needed. The completed puzzle MUST also push `{ puzzleId: current.id, quality, category: 'forbidden_columns' }` into the session `results` array before `go('summary')` is called on the final puzzle.
- **FR-023**: `track('puzzle_attempted', { puzzleId, category: 'forbidden_columns', submittedCols, correctCols })` MUST be called on submit.

**Forced Win — Frontend**

- **FR-024**: `connect-four/server/challengeSets.js` MUST be extended to include a `forced_win` entry with shape `{ slug: 'forced_win', displayNameKey: 'challengeSet.forced_win.displayName', descriptionKey: 'challengeSet.forced_win.description', stars: 3, free: true }` (same i18n-key shape as FR-016). The corresponding `en.json` keys are added in FR-041. The provisional `stars: 3` is confirmed in Epic 6. `forced_win` MUST also be removed from `PAID_CATEGORIES` in BOTH `connect-four/server/categories.js` AND `connect-four/src/lib/categories.js` atomically (same task as FR-016).
- **FR-025**: When a `forced_win` puzzle is loaded (`interaction_mode === 'sequence'`), `ChallengeScreen` MUST suppress its Toolbar, Tier-1 strip (including "Learn more ▼"), and CoachDialog, and render `<SequenceHandler>` in their place. `SequenceHandler` owns the full interactive UI for sequence mode. **SC-007 deviation**: `SequenceHandler` currently renders hardcoded English banners ("Well done!" etc.); this is an accepted tracked deviation to be resolved in a follow-up epic. The Board inside `SequenceHandler` is rendered with `interactionMode='sequence'` so it never self-locks after a user move.
- **FR-026**: The `SequenceHandler` / `completionStrategies.js` path MUST be the sole evaluation mechanism for `forced_win`. `POST /api/evaluate-move` MUST NOT be called for any individual move within the forcing line.
- **FR-027**: The CoachDialog for Forced Win pre-move MUST show a prompt resolved from `coach.forced_win.prompt.*` i18n key pool.
- **FR-028**: *(MVP scope: success path only)* `SequenceHandler.onNext` carries no pass/fail argument (it is a plain button onClick with zero args), so the fail branch cannot be wired without modifying `SequenceHandler`. For MVP, `onNext` is always wired as `() => handleSequenceComplete(true)` — the sequence always records a pass. Failure detection (wrong move mid-sequence) is deferred post-MVP. The `handleSequenceComplete` function signature retains the `passed` parameter so the fail path can be added later.
- **FR-029**: `store.recordPuzzleAttempt` MUST be called when the sequence completes using the existing 6-field shape: `{ puzzle_id: current.id, device_uuid: store.deviceUuid, moves_tried: 1, outcome: 'optimal', first_attempt_correct: true, time_ms }` (MVP: always optimal/true per FR-028). Fail-recording is deferred post-MVP. The completed puzzle MUST also push `{ puzzleId: current.id, quality: 'optimal', category: 'forced_win' }` into the session `results` array before `go('summary')` is called on the final puzzle.

**Post-Set Summary — Frontend**

- **FR-030**: The `summary` screen MUST be wired to the `PostSetSummary` component in `src/lib/screenRegistry.jsx`. The component MUST read session results from the navigation params passed by the challenge screen.
- **FR-031**: On mount, `store.saveChallengeSession({ category, results, accuracy, timestamp: Date.now() })` MUST be called exactly once.
- **FR-032**: On mount, `track('set_completed', { category, accuracy, optimalCount, blunderCount, byPattern })` MUST be fired where `byPattern` is an object keyed by category slug with `{ optimal, total }` counts per pattern.
- **FR-033**: The summary screen MUST display an unconditional "Set complete!" hero section at the top — a green check icon and the heading "Set complete!" — regardless of accuracy percentage or score. The hero does not change based on accuracy; only the Coach recommendation text and CTA below it vary.
- **FR-033a**: The summary MUST display overall accuracy as a percentage (rounded to nearest integer) and an overall count line ("N / M optimal"), placed below the hero.
- **FR-034**: The "BY PATTERN" breakdown MUST show one row per category that appeared in the session: category display name, score fraction ("N / M"), and a colored quality dot (green/amber/red by accuracy threshold). For single-category sets this is exactly one row.
- **FR-035**: Coach recommendation logic: find the pattern with the lowest per-session accuracy (`optimal / attempted`); tie-break by earliest lesson order. If overall accuracy = 100%: Coach shows a congratulatory phrase resolved from `coach.summary.perfect.*` i18n key pool and CTA is "Back to Challenges" navigating to `setpicker`. If overall accuracy < 100% (including 0%): Coach shows a lesson recommendation phrase and CTA navigates to the lesson for the lowest-accuracy pattern (see FR-036). The 0%-accuracy case follows the same < 100% branch — no special handling needed beyond the lesson recommendation path.
- **FR-036**: When accuracy < 100%, the CTA MUST read "Go to [Lesson Display Name] lesson" and navigate to `go('saga', { highlightSlug: recommendedSlug })` to open the saga map with the recommended category highlighted. Note: `go('concept', { lessonId })` is NOT used — the concept screen is a PlaceholderScreen until Epic 4.
- **FR-037**: If the recommended lesson is Pro-gated (its lesson ID is in the Pro lesson list) and the user is on the free tier, the CTA MUST open `UpgradeModal` instead of navigating to the saga map. The free-tier check MUST be derived from `store.getProfile().tier === 'free'` — NOT from `store.constructor.name` or any other class-name heuristic.
- **FR-038**: The back arrow MUST navigate to `go('setpicker')` without a confirmation dialog.
- **FR-039**: A "Back to Challenges" ghost button MUST always be present below the primary CTA and MUST navigate to `go('setpicker')`.

**i18n Key Pools**

- **FR-040**: `en.json` MUST include: `challengeSet.forbidden_columns.displayName` ("Forbidden Columns") and `challengeSet.forbidden_columns.description` ("Mark every column where playing immediately hands your opponent a win.") for Set Picker rendering; plus `coach.forbidden_columns.prompt.*` (2–3 variants), `coach.forbidden_columns.hint.*` (1–2 variants), `coach.forbidden_columns.optimal.*`, `coach.forbidden_columns.suboptimal.*`, `coach.forbidden_columns.blunder.*` (1–2 variants each), and `eval.forbidden_columns.optimal.summary.0`, `eval.forbidden_columns.suboptimal.summary.0`, `eval.forbidden_columns.blunder.summary.0`.
- **FR-041**: `en.json` MUST include: `challengeSet.forced_win.displayName` ("Forced Win") and `challengeSet.forced_win.description` ("Play the forcing line that leaves your opponent no escape.") for Set Picker rendering; plus `coach.forced_win.prompt.*` (2–3 variants), `coach.forced_win.optimal.*`, and `coach.forced_win.blunder.*` (1–2 variants each).
- **FR-042**: `en.json` MUST include `coach.summary.perfect.*` (1–2 variants) for the 100%-accuracy congratulatory phrase.

### Key Entities

- **DeepRevealResult**: `{ explanation: string, bestLine: string[], cached?: boolean }` — returned by `POST /api/explain-move-llm`; `bestLine` entries are 1-indexed column label strings. `bestLine` always has ≥1 element on newly written cache rows; `null` only on legacy cache rows pre-dating this epic.
- **DeepRevealPanelState**: Composed on the client from (a) the Epic 2a `MoveEvaluation` `{ patternTag, quality, badge }` already in component state, and (b) `DeepRevealResult` from the LLM endpoint.
- **ForbiddenColumnsResult**: `{ selectedCols: number[], correctCols: number[], quality: 'optimal'|'suboptimal'|'blunder', badge: BadgeType }` — computed on submit by ported scoring logic.
- **ChallengeSessionResult**: `{ puzzleId, quality, category }` — same shape as Epic 2a; accumulated for all puzzle types and passed to Post-Set Summary via navigation params.
- **PostSetSummaryParams**: `{ category: string, results: ChallengeSessionResult[], accuracy: number, optimalCount: number, blunderCount: number, byPattern: { [slug]: { optimal: number, total: number } } }` — the params shape passed to `go('summary', params)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the Deep Reveal panel for any played move and see a complete explanation (pattern tag + LLM text + best line) within 6 seconds on a fresh position; positions seen by previous users open instantly.
- **SC-002**: The "Flag this explanation" flow completes without page reload or panel close; the `llm_feedback` row is verifiable in the database within the same session.
- **SC-003**: A user can complete a full Forbidden Columns session (N puzzles), see per-puzzle feedback with partial-credit counts, and land on the Post-Set Summary with the correct accuracy percentage.
- **SC-004**: A user can complete a Forced Win sequence to the end of the forcing line and receive pass/fail feedback within the normal challenge flow, with no mid-sequence `POST /api/evaluate-move` calls (verifiable in network logs).
- **SC-005**: The Post-Set Summary always shows a valid CTA — either a lesson link, a congratulatory "Back to Challenges" button, or an upgrade prompt — with no state where the CTA is absent or broken.
- **SC-006**: `store.saveChallengeSession` and `track('set_completed', ...)` are called exactly once per completed session (verifiable by inspecting the store and the `tracks` table after finishing a set).
- **SC-007**: All user-facing strings in this epic are resolved through i18n keys; no hardcoded English strings appear in component code.
- **SC-008**: Cache hits on the Deep Reveal endpoint do not decrement the user's quota counter; a user with 0 quota remaining can still view a previously cached explanation.

## Assumptions

- Epic 2a is fully implemented: the `challenge` screen, `POST /api/evaluate-move`, `GET /api/puzzles/draw`, the `results` accumulation pattern, and the Tier-1 strip (including the "Learn more ▼" button with auth/quota gates) are all in place.
- The Epic 7 store interface (`saveChallengeSession`, `recordPuzzleAttempt`, `getProfile` for tier) is implemented in both `IndexedDBStore` and `SupabaseStore`.
- The Epic 1a component library (Board with `selectedCols`/`onColToggle`/`interactionMode='sequence'` props, CoachDialog, Toolbar, ToolButton, TopBar, ProgressBar, UpgradeModal, AuthModal) is fully built and its prop contracts are stable.
- The `SequenceHandler` / `completionStrategies.js` path for `forced_win` is already operational in the codebase; this epic wires it to a challenge set entry, not rebuilds it.
- The `explanation_cache` Supabase table already exists with columns `position_hash`, `one_liner`, `deep_reveal_json`, and `created_at`.
- The `llm_feedback` Supabase table already exists and `POST /api/llm-feedback` already works.
- `checkAndDecrementQuota` already implements the 20/week Monday-reset logic; only the call site ordering changes in this epic.
- The solver PV is accessible server-side via the existing solver process; extracting `bestLine` requires querying the solver for the played move and walking the principal variation — this is implementable within the existing `c4solver-wrapper.js` patterns.
- `GET /api/puzzles/draw?category=forced_win` and `GET /api/puzzles/draw?category=forbidden_columns` will return approved puzzles once puzzle data is present (Epic 6 populates counts); if count = 0 the Set Picker hides these entries via the same `GET /api/puzzles/counts` mechanism already built in Epic 2a.
- `forbidden_columns` scoring does NOT read a client-side `correct_cols` puzzle field. The authoritative forbidden column set is returned by `POST /api/puzzles/:id/check` as `data.forbiddenCols` (a 0-indexed array). This is the same mechanism already implemented in `PuzzlesPage.handleForbiddenSubmit` and is confirmed by reading that function. No DB schema change is needed for scoring.
- The lesson order for Coach recommendation tie-breaking follows the same `CATEGORY_ORDER` / `lesson.order` sequence used in Epic 1b Stats screen.
- The mockup `DeepReveal` component renders a compact static board with overlays from the evaluate-move state; the implementation follows this layout (bottom sheet, grab handle, "Collapse" button, tag row, compact board, explanation paragraph, best-line section, flag button).
- No migration is needed for this epic beyond adding `forced_win` and `forbidden_columns` to `connect-four/server/challengeSets.js` (the sole challengeSets source — there is no frontend `src/lib/challengeSets.js`) and the i18n pool additions.
- The `summary` screen key already exists in `src/lib/screenRegistry.jsx` (added in Epic 1b); this epic wires it to the `PostSetSummary` component.
