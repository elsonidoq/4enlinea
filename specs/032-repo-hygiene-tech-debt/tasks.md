# Tasks: Repo Hygiene & Tech-Debt Sweep

**Input**: Design documents from `/specs/032-repo-hygiene-tech-debt/`
**Prerequisites**: spec.md ✅, plan.md ✅, research.md ✅
**Branch**: `032-repo-hygiene-tech-debt`

**Tests**: No new test files are introduced by this epic. Verification gates use `npm run test:fast` (existing suite) and `npm run lint` (baseline comparison).

**Organization**: Tasks are grouped by user story. Part A (US1+US2) and Part B (US3) are independent tracks — US3 can begin immediately; US1 deletions block on US2 inventory.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: Which user story this task belongs to (US1=Dead-code removal, US2=Debt inventory, US3=Green/gray sweep)

---

## Phase 1: Setup (Shared Prerequisites)

**Purpose**: Gather the two signals needed before any audit or deletion work can begin.

- [ ] T001 Generate the transitive import graph from `connect-four/src/` using `npx madge --circular connect-four/src/` (or `npx dependency-cruiser`) from the repo root; save output for use in T003–T006. This is the primary reachability signal for the audit; all file groups are checked against this graph before single-hop grep.
- [ ] T002 [P] Capture ESLint baseline: run `cd connect-four && npm run lint 2>&1 | grep "problems\|error\|warning" | tail -3` and record the exact error count. This count will be written into `specs/032-repo-hygiene-tech-debt/debt-inventory.md` as the lint gate for FR-012.

**Checkpoint**: Import graph and ESLint baseline recorded — audit can now begin.

---

## Phase 2: Foundational — Debt Inventory (US2, P1)

**Purpose**: Produce `specs/032-repo-hygiene-tech-debt/debt-inventory.md` before any file is deleted. This is the hard prerequisite for Phase 3 (US1 deletions). All six audit sub-tasks (T003–T008) run in parallel; T009 writes the document after all verdicts are in.

**Goal**: Every audited file has exactly one verdict (DELETE / SURFACE / DEFER) with a specific, non-empty reason.

**Independent Test**: `specs/032-repo-hygiene-tech-debt/debt-inventory.md` exists with columns File | Category | Verdict | Reason, at least one row per audited file in `src/screens/`, `src/pages/`, `src/components/`, `src/lib/`, `src/context/`, `src/store/`, `server/` root, and `server/scripts/`. No row has an empty Reason cell.

- [ ] T003 [P] [US2] Audit `connect-four/src/screens/` (20 files): cross-reference each file against (1) SCREENS map in `connect-four/src/lib/screenRegistry.jsx` (17 entries), (2) lazy imports in `connect-four/src/App.jsx`, (3) transitive graph from T001, (4) production `rg` hits excluding `*.test.*`, (5) `go('screenKey')` calls and `URL_MAP` entries in `connect-four/src/lib/urlMapping.js`. Pre-confirmed verdicts: `PlaceholderScreen.jsx` → DELETE (FR-008); `AdminLessonEditorScreen.jsx` and `AdminLessonListScreen.jsx` → DEFER (imported by `AdminLessonsPage.jsx`). Record verdict + reason for every screen file.
- [ ] T004 [P] [US2] Audit `connect-four/src/pages/` (3 files): apply FR-004 four-check rule. Pre-confirmed: `PuzzlesPage.jsx` → DELETE (FR-007); `AdminCuratePage.jsx` and `AdminLessonsPage.jsx` → DEFER (lazy-loaded in `App.jsx`). Record verdict + reason for every page file.
- [ ] T005 [P] [US2] Audit `connect-four/src/components/` (~30 files): apply FR-005 — DELETE only when not transitively reachable from any production importer in `src/` or `server/` (test-only imports do not count). Use graph from T001 as primary signal; confirm with `rg` for any files absent from graph. Record verdict + reason for every component file.
- [ ] T006 [P] [US2] Audit `connect-four/src/lib/` (12 files), `connect-four/src/context/` (1 file — DebugContext.jsx imported by App.jsx), and `connect-four/src/store/` (3 files — ProfileStore/IndexedDBStore/SupabaseStore): apply FR-005. Use graph from T001 as primary signal. Record verdict + reason for every file.
- [ ] T007 [P] [US2] Audit `connect-four/server/` root files (~30 .js/.mjs files): apply FR-006 against entrypoint roster (index.js, migrate.js, package.json scripts, files with `process.argv` or `require.main === module`, all `*.test.*` files). Pre-confirmed: `debug-immediate-threat.js` → SURFACE (no process.argv, hardcoded movestring, not imported — FR-009); `debug-claimeven.js` → DEFER (has `process.argv[2]`); `llmCoachHelpers.js` → DEFER (transitively imported by explainContext.js). Record verdict + reason for every server root file.
- [ ] T008 [P] [US2] Audit `connect-four/server/scripts/` (13 files): apply FR-006. Files with `process.argv` are alive: `classify_all.mjs`, `debug_blunders_for_room.mjs`, `diagnose_blunders.mjs`, `import_papergames_blunders.mjs`, `simulate_blunders.mjs`, `visualize_board.mjs`, `diag_figure7.js`, `set-tier.js`. Files without `process.argv` and not imported → SURFACE: `corpus_annotation_check.mjs`, `debug_blunder_severity.mjs`, `reprocess_blunders.mjs`, `verify_prompt_fixes.mjs`, `delete_all_candidates.sh`. Verify each with targeted `rg` before recording verdict.
- [ ] T009 [US2] Write `specs/032-repo-hygiene-tech-debt/debt-inventory.md` (depends on T002–T008 all complete): create markdown table with columns `File | Category | Verdict | Reason`; include one row per audited file across all groups covered by T003–T008; add an "ESLint baseline" section recording the exact count from T002. Reason cells for DELETE rows must cite the specific dead-checks passed (e.g. "not in SCREENS map; not lazy-loaded in App.jsx; no go() call; no URL_MAP entry; no production importer found"). Reason cells for SURFACE rows must cite the specific ambiguity.

**Checkpoint**: `debt-inventory.md` exists and is complete — US1 deletions (Phase 3) can now proceed.

---

## Phase 3: US1 — Dead-Code Deletion & Verification (P1)

**Goal**: All DELETE-verdict files are removed from the repository; all dangling import references are cleaned; tests and lint pass.

**Independent Test**: `rg "PlaceholderScreen|PuzzlesPage" connect-four/src/` returns no hits. `npm run test:fast` exits 0. `npm run lint` error count ≤ pre-epic baseline from `debt-inventory.md`. No import statement in `connect-four/src/` or `connect-four/server/` references a deleted file.

- [ ] T010 [P] [US1] Delete `connect-four/src/pages/PuzzlesPage.jsx` (FR-007): remove the file; run `rg "PuzzlesPage" connect-four/src/ connect-four/server/` and remove any import statement found. Confirm zero hits remain.
- [ ] T011 [P] [US1] Delete `connect-four/src/screens/PlaceholderScreen.jsx` (FR-008): remove the file; run `rg "PlaceholderScreen" connect-four/src/ connect-four/server/` and remove any import statement found. Confirm zero hits remain.
- [ ] T012 [US1] Handle remaining DELETE-verdict files from `debt-inventory.md` beyond T010–T011: only the two pre-confirmed DELETE files (PuzzlesPage, PlaceholderScreen) are removed automatically (handled by T010–T011). Any additional file that received a DELETE verdict during the audit (T003–T008) MUST be downgraded to SURFACE in `debt-inventory.md`, with the original dead-check evidence recorded in the Reason cell, and presented to the owner for explicit approval before deletion. Only after the owner grants written approval (recorded as a comment in `debt-inventory.md`) may the implementer remove the file and its import references (FR-010). If no additional DELETE files were discovered, this task is a no-op; record that outcome in `debt-inventory.md`.
- [ ] T013 [US1] Run `cd connect-four && npm run test:fast` — must exit with code 0 (FR-011). If any test fails, diagnose and fix before proceeding. Do NOT use `npm test` (hangs due to solver IPC deadlock).
- [ ] T014 [P] [US1] Run `cd connect-four && npm run lint 2>&1 | grep "problems\|error\|warning" | tail -3` — verify the error count is ≤ the pre-epic baseline recorded in `debt-inventory.md` (FR-012). Exit code need not be 0 — ~170 pre-existing errors on unrelated files are expected. Zero new errors may be introduced by this epic's changes.
- [ ] T015 [US1] Update `specs/032-repo-hygiene-tech-debt/debt-inventory.md`: add a "Deletions executed" section listing every file that was actually removed, confirming the final DELETE verdicts were acted on (FR-001 completion).

**Checkpoint**: All DELETE-verdict files absent from repo, tests green, lint count ≤ baseline — US1 complete.

---

## Phase 4: US3 — Green/Gray Terminology Sweep (P2)

**Goal**: Every user-facing disc color label reads "green"/"gray" (not "red"/"yellow" or "grey"). Internal board-cell enum values `'red'`/`'yellow'` are unchanged.

**Independent Test**: `rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/` returns zero hits that refer to disc colors. `rg "'red'\|'yellow'" connect-four/src/lib/board.js connect-four/src/components/Board.jsx` still returns matches (internal enum unchanged). `npm run test:fast` exits 0.

**Note**: This phase is independent of US1/US2 and can be executed in parallel with Phases 2–3 if desired.

- [ ] T016 [US3] Run the full FR-013 scan: `rg -iw "yellow|red" connect-four/src/ connect-four/server/ connect-four/lessons/ visualize_board.sh connect-four/server/scripts/` — review every hit for disc-color usage; filter out non-disc-color contexts (CSS variable names, code comments, identifiers, `userPerspective` field values, `boardSpec` values, `correctCol` values). Record all disc-color hits to guide T017–T022.
- [ ] T017 [P] [US3] Fix `connect-four/server/scripts/visualize_board.mjs` (FR-021): at line ~82, change `'Grey'` → `'Gray'` in the nextPlayer string; at line ~152, change `'Gy=Grey'` → `'Gy=Gray'` in the legend string. Scan remaining file for any other 'Grey' string literals and fix all.
- [ ] T018 [P] [US3] Fix `connect-four/server/explainContext.js` (FR-020): at line 130, change `'Grey'` → `'Gray'` in the playerName assignment; at line 155, change `'Grey'` → `'Gray'` in the opponentName assignment. Check line ~158 (trivialExplanation string) for any 'Grey' reference and fix if present.
- [ ] T019 [P] [US3] Fix `connect-four/server/llmCoachHelpers.js` (FR-020 continuation): at line ~554, change `playerName === 'Green' ? 'Grey' : 'Green'` to use `'Gray'`; at line ~589, change `'Gy = Grey discs'` → `'Gy = Gray discs'`. Scan remaining file for any other 'Grey' string literals used in LLM prompt construction (not in JSDoc comments — those are out of scope per FR-019) and fix all.
- [ ] T020 [P] [US3] Fix `connect-four/server/scripts/classify_all.mjs` (FR-016): change `playerName = p => p === 1 ? 'Red' : 'Yellow'` to `'Green' : 'Gray'`; change `console.log('Red (player 1):',...)` → `'Green (player 1):'`; change `console.log('Yellow (player 2):',...)` → `'Gray (player 2):'`; change solver-scores header string `'positive=Red wins, negative=Yellow wins'` → `'positive=Green wins, negative=Gray wins'`. For the threat map legend string (rm/rn/ym/yn abbreviations), update only the player name portions if the string emits "Red"/"Yellow" as display labels; do NOT change the rm/rn/ym/yn abbreviations themselves (they are internal identifiers, out of scope per FR-019).
- [ ] T021 [US3] Fix lesson JSON files (FR-015) — edit only `text`, `infoProse`, and `label` fields; do NOT touch `userPerspective`, `boardSpec`, `goalPredicateType`, `correctCol`, or `_boardInstructions` fields. Files with confirmed hits: `connect-four/lessons/lesson-01-immediate-threat.json` ("three Yellow discs"→"three Gray discs", "Tempting Yellow build"→"Tempting Gray build"); `connect-four/lessons/lesson-02-block-before-build.json` (scan and fix all Red/Yellow disc references in infoProse/text); `connect-four/lessons/lesson-04-odd-rows-belong-to-red.json` (fix all "Red"→"Green" and "Yellow"→"Gray" in user-facing text only); `connect-four/lessons/lesson-09-overcut.json` (fix "Yellow"→"Gray" and "Red"→"Green" in infoProse/text); `connect-four/lessons/lesson-10-figure-7-trap.json` (fix all "Yellow"→"Gray" across slides); `connect-four/lessons/lesson-11-j-shape.json` (fix "Yellow"→"Gray" in infoProse). Also scan `lesson-03`, `lesson-05`, `lesson-06`, `lesson-07`, `lesson-08` for any misses and fix if found.
- [ ] T022 [P] [US3] Scan `connect-four/src/i18n/es.json` (FR-014): run `rg -iw "rojo|amarillo|red|yellow" connect-four/src/i18n/es.json`. If zero hits → record as confirmed no-op. If hits found → replace disc-color terms with "verde"/"gris". Also confirm `connect-four/src/i18n/en.json` remains a no-op (already verified in research: no 'red'/'yellow' disc labels present).
- [ ] T023 [US3] Run `cd connect-four && npm run test:fast` — must exit 0 (FR-022). If any test fails, diagnose: confirm no internal cell enum value (`'red'`/`'yellow'` as `board[row][col]` cell values) was inadvertently renamed.
- [ ] T024 [US3] Run final Part B verification: (1) `rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/ | grep -v "userPerspective\|boardSpec\|goalPredicate\|correctCol\|_boardInstructions"` — expect zero disc-color hits (SC-005; `_boardInstructions` is an internal authoring field excluded from the sweep); (2) `rg "'red'\|'yellow'" connect-four/src/lib/board.js connect-four/src/components/Board.jsx` — expect matches present, confirming internal enum was not renamed (SC-006).

**Checkpoint**: All user-facing disc color labels normalized; internal enum intact; tests green — US3 complete.

---

## Phase 5: Polish & Final Cross-Verification

**Purpose**: Confirm all success criteria hold simultaneously — both tracks verified end-to-end.

- [ ] T025 Run final cross-track verification: (1) `fd "PuzzlesPage|PlaceholderScreen" connect-four/src/` — expect zero results (SC-002, deleted files absent); (2) `rg "PuzzlesPage\|PlaceholderScreen" connect-four/src/ connect-four/server/` — expect zero import references (SC-007); (3) confirm `specs/032-repo-hygiene-tech-debt/debt-inventory.md` exists with populated rows for every audited directory (SC-001) and the "Deletions executed" section from T015.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T001 and T002 are independent of each other ([P]).
- **Phase 2 (Foundational/US2)**: T003–T008 all depend on T001 (import graph); they are independent of each other ([P] within Phase 2). T009 depends on T002–T008 all completing.
- **Phase 3 (US1)**: T010, T011, T012 all depend on T009 (inventory complete). T010 and T011 are independent of each other ([P]). T012 depends on T009 (needs full DELETE list). T013 and T014 depend on T010–T012 all completing (all deletions done). T014 is [P] with T013. T015 depends on T013 and T014.
- **Phase 4 (US3)**: T016 can start after Phase 1 Setup (no dependency on US2 inventory or US1 deletions). T017–T020, T022 are [P] with each other and depend on T016 (scan first to know what to change). T021 depends on T016. T023 depends on T017–T022. T024 depends on T023.
- **Phase 5 (Polish)**: Depends on Phase 3 and Phase 4 both complete.

### Critical Dependency: T001 → T003–T008

T001 (import graph) is the primary reachability signal for the entire audit. T003–T008 MUST NOT be started before T001 completes. Single-hop `rg` grep is a secondary confirmation step, not a substitute for the graph.

### Critical Dependency: T009 → T010–T012

No file may be deleted before T009 (debt-inventory.md) is written. FR-001 is a hard gate.

### Track Parallelism

Phase 4 (US3) is entirely independent of Phases 2–3 (US1/US2). If executing with two agents or two sessions:
- **Agent A**: Phase 1 → Phase 2 → Phase 3 → Phase 5
- **Agent B**: Phase 1 (T001 only, needed for T016 scan context) → Phase 4 → Phase 5

### Within-Phase Parallelism

- T001 + T002: parallel
- T003–T008: parallel (after T001)
- T010 + T011: parallel (after T009)
- T013 + T014: parallel (after T012)
- T017–T020 + T022: parallel (after T016)

---

## Parallel Execution Examples

### Phase 2 — Audit Sub-tasks (all after T001)

```bash
# All six audit tasks can run simultaneously:
T003: audit src/screens/ (20 files)
T004: audit src/pages/ (3 files)
T005: audit src/components/ (~30 files)
T006: audit src/lib/, src/context/, src/store/ (16 files)
T007: audit server/ root (~30 files)
T008: audit server/scripts/ (13 files)
```

### Phase 4 — Terminology Fix Sub-tasks (all after T016)

```bash
# Five fix tasks can run simultaneously:
T017: fix visualize_board.mjs
T018: fix explainContext.js
T019: fix llmCoachHelpers.js
T020: fix classify_all.mjs
T022: scan es.json (no-op expected)
# T021 (lesson JSONs) is larger — run sequentially or after T016 result review
```

---

## Implementation Strategy

### MVP First (US2 + US1, the P1 stories)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (Debt Inventory — US2)
3. **STOP and VALIDATE**: `debt-inventory.md` exists, all rows populated, no empty Reason cells
4. Complete Phase 3: US1 (Deletions + Verification)
5. **STOP and VALIDATE**: tests pass, lint count ≤ baseline, inventory updated
6. Deploy/merge Phase 3 complete

### Full Delivery (add US3)

7. Complete Phase 4: US3 (Green/Gray Sweep) — can overlap with Steps 2–5 if parallelized
8. **STOP and VALIDATE**: verification scan zero hits, tests pass
9. Complete Phase 5: Final cross-verification
10. Merge

### Scope Boundaries (must not cross)

- Internal `board[row][col]` cell enum values `'red'`/`'yellow'` → NOT changed (FR-017)
- CSS variable/class/token names containing "red"/"yellow" → NOT changed (FR-018)
- Code comments, variable names, identifiers → NOT changed (FR-019)
- `userPerspective`, `boardSpec`, `_boardInstructions` fields in lesson JSON → NOT changed (D4 in plan)
- `AdminLessonEditorScreen.jsx`, `AdminLessonListScreen.jsx` → NOT deleted (live via AdminLessonsPage.jsx lazy-load)
- JSDoc type annotations (e.g. `@param {'Green'|'Grey'}`) → NOT changed (FR-019)
- Per-symbol dead-export pruning → out of scope (file granularity only)
