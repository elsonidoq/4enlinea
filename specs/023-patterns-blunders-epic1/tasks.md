# Tasks: Patterns → Blunders Epic 1 — Schema + Core Algorithm

**Input**: `specs/023-patterns-blunders-epic1/` — spec.md, plan.md, data-model.md, research.md  
**Branch**: `101-new-design`  
**Date**: 2026-06-06

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[USn]**: User story this task belongs to (US1–US4 map to spec.md user stories)
- Setup/Foundational phases: NO story label
- Exact file paths required in all implementation task descriptions

## User Story Map

| Label | Story | Priority |
|-------|-------|----------|
| US1 | Blunder Gets a Named Tag Instead of `unknown` | P1 |
| US2 | `tagBlunder` Resolves on Solver Failure Without Throwing | P1 |
| US3 | DB Rejects `unknown` Tag; Accepts All New Tags | P2 |
| US4 | `classifyPattern` Evaluates Any Player's Patterns at Any Position | P2 |

> **Implementation note**: US3 (migrations) and US4 (classifyPattern) are P2 by product priority but are
> hard prerequisites for US1/US2 (P1). Implementation order is US3 → US4 → US1+US2. Story labels reflect
> _which story the task delivers_, not the execution order.

---

## Phase 1: Pre-Deploy Audits (Foundational Gate)

**Purpose**: Verify and apply the audit findings from `research.md` before any migration or code changes.
These tasks are a HARD GATE — no migration may run, no detector may be modified, until all patches below are applied.

**Context**: Audit findings are already recorded in `research.md` §3–§6. The tasks below confirm those findings
are still current and apply the required patches.

- [x] T001 Re-run `rg "'unknown'" connect-four/server/scripts/ connect-four/server/index.js` from repo root and confirm the four callsites documented in `research.md §3` are still the only ones (two in `import_papergames_blunders.mjs`, two in `reprocess_blunders.mjs`); record confirmation in a comment in `research.md` under §3

- [x] T002 Patch `connect-four/server/scripts/import_papergames_blunders.mjs`: (1) change `let patternTag = 'unknown'` → `let patternTag = 'suboptimal_move'`; (2) change `VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'unknown'` → `VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'suboptimal_move'`; (3) remove `'unknown'` from the `VALID_PATTERN_CATEGORIES` set and add `'suboptimal_move'`

- [x] T003 Apply the same three patches to `connect-four/server/scripts/reprocess_blunders.mjs` (identical callsite pattern as T002)

- [x] T004 Re-run `rg "'forbidden_columns'" connect-four/server/scripts/ connect-four/server/index.js` and confirm no callsite inserts `forbidden_columns` as a new blunder tag (all callsites are list entries or routing only, per `research.md §4`); no patch required — record confirmation comment in `research.md` under §4

- [x] T005 Re-run `rg 'DETECTOR_REGISTRY' connect-four/server/` and confirm registry still lives only in `explainSimulate.js` (not `classifier.js`); confirm the 13-detector table in `research.md §6` is current — each detector listed still exists in `connect-four/server/classifier.js` with the same name; record confirmation comment in `research.md` under §6

**Checkpoint**: All patches applied; audit findings confirmed current. Migrations may now be written and applied.

---

## Phase 2: DB Migrations (US3 — DB Rejects `unknown` Tag)

**Purpose**: Deliver the three schema changes to the `blunders` table. Sequencing is strict: 032 → 033 → 034.

**Goal**: DB-level enforcement that `unknown` is rejected and the new tags are accepted.

**Independent Test**: After applying migrations, attempt `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` and observe a CHECK constraint violation; then attempt with `'drawing_move'` and observe success.

- [x] T006 [P] [US3] Create `connect-four/server/migrations/032_blunders_new_tags.sql` with the exact SQL from `data-model.md` §DB Changes / Migration 032: opens with `TRUNCATE public.blunders;`, then `DROP CONSTRAINT IF EXISTS blunders_pattern_category_check`, then `ADD CONSTRAINT blunders_pattern_category_check CHECK (pattern_category IN ('immediate_threat','forced_block','forced_win','double_threat','undercut','overcut','figure_7','j_shape','z_threat','odd_even_threat','claimeven','claimodd','drawing_move','suboptimal_move','forbidden_columns'))` — `'unknown'` excluded, `'forbidden_columns'` retained

- [x] T007 [P] [US3] Create `connect-four/server/migrations/033_blunders_reason.sql` with: `ALTER TABLE public.blunders ADD COLUMN reason TEXT;` — nullable, no index, no CHECK constraint

- [x] T008 [P] [US3] Create `connect-four/server/migrations/034_blunders_direction.sql` with: `ALTER TABLE public.blunders ADD COLUMN direction TEXT;` — nullable, no CHECK constraint (values `missed_own`, `enabled_opponent`, `defensive_miss` are known but column is deliberately unconstrained for forward compatibility); add a SQL comment to the file explaining this decision

- [x] T009 [US3] Apply migrations 032 → 033 → 034 in strict sequence to the dev DB via the Supabase SQL editor or `psql`. Verify each succeeds before applying the next. Do not apply out of order.

**Checkpoint**: Three migration files created and applied. `blunders` table has updated constraint and two new nullable columns.

---

## Phase 3: Detector Perspective Retrofit (US4 prerequisite)

**Purpose**: Add explicit `perspective` parameter (with `board.currentPlayer` default) to all 13 detectors in
`connect-four/server/classifier.js`. Each task is atomic: (a) read detector body and answer "does this test
current-state or one-move-away?", (b) fix if one-move-away logic exists, (c) add parameter.

**CRITICAL — static-position semantics**: Detectors called from `classifyPattern` MUST test conditions on the
board as-is. Any `withMove(col)` or future-position simulation that is perspective-sensitive MUST be corrected
before the perspective parameter is added. This sanity check is non-optional for every detector.

**Retrofit pattern**: `perspective = board.currentPlayer` as the last parameter. Replace all internal
`board.currentPlayer` / `board.opponent` references (where perspective-sensitive) with `perspective` and
`3 - perspective` respectively.

**Score-consuming detectors — additional two-step requirement (FR-033)**: Five detectors (`detectForcedWin`,
`detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat`) read raw solver scores
which are always signed relative to the player to move, not `perspective`. Their tasks (T012–T016) each
require the following additional implementation step beyond the standard perspective substitution:
- When `perspective === board.currentPlayer`: apply existing score logic (correctly signed).
- When `perspective !== board.currentPlayer`: iterate over all playable columns `c` for the current player,
  call this detector recursively on `new Board(board.movestring + c)` with fresh scores from
  `await solver.query(board.movestring + c)` and the same `perspective`, return `true` iff ALL columns return
  `true`. The recursion always bottoms out in one step (perspective becomes the current player).
- Add `solver = null` as an additional parameter to each of these five detectors to enable the recursive step.

> All tasks in this phase modify the same file (`connect-four/server/classifier.js`). Tasks MUST be applied
> sequentially — they cannot be parallelised.

- [x] T010 [US4] Retrofit `detectDoubleThreat` in `connect-four/server/classifier.js` — FIRST because the handoff identified it as the highest-risk detector: explicitly verify whether it calls `reachableThreats` on the board as-is or simulates moves via `withMove`; if `withMove` is used for perspective-sensitive logic, correct to evaluate existing threats; then add `perspective = board.currentPlayer` parameter and replace `board.currentPlayer` in `reachableThreats` calls with `perspective`

- [x] T010 [US4] Retrofit `detectImmediateThreat` in `connect-four/server/classifier.js`: sanity-check body (current-state vs one-move-away), add `perspective = board.currentPlayer`, change `board.immediateThreats(board.currentPlayer)` → `board.immediateThreats(perspective)`

- [x] T010 [US4] Retrofit `detectForcedBlock` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer` and `solver = null` as parameters, replace `board.currentPlayer` / `board.opponent` with `perspective` / `3 - perspective` where perspective-sensitive; **score-consuming — required two-step**: (a) when `perspective === board.currentPlayer`, apply existing score logic; (b) when `perspective !== board.currentPlayer`, iterate over all playable columns `c`, call this detector recursively on `new Board(board.movestring + c)` with `await solver.query(board.movestring + c)` as fresh scores and the same `perspective`, return `true` iff ALL playable columns return `true`

- [x] T010 [US4] Retrofit `detectForcedWin` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer` and `solver = null` as parameters, replace `board.currentPlayer` references with `perspective`; **score-consuming — required two-step**: (a) when `perspective === board.currentPlayer`, apply existing score logic; (b) when `perspective !== board.currentPlayer`, iterate over all playable columns `c`, call this detector recursively on `new Board(board.movestring + c)` with `await solver.query(board.movestring + c)` as fresh scores and the same `perspective`, return `true` iff ALL playable columns return `true`

- [x] T010 [US4] Retrofit `detectForbiddenColumns` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer` and `solver = null` as parameters, replace `board.currentPlayer` / `board.opponent` with `perspective` / `3 - perspective`; **score-consuming — required two-step**: (a) when `perspective === board.currentPlayer`, apply existing score logic; (b) when `perspective !== board.currentPlayer`, iterate over all playable columns `c`, call this detector recursively on `new Board(board.movestring + c)` with `await solver.query(board.movestring + c)` as fresh scores and the same `perspective`, return `true` iff ALL playable columns return `true`

- [x] T010 [US4] Retrofit `detectZThreat` in `connect-four/server/classifier.js`: sanity-check body (verify `checkWin` call uses current player correctly), add `perspective = board.currentPlayer` and `solver = null` as parameters, replace `board.currentPlayer` with `perspective`; **score-consuming — required two-step**: (a) when `perspective === board.currentPlayer`, apply existing score logic; (b) when `perspective !== board.currentPlayer`, iterate over all playable columns `c`, call this detector recursively on `new Board(board.movestring + c)` with `await solver.query(board.movestring + c)` as fresh scores and the same `perspective`, return `true` iff ALL playable columns return `true`

- [x] T010 [US4] Retrofit `detectOddEvenThreat` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer` and `solver = null` as parameters, change `board.currentPlayer !== 1` guard → `perspective !== 1` (Red-only guard); **score-consuming — required two-step**: (a) when `perspective === board.currentPlayer`, apply existing score logic; (b) when `perspective !== board.currentPlayer`, iterate over all playable columns `c`, call this detector recursively on `new Board(board.movestring + c)` with `await solver.query(board.movestring + c)` as fresh scores and the same `perspective`, return `true` iff ALL playable columns return `true`

- [x] T010 [US4] Retrofit `detectUndercut` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer`, replace `board.currentPlayer` / `board.opponent` with `perspective` / `3 - perspective`

- [x] T010 [US4] Retrofit `detectOvercut` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer`, replace `board.currentPlayer` / `board.opponent` with `perspective` / `3 - perspective`

- [x] T010 [US4] Retrofit `detectFigure7` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer`, replace `board.currentPlayer` references with `perspective`

- [x] T020 [US4] Retrofit `detectJShape` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer`, replace `board.currentPlayer` references with `perspective`

- [x] T020 [US4] Retrofit `detectClaimodd` in `connect-four/server/classifier.js`: sanity-check body, add `perspective = board.currentPlayer`, change `board.currentPlayer !== 1` guard → `perspective !== 1` (Red-only guard — claimodd is Red-only)

- [x] T020 [US4] Retrofit `detectClaimeven` in `connect-four/server/classifier.js`: sanity-check body (this detector uses `board.movestring.length % 2 === 0` as Yellow-turn guard), add `perspective = board.currentPlayer`, change `board.movestring.length % 2 === 0` guard → `perspective !== 2` (claimeven is Yellow-only; `!== 2` means not Yellow); solver handle parameter stays unchanged

**Checkpoint**: All 13 detectors accept an explicit `perspective` parameter with default `board.currentPlayer`. Existing callers (which pass no `perspective` argument) are behaviorally unchanged.

---

## Phase 4: Regression Gate

**Purpose**: Hard gate between detector retrofit and `classifyPattern` implementation. All existing tests must pass before proceeding to Phase 5. If any test fails, diagnose and fix the offending detector retrofit before continuing.

- [x] T023 Run `npm run test:fast` from `connect-four/` and confirm all tests pass; if any test fails, fix the offending detector retrofit in `connect-four/server/classifier.js` before proceeding; do not continue to Phase 5 until the full test suite is green

**Checkpoint**: Regression gate passed. `classifyPattern` implementation may now begin.

---

## Phase 5: `classifyPattern` Implementation (US4 — classifyPattern Evaluates Any Player's Patterns)

**Purpose**: New exported function in `connect-four/server/classifier.js` that evaluates all 13 pattern detectors for an explicit `perspective` player at any board position.

**Goal**: `classifyPattern(ms, perspective, solver)` returns `Promise<Set<string>>` — the full pattern set for `perspective` at position `ms`.

**Independent Test**: Call `classifyPattern` with a known position where Yellow (player 2) holds `claimeven` using `perspective = 2` and a real solver handle; assert `'claimeven'` is in the returned Set. Call again with `perspective = 1`; assert `'claimeven'` is NOT in the returned Set.

- [x] T020 [US4] Implement and export `classifyPattern(ms, perspective, solver)` in `connect-four/server/classifier.js` using the algorithm from `plan.md §Phase 3`: construct `new Board(ms)`, call `solver.query(ms)` once for scores, then call all 13 detectors (inline list — do NOT import `DETECTOR_REGISTRY` from `explainSimulate.js` to avoid circular dependency) with explicit `perspective`, await all via `Promise.all`, accumulate matched tags into a `Set<string>`, return the set; add an inline comment naming `explainSimulate.js`'s `DETECTOR_REGISTRY` as the list that must be kept in sync; ensure the set never contains `'unknown'`; pass `solver` as the fourth argument to the five score-consuming detectors (`detectForcedBlock`, `detectForcedWin`, `detectForbiddenColumns`, `detectZThreat`, `detectOddEvenThreat`) so they can issue recursive solver queries when `perspective !== board.currentPlayer` (per FR-033)

**Checkpoint**: `classifyPattern` exported and callable. `tagBlunder` implementation may now begin.

---

## Phase 6: `tagBlunder` Implementation (US1 + US2)

**Purpose**: New exported function in `connect-four/server/classifier.js` implementing the 5-step priority cascade. Never throws.

**Goal (US1)**: Returns `{ tag, direction, reason }` naming the tactical pattern, never `unknown`.  
**Goal (US2)**: Resolves (does not reject) even when the solver throws or the position is degenerate.

**Independent Test (US1)**: Call `tagBlunder` with a known forced-win position and assert the returned tag is the expected pattern with the correct direction and reason string.

**Independent Test (US2)**: Inject a mock solver that always rejects; call `tagBlunder`; assert it resolves (not rejects) with `tag: 'suboptimal_move'` and `reason` beginning with `"solver error:"`.

- [x] T020 [US1] [US2] Implement and export `tagBlunder(moves, playedCol, correctCol, solver)` in `connect-four/server/classifier.js` following the algorithm from `plan.md §Phase 4`:
  - Wrap ALL logic in a single `try/catch`; the catch resolves with `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <err.message>' }`
  - Inside try: first check degenerate position using `board.hasWon(1) || board.hasWon(2)` and `moves.length >= 42` — BEFORE any solver calls — resolve with `reason: 'degenerate position: <description>'` if detected
  - Derive `blunderer = moves.length % 2 === 0 ? 1 : 2`; `opponent = 3 - blunderer`
  - **Do NOT compute `afterBlunderMs`/`afterCorrectMs` upfront.** Instead: run exactly 3 `classifyPattern` calls (`pMovesBlunderer`, `pAfterPlayedBlunderer`, `pAfterPlayedOpponent`) via `Promise.all` and check Steps 1–3 first; only if all three steps fail to return, then compute `afterBlunderMs` and `afterCorrectMs` via two sequential `bm()` calls and run the remaining 4 `classifyPattern` calls for Step 4. Rationale: positions reached via winning moves produce meaningless solver scores; the early steps catch these cases, and the lazy computation avoids issuing solver queries on them.
  - Implement all 5 cascade steps exactly as specified in `plan.md §Phase 4`: Step 1 (defensive miss), Step 2 (enabled immediate 1-ply), Step 3 (MISSED_OWN_PRIORITY array), Step 4 (STEP4_PRIORITY array-of-objects including `undercut` using `enabled_self` predicate at its correct priority position, NOT in a separate post-loop check), Step 5 (score-based fallbacks using `Math.max(...await solver.query(ms))`)
  - Add inline comment on the `undercut` entry in STEP4_PRIORITY explaining it uses `pAfterBlunderBlunderer/pAfterCorrectBlunderer` (enabled_self) while all other entries use opponent sets — per FR-024/FR-025
  - `solver.score()` does NOT exist; derive score as `Math.max(...await solver.query(ms))` — per `research.md §2`

**Checkpoint**: `tagBlunder` exported and callable. Test implementation may now begin.

---

## Phase 7: Automated Tests (T-001 to T-006)

**Purpose**: Test file covering T-001 through T-006 from spec.md. All tests are automated and run via `npm run test:fast`.

**Critical**: Wire the test file into `package.json` BEFORE running. The wiring task is non-skippable.

> Note: This phase requires sourcing real movestrings from DB/KB — never invent them. Source options per spec.md:
> `connect-four/tests/classifier/fixtures/fixtures.json`, knowledge base entries, `puzzles` table in DB,
> or git history.

- [x] T026 Query the DB or read `connect-four/tests/classifier/fixtures/fixtures.json` and the knowledge base to identify three concrete movestrings: one where the blunderer missed a `missed_own` pattern, one where the blunderer enabled an opponent pattern (`enabled_opponent`), and one where `forced_block` was present pre-move (`defensive_miss`); also identify a position where both `missed_own` and `enabled_opponent` would fire (for T-002); document the chosen movestrings and their source in a comment block at the top of `connect-four/tests/blunder/tagBlunder.test.js`

- [x] T027 [US1] Create `connect-four/tests/blunder/tagBlunder.test.js` and write T-001: three test cases (one per priority-cascade direction) using the movestrings sourced in T026, asserting the correct `{ tag, direction }` and that `reason` contains the expected prefix string (`'matched missed_own: <tag>'`, `'matched enabled_opponent: <tag>'`, `'matched defensive_miss: forced_block'`); use the real solver singleton for these assertions

- [x] T028 [US1] In `connect-four/tests/blunder/tagBlunder.test.js` write T-002: a position where both `missed_own` and `enabled_opponent` would fire; assert the result tag comes from the `missed_own` path (step 3 precedes step 4 in the cascade); use the movestring identified in T026

- [x] T029 [US2] In `connect-four/tests/blunder/tagBlunder.test.js` write T-003: inject a mock solver passed as the 4th argument to `tagBlunder` that rejects every call; call `tagBlunder`; assert it resolves (does not reject) with `tag: 'suboptimal_move'`, `direction: 'missed_own'`, and `reason` starting with `"solver error:"`; assert it does NOT throw

- [x] T030 [US4] In `connect-four/tests/blunder/tagBlunder.test.js` write T-004: call `classifyPattern(ms, 2, solver)` on a position where `odd_even_threat` fires for Red; assert `'odd_even_threat'` is NOT in the returned Set; do the same for `'claimodd'`; these guard against a detector perspective bug

- [x] T031 [US4] In `connect-four/tests/blunder/tagBlunder.test.js` write T-005: call `classifyPattern(ms, 1, solver)` on a position where `claimeven` fires for Yellow; assert `'claimeven'` is NOT in the returned Set; guards against a claimeven perspective bug

- [x] T032 [US4] In `connect-four/tests/blunder/tagBlunder.test.js` write T-006: import `classify` from `connect-four/server/classifier.js` and call it with the same arguments used in existing `tests/classifier/classifier.test.js` fixtures; assert return values are identical before and after the perspective retrofit; this is a regression guard for the `classify()` puzzle-generation path

- [x] T033 Wire `tests/blunder/tagBlunder.test.js` into `connect-four/package.json`: add the path to BOTH the `test` script array AND the `test:fast` script array; the path must match exactly how other test files are listed (e.g., `tests/blunder/tagBlunder.test.js`); this task is non-skippable — without it, T-001 through T-006 will never run in CI

- [x] T034 Run `npm run test:fast` from `connect-four/` and verify all T-001 through T-006 pass; if any test fails, fix the offending implementation or test before marking this task done

**Checkpoint**: All 6 automated tests pass under `npm run test:fast`.

---

## Phase 8: Manual DB Verification (T-007 to T-008)

**Purpose**: The automated test suite has no live DB harness. These 5 assertions must be verified manually against the dev DB after migrations 032–034 are applied.

- [x] T035 [US3] Run the following 5-item checklist against the dev DB via `psql` or the Supabase SQL editor (migrations 032–034 must already be applied). Before running, execute `SELECT id FROM auth.users LIMIT 1;` and substitute the returned UUID for `<USER_UUID>` in every statement below. Each statement uses a distinct `board_state` value to avoid hitting the unique index on `(user_id, board_state, move_played)`:
  1. Expect CHECK constraint violation (`unknown` is excluded):
     ```sql
     INSERT INTO blunders (user_id, board_state, move_played, correct_move, severity, pattern_category)
     VALUES ('<USER_UUID>', 'chk_board_1', '3', '4', 0.5, 'unknown');
     ```
  2. Expect success (`drawing_move` is a new valid tag):
     ```sql
     INSERT INTO blunders (user_id, board_state, move_played, correct_move, severity, pattern_category)
     VALUES ('<USER_UUID>', 'chk_board_2', '3', '4', 0.5, 'drawing_move');
     ```
  3. Expect success (`forbidden_columns` is legacy-tolerated):
     ```sql
     INSERT INTO blunders (user_id, board_state, move_played, correct_move, severity, pattern_category)
     VALUES ('<USER_UUID>', 'chk_board_3', '3', '4', 0.5, 'forbidden_columns');
     ```
  4. Expect success (non-null `reason` and `direction`):
     ```sql
     INSERT INTO blunders (user_id, board_state, move_played, correct_move, severity, pattern_category, reason, direction)
     VALUES ('<USER_UUID>', 'chk_board_4', '3', '4', 0.5, 'suboptimal_move', 'no pattern detected', 'missed_own');
     ```
  5. Expect success (`reason` and `direction` are nullable):
     ```sql
     INSERT INTO blunders (user_id, board_state, move_played, correct_move, severity, pattern_category, reason, direction)
     VALUES ('<USER_UUID>', 'chk_board_5', '3', '4', 0.5, 'suboptimal_move', NULL, NULL);
     ```

- [x] T036 [US3] Record the pass/fail result of each of the 5 checklist items from T035 as a SQL comment block at the bottom of `connect-four/server/migrations/034_blunders_direction.sql`; include the date and the actual error message for item 1 (CHECK violation text confirms the constraint name and excluded value)

**Checkpoint**: Manual DB verification complete and documented in the migration file.

---

## Phase 9: Architecture Documentation

**Purpose**: Update architecture docs to reflect the new `perspective` parameter convention and the `blunders` table schema changes. Required by Constitution Principle VIII.

- [x] T037 [P] Update `docs/architecture/server-conventions.md`: add a section describing the detector `perspective` parameter convention (default = `board.currentPlayer`, explicit perspective required when calling from `classifyPattern`), the `classifyPattern(ms, perspective, solver)` / `tagBlunder(moves, playedCol, correctCol, solver)` API contracts, and the rule that `classifyPattern` must not import `DETECTOR_REGISTRY` from `explainSimulate.js` (circular dependency risk)

- [x] T038 [P] Update `docs/architecture/db-schema.md`: update the `blunders` table entry to reflect (1) the new CHECK constraint (listing all valid `pattern_category` values, noting `unknown` is excluded and `forbidden_columns` is legacy-tolerated), (2) the new nullable `reason TEXT` column, and (3) the new nullable `direction TEXT` column with its three known values and the rationale for no CHECK constraint

**Checkpoint**: Architecture docs updated. Epic 1 is complete.

---

## Dependencies & Execution Order

### Phase Dependencies (strict)

```
Phase 1 (Pre-Deploy Audits) ─────────────────────────────────────────────────┐
  ↓ T001-T005 done                                                             │
Phase 2 (DB Migrations) — T006/T007/T008 can be written in parallel,          │
  but T009 (apply) must follow all three; T009 must follow T002/T003 (patches) │
  ↓ T009 done                                                                   │
Phase 3 (Detector Retrofit) — 13 tasks sequential (same file)                  │
  ↓ T022 done                                                                   │
Phase 4 (Regression Gate) — T023; blocks Phase 5 on failure                    │
  ↓ T023 passes                                                                 │
Phase 5 (classifyPattern) — T024                                                │
  ↓ T024 done                                                                   │
Phase 6 (tagBlunder) — T025                                                     │
  ↓ T025 done                                                                   │
Phase 7 (Automated Tests) — T026 → T027-T032 sequential → T033 → T034          │
  ↓ T034 passes                                                                 │
Phase 8 (Manual DB Verification) — T035 → T036 (needs Phase 2 complete)        │
Phase 9 (Docs) — T037/T038 in parallel; can start after Phase 6                │
```

### Within-Phase Ordering

- **Phase 1**: T001 (verify) → T002/T003 (patch, parallelizable) → T004/T005 (verify, parallelizable)
- **Phase 2**: T006/T007/T008 can be created in parallel; T009 must follow all three
- **Phase 3**: T010 first (detectDoubleThreat, highest risk); T011–T022 sequentially (same file)
- **Phase 7**: T026 (source movestrings) → T027–T032 (write tests) → T033 (wire package.json) → T034 (run)
- **Phase 8**: Can start as soon as Phase 2 migrations are applied (T009), independently of Phases 3–7
- **Phase 9**: Can start in parallel with Phase 7/8 after Phase 6 (tagBlunder) is done

### User Story Dependencies

- **US3 (migrations)**: Depends only on Phase 1 patches (T002/T003)
- **US4 (classifyPattern)**: Depends on Phase 3 (detector retrofit) → Phase 4 (regression gate)
- **US1 + US2 (tagBlunder)**: Depends on US4 (classifyPattern must be complete)

---

## Parallel Opportunities

```bash
# Phase 1: Audit verification can partially overlap
Task T001: verify 'unknown' callsites
Task T004: verify 'forbidden_columns' callsites   # after T001 is done
Task T005: verify DETECTOR_REGISTRY               # after T001 is done

# Phase 2: Migration file creation
Task T006: create 032_blunders_new_tags.sql
Task T007: create 033_blunders_reason.sql
Task T008: create 034_blunders_direction.sql

# Phase 9: Documentation
Task T037: update server-conventions.md
Task T038: update db-schema.md
```

---

## Implementation Strategy

### MVP Scope (US1 + US2 — the P1 stories)

1. Phase 1: Pre-Deploy Audits (gates all other work)
2. Phase 2: DB Migrations (US3 — required by Epic 2 wiring)
3. Phase 3: Detector Retrofit (prerequisite for classifyPattern)
4. Phase 4: Regression Gate (must pass before continuing)
5. Phase 5: `classifyPattern` (prerequisite for tagBlunder)
6. Phase 6: `tagBlunder` (US1 + US2 delivered here)
7. Phase 7: Automated Tests (validates delivery)
8. Phase 8 + 9: Verification and docs

All phases are required — there is no subset that delivers a testable increment earlier.

### Notes

- Tasks marked [P] are different files with no shared state — safe to parallelise
- All Phase 3 tasks (T010–T022) are in the same file and must be sequential
- T023 (regression gate) is a hard gate; do not skip or defer it
- T033 (package.json wiring) is easy to forget but blocks CI from ever running the new tests
- T036 (comment in migration file) is the only place T-007/T-008 results are recorded
- `tagBlunder` in T025: the `undercut` entry in `STEP4_PRIORITY` uses `enabled_self` (blunderer's after-positions), not `enabled_opp` — this asymmetry is intentional (FR-024) and MUST have an inline comment
- The degenerate check in T025 must be INSIDE the outer try/catch (so `new Board(moves)` throwing is caught) but BEFORE any `solver.query` calls (so the degenerate vs solver-error reason distinction is preserved)
