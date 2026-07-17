---
description: "Task list for Puzzle Generation & Correctness (Epic 4 / Spec 044)"
---

# Tasks: Puzzle Generation & Correctness

**Input**: Design documents from `/specs/044-puzzle-generation-correctness/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/internal-function-contracts.md, research.md

**Tests**: Test tasks are included — the epic's Constitution Check (Principle III) and invariant I12
explicitly require every corrected category and every new T/V-rule operator to carry a positive AND
negative fixture validated through the production detector, not the motivating example alone.

**Organization**: Tasks are grouped by user story (US1–US5, matching spec.md's User Stories 1–5 /
polish_epic.md's US4.1–US4.5) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to spec.md's User Story 1–5
- File paths are exact; all paths are relative to the repo root unless given absolute

## Path Conventions

This is the existing web app: `connect-four/server/` (Express/Node), `connect-four/src/` (React),
`connect-four/tests/`, `docs/knowledge-base/`, `docs/architecture/`. No new top-level directories.

---

## Phase 1: Setup

**Purpose**: Confirm a clean baseline before any correctness change.

- [X] T001 Run `npm run test:fast` inside `connect-four/` and record the baseline pass/fail state before making any change in this feature, so later regressions are attributable to this feature's edits, not pre-existing failures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the one shared artifact multiple stories' regression checks depend on. Nothing
else is globally blocking — US1, US2, and US4 have no cross-story dependency and may start
immediately after this phase.

- [X] T002 [P] Read `.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/reference_verified_tactical_movestrings.md` and `docs/knowledge-base/README.md`, and consolidate the full list of existing solver-verified tactical movestrings (Allen V1–V5, Allis 9 rules, T4 Case A/B) into a new fixture file `connect-four/tests/fixtures/verifiedTacticalMovestrings.json` (or equivalent JS export) — this is the shared regression baseline used later by US3 (FR-015 case-space validation) and US5 (SC-006 regression check). Do not copy any movestring's verification status uncritically; note which entries are used as-is vs. still PENDING per research.md R4.

**Checkpoint**: Foundation ready — US1, US2, US4 can start immediately; US3 and US5 have their own internal gating tasks below.

---

## Phase 3: User Story 1 — Player-color constraints in generated puzzles (Priority: P1)

**Goal**: `immediate_threat` puzzles always cast the learner as green (P1); `forced_block` puzzles
always cast the learner as gray (P2); miscast candidates are rejected, not corrected after the fact;
all learner-facing color text says green/gray.

**Independent Test**: Generate a batch of `immediate_threat` and `forced_block` candidates and check,
for each, which color the learner is assigned vs. which the concept requires.

- [X] T003 [US1] Read `docs/architecture/server-conventions.md` and `connect-four/server/candidate-generator.js`'s `checkPredicate` fallthrough branch (~lines 442–456) plus `classifier.js`'s `getImmediateThreats`/`detectForcedBlock` to identify exactly which field encodes "player to move" / learner color for a generated candidate.
- [X] T004 [US1] In `connect-four/server/candidate-generator.js`, add a color-cast check for `immediate_threat` candidates: require the winning player to be P1 (green); reject (do not silently correct) any candidate that would cast the learner otherwise (FR-001, FR-003).
- [X] T005 [US1] In `connect-four/server/candidate-generator.js`, add a color-cast check for `forced_block` candidates: require the blocking player to be P2 (gray); reject any candidate that would cast the learner otherwise (FR-002, FR-003).
- [X] T006 [P] [US1] Audit learner-facing puzzle text for `immediate_threat`/`forced_block` (`connect-four/src/i18n/en.json`, any coach-phrase keys referencing player color) and correct any "red"/"yellow" wording to "green"/"gray" per the CLAUDE.md color table (FR-004). Confirm this rule is NOT applied anywhere in real-game/sparring blunder color logic (`blunderReasons.js`/`blunderTags.js` untouched) (FR-005).
- [X] T007 [US1] Add unit tests (extend `connect-four/tests/predicates/predicates.test.js` or a candidate-generator test file) with fixture boards sourced via `server/gameSampling.js`'s `playGame` (never hand-constructed, per CLAUDE.md): one board correctly cast per category, and one counterexample per category that must be rejected for wrong color-casting (I12 full case-space + counterexample).
- [X] T008 [US1] Run `npm run test:fast`; verify SC-001 (100% of a sampled batch of newly generated `immediate_threat` puzzles are green-cast, 100% of `forced_block` are gray-cast) and confirm FR-005 (no change to sparring/blunder color logic).

**Checkpoint**: US1 fully functional and testable independently — color-casting bug fixed for both categories.

---

## Phase 4: User Story 2 — No stray forced_block distraction in other puzzles (Priority: P1)

**Goal**: A non-`forced_block` candidate containing an unrelated, live (gravity-top) forced-block
situation is rejected unless that forced-block's blocking column IS the puzzle's own answer move.

**Independent Test**: Scan a batch of non-`forced_block` candidates for a forced-block situation;
confirm each is rejected unless the forced-block coincides with the answer move.

- [X] T009 [US2] Read `classifier.js`'s `getImmediateThreats` (~line 416) and `detectForcedBlock` (~line 1380) to confirm (per research.md R3) that both already only report gravity-top-reachable situations — no new gravity-top logic needs to be built; reuse these detectors directly.
- [X] T010 [US2] In `connect-four/server/candidate-generator.js`'s `checkPredicate` path, for any candidate board in a category other than `forced_block`: call `detectForcedBlock`/`getImmediateThreats` to detect a live forced-block; if its blocking column differs from the puzzle's already-computed answer column(s), reject the candidate (FR-006, FR-007, FR-009); if it matches the answer column, accept unchanged (FR-008).
- [X] T011 [P] [US2] Add unit tests: (a) a non-`forced_block` board with an unrelated live forced-block → rejected; (b) a board where the forced-block coincides with the answer move → accepted; (c) a non-`forced_block` board with a forced-block that is NOT gravity-top → not rejected (Assumptions/R3 exemption, Edge Case 2). Source boards via `playGame`/DB/KB per CLAUDE.md movestring rules — never hand-construct.
- [X] T012 [US2] Run `npm run test:fast`; verify SC-002 (0% of a sampled batch of newly generated non-`forced_block` puzzles contain a stray reachable forced-block whose column isn't the answer move).

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Any move that solves the puzzle is accepted (Priority: P1)

**Goal**: For `immediate_threat`, `forced_block`, and `double_threat` only, every column that
independently satisfies the category's condition is accepted at generation and scored correct at
solve time — on both the server (`evaluatePredicate`) and the client (`ChallengeScreen.jsx`) —
without weakening `undercut`'s avoid-the-pattern model or the unique-answer categories.

**Independent Test**: For each category, construct one multi-answer board (where possible) and one
single-answer board; confirm generator acceptance and solver/client verdicts match the documented
model for that category.

### Gating sub-tasks (MUST close before any other task in this phase is considered done)

- [X] T013 [US3] **GATING**: Run `rg 'evaluatePredicate'` across the entire `connect-four/` codebase (server, tests, src — not just the four sites listed in `contracts/internal-function-contracts.md`) and classify every hit as (a) "branches on `result === 'correct'` only — needs the `'tied'`-as-correct fix" or (b) "already handles `'tied'` / category-agnostic, no fix needed." **Done criterion (named artifact)**: emit a committed comment block at the top of `connect-four/server/predicates.js` (or an appended section in `research.md`) listing every caller found, each tagged `fix-needed` or `no-fix-needed`. This sweep is a hard gate — a single unreconciled caller reintroduces a "false wrong" verdict for a legitimately tied answer.
- [X] T014 [US3] Using a concrete `double_threat` board sourced via `server/gameSampling.js`'s `playGame` (never hand-constructed), empirically check whether a fork-creating column is always the single max-score column returned by `scoreMove` (`server/moveQualityScorer.js`). Find (or rule out, after a documented reasonable search) a counterexample board where a fork column is NOT the unique max-score column. Record the finding as a documented guard/sanity note (e.g. in `research.md` or a code comment near `scoreMove`) — **this is a record-only note, not a gate**: nothing in T017/T020 consumes `scoreMove`'s output (both use `evaluatePredicate` directly), so this task must not be read as implying a dependency that doesn't exist.
- [X] T015 [US3] **GATING**: Read the current `/api/evaluate-move` fetch call in `src/screens/ChallengeScreen.jsx` (~line 192–277) and its handler in `server/index.js` (~line 1543) to confirm empirically whether the request body already carries `category` and `movestring`. **Done criterion (named artifact)**: record the finding (body-shape confirmed present, or confirmed missing and must be added) in `research.md`'s Open Question section and in data-model.md's Open Question note, stating exactly which fields T021's client-side send must add, if any, before T020/T021 begin.

### Server-side fix

- [X] T016 [US3] In `connect-four/server/candidate-generator.js`'s `checkPredicate` (~lines 442–456), change the multi-solution branch from `passes: correctCols.length === 1` to `passes: correctCols.length >= 1` for `immediate_threat`/`forced_block`/`double_threat` only, ensuring the full `correctCols` array (every column where `evaluatePredicate(...).result === 'correct'`) is recorded, not only the first (FR-010, FR-011).
- [X] T017 [US3] Using T013's classification, update every caller found to branch on `result === 'correct'` only (starting from the floor list: `server/index.js` ~1646/~2317/~3101, `candidate-generator.js` ~452, plus every additional hit T013 found) so `'tied'` is also treated as accepted/correct for the three multi-solution categories (FR-012). This task is not done until T013's full list is reconciled.
- [X] T018 [P] [US3] Add regression tests (extend `connect-four/tests/predicates/predicates.test.js`) asserting `checkUndercutPredicate`'s avoid-the-pattern `correctCols` (killing column excluded) and `z_threat`/`overcut`/`claimeven`'s single-`correctCol` behavior are byte-for-byte unchanged, each with its own counterexample board run through the production detector (FR-013, FR-014, FR-015, I12).
- [X] T019 [P] [US3] Add positive-case tests: a `double_threat`/`immediate_threat`/`forced_block` board with 2+ objectively valid columns is accepted at generation with all columns recorded, and each valid column independently scores as accepted at solve time via `evaluatePredicate` (FR-010–012; Acceptance Scenarios 1–4 of US3). Source boards via `playGame`/KB, not hand-constructed.

### Client-side fix

- [X] T020 [US3] Extend `POST /api/evaluate-move` in `server/index.js` (~line 1543) in place (per data-model.md's resolved Q1/Q2 decision — do NOT switch to `/inline`): accept `category` and `movestring` in the request body (this task assumes T021 sends them; this task is server-only and does NOT include any client-side edit); for `category` in `{immediate_threat, forced_block, double_threat}`, add an `evaluatePredicate`-gated accepted-answer check and expose it as an additive response field (e.g. `accepted: bool`); recompute at solve time with no persistence and no schema change. Do NOT remove or repurpose `quality`, `badge`, `coachPhraseKey`, `coachMood`, `summaryLineKey`, or `patternTag` — grep each name's other callers first (FR-015a). Not done until T015 is resolved.
- [X] T021 [US3] In `src/screens/ChallengeScreen.jsx`, make two changes to the `/api/evaluate-move` call site and `handleColumnClick` (~line 192–277): **(1) FIRST, edit the fetch call's request body to SEND `category` and `movestring` for every submitted move** (per T015's finding — add these fields to the body if T015 confirmed they're currently missing; this is the client-side half of FR-015a and is not optional/parenthetical) — without this the server's new additive check in T020 never receives real traffic and silently no-ops; **(2) THEN update `handleColumnClick` to READ the new additive accepted-answer field from the response for the three multi-solution categories**, instead of relying solely on `data.quality`. Leave `SocraticScreen.jsx` untouched (confirmed non-applicable — no `category`/accepted-answer-set concept on `lesson.socratic`, research.md R2). Leave client scoring for `undercut`/`overcut`/`claimeven`/`z_threat` unchanged (FR-015a, FR-015b).
- [X] T022 [P] [US3] Add an integration-level test (or a documented manual QA pass via the `app-qa` skill) driving a multi-solution puzzle through `ChallengeScreen.jsx` end-to-end **via the real client request seam** (i.e. observe the actual outgoing `/api/evaluate-move` request body from the browser/test harness and confirm it contains `category`+`movestring`, not just a server-side assertion that the endpoint works when called directly): confirm a valid non-canonical column scores correct, and confirm the client and server never disagree on the same move (SC-003, Edge Case 5). This check exists specifically to catch an orphaned-send bug (T021 reading a field the client never actually requested).

### Documentation and closeout

- [X] T023 [US3] Document the corrected multi-solution acceptance rule (`checkPredicate`'s `>= 1` threshold + `'tied'`-as-correct across all reconciled callers) as a new convention note in `docs/architecture/server-conventions.md` (create the `predicates.js`/`candidate-generator.js` conventions subsection if it doesn't yet exist), per plan.md's Principle VIII checklist item (a).
- [X] T024 [US3] Run `npm run test:fast`; verify SC-003 (100% of valid columns for the three multi-solution categories scored correct, both server and Challenge screen) and SC-004 (undercut/claimeven/overcut/z_threat scoring unchanged for the fixed regression set from T002, both server and client).

**Checkpoint**: US1 + US2 + US3 all independently functional; the epic's single highest-value fix (US3) is closed with its gating sweep, empirical score-tie check, and client parity all confirmed.

---

## Phase 6: User Story 4 — Allen T1–T7 threat-simplification detectors (Priority: P2)

**Goal**: A pure, threat-set-in / `(player,col)`-or-`bool`-out detector for each of Allen's T1–T7
rules, defined strictly from its own KB `formal_predicate`, composable as an input-simplification
step feeding V1–V5 (Phase 7). No board-mutation, no board-reachability check, no candidate-pool
widening.

**Independent Test**: Run each detector against its KB worked example's threat set; confirm it
returns the documented `(player, col)`/`bool` result.

- [X] T025 [P] [US4] Read `docs/knowledge-base/allen-t1.md` through `allen-t7.md`'s `formal_predicate` blocks individually — do not assume a uniform return shape (per research.md R5, t4 returns `t4_applies(threats, col) -> bool`; others may return `(player, col) | None`) — and record each rule's exact function signature.
- [X] T026 [US4] Create `connect-four/server/allenTransforms.js` implementing one pure function per T1–T7 rule (threat-set-in, winner-or-bool-out), defined strictly from each rule's own KB `formal_predicate`; no board-mutation step, no board/gravity-reachability check applies (FR-016, FR-017).
- [X] T027 [US4] In `connect-four/server/allenTransforms.js`, add a composition helper that runs the applicable T1–T7 detector(s) over an externally-supplied threat set and returns the simplified threat set, for downstream consumption by the V1–V5 operators built in Phase 7 (FR-019).
- [X] T028 [P] [US4] Create `connect-four/tests/unit/allenTransforms.test.js` with one positive fixture per T1–T7 detector sourced from its own KB `worked_examples` threat set, and a negative fixture from `false_positives` where the entry has one (FR-018).
- [X] T030 [US4] Run `npm run test:fast`; verify every T1–T7 detector reproduces its own KB worked example on the first run (SC-005, T-rule portion).

**Checkpoint**: US1–US4 functional for the T-rule-detector deliverable only (Acceptance Scenarios 1–2). **US4's Acceptance Scenario 3 (the combined T-rule + V-rule pipeline) is NOT independently testable here and is not claimed complete at this checkpoint** — it requires US5's V1–V5 operators, which do not exist yet in this phase; it is verified in Phase 7 as T047. T1–T7 detectors are otherwise ready to feed US5's V-rule operators.

---

## Phase 7: User Story 5 — Verified Allen-V rule operators (Priority: P2)

**Goal**: A reusable operator for each of Allen's V1–V5 and both T4 variants (Case A, Case B), each
defined strictly from its own KB entry, implemented only after that specific rule's FR-020a
backfill/reconciliation is complete.

**Independent Test**: For V1/V2/V4/V5, confirm the KB entry's `worked_examples` is backfilled and
re-verified; then run each operator against its own KB worked example and confirm correct
classification; re-run against all existing verified fixtures to confirm no regressions.

### Prerequisite: FR-020a KB backfill / reconciliation (MUST complete per-rule before that rule's operator task)

- [X] T031 [P] [US5] Backfill `docs/knowledge-base/allen-v1.md`'s `worked_examples.movestring` from the memory-only verified movestring `44452556366` (`reference_verified_tactical_movestrings.md`), independently re-verified via `TOOLS/optimal_line.mjs` and `server/gameSampling.js`'s `playGame` before writing it into the KB entry (not copied uncritically) (FR-020a).
- [X] T032 [P] [US5] Backfill `docs/knowledge-base/allen-v2.md`'s `worked_examples.movestring` from memory (`727364`), independently re-verified via `optimal_line.mjs`/`playGame` (FR-020a).
- [X] T033 [P] [US5] Re-verify `docs/knowledge-base/allen-v3.md`'s existing `worked_examples.movestring` (`77273746`) via `optimal_line.mjs`/`playGame` — confirm it, do not skip verification just because it's already populated (FR-020a, research.md R4).
- [X] T034 [P] [US5] Backfill `docs/knowledge-base/allen-v4.md`'s `worked_examples.movestring` from memory (`2134124321317273`), independently re-verified via `optimal_line.mjs`/`playGame` (FR-020a).
- [X] T035 [P] [US5] Backfill `docs/knowledge-base/allen-v5.md`'s `worked_examples.movestring` from memory (`42354643256425346355663`), independently re-verified via `optimal_line.mjs`/`playGame` (FR-020a).
- [X] T036 [US5] Reconcile T4 Case B: independently re-run `optimal_line.mjs`/`playGame` against `docs/knowledge-base/allen-t4.md`'s existing Case B movestring (`33104201250010221152`, currently stamped `solver_verified: 2026-05-17`) to confirm the KB's claim per I12 — do not trust the existing stamp at face value. Once confirmed, correct `reference_verified_tactical_movestrings.md` (which stale-labels Case B "still PENDING") to match — the KB, not memory, is the correct source here (FR-020a, research.md R4).
- [X] T037 [US5] **GATE CHECK**: confirm T031–T036 (including the V3 re-verify) are all closed before starting any operator task below (T038–T044) — FR-021 forbids implementing a V1/V2/V4/V5/T4-Case-B operator before its own backfill/reconciliation step completes.

### Operator implementation

- [X] T038 [US5] Implement `v1_evaluator` in new module `connect-four/server/allenVRules.js`, defined strictly from the now-backfilled `docs/knowledge-base/allen-v1.md` (FR-020; depends on T031, T037).
- [X] T039 [US5] Implement `v2_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-v2.md` (depends on T032, T037).
- [X] T040 [US5] Implement `v3_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-v3.md` (depends on T033, T037).
- [X] T041 [US5] Implement `v4_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-v4.md` (depends on T034, T037).
- [X] T042 [US5] Implement `v5_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-v5.md` (depends on T035, T037).
- [X] T043 [P] [US5] Implement `t4_case_a_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-t4.md` Case A (already `solver_verified`, no gate — may run in parallel with the rest of this sub-phase).
- [X] T044 [US5] Implement `t4_case_b_evaluator` in `connect-four/server/allenVRules.js` from `docs/knowledge-base/allen-t4.md` Case B (depends on T036, T037).
- [X] T045 [P] [US5] Create `connect-four/tests/unit/allenVRules.test.js` with one fixture per operator (V1–V5, T4 Case A, T4 Case B), each sourced from its own (now-verified) KB `worked_examples` and first re-run through `optimal_line.mjs` directly — not trusted from KB prose alone (FR-022, I12).
- [X] T046 [US5] Add a regression test confirming every existing solver-verified tactical movestring (from the T002 baseline) still classifies identically after the T1–T7/V1–V5/T4 operators are added (FR-023, SC-006).
- [X] T047 [US5] **Relocated from Phase 6/US4** (formerly T029; the T029/T047 split is removed — this is the single combined-pipeline task, run only here, after the V-rule operators exist): add a combined-pipeline test case covering US4's Acceptance Scenario 3 / FR-019: feed a T-rule-simplified threat set (from `allenTransforms.js`, Phase 6) into a V-rule evaluator (`allenVRules.js`, T038–T044, now that they exist) for a board where both a T-rule and a V-rule apply, and confirm the documented combined outcome.
- [X] T048 [US5] Run `npm run test:fast`; verify SC-005 (every implemented T/V-rule operator reproduces its KB worked example on the first verification run, zero operators implemented outside the approved set: T1–T7, V1–V5, T4 Case A, T4 Case B).

**Checkpoint**: All five user stories independently functional; T1–T7/V1–V5/T4 operators fully KB-sourced and regression-clean.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation closeout and the one full-solver validation pass reserved for the end.

- [X] T049 [P] Add a short module-purpose note for `server/allenTransforms.js` and `server/allenVRules.js` to `docs/architecture/index-conventions.md` (or `server-conventions.md`), per plan.md's Principle VIII checklist item (b).
- [X] T050 Re-verify SC-001 through SC-006 end-to-end against a fresh sampled batch of generated puzzles (not the fixtures used during individual story development), to catch any cross-story interaction the per-story checks missed.
- [X] T051 Run the full `npm test` suite once (including `connect-four/tests/integration/candidate-generator.test.js`, real solver, ~400 calls/test) as the final, explicitly-invoked validation pass — never during iteration, per CLAUDE.md and memory `project_integration_test_slowness` (IPC deadlock risk).
- [X] T052 Update `polish_epic.md`'s Epic 4 section to mark US4.1–US4.5 complete once T001–T051 all pass.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 only. Blocks the regression-check tasks in US3 (T018, T024) and US5 (T046) — but not US1/US2/US4's core implementation work, which may proceed in parallel with T002.
- **US1 (Phase 3)** and **US2 (Phase 4)**: No dependency on each other or on US3/US4/US5 — both may run in parallel with each other and with Phase 6 (US4).
- **US3 (Phase 5)**: Independent of US1/US2/US4/US5's implementation, but its own gating sub-tasks (T013–T015) must close before its server fix (T016–T017) and client fix (T020–T021) are considered done.
- **US4 (Phase 6)**: No dependency on US1/US2/US3/US5's KB backfill (T4 Case B being the one T4 sub-case reconciled in US5, not shared with T1–T7) for its T-rule-detector deliverable (Acceptance Scenarios 1–2). Its Acceptance Scenario 3 (combined T-rule + V-rule pipeline) is a hard dependency on Phase 7's V-rule operators and is NOT independently testable within Phase 6 — it is verified only in Phase 7 as T047 (the former T029/T047 split is removed; there is one combined-pipeline task, and it lives entirely in Phase 7).
- **US5 (Phase 7)**: Its backfill sub-phase (T031–T037) has no code dependency on US1–US4 and may run in parallel with them; its operator sub-phase (T038–T044) is gated per-rule on the matching backfill task (see per-task "depends on").
- **Polish (Phase 8)**: Depends on all of Phases 3–7 being complete.

### Critical gates (do not skip)

1. T013 (exhaustive `evaluatePredicate` caller sweep) MUST close before T017/T020 are considered done.
2. T015 (confirm `/api/evaluate-move` request body shape) MUST be recorded before T020/T021 begin.
3. T037 (backfill/reconciliation gate) MUST close before T038–T042, T044 begin (T043, T4 Case A, is exempt — already verified).

Note: T014 (double_threat score-tie ≠ fork-tie empirical check) is a documented guard/sanity note only, **not a gate** — nothing in T017/T020 consumes `scoreMove`'s output (both use `evaluatePredicate` directly), so T014 is intentionally excluded from this gate list.

### Suggested MVP scope

User Story 1 (Phase 3) alone is the smallest independently shippable increment (fixes the color-casting
bug). User Stories 1–3 together (Phases 3–5) deliver the epic's full player-facing correctness fix and
are P1; User Stories 4–5 (Phases 6–7) are P2 net-new pipeline tooling with no player-facing bug to fix,
and can ship after or in parallel with 1–3.

## Parallel Execution Examples

- Phase 3 (US1): T006 can run in parallel with T004/T005 (different files: i18n vs. candidate-generator.js).
- Phase 5 (US3): T013, T014, T015 (the three gating checks) can run in parallel with each other — they touch different files/questions. T018 and T019 (regression vs. positive-case tests) can run in parallel once T016/T017 land.
- Phase 6 (US4): T025 (read all 7 KB entries) and T028 (test file scaffolding) can start in parallel; T028's fixtures depend on T026's implementation existing to import against, so only the scaffolding, not the assertions, is parallel.
- Phase 7 (US5): T031–T035 (the four V-rule backfills) are fully parallel — independent KB files, independent movestrings. T043 (T4 Case A) can run in parallel with the entire backfill sub-phase since it has no gate.
