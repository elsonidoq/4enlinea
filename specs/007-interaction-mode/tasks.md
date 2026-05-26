# Tasks: Interaction Mode & forced_win Refactor

**Input**: Design documents from `/specs/007-interaction-mode/`  
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/api.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

*No new project initialization required — existing Node.js/React project structure is in place.*

- [x] T001 Verify `connect-four/server/migrations/` directory and confirm migration numbering (next is 014)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema change that both user stories depend on — MUST complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Write `connect-four/server/migrations/014_interaction_mode.sql`: (1) ADD COLUMN `interaction_mode TEXT DEFAULT 'single_move' CHECK (interaction_mode IN ('single_move','sequence'))` to `public.puzzles`; (2) `UPDATE public.puzzles SET interaction_mode = 'sequence' WHERE category = 'forced_win'` — this is a no-op on full execution (those rows are deleted in step 3), but retained so a partial rollback that skips step 3 still leaves forced_win rows with the correct mode; (3) `DELETE FROM public.puzzles WHERE category = 'forced_win'`; (4) `GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated` — following the migration 012 pattern in `connect-four/server/migrations/012_explicit_grants.sql`
- [x] T003 Apply migration 014 to the Supabase database via the project's migration runner (check `connect-four/server/index.js` or `package.json` for the apply command), then verify: (a) column exists with `\d public.puzzles`; (b) the column default is `'single_move'` (covers FR-002 and FR-003); (c) no rows remain with `category = 'forced_win'`
- [x] T004 Expose `interaction_mode` as `interactionMode` in `GET /api/puzzles/:id` in `connect-four/server/index.js`: add `interaction_mode` to the Supabase SELECT and map it to camelCase in the response JSON — this field is consumed by both US1 (SequenceHandler) and US2 (PuzzlesPage routing)

**Checkpoint**: Foundation ready — `interaction_mode` column exists, all non-forced_win puzzles have `single_move`, all forced_win rows are deleted, and GET /api/puzzles/:id returns `interactionMode`.

---

## Phase 3: User Story 1 — Forced-Win Sequence Puzzle (P1) 🎯 MVP

**Goal**: Replace stored-sequence forced_win validation with live stateless per-move solver validation via a `CompletionStrategy` interface, with an AI response column returned for continuation.

**Independent Test**: Open a forced_win puzzle in the browser, play a series of forcing moves (each creating an immediate threat), observe the AI blocking each time, play the final double-threat move, and see a success screen. Then play a non-forcing move on a fresh puzzle and confirm the failure message appears.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create `connect-four/server/completionStrategies.js` with the `ForcedWinStrategy` class implementing `validateMove(position, col)`: (a) check no immediate threat for learner exists in `position` before the move using `countWinningThreats` from `predicates.js`; (b) after playing `col`, check at least one immediate threat exists; return `{ valid: true }` or `{ valid: false, reason: string }`. Use only bitboard logic — no solver calls. Also export a helper `getAiResponseCol(position)` that returns the single column where learner has an immediate threat (the forced block column); this is `aiCol` in continue responses.
- [x] T006 [P] [US1] Write integration tests in `connect-four/tests/integration/sequence_check.test.js` covering: (a) forcing move → `{ outcome: 'continue', aiCol: N }`, (b) non-forcing move → `{ outcome: 'fail', reason: '...' }`, (c) double-threat final move → `{ outcome: 'success' }`, (d) anonymous caller on forced_win puzzle → 403, (e) free-tier caller on forced_win puzzle → 403. Use real board positions from existing test fixtures where possible; create new positions as needed. Tests must call the HTTP endpoint, not the strategy class directly.
- [x] T007 [US1] Add `POST /api/puzzles/:id/sequence/move` endpoint to `connect-four/server/index.js`: (1) load puzzle by id (404 if not found); (2) validate `position` matches `^[1-7]{0,41}$` and `col` is integer 0–6 → 400 on failure; (3) validate puzzle has `interaction_mode === 'sequence'` → 400 otherwise; (4) validate column is not full → 400; (5) tier-gate: if `category === 'forced_win'` and caller lacks paid access → 403; (6) delegate to `ForcedWinStrategy.validateMove(position, col)` from `completionStrategies.js`; (7) if `valid === false` → return `{ outcome: 'fail', reason }`; (8) count learner's threats after the move — if ≥ 2 → `{ outcome: 'success' }`; else compute `aiCol` via `getAiResponseCol` and return `{ outcome: 'continue', aiCol }`. All logic is bitboard-only per R-001/R-002 in plan.md — no c4solver call. Note: no solver is called anywhere in this endpoint — the EC-01 solver-unavailable edge case from spec.md is unreachable on this path by design (R-001, R-002).
- [x] T008 [US1] Create `connect-four/src/components/SequenceHandler.jsx`: a React component that accepts `puzzle` (with `moveString`, `goalPrompt`) as props and manages the multi-move sequence flow. Internal state: `currentPosition` (starts at `puzzle.moveString` directly — it is already in 1-indexed format, no conversion needed), `status` (`idle | thinking | success | fail`), `failReason`. On each column click: the click handler receives the column as 0-indexed (0–6); send it as `col` (0-indexed) in the POST body. POST to `/api/puzzles/:id/sequence/move` with `{ position: currentPosition, col }`, then: on `continue` → append `(col + 1)` and `(aiCol + 1)` to `currentPosition` (converting both from 0-indexed to the 1-indexed format used by the position string), then re-render board; on `success` → show success UI; on `fail` → show failure message with `reason`. Reuse existing board and feedback panel styles from `PuzzlesPage.jsx`.

**Checkpoint**: User Story 1 is fully functional — forced_win sequence puzzles can be played through from first move to success/failure with live per-move validation.

---

## Phase 4: User Story 2 — Interaction Mode Routing (P2)

**Goal**: Wire the frontend to route puzzles by `interactionMode`, ensure all existing single-move categories are unaffected, and protect the `/check` endpoint from misuse on sequence-mode puzzles.

**Independent Test**: Load any `immediate_threat`, `forced_block`, or `double_threat` puzzle and confirm it behaves exactly as before (zero behaviour change). Load a `forced_win` puzzle and confirm `SequenceHandler` activates instead of the existing click-and-respond flow.

### Implementation for User Story 2

- [x] T009 [P] [US2] Guard `POST /api/puzzles/:id/check` in `connect-four/server/index.js`: after loading the puzzle, if `puzzle.interaction_mode === 'sequence'` → return 400 `{ "error": "Use /sequence/move for sequence-mode puzzles" }`. Existing single-move evaluation path is completely unchanged.
- [x] T010 [P] [US2] Update `POST /api/admin/candidates/:id/approve` in `connect-four/server/index.js`: when inserting the approved puzzle into `public.puzzles`, set `interaction_mode: category === 'forced_win' ? 'sequence' : 'single_move'`. No new request body fields needed — this is computed server-side per R-003 in plan.md.
- [x] T011 [US2] Update `connect-four/src/pages/PuzzlesPage.jsx`: after fetching a puzzle via `GET /api/puzzles/:id`, branch on `puzzle.interactionMode`: if `'sequence'` → render `<SequenceHandler puzzle={puzzle} />` imported from `../components/SequenceHandler.jsx`; otherwise → render existing single-move flow unchanged. Ensure the `interactionMode` field is forwarded from the fetch response to this branch.
- [x] T012 [P] [US2] Extend `connect-four/tests/predicates/predicates.test.js` with regression checks: for each existing single-move category fixture (`immediate_threat`, `forced_block`, `double_threat`), verify that `POST /api/puzzles/:id/check` still returns correct results and that the response does NOT include any `interaction_mode`-related error. Follow the existing fixture pattern in `connect-four/tests/predicates/fixtures/fixtures.json` and the same DB setup helper used by the current predicates tests; add at least one fixture per category to that file if not already present.

**Checkpoint**: All single-move categories work exactly as before; forced_win puzzles route to SequenceHandler; /check rejects sequence-mode puzzles with a clear error.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T013 [P] Run full test suite (`cd connect-four && npm test`) and confirm all existing tests pass with zero regressions
- [ ] T014 Manual golden path: start the dev server, open the app in browser, load a forced_win puzzle (requires paid tier or test credentials), play a correct forcing sequence through to success, then reload and play a non-forcing move to confirm the failure path. Confirm all other categories still work normally.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (T002–T004 complete) — T005 and T006 can start in parallel immediately after T004
- **US2 (Phase 4)**: Depends on Foundational (T002–T004 complete) — T009 and T010 can run in parallel; T011 depends on T008 (SequenceHandler must exist to import)
- **Polish (Phase 5)**: Depends on US1 and US2 both complete

### User Story Dependencies

- **US1 (P1)**: Requires Foundational complete. T005 (strategy) and T006 (tests) are independent and can run in parallel. T007 (endpoint) depends on T005. T008 (SequenceHandler) depends on T007.
- **US2 (P2)**: Requires Foundational complete. T009 and T010 are independent of US1 tasks. T011 (PuzzlesPage routing) depends on T008 (SequenceHandler) from US1.

### Within Each User Story

- US1: T005 ‖ T006 → T007 → T008
- US2: T009 ‖ T010 → T011 ‖ T012

---

## Parallel Example: User Story 1

```bash
# Start in parallel after Foundational (T002–T004 complete):
Task T005: Create completionStrategies.js (ForcedWinStrategy)
Task T006: Write integration tests in sequence_check.test.js

# After T005 completes:
Task T007: Add POST /api/puzzles/:id/sequence/move to index.js

# After T007 completes:
Task T008: Create SequenceHandler.jsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 2: Foundational (T001–T004)
2. Complete Phase 3: User Story 1 (T005–T008)
3. **STOP and VALIDATE**: Open forced_win puzzle in browser, play full sequence
4. Then proceed to US2 (Phase 4)

### Incremental Delivery

1. Foundational → DB schema updated, interactionMode in API
2. US1 complete → sequence move validation works, SequenceHandler renders
3. US2 complete → routing live, /check guarded, approve sets interaction_mode
4. Polish → all tests green, golden path verified

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- All sequence-move validation is bitboard-only — do NOT introduce any c4solver calls on the sequence move hot path (R-001, R-002)
- Migration 014 must follow the explicit GRANT pattern from migration 012 (see `connect-four/server/migrations/012_explicit_grants.sql`)
- `interaction_mode` is always computed server-side from `category` — curators never set it manually (R-003)
- The AI response column selection is a mechanical forced-block (play in the single threatened column) — do not add softmax, solver-guided selection, or any heuristic beyond what R-002 specifies (FR-009)
