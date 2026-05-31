# Tasks: Epic 2a — Challenges: Set Picker, Single-Move Board & Tier-1 Feedback

**Input**: Design documents from `specs/013-challenges-set-picker/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api-contracts.md ✓

**Organization**: Tasks are grouped by phase/user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are in every description

---

## Phase 1: Foundation — Backend Modules (blocks A4 endpoints)

**Purpose**: Pure modules with no external dependencies. Must complete before endpoints are wired.

- [x] T001 Create `connect-four/server/moveQualityScorer.js` — export `scoreMove(scores, playedCol)` implementing FR-032/FR-033 classification rules (optimal/suboptimal/blunder, losing-position branch, sign ordering positive > 0 > negative). Zero external dependencies — pure function.
- [x] T002 [P] Create `connect-four/server/challengeSets.js` — export `CHALLENGE_SETS` ordered array and `CHALLENGE_SET_MAP` lookup per Decision 5. Include 10 sets: `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat` (free) + `mixed`, `undercut`, `overcut`, `figure_7`, `j_shape` (Pro). Do NOT include `forced_win` or `forbidden_columns` (Epic 2b scope).
- [x] T003 [P] Update `connect-four/server/categories.js` — PAID_CATEGORIES remap per FR-031/Decision 2: remove `claimeven` and `z_threat`; add `mixed`. Leave `VALID_CATEGORIES` and `CATEGORY_ORDER` unchanged.

**Checkpoint**: Scorer, challenge sets module, and categories remap done. All three are in-memory modules with no server startup required to verify.

---

## Phase 2: Foundation — i18n Keys (blocks D1 coach rendering)

**Purpose**: i18n key pools required by the server's `pickFromPool` helper and the frontend's `t()` calls.

- [x] T004 Update `connect-four/src/i18n/en.json` — add all keys required by Epic 2a:
  1. `setpicker.*` screen namespace (`title`, `subtitle`, `positions_count`).
  2. `challenge.*` screen namespace (`progress`, `leave_confirm_title`, `leave_confirm_body`, `leave_keep`, `leave_leave`, `next`).
  3. `challenge.quality.optimal`, `challenge.quality.suboptimal`, `challenge.quality.blunder` — quality label strings for Tier-1 strip (FR-050b).
  4. `coach.<category>.prompt.0`–`.2` for each free category (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`) — 2–3 variants each, naming pattern type without revealing column (FR-051).
  5. `coach.<category>.hint.0`–`.1` for each free category — hint text that must NOT name a specific column (FR-052).
  6. `coach.<category>.optimal.0`, `.suboptimal.0`, `.blunder.0` for each free category — post-move coach phrases (FR-053). Preserve any existing coach keys.
  7. `eval.<category>.optimal.summary.0`, `.suboptimal.summary.0`, `.blunder.summary.0` for each free category — Tier-1 summary lines in the new `eval.*` namespace (FR-054).

**Checkpoint**: `en.json` has all coach, eval, setpicker, challenge, and quality keys. Verify by checking each required key path resolves.

---

## Phase 3: Foundation — Shared Frontend Utility (blocks D1 board rendering)

**Purpose**: Extract `buildBoard` from `PuzzlesPage.jsx` into a shared module so both `PuzzlesPage` and `ChallengeScreen` can import it. Pure refactor — no behavior change.

- [x] T005 Create `connect-four/src/lib/board.js` — extract the `buildBoard(moves)` function currently defined inline in `connect-four/src/pages/PuzzlesPage.jsx` (line 15) and export it as a named export. Update `PuzzlesPage.jsx` to import `buildBoard` from `src/lib/board.js`. No behavior change — this is a pure refactor. This task is a prerequisite for T012 (ChallengeScreen board rendering).

**Checkpoint**: `PuzzlesPage.jsx` still works correctly (no visual or functional regression); `src/lib/board.js` exports `buildBoard`.

---

## Phase 4: Backend Endpoints (A4)

**Purpose**: Three new endpoints wired into `server/index.js`. Must be registered BEFORE `GET /api/puzzles/:id` (currently line 806). No frontend dependency — backend-only phase.

- [x] T006 Implement `GET /api/puzzles/counts` in `connect-four/server/index.js` — insert BEFORE `GET /api/puzzles/:id`. Handler: single Supabase GROUP BY query (`SELECT category, COUNT(*) FROM puzzles WHERE is_active = true GROUP BY category`); build counts map from `CATEGORY_ORDER` (all categories present, 0 if missing); include `sets` array from `CHALLENGE_SETS`; no auth gate. Response shape: `{ counts: { [category]: number }, sets: ChallengeSet[] }` per contracts/api-contracts.md. Add `503` guard for null supabase.
- [x] T007 Implement `GET /api/puzzles/draw` in `connect-four/server/index.js` — insert BEFORE `GET /api/puzzles/:id`. Handler must implement the validation flow from Decision 11 in this exact order: (1) `mixed` pre-check branch before `VALID_CATEGORIES` test → 403 if not Pro; (2) `!VALID_CATEGORIES.has(category)` → 400; (3) `!userCanAccessCategory` → 403; (4) validate `n` (integer 1–8, default 8) → 400 `{ error: 'invalid n' }` if out of range. For standard categories: `SELECT id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player FROM puzzles WHERE category=$1 AND is_active=true ORDER BY RANDOM() LIMIT $2`. For `mixed`: sample across all `CATEGORY_ORDER` categories passing `userCanAccessCategory`. Response: `{ puzzles: DrawnPuzzle[] }` per contracts/api-contracts.md.
- [x] T008 Implement `POST /api/evaluate-move` in `connect-four/server/index.js` — validate `movestring` against `/^[0-6]{0,42}$/` and `col` as integer 0–6 (400 on invalid). Statically import `../src/i18n/en.json` at module top for `pickFromPool`. Processing: empty movestring → `EMPTY_BOARD_SCORES`; else `await solver.query(movestring)` for scores; call `scoreMove(scores, col)` (imported from `./moveQualityScorer.js`); call `classify(movestring, col, scores)` → `patternTag`; `phrasePoolKey = category || patternTag`; pick random key from `coach.<phrasePoolKey>.<quality>.*` → `coachPhraseKey`; pick from `eval.<phrasePoolKey>.<quality>.summary.*` → `summaryLineKey`; set `coachMood` (`optimal`→`'happy'`, `suboptimal`→`'think'`, `blunder`→`'oops'`). Response: `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`.

**Checkpoint**: Manual golden-path tests:
- `GET /api/puzzles/counts` returns object with all 11 categories and a `sets` array.
- `GET /api/puzzles/draw?category=immediate_threat&n=3` returns 3 or fewer puzzles.
- `GET /api/puzzles/draw?category=claimeven&n=8` returns puzzles (claimeven is now free — no 403).
- `GET /api/puzzles/draw?category=mixed` returns 403 for unauthenticated user.
- `POST /api/evaluate-move` with `{ movestring: '', col: 3, category: 'immediate_threat' }` returns valid response with `coachPhraseKey` starting with `coach.immediate_threat.`.
- `POST /api/evaluate-move` with invalid movestring returns 400.

---

## Phase 5: User Story 1 — Browse and Enter a Challenge Set (Priority: P1)

**Goal**: Set Picker screen renders live counts, free sets are tappable, Pro sets show padlock and open UpgradeModal.

**Independent Test**: Navigate to the `setpicker` screen, verify the list renders with live counts from `GET /api/puzzles/counts`, tap a free set, verify the `challenge` screen opens with the drawn puzzles for that category.

- [x] T009 [US1] Update `connect-four/src/lib/categories.js` — mirror server-side PAID_CATEGORIES remap (FR-055): remove `claimeven` and `z_threat`; add `mixed`. Keep all other exports unchanged.
- [x] T010 [US1] Create `connect-four/src/screens/SetPickerScreen.jsx` — component signature: `function SetPickerScreen({ go, goBack })` (no `params` wrapper). State: `sets`, `counts`, `loading`, `upgradeOpen`. On mount: fetch `GET /api/puzzles/counts` → populate `sets` (from response `.sets`) and `counts` (from response `.counts`); hide sets where `counts[set.slug] === 0`. Render: `TopBar` with back → `go('home')`; scrollable list of `SetCard` for each visible set. **Existing SetCard API — `title` (not `displayName`), `positionCount`, `onClick` (not `onTap`)**: free sets pass `onClick={() => go('challenge', { category: set.slug })}`; Pro sets pass `onClick={() => setUpgradeOpen(true)}`. **Existing UpgradeModal API — no `open` prop; use conditional rendering**: `{upgradeOpen && <UpgradeModal onDismiss={() => setUpgradeOpen(false)} onNotify={...} />}`. Do NOT add a manual `track()` call — the navigator auto-fires `screen_viewed`. All strings via `t('setpicker.*')`.
- [x] T011 [US1] Register `SetPickerScreen` in `connect-four/src/lib/screenRegistry.jsx` — replace the `setpicker` placeholder (`<PlaceholderScreen screenKey="setpicker" />`) with the real import and component reference.

**Checkpoint**: User Story 1 independently testable. Navigate to `setpicker`, at least 5 free set cards visible with live counts; tap a free set navigates to `challenge`; tap a Pro set opens UpgradeModal; back arrow navigates to `home`.

---

## Phase 6: User Story 2 — Solve a Single-Move Puzzle (Priority: P1)

**Goal**: Challenge screen loads puzzles, shows board in pre-move state, commits moves immediately on tap with drop animation and column badge.

**Depends on**: T005 (buildBoard), T007 (draw endpoint), T008 (evaluate-move endpoint), T004 (i18n keys for coach prompts).

**Independent Test**: Load a puzzle in the `challenge` screen, tap a column, verify the disc animates in, a badge appears on that column, and `POST /api/evaluate-move` is called with the correct `movestring` and `col`.

- [x] T012 [US2] Create `connect-four/src/screens/ChallengeScreen.jsx` — loading + pre-move + board rendering (first half of D1). Component signature: `function ChallengeScreen({ go, goBack, category })` (no `params` wrapper). State: `phase` ('loading'|'pre-move'|'post-move'), `puzzles`, `currentIdx`, `results`, `lastDrop`, `evaluation`, and a `useRef` for the stable per-puzzle prompt key. On mount: fetch `GET /api/puzzles/draw?category=${category}&n=8`; select `promptKey` randomly from `coach.<category>.prompt.*`; `setPhase('pre-move')`. Derive board state from `current.move_string` via `buildBoard` (imported from `src/lib/board.js`). Pre-move rendering: Board (with `lastDrop`), CoachDialog (prompt), progress counter (`currentIdx + 1 / puzzles.length`), ProgressBar (fill = N/M), Toolbar with Hint button only (no Undo). Back arrow: `window.confirm('Leave this set? Your progress won\'t be saved.')` → if confirmed, `go('setpicker')`. Hint tap: pick key from `coach.<category>.hint.*`; update CoachDialog text.
- [x] T013 [US2] Add move-commit flow to `connect-four/src/screens/ChallengeScreen.jsx` — on column tap (pre-move only): (1) `track('puzzle_attempted', { puzzleId: current.id, category })`; (2) compute drop row from board; (3) commit disc optimistically (update board state, `setLastDrop({ c: col, r: row })`); (4) `setPhase('post-move')` immediately (commit-first, FR-017); (5) fire `POST /api/evaluate-move` with `{ movestring: current.move_string, col, category }`; (6) on response: `setEvaluation(response)`, compute `badge` prop for Board as `{ col: playedCol, type: evaluation.badge, label: QUALITY_GLYPH[evaluation.quality] }` where `QUALITY_GLYPH = { optimal: '✓', suboptimal: '?', blunder: '✕' }` is a static const in the component; (7) `store.recordPuzzleAttempt({ puzzleId: current.id, category, correct: response.quality === 'optimal' })`; (8) fire analytics `track('puzzle_solved_correct', ...)` or `track('puzzle_solved_wrong', ...)`. Check `checkWin` after move commit — if won and `quality === 'optimal'`, render `win` overlays on the four-in-a-row cells. Toolbar in post-move: "Next →" button only (no Undo, no Retry).

**Checkpoint**: User Story 2 independently testable. Load a puzzle, tap a column: disc animates in, quality badge appears on played column, `POST /api/evaluate-move` is called, store records the attempt, analytics fire.

---

## Phase 7: User Story 3 — Receive Tier-1 Post-Move Feedback (Priority: P1)

**Goal**: After a move, the Tier-1 strip appears below the board with quality tag, summary line, and "Learn more ▼" button. CoachDialog updates with resolved phrase and mood.

**Depends on**: T012, T013 (ChallengeScreen base + move commit).

**Independent Test**: Commit a move, verify the Tier-1 strip appears with a quality tag, summary line (resolved from `summaryLineKey`), and "Learn more ▼" button. Verify the Toolbar shows only "Next →".

- [x] T014 [US3] Add Tier-1 strip rendering to `connect-four/src/screens/ChallengeScreen.jsx` — in post-move phase, render the Tier-1 strip below the board containing: (1) quality tag with glyph and i18n label (`t('challenge.quality.<quality>')`); (2) summary line resolved via `t(evaluation.summaryLineKey)`; (3) "Learn more ▼" button. Update CoachDialog with `t(evaluation.coachPhraseKey)` and `evaluation.coachMood`. Quality tag visual mapping: `optimal` → green/`good`, `suboptimal` → amber/`mid`, `blunder` → red/`bad`. No Flag icon in Epic 2a (FR-028). All strings via `t()`.
- [x] T015 [US3] Add "Learn more ▼" gate logic to `connect-four/src/screens/ChallengeScreen.jsx` — implement `handleLearnMore()` per Decision 8: (1) if no session (`!session`): `setAuthOpen(true)` — opens `AuthModal`; (2) if authenticated but weekly quota exhausted: `setUpgradeOpen(true)` — opens `UpgradeModal`; (3) else: stub that logs `console.log('[Epic 2b] Deep Reveal would open here')`. **Weekly quota stub (Epic 2a)**: the quota-exhausted condition is always `false` in this epic — Deep Reveal limit is `undefined` until Epic 2b defines and implements it. Add the comment `// TODO Epic 2b: implement real weekly limit check` at the branch. Add state for `authOpen` and `upgradeOpen`. **Existing modal APIs — no `open` prop; use conditional rendering**: `{authOpen && <AuthModal onClose={() => setAuthOpen(false)} reason="deepReveal" />}` and `{upgradeOpen && <UpgradeModal onDismiss={() => setUpgradeOpen(false)} onNotify={...} />}`. **Existing component API — no `open` prop; use conditional rendering.**

**Checkpoint**: User Story 3 independently testable. After committing a move: Tier-1 strip visible below board with correct quality tag color/label, summary line text resolved, "Learn more ▼" opens AuthModal when anonymous.

---

## Phase 8: User Story 4 — Progress Through a Session (Priority: P2)

**Goal**: Progress counter and bar update as puzzles advance; back-confirmation dialog always shown; session ends at summary screen with results.

**Depends on**: T012, T013, T014 (ChallengeScreen complete).

**Independent Test**: Complete all drawn puzzles (or advance through all), verify the counter increments correctly and that the final "Next →" navigates to the `summary` screen with the session results.

- [x] T016 [US4] Add "Next →" session advancement to `connect-four/src/screens/ChallengeScreen.jsx` — on "Next →" tap: (1) accumulate `results` with `{ puzzleId: current.id, quality: evaluation.quality, category }`; (2) if `currentIdx + 1 < puzzles.length`: advance `currentIdx`, reset `phase` to `'pre-move'`, pick new prompt key for next puzzle; (3) else: `go('summary', { results, category })`. Progress counter shows `currentIdx + 1` completed of `puzzles.length` total; ProgressBar fill = `(currentIdx + 1) / puzzles.length * 100`. Wait for evaluation arrival before counting puzzle as completed.

**Checkpoint**: User Story 4 independently testable. Complete all puzzles: counter increments correctly, final "Next →" navigates to `summary` screen with `results` array in navigation params.

---

## Phase 9: Screen Registration — Challenge

**Purpose**: Wire `ChallengeScreen` into the screen registry after it is fully implemented and manually verified.

- [x] T017 Register `ChallengeScreen` in `connect-four/src/lib/screenRegistry.jsx` — replace the `challenge` placeholder (`<PlaceholderScreen screenKey="challenge" />`) with the real import and component reference.

**Checkpoint**: Full end-to-end golden path works: setpicker → challenge screen opens, puzzles load, move committed, Tier-1 strip appears, "Next →" advances, summary screen reached.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and architecture updates mandated by Constitution Principle VIII.

- [x] T018 [P] Update `docs/architecture/api-conventions.md` if any new convention was introduced by the three new endpoints (e.g. the `pickFromPool` i18n-key-selection pattern, the `sets` array bundled in `counts` response, or the `mixed` pre-check routing pattern).
- [x] T019 [P] Update `docs/architecture/server-conventions.md` if the static cross-directory import of `en.json` from `server/index.js` (introduced in T008) establishes a new convention or requires a note for future maintainers.
- [x] T020 [P] Update `docs/architecture/frontend-conventions.md` if the `buildBoard` shared utility in `src/lib/board.js` or the challenge session state pattern establishes a new convention.
- [x] T021 Verify `specs/013-challenges-set-picker/contracts/api-contracts.md` matches the implemented endpoint shapes (especially the `GET /api/puzzles/counts` response which adds `sets` alongside `counts`). Update if any drift.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (T001–T003): No dependencies — pure modules, start immediately
Phase 2 (T004):      No dependencies — JSON file, start immediately
Phase 3 (T005):      No dependencies — pure refactor, start immediately

Phases 1–3 can all run in parallel.

Phase 4 (T006–T008): Depends on Phase 1 (T001 scorer, T002 challengeSets, T003 categories)
                      and Phase 2 (T004 en.json, for pickFromPool).
                      T006, T007, T008 can run in parallel with each other (different endpoints).

Phase 5 US1 (T009–T011): Depends on Phase 4 (T006 counts endpoint).
                           T009 and T010 can run in parallel (different files).
                           T011 depends on T010.

Phase 6 US2 (T012–T013): Depends on Phase 3 (T005 buildBoard), Phase 4 (T007 draw, T008 evaluate),
                           Phase 2 (T004 coach prompt keys).
                           T012 and T013 are sequential (T013 extends T012).

Phase 7 US3 (T014–T015): Depends on T013 (move commit in place).
                           T014 and T015 can run in parallel (both extend ChallengeScreen
                           but touch different sections).

Phase 8 US4 (T016):      Depends on T014 (Tier-1 strip for evaluation.quality access).

Phase 9 (T017):           Depends on T016 (ChallengeScreen complete).

Phase 10 (T018–T021):     Depends on all implementation phases complete.
```

### Critical Dependency Edge

**T005 (buildBoard) → T012 (ChallengeScreen)**. This is the Constraint 0 from plan.md. T012 cannot be started until `src/lib/board.js` exists with the `buildBoard` export.

### Route Registration Order (Correctness-Critical)

T006, T007 MUST be inserted in `server/index.js` BEFORE the existing `GET /api/puzzles/:id` handler (line 806). If registered after, Express silently routes `draw` and `counts` into the `:id` handler. Add a comment at the insertion point: `// NOTE: /draw and /counts MUST remain above /:id — Express first-match ordering`.

### `mixed` Pre-Check Order (Correctness-Critical)

In T007, the `mixed` branch MUST run before the `VALID_CATEGORIES.has(category)` check. `mixed` is NOT in `VALID_CATEGORIES`; if the order is reversed, `mixed` always returns 400. Add a comment at the branch: `// mixed is not in VALID_CATEGORIES — must be checked first`.

---

## Parallel Execution Examples

### Phases 1–3 (all in parallel)

```
Parallel start:
  T001  Create moveQualityScorer.js
  T002  Create challengeSets.js
  T003  Update server/categories.js PAID_CATEGORIES
  T004  Update en.json (all i18n keys)
  T005  Extract buildBoard to src/lib/board.js
```

### Phase 4 (after Phases 1–3)

```
Parallel:
  T006  GET /api/puzzles/counts
  T007  GET /api/puzzles/draw
  T008  POST /api/evaluate-move
```

### Phase 5 (after T006)

```
Parallel:
  T009  Update src/lib/categories.js
  T010  Create SetPickerScreen.jsx
Then:
  T011  Register SetPickerScreen in screenRegistry
```

### Phase 7 (after T013)

```
Parallel:
  T014  Tier-1 strip rendering
  T015  "Learn more ▼" gate logic
```

---

## Implementation Strategy

### MVP First (US1 + US2 — Core Loop)

1. Complete Phases 1–3 in parallel (T001–T005)
2. Complete Phase 4 in parallel (T006–T008)
3. Complete Phase 5 (T009–T011) → Set Picker works
4. Complete Phase 6 (T012–T013) → moves can be committed
5. **STOP and VALIDATE**: End-to-end: setpicker → tap free set → challenge screen → tap column → badge appears
6. Add Phase 7 (T014–T015) → Tier-1 feedback
7. Add Phase 8 (T016) + Phase 9 (T017) → session progress + summary navigation

### Incremental Delivery

- After T011: Set Picker browseable (US1 done)
- After T013: Single-move puzzle loop works (US2 done)
- After T015: Tier-1 feedback visible (US3 done)
- After T017: Full session with progress + summary handoff (US4 done)

---

## Notes

- No database migrations in this epic.
- `window.confirm()` is acceptable for the back-confirmation dialog in Epic 2a (Decision 9).
- The `summary` screen is a placeholder in Epic 2a; `go('summary', { results, category })` should land gracefully on the existing `PlaceholderScreen`.
- `forced_win` and `forbidden_columns` are intentionally absent from `challengeSets.js` — Epic 2b scope.
- No numeric solver scores are ever surfaced to the user — quality label only (SC-005 / mockup divergence note in spec assumptions).
- `track('screen_viewed', { screen: 'setpicker' })` is fired by the navigator automatically — do NOT add a manual call in `SetPickerScreen.jsx` (would double-fire).
