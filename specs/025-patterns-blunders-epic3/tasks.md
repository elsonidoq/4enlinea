---
description: "Task list for Patterns → Blunders Epic 3 — Coach Explanation Rebuild"
---

# Tasks: Patterns → Blunders Epic 3 — Coach Explanation Rebuild

**Input**: Design documents from `specs/025-patterns-blunders-epic3/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Explicitly required by spec (FR-T01 through FR-T06). Test tasks are included in the phases where their implementations live.

**Organization**: Phases follow implementation dependency order. US4 (blunderReasons snapshot test) appears in Phase 3 — before US1/US2 — because `blunderReasons.js` is a prerequisite for the prompt builder. The dependency note in the Dependencies section explains the priority inversion.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to ([US1]–[US5])
- Exact file paths included in all descriptions

---

## Phase 1: Pre-work (Audits + Migration + New Module)

**Purpose**: Complete all pre-implementation audits required by spec before touching any existing code. Create the new `blunderReasons.js` module (fully specified in spec, no existing code dependency) and the DB migration in parallel once audits are documented.

- [x] T001 Run Audit A-E as specified in spec.md FR-000a–FR-000e: (A) rg explainSimulate connect-four/server/ — document all callers and consumed fields; (B) rg classifyAll connect-four/server/ — document callers and replacement plan; (C) rg classifyPattern connect-four/server/ — enumerate every direct caller; (D) read buildExplainContext in connect-four/server/index.js top-to-bottom, document type1/2/3/4 dispatch and exclusive helper functions; (E) read every detect* function in connect-four/server/classifier.js, record return shape, and produce the cells-derivation mapping table from plan.md R-005. Update specs/025-patterns-blunders-epic3/research.md with all findings.
- [x] T002 [P] Create connect-four/server/migrations/035_explanation_cache_template_version.sql with exactly: `ALTER TABLE explanation_cache ADD COLUMN IF NOT EXISTS template_version TEXT;` — no DEFAULT clause, no data backfill
- [x] T003 [P] Create connect-four/server/blunderReasons.js exporting REASON_TEMPLATES (Map<string,string>, 23 entries keyed by "${tag}:${direction}" per FR-002 table in spec.md) and POSITIVE_TEMPLATES (Map<string,string>, 12 entries keyed by tag name per FR-003b table). Include caller-side generic fallbacks as JSDoc comments: REASON_TEMPLATES miss → "A stronger move was available."; POSITIVE_TEMPLATES miss or empty patterns → "This was the strongest move available."

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend detector return shapes and perform the atomic `classifyPattern` return-type change. These two tasks MUST be complete before any user story work begins. T004 must precede T005 (detectors must emit `cells` before `classifyPattern` can assemble the Map).

**⚠️ CRITICAL**: T005 is an atomic commit requirement — classifyPattern return-type change, tagBlunder P() adapter, and all caller adaptations MUST land in the same commit. Split commits will leave `tagBlunder` silently broken.

- [x] T004 Extend all detect* functions in connect-four/server/classifier.js to return `cells: string[]` alongside their existing return fields, using the derivation rules confirmed in Audit E (T001). Key rules: (1) detectImmediateThreat and detectDoubleThreat: map each col index to landing row `"c${col+1}r${board.colHeights[col]+1}"`; (2) detectUndercut, detectOvercut, detectFigure7, detectJShape: map highlightMetadata.cells entries to `"c${c.column+1}r${c.row+1}"`; (3) detectClaimodd: map correctCol to `"c${correctCol+1}r${board.colHeights[correctCol]+1}"`; (4) detectForcedWin, detectForcedBlock, detectForbiddenColumns, detectZThreat, detectOddEvenThreat, detectClaimeven: emit `cells: []` (POSITION-GLOBAL or no spatial output). When matched is false, cells MUST be [] (never undefined). Do NOT modify the classify() puzzle-generation path (FR-005a).
- [x] T005 Atomic commit — three changes in one commit in connect-four/server/classifier.js: (1) Change classifyPattern return type from `Promise<Set<string>>` to `Promise<Map<string, { cells: string[] }>>` — each key is a matched tag, each value has the cells array from the detector; (2) Adapt tagBlunder's P() helper to `const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys())` — preserves set-membership semantics while consuming Map return; (3) Adapt every other direct classifyPattern caller identified in Audit C (T001) to use Map rather than Set. Commit message must note the atomic nature. Run `npm run test:fast` in connect-four/ to confirm no regressions.

---

## Phase 3: US4 (P2) — REASON_TEMPLATES Snapshot Guard

**Goal**: Snapshot test guarantees that REASON_TEMPLATES has exactly 23 entries and no entry resolves to undefined. This guards US1/US2 prompt quality against future regressions.

**Independent Test**: `npm run test:fast` passes with the new test file. The test catches deletion of any of the 23 entries and fails loudly.

**Note on ordering**: US4 is spec-priority P2 but appears here before US1/US2 (P1) because `blunderReasons.js` (created in T003) is a prerequisite for the prompt builder (T009). The snapshot test verifies T003 is correct before US1 builds on top of it.

- [x] T006 [US4] Create connect-four/tests/blunder/blunderReasons.test.js using node:test + node:assert/strict (never Jest): (1) snapshot test asserting REASON_TEMPLATES.size === 23 and every key from the FR-002 table maps to a non-empty string (snapshot so text changes produce explicit diff); (2) spot-check test asserting REASON_TEMPLATES.get('drawing_move:missed_own') === "You had a win available and settled for a draw."; (3) test asserting POSITIVE_TEMPLATES.size === 12 and every key from the FR-003b table maps to a non-empty string. Then add the test file to both `test` and `test:fast` script entries in connect-four/package.json.

**Checkpoint**: `npm run test:fast` passes. blunderReasons module is verified correct.

---

## Phase 4: US1 + US2 (P1) — Core Coach Explanation Rebuild

**Goal**: Both the blunder path (US1) and the optimal-move path (US2) produce `validateAnnotation`-passing explanations grounded in `tagBlunder` + `classifyPattern` output. The simulation-based dispatch is replaced end-to-end.

**Independent Test**: `POST /api/explain-move-llm` on a known blunder position returns a non-null explanation containing the human-readable REASON_TEMPLATES sentence (not the terse reason string), passes validateAnnotation, and logs no tagBlunder invocation on the optimal-move path.

### Tests for User Story 1

- [x] T007 [US1] Create connect-four/tests/blunder/classifyPatternCells.test.js (node:test): using movestrings sourced from DB or codebase (never invented), verify that classifyPattern returns a Map and that the Map entry for immediate_threat has non-empty cells array with wire-format strings matching "c{col+1}r{row+1}"; also verify double_threat entry has non-empty cells. Add test file to test and test:fast scripts in connect-four/package.json.
- [x] T008 [US1] Create connect-four/tests/blunder/tagBlunderPAdaptation.test.js (node:test): using a known blunder movestring sourced from DB or codebase, call tagBlunder both before and after the P() adaptation and assert the returned {tag, reason, direction} is identical (regression guard per FR-006a). Add test file to test and test:fast scripts in connect-four/package.json.

### Implementation for User Story 1 + 2

- [x] T009 [US1] Add buildBlunderExplainPrompt({ tag, direction, humanReason, positiveReason, correctMovePatterns, boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet }) to connect-four/server/llmCoachHelpers.js per DM-004 in plan.md. Blunder path: humanReason is non-null, positiveReason is null — include humanReason in prompt, never include terse reason string (FR-012). Optimal path: positiveReason is non-null (keyed by highest-priority tag per FR-013 cascade order: forced_win > double_threat > immediate_threat > undercut > overcut > figure_7 > j_shape > z_threat > odd_even_threat > claimeven > claimodd > drawing_move > suboptimal_move; use Map ordering is explicitly forbidden — use the cascade above), humanReason is null. FR-003a: REASON_TEMPLATES miss → generic fallback sentence. FR-003b miss → "This was the strongest move available.". Preserve P1–P6 annotation constraints (FR-014): pass allowedSet to validateAnnotation as before. Solver scores must never appear in prompt (FR-015).
- [x] T010 [US1] Rework buildExplainContext in connect-four/server/index.js to replace the type1/2/3/4 dispatch with the unified two-sided grounding flow from FR-008: (1) keep preScores/isSettled/contrast/gap/gapBucket/inverted computation unchanged; (2) determine bestCol = contrastCol (blunder) or col (optimal when inverted==true); (3) BLUNDER PATH: call tagBlunder(movestring, col, bestCol, solver) → {tag, reason, direction}; look up humanReason from REASON_TEMPLATES with fallback; call classifyPattern(movestring+bestCol, perspective, solver) → correctMovePatterns; (4) OPTIMAL PATH: do NOT call tagBlunder; call classifyPattern(movestring+col, perspective, solver) → correctMovePatterns; tag/direction/humanReason are null; (5) ALLOWEDSET DERIVATION: base union = classifyPattern(movestring, perspective) + classifyPattern(movestring+bestCol, perspective); enabled_opponent augmentation: compute oppBestCol via solver.query(movestring+playedCol) argmax, add classifyPattern(movestring+playedCol+oppBestCol, opponentPerspective); defensive_miss augmentation: add classifyPattern(movestring, opponentPerspective) restricted to forced_block and immediate_threat entries; tier classification: Tier1 (non-empty cells) → {cells, zoneSpec:'tg'} CONCRETE-ELIGIBLE; Tier2 (z_threat, cells empty) → derive capsuleCol as first c where (board.height-board.colHeights[c])%2===1, emit {col:capsuleCol, parity:'odd', zoneSpec:'tg'} ABSTRACT-ONLY; Tier3 (forced_win, forced_block, forbidden_columns, odd_even_threat, claimeven) → template lookup only, NOT added to allowedSet; NULL RULE: if no Tier1 or Tier2 entry exists across all classifyPattern calls, pass allowedSet=null (not []) to validateAnnotation — passing [] would fail every tg zone on P5strong; (6) build board visualizations unchanged; (7) call buildBlunderExplainPrompt with assembled context; (8) return {prompt, allowedSet}. Retain unchanged: checkAllMovesEqual, selectContrastMove, getGapAndFraming, getBoardVisualization, getOpponentResponseMs, validateAnnotation gate.
- [x] T011 [US5] Wire template_version='v2' on all new explanation_cache row inserts in the POST /api/explain-move-llm handler in connect-four/server/index.js. Old cached rows (template_version IS NULL) are served as-is; no backfill. The migration from T002 must be applied to the DB before this code is live.
- [x] T012 [US1] Create connect-four/tests/blunder/buildExplainContext.test.js (node:test) with: (1) FR-T04: integration test calling buildExplainContext on a known blunder position (col≠bestCol) — assert non-null prompt, assert prompt contains the REASON_TEMPLATES human-readable sentence for the returned tag:direction, assert prompt does NOT contain terse reason string pattern, assert validateAnnotation passes; (2) FR-T05: integration test calling buildExplainContext on an optimal-move position (col==bestCol) — assert non-null prompt, assert validateAnnotation passes, assert tagBlunder was NOT called (use spy or verify logs show no tagBlunder invocation). Use movestrings sourced from DB or codebase (never invented). Add test file to test and test:fast scripts in connect-four/package.json.

**Checkpoint**: All four test files pass under `npm run test:fast`. buildExplainContext produces validated explanations on both paths.

---

## Phase 5: US3 (P2) — Remove explainSimulate + classifyAll

**Goal**: Zero hits for `rg explainSimulate connect-four/server/` and `rg classifyAll connect-four/server/`. The codebase contains exactly two classification APIs after this phase.

**Independent Test**: Both rg commands return zero hits. The debug endpoint `/api/debug/classify-all` returns `{red:[...], yellow:[...], boardState, scores}`. `npm run test:fast` still passes.

### Implementation for User Story 3

- [x] T013 [US3] Remove from connect-four/server/llmCoachHelpers.js all functions that were exclusively called from the old buildExplainContext dispatch: classifyExplanationType, buildType1AllowedSet, selectTopGroups, buildAllowedSet, buildGroupContextBlock, buildType12Prompt, buildType3Prompt, buildType4Prompt (FR-009). Before removing, verify getOpponentResponseMs is still used by buildExplainContext (confirm with rg getOpponentResponseMs connect-four/server/) — retain it if it is.
- [x] T014 [P][US3] Replace the classifyAll call in the /api/debug/classify-all endpoint in connect-four/server/index.js with two classifyPattern calls: classifyPattern(ms, 1, solver) for Red perspective and classifyPattern(ms, 2, solver) for Yellow perspective. Update the response shape to `{ red: [...tagNames], yellow: [...tagNames], boardState, scores }` where red and yellow are string[] derived via `new Set(result.keys())` on each Map result (FR-020).
- [x] T015 [P][US3] Replace the classifyAll invocation in connect-four/server/scripts/classify_all.mjs with classifyPattern(ms, 1, solver) + classifyPattern(ms, 2, solver), printing both perspective tag sets per position. Import classifyPattern from connect-four/server/classifier.js (FR-021).
- [x] T017 [P][US3] Delete four dead CLI scripts that import explainSimulate: connect-four/server/scripts/review_feedback.mjs, connect-four/server/scripts/explain_move.mjs, connect-four/server/scripts/explain_simulate.mjs, connect-four/server/scripts/recommend_next_move.mjs. These are dead code on branch 101-new-design (sparring now uses GameScreen.jsx, not the old flow) per R-001 in plan.md.
- [x] T018 [P][US3] Delete the /api/recommend-move endpoint block from connect-four/server/index.js. Also delete the dangling rate-limiter registration `app.use('/api/recommend-move', makeLimit(5))` at server/index.js:91 — removing only the endpoint block leaves that line orphaned. This endpoint calls explainSimulate directly and is dead because RecommendCoach.jsx is only used in the old HomePage.jsx sparring flow which no longer runs on this branch.
- [x] T019 [US3] Delete connect-four/src/pages/HomePage.jsx (the entire file — it is unrouted dead code on branch 101-new-design). Also delete connect-four/src/components/RecommendCoach.jsx (the component it imports, which has no other callers). Do not surgically edit; delete both files outright.
- [x] T020 [US3] Re-run `rg explainSimulate connect-four/` to confirm zero callers remain (T017, T018, T019 must be done). Separately, read both DETECTOR_REGISTRY in explainSimulate.js and the inline detector list in classifyPattern side-by-side. If they have drifted, update classifyPattern's inline list in connect-four/server/classifier.js to match the fuller set before deletion (FR-019). Document whether drift was found. **DRIFT FOUND**: `odd_even_threat` exists in `classifyPattern` but NOT in `DETECTOR_REGISTRY`. This is an intentional addition to `classifyPattern` (added in Epic 3), not a bug — no action required on `classifyPattern`'s side.
- [x] T021 [US3] Delete connect-four/server/explainSimulate.js and connect-four/server/explainSimulate.test.js. Also remove or update the comment in connect-four/server/classifier.js that references keeping the inline detector list "in sync with DETECTOR_REGISTRY in explainSimulate.js" — update it to state that classifyPattern's inline list is now the sole registry. Run `npm run test:fast` to confirm all tests pass.
- [x] T016 [US3] Run `rg classifyAll connect-four/server/` to confirm zero hits in main source tree (T014, T015, and T021 must be done — `explainSimulate.js` references `classifyAll` and must be deleted before this check will pass). If unexpected hits remain, document them and do NOT delete yet. Once confirmed zero hits, delete the classifyAll export and function body from connect-four/server/classifier.js (FR-022).

**Checkpoint**: `rg explainSimulate connect-four/server/` → zero hits. `rg classifyAll connect-four/server/` → zero hits. `npm run test:fast` passes.

---

## Phase 6: US5 (P3) — Corpus Validation Gate

**Goal**: Automated corpus gate confirms the new buildExplainContext path passes `validateAnnotation` on ≥95% of real DB blunder positions. This is a blocking quality gate before shipping.

**Independent Test**: corpus_annotation_check.mjs runs to completion, logs pass rate ≥95% (≥48/50), and per-failure details by P-check and tag/direction. Manual quality gate (FR-T06b) follows after automated gate passes.

- [x] T022 [US5] Write connect-four/server/scripts/corpus_annotation_check.mjs (FR-T06): **Pre-condition: before implementing, verify ≥50 tagged rows exist in the `blunders` table (`SELECT COUNT(*) FROM blunders WHERE tag IS NOT NULL AND direction IS NOT NULL`). This count was confirmed ≥48 rows before Epic 3 implementation begins (all games reprocessed + papergames history imported in Epic 2). If fewer than 50 rows are present, stop and resolve the data gap before proceeding.** Fetch ≥50 blunder rows from the DB that have non-null reason and direction (written by Epic 2), reconstruct movestring + col from game_id join, call buildExplainContext on each, submit result to validateAnnotation, collect pass/fail with per-failure details (which P1–P6 check failed, tag, direction). Print overall pass rate (e.g., "48/50 passed (96%)"). Script must run with `node --env-file=.env connect-four/server/scripts/corpus_annotation_check.mjs`.
- [x] T023 [US5] Run corpus_annotation_check.mjs against live DB; verify pass rate ≥95% (≥48/50). If pass rate is below 95%, this is a blocking failure — do not ship. Document all failures with tag/direction/P-check details and fix the root cause before re-running. After automated gate passes, perform FR-T06b manual review: compare 10 LLM explanations from the new system against 10 existing cached explanations for the same movestrings; confirm no regression in accuracy or clarity.

**Checkpoint**: Automated gate ≥95% pass rate confirmed. Manual quality gate passed (no regressions found).

---

## Phase 7: Polish & Docs

**Purpose**: Architecture documentation updates required by Constitution Principle VIII. These are part of the definition of done.

- [x] T024 [P] Update docs/architecture/server-conventions.md: (1) remove the explainSimulate section and the note saying classifyPattern's inline list must stay in sync with DETECTOR_REGISTRY in explainSimulate.js; (2) update the classifyPattern API signature description from `Promise<Set<string>>` to `Promise<Map<string, { cells: string[] }>>`; (3) update the LLM Coach Helpers section: remove references to buildType12Prompt, buildType3Prompt, buildType4Prompt, classifyExplanationType; add documentation for buildBlunderExplainPrompt and its parameter shape.
- [x] T025 [P] Update docs/architecture/db-schema.md: document the new explanation_cache.template_version column (nullable TEXT, no default; 'v2' on all new rows written after this epic; NULL on pre-existing rows; for operator inspection only, no index).
- [x] T026 [P] Update docs/architecture/testing-conventions.md: confirm that blunderReasons.test.js, classifyPatternCells.test.js, tagBlunderPAdaptation.test.js, and buildExplainContext.test.js are all included in connect-four/package.json's test:fast script. Document the node:test (not Jest) convention for the connect-four/tests/blunder/ directory.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Pre-work)**: No dependencies — start immediately. T002 and T003 can run in parallel once T001 is in progress (audits do not block new-file creation, but per spec FR-000 they must be documented before touching existing code; T002 and T003 touch no existing code).
- **Phase 2 (Foundational)**: Depends on Phase 1. T004 (detector cells) must precede T005 (classifyPattern atomic) — detectors must emit cells before classifyPattern can build the Map.
- **Phase 3 (US4)**: Depends on Phase 1 (T003 must exist). Can start after T003 is done; does not depend on Phase 2.
- **Phase 4 (US1+US2)**: Depends on Phase 2 complete (T005 done) AND Phase 3 complete (T006 done). T007 and T008 can run after T005; T009 requires T006 (blunderReasons) and T005 (classifyPattern Map); T010 requires T009 and T005; T011 requires T010; T012 requires T010.
- **Phase 5 (US3)**: T013, T014, T015 can start after T012 passes (integration tests green). T017, T018, T019 can run in parallel (and can run in parallel with T013/T014/T015). T020 requires T017+T018+T019. T021 requires T020. T016 requires T014+T015+T021 — `explainSimulate.js` contains a reference to `classifyAll` and must be deleted (T021) before the zero-hit check in T016 can pass.
- **Phase 6 (US5)**: T022 can start after T010+T011. T023 requires T022.
- **Phase 7 (Polish)**: Depends on all prior phases complete. T024, T025, T026 are independent of each other [P].

### User Story Dependencies

- **US4 (P2)** comes before **US1 (P1)** in implementation order because `blunderReasons.js` (T003) is a prerequisite for `buildBlunderExplainPrompt` (T009). This is an intentional priority inversion — US4's snapshot test (T006) catches blunderReasons.js errors before US1 builds on them.
- **US1 + US2 (P1)**: Can proceed in parallel once Foundational + US4 are done. T007/T008 are US1 unit tests that can run in parallel with each other only if package.json is updated carefully (both modify it — prefer running T007 then T008 sequentially). T009/T010/T011/T012 are sequential within US1/US2.
- **US3 (P2)**: Depends on US1+US2 integration tests (T012) passing. T013/T014/T015 can run in parallel (different files). T017/T018/T019 can run in parallel (and in parallel with T013/T014/T015). T020 requires T017+T018+T019. T021 requires T020. T016 requires T014+T015+T021 — `explainSimulate.js` must be deleted first because it references `classifyAll`.
- **US5 (P3)**: T011 (template_version write) is done in Phase 4. T022/T023 run after T010 is done (they exercise buildExplainContext).

### Within Phase 2

- T004 before T005 (detectors must emit cells before classifyPattern can build Map)
- T005 is atomic: three sub-changes in one commit

### Key Parallel Opportunities

- T002 + T003 (Phase 1): different files
- T007 + T008 (Phase 4 tests): different test files (but both modify package.json — run sequentially or resolve merge)
- T013 + T014 + T015 (Phase 5 cleanup start): different files (llmCoachHelpers.js, index.js, classify_all.mjs)
- T017 + T018 + T019 (Phase 5 dead-code): different files (scripts/, index.js, src/)
- T024 + T025 + T026 (Phase 7 docs): different doc files

---

## Parallel Example: Phase 5 Cleanup

```bash
# These six can run simultaneously (different files):
Task T013: Remove old prompt builders from connect-four/server/llmCoachHelpers.js
Task T014: Adapt /api/debug/classify-all in connect-four/server/index.js
Task T015: Adapt connect-four/server/scripts/classify_all.mjs
Task T017: Delete four dead CLI scripts
Task T018: Delete /api/recommend-move (and rate-limiter line) from index.js
Task T019: Delete src/pages/HomePage.jsx and src/components/RecommendCoach.jsx

# After T017+T018+T019 complete:
Task T020: Re-run Audit A, reconcile DETECTOR_REGISTRY
Task T021: Delete explainSimulate.js + explainSimulate.test.js

# After T014+T015+T021 complete (explainSimulate.js must be gone before this check):
Task T016: Confirm zero classifyAll hits, delete classifyAll from classifier.js
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Pre-work)
2. Complete Phase 2 (Foundational — blocks US1)
3. Complete Phase 3 (US4 snapshot test — validates blunderReasons.js)
4. Complete Phase 4 through T010 (rework buildExplainContext)
5. **STOP and VALIDATE**: test `POST /api/explain-move-llm` manually on a known blunder position
6. Complete T011, T012 (template_version + integration tests)

### Incremental Delivery

1. Phase 1 + Phase 2 → classifier infrastructure ready
2. Phase 3 (US4) → blunderReasons module verified
3. Phase 4 (US1+US2) → new buildExplainContext live, both paths validated
4. Phase 5 (US3) → codebase cleaned of explainSimulate + classifyAll
5. Phase 6 (US5) → corpus gate passes, epic shippable
6. Phase 7 → docs complete, definition of done met

### Blocking Quality Gates

- **T005 atomic commit**: classifyPattern Map return + P() adapter + all callers MUST be one commit. Splitting breaks tagBlunder silently.
- **T012 must pass before Phase 5 cleanup**: Do not remove old prompt builders (T013) until integration tests (T012) confirm the new path works.
- **T020 + T021 ordering**: DETECTOR_REGISTRY reconciliation (T020) is a required step before deletion (T021). Skipping it may silently drop detectors from classifyPattern.
- **T023 corpus gate ≥95%**: Blocks shipping if pass rate is below 95%. Fix root cause and re-run; do not ship below threshold.
- **FR-T06b manual quality gate**: Runs after T023 passes. Human review of 10 explanation samples. Blocks shipping if regression found.

---

## Notes

- **Null vs. empty-array rule (T010)**: Passing `[]` to validateAnnotation when all patterns are Tier 3 (forced_win, etc.) causes P5strong to fail every annotation. Always pass `null` when no Tier 1 or Tier 2 entry exists. This is the most critical correctness rule in the entire epic.
- **[P] tasks** = different files, no blocking dependencies on incomplete tasks in the same phase
- **[Story] label** maps each task to its user story for traceability
- **node:test (not Jest)**: All test files in `connect-four/tests/blunder/` use `node:test` and `node:assert/strict` per project convention (`feedback_server_testing_pattern.md`)
- **Movestrings for tests**: Never invented by hand — always sourced from DB or existing codebase (`feedback_no_random_boards.md`)
- **T021 before T016**: `explainSimulate.js` contains a reference to `classifyAll`; running the T016 zero-hit check before T021 deletes that file will always find a false hit. T021 must complete before T016 runs. Both are verification gates — run `rg` before each deletion to confirm zero callers. If hits remain, stop and document — do not force-delete with callers outstanding.
- Each task should be committed individually or in a logical group (e.g., T005 atomic commit, T012 test file + package.json)
