# Tasks: New Puzzle Categories (008)

**Input**: Design documents from `/specs/008-new-puzzle-categories/`
**Branch**: `008-new-puzzle-categories`

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US1]** / **[US2]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Write and apply the DB migration; no user story work can proceed without it.

- [X] T001 Create `connect-four/server/migrations/015_new_puzzle_categories.sql`: add `highlight_metadata jsonb` to `puzzles` and `candidates`; add `category_evidence jsonb` to `candidates`; drop and re-add the `category` CHECK constraint on `puzzles`, `candidates`, `false_positive_records`, `blunders` to include all 11 slugs; add explicit GRANTs for all four tables following migration 012 pattern
- [X] T002 Apply migration 015 to the Supabase database (run via psql pooler or Supabase CLI); confirm `\d puzzles` shows `highlight_metadata` column and updated CHECK constraint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Category slug lists must exist before any classifier, predicate, or frontend code compiles.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add all 6 new slugs (`z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`) to `VALID_CATEGORIES`, `CATEGORY_ORDER`, `CATEGORY_NAMES`, and `PAID_CATEGORIES` in `connect-four/server/categories.js`
- [X] T004 [P] Mirror T003 changes in `connect-four/src/lib/categories.js` (identical slug list additions)

**Checkpoint**: Migration applied, slugs registered — user story implementation can begin.

---

## Phase 3: User Story 1 — Single-Move Tactical Puzzles (Priority: P1) 🎯 MVP

**Goal**: Full pipeline for all 6 categories: detection → candidate storage → predicate evaluation → correct/wrong feedback.

**Independent Test**: Create a z_threat candidate via curation, approve it, open it as a puzzle, click the correct column, receive "correct" response.

### Classifier — Detection Functions

- [X] T005 [US1] Add `detectZThreat(moves, scores)` to `connect-four/server/classifier.js`: parse board/heights; for each column count empty cells from `heights[col]` up to the solver-winning threat cell (inclusive); if exactly one column has an odd count and a positive solver score, return `{ matched: true, highlightMetadata: { type:'capsule', column, fromRow: heights[col], toRow: threatRow, badgeCount }, categoryEvidence: {} }` per FR-001
- [X] T006 [US1] Add `detectClaimeven(moves, scores, solver)` to `connect-four/server/classifier.js`: identify baseinverse pair using `heights[col] % 2 === 1` (NOT `col % 2`); handle subtype A (board not yet claimeven before move; unique equalising move) and subtype B (exactly two odd columns; Red just played in one); run FR-004 simulation (Red plays solver-optimal, Yellow plays above Red if Red in even column or partner column if Red in baseinverse column); return subtype, baseinverse_pair, correct_col, simulation_trace in categoryEvidence; highlightMetadata is null
- [X] T007 [US1] Add `detectUndercut(moves)` to `connect-four/server/classifier.js`: enumerate all threats on the board; find any column C where the current player has a threat at row R and the opponent has a threat at row R' < R in the same column C (making current player's threat dead); return `{ matched: true, highlightMetadata: { type:'cells', cells: [{ column: C, row: R', role:'killing_threat' }, { column: C, row: R, role:'dead_threat' }] }, categoryEvidence: {} }` per FR-005 (killing_threat first in array, matching spec.md highlight_metadata schema); only match positions where the overall solver score confirms the current player is winning (reuse the same pipeline-level pre-filter that applies to all other categories — this is implicit but must not be skipped). **Warning**: the Generation doc's formal predicate `Color(Tupper)=Color(Tlower)` is a typo — undercutting is cross-player (different colors), per Design doc Q27 and spec FR-005.
- [X] T008 [US1] Add `detectOvercut(moves)` to `connect-four/server/classifier.js`: find column C where opponent has a lower threat at R' and current player has a threat at R > R' in the same column such that opponent cannot activate R' without enabling current player's win above; return `{ matched: true, highlightMetadata: { type:'cells', cells: [{ column: C, row: R', role:'neutralised_threat' }, { column: C, row: R, role:'major_threat' }] }, categoryEvidence: {} }` per FR-006; only match positions where the overall solver score confirms the current player is winning (reuse the same pipeline-level pre-filter that applies to all other categories — this is implicit but must not be skipped). **Warning**: the Generation doc's formal predicate `Color(Tmajor)=Color(tminor)` is a typo — overcutting is cross-player (different colors), per Design doc Q27/Q30 and spec FR-006.
- [X] T009 [US1] Add `detectFigure7(moves, scores, solver)` to `connect-four/server/classifier.js`: check all four Figure-7 template variants per FR-007: (1) ascending diagonal {(x,y),(x+1,y+1),(x+2,y+2)} + horizontal-right {(x+2,y+2),(x+3,y+2),(x+4,y+2)} [Generation doc canonical]; (2) ascending diagonal + horizontal-left {(x+2,y+2),(x+1,y+2),(x,y+2)} [Design doc canonical, e.g. {C1,D2,E3}+{C3,D3,E3}]; (3) descending diagonal {(x,y),(x-1,y+1),(x-2,y+2)} + horizontal-right; (4) descending diagonal + horizontal-left; mirror transform `f(col,row)=(6-col,row)` (0-indexed per Design doc Q20); if current player occupies 4 of 5 cells with one legal playable cell empty, and solver confirms a win after playing it, return `{ matched: true, highlightMetadata: { type:'cells', cells: [<the 4 already-placed template cells, each as {column, row, role:'pattern_piece'}>] }, correctCol: <column of the one empty template cell>, categoryEvidence: { pattern_cells: [<the same 4 placed cells as {column, row} without role>] } }` per FR-007 and FR-024; `highlightMetadata.cells` is used by the player-facing Board.jsx (includes roles); `categoryEvidence.pattern_cells` is used by the curation workspace (coordinates only, role implied as 'pattern_piece')
- [X] T010 [US1] Add `detectJShape(moves, scores, solver)` to `connect-four/server/classifier.js`: check J-shape templates (e.g., D1+D3+E2 with E3 empty, and mirror via `f(col,row)=(6-col,row)`); if current player occupies 3 of 4 cells with one completing cell that is on-board and playable (at column height), guard passes (for each column `col` present in the template at the completing cell's row `completingRow`, `!Occupied(opponent, col, completingRow+1)` — e.g., for completing cell E3 in canonical {D1,D3,E2,E3}, check opponent not at D4 and E4 per Design doc Q17), and solver confirms a win, return `{ matched: true, highlightMetadata: { type:'cells', cells: [<3 placed cells as {column, row, role:'pattern_piece'}>] }, correctCol: <completing cell col>, categoryEvidence: { pattern_cells: [<the same 3 placed cells as {column, row} without role>] } }` per FR-008 and FR-024; `highlightMetadata.cells` is used by Board.jsx (includes roles); `categoryEvidence.pattern_cells` is used by the curation workspace (coordinates only)

### Candidate Generator — Check Functions

- [X] T011 [US1] Add `checkZThreatPredicate`, `checkClaimevenPredicate`, `checkUndercutPredicate`, `checkOvercutPredicate`, `checkFigure7Predicate`, `checkJShapePredicate` to `connect-four/server/candidate-generator.js`; each calls its detect* function, populates `correct_col`, `highlight_metadata`, and `category_evidence` on the candidate row; wire all six into the category detection pipeline in priority order: z_threat > undercut > overcut > claimeven > figure_7 > j_shape (new categories run after the existing five)

### Predicate Evaluation

- [X] T012 [US1] Add `evalZThreat`, `evalClaimeven`, `evalUndercut`, `evalOvercut`, `evalFigure7`, `evalJShape` to `connect-four/server/predicates.js` and extend the `evaluatePredicate` switch with all 6 new cases per the evaluation logic table in `data-model.md` (z_threat: `highlightMetadata.column`; claimeven/figure_7/j_shape: `correct_col`; undercut: any col ≠ killing_threat column; overcut: major_threat column)

### Server Endpoint Fixes (FR-023, FR-029)

- [X] T013 [US1] Fix `POST /api/admin/candidates/:id/approve` in `connect-four/server/index.js` (line ~1036): add `highlight_metadata` and `correct_col` to the candidate SELECT; copy both fields to the puzzle INSERT (lines ~1049–1060); do NOT read these from the request body
- [X] T014 [US1] Fix `GET /api/puzzles/:id` in `connect-four/server/index.js` (line ~455): add `highlight_metadata` and `correct_col` to the DB SELECT; return them as `highlightMetadata` and `correctCol` in the JSON response per the API contract in `contracts/api.md`

### Tests

- [X] T015 [US1] Add 12 predicate fixtures (1 positive + 1 negative per category) to `connect-four/tests/predicates/fixtures/fixtures.json`; each entry must include `moveString`, `category`, `puzzle` object with `correctCol` / `highlightMetadata` as needed, and `candidateCol` with expected `result`
- [X] T016 [US1] Extend `connect-four/tests/predicates/predicates.test.js` with test cases for all 6 new categories using the fixtures from T015; run existing tests to confirm no regressions
- [X] T017 [P] [US1] Create `connect-four/tests/integration/z_threat.test.js`: end-to-end test using real c4solver binary — call detectZThreat on a known position, verify highlightMetadata schema, then call evalZThreat on correct and incorrect columns
- [X] T018 [P] [US1] Create `connect-four/tests/integration/claimeven.test.js`: subtype A fixture + subtype B fixture (move string `4344444667` per spec assumption, plus a fixture with mixed column-index parity baseinverse pair to guard against `col % 2` bug); use real solver binary
- [X] T019 [P] [US1] Create `connect-four/tests/integration/figure7_jshape.test.js`: detect figure_7 and j_shape on known positions using real solver; verify pattern_cells and correctCol

### Classifier Fixtures (SC-002 Merge Gate — ≥20 Labeled Positions per Category)

- [ ] T020 [US1] Add ≥20 manually-reviewed labeled positions for `z_threat` to `connect-four/tests/classifier/fixtures/fixtures.json` with `{ moveString, category, label: 'positive'|'negative' }` per entry
- [ ] T021 [US1] Add ≥20 manually-reviewed labeled positions for `claimeven` to `connect-four/tests/classifier/fixtures/fixtures.json`
- [ ] T022 [US1] Add ≥20 manually-reviewed labeled positions for `undercut` to `connect-four/tests/classifier/fixtures/fixtures.json`
- [ ] T023 [US1] Add ≥20 manually-reviewed labeled positions for `overcut` to `connect-four/tests/classifier/fixtures/fixtures.json`
- [ ] T024 [US1] Add ≥20 manually-reviewed labeled positions for `figure_7` to `connect-four/tests/classifier/fixtures/fixtures.json`
- [ ] T025 [US1] Add ≥20 manually-reviewed labeled positions for `j_shape` to `connect-four/tests/classifier/fixtures/fixtures.json`

- [X] T036 [P] [US1] Create `connect-four/tests/integration/undercut_overcut.test.js`: for a known undercut position, verify `detectUndercut` returns the correct `killing_threat` and `dead_threat` cells (with killing_threat first in the array per spec schema) and that `evalUndercut` accepts all columns except the killing_threat column; for a known overcut position, verify `detectOvercut` returns the correct `neutralised_threat` and `major_threat` cells and that `evalOvercut` accepts only the major_threat column; the pipeline-level solver pre-filter must be exercised (use real solver binary)

**Checkpoint**: All 6 categories detect, store, and evaluate correctly; integration tests and predicate tests pass; classifier precision ≥90% per SC-002.

---

## Phase 4: User Story 2 — Puzzle Highlights and Explanations (Priority: P2)

**Goal**: Visual highlights and textual explanations so learners understand why a move is correct.

**Independent Test**: Open a z_threat puzzle in the browser; a vertical capsule border outline spans the Z-threat column from the current column height to the threat cell, with a numeric badge above the board — no user interaction required.

### Board.jsx — Highlight Overlays

- [X] T026 [US2] Add capsule overlay to `connect-four/src/components/Board.jsx`: when `puzzle.highlightMetadata?.type === 'capsule'`, render a `<div>` absolutely positioned over column `column`, spanning rows `fromRow` to `toRow` (0 = bottom; convert to CSS top/height using cell dimensions); use `border-radius: 9999px` for stadium shape, full border outline, transparent fill; render a `<span>` count badge above the board frame above that column showing `badgeCount`
- [X] T027 [US2] Add cells overlay to `connect-four/src/components/Board.jsx`: when `puzzle.highlightMetadata?.type === 'cells'`, render a role-colored ring on each cell from `highlightMetadata.cells`; role → color mapping: `killing_threat` / `neutralised_threat` → orange outline; `dead_threat` / `major_threat` → purple outline; `pattern_piece` → teal outline; add new role colors to the shared color legend

### CurationWorkspace.jsx — Candidate Evidence Rendering

- [X] T028 [US2] Add z_threat rendering to `connect-four/src/components/CurationWorkspace.jsx`: for z_threat candidates, highlight all cells in the Z-threat column between `highlight_metadata.fromRow` and `toRow` (inclusive) using `role: 'z_range'`; show a numeric label above that column with the badge count
- [X] T028a [US2] Add placeholder hint text to the goal_prompt input field in `connect-four/src/components/CurationWorkspace.jsx` for z_threat candidates (e.g., `placeholder="e.g. 'Find the column with 3 cells to the threat' — include the badge count per FR-018"`); this reminds curators that FR-018 requires the cell count to be embedded in the goal_prompt text
- [X] T029 [US2] Add claimeven rendering to `connect-four/src/components/CurationWorkspace.jsx`: convert `category_evidence.simulation_trace` entries to highlight_cells (`player: 1` → `role: 'loser'`, `player: 2` → `role: 'winner'`); show `baseinverse_pair` columns as `role: 'hint'` cells at their current playable height
- [X] T030 [US2] Add undercut/overcut rendering to `connect-four/src/components/CurationWorkspace.jsx`: render `highlight_metadata.cells` with role-based colors — `killing_threat` / `neutralised_threat` in orange, `dead_threat` / `major_threat` in purple (consistent with Board.jsx color mapping from T027)
- [X] T031 [US2] Add figure_7/j_shape rendering to `connect-four/src/components/CurationWorkspace.jsx`: highlight `category_evidence.pattern_cells` entries using `role: 'pattern_piece'` in teal outline distinct from threat and hint highlights

**Checkpoint**: All highlight overlays render correctly; curation workspace shows category-specific evidence for all 6 categories.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T032 Run full test suite (`cd connect-four && npm test`) and confirm all integration tests, predicate tests, and classifier precision checks pass with no regressions on existing categories
- [X] T033 [P] Manual SC-003 verification: open a z_threat puzzle in Chrome/Firefox/Safari; confirm capsule overlay and count badge render correctly and are positioned over the right column
- [X] T034 [P] Manual SC-004 verification: present one `undercut` puzzle and one `overcut` puzzle to a tester who has not read the goal_prompt; confirm the tester correctly identifies which highlighted cell is the "killing" cell and which is the "dead/neutralised" cell without additional instruction; record pass/fail in the PR description

---

---

## Phase 6: Classifier Correctness Fixes

**Purpose**: Apply the 11 post-audit spec fixes (J1–J4, U1–U3, O1, F1–F3) to `classifier.js`. All tasks target `connect-four/server/classifier.js` unless otherwise noted.

- [X] T037 Fix `detectJShape` — anchor parity (J1): add `if (r % 2 !== 0) continue;` at the top of both the canonical and mirror `r` loops so that only 0-indexed even anchor rows (= 1-indexed odd rows) are accepted; this guards the parity load-bearing property of the J Configuration per `allen-j-configuration.md`.

- [X] T038 Fix `detectJShape` — edge proximity (J2): tighten loop bounds in the canonical variant from `c < COLS - 1` to `c < COLS - 2` and from `r <= ROWS - 3` to `r <= ROWS - 4` (mirrored: `c >= 2`), ensuring that the far column `c+2` and diagonal extension row `r+3` are always within the 7×6 board per `allen-j-configuration.md` precondition.

- [X] T039 Fix `detectJShape` — parity cancellation (J3): after the `tryTemplate` guard passes, enumerate opponent major threats (cells where placing the opponent completes a 4-in-a-row) in the far column `c+2` (canonical) / `c-2` (mirror); if any such threat exists at an even 0-indexed row (= odd 1-indexed row), reject the anchor; this enforces `opp_odd_in_far_col == False` per `allen-j-configuration.md` formal predicate.

- [X] T040 Fix `detectJShape` — guard cell (J4): replace the `templateColsAtCompletingRow` guard inside `tryTemplate` with a single check `board[completing.row][farCol] === opponent` (where `farCol = c+2` canonical / `c-2` mirror), removing the old `board[completing.row + 1][tc]` loop; this matches `allen-j-configuration.md` `board[far_col][far_row] != opponent` (far column, completing row = `y+2` 0-indexed).

- [X] T041 Fix `detectUndercut` — opposite-parity requirement (U1): add `if (R % 2 === kill % 2) continue;` immediately after `const kill = opponentThreats[col].find(rp => rp < R);` returns a value; same 0-indexed parity means same 1-indexed parity, which is T4 (no interaction), not a T2 undercut per `allen-t2.md`; flag any existing `undercut` DB records for manual re-review after this fix.

- [X] T042 Fix `detectUndercut` — T5 exception (U2): add `if (R === 5 && kill === 2) continue;` after the U1 parity check (0-indexed rows 5 and 2 correspond to 1-indexed rows 6 and 3); T5 overrides T2 for this specific pair per `allen-t5.md`.

- [X] T043 Fix `detectUndercut` — sub-case 3 adjacency (U3): add `if (R % 2 === 1 && kill % 2 === 0 && R !== kill + 1) continue;` after the U2 T5 check; when current player's R is 0-indexed odd (= 1-indexed even) and opponent's kill is 0-indexed even (= 1-indexed odd), T2 sub-case 3 requires `R = kill + 1` (adjacent rows) per `allen-t2.md`.

- [X] T044 Fix `detectOvercut` — T2-blocking mechanism check (O1): after finding the `(R, neutralised)` pair, verify that at least one of the four T2-blocking conditions holds before returning a match: (a) `neutralised` is not a major threat for the opponent; (b) `R % 2 === neutralised % 2` (same parity, T4); (c) `(R === 5 && neutralised === 2) || (R === 2 && neutralised === 5)` (T5 exception, 0-indexed); or (d) a current-player major threat at R″ < neutralised satisfies the chain-T2 condition (current even + opponent odd at any distance, or current odd + opponent even at R″ + 1 = neutralised); skip this `(R, neutralised)` pair if none of these hold; the solver gate is not sufficient alone because the win may be unrelated to this column's overcut pattern per `community-overcut.md`.

- [X] T045 Fix `detectFigure7` — gravity-top count filter (F1): add `if (gravityTopCount >= 2) continue;` immediately after the `gravityTopCount` assignment (line ~432); two gravity-top threats is a direct fork, not a Figure-7 zugzwang, per `community-figure-7.md` formal predicate.

- [X] T046 Fix `detectFigure7` — above-gravity requirement (F2): add `if (!hasAboveGravity) continue;` immediately after the `hasAboveGravity` assignment (line ~433); at least one threat must be above gravity for the zugzwang element per `community-figure-7.md` formal predicate.

- [X] T047 Fix `detectFigure7` — remove ascending+right variant (F3): delete the two variant-1 branches (the `if (x + 4 < COLS && y + 2 < ROWS)` block and its `1b` sibling) from the inner loop body; the ascending+right template generates threat cells in different columns (diagonal at x+3, horizontal at x+5 or x+1), violating the same-column property, and is already self-filtered by `hasConsecutivePair`; removing it eliminates dead code and prevents any future regression if `hasConsecutivePair` is ever relaxed.

- [X] T048 Re-run full test suite after all Phase 6 fixes: `cd connect-four && npm test`; confirm all existing tests pass (no regressions on z_threat, claimeven, figure_7, j_shape integration tests) and the undercut/overcut integration test (`tests/integration/undercut_overcut.test.js`) passes with the new parity and adjacency guards.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T002 must complete before T003/T004)
- **Phase 3 (US1)**: Depends on Phase 2 completion — T003/T004 must be done before any classifier or predicate code compiles
- **Phase 4 (US2)**: Depends on Phase 3 — `highlightMetadata` must be returned by GET /api/puzzles/:id (T014) before Board.jsx can render it
- **Phase 5 (Polish)**: Depends on Phase 3 and Phase 4

### Within Phase 3

- T005–T010 (detect* functions): sequential edits to same file (classifier.js); each is independent in logic
- T011 (check* functions + pipeline wiring): depends on T005–T010
- T012 (eval* functions): depends on T005–T010 (needs to know correct_col source per category)
- T013–T014: depend on T002 (migration); can start in parallel with T005–T012
- T015–T016 (predicate fixtures + tests): depend on T012
- T017–T019, T036 (integration tests): can start in parallel once T005–T011 are done
- T020–T025 (classifier fixtures): require manual curation; can be done in parallel with any phase

### Within Phase 4

- T026–T027 (Board.jsx): sequential edits to same file; T027 depends on the role color mapping established in T026
- T028–T031 (CurationWorkspace.jsx): sequential edits to same file; each rendering block is independent

### Parallel Opportunities

- T004 (mirror categories.js) can run in parallel with T003
- T013–T014 (endpoint fixes) can run in parallel with T005–T012 once T002 is done
- T017, T018, T019, T036 (integration tests) can run in parallel (different files)
- T020–T025 (classifier fixture data collection) can be distributed across multiple sessions in parallel

---

## Parallel Examples

```bash
# Phase 2 — run in parallel:
T003: update connect-four/server/categories.js
T004: update connect-four/src/lib/categories.js

# Phase 3 — after T005-T011 are done, run in parallel:
T017: create z_threat.test.js
T018: create claimeven.test.js
T019: create figure7_jshape.test.js
T036: create undercut_overcut.test.js

# Classifier fixtures — can be collected in parallel across sessions:
T020: z_threat positions
T021: claimeven positions
T022: undercut positions
T023: overcut positions
T024: figure_7 positions
T025: j_shape positions
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 + Phase 2 (migration + categories.js)
2. Complete Phase 3 T005–T014 (one working category end-to-end)
3. **VALIDATE**: approve a z_threat candidate, open it as a puzzle, click correct column, get "correct"
4. Complete remaining Phase 3 tasks (all 6 categories + tests + fixtures)
5. Proceed to Phase 4 (highlights) only after US1 is validated

### Incremental Delivery

1. Phase 1 + 2 → DB and slugs ready
2. Phase 3 T005–T014 → backend pipeline working (US1 core)
3. Phase 3 T015–T025 → tests and classifier gate (US1 complete)
4. Phase 4 → highlights visible in browser (US2 complete)
5. Phase 5 → validation pass

---

## Notes

- `correct_col` already exists on the `puzzles` table from earlier migrations; migration 015 only adds `highlight_metadata` to `puzzles` and both columns to `candidates`
- Claimeven baseinverse detection MUST use `heights[col] % 2 === 1` (odd empty-space count), never `col % 2` (column index parity) — see spec assumption and T018 test requirement
- Classifier priority order (Decision 5 in research.md): z_threat > undercut > overcut > claimeven > figure_7 > j_shape
- `category_evidence` is stored on `candidates` only; it is NOT copied to `puzzles` on approve (Decision 3)
- All row/column values are 0-indexed throughout (row 0 = bottom, column 0 = leftmost)
