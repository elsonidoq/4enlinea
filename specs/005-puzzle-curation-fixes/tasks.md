# Tasks: Puzzle Curation & Classifier Fixes

**Input**: Design documents from `/specs/005-puzzle-curation-fixes/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/admin-api.md ✓, quickstart.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Apply schema changes that all subsequent code depends on.

- [X] T001 Create DB migration file `connect-four/server/migrations/009_curation_fixes.sql` adding `highlight_cells jsonb` and `debug_trace jsonb` nullable columns to `public.candidates`, then apply it to the database

**Checkpoint**: Migration applied — new columns exist on `candidates`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Two independent prerequisites that MUST be complete before user-story phases can begin.

- [X] T002 [P] Add `export` keyword to `checkWin` and `countWinningThreats` function declarations in `connect-four/server/classifier.js` so downstream code can import them
- [X] T003 [P] Create `connect-four/server/c4solver-wrapper.js` exporting `createSolverProcess()` that spawns the solver with `-a -b 7x6.book`, returns exactly 7 numeric scores per `query(moveString)` call (strips move-string echo when `parts.length === 8`), and exposes a `destroy()` method

**Checkpoint**: `checkWin` and `countWinningThreats` are importable; shared wrapper module exists and passes a smoke test

---

## Phase 3: User Story 1 — Classifier Accuracy Fixes (Priority: P1) 🎯 MVP

**Goal**: Fix three systematic classifier bugs (C1, C2, C3) so false-positive candidates are eliminated before reaching an annotator.

**Independent Test**: Run `node --test tests/classifier/classifier.test.js` against the 8 known false-positive records and confirm all pass.

- [X] T004 [P] [US1] In `connect-four/server/classifier.js`, fix the `isImmediateWin` helper: change `score === winScore` to `score >= winScore`
- [X] T005 [US1] In `connect-four/server/classifier.js` `classify()`, add the Cat 1 board-level guard: after `score >= winScore && score > 0`, import `parseBoardState` (already in file), place the piece at `(colHeights[candidateCol], candidateCol)`, call `checkWin`, and only tag `immediate_threat` if `checkWin` returns true; requires T002 (exported `checkWin`) and T004
- [X] T006 [P] [US1] In `connect-four/server/classifier.js`, add a `case 7` branch in `classify()`: compute `opponentWinScore = -Math.ceil((41 - moveCount) / 2)`; tag `forbidden_column` if `scores.some(s => s === opponentWinScore) && scores.every(s => s <= 0)`
- [X] T007 [US1] In `connect-four/tests/classifier/classifier.test.js`, add regression fixtures for all 8 known false-positive records: 4 C1 fixtures (must NOT return category 1), 2 C2 fixtures (must return category 1), 2 C3 fixtures (must NOT return `forbidden_column`), and 1 synthetic positive Cat 7 fixture (must return `forbidden_column`); requires T004–T006

**Checkpoint**: `node --test tests/classifier/classifier.test.js` passes all 9 new fixtures

---

## Phase 4: User Story 2 — Correct Highlight Cell in Curation View (Priority: P1) 🎯 MVP

**Goal**: Fix the `deriveHighlightCol` fallback in the curation UI so Cat 1 highlights work correctly for positions with score > winScore.

**Independent Test**: Open a `58ebbed9` or `69dced55` position in the curation UI and verify a cell is highlighted in the correct column.

- [X] T008 [P] [US2] In `connect-four/src/components/CurationWorkspace.jsx`, find `deriveHighlightCol` `case 1` and change `score === winScore` to `score >= winScore` (FR-003)

**Checkpoint**: Both previously-unhighlighted Cat 1 positions show a highlight cell

---

## Phase 5: User Story 9 — Consolidate c4solver Wrappers (Priority: P3)

**Goal**: Replace the two IPC implementations (`GeneratorSolver` in candidate-generator.js, `Connect4Solver` in index.js) with the shared wrapper from T003.

**Independent Test**: Run `node --test` (full suite); all existing tests pass.

- [X] T009 [US9] In `connect-four/server/candidate-generator.js`, remove `GeneratorSolver` class, import `createSolverProcess` from `./c4solver-wrapper.js`, and replace all usages; requires T003
- [X] T010 [US9] In `connect-four/server/index.js`, remove `Connect4Solver` class, import `createSolverProcess` from `./c4solver-wrapper.js`, and replace all usages; keep the inline `queryDepth` helper (depth-limited, fresh process each call) unchanged; requires T003
- [X] T011 [US9] Run `node --test` and confirm the full suite passes after wrapper consolidation; fix any test failures caused by T009–T010

**Checkpoint**: No IPC loop remains in `candidate-generator.js` or `index.js`; full suite green

---

## Phase 6: User Story 3 — Debug Trace Per Board (Priority: P2)

**Goal**: Record a per-rollout debug trace at generation time and display it as a collapsible panel in the curation view.

**Independent Test**: Generate one board, open the curation view, expand the debug panel, verify all fields (temperatures, per-ply scores/weights/sampled_col, termination) are present.

- [X] T012 [US3] In `connect-four/server/candidate-generator.js`, update `solverWeightedPosition` to accumulate a `plies` array (one entry per iteration: `{ply, player, scores, weights, sampled_col}`) and return `{moveString, trace: {temperature_p1, temperature_p2, termination, plies}}` instead of `string | null`; update the call-site destructure in `generateCandidates`; requires T009
- [X] T013 [US3] In `connect-four/server/index.js`, add `debug_trace: c.debug_trace ?? null` to the `rows` mapping in `POST /api/admin/generate` (around line 848–856); requires T001, T010, T012
- [X] T014 [P] [US3] In `connect-four/src/components/CurationWorkspace.jsx`, add a collapsible debug section with a `showTrace` boolean state (reset in the `idx`-change `useEffect`); render a `DebugTracePanel` inline component that shows temperatures, termination reason, and a per-ply table; display "no trace available" when `candidate.debug_trace` is null

**Checkpoint**: New candidates show a populated debug panel; legacy candidates show "no trace available"

---

## Phase 7: User Story 4 — Skip Candidate Without Deciding (Priority: P2)

**Goal**: Add a Skip button that advances to the next candidate without recording any decision.

**Independent Test**: Load curation view with ≥2 pending candidates; press Skip on the first; confirm second is shown and first still has status "pending" in the DB.

- [X] T015 [P] [US4] In `connect-four/src/components/CurationWorkspace.jsx`, add a "Skip" button that increments the local candidate index without making any API call; handle the last-candidate edge case by showing an appropriate "no more candidates" state

**Checkpoint**: Skip advances the view without changing the candidate's DB status

---

## Phase 8: User Story 5 — Minimum Move Count Enforcement (Priority: P2)

**Goal**: Enforce a hard minimum of [14, 34] moves per rollout so near-empty boards are never stored.

**Independent Test**: Generate 50 candidates; verify no `move_string` has fewer than 14 characters.

- [X] T016 [US5] In `connect-four/server/candidate-generator.js`, inside `generateCandidates`, draw `minMoves = 14 + Math.floor(rng() * 21)` before the rollout, set `maxMoves = Math.max(minMoves, category <= 2 ? 20 : 34)`, and after destructuring the result add `if (moveString.length < minMoves) continue;`; requires T009, T012
- [X] T017 [P] [US5] In `connect-four/tests/integration/candidate-generator.test.js`, add a test that generates a small batch and asserts every resulting `move_string` has `length >= 14`

**Checkpoint**: Generator discards short rollouts; integration test passes

---

## Phase 9: User Story 6 — Human-Readable Category Name (Priority: P2)

**Goal**: Display the human-readable category label instead of the bare number in the curation view.

**Independent Test**: Load any candidate in the curation view; category field shows text (e.g., "Immediate Win"), not a digit.

- [X] T018 [P] [US6] In `connect-four/src/components/CurationWorkspace.jsx`, add a `CATEGORY_NAMES` map `{1: 'Immediate Win', 2: 'Forced Block', ...}` and render `CATEGORY_NAMES[category] ?? 'Unknown'` next to or in place of the raw category number

**Checkpoint**: Category header shows label text; unknown category shows "Unknown" without crash

---

## Phase 10: User Story 7 — UI Polish: Escape Key & Button Labels (Priority: P3)

**Goal**: Pressing Escape closes the reject modal; bulk-delete button reads "Delete all pending".

**Independent Test**: Open reject modal, press Escape → modal closes. Verify button label and confirmation text are updated.

- [X] T019 [P] [US7] In `connect-four/src/components/RejectModal.jsx`, add a `useEffect` that attaches a `keydown` listener calling `onClose` when `e.key === 'Escape'`; clean up on unmount
- [X] T020 [P] [US7] In `connect-four/src/components/CandidateDashboard.jsx`, rename the bulk-action button label from "Reject all" (or equivalent) to "Delete all pending" and update the confirmation message to state that un-reviewed (pending) candidates will be permanently deleted

**Checkpoint**: Escape closes modal; button label and confirmation text are updated

---

## Phase 11: User Story 8 — Multi-Move Highlight for Complex Patterns (Priority: P3)

**Goal**: Compute and store `highlight_cells` at generation time for all categories; render stored cells in the curation view.

**Independent Test**: Load one Cat 4, Cat 5, and Cat 6 candidate; verify correct number of highlighted cells per algorithm. Load a Cat 1 candidate; verify only one cell is highlighted.

- [X] T021 [US8] In `connect-four/server/candidate-generator.js`, after a candidate passes `checkPredicate` and `isClean`, compute `highlight_cells` for Cat 1/2/3 as `[{col: correctCols[0], row: heights[correctCols[0]], role: 'hint'}]` using `getHeights(moveString)`; requires T009
- [X] T022 [P] [US8] In `connect-four/server/candidate-generator.js`, implement the Cat 4 Fork Setup `highlight_cells` algorithm (FR-015a 7-step board algorithm) using imported `checkWin` and `countWinningThreats` from `classifier.js`; requires T002, T021
- [X] T023 [US8] In `connect-four/server/candidate-generator.js`, implement the Cat 5 Zugzwang depth filter (`R = (43 - 2×|maxScore|) - moveCount ≤ 6`) and PV trace `highlight_cells` algorithm (FR-015b/c): discard candidates with `R > 6`; for passing candidates trace up to K=6 solver plies alternating loser/winner roles; requires T021
- [X] T024 [P] [US8] In `connect-four/server/candidate-generator.js`, implement the Cat 6 Parity Control `highlight_cells` algorithm (FR-015d parity formula + undercut check, board-level only, no extra solver calls) using imported `checkWin`; requires T002, T021
- [X] T025 [P] [US8] In `connect-four/server/candidate-generator.js`, implement Cat 7 `highlight_cells` as `[{col: firstOpponentWinScoreCol, row: heights[firstOpponentWinScoreCol], role: 'hint'}]`; requires T021
- [X] T026 [US8] In `connect-four/server/index.js`, add `highlight_cells: c.highlight_cells ?? null` to the `rows` mapping in `POST /api/admin/generate`; requires T001, T010, T021–T025
- [X] T027 [US8] In `connect-four/src/components/CurationWorkspace.jsx`, replace the current single-cell `highlightedCells` build with the stored-cell-first logic: if `candidate.highlight_cells` is non-empty, convert `{col, row, role}` → `[row, col, role]` tuples for `Board`; otherwise fall back to existing `deriveHighlightCol` logic; overlay clicked-column selection on top

**Checkpoint**: Cat 4/5/6 positions show multi-cell highlights; Cat 1/2 still show one cell; legacy records fall back gracefully

---

## Phase 12: Polish & Cross-Cutting Concerns

- [X] T028 [P] Run the full test suite (`node --test`) after all phases complete and confirm all tests pass
- [X] T029 [P] Verify the admin curation quickstart scenarios from `specs/005-puzzle-curation-fixes/quickstart.md` manually: category label visible, Skip works, Escape closes modal, button renamed, debug panel shows, highlighted cells correct for at least one candidate per category

---

## Dependencies

```
T001 (migration)
  └─► T013 (debug_trace insert)
  └─► T026 (highlight_cells insert)

T002 (export checkWin/countWinningThreats)
  └─► T005 (Cat 1 board-level check)
  └─► T022 (Cat 4 highlight)
  └─► T024 (Cat 6 highlight)

T003 (c4solver-wrapper.js)
  └─► T009 (candidate-generator consolidation)
       └─► T012 (debug trace accumulation)
            └─► T013 (debug_trace insert in index.js)
            └─► T016 (min-move enforcement)
       └─► T021 (Cat 1/2/3 highlight_cells)
            └─► T022 (Cat 4), T023 (Cat 5), T024 (Cat 6), T025 (Cat 7)
                 └─► T026 (highlight_cells insert in index.js)
  └─► T010 (index.js consolidation)
       └─► T011 (verify full suite)
       └─► T013 (debug_trace insert)
       └─► T026 (highlight_cells insert)

T004 (isImmediateWin >= fix)
  └─► T005 (Cat 1 board-level check)

T004, T005, T006 ─► T007 (classifier regression tests)
```

## Parallel Execution Opportunities

- **T002 and T003** are fully independent — run together.
- **T004 and T006** can run in parallel (different functions in classifier.js).
- **T008 (US2), T014 (US3), T015 (US4), T018 (US6), T019–T020 (US7)** are all UI tasks in different files — run in parallel after T003 is done.
- **T022, T024, T025** (Cat 4, Cat 6, Cat 7 highlight_cells) can run in parallel after T021.
- **T017 (US5 test) and T019–T020 (US7 UI)** can run in parallel.

## Implementation Strategy

**MVP (deliver first)**: Phases 1–4 (T001–T008). These fix the two P1 user stories — classifier accuracy and highlight correctness — which make the curation session reliable. No UI surface changes are required to validate them beyond the classifier tests.

**Increment 2**: Phases 5–9 (T009–T018). Wrapper consolidation (technical debt), debug trace, skip navigation, min-move enforcement, category labels. Completes all P2 stories.

**Increment 3**: Phases 10–11 (T019–T027). UI polish and multi-move highlights. Completes all P3 stories.

## Task Count Summary

| Phase / User Story | Tasks | Parallel opportunities |
|--------------------|-------|----------------------|
| Setup (migration) | 1 | — |
| Foundational | 2 | T002 ‖ T003 |
| US1 Classifier fixes | 4 | T004 ‖ T006 |
| US2 Highlight fix | 1 | independent |
| US9 Wrapper consolidation | 3 | — |
| US3 Debug trace | 3 | T014 independent |
| US4 Skip navigation | 1 | independent |
| US5 Min-move enforcement | 2 | T017 independent |
| US6 Category labels | 1 | independent |
| US7 UI polish | 2 | T019 ‖ T020 |
| US8 Multi-move highlight | 7 | T022 ‖ T024 ‖ T025 |
| Polish & verification | 2 | T028 ‖ T029 |
| **Total** | **29** | |
