# Tasks: Feature-Vector Grounding (Epic 040)

**Input**: Design documents from `specs/040-fv-grounding/`
**Prerequisites**: spec.md, plan.md, data-model.md, research.md all read
**Tests**: Unit tests are part of each story's definition of done (per spec FR-A11, FR-B10, FR-C08)
**Organization**: Tasks grouped by user story; each story ends with regenerate-frozen + board spot-check

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1]=Story A, [US2]=Story B, [US3]=Story C)
- All paths are relative to `/Users/elsonidoq/prog/cuatro_en_linea/`

## Files touched by this epic

- `connect-four/server/sparseLookahead.js` — primary: new return fields + helpers
- `connect-four/server/explainContext.js` — `toFeatureVector` projection + `compactThreats`
- `docs/architecture/feature-vector-glossary.md` — lockstep with every new field
- `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` — regenerated after each story
- `connect-four/server/tests/sparseLookahead.test.js` — new test file (Stories A + B)
- `connect-four/server/tests/explainContext.test.js` — new test file (Stories B + C)

---

## Phase 1: Setup

**Purpose**: Confirm the test runner is operational and identify the test directory before writing any new files.

- [x] T001 Verify `npm run test:fast` (run from inside `connect-four/`) passes with zero failures; confirm `node --test` runner is available; locate any existing test files under `connect-four/server/tests/` so new test files don't collide

---

## Phase 2: Foundational — Parallel Preconditions

**Purpose**: Three gating tasks that each unlock one story; all three can run simultaneously.

**⚠️ CRITICAL**: Story A task T005+ cannot start until T002 is resolved. Story B task T015+ cannot start until T003 is green. Story C task T025+ must consult T004's findings.

- [x] T002 [P] Empirical spike — query the c4solver on 4–6 positions with known game-theoretic distance (source from `connect-four/server/scripts/eval_set_large_3.json` or KB movestrings); call `solver.query(movestring)` from both player-to-move and opponent-to-move perspectives; verify `pliesToEnd = Math.abs(score)` when `score !== 0`; document confirmed formula (or coarseness fallback) in `specs/040-fv-grounding/research.md` §R1 before any Story A implementation begins
- [x] T003 [P] Characterization snapshot — create `connect-four/server/tests/sparseLookahead.test.js`; write a snapshot test that calls `runSparseLookahead` (or the internal helper that feeds `allowedSet`/`aliasMap`) for 3 fixture positions covering Case 1/2, Case 2, and Case 3 (use eval-0 or eval-8 for Case 1/2; eval-12 or eval-29 for Case 2; eval-42 or eval-56 for Case 3); assert `allowedSet` and `aliasMap` byte-identical to committed inline constants; run `npm run test:fast` inside `connect-four/` and confirm green **before any edit to `collectNovelOpportunities` or `compareOpportunities`**
- [x] T004 [P] Field-presence audit — read `connect-four/server/explainContext.js` lines 208–275 (`toFeatureVector`) and `connect-four/server/sparseLookahead.js` return shapes; for each §5A field (`playedCol`, `playerMajorTotal`, `opponentMajorTotal`, `outcomeTiming`, `decisiveLine`, `reachability`, `edgeType`, `categoryExamples.playedNovel`), note: (a) present in code, (b) present in glossary, (c) absent; confirm `playedCol` is already emitted at `explainContext.js:215`; record findings inline in a comment block in `specs/040-fv-grounding/research.md` §R2 (do not modify any source files yet)

---

## Phase 3: User Story A — Time Grounding + Decisive-Line-with-Timing Contrast (Priority: P1) 🎯 MVP

**Goal**: Expose `outcomeTiming` (per-side outcome + `pliesToEnd`), `decisiveLine` (completing 4-window with `winningLinesThroughCell`, owner-symmetric), and `edgeType`'s positional/horizon detection so projected structures are never confusable with present-board tactics.

**Precondition**: T002 (empirical spike) must be resolved and formula documented before T005 starts.

**Independent Test**: Regenerate 18 frozen vectors after T014; board spot-check eval-6, eval-12, eval-29, eval-42, eval-51 with `./visualize_board.sh` and confirm `decisiveLine.cells` match the winning window and `outcomeTiming.pliesToEnd` is populated.

**Closes gaps**: 1 (partial), 2, 6, 7 — counterexamples eval-6, 10, 12, 29, 42, 51.

### Implementation for User Story A

- [x] T005 [US1] Add `toOutcome(score)` and `toPliesToEnd(score)` pure helpers (see data-model §1.1 derivation) and assemble `outcomeTiming = { best: { outcome, pliesToEnd }, played: { outcome, pliesToEnd } }` from the pre-move `optScore`/`blunderScore` already in scope at `runSparseLookahead` lines 386–390 in `connect-four/server/sparseLookahead.js`; spread `outcomeTiming` into **all four return paths** (lines ~414–502); a unit test (T013 A-T9) will assert its presence on every exit path
- [x] T006 [P] [US1] Implement `pickEarliestWay(tally)` helper in `connect-four/server/sparseLookahead.js`: retrieve the `immediate_threat` entry from `tally`; if absent or `ways` empty return `null`; otherwise return the `ways` entry with the minimum `ply` value; this is a read-only pass over existing tally data — do not modify `searchOpportunities` or `recordWay`
- [x] T007 [P] [US1] Implement `findGravityTopEmpty(cells, board)` geometry helper in `connect-four/server/sparseLookahead.js`: given the 4-cell array of a completing window (cNrM strings, 1-indexed per glossary §1) and the root `Board`, return the unique cell that is both in the window and currently empty at its gravity-top position (the cell a disc would land on if dropped into that column); no solver calls
- [x] T008 [P] [US1] Implement `countWindowsThrough(cell, board)` geometry helper in `connect-four/server/sparseLookahead.js`: given a single cell (cNrM) and the root `Board`, count the number of distinct 4-windows on the board whose four cells include `cell`; return that integer (`winningLinesThroughCell`); pure geometry, no solver calls; a value of 1 = single-line win, > 1 = genuine fork
- [x] T009 [US1] Implement `buildDecisiveLine(primaryTally, secondaryTally, owner, rootBoard)` helper in `connect-four/server/sparseLookahead.js` per data-model §1.2: call `pickEarliestWay` on both tallies; if neither has an `immediate_threat` return `undefined` (absent → pruned); determine `fastWay`/`slowWay`; call `findGravityTopEmpty` and `countWindowsThrough` on `fastWay.cells`; return the `decisiveLine` object with `owner`, `cells`, `completingCell`, `winningLinesThroughCell`, `fastSide`, `fastSideRealizedOnPly`, `slowSideRealizedOnPly`; depends on T006, T007, T008
- [x] T010 [US1] Invoke `buildDecisiveLine` at **each of the four return paths** inside `runSparseLookahead` in `connect-four/server/sparseLookahead.js` with the correct source tally and explicit `owner` per data-model §1.2: Cases 1/2 player-wins paths → `buildDecisiveLine(bestTally, playedTally, 'player', rootBoard)`; Case 3 opponent-punishes path → `buildDecisiveLine(oppTally, null, 'opponent', rootBoard)`; when `buildDecisiveLine` returns `undefined`, set `decisiveLine` to absent (do not spread undefined keys — omit the key so `pruneEmpty` handles it); depends on T009
- [x] T011 [US1] Project `outcomeTiming` and `decisiveLine` from the `la` lookahead object into `toFeatureVector`'s `lookahead` block in `connect-four/server/explainContext.js` (lines ~220–262): `outcomeTiming: la.outcomeTiming ?? undefined` (pruned when absent) and `decisiveLine: la.decisiveLine ?? undefined` (pruned when no horizon match); verify existing `bestOutcome`/`postBlunderOutcome`/`categoryExamples` fields are untouched
- [x] T012 [US1] Update `docs/architecture/feature-vector-glossary.md` §5.3: (a) add timing discipline statement at top of §5.3 (present-vs-projected discipline; three distinct timing concepts: `realizedOnPly`, `outcomeTiming.pliesToEnd`, "mate distance" — must not be conflated); (b) add `outcomeTiming` entry per data-model §3; (c) add `decisiveLine` entry per data-model §3 (`winningLinesThroughCell` = 1 vs > 1 semantics; `fastSide`; absent = pruned; `edgeType: "positional"` when absent); no `perCategory` or `edgeType` entries yet (Story B)
- [x] T013 [US1] Write unit tests A-T1 through A-T8 in `connect-four/server/tests/sparseLookahead.test.js` per data-model §5 Story A test plan (win-in-5 → pliesToEnd=5; draw → pliesToEnd=null; solver error → null; immediate_threat in tally → decisiveLine.cells; single-line → winningLinesThroughCell=1; fork → >1; horizon-exceeded → decisiveLine absent; best wins faster → fastSide='best' + fastSideRealizedOnPly < slowSideRealizedOnPly); use deterministic board fixtures from `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` or KB movestrings; run `npm run test:fast` inside `connect-four/` and confirm all green; depends on T010, T011
- [x] T014 [US1] Regenerate `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` via `node connect-four/server/scripts/run_eval.mjs --no-llm` (depth=20, one-col-per-score-value, no budget); board spot-check eval-6, eval-12, eval-29, eval-42, eval-51 using `./visualize_board.sh <movestring>` + solver `scr` row; confirm `decisiveLine.cells` names the completing window, `outcomeTiming.pliesToEnd` is populated, and `winningLinesThroughCell` distinguishes single vs multi-line; confirm no new A3/A4 fabrication surfaces in these 5 cases

**Checkpoint**: Story A complete — `outcomeTiming` and `decisiveLine` present in frozen vectors; eval-6, 12, 29, 42, 51 addressed.

---

## Phase 4: User Story B — Causation and Stakes (Priority: P2)

**Goal**: Extend `categoryExamples` to a symmetric cell-set diff, add `reachability` floor/ceiling, add `edgeType` (coarse branch). Remove `perCategory` from the feature vector projection. Expose why the move was causally decisive, not just that it was different.

**Precondition**: T003 (characterization snapshot) must be green before T015 starts. Story B can run in parallel with Story A once T003 is established.

**CRITICAL seam constraint**: `collectNovelOpportunities` and `compareOpportunities` must NOT be modified. The `playedNovel` direction is obtained by calling `collectNovelOpportunities` a second time with arguments swapped in `runSparseLookahead` only.

**Independent Test**: Regenerate 18 frozen vectors after T024; board spot-check eval-0, eval-8, eval-10, eval-56; confirm `categoryExamples` entries carry both `bestNovel`/`playedNovel` directions, `edgeType` is present and a truthy enum on all records, `reachability` present on losing-floor records.

**Closes gaps**: 1 (positional), 3, 4 — counterexamples eval-0, 8, 10, 42, 56.

### Implementation for User Story B

- [x] T015 [US2] Add `ceilingRef = { value: -Infinity }` optional dep field to `searchOpportunities` in `connect-four/server/sparseLookahead.js` per data-model §1.6: at each player-to-move node (after `solver.query`, where `scores` is available), if `deps.ceilingRef` is present, execute `deps.ceilingRef.value = Math.max(deps.ceilingRef.value, ...legal.map(c => scores[c]))` to track the highest player score seen; pass-through only (no behavioral change when `deps.ceilingRef` is absent)
- [x] T016 [US2] In `runSparseLookahead` in `connect-four/server/sparseLookahead.js`: (a) pass a fresh `ceilingRef = { value: -Infinity }` object into the existing Case-3 mistake-mode best/played searches; (b) for Cases 1/2 losing-played branch (where played floor is 'loss' and the played root was searched in OPTIMAL mode only), add a **new explicit mistake-mode search pass** on the played root passing `ceilingRef`; (c) for Cases 1/2 best side (where best floor is NOT 'loss'), do NOT run a mistake-mode search — best.ceiling will be set equal to best.floor in T017; this is the correctness-over-speed premise — accept the additional solver calls for the played-root pass only; depends on T015
- [x] T017 [US2] Assemble `reachability` in `runSparseLookahead` in `connect-four/server/sparseLookahead.js` per data-model §1.3: emit `{ best: { floor, ceiling }, played: { floor, ceiling } }` only when at least one side's floor is `'loss'` (FR-B04); derive `floor` from `toOutcome(optScore|blunderScore)`; for **non-losing floor sides** (floor ≠ 'loss'), set `ceiling = floor` — no search needed; for **losing floor sides** (floor = 'loss'), derive `ceiling` from `toOutcome(ceilingRef.value)` after the mistake-mode search completes; enforce ceiling ≥ floor invariant — the `-Infinity → 'loss'` default is prohibited; both sides are always present in the shape when the field is emitted; spread `reachability` into all applicable return paths; depends on T016
- [x] T018 [US2] In `runSparseLookahead` in `connect-four/server/sparseLookahead.js`, add a second call `collectNovelOpportunities(playedTally, bestTally)` immediately after the existing first call `collectNovelOpportunities(bestTally, playedTally)`; merge both results into the symmetric `categoryExamples` shape per data-model §1.5 and research.md §R6: union of all tags; each entry `{ tag, bestNovel: best?.ways ?? [], playedNovel: played?.ways ?? [], novelInstances }` where empty direction arrays are NOT spread (key omitted, not `[]`); filter to entries where at least one direction is non-empty (true cell-set ties dropped); do NOT modify `collectNovelOpportunities` or `compareOpportunities`
- [x] T019 [US2] Derive `edgeType` (coarse branch, fine-grained K/D deferred) in `runSparseLookahead` in `connect-four/server/sparseLookahead.js` per data-model §1.4 using a **total ordered if/else** (no undefined path): `'tactical'` when `outcomeTiming.best.outcome !== outcomeTiming.played.outcome` (checked first); else `'positional'` when `decisiveLine` is absent (`buildDecisiveLine` returned `undefined`); else `'marginal'` (catch-all — covers same-outcome positions with a decisive line on one OR both sides; the old "both sides" qualifier is dropped); spread truthy enum into **all four return paths** (must never be absent — absence would be pruned by `pruneEmpty` in the cases it matters most); depends on T010 (for decisiveLine presence), T005 (for outcomeTiming)
- [x] T020 [US2] Update `toFeatureVector` in `connect-four/server/explainContext.js`: (a) project `reachability: la.reachability ?? undefined` (pruned when absent); (b) project `edgeType: la.edgeType` (always present when lookahead ran); (c) update `categoryExamples` mapping to emit the new symmetric shape — `bestNovel: e.bestNovel?.length ? e.bestNovel : undefined`, `playedNovel: e.playedNovel?.length ? e.playedNovel : undefined`, `novelInstances: e.novelInstances`, retain `tag`/`owner`/`severity`; (d) **remove** the `perCategory` field from the feature vector projection (no longer projected — the `tallyComparison` data remains on `rawLookahead` for debugging but is NOT emitted in `featureVector`); depends on T017, T018, T019
  - **AWARENESS NOTE (eval-harness only)**: The eval-harness `prompt_data` mirror in `explainContext.js` (~line 767+) builds an uncensored structured comparison from `explainContext` for the deep-reveal eval; this mirror inherits Story B's `categoryExamples` shape change (`ways → bestNovel/playedNovel`). This is eval-harness-only / out of production-prompt scope — the production prompt (`lookaheadSection`, lines ~859–908) reads `la.tag`/`la.aliasMap`/`allowedSetEntries` directly and NEVER reads `categoryExamples` from the feature vector. No consumer rewrite is required this iteration unless a `prompt_data` reader in the eval harness breaks on the shape change.
- [x] T021 [US2] Verify T003 characterization snapshot test still passes unchanged after all Story B edits (T015–T020) by running `npm run test:fast` inside `connect-four/`; if the snapshot diff is non-empty, investigate and fix before proceeding — this is SC-003 regression gate
- [x] T022 [US2] Update `docs/architecture/feature-vector-glossary.md`: (a) §5.3 — add `edgeType` entry (three enum values, coarse-branch derivation, both branches stated; fine-grained K/D noted as deferred; always present when lookahead ran); (b) §5.3 — add `reachability` entry (floor/ceiling semantics; "best outcome found **within the search**" — never "provably"; absent when no side's floor is loss); (c) §5.3 — update `categoryExamples` entry to describe the new symmetric shape (`bestNovel`/`playedNovel` directions with per-cell `realizedOnPly`; absent direction key = no novel cells; cell-set tie → category absent); (d) §5.3 — retire the old count-based `perCategory` description (mark removed, replaced by symmetric `categoryExamples`); do not add any new `perCategory` section
- [x] T023 [US2] Write unit tests in `connect-four/server/tests/sparseLookahead.test.js` and `connect-four/server/tests/explainContext.test.js` per data-model §5 Story B test plan:
  - A-T9 (all four return paths have both `edgeType` truthy string and `outcomeTiming` present — no silent drop)
  - A-T9b (outcomeTiming is present for a forced-outcome fixture — win or loss — on both sides)
  - A-T9c (outcomeTiming is present with `pliesToEnd: null` for a draw/no-forced-outcome fixture; edgeType is `'positional'` or `'marginal'` in this case)
  - B-T1 (true cell-set tie → tag absent from `categoryExamples`)
  - B-T2 (different cells → both `bestNovel` and `playedNovel` with `realizedOnPly`)
  - B-T3 (only best side → `playedNovel` absent)
  - B-T4 (only played side → `bestNovel` absent)
  - B-T5 (losing-either-way → `reachability.best.floor = 'loss'` and `reachability.played.floor = 'loss'`)
  - B-T6 (best-holds/played-loses → `reachability` absent since best floor ≠ 'loss'; only the played side has floor='loss' but the field is still emitted with both sides — wait: reachability is emitted when at least one side's floor is 'loss'; test that `reachability.best.ceiling = reachability.best.floor` in this case)
  - B-T7 (outcomes diverge → `edgeType = 'tactical'`)
  - B-T8 (no horizon line either side → `edgeType = 'positional'`)
  - B-T9 (same outcome + decisive line found on ONE side only → `edgeType = 'marginal'`; also test the both-sides path as B-T9b)
  - B-T10 (characterization snapshot regression for 3 fixture positions)
  - B-T11 (Case 3 position → `decisiveLine.owner = 'opponent'` and cells from `oppTally` not `bestTally`/`playedTally`)
  - B-T12 (Cases 1/2 losing-played branch → `reachability` emitted; `reachability.played.ceiling ≥ reachability.played.floor` derived from real mistake-mode search, not -Infinity default; `reachability.best.ceiling = reachability.best.floor` since best floor is not 'loss' in a Case-1 record)
  - run `npm run test:fast` inside `connect-four/` and confirm all green
- [x] T024 [US2] Regenerate `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` via `node connect-four/server/scripts/run_eval.mjs --no-llm`; board spot-check eval-0, eval-8, eval-10, eval-56 using `./visualize_board.sh <movestring>` + solver `scr` row; confirm `edgeType` present on all 18 records as truthy string; confirm `reachability` present on losing-floor records; confirm symmetric `categoryExamples` shape with `bestNovel`/`playedNovel` per-cell timing; confirm no `perCategory` field in any record

**Checkpoint**: Story B complete — causation/stakes fields live in frozen vectors; eval-0, 8, 10, 56 addressed; characterization test green.

---

## Phase 5: User Story C — threatStats Legibility + Grounding Ride-Alongs (Priority: P3)

**Goal**: Add `playerMajorTotal`/`opponentMajorTotal` totals to `threatStats`, verify `playedCol` already emitted, and document `patterns*` snapshot provenance unambiguously in the glossary.

**Precondition**: T004 (field-presence audit) findings must be reviewed before T025 starts. Story C can run in parallel with Stories A and B once T004 is complete.

**Independent Test**: Regenerate 18 frozen vectors after T030; board spot-check eval-12 and eval-15 (parity totals now explicit) and eval-29, eval-42 (provenance in glossary) to confirm the parity-legibility and provenance counterexamples are addressed.

**Closes gaps**: 5, 8, 9 — counterexamples eval-12, 15 (parity), eval-12 (playedCol), eval-29, 42 (provenance).

### Implementation for User Story C

- [x] T025 [US3] Formally confirm T004 audit: read `connect-four/server/explainContext.js` line 215 and verify `playedCol` is already present in `toFeatureVector` output; if confirmed, no new code is required for this field; if any other §5A field is found already present, document and skip its implementation task; note exact line numbers for any field already emitted
- [x] T026 [US3] Add `playerMajorTotal` and `opponentMajorTotal` sum fields to the `compactThreats` helper in `connect-four/server/explainContext.js` per data-model §2.2: `playerMajorTotal = (snap.playerMajorParityAligned?.count ?? 0) + (snap.playerMajorNonParity?.count ?? 0)`, same pattern for opponent; add to the returned compact snapshot object; when total is 0 the field is omitted by `pruneEmpty` (falsey-deep per `isZeroOrBlankDeep`) which is correct — absence = "no major threats" (FR-C03)
- [x] T027 [US3] Update `docs/architecture/feature-vector-glossary.md` §5.1: after the existing three-snapshot description, add explicit **Snapshot provenance** block per data-model §3: `patternsPreMove` = board before either move (root `movestring` exactly); `patternsBest` = board after `bestCol` lands; `patternsPostBlunder` = board after played move lands; `patternsOpponent` = opponent's structures on the **pre-move board** (classifier run from opponent perspective on `movestring` before either move — NOT the opponent's structures after the played move)
- [x] T028 [US3] Update `docs/architecture/feature-vector-glossary.md` §5.2: after the bucket table, add the major-threat totals paragraph per data-model §3: state `playerMajorTotal` = sum of `playerMajorParityAligned.count` + `playerMajorNonParity.count`; same for opponent; "when either total is zero, the field is absent (pruned — absence = no major threats)"; explicitly state **"Zero parity-aligned majors ≠ zero majors"** — a player with `playerMajorParityAligned` absent but `playerMajorNonParity` present still has a major threat
- [x] T029 [US3] Write unit tests C-T1 through C-T4 in `connect-four/server/tests/explainContext.test.js` per data-model §5 Story C test plan: C-T1 (2 parity-aligned + 1 non-parity major → `playerMajorTotal = 3`); C-T2 (0 major threats → `playerMajorTotal` absent/pruned); C-T3 (`playerMajorParityAligned` absent + `playerMajorNonParity.count = 1` → `playerMajorTotal = 1`, not absent); C-T4 (any position → `featureVector.playedCol` matches input column); run `npm run test:fast` inside `connect-four/` and confirm all green; depends on T025, T026
- [x] T030 [US3] Regenerate `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` via `node connect-four/server/scripts/run_eval.mjs --no-llm`; board spot-check eval-12 and eval-15 using `./visualize_board.sh <movestring>` — confirm `playerMajorTotal`/`opponentMajorTotal` appear when majors exist; confirm `playedCol` field is present on all 18 records (was absent before this epic); confirm the provenance clarification in §5.1 addresses the ambiguity visible in eval-29 and eval-42 (`patternsOpponent` = pre-move opponent snapshot)

**Checkpoint**: Story C complete — `playerMajorTotal`/`opponentMajorTotal` in frozen vectors; `playedCol` confirmed present; provenance documented; eval-12, 15, 29, 42 addressed.

---

## Phase 6: Final Convergence

**Purpose**: All-stories-complete comprehensive validation. Run after all three stories land and their individual per-story regenerations confirm no regressions.

- [x] T031 Run `npm run test:fast` inside `connect-four/` for a complete green pass across all new tests: A-T1 through A-T8, A-T9, B-T1 through B-T12, C-T1 through C-T4; confirm zero failures; confirm characterization snapshot (B-T10) still passes, proving SC-003
- [x] T032 Regenerate `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` via `node connect-four/server/scripts/run_eval.mjs --no-llm` with all three stories complete; verify every new/changed glossary field (`outcomeTiming`, `decisiveLine`, `edgeType`, `reachability`, `categoryExamples` symmetric shape, `playerMajorTotal`, `opponentMajorTotal`, `playedCol`) appears with a non-empty value in at least one of the 18 frozen records; board spot-check **all 10 failing cases** (eval-0, 6, 8, 10, 12, 15, 29, 42, 51, 56) via `./visualize_board.sh <movestring>` + solver `scr` row; confirm §9 counterexample→field traceability table entries are each addressed; confirm no A3/A4 fabrication surfaces remain for these 10 cases; do NOT re-run the `gpt-5.4` answerer or re-grade — that is a separate user-triggered step

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Preconditions)**: Depends on Phase 1; T002, T003, T004 all run in parallel
- **Phase 3 (Story A)**: Depends on T002 (spike resolved before T005)
- **Phase 4 (Story B)**: Depends on T003 (characterization test green before T015); can run in parallel with Story A once T003 passes
- **Phase 5 (Story C)**: Depends on T004 (audit complete before T025); can run in parallel with Stories A and B
- **Phase 6 (Final)**: Depends on all three stories complete (T014, T024, T030 all done)

### Story A Internal Dependencies

```
T002 (spike) → T005 (outcomeTiming)
T006 + T007 + T008 (parallel helpers) → T009 (buildDecisiveLine) → T010 (invoke at 4 paths)
T005 + T010 → T011 (project into toFeatureVector)
T010 + T011 → T013 (unit tests A-T1..A-T8) → T014 (regenerate + spot-check)
T012 (glossary §5.3) is independent of T011 — can run in parallel
```

### Story B Internal Dependencies

```
T003 (char test) → T015 (ceilingRef dep)
T015 → T016 (mistake-mode search pass)
T016 → T017 (reachability assembly)
T018 (symmetric categoryExamples) — parallel with T015-T017 (different logic path)
T019 (edgeType) — depends on T010 (Story A decisiveLine) + T005 (outcomeTiming)
T017 + T018 + T019 → T020 (project into toFeatureVector)
T020 → T021 (verify char test still passes)
T021 → T023 (unit tests) → T024 (regenerate + spot-check)
T022 (glossary) — can start after T019 design is clear
```

### Story C Internal Dependencies

```
T004 (audit) → T025 (confirm playedCol)
T025 → T026 (playerMajorTotal code) → T029 (unit tests) → T030 (regenerate + spot-check)
T027 + T028 (glossary) — parallel with T026; depends only on T004 audit findings
```

### Cross-Story Dependencies

- T019 (edgeType in Story B) depends on T010 (Story A `buildDecisiveLine` at all 4 paths) for the `decisiveLine`-absent signal
- T023 (Story B tests) includes A-T9 which tests `edgeType` + `outcomeTiming` — requires T005 (Story A) and T019 (Story B) both complete
- T020 (Story B `toFeatureVector` projection) should land after T011 (Story A `toFeatureVector` projection) to coordinate `lookahead` block changes; if Stories A and B execute sequentially, this is automatic; if parallel, coordinate the `lookahead` block edits to the same file

---

## Parallel Opportunities

### Phase 2: All three preconditions in parallel
```
Parallel: T002 (spike) + T003 (char test) + T004 (audit)
```

### Phase 3 Story A: Geometry helpers in parallel
```
Parallel: T006 (pickEarliestWay) + T007 (findGravityTopEmpty) + T008 (countWindowsThrough) + T012 (glossary §5.3 Stories A entries)
Sequential after: T009 → T010 → T011 → T013 → T014
```

### Phase 4 Story B: categoryExamples and reachability in parallel
```
Parallel: T018 (symmetric categoryExamples) with T015→T016→T017 (reachability pipeline)
Parallel: T022 (glossary) after T019 design clear
Sequential: T020 (projection) after T017+T018+T019; T021 (verify char test); T023 (unit tests); T024 (regenerate)
```

### Phases 3, 4, 5 in parallel (story-level)
With care on the `toFeatureVector` file conflict (T011, T020, T026 all touch `explainContext.js`): if running in parallel, Story A (T011) should touch only the `outcomeTiming`/`decisiveLine` lines; Story B (T020) adds `reachability`/`edgeType`/`categoryExamples`; Story C (T026) adds to `compactThreats` function — these are different functions/lines and can be merged cleanly.

---

## Implementation Strategy

### MVP First (Story A Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Run T002 first (spike gates Story A)
3. Complete Phase 3: Story A (T005–T014)
4. **STOP and VALIDATE**: `npm run test:fast` green; frozen vectors regenerated; eval-6, 12, 29, 42, 51 spot-checked
5. Stories B and C can follow independently

### Incremental Delivery

1. T001 (setup) → T002+T003+T004 (preconditions)
2. Story A → frozen vectors regenerated → spot-check 5 cases
3. Story B → frozen vectors regenerated → spot-check 4 more cases
4. Story C → frozen vectors regenerated → spot-check remaining 4 cases
5. T031+T032 (final convergence) → all 10 cases confirmed, all tests green

### Performance Note (correctness-over-speed premise)

The new mistake-mode search pass for Cases 1/2 losing-played branch (T016) adds solver calls. This is accepted per spec §Performance Goals. Production depth tiers are out of scope — new signals are in shared `sparseLookahead.js` code so production inherits them at its own depth (analysis deferred).

---

## Notes

- [P] tasks = different files or independent logic; no blocking dependencies
- `npm run test:fast` (not `npm test`) is the only allowed test command — `npm test` triggers `candidate-generator.test.js` which causes IPC deadlock
- The characterization test (T003) is a hard gate — B-T10 regression must stay green throughout Story B edits
- `collectNovelOpportunities` and `compareOpportunities` must not be modified in any task
- `edgeType` is derived via a **total ordered if/else** (tactical → positional → marginal catch-all); the old "both sides" qualifier on `marginal` is dropped — `marginal` is now the final catch-all covering same-outcome positions with a decisive line on one OR both sides
- `edgeType` fine-grained K/D branch is explicitly DEFERRED to a follow-up iteration after frozen vectors are regenerated with real `pliesToEnd` values; do not implement K/D thresholds
- `perCategory` count-based field is removed from `featureVector` in T020 and retired in glossary §5.3 in T022; do not reintroduce it
- All `immediate_threat` assembly in `buildDecisiveLine` (T009) is read-only over tally data — do not modify `searchOpportunities` or `recordWay`
- Spot-check positions are restricted to the 10 failing eval IDs: 0, 6, 8, 10, 12, 15, 29, 42, 51, 56; do not spot-check other records
- Re-running the LLM answerer (`explain_from_vector.mjs`) or re-grading is explicitly OUT OF SCOPE and must not be included in any task
