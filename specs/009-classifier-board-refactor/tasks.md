---

description: "Task list for Classifier Board Refactor (009)"
---

# Tasks: Classifier Board Refactor (009)

**Input**: `specs/009-classifier-board-refactor/`
**Files modified**: `connect-four/server/classifier.js`, `connect-four/server/candidate-generator.js`, `connect-four/tests/classifier/classifier.test.js`, `docs/architecture/server-conventions.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different functions / no shared state dependencies)
- **[Story]**: Which user story this task primarily completes
- US1 = No-regression (classify produces identical results)
- US2 = Board caching (single parse per classify call)
- US3 = Immutability (no mutation+undo patterns in detect* or classify)
- US4 = T-rule predicates (named, shared, KB-referenced)
- US5 = candidate-generator.js deduplication

---

## Phase 1: Setup — Baseline Verification

**Purpose**: Confirm all existing tests pass before any code changes.

- [x] T001 Run `npm test` in `connect-four/` and record that all classifier and candidate-generator tests pass (establishes regression baseline for SC-001)

---

## Phase 2: Foundational — Layer 1–2 Free Functions (Step 1)

**Purpose**: Add and rename the free functions that the Board class and refactored detectors will depend on. No behavior changes; all tests must still pass after this step. These tasks are prerequisites for every user story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 In `connect-four/server/classifier.js`, rename `countWinningThreats` → `getImmediateThreats` (keep identical signature `(board, colHeights, player)` and implementation; update the export name)
- [x] T003 [P] In `connect-four/server/classifier.js`, add `export function hasWon(board, player)` (Layer 1) — full-board scan returning true if player already has four-in-a-row; add JSDoc with `@complexity O(42)` and `@cache not cached`
- [x] T004 [P] In `connect-four/server/classifier.js`, add `export function getReachableThreats(board, colHeights, player)` (Layer 2) — returns `Map<col, row[]>` of cells at or above `colHeights[col]` where placing player wins; iterate from `colHeights[col]` upward calling `checkWin` mutation-free; add JSDoc per plan.md §getReachableThreats specification (`@complexity O(42)`, `@cache not cached`)
- [x] T005 [P] In `connect-four/server/classifier.js`, promote `getWinningWindows(board, row, col, player)` from private helper inside `detectFigure7` to `export function`; implementation unchanged; add JSDoc `@complexity O(16)`, `@cache not cached`
- [x] T006 [P] In `connect-four/server/classifier.js`, rename `buildThreatMap` → `getMajorThreatCells` (same implementation, same callers: `hasMajorThreatAt` and `hasActiveDoubleThreat`); update export name; leave `hasMajorThreatAt` alive (it is removed in Phase 3 after `hasActiveDoubleThreat` is rewritten)
- [x] T007 In `connect-four/server/candidate-generator.js`, update import from `./classifier.js`: `countWinningThreats` → `getImmediateThreats`
- [x] T008 Run `npm test` in `connect-four/` to verify all tests pass after Phase 2 (Step 1 checkpoint)

**Checkpoint**: Foundation ready — user story phases can now begin.

---

## Phase 3: User Story 4 + User Story 3 — T-rule Predicates + Mutation-free hasActiveDoubleThreat (Step 2)

**Goal (US4)**: `isT4SameParity`, `isT5Exception`, `isT2Blocking` exist as named exports with KB `@see` references, satisfying SC-004.
**Goal (US3 partial)**: `hasActiveDoubleThreat` rewritten without mutation+undo, satisfying US3 for this function.

**Independent Test**: `grep -n 'isT4SameParity\|isT5Exception\|isT2Blocking' connect-four/server/classifier.js` — all three appear as function definitions. `npm test` passes.

- [x] T009 [P] [US4] In `connect-four/server/classifier.js`, add `export function isT4SameParity(R, Rp)` implementing `R % 2 === Rp % 2`; add JSDoc: one-line description, `@complexity O(1)`, `@cache not cached`, `@see allen-t4`
- [x] T010 [P] [US4] In `connect-four/server/classifier.js`, add `export function isT5Exception(R, Rp)` implementing `(R === 5 && Rp === 2) || (R === 2 && Rp === 5)` (0-indexed rows); add JSDoc: one-line description, `@complexity O(1)`, `@cache not cached`, `@see allen-t5`
- [x] T011 [P] [US4] In `connect-four/server/classifier.js`, add `export function isT2Blocking(colThreats, R, Rp)` with sub-case 2 (`Rpp % 2 === 0 && Rp % 2 === 1`, any distance) and sub-case 3 (`Rpp % 2 === 1 && Rp % 2 === 0 && Rpp + 1 === Rp`, adjacent only) per plan.md §T-rule predicates; add JSDoc: one-line description, `@complexity O(|colThreats|)`, `@cache not cached`, `@see allen-t2`
- [x] T012 [US3] In `connect-four/server/classifier.js`, rewrite `hasActiveDoubleThreat(board, colHeights, player)` to use `getImmediateThreats` and `getMajorThreatCells` without any mutation+undo (per plan.md §Mutation-free threat scanning); signature `(board, colHeights, player)` and return type unchanged
- [x] T013 [US3] In `connect-four/server/classifier.js`, remove `hasMajorThreatAt` (now dead code: `hasActiveDoubleThreat` no longer calls it and no other callers exist)
- [x] T014 Run `npm test` in `connect-four/` to verify all tests pass after Phase 3 (Step 2 checkpoint)

**Checkpoint**: T-rule predicates exported; `hasActiveDoubleThreat` mutation-free.

---

## Phase 4: User Story 2 — Board Class (Step 3)

**Goal**: `Board` class exists in `classifier.js` and is exported. All 8 methods implemented with lazy write-once cache. `docs/architecture/server-conventions.md` updated.

**Independent Test**: `new Board('1234')` can be constructed; `board.colHeights`, `board.currentPlayer`, `board.reachableThreats(1)` work. `npm test` passes (Board not yet used in detectors/classify).

- [x] T015 [US2] In `connect-four/server/classifier.js`, implement `class Board` with: constructor (calls `parseBoardState` once, sets `movestring`, `board`, `colHeights`, `currentPlayer`, `opponent`, `_cache`); all 8 methods (`checkWin`, `hasWon`, `immediateThreats`, `reachableThreats`, `winningWindows`, `majorThreatCells`, `hasActiveDoubleThreat`, `withMove`) using the lazy write-once cache pattern from data-model.md; `withMove` throws `RangeError` for invalid/full columns per FR-004; add `Board` to exports; add JSDoc per plan.md §JSDoc template on every public method
- [x] T016 [US2] In `docs/architecture/server-conventions.md`, add "Board Class" section per plan.md §Documentation update — include the MUST/MUST NOT rules for Board vs parseBoardState, the withMove mutation+undo prohibition, and when parseBoardState remains appropriate
- [x] T017 Run `npm test` in `connect-four/` to verify all tests pass after Phase 4 (Step 3 checkpoint; Board added but unused)

**Checkpoint**: `Board` class fully implemented and exported; documentation updated.

---

## Phase 5: User Story 3 + User Story 2 — Migrate detect* Functions to Board Signatures (Step 4)

**Goal (US3)**: All six `detect*` functions accept `(board: Board, scores)` and contain no `board[r][c] = player; ... board[r][c] = 0` mutation patterns. Satisfies SC-003 and SC-007.
**Goal (US2 partial)**: Detectors use Board caching (`reachableThreats` cached per player across detector calls).

**Independent Test**: `grep -n 'board\[.*\]\[.*\] = [^0]' connect-four/server/classifier.js` returns no results inside any `detect*` function. `npm test` passes.

- [x] T018 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectZThreat(board, scores)` to accept a `Board` instance; replace `parseBoardState(moves)` and derived locals with `board.board`, `board.colHeights`, `board.currentPlayer`
- [x] T019 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectUndercut(board, scores)` to accept a `Board` instance; replace the manual threat-collection loop (with mutation) with `board.reachableThreats(board.currentPlayer)` and `board.reachableThreats(board.opponent)`; replace U1 guard with `isT4SameParity(R, kill)`, U2 guard with `isT5Exception(R, kill)`, keep U3 guard inline (`R % 2 === 1 && kill % 2 === 0 && R !== kill + 1`) per plan.md §detectUndercut migration
- [x] T020 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectOvercut(board, scores)` to accept a `Board` instance; replace threat-collection loop with `board.reachableThreats()`; replace O1 guard with `isT4SameParity(R, neutralised) || isT5Exception(R, neutralised) || isT2Blocking(colRows, R, neutralised)` per plan.md §detectOvercut migration
- [x] T021 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectFigure7(board, scores)` to accept a `Board` instance; replace outer mutation+undo (`board[comp.row][comp.col] = currentPlayer; colHeights[comp.col]++; ... undo`) with `const nextBoard = board.withMove(comp.col)`; replace inner mutation loop with `for (const [col, rows] of nextBoard.reachableThreats(currentPlayer))`; replace `getWinningWindows(board, ...)` with `nextBoard.winningWindows(...)`; update all `colHeights[]` references to `nextBoard.colHeights` per plan.md §detectFigure7 migration
- [x] T022 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectJShape(board, scores)` to accept a `Board` instance; replace `parseBoardState(moves)` with `board.board`, `board.colHeights`, `board.currentPlayer`, `board.opponent`; `checkWin` calls are already mutation-free — no mutation pattern to remove
- [x] T023 [P] [US3] In `connect-four/server/classifier.js`, migrate `detectClaimeven(board, solver)` to accept a `Board` instance; replace internal `moves`/`movestring` variable with `board.movestring`; replace `getHeights`/`colHeights` lookup with `board.colHeights` per FR-021
- [x] T024 [US3] In `connect-four/server/candidate-generator.js`, update all six `check*Predicate` functions to construct `new Board(ms)` and pass it to the detector: `checkZThreatPredicate`, `checkClaimevenPredicate`, `checkOvercutPredicate`, `checkFigure7Predicate`, `checkJShapePredicate`, and `checkUndercutPredicate` (reuse `const b = new Board(ms)` for both `detectUndercut(b, scores)` and `b.colHeights` lookup per data-model.md note)
- [x] T025 Run `npm test` in `connect-four/` to verify all tests pass after Phase 5 (Step 4 checkpoint)

**Checkpoint**: All six detectors are mutation-free and accept `Board` instances.

---

## Phase 6: User Story 1 + User Story 2 — Migrate classify() and Add classifyAll (Step 5)

**Goal (US2)**: `classify()` constructs `new Board(moves)` exactly once; `parseBoardState` is not called directly inside `classify()`. Satisfies SC-002.
**Goal (US1)**: `classifyAll` exported and tested (SC-008); full regression confirmed.

**Independent Test**: Instrument `parseBoardState` with a call counter; for any `classify()` call the counter increments exactly once. `npm test` passes including new classifyAll test.

- [x] T026 [US2] In `connect-four/server/classifier.js`, refactor `classify(moves, candidateCol, scores)` to construct `const board = new Board(moves)` once at the top; remove all four `parseBoardState(moves)` calls inside the function body; replace mutation+undo patterns with `board.withMove(col)` calls per plan.md §classify() migration (Cat 1, Cat 2, Cat 3, Cat 5 checks)
- [x] T027 [US2] In `connect-four/server/classifier.js`, add `export async function classifyAll(moves, scores, solver)` that constructs `const board = new Board(moves)` once and runs all six detectors sharing the Board (and its caches), returning `Array<{detectorName: string, result: DetectorResult}>` in detector-list order per plan.md §classifyAll
- [x] T028 [US1] In `connect-four/tests/classifier/classifier.test.js`, add test for `classifyAll` (SC-008 + SC-002): (a) use `await classifyAll(ms, scores, solver)` — the function is async; for the claimeven entry pass a valid `solver` instance to both `classifyAll` and the standalone `detectClaimeven(new Board(ms), solver)` call; (b) for a representative set of positions (at least one per detector type), verify that each entry returned by `classifyAll` matches the result of calling the corresponding detector individually with `new Board(ms)` and the same arguments; (c) add a parseBoardState call-count assertion for SC-002: spy on / wrap `parseBoardState` with a counter, call `classify(ms, candidateCol, scores)`, assert the counter equals 1; reset the counter between calls; import `classifyAll` and `Board` from the classifier module
- [x] T029 Run `npm test` in `connect-four/` to verify all tests pass including the new classifyAll test (Step 5 checkpoint)

**Checkpoint**: `classify()` uses a single Board instance; `classifyAll` exported and tested.

---

## Phase 7: User Story 5 — candidate-generator.js Deduplication (Step 6)

**Goal**: Local `buildBoard`, `getHeights`, `hasWon`, and `getForcedBlock` no longer exist in `candidate-generator.js`. All callers updated. Satisfies SC-005.

**Independent Test**: `grep -n 'function buildBoard\|function getHeights\|function hasWon\|function getForcedBlock' connect-four/server/candidate-generator.js` returns no results. `npm test` passes.

- [x] T030 [US5] In `connect-four/server/candidate-generator.js`, remove local `getForcedBlock` function (dead code — no call sites per research Decision 4)
- [x] T031 [US5] In `connect-four/server/candidate-generator.js`, remove local `buildBoard` function; update callers per FR-027 (MUST construct a Board instance) and plan.md call-site table: `isGameOver` → `const board = new Board(ms).board`, `traceForcedWin` ms1 board → `const board1 = new Board(ms1).board`, `checkForcedWinPredicate` → `const boardEnd = new Board(msEnd).board`, `checkForbiddenColumnsPredicate` → `const board = new Board(ms).board`; also remove null guards `if (!board) return true` in `isGameOver` and `checkForcedWinPredicate` — `Board` construction never returns null (throws `RangeError` for invalid input instead) — per plan.md §buildBoard null-guard note
- [x] T032 [US5] In `connect-four/server/candidate-generator.js`, remove local `getHeights` function; update all callers to `new Board(moveString).colHeights` per data-model.md call-site inventory: `computeLowCategoryHighlight`, `traceForcedWin` (lines ~169 and ~218), `checkForcedWinPredicate`, `checkForbiddenColumnsPredicate`, `computeForcedWinHighlight` (loop), `computeForbiddenColumnsHighlight`
- [x] T033 [US5] In `connect-four/server/candidate-generator.js`, remove local `hasWon` function; add `hasWon` to the import from `./classifier.js`; update all callers: `solverWeightedPosition`, `checkForcedWinPredicate`, `isGameOver`
- [x] T034 Run `npm test` in `connect-four/` to verify all tests pass after Phase 7 (Step 6 checkpoint)

**Checkpoint**: All four duplicated helpers removed from candidate-generator.js; all call sites migrated.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: JSDoc completeness verification, grep-based success-criteria checks, final test run.

- [x] T035 [P] In `connect-four/server/classifier.js`, audit every exported free function and every public `Board` method for JSDoc completeness (SC-006): add any missing `@complexity`, `@cache`, and `@see` tags; confirm `@see allen-t4` on `isT4SameParity`, `@see allen-t5` on `isT5Exception`, `@see allen-t2` on `isT2Blocking`
- [x] T036 [P] Run all grep-based success-criteria checks: (SC-002) inspect `classify()` body to confirm exactly one `new Board(moves)` call and zero `parseBoardState` calls inside the function body; (SC-003) `grep -n 'board\[.*\]\[.*\] = [^0]' connect-four/server/classifier.js` — expect no results inside detect*/classify; (SC-004) `grep -n 'isT4SameParity\|isT5Exception\|isT2Blocking' connect-four/server/classifier.js` — all three appear in both detectUndercut and detectOvercut; (SC-005) `grep -n 'function buildBoard\|function getHeights\|function hasWon\|function getForcedBlock' connect-four/server/candidate-generator.js` — expect no results; (SC-006) `grep -c '@complexity' connect-four/server/classifier.js` — count equals number of exports + Board public methods; (SC-007) `grep -n 'board\[row\]\[col\] = \|board\[r\]\[c\] = ' connect-four/server/classifier.js` — expect no results inside detectUndercut, detectOvercut, detectFigure7, detectJShape (old mutation loop pattern absent from all four); (FR-024) `grep -n 'classifyBestMove' connect-four/server/classifier.js` — confirm signature `classifyBestMove(moves, scores)` is unchanged
- [x] T037 Run `npm test` in `connect-four/` for final confirmation of SC-001 (all existing tests pass, new classifyAll test passes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — run immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US4+US3)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (uses Layer 1-2 functions added there); can run in parallel with Phase 3
- **Phase 5 (US3+US2)**: Depends on Phase 3 (T-rule predicates) and Phase 4 (Board class)
- **Phase 6 (US1+US2)**: Depends on Phase 5 (Board-accepting detectors)
- **Phase 7 (US5)**: Depends on Phase 5 (detect* call sites already migrated in T024)
- **Final Phase**: Depends on Phases 6 and 7

### User Story Dependencies

- **US4 (T-rule predicates)**: Independent after Phase 2
- **US2 (Board class)**: Independent after Phase 2; Board is used in classify() only in Phase 6
- **US3 (Immutability)**: Depends on US4 (Phase 3) and US2 (Phase 4) — detectors need both predicates and Board
- **US1 (No regression)**: Verified throughout by test checkpoints; classifyAll test (SC-008) added in Phase 6
- **US5 (Deduplication)**: Depends on Phase 5 (detect* signatures already updated)

### Parallel Opportunities Within Phases

- **Phase 2**: T003, T004, T005, T006 can run in parallel (adding distinct exports to classifier.js)
- **Phase 3**: T009, T010, T011 can run in parallel (distinct predicate functions)
- **Phase 5**: T018, T019, T020, T021, T022, T023 can run in parallel (distinct detect* functions in classifier.js)
- **Final Phase**: T035 and T036 can run in parallel

---

## Parallel Example: Phase 5 (detect* migration)

```bash
# All six detector migrations touch separate functions in classifier.js:
Task: T018 — detectZThreat migration
Task: T019 — detectUndercut migration
Task: T020 — detectOvercut migration
Task: T021 — detectFigure7 migration
Task: T022 — detectJShape migration
Task: T023 — detectClaimeven migration
# Then T024 (candidate-generator call sites) depends on all six completing
```

---

## Implementation Strategy

### MVP: User Stories 1–3 (correctness + caching + immutability)

1. Complete Phase 1 (baseline)
2. Complete Phase 2 (foundational functions)
3. Complete Phase 3 (T-rule predicates + hasActiveDoubleThreat rewrite)
4. Complete Phase 4 (Board class)
5. Complete Phase 5 (detect* migration)
6. Complete Phase 6 (classify migration + classifyAll)
7. **STOP and VALIDATE**: Run `npm test`; verify SC-001, SC-002, SC-003 grep checks

### Incremental Delivery

1. Phase 1 → Phases 2–3 → test: T-rule predicates isolated and regression clean
2. Phase 4 → test: Board class constructed and passes all tests
3. Phase 5 → test: All detectors mutation-free
4. Phase 6 → test: classify() uses single Board; classifyAll exported
5. Phase 7 → test: candidate-generator duplicates removed; SC-005 confirmed
6. Final Phase → all success criteria verified by grep

---

## Notes

- Tests must pass after every phase checkpoint — this is the migration invariant
- `hasMajorThreatAt` stays alive through Phase 2; removed at end of Phase 3 after `hasActiveDoubleThreat` is rewritten (T013)
- Do NOT remove `hasMajorThreatAt` in Phase 2 — it is still needed by `hasActiveDoubleThreat` at that point
- `parseBoardState` remains exported throughout and is still used in `runClaimevenSimulation` and `isClean` (both are loop contexts where per-step re-parse is intentional per research Decision 8 and Decision 10)
- The null guard removal in T031 is safe because `parseBoardState` never returns null (plan.md §buildBoard null-guard note)
- All row/column coordinates are 0-indexed throughout; the 1-indexed translation for Allen KB references is applied once at the predicate boundary (already encoded in isT5Exception using rows 5 and 2)
