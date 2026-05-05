# Tasks: Puzzle Factory (Internal Tool)

**Input**: Design documents from `specs/003-puzzle-factory/`  
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Data model**: [data-model.md](data-model.md) | **Contracts**: [contracts/api.md](contracts/api.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths in every description

---

## Phase 1: Setup

**Purpose**: Database foundation — required before any code can be tested against real storage.

- [x] T001 Apply migration `connect-four/server/migrations/007_puzzle_factory.sql` to local Supabase: widens `puzzles.category` CHECK to 1–7, adds `'forbidden_columns'` to predicate type CHECK, creates `candidates` table (with `seed` column), creates `false_positive_records` table. Verify with `SELECT table_name FROM information_schema.tables WHERE table_name IN ('candidates','false_positive_records')`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Category 7 predicate — required by the generation engine (US1) and the workspace predicate checklist (US3). Must complete before either story begins.

**⚠️ CRITICAL**: US1 and US3 both call `evaluatePredicate` with category 7. This must exist and be tested first.

- [x] T002 Implement `case 7` (Forbidden Columns) in `connect-four/server/predicates.js` inside `evaluatePredicate`: for each legal column `c` (where `heights[c] < ROWS`), build the board after playing `c`, call `c4solver` for the resulting position, flag `c` as forbidden if `opponent_scores.max === immediateWinScore(moveCount + 1)`. Return `{ result: 'correct'|'wrong', forbiddenCols: number[] }`. A position passes when `forbiddenCols.length >= 1`. See [plan.md Step 2](plan.md) and [research.md Decision 1](research.md).

- [x] T003 [P] Write integration tests for category 7 predicate in `connect-four/tests/predicates/forbidden_columns.test.js`: one positive fixture (a deterministic `move_string` where ≥1 column gifts opponent an immediate win) and one negative fixture (no such column). Both fixtures must be hardcoded move strings, not randomly generated (Constitution Principle III). Run against real `c4solver` binary.

---

## Phase 3: User Story 1 — Automated Candidate Generation (Priority: P1) 🎯 MVP

**Goal**: The backend can generate a batch of clean, predicate-passing candidates for any category, seeded for reproducibility. Triggerable via API.

**Independent Test**: `POST /api/admin/generate` with `{ category: 1, count: 5 }` returns `inserted >= 1`, each candidate has `solver_scores.length === 7`, and no candidate has an immediate winning move other than the predicate-satisfying column. Re-running with the returned `seed` produces the same `move_string` values.

- [x] T004 Implement `connect-four/server/candidate-generator.js` exporting `generateCandidates(category, count, seed?)`. Seed a pure-JS PRNG (implement `mulberry32` — 4 lines, no dependency) using `seed ?? Math.floor(Math.random() * 2**32)`. Game loop: start from empty board or random 4–6 move opening; at each ply fetch solver scores via `c4solver`; select next move with weighted random (higher weight for moves with higher solver score, occasional sub-optimal picks); after each move call `evaluatePredicate` from `predicates.js`; apply cleanliness filters (reject if any column has score == `immediateWinScore` and category ≠ 1; reject if predicate passes for more than one column); on clean pass, record candidate with board state, solver scores, and classifier tags from `classifier.js`. Return `{ candidates[], seed, durationMs }`. See [plan.md Step 3](plan.md) and [research.md Decisions 3, 4, 5, 8](research.md).

- [x] T005 Implement `POST /api/admin/generate` route in `connect-four/server/index.js` under `requireLocalhost`: validate `category` (1–7), `count` (1–100, default 30), optional `seed`; call `generateCandidates`; bulk-insert returned candidates into `candidates` table (include `seed` column); return `{ generation_run_id, inserted, seed, duration_ms }`. See [contracts/api.md](contracts/api.md).

- [x] T006 Write integration test in `connect-four/tests/integration/candidate-generator.test.js`: call `generateCandidates(1, 5, 99)` with a fixed seed against the real solver; assert `candidates.length >= 1`; assert each candidate's `solver_scores` has length 7; assert `seed === 99` in the return value; call again with the same seed and assert the same `move_string` values are produced (reproducibility). See [plan.md Step 3](plan.md).

**Checkpoint**: `POST /api/admin/generate` works end-to-end. Candidates appear in the `candidates` table with correct `seed` values. Generation with the same seed is reproducible.

---

## Phase 4: User Story 2 — Candidate Review Dashboard (Priority: P2)

**Goal**: An annotator can see per-category pending counts, trigger generation (with optional seed), and batch-reject a category — all from a single dashboard view.

**Independent Test**: Pre-populate `candidates` table with 10 pending rows for category 1. Open the dashboard, verify count shows 10. Click "Generate" for category 2 with count=5; verify new rows appear and the seed is displayed. Click "Reject All" for category 1; verify count drops to 0.

- [x] T007 [P] Implement `GET /api/admin/candidates/stats` in `connect-four/server/index.js` under `requireLocalhost`: GROUP BY `(category, status)` query on `candidates` table; return array of `{ category, pending, approved, rejected }` for all 7 categories (include zeros). See [contracts/api.md](contracts/api.md).

- [x] T008 [P] Implement `GET /api/admin/candidates` in `connect-four/server/index.js` under `requireLocalhost`: SELECT with `category` (required) and `status` (default `'pending'`) filters, `limit`/`offset` pagination; return `{ candidates[], total }`. See [contracts/api.md](contracts/api.md). *(This endpoint is also used by CurationWorkspace in US3.)*

- [x] T009 [P] Implement `POST /api/admin/candidates/reject-batch` in `connect-four/server/index.js` under `requireLocalhost`: UPDATE candidates WHERE `category = ?` AND `status = 'pending'`, set `status = 'rejected'`, `rejection_reason = body.reason`, `reviewed_at = now()`; return `{ rejected: N }`. See [contracts/api.md](contracts/api.md).

- [x] T010 Implement `connect-four/src/components/CandidateDashboard.jsx`: on mount fetch `/api/admin/candidates/stats` and render a row per category showing `category name | pending | approved | rejected`; each row has a "Generate" button that opens an inline form with `count` (default 30) and optional `seed` input — on submit POST to `/api/admin/generate`, show a loading indicator within 200ms, display returned `seed` and `inserted` count when complete, then refresh stats; each row with pending > 0 has a "Review" link (navigates to workspace) and a "Reject All" button (POST to reject-batch, then refresh); categories with 0 pending show Generate button prominently and Review greyed out. Depends on T007, T008, T009.

- [x] T011 Wire `CandidateDashboard` as the default view in `connect-four/src/pages/AdminCuratePage.jsx`: render `<CandidateDashboard onSelectCategory={cat => setSelectedCategory(cat)} />`; when `selectedCategory` is set, switch to `CurationWorkspace` (built in US3).

**Checkpoint**: Full dashboard is functional. Annotator can generate a new batch (seeing the seed), review counts, and batch-reject without touching any other view.

---

## Phase 5: User Story 3 — Individual Curation Workspace (Priority: P2)

**Goal**: Annotator can review each candidate one by one: see the correct move pre-highlighted, click any column to inspect solver scores and predicate pass/fail, approve with a pre-populated goal prompt, or reject with a reason (including false-positive with optional note that creates a `false_positive_records` entry).

**Independent Test**: Pre-populate a known category 1 candidate. Open the workspace — verify the winning column is highlighted before any click. Click a non-winning column — verify solver scores and `predicate_pass: false` appear within 2 seconds. Press A, verify goal_prompt pre-populated with "Find the winning move.", change difficulty to 3, confirm — verify puzzle row in `puzzles` table and candidate `status = 'approved'`. Open another candidate, press R, select "False Positive / Classifier Bug", add note, confirm — verify `false_positive_records` row exists.

- [x] T012 [P] Implement `GET /api/admin/scores` in `connect-four/server/index.js` under `requireLocalhost`: accept query params `moves` (required) and `category` (required 1–7); call `c4solver` subprocess with `moves` (reuse the existing solver-spawn pattern from `/api/explain`); call `classify()` from `classifier.js`; call `evaluatePredicate` from `predicates.js` with the given category; return `{ scores: number[7], classifier_tags: string[], predicate_pass: boolean }`. Must respond within 2s (SC-005). See [contracts/api.md](contracts/api.md) and [plan.md Step 4](plan.md).

- [x] T013 [P] Implement `POST /api/admin/candidates/:id/approve` in `connect-four/server/index.js` under `requireLocalhost`: fetch candidate by id; return 404 if not found, 409 if already reviewed; validate `goal_prompt`, `difficulty` (1–3), `cooperative_ai_moves` (integer array); INSERT into `puzzles` table (reuse the field mapping from existing `POST /api/admin/puzzles` — `move_string`, `category`, `goal_prompt`, `goal_predicate_type` derived from category, `cooperative_ai_moves`, `difficulty`); UPDATE candidate `status = 'approved'`, `reviewed_at = now()`; return `{ puzzle_id, candidate_id }`. See [contracts/api.md](contracts/api.md).

- [x] T014 [P] Implement `POST /api/admin/candidates/:id/reject` in `connect-four/server/index.js` under `requireLocalhost`: fetch candidate; return 404/409 as above; validate `reason` is one of `not_educational | end_game | false_positive | other`; UPDATE candidate `status = 'rejected'`, `rejection_reason`, `reviewed_at`; if `reason === 'false_positive'`, INSERT into `false_positive_records` (`candidate_id`, `category`, `move_string`, `solver_scores` copied from candidate, `annotator_note` from body — save even if note is empty string); return `{ candidate_id, false_positive_record_id? }`. See [contracts/api.md](contracts/api.md).

- [x] T015 [P] Implement `GET /api/admin/false-positives` in `connect-four/server/index.js` under `requireLocalhost`: SELECT from `false_positive_records` with optional `category` filter, ordered by `created_at DESC`; return `{ false_positives[], total }`. See [contracts/api.md](contracts/api.md).

- [x] T016 [P] Implement `connect-four/src/components/PredicateChecklist.jsx`: accepts `{ category, predicatePass, classifierTags }`; renders a named checklist row per goal criterion for the category (e.g. cat 1: "Winning move exists" / cat 3: "Two simultaneous threats created"); lights each row green (✓) or red (✗) based on `predicatePass` and presence of relevant tags in `classifierTags`. No server calls — purely presentational.

- [x] T017 [P] Implement `connect-four/src/components/RejectModal.jsx`: modal with reason `<select>` (`Not educational | Too close to end-game | False Positive / Classifier Bug | Other`); note `<textarea>` labelled "Describe the classifier bug (optional)" — shown for all reasons but clearly useful for false positives; Confirm button POSTs to `/api/admin/candidates/:id/reject`; on success calls `onConfirm()` prop to advance to next candidate; on 409 shows "Already reviewed" message.

- [x] T018 Implement `connect-four/src/components/CurationWorkspace.jsx`: load full pending candidate list for the category via `GET /api/admin/candidates` on mount (store in state for progress tracking); display `"N remaining — generate more"` progress bar where "generate more" navigates back to dashboard; render `Board.jsx` with the candidate's `move_string`; **pre-highlight the predicate-satisfying column on initial render** by deriving it from `candidate.solver_scores` client-side: for cat 1/4/5/6 find column with highest positive score, for cat 2 find only column with score ≥ 0, for cat 3 find column triggering the highest-count pattern tag, for cat 7 flag all forbidden columns from scores — no server call needed; on column click fetch `GET /api/admin/scores?moves=<moveString+col>&category=<cat>` (show loading indicator within 200ms), update displayed score and `PredicateChecklist` with returned data; "Approve" button (or **A** key) opens inline panel with `goal_prompt` pre-populated from the category default templates table in [plan.md Step 6](plan.md) + difficulty selector defaulting to 2; confirm POSTs to approve endpoint and auto-advances; "Reject" button (or **R** key) opens `RejectModal`; **Enter** key confirms open modal. Depends on T012, T013, T014, T016, T017.

- [x] T019 Wire `CurationWorkspace` into `connect-four/src/pages/AdminCuratePage.jsx`: when `selectedCategory` is set render `<CurationWorkspace category={selectedCategory} onBack={() => setSelectedCategory(null)} />`; for categories 4 and 6 additionally render `<MultiMoveSequencer />` (built in US4, stubbed as null until T022 is complete).

**Checkpoint**: Full single-move curation workflow is functional. Annotator can approve and reject candidates with keyboard shortcuts, false-positive records are saved, and the workspace auto-advances between candidates.

---

## Phase 6: User Story 4 — Multi-Move Sequence Definition (Priority: P3)

**Goal**: For Fork Setup (cat 4) and Parity Control (cat 6) candidates, the annotator can define a multi-move sequence — marking start/end and selecting cooperative AI response moves — before approving.

**Independent Test**: Open a category 4 candidate. Click "Mark Start". Play a human move (column highlights that would immediately win are visually flagged). Select an AI cooperative response. Play another human move. Click "Mark End". Press A and confirm. Verify the exported puzzle in `puzzles` has `cooperative_ai_moves` set to the chosen AI columns and `move_string` reflects the full sequence.

- [x] T020 Implement `connect-four/src/components/MultiMoveSequencer.jsx`: renders only for categories 4 and 6 (passed via `category` prop); "Mark Start" button snapshots the current `moveString` as sequence start; at each ply alternates between human-move and AI-response turns; for human-move turns: render the board, visually flag any column whose solver score equals `immediateWinScore` (shortcut wins to avoid per [spec.md FR-009b](spec.md)) using scores already fetched by the workspace; for AI-response turns: display all legal columns with their solver scores and visually flag high-opponent-score columns as non-cooperative (see [research.md Decision 6](research.md)); track the sequence as `{ humanMoves: number[], aiMoves: number[] }`; "Mark End" button finalises the sequence; expose `onSequenceComplete({ cooperativeAiMoves: number[] })` prop called on Mark End.

- [x] T021 Update `POST /api/admin/candidates/:id/approve` handler in `connect-four/server/index.js` (built in T013) to correctly pass `cooperative_ai_moves` through to the `puzzles` INSERT — verify it is stored as an integer array, not an empty array, when provided by the sequencer. Add validation: for categories 4 and 6, `cooperative_ai_moves` must be non-empty. See [contracts/api.md](contracts/api.md).

- [x] T022 Wire `MultiMoveSequencer` into `connect-four/src/components/CurationWorkspace.jsx` (built in T018): for categories 4 and 6, render `<MultiMoveSequencer category={category} solverScores={currentScores} onSequenceComplete={seq => setCooperativeAiMoves(seq.cooperativeAiMoves)} />`; pass `cooperativeAiMoves` to the approve endpoint call.

**Checkpoint**: Fork Setup and Parity puzzles can be fully authored with multi-move sequences. Cooperative AI moves are stored in the exported puzzle.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 Run manual verification golden path from [plan.md Step 10](plan.md): (1) generate cat 1 batch, verify seed shown; (2) verify correct move pre-highlighted in workspace; (3) click non-correct column, verify scores within 2s; (4) press A, verify template pre-populated, approve, verify `puzzles` row; (5) press R, select false-positive with note, verify `false_positive_records` row; (6) exhaust batch, verify "generate more" link; (7) generate again without seed, verify different boards; (8) generate with prior seed, verify same boards; (9) Reject All for a category, verify count = 0; (10) category 4 multi-move sequence with shortcut-win flags visible, approve, verify `cooperative_ai_moves`.

- [x] T024 [P] Fix duplicate `**Query params**:` block in `connect-four/specs/003-puzzle-factory/contracts/api.md` `GET /api/admin/scores` section (lines 195–199 contain duplicate parameter headers — remove the first block, keep the fuller second block).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — apply migration immediately
- **Phase 2 (Foundational)**: Requires Phase 1 — T002 and T003 can run in parallel after T001
- **Phase 3 (US1)**: Requires Phase 2 complete — T004 uses `evaluatePredicate` (T002 must be done)
- **Phase 4 (US2)**: Requires Phase 3 complete — dashboard needs `POST /api/admin/generate` (T005) to wire the Generate button
- **Phase 5 (US3)**: Can start in parallel with Phase 4 after Phase 3 — backend endpoints T012–T015 are independent; frontend T018 depends on T012–T017
- **Phase 6 (US4)**: Requires Phase 5 complete — MultiMoveSequencer extends CurationWorkspace
- **Phase 7 (Polish)**: Requires all prior phases complete

### Within-Phase Dependencies

```
Phase 3:  T004 → T005 → T006 (sequential)

Phase 4:  T007, T008, T009 [parallel] → T010 → T011

Phase 5:  T012, T013, T014, T015, T016, T017 [parallel]
                                               → T018 → T019

Phase 6:  T020 [parallel with T021] → T022
```

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational (Phase 2)
- **US2 (P2)**: Depends on US1 backend (T005) for the Generate button to work
- **US3 (P2)**: Depends on US1 (T005) for candidates to exist; backend endpoints independent of US2
- **US4 (P3)**: Depends on US3 (T018, T019) — extends the workspace

---

## Parallel Opportunities

### Phase 2 (after T001)
```
T002  Implement cat 7 predicate in predicates.js
T003  Write cat 7 integration tests in tests/predicates/forbidden_columns.test.js
```

### Phase 4 (after Phase 3)
```
T007  GET /api/admin/candidates/stats
T008  GET /api/admin/candidates
T009  POST /api/admin/candidates/reject-batch
```

### Phase 5 (after Phase 3)
```
T012  GET /api/admin/scores
T013  POST /api/admin/candidates/:id/approve
T014  POST /api/admin/candidates/:id/reject
T015  GET /api/admin/false-positives
T016  PredicateChecklist.jsx
T017  RejectModal.jsx
```

---

## Implementation Strategy

### MVP (User Story 1 only — backend generation)

1. T001 — Apply migration
2. T002, T003 — Category 7 predicate + tests
3. T004, T005, T006 — Generator engine + API endpoint + integration test
4. **STOP**: Validate `POST /api/admin/generate` end-to-end via curl. Verify seed reproducibility.

### Full Tool (all stories)

1. Complete MVP above
2. Add US2 (T007–T011): dashboard with Generate form
3. Add US3 (T012–T019): curation workspace
4. Add US4 (T020–T022): multi-move sequencer
5. T023: Manual golden-path verification

---

## Notes

- All server routes use existing `requireLocalhost` middleware — no new auth code needed
- T013 (approve) reuses the INSERT pattern from existing `POST /api/admin/puzzles` — extract shared logic if duplication grows
- Category 7 (`forbidden_columns`) requires up to 7 solver calls per predicate check — acceptable within the 3s budget for cats 4–7 but generation for cat 7 will be slower than cats 1–3
- The pre-highlight logic in T018 is purely client-side from stored scores — no server round-trip
- Keyboard shortcuts (A/R/Enter) in T018 must not fire when focus is inside an `<input>` or `<textarea>`
