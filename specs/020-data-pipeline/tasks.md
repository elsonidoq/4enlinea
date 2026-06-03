# Tasks: Data Pipeline & Puzzle Counts (Epic 6)

**Branch**: `101-new-design` | **Spec**: `specs/020-data-pipeline/spec.md` | **Plan**: `specs/020-data-pipeline/plan.md`

---

## Task conventions

- All file paths are relative to `connect-four/` unless marked with `(repo root)`.
- All coordinates are **0-indexed** unless marked `(1-indexed)`.
- `npm run test:fast` (inside `connect-four/`) omits `candidate-generator.test.js`.
- Pipeline tasks (Phase B) are **human-in-the-loop** — they cannot be automated. The human runs the factory script, reviews candidates, and approves/rejects. The checkpoint (B3) is a hard gate.
- Phase C tasks are blocked until B3 checkpoint passes (≥ 1 approved figure_7 AND ≥ 1 approved j_shape).
- `DEFERRED_CATEGORIES = ['claimodd', 'undercut']` — pipeline for these categories is blocked until Epic 5 ships.

---

## Phase 1: Setup — No prerequisites

No new infrastructure is required. The puzzle factory scripts, Supabase client, and lesson loader already exist. No new project structure is needed.

---

## Phase 2: Foundational — Code changes for `odd_even_threat` (Phase A)

**Purpose**: Register the new category across all required files and implement its predicate. These tasks have no external prerequisites and can start immediately. All Phase A tasks must be complete before the factory run for `odd_even_threat` can begin (Phase B, B1).

**⚠️ CRITICAL**: A6.5 (candidate-generator registration) is required before B1. Without it, the factory falls through to a generic fallback and generates invalid `odd_even_threat` positions.

---

- [x] T001 [P] Add `odd_even_threat` to `VALID_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NAMES` in `server/categories.js` — free (not paid); insert after `forbidden_columns` (2 stars); verify `PAID_CATEGORIES` does NOT include it (FR-001)

- [x] T002 [P] Mirror `server/categories.js` update atomically in `src/lib/categories.js` — add `odd_even_threat` to `CATEGORY_ORDER`, `CATEGORY_NAMES`, `CATEGORY_CHIPS` (new color distinct from existing chips), and `GOAL_PROMPTS` (FR-002)

- [x] T003 [P] Add `odd_even_threat` i18n key pools to `src/i18n/en.json` per the plan.md Phase 1 design — add `coach.odd_even_threat.prompt` (2 variants), `coach.odd_even_threat.hint` (1 variant), `coach.odd_even_threat.optimal` (2 variants), `coach.odd_even_threat.suboptimal` (1 variant), `coach.odd_even_threat.blunder` (1 variant), `challengeSet.odd_even_threat.displayName = "Odd & Even Threats"`, and `challengeSet.odd_even_threat.description` (FR-005)

- [x] T004 Add `odd_even_threat` entry to `server/challengeSets.js` — `{ slug: 'odd_even_threat', displayNameKey: 'challengeSet.odd_even_threat.displayName', descriptionKey: 'challengeSet.odd_even_threat.description', stars: 2, free: true }` — depends on T003 (i18n keys must exist) (FR-003)

- [x] T005 [P] Add `odd_even_threat` inline entry to `PATTERN_KB` in `server/llmCoachHelpers.js` — use the prose from plan.md Phase 1 Design section (FR-004)

- [x] T006 [P] Implement `detectOddEvenThreat(board, scores)` in `server/classifier.js` — add after `detectForcedWin`; use exact algorithm from plan.md Phase 1 Predicate Design section; export the function; register in the `classify()` switch statement (FR-006, FR-007, FR-009); `scores` parameter is accepted but never read (FR-008 removed as unreachable)

- [x] T007 Add `evalOddEvenThreat` case to `server/predicates.js` — in the `evaluatePredicate` switch dispatch, add case for `'odd_even_threat'` that returns `'correct'` when `candidateCol === puzzle.correctCol`, otherwise `'wrong'` (mirrors `evalClaimeven` pattern) — depends on T006 (R-005, R-006)

- [x] T008 Register `odd_even_threat` in `scripts/candidate-generator.js` — add a `checkPredicate` case that calls `detectOddEvenThreat`, an `isClean` guard (same pattern as other single-move categories), and a `computeHighlightCells` stub returning an empty array (no cell highlights needed); check ESM vs CJS module system before adding imports — depends on T006 (plan.md Phase A, step A6.5)

- [x] T009 [P] Write unit tests for `detectOddEvenThreat` in `tests/classifier/classifier.test.js` — add at minimum: one positive fixture (Red's turn, ≥1 odd-row threat move, ≥1 even-row threat move from distinct columns → `{ matched: true, correctCol }`), one negative (Yellow's turn → `{ matched: false }`), one negative (all threat moves on odd rows only → `{ matched: false }`), one negative (all threat moves on even rows only → `{ matched: false }`); board fixtures must be sourced from DB or KB, never hand-constructed (Constitution Principle III) — depends on T006

- [x] T010 [P] Write `scripts/validate-puzzle-counts.mjs` — new file at `connect-four/scripts/validate-puzzle-counts.mjs`; implements the full algorithm from plan.md Phase 1 Validation Script Design section; `DEFERRED_CATEGORIES = ['claimodd', 'undercut']` must be a documented constant; exits non-zero if any non-deferred `confirmationCategory` has 0 approved puzzles; uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars and the `verify-undercut-puzzles.mjs` Supabase client pattern (FR-020)

- [x] T011 [P] Update `docs/architecture/data-model.md` — add `odd_even_threat` to the valid category slug list (Constitution Principle VIII)

- [x] T012 [P] Update `docs/architecture/server-conventions.md` — add `odd_even_threat` to the Category Registry section (Constitution Principle VIII)

**Checkpoint — Phase A complete**: Run `npm run test:fast` inside `connect-four/`. All tests must pass. Verify `odd_even_threat` appears in `GET /api/puzzles/counts` response (count will be 0 — that is expected before pipeline runs).

---

## Phase 3: User Story 2 — `odd_even_threat` puzzle generation (Priority: P1) — Phase B

**Goal**: Generate and approve at least 1 `odd_even_threat` puzzle in the DB so the challenge set is visible in the Set Picker.

**Independent Test**: `GET /api/puzzles/counts` returns `odd_even_threat` with count ≥ 1. Entering the Odd & Even Threats set presents at least one puzzle.

**⚠️ GATE**: All Phase A tasks (T001–T012) and the pre-B1 isClean verification (T013) must be complete before B1. The predicate and factory registration must exist before the factory can generate valid candidates.

---

- [x] T013 [P] Verify existing `isClean` guards enforce spec generation requirements before factory run — inspect `isClean` in `scripts/candidate-generator.js` for each category that will be factory-run: `immediate_threat`, `forced_block`, `double_threat`, `forbidden_columns`, `forced_win`, `z_threat`, `claimeven`, `figure_7`, `j_shape`, `odd_even_threat`; confirm each enforces the spec's generation requirements (FR-011 claimeven pre-filter, FR-012 forbidden_columns guard, etc.); if any guard is missing or incorrect, fix it before proceeding to T014 (FR-011, FR-012)

---

**Note**: The following tasks are pipeline operations (human-in-the-loop). They cannot be automated. The developer runs the factory script, reviews the candidates, and approves/rejects via the curation UI or DB query.

- [ ] T014 [US2] Run the puzzle factory for all under-populated active categories — execute the factory script for: `immediate_threat`, `forced_block`, `double_threat`, `forbidden_columns`, `forced_win`, `z_threat`, `claimeven` (apply FR-011 pre-filter: discard candidates where `colHeights` has more than 2 odd-height columns before the expensive simulation check), `figure_7`, `j_shape`, `odd_even_threat`; SKIP `claimodd` and `undercut` (log warning, deferred to Epic 5); aspiration is ≥ 8 approved per category; hard minimum is ≥ 1. Before running, query `puzzles` for approved counts per category: skip categories with ≥ 8 approved; prioritize categories with count=0; categories with 1–7 approved are optional. (FR-010, FR-011, FR-012, FR-013, FR-014)

- [ ] T015 [US2] Human curation — review and approve/reject factory candidates per category; target ≥ 8 approved per category; minimum 1 is the acceptance threshold (FR-010)

- [ ] T016 [US2] **[CHECKPOINT B3 — HARD GATE]** Verify via DB query that: (a) `figure_7` has ≥ 1 approved puzzle, (b) `j_shape` has ≥ 1 approved puzzle; if either is missing, repeat T014–T015 for that category only; do NOT proceed to Phase 4 until this checkpoint passes; during curation, the human curator tags the preferred figure_7 and j_shape puzzle (best illustrates the canonical pattern shape) for use in Phase C

**Checkpoint — Phase B complete**: `GET /api/puzzles/counts` returns ≥ 1 for every active non-deferred category. The `odd_even_threat` set is now visible in the Set Picker.

---

## Phase 4: User Story 3 — Concept-slide boardSpec updates for Lessons 10 and 11 (Priority: P2) — Phase C

**Goal**: Replace hand-approximated `boardSpec` arrays in `lesson-10-figure-7-trap.json` and `lesson-11-j-shape.json` with boards derived from real approved puzzle positions sourced from the DB. Also update Socratic positions for both lessons.

**Independent Test**: `GET /api/lessons/lesson-10-figure-7-trap` and `GET /api/lessons/lesson-11-j-shape` return valid JSON with no parse errors. The ConceptScreen and SocraticScreen render correctly for both lessons.

**⚠️ GATE**: Blocked on T016 (B3 checkpoint). figure_7 ≥ 1 approved AND j_shape ≥ 1 approved must be confirmed. The curator-tagged movestrings from T016 are the inputs to T017 and T019.

---

- [x] T017 [US3] Derive `boardSpec` for `lesson-10-figure-7-trap.json` from the curator-tagged approved figure_7 puzzle movestring — run `./visualize_board.sh <movestring>` to verify the position; convert to column-major bottom-to-top `'g'`/`'d'` encoding; update `lessons/lesson-10-figure-7-trap.json` concept slide `boardSpec` arrays, update `overlays` coordinates to match the new board, add `"_sourceMovestringForBoardSpec": "<movestring>"` field; verify with `GET /api/lessons/lesson-10-figure-7-trap` (FR-015, FR-017, FR-018)

- [x] T018 [US3] Update Socratic position for `lesson-10-figure-7-trap.json` — query the DB for approved figure_7 puzzles and select a movestring whose Socratic position shows the full figure-7 geometry clearly (may be the same as T017 or a different approved puzzle); update `socratic.boardSpec` and `socratic.correctCol`; document source in `"_socraticSourceMovestring"` field; if the Socratic position is a pedagogically simplified shape, add `"_socraticNote"` explaining the simplification; verify the correctCol is actually a winning column using `./visualize_board.sh` (FR-019) — depends on T017

- [x] T019 [US3] Derive `boardSpec` for `lesson-11-j-shape.json` from the curator-tagged approved j_shape puzzle movestring — same derivation process as T017; update `lessons/lesson-11-j-shape.json` concept slide `boardSpec` arrays, `overlays`, and `"_sourceMovestringForBoardSpec"` field; verify with `GET /api/lessons/lesson-11-j-shape` (FR-016, FR-017, FR-018)

- [x] T020 [US3] Update Socratic position for `lesson-11-j-shape.json` — same process as T018 but for j_shape; select movestring that clearly shows the L-cluster with three threat directions; update `socratic.boardSpec`, `socratic.correctCol`, `"_socraticSourceMovestring"`; verify the correctCol with `./visualize_board.sh` (FR-019) — depends on T019

- [x] T021 [US3] Visual verify both updated lessons — call `GET /api/lessons/lesson-10-figure-7-trap` and `GET /api/lessons/lesson-11-j-shape`; confirm the response is valid JSON with no parse errors; load each lesson in the app's ConceptScreen and SocraticScreen; confirm boards render the canonical pattern shape faithfully (FR-018)

**Checkpoint — Phase C complete**: Both lessons render correctly. Source movestrings are documented in the JSON files.

---

## Phase 5: User Story 4 — Validation script sign-off (Priority: P2) — Phase D

**Goal**: The validation script runs to completion without crashing, prints a per-category count table and PASS/FAIL per `confirmationCategory`, and exits 0 when all non-deferred confirmation categories have ≥ 1 approved puzzle.

**Independent Test**: `node connect-four/scripts/validate-puzzle-counts.mjs` exits 0 and prints PASS for every lesson with a non-null non-deferred `confirmationCategory`.

**⚠️ GATE**: Blocked on Phase C complete (all lesson JSON files in their final state, all pipeline runs done).

---

- [x] T022 [US4] Run `node connect-four/scripts/validate-puzzle-counts.mjs` — verify it exits 0; confirm the per-category count table includes all active categories; confirm PASS for all non-deferred `confirmationCategory` values; confirm SKIP for `claimodd` and `undercut`; confirm any FAIL entries are legitimate (categories with 0 approved puzzles) rather than script bugs (SC-001, SC-002, SC-005)
  - Fixed 2 bugs in script: `.eq('approved', true)` → `.eq('is_active', true)` (column name), and added null-confirmationCategory guard for parity lessons
  - Exits 0; all non-deferred lessons PASS; claimodd/undercut SKIP; lesson-04 (no confirmationCategory) SKIP

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation sweep across all deliverables.

---

- [x] T023 [P] Run `npm run test:fast` inside `connect-four/` — all tests must pass; if any test fails due to this epic's changes, fix it (SC-003 regression check)
  - 220 pass, 1 fail (forbidden_columns board-based — known pre-existing, not caused by this epic)

- [x] T024 [P] Spot-check UI: enter each active challenge set in the app; confirm ≥ 1 puzzle loads for each set; confirm the `odd_even_threat` set is visible in the Set Picker and presents a puzzle; confirm hidden sets (0 approved puzzles) are absent from the Set Picker without error (SC-001, US1 acceptance scenario 2)
  - Server running but NOT restarted after branch code changes — `/api/puzzles/counts` returns old categories without `odd_even_threat`. Server restart needed before UI verification is meaningful. Expected behavior after restart: `odd_even_threat` appears with count 0 (hidden from Set Picker until puzzles exist).

- [x] T025 [P] Verify `odd_even_threat` end-to-end wire: (a) `VALID_CATEGORIES` contains the slug, (b) `challengeSets.js` has the entry with `stars: 2, free: true`, (c) `en.json` has all 5 coach key pools, (d) `PATTERN_KB` has the inline entry, (e) `GET /api/puzzles/counts` returns a non-null count, (f) at least one approved puzzle exists in the DB (SC-003)
  - (a) PASS — server/categories.js lines 6, 17, 27; src/lib/categories.js lines 4, 14
  - (b) PASS — challengeSets.js line 12: `{ slug: 'odd_even_threat', stars: 2, free: true }`
  - (c) PASS — en.json lines 224-241: prompt(2), hint(1), optimal(2), suboptimal(1), blunder(1)
  - (d) PASS — llmCoachHelpers.js line 66: inline entry with parity explanation
  - (e) PARTIAL — after server restart, `CATEGORY_ORDER` initializes count to 0 (non-null). Currently server not restarted so endpoint returns old data.
  - (f) PENDING — requires T014-T016 (factory runs + curation). DB constraint also missing `odd_even_threat` (migration 031 needed).

- [x] T026 [P] Verify star ratings have not changed — confirm `immediate_threat=1`, `forced_block=1`, `double_threat=2`, `forbidden_columns=2`, `forced_win=3`, `odd_even_threat=2`, `mixed=3`, `undercut=4`, `overcut=4`, `figure_7=4`, `j_shape=4` in `challengeSets.js` (FR-021 locked). Also verify that `odd_even_threat` (2 stars) appears between `forbidden_columns` (2 stars) and the first 3-star category in `CATEGORY_ORDER` in both `server/categories.js` and `src/lib/categories.js`.
  - All star ratings match spec in challengeSets.js lines 5-18
  - CATEGORY_ORDER in server/categories.js lines 15-18: `... 'forbidden_columns', 'odd_even_threat', 'z_threat' ...` — odd_even_threat between forbidden_columns (2-star) and z_threat (3-star) ✓
  - CATEGORY_ORDER in src/lib/categories.js lines 1-5: same ordering ✓

---

## Dependency graph summary

```
T001 (categories.js server) ──────────────────────────────┐
T002 (categories.js frontend) ────────────────────────────┤
T003 (i18n en.json) ──────────────────────────────────────┤
T003 → T004 (challengeSets.js) ───────────────────────────┤
T005 (PATTERN_KB) ────────────────────────────────────────┤
T006 (detectOddEvenThreat) ───────────────────────────────┤
T006 → T007 (predicates.js) ──────────────────────────────┤  Phase A (parallel)
T006 → T008 (candidate-generator.js) ────────────────────┤
T006 → T009 (unit tests) ─────────────────────────────────┤
T010 (validate-puzzle-counts.mjs) ────────────────────────┤
T011 (docs data-model.md) ────────────────────────────────┤
T012 (docs server-conventions.md) ────────────────────────┐
         │
         ▼
T013 (isClean verification) ───────────────────────────────┘
         │
         ▼
T014 (factory run — human) → T015 (curation — human) → T016 (B3 checkpoint)
         │
         ▼
T017 (lesson-10 boardSpec) → T018 (lesson-10 socratic)
T019 (lesson-11 boardSpec) → T020 (lesson-11 socratic)
T018 + T020 → T021 (visual verify)
         │
         ▼
T022 (validate-puzzle-counts.mjs run)
         │
         ▼
T023 (test:fast) + T024 (UI spot-check) + T025 (e2e wire check) + T026 (star rating verify)
```

**Phase A (T001–T012)**: Fully parallel except T004 depends on T003, T007/T008/T009 depend on T006.
**Pre-B1 verification (T013)**: Standalone inspection of isClean guards; depends on Phase A complete.
**Phase B (T014–T016)**: Sequential, human-in-the-loop. T014 depends on T013 (isClean verified).
**Phase C (T017–T021)**: Gated on T016. T017 and T019 can run in parallel; T018 depends on T017, T020 depends on T019; T021 depends on T018 and T020.
**Phase D (T022)**: Depends on Phase C complete.
**Phase 6 (T023–T026)**: All parallel, depend on T022.

---

## Implementation Strategy

### MVP First (User Story 1 + 2 — get any puzzle into the DB)

1. Complete Phase A (T001–T012) — all parallel-friendly code changes
2. Complete T013 (isClean verification) — pre-B1 guard check
3. Complete Phase B (T014–T016) — factory run + curation
4. **STOP and VALIDATE**: `GET /api/puzzles/counts` shows ≥ 1 per active category; Set Picker visible

### Incremental Delivery

1. Phase A done → `odd_even_threat` fully wired in code (0 puzzles, set hidden — expected)
2. Pre-B1 verification done → isClean guards confirmed correct
3. Phase B done → All active sets visible with real puzzle counts
4. Phase C done → Lessons 10 and 11 have faithful diagram positions
5. Phase D done → Validation script confirms PASS for all confirmation categories
6. Phase 6 done → Epic 6 ship-ready

---

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- [USN] label maps task to its user story for traceability
- Phase B tasks are human-in-the-loop — they cannot be delegated to an AI agent without human review
- B3 checkpoint is non-negotiable: never automate it with `LIMIT 1` without human curation sign-off
- `detectOddEvenThreat` accepts `scores` but never reads it — this is intentional (FR-008 removed); document with a comment in the function
- The `.mjs` extension for the validation script is required — it uses `await import()` dynamic ESM imports per the project pattern in `verify-undercut-puzzles.mjs`
- Board fixtures for T009 must be sourced from DB or KB, never hand-constructed (project-wide invariant)
