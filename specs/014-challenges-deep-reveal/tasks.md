# Tasks: Challenges — Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary (Epic 2b)

**Input**: Design documents from `specs/014-challenges-deep-reveal/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: Tasks are grouped by the plan's dependency groups (A → B/C → D → E → F → G).
Each group maps to the user story it primarily serves. Groups B and C can proceed in parallel once
their respective foundations (T-01, T-02) are done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: Which user story this task belongs to
- Exact file paths are included in every task description

---

## Phase 1: Setup — No dependencies

**Purpose**: No prerequisite tasks. These are standalone foundations that unblock everything else.

- [ ] T001 [P] Add all i18n keys for forbidden_columns, forced_win, summary, and deepReveal panels to `connect-four/src/i18n/en.json` (FR-040, FR-041, FR-042 — see plan.md T-01 for the full key list including `challengeSet.*`, `coach.forbidden_columns.*`, `coach.forced_win.*`, `coach.summary.perfect.*`, `eval.forbidden_columns.*`, `deepReveal.*`, and `summary.*` namespaces)
- [ ] T002 [P] Add `computeBestLine(movestring, col, solver, maxPlies=5)` as a new exported async function at the bottom of `connect-four/server/explainSimulate.js` (FR-013 — see plan.md T-02 for the full implementation including the PV-walk loop, `board.hasWon()` guard, and 1-indexed label conversion; add a comment explaining why `explainSimulate` is NOT reused); add an integration test that calls `computeBestLine` with a real solver process and asserts the returned array is non-empty and all entries are 1-indexed column label strings (e.g. "Col 1"–"Col 7")

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Depends on Phase 1. Must complete before the ChallengeScreen phases can start. Groups B and C are independent of each other and can run in parallel.

**⚠️ CRITICAL**: T003 (server endpoint) blocks T007 (Deep Reveal panel). T004 (category unlock) blocks T005 and T006 (ChallengeScreen extensions).

- [ ] T003 [US1] Extend the `POST /api/explain-move-llm` handler in `connect-four/server/index.js` to implement the corrected processing order: (1) auth gate kept, (2) SHA256 cache check against `explanation_cache` using `positionHash = createHash('sha256').update(movestring + ':' + col).digest('hex')` — return `{ explanation, bestLine, cached: true }` on hit, (3) quota decrement moved to after cache check (cache-miss only), (4) call `computeBestLine(movestring, col, solver)` before the LLM call, (5) include `bestLine` in the fire-and-forget `explanation_cache` write blob as `{ explanation, bestLine }`, (6) return `{ explanation, bestLine }` — drop the old `prompt` field from the response. Import `computeBestLine` from `./explainSimulate.js`. (FR-010, FR-011, FR-012, FR-013, FR-014, FR-015; depends on T002)
- [ ] T004 [P] [US2] Atomically update all four files for the challengeSets i18n-key shape migration and category unlock: (a) `connect-four/server/challengeSets.js` — replace ALL `displayName`/`description` literals with `displayNameKey`/`descriptionKey` keys and add `forbidden_columns` (stars:2, free:true) and `forced_win` (stars:3, free:true) entries; (b) `connect-four/src/screens/SetPickerScreen.jsx` — change line 59 from `set.displayName ?? set.slug` to `t(set.displayNameKey) ?? set.slug`; (c) `connect-four/server/categories.js` — remove `forced_win` and `forbidden_columns` from `PAID_CATEGORIES`; (d) `connect-four/src/lib/categories.js` — remove `forced_win` and `forbidden_columns` from `PAID_CATEGORIES`. (FR-016, FR-024; depends on T001)

**Checkpoint**: T003 done → Deep Reveal panel implementation can start. T004 done → ChallengeScreen extensions can start.

---

## Phase 3: User Story 2 — Play a Forbidden Columns Puzzle (Priority: P1)

**Goal**: Wire forbidden_columns multi-select mode into ChallengeScreen, port the scoring logic from PuzzlesPage, and record the attempt correctly.

**Independent Test**: Navigate to the Forbidden Columns set, toggle several columns (verify red tint + ✕ badge, untoggle), verify Submit is disabled with 0 cols selected, submit a correct exact-match selection, verify green flash + correct coach message + `store.recordPuzzleAttempt` called with `correct: true`.

- [ ] T005 [US2] Wire Forbidden Columns multi-select into `connect-four/src/screens/ChallengeScreen.jsx`: add `selectedCols` (useState []) and `isSubmitting` (useState false) state; reset both in `initPuzzle()`; when `category === 'forbidden_columns'` and `phase === 'pre-move'`, pass `selectedCols` and `onColToggle` to Board and omit `onColumnClick` (FR-017); add "Submit" to Toolbar (disabled when `selectedCols.length === 0`) (FR-018); set coach message from `coach.forbidden_columns.prompt.*` pool in `initPuzzle()` (FR-019); implement `handleForbiddenSubmit()` porting logic verbatim from `PuzzlesPage.jsx` lines 345–415 — parallel `POST /api/puzzles/:id/check` calls, read `results[0].data.forbiddenCols`, apply quality predicate (optimal/suboptimal/blunder), set overlays, set evaluation with summaryLineKey; **NOTE: the Learn More strip ("Learn more ▼" button) MUST be hidden for forbidden_columns puzzles — there is no `lastDrop.c` to send to the explain endpoint**; call `store?.recordPuzzleAttempt({ puzzle_id: current.id, device_uuid: store.deviceUuid, moves_tried: selectedCols.length, outcome: quality, first_attempt_correct: quality === 'optimal', time_ms: Date.now() - puzzleStartTime })` (existing 6-field store shape — zero store changes); push `{ puzzleId: current.id, quality, category: 'forbidden_columns' }` into the `results` array before calling `go('summary')` on the final puzzle; call `track('puzzle_attempted', { puzzleId, category, submittedCols, correctCols })`, set phase to `'post-move'` (FR-020, FR-021, FR-022, FR-023; depends on T004)

**Checkpoint**: Forbidden Columns set fully playable; per-puzzle feedback and analytics fire correctly.

---

## Phase 4: User Story 3 — Play a Forced Win Sequence Puzzle (Priority: P2)

**Goal**: Wire forced_win sequence mode into ChallengeScreen using the existing SequenceHandler component.

**Independent Test**: Navigate to Forced Win set. Verify Board renders via SequenceHandler (not a single-move Board). Complete the forcing line. Verify `handleSequenceComplete(true)` fires, coach updates, "Next →" appears. Open network log — confirm zero `POST /api/evaluate-move` calls during the sequence.

- [ ] T006 [US3] Wire Forced Win sequence mode into `connect-four/src/screens/ChallengeScreen.jsx`: (a) read `connect-four/src/components/SequenceHandler.jsx` to identify every prop it consumes (do NOT guess at field names); (b) add `import { SequenceHandler } from '../components/SequenceHandler.jsx'`; (c) add `toSequenceHandlerShape(drawRow)` adapter function mapping `/draw` snake_case fields (`move_string`, `goal_prompt`, `id`, and any others SequenceHandler reads) to the camelCase shape SequenceHandler expects; (d) in the render, branch on `puzzles[currentIdx]?.interaction_mode === 'sequence'` — when true, **suppress Toolbar, Tier-1 strip, and CoachDialog** (SequenceHandler owns its own full-screen UI); render `<SequenceHandler key={current.id} puzzle={toSequenceHandlerShape(current)} onNext={() => handleSequenceComplete(true)} />`; **SC-007 deviation note**: SequenceHandler renders its own English banners ("Well done!" etc.) that are not yet i18n-keyed — this is an accepted tracked deviation to be resolved in a follow-up epic; (e) add `handleSequenceComplete(passed)` which calls `store?.recordPuzzleAttempt({ puzzle_id: current.id, device_uuid: store.deviceUuid, moves_tried: 1, outcome: passed ? 'optimal' : 'blunder', first_attempt_correct: passed, time_ms: Date.now() - puzzleStartTime })` (existing 6-field store shape — zero store changes), sets coach message from `coach.forced_win.${passed ? 'optimal' : 'blunder'}.*` pool, sets `evaluation({ quality: passed ? 'optimal' : 'blunder', badge: passed ? 'good' : 'bad' })`, pushes `{ puzzleId: current.id, quality: passed ? 'optimal' : 'blunder', category: 'forced_win' }` into the `results` array, sets phase to `'post-move'`, and calls `track('puzzle_solved_correct', ...)`; (f) add a comment: `// MVP: success-only — SequenceHandler.onNext carries no pass/fail argument; fail path deferred post-MVP`; (g) set coach message from `coach.forced_win.prompt.*` pool in `initPuzzle()` when `interaction_mode === 'sequence'`; **NOTE: the Learn More strip is suppressed for sequence puzzles (no single lastDrop.c to send)** (FR-025, FR-026, FR-027, FR-028, FR-029; depends on T004)

**Checkpoint**: Forced Win set fully playable; sequence completes to pass/fail; no evaluate-move calls mid-sequence.

---

## Phase 5: User Story 1 — Open the Deep Reveal Panel (Priority: P1)

**Goal**: Implement the Deep Reveal bottom-sheet panel inline in ChallengeScreen, wired to the existing "Learn more ▼" button. Auth gate and quota gate already exist on the button; this task implements the panel itself and the API call.

**Independent Test**: Play any single-move puzzle and commit a move. Tap "Learn more ▼" as authenticated user with quota → panel opens with spinner → explanation + bestLine appear within 6s. Tap the same puzzle again → instant render (cached). Tap "Collapse" → panel closes, board unchanged. Tap "Flag" → button becomes "Thanks — flagged". Unauthenticated → AuthModal. 429 → UpgradeModal.

- [ ] T007 [US1] Implement the Deep Reveal panel inline in `connect-four/src/screens/ChallengeScreen.jsx`: add state (`deepRevealOpen`, `deepRevealLoading`, `deepRevealData`, `deepRevealFlagged`, `deepRevealTimedOut`); reset all in `initPuzzle()`; implement `handleLearnMore()` — if no session show `AuthModal`, else open panel, set loading, fire a 6s timeout that sets `deepRevealTimedOut`, POST to `/api/explain-move-llm` with `{ movestring: current.move_string, col: lastDrop?.c }` and auth header, on 401 show `AuthModal`, on 429 show `UpgradeModal`, on success set `deepRevealData` and clear loading; implement `handleFlag()` — set `deepRevealFlagged`, POST to `/api/llm-feedback` with `{ movestring, llm_prompt: '', llm_response: deepRevealData.explanation, human_note: '', feature: 'challenges' }`, fire `track('deep_reveal_flagged', { puzzleId })`; render the bottom-sheet JSX conditionally: backdrop div + sheet with grab handle + Collapse button; loading state shows spinner + `t('deepReveal.loading')`; timeout state shows summaryLineKey text + `t('deepReveal.unavailable')`; loaded state shows (a) pattern tag chip(s) + quality badge from `evaluation` state, (b) non-interactive compact `<Board compact canPlay={false} overlays={overlays} />`, (c) `deepRevealData.explanation`, (d) `bestLine?.length > 0` chips row (1-indexed labels separated by chevron icons), (e) flag button or "Thanks — flagged" span; fire `track('deep_reveal_viewed', { puzzleId, cached: data.cached ?? false })` on successful data load (FR-001 through FR-009; depends on T003)

**Checkpoint**: Full Deep Reveal panel flow working end-to-end; cache hit/miss, timeout, flag, auth/quota gates all verified.

---

## Phase 6: User Story 4 — Post-Set Summary (Priority: P1)

**Goal**: Implement PostSetSummaryScreen and wire it to the 'summary' screen key in screenRegistry.

**Independent Test**: Complete all puzzles in any free set. Verify `go('summary', params)` is called from ChallengeScreen.handleNext(). Verify summary screen renders: green check hero + "Set complete!" heading, accuracy %, N/M optimal count, BY PATTERN breakdown (1 row for single-category sets), coach message, primary CTA. Verify `store.saveChallengeSession()` called exactly once. Verify `track('set_completed', ...)` fired once. Verify back arrow → setpicker.

- [ ] T008 [US4] Create `connect-four/src/screens/PostSetSummaryScreen.jsx` (new file): implement the full component reading `{ results, category }` from navigation params; compute `total`, `optimalCount`, `blunderCount`, `accuracy` (Math.round); compute `byPattern` object keyed by `r.category ?? category`; find `recommendedSlug` (lowest per-pattern accuracy, tie-break by `CATEGORY_ORDER` index); determine `isPerfect` (accuracy===100); derive `isFreeUser` from `store.getProfile().tier === 'free'` (NOT via `store.constructor.name` — use the store interface); determine `isProLesson` by checking if `recommendedSlug` is in the Pro lesson list from `CATEGORY_ORDER`/`PAID_CATEGORIES`; call `store?.saveChallengeSession(...)` and `track('set_completed', ...)` exactly once via `useEffect` with a `savedOnce` guard; render: TopBar with `onBack={() => go('setpicker')}`, hero section (green check icon + "Set complete!" h2), accuracy card (count line + ProgressBar + BY PATTERN rows with colored quality dots), CoachDialog with perfect or recommend message, primary CTA button (`handleCTA` — `go('setpicker')` if perfect, `setUpgradeOpen(true)` if `isProLesson && isFreeUser`, else `go('saga', { highlightSlug: recommendedSlug })`), ghost "Back to Challenges" button (always present when not perfect), UpgradeModal; import `CATEGORY_ORDER` and `CATEGORY_NAMES` from `../lib/categories.js`; all i18n keys `summary.*` are authored in T001 — do not add any here (FR-030 through FR-039; depends on T001, T004)
- [ ] T009 [US4] Wire `PostSetSummaryScreen` to the `'summary'` key in `connect-four/src/lib/screenRegistry.jsx`: import `{ PostSetSummaryScreen }` from `'../screens/PostSetSummaryScreen.jsx'`; replace the existing `PlaceholderScreen` at the `summary` key with `PostSetSummaryScreen` (FR-030; depends on T008)

**Checkpoint**: Full session loop complete — challenge → last puzzle → summary → back to setpicker all navigate correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Architecture documentation and contract updates. Constitution Principle VIII — MANDATORY.

- [ ] T010 [P] Update `docs/architecture/api-conventions.md` to document the extended `POST /api/explain-move-llm` response shape (`bestLine: string[]`, `cached?: boolean`) and the corrected quota ordering (cache check before quota decrement) (depends on T003)
- [ ] T011 [P] Update `docs/architecture/frontend-conventions.md` to document: (a) the Forbidden Columns branch in the Challenge Session state machine (`onColToggle` multi-select sub-branch within `'pre-move'` phase), (b) `challengeSets.js` i18n-key shape convention (`displayNameKey`/`descriptionKey`), (c) `SetPickerScreen` rendering pattern: `t(set.displayNameKey)` (depends on T004, T005)
- [ ] T012 [P] Update `specs/014-challenges-deep-reveal/contracts/explain-move-llm.md` to reflect the final implemented behavior — reconcile contract with plan and implementation unconditionally; do not skip this step even if no divergence is apparent (depends on T003)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (T001, T002): No dependencies — start immediately, run in parallel
Phase 2 (T003, T004): T003 depends on T002; T004 depends on T001; T003 and T004 are independent of each other
Phase 3 (T005): Depends on T004
Phase 4 (T006): Depends on T004 (independent of T005 — disjoint code paths)
Phase 5 (T007): Depends on T003 (and implicitly T005, T006 for full integration, but panel can be wired first)
Phase 6 (T008, T009): T008 depends on T001 and T004; T009 depends on T008
Phase 7 (T010–T012): Depends on T003, T004, T005 respectively
```

### User Story → Task Mapping

| User Story | Tasks | Priority |
|---|---|---|
| US1 — Deep Reveal Panel | T002, T003, T007 | P1 |
| US2 — Forbidden Columns | T001, T004, T005 | P1 |
| US3 — Forced Win Sequence | T004, T006 | P2 |
| US4 — Post-Set Summary | T001, T004, T008, T009 | P1 |

### Parallel Opportunities

```bash
# Phase 1 — run together:
T001  # en.json i18n keys
T002  # computeBestLine in explainSimulate.js

# Phase 2 — run together after Phase 1:
T003  # server endpoint (needs T002)
T004  # challengeSets + categories unlock (needs T001)

# Phase 3 + 4 — run together after T004:
T005  # Forbidden Columns in ChallengeScreen
T006  # Forced Win in ChallengeScreen

# Phase 5 — after T003 (and T005/T006 for full integration test):
T007  # Deep Reveal panel in ChallengeScreen

# Phase 6 — T008 and T009 sequential (T009 depends on T008):
T008 → T009

# Phase 7 — run all three in parallel after their respective dependencies:
T010, T011, T012
```

---

## Implementation Strategy

### MVP First

1. Complete T001 + T002 (Phase 1, parallel)
2. Complete T003 + T004 (Phase 2, parallel)
3. Complete T007 (Deep Reveal panel — US1 P1 payoff)
4. **STOP and VALIDATE**: Cache hit/miss, timeout, flag, auth gate
5. Continue with T005 (Forbidden Columns) + T006 (Forced Win) in parallel
6. Complete T008 + T009 (Post-Set Summary)
7. Complete T010–T012 (docs)

### Incremental Delivery

Each phase delivers a testable increment:
- After T003: Extended endpoint testable via curl/Postman
- After T004: Set Picker shows new sets; free-tier users can draw forbidden_columns and forced_win puzzles
- After T005: Forbidden Columns set fully playable
- After T006: Forced Win set fully playable
- After T007: Deep Reveal panel fully functional for any single-move puzzle
- After T008+T009: Full session loop with summary screen

---

## Notes

- **T004 must be atomic** across all four files: `challengeSets.js`, `SetPickerScreen.jsx`, `server/categories.js`, `src/lib/categories.js`. Splitting this task leaves the app in a broken intermediate state.
- **T005 sub-step**: Before porting `handleForbiddenSubmit`, read `PuzzlesPage.jsx` lines 345–415 to confirm current implementation before adapting. The scoring reads `results[0].data.forbiddenCols` — do NOT read `puzzle.correct_cols`.
- **T006 sub-step**: Read `SequenceHandler.jsx` fully before writing `toSequenceHandlerShape()`. The adapter must cover every prop SequenceHandler reads from its `puzzle` object.
- **T007**: The `handleLearnMore` function uses no client-side quota pre-flight (no `store.getProfile()` call). The server 429 is the sole quota gate. `UpgradeModal` is triggered by a 429 response only.
- **`bestLine` guard**: `bestLine?.length > 0` in the panel render is purely defensive for legacy cached rows that return `null` for `bestLine`. In normal operation `bestLine` always has ≥1 element.
- **Fail path deferred**: `SequenceHandler.onNext` carries no pass/fail arg; `onNext` is always wired as `() => handleSequenceComplete(true)`. The `handleSequenceComplete(passed)` function retains the `passed` parameter for future extension. A comment in the code MUST document this.
- **`recordPuzzleAttempt` shape**: ALL callers (T005, T006, and any single-move path) MUST use the existing 6-field shape `{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }`. Zero store changes are made in this epic. The spec FR-022/FR-029 short-form notation (`{ puzzleId, category, correct }`) is documentation shorthand only — it does NOT represent the actual call shape.
- **`isFreeUser` derivation**: T008 MUST derive the free-tier check via `store.getProfile().tier === 'free'`, not via `store.constructor.name`. This uses the public store interface and is environment-agnostic.
- **Summary CTA navigation**: When accuracy < 100% and not Pro-gated, the CTA navigates to `go('saga', { highlightSlug: recommendedSlug })` (saga map with the recommended category highlighted). It does NOT call `go('concept', { lessonId })` — the concept screen is a PlaceholderScreen until Epic 4.
- **Learn More strip suppressed for forbidden/sequence**: The "Learn more ▼" Tier-1 strip MUST be hidden whenever `category === 'forbidden_columns'` or `interaction_mode === 'sequence'`. There is no `lastDrop.c` available to send to the explain endpoint for these puzzle types.
- **i18n authorship is T001-only**: All i18n keys for this epic are added exclusively in T001. Tasks T007 and T008 MUST NOT contain "if not already added" hedges — all keys are guaranteed present after T001 completes.
