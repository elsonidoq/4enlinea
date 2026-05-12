# Tasks: Category Slug Refactor

**Input**: Design documents from `/specs/006-category-slugs/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Organization**: Tasks follow the bottom-up implementation order from plan.md (Phase A→B→C→D→E), grouped by user story for independent testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-task dependency)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Constants)

**Purpose**: Create the two new constants files that every subsequent task depends on. These must exist before any server or frontend file can import from them.

- [X] T001 Create `connect-four/server/categories.js` with full content from `data-model.md` § "Constants Files — server/categories.js" (exports: VALID_CATEGORIES, PAID_CATEGORIES, CATEGORY_ORDER, CATEGORY_NAMES)
- [X] T002 [P] Create `connect-four/src/lib/categories.js` with full content from `data-model.md` § "Constants Files — src/lib/categories.js" (exports: CATEGORY_ORDER, CATEGORY_NAMES, CATEGORY_CHIPS, PAID_CATEGORIES)

**Checkpoint**: Both constants files exist and export the correct symbols before any Phase 2+ task runs.

---

## Phase 2: Foundational (Pure Server Layer — No DB, No Frontend)

**Purpose**: Core server logic changes that are independently testable via `npm test`. Must be complete and all 31 tests passing before the DB migration runs. This is the highest-risk phase (switch cases, numeric comparisons in predicates and candidate-generator).

**⚠️ CRITICAL**: DB migration (Phase 3) must NOT run until this phase's test gate (T011) passes.

- [X] T003 [P] [US1] Update `connect-four/server/classifier.js`: fix `forbidden_column` → `forbidden_columns` (research.md § "Critical Bug"); drop `category` integer field from all return values — return only `{ tag }` (FR-003)
- [X] T004 [P] [US1] Update `connect-four/server/predicates.js`: change all `switch (puzzle.category)` case values from integers to slug strings; rename `evalCat1`…`evalCat7` to `evalImmediateThreat`, `evalForcedBlock`, `evalDoubleThreat`, `evalForkSetup`, `evalZugzwang`, `evalParityControl`, `evalForbiddenColumns` (FR-008)
- [X] T005 [P] [US1] Update `connect-four/server/candidate-generator.js`: replace all numeric comparisons in `computeHighlightCells`, `checkPredicate`, `isClean`, and `generateCandidates` with slug comparisons per research.md § "candidate-generator.js"; import `VALID_CATEGORIES` and `CATEGORY_ORDER` from `server/categories.js`; rename `computeCat123Highlight`, `computeCat4Highlight`, etc. to `computeLowCategoryHighlight`, `computeForkSetupHighlight`, `computeZugzwangHighlight`, `computeParityControlHighlight`, `computeForbiddenColumnsHighlight` (FR-008)
- [X] T006 [P] [US1] Update `connect-four/tests/classifier/classifier.test.js`: drop all `result.category` assertions in main loop and regression tests; rewrite per research.md § "Test Files Requiring Updates — classifier.test.js" (all integer assertions → slug assertions, fix singular/plural on `forbidden_column`)
- [X] T007 [P] [US1] Update `connect-four/tests/predicates/fixtures/fixtures.json`: change all `"category"` integer fields in puzzle objects to slug strings per data-model.md § "Category Entity" mapping (13 fixtures, categories 1–6)
- [X] T008 [P] [US1] Update `connect-four/tests/predicates/predicates.test.js`: inline fixtures `{ category: 1, ... }` → `{ category: 'immediate_threat', ... }` and `{ category: 5, ... }` → `{ category: 'zugzwang', ... }` (keep `{ category: 99 }` edge case intact)
- [X] T009 [P] [US1] Update `connect-four/tests/predicates/forbidden_columns.test.js`: `{ category: 7, ... }` → `{ category: 'forbidden_columns', ... }` at lines 40 and 67
- [X] T010 [P] [US1] Update `connect-four/tests/integration/candidate-generator.test.js`: all `generateCandidates(1, ...)` calls → `generateCandidates('immediate_threat', ...)`
- [X] T011 [US1] Run `npm test` from `connect-four/server/` and confirm all 31 tests pass — **GATE: do not proceed to Phase 3 until clean**
- [X] T011a [P] [US1] Rename `checkCat5Predicate` → `checkZugzwangPredicate` in `candidate-generator.js` (export, internal call in `checkPredicate`), `index.js` (import + call site) (FR-008)
- [X] T011b [P] [US1] Fix `connect-four/tests/integration/cat5-zugzwang.test.js`: replace broken import `computeCat5Highlight` → `computeZugzwangHighlight`; replace `checkCat5Predicate` → `checkZugzwangPredicate`; rename describe strings from "Cat 5 predicate" to "zugzwang predicate"; rename file to `zugzwang.test.js` (FR-008)
- [X] T011c [P] [US1] Update `npm test` script in `connect-four/package.json` to include the integration test files (`tests/integration/zugzwang.test.js`, `tests/integration/candidate-generator.test.js`, `tests/predicates/forbidden_columns.test.js`) so broken imports are caught by the test gate
- [X] T011d [P] [US1] Replace all `// Cat N:` comments in `predicates.js` and `candidate-generator.js` with slug-based equivalents (e.g. `// immediate_threat:`, `// zugzwang predicate`) (FR-008)
- [X] T011e [P] [US1] Replace all `"Cat N:"` prefixes in `tests/predicates/fixtures/fixtures.json` and `tests/classifier/fixtures/fixtures.json` description fields with slug-based descriptions (FR-008)
- [X] T011f [P] [US1] Replace remaining `// Cat 7` comments in `tests/classifier/classifier.test.js` with slug-based equivalents (FR-008)

**Checkpoint**: `npm test` green (31/31). Pure server logic is slug-correct with no DB dependency.

---

## Phase 3: User Story 2 — API Layer + DB Migration (Priority: P2)

**Goal**: The HTTP API accepts slug strings, the DB schema uses text columns with CHECK constraints, and candidate generation writes correct slug values.

**Independent Test**: Trigger generation for `zugzwang` and `forbidden_columns`; verify rows have slug values and pass the DB CHECK constraint.

- [X] T012 [US2] Update `connect-four/server/index.js`: import `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER` from `server/categories.js`; delete local `PAID_CATEGORIES`, `CATEGORY_PREDICATE` map, and `CATEGORY_NAMES_MAP`; remove all `parseInt` on category query/body params; update all validation guards to `VALID_CATEGORIES.has()`; fix all remaining numeric comparisons per research.md § "index.js" full inventory
- [X] T013 [P] [US2] Update `connect-four/server/data/placeholder_puzzles.json`: change all `"category": 1`…`"category": 7` integer values to their slug equivalents per data-model.md § "Category Entity" mapping (leave `goal_predicate_type` unchanged)
- [X] T014 [US2] Write `connect-four/scripts/dump-categories.js`: export all rows from `puzzles`, `candidates`, `false_positive_records`, and `blunders` tables to a JSON reference file (pre-migration backup — see research.md § "Migration Approach")
- [X] T015 [US2] Run `connect-four/scripts/dump-categories.js` to export current DB rows before schema change
- [X] T016 [US2] Write `connect-four/server/migrations/011_category_slugs.sql`: drop and recreate `puzzles`, `candidates`, `false_positive_records`, and `blunders` with `TEXT NOT NULL CHECK (col IN (...slugs...))` columns; recreate all indexes per data-model.md § "Affected DB Tables"
- [X] T017 [US2] Apply `011_category_slugs.sql` via Supabase migration runner
- [X] T018 [US2] Trigger candidate generation for `zugzwang` and `forbidden_columns`; confirm created rows have correct slug values accepted by the DB CHECK constraint (SC-003)

**Checkpoint**: Generation works end-to-end with slug columns. Candidates table has slug values. `forbidden_columns` is now reachable (was previously broken).

---

## Phase 4: User Story 3 — Curation UI (Priority: P3)

**Goal**: Candidate Dashboard and Curation Workspace display slug labels; filtering, approving, and rejecting all work correctly.

**Independent Test**: Open Candidate Dashboard and Curation Workspace; verify category labels render as slugs, all filters work, and approve/reject actions save correctly.

- [X] T019 [P] [US3] Update `connect-four/src/components/PredicateChecklist.jsx`: change object keys from integers `1:`…`7:` to slug keys `immediate_threat:`…`forbidden_columns:`; the `category` prop is now a slug string
- [X] T020 [P] [US3] Update `connect-four/src/components/CandidateDashboard.jsx`: remove local `CATEGORY_NAMES`; import `CATEGORY_NAMES` and `CATEGORY_ORDER` from `src/lib/categories.js`; fix line 123 badge: replace `{row.category}` with `{CATEGORY_ORDER.indexOf(row.category) + 1}` to preserve the short numeric badge
- [X] T021 [P] [US3] Update `connect-four/src/components/CurationWorkspace.jsx`: (a) remove local `CATEGORY_NAMES`, import from `src/lib/categories.js`; (b) replace `GOAL_PROMPTS` integer keys 1–7 with slug keys; (c) replace `deriveHighlightCol` switch `case 1:`…`case 7:` with slug-based if/else chain; (d) `[4, 6].includes(category)` → `['fork_setup', 'parity_control'].includes(category)` at line 370; (e) remove `Cat {category} — ` prefix from category label display at line 314
- [X] T022 [US3] Verify curation UI: open Candidate Dashboard (slug labels, filters) and Curation Workspace (approve/reject saves correctly)

**Checkpoint**: Full curation read/write cycle works with slug values.

---

## Phase 5: User Story 4 — Puzzles Page (Priority: P4)

**Goal**: All 7 category chips render correctly on the Puzzles page, including `forbidden_columns` (previously missing).

**Independent Test**: Load Puzzles page and verify all 7 category chips display with correct labels and styling.

- [X] T023 [US4] Update `connect-four/src/pages/PuzzlesPage.jsx`: remove local `CATEGORY_NAMES` and `CATEGORY_CHIPS` definitions; import `CATEGORY_NAMES`, `CATEGORY_CHIPS`, `CATEGORY_ORDER` from `src/lib/categories.js`
- [X] T024 [US4] Verify Puzzles page: all 7 category chips render with correct labels and styling including `forbidden_columns` (SC-002, SC-003)

**Checkpoint**: Puzzles page displays all 7 categories correctly.

---

## Phase 6: User Story 5 — Coach Page (Priority: P5)

**Goal**: Coach page category breakdown uses slug labels derived from the shared constants file.

**Independent Test**: Navigate to Coach page with blunder data present; verify category names render as slugs.

- [X] T025 [US5] Update `connect-four/src/pages/CoachPage.jsx`: remove local `CATEGORY_NAMES` definition; import `CATEGORY_NAMES` from `src/lib/categories.js`
- [X] T026 [US5] Verify Coach page: category breakdown renders slug labels correctly (not integers)

**Checkpoint**: All 5 user stories complete and independently verified.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Confirm SC-004 (no local CATEGORY_NAMES outside categories.js) and run the full test suite for final sign-off.

- [X] T027 Run `npm test` in `connect-four/server/` — confirm all 31 tests still pass after API and frontend changes
- [X] T028 [P] `grep -r "CATEGORY_NAMES" connect-four/src connect-four/server --include="*.js" --include="*.jsx"` — definitions must appear only in `categories.js` files (SC-004)
- [X] T029 [P] `grep -r "parseInt.*category\|category.*parseInt" connect-four/server --include="*.js"` — must return no results (all parseInt removed)
- [X] T030 [P] `grep -r "forbidden_column[^s]" connect-four --include="*.js" --include="*.jsx" --include="*.json"` — must return no results (singular bug fully fixed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T001 and T002 run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 must exist for imports). T003–T010 can all run in parallel; T011 runs last as the gate.
- **Phase 3 (US2 — API+DB)**: Depends on Phase 2 gate (T011 green). T012 and T013 run in parallel; T014→T015→T016→T017→T018 run sequentially (each depends on the prior).
- **Phase 4 (US3)**: Depends on Phase 3 completion (DB migrated, API layer slug-correct). T019, T020, T021 run in parallel; T022 runs after all three.
- **Phase 5 (US4)**: Depends on Phase 3 completion. T023→T024 sequential.
- **Phase 6 (US5)**: Depends on Phase 3 completion. Can run in parallel with Phases 4 and 5 if staffed. T025→T026 sequential.
- **Phase 7 (Polish)**: Depends on Phases 4, 5, 6 complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 1. No dependency on other stories.
- **US2 (P2)**: Depends on US1 gate (all tests green). Must complete before US3/US4/US5 (they need the migrated DB).
- **US3 (P3)**: Depends on US2 (migrated DB + slug API). Independent of US4/US5.
- **US4 (P4)**: Depends on US2. Independent of US3/US5.
- **US5 (P5)**: Depends on US2. Independent of US3/US4.

### Parallel Opportunities

```bash
# Phase 1 — run together:
T001: Create server/categories.js
T002: Create src/lib/categories.js

# Phase 2 — run all together after T001:
T003: Update classifier.js
T004: Update predicates.js
T005: Update candidate-generator.js
T006: Update classifier.test.js
T007: Update predicates/fixtures/fixtures.json
T008: Update predicates/predicates.test.js
T009: Update forbidden_columns.test.js
T010: Update candidate-generator.test.js
# Then gate:
T011: npm test (must be green)

# Phase 3 — T012 and T013 together, then sequential:
T012: Update index.js        (parallel with T013)
T013: Update placeholder_puzzles.json
T014 → T015 → T016 → T017 → T018  (sequential)

# Phases 4+5+6 — can start in parallel after Phase 3:
T019 + T020 + T021  (parallel within Phase 4)
T023                (Phase 5)
T025                (Phase 6)

# Phase 7 — all in parallel:
T027 + T028 + T029 + T030
```

---

## Implementation Strategy

### MVP (User Story 1 Only — safe, no DB changes)

1. Complete Phase 1: Create constants files
2. Complete Phase 2: Update server logic + tests
3. **STOP and VALIDATE**: `npm test` must be 31/31
4. This validates the highest-risk changes with zero DB disruption

### Full Delivery (Incremental)

1. Phase 1+2 → Tests green (US1 done — server is slug-correct)
2. Phase 3 → API + DB migration → Generation verified (US2 done)
3. Phases 4+5+6 → All UI surfaces slug-correct (US3+US4+US5 done)
4. Phase 7 → Final verification pass

---

## Notes

- The test gate at T011 is a hard stop — do not run DB migration if any test fails
- `forbidden_columns` was previously unreachable (validation list stopped at 6); SC-003 tracks full end-to-end coverage
- All slug names come from `data-model.md` § "Category Entity — Authoritative Slug List" — do not derive independently
- `blunders` table column is `pattern_category`, not `category` (pre-existing naming difference; do not rename)
- `spec.md` calls the blunders table `coach_blunders` — the actual DB table name is `public.blunders`
