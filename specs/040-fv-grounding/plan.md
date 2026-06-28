# Implementation Plan: Feature-Vector Grounding (Epic 040)

**Branch**: `stagging` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/040-fv-grounding/spec.md`

---

## Summary

The Feature-Vector Sufficiency Experiment identified 10 fabrication failures (A3/A4) in 18 frozen
eval cases. All 10 are caused by the feature vector carrying facts that are ambiguous on the Time,
Causation, or Stakes axes — not by model capability. This epic makes those three axes explicit so a
model only ever narrates, never infers.

Three stories, all changes confined to `server/sparseLookahead.js`, `server/explainContext.js`, and
`docs/architecture/feature-vector-glossary.md`:

- **Story A** (P1): Add `outcomeTiming` (per-side outcome + `pliesToEnd`) and `decisiveLine`
  (completing 4-window with `winningLinesThroughCell`). Closes the time-grounding and single-vs-fork
  gaps. *Precondition: empirical spike confirms solver score-magnitude → moves-to-end mapping before
  any field is coded.*
- **Story B** (P2): Extend `categoryExamples` to be a symmetric cell-set diff (adding `playedNovel`
  direction via a second swapped call to `collectNovelOpportunities`), add `reachability`
  floor/ceiling, add `edgeType`. *Precondition: characterization test snapshots
  `allowedSet`/`aliasMap` before any seam edit.*
- **Story C** (P3): Add `playerMajorTotal`/`opponentMajorTotal` to `threatStats`, verify
  `playedCol` already present, document `patterns*` snapshot provenance in glossary. *Precondition:
  field-presence audit confirms which §5A fields are already present vs genuinely missing.*

Acceptance ends at: new unit tests green (`npm run test:fast`), regenerated
`eval_set_fv_suff_frozen_vectors.jsonl`, and board spot-check confirming all 10 failing cases are
addressed. Re-running the LLM answerer and re-grading is a separate user-triggered step.

---

## Technical Context

**Language/Version**: Node.js 20+ (ES modules); tests run with `node --test`  
**Primary Dependencies**: `connect-four/server/sparseLookahead.js`, `connect-four/server/explainContext.js`, `docs/architecture/feature-vector-glossary.md`  
**Storage**: No DB changes; `eval_set_fv_suff_frozen_vectors.jsonl` regenerated in place  
**Testing**: `npm run test:fast` inside `connect-four/` (`node --test`; never `npm test` which triggers the c4solver IPC hang)  
**Target Platform**: Node.js server  
**Project Type**: Server-side pipeline (feature-vector subsystem only; no frontend, no DB)  
**Performance Goals**: Correctness over speed (project-wide premise). Reachability ceiling requires a real mistake-mode search pass on any root previously searched in optimal mode (Cases 1/2 losing-played branch); this is accepted and required for soundness. No other new solver queries are added.  
**Constraints**: `collectNovelOpportunities` and `compareOpportunities` must not be modified (shared with production annotation gate); all new honest-negative signals must be truthy enums (survive `pruneEmpty` and the answerer's `pruneVector`); production deep-reveal prompt is **out of scope** for this spec — no production behavior is changed or analyzed; the invariant that production must not regress still holds (characterization test), but depth divergence is not bridged or analyzed here. Feature-vector lookahead config: depth=20, one-col-per-score-value (provably equivalent outcome class), no per-candidate budget.  
**Scale/Scope**: 18 frozen eval cases; 3 server-side files; 1 glossary file; ~22 implementation tasks across 3 stories

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] All new signals (`outcomeTiming`, `decisiveLine`, `reachability`, `edgeType`,
  `categoryExamples` symmetric extension) are derived from the existing solver + classifier
  pipeline — no new inference source introduced.
- [x] `pliesToEnd` is derived from the solver score magnitude (confirmed empirically in Story A
  spike) — it is NOT a fabricated move-count.
- [x] The `decisiveLine` completing window comes from actual `immediate_threat` detections inside
  `searchOpportunities` — no cell is invented.

**Principle II — Code Quality & Simplicity**:
- [x] `collectNovelOpportunities` is called a second time with swapped arguments to get the
  played-novel direction — no new function, no modification of shared code.
- [x] `outcomeTiming` is derived free from the pre-move solver query already in
  `runSparseLookahead` (lines 386–390) — no extra solver calls.
- [x] `reachability.ceiling` is computed via a real mistake-mode search pass wherever reachability
  is emitted, including paths (Cases 1/2 losing-played branch) previously searched in optimal mode.
  The "no new search pass" guarantee is replaced by the correctness-over-speed premise. Ceiling must
  always be ≥ floor; the -Infinity→'loss' default is prohibited.
- [x] No speculative abstractions: each new field is a direct projection of an already-computed
  or newly-searched quantity.

**Principle III — Testing Standards**:
- [x] No existing unit tests cover `sparseLookahead.js`/`explainContext.js`/`toFeatureVector`; all
  three stories add tests as part of their definition of done.
- [x] Unit tests use deterministic board fixtures (no random positions); positions sourced from
  the frozen eval set or known-result KB movestrings.
- [x] The characterization test (Story B task 1) uses a fixed eval-set subset and snapshots the
  exact `allowedSet`/`aliasMap` output — making "no regression" objectively decidable.

**Principle VI — Implementation & Debugging Methodology**:
- [x] Story A task 1 (spike) reproduces the solver score-magnitude behavior empirically before
  any field is designed. No `pliesToEnd` formula is assumed.
- [x] Story C task 1 (field-presence audit) confirms which §5A fields are already present in live
  code before any Story C implementation begins. Grade-report field-presence claims are NOT trusted
  blindly (proof: `playedCol` was already at explainContext.js:215).

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] Existing architecture docs were read before this plan was drafted:
  `feature-vector-glossary.md`, `feature-vector-sufficiency-experiment.md`, `api-conventions.md`,
  `server-conventions.md`.
- [x] Every new field introduced by this epic has a lockstep glossary update in its story. No
  field may be shipped without its glossary entry.
- [x] `tasks.md` will include explicit documentation tasks for every new field in §5.3, §5.2,
  §5.1.

---

## Project Structure

### Documentation (this feature)

```text
specs/040-fv-grounding/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (this command)
├── data-model.md        ← Phase 1 output (this command)
└── tasks.md             ← Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory: this epic touches only internal server-side modules and the glossary.
No external API shape changes — `buildExplainContext`'s callers are unaffected.

### Source Code (files touched)

```text
connect-four/
├── server/
│   ├── sparseLookahead.js       ← EXTEND: new return fields (outcomeTiming, decisiveLine,
│   │                               reachability, edgeType, playedNovel on categoryExamples)
│   │                               + ceiling tracking in searchOpportunities
│   └── explainContext.js        ← EXTEND: toFeatureVector projects new fields;
│                                   threatStats adds playerMajorTotal/opponentMajorTotal
└── server/scripts/
    └── eval_set_fv_suff_frozen_vectors.jsonl  ← REGENERATED (run_eval.mjs --no-llm)

docs/architecture/
└── feature-vector-glossary.md   ← UPDATED: §5.1 (patterns* provenance), §5.2 (totals),
                                    §5.3 (new lookahead fields + timing discipline)
```

**No other files touched.** The production prompt (`lookaheadSection` in `explainContext.js`
lines 806–910) must remain functional with no regressions — it is treated as a black box.

---

## Phase 0: Research

### R1 — Solver score-magnitude → moves-to-end mapping (Story A precondition spike)

**Objective**: Empirically verify that `|score|` from `c4solver-wrapper.js::query()` maps to a
concrete move-count (distance-to-decisive-event) before `outcomeTiming.pliesToEnd` is coded.

**Method**: Select 4–6 positions with known game-theoretic distance (e.g., positions where
`visualize_board.sh` + `scr` row shows a nonzero score). Query from both the player-to-move
perspective and the opponent-to-move perspective. Record the raw score and the known distance.

**Expected formula**: `|score|` from c4solver encodes the number of moves until the win/loss
(e.g., `score = +5` means "win in 5 more moves"). The formula from c4solver docs and the
codebase's existing usage in `c4solver-wrapper.js` should confirm this.

**Decision triggers**:
- If the mapping holds cleanly (bijective per score magnitude): `pliesToEnd = Math.abs(score)`.
  A concrete integer is required (per spec §12.2: "the owner explicitly overrode the 'coarse band
  only' recommendation — a raw integer is required if the mapping holds").
- If the mapping is coarse or ambiguous: `pliesToEnd = null`; edgeType falls back to coarse
  branch only (FR-B06b).

**Output**: Document the confirmed formula or fallback in `research.md` §R1 before proceeding to
Story A task 2.

---

### R2 — Field-presence audit (Story C precondition)

**Objective**: Diff the current `toFeatureVector` output + glossary against the §5A target field
list. Confirm every §9 traceability row against live code (not the grade report).

**Method**: Read `explainContext.js::toFeatureVector` (lines 208–275) and `sparseLookahead.js`
return shapes. For each §5A field, note: (a) present in code, (b) present in glossary, (c)
absent from both.

**Known result (pre-audit)**:
- `playedCol`: already emitted at `explainContext.js:215`; absent from frozen vectors only because
  they predate this field. Story C task = verify + regenerate, not new code.
- All other §5A fields: assumed absent; audit confirms.

**Output**: A table in `research.md` §R2: field → present/absent (code + glossary) → action
required (code only / glossary only / both / none / verify-and-regenerate).

---

### R3 — `decisive line` extraction approach within `searchOpportunities`

**Objective**: Determine how to extract the completing 4-window and `winningLinesThroughCell`
without modifying the existing `recordWay`/`extractLookaheadStructures` seam.

**Finding**:
- `immediate_threat` structures are already detected by `classifyPattern` and recorded via
  `recordWay` in `searchOpportunities` (line 225–229). Their `cells` array (from `TIER1` branch)
  is already the grouped way.
- The completing 4-window is the `cells` of the `immediate_threat` entry; the completing cell is
  the one empty cell in that window (gravity-top cell).
- `winningLinesThroughCell` = count of distinct 4-windows on the current board that pass through
  the completing cell — a pure geometry query on `Board`.
- Assembly: in `runSparseLookahead`, after both `bestTally` and `playedTally` are computed, scan
  for the earliest-ply `immediate_threat` way across the tallies (per-side). This is a read-only
  pass over existing tally data — no change to `searchOpportunities`.

**Output**: Confirmed assembly point in `research.md` §R3: assembly happens inside
`runSparseLookahead` after tallies are returned, not inside `searchOpportunities`.

---

### R4 — `reachability.ceiling` tracking

**Objective**: Determine how to compute an honest ceiling (best outcome reachable when the opponent
errs) on every path where `reachability` is emitted, including paths whose root was previously
searched in optimal mode.

**Finding** (updated — correctness-over-speed):
- Reachability is emitted when at least one side's floor is `"loss"` (FR-B04). The ceiling is the
  best outcome reachable under mistake-mode (opponent-errs) search.
- **Case 3** (losing either way): the relevant root is already searched in mistake-mode —
  `ceilingRef` tracking inside that existing search gives the ceiling.
- **Cases 1/2 losing-played branch**: the played root was searched in OPTIMAL mode (line 410),
  so no ceiling is tracked there. A **new explicit mistake-mode search pass** on the played root is
  required to compute an honest ceiling. This replaces the "no new search pass" approach.
- Implementation: add `ceilingRef = { value: -Infinity }` as an optional dep into
  `searchOpportunities`, updated at each player-to-move node. Then:
  - In Case 3: pass `ceilingRef` to the existing mistake-mode best/played searches.
  - In Cases 1/2 losing-played branch: run a new mistake-mode search on the played root with
    `ceilingRef` to obtain the ceiling. Accept the additional solver calls.
- Ceiling invariant: ceiling score ≥ floor score must hold at all times. The -Infinity→'loss'
  default that would produce ceiling<floor is prohibited.

**Output**: Confirmed approach in `research.md` §R4: real mistake-mode search pass for all paths
where reachability is emitted.

---

### R5 — `edgeType` empirical threshold derivation (DEFERRED)

**Status**: DEFERRED to a follow-up iteration after Story A lands and frozen vectors are
regenerated. See `docs/epics/feature-vector-grounding-epic.md §Deferred`.

**Rationale**: K and D thresholds must be empirically derived from `pliesToEnd` values in the
regenerated frozen set. Those values are not available until Story A ships. Deriving thresholds
before regeneration risks mislabeling the very cases this epic fixes.

**What ships in this iteration**: coarse branch only (see data-model §1.4). The coarse branch
is self-sufficient and does not require K/D.

**Deferred method** (for the follow-up): After Story A is complete and frozen vectors are
regenerated, examine `pliesToEnd` values per case. Find K (pliesToEnd ceiling separating
"positional" from "tactical") and D (delta threshold for "marginal") such that the bands correctly
separate the known pass/fail cases.

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for the complete field shapes. Summary of new fields:

**`runSparseLookahead` return** (new fields added to existing return object):
- `outcomeTiming: { best: { outcome, pliesToEnd }, played: { outcome, pliesToEnd } }`
- `decisiveLine: { owner, cells, completingCell, winningLinesThroughCell, fastSide, fastSideRealizedOnPly, slowSideRealizedOnPly } | null`
- `reachability: { best: { floor, ceiling }, played: { floor, ceiling } } | null`
- `edgeType: 'tactical' | 'positional' | 'marginal'`
- `categoryExamples`: each entry extended to `{ tag, bestNovel: [{ cells, realizedOnPly }], playedNovel: [{ cells, realizedOnPly }], novelInstances }`

**`toFeatureVector` output** (projected from above):
- `lookahead.outcomeTiming` (projected directly)
- `lookahead.decisiveLine` (projected; absent = pruned when no horizon match)
- `lookahead.reachability` (projected; absent = pruned when no side is losing)
- `lookahead.edgeType` (truthy enum; always present when lookahead ran)
- `lookahead.categoryExamples` (shape change: each entry now has `bestNovel` and `playedNovel`)
- `threatStats.{pre,best,played}.playerMajorTotal` (new sum field)
- `threatStats.{pre,best,played}.opponentMajorTotal` (new sum field)

**No new contracts directory** — no external API change. `buildExplainContext` callers are
unaffected; the `featureVector` field on the context object grows but callers that ignore unknown
fields are unaffected.

### Shared seam invariant (CRITICAL)

`collectNovelOpportunities(bestTally, playedTally)` and `compareOpportunities(bestTally, playedTally)` must
NOT be modified. The `playedNovel` direction is obtained by calling `collectNovelOpportunities` a
second time with arguments swapped inside `runSparseLookahead` — after the existing calls. The
shared functions' behavior is locked by the Story B characterization test (SC-003 gate).

### Assembly point for new Story A fields

**`outcomeTiming`** is assembled once in `runSparseLookahead` from the pre-move scores (already
in scope at lines 386–390) and spread into **all four return objects** (lines 414-425, 442-455,
458-468, 490-502).

**`edgeType`** is similarly spread into all four return objects. It must be a truthy string present
on every exit path from `runSparseLookahead` — absence would cause the answerer's pruner to strip it
exactly in the positional/losing cases this epic targets.

**`decisiveLine`** is assembled via a small helper (`pickDecisiveLine(tally, owner)`) invoked
**at each of the four return paths** with the correct source tally:
- Cases 1/2 (player wins): player tallies (`bestTally` / `playedTally`) → `owner: 'player'`
- Case 3 (opponent punishes): opponent tally (`oppTally`) → `owner: 'opponent'`

The helper is read-only over existing tally data. A unit test must assert that `edgeType` (and
`outcomeTiming`) is present on ALL four return paths.

`searchOpportunities` receives one new optional dep (`ceilingRef`) for Story B's ceiling tracking.
Additionally, Story B adds a new mistake-mode search pass for the Cases 1/2 losing-played branch
to compute an honest ceiling (see R4).

---

## Execution Sequence

The sequencing constraint is:

1. **Preconditions first** (P1, P2, P3 run in parallel — they are independent):
   - P1: Story A spike (solver magnitude mapping)
   - P2: Story B characterization test created and green
   - P3: Story C field-presence audit

2. **Story A** (starts after P1 resolves):
   - A1: `outcomeTiming` in `runSparseLookahead`
   - A2: Decisive-line detector (assembly in `runSparseLookahead`, read from existing tallies)
   - A3: `winningLinesThroughCell` geometry helper
   - A4: Project `outcomeTiming` + `decisiveLine` into `toFeatureVector`
   - A5: Glossary §5.3 update (new fields + present-vs-projected discipline + `pliesToEnd` ≠ `realizedOnPly`)
   - A6: Unit tests (Story A)

3. **Story B** (starts after P2 is green):
   - B1: `ceilingRef` tracking in `searchOpportunities` (optional dep)
   - B2: `reachability` assembly — new mistake-mode search pass for Cases 1/2 losing-played branch;
         `ceilingRef` on existing mistake-mode passes for Case 3; ceiling invariant (ceiling ≥ floor)
   - B3: `categoryExamples` symmetric extension (swapped second call in `runSparseLookahead`)
   - B4: `edgeType` derivation (coarse branch only in this iteration; fine-grained K/D threshold
         branch is DEFERRED — see epic §Deferred and R5)
   - B5: Project Story B fields into `toFeatureVector` (pruning-safe truthy enums)
   - B6: Verify characterization test still passes
   - B7: Glossary §5.3 + §5.1 updates (symmetric `categoryExamples`, `edgeType`, `reachability`)
   - B8: Unit tests (Story B, including: all-four-return-paths edgeType presence; Case-3
         decisiveLine owner:'opponent' with oppTally; characterization snapshot regression)

4. **Story C** (starts after P3 audit):
   - C1: Add `playerMajorTotal` / `opponentMajorTotal` to `compactThreats` in `toFeatureVector`
   - C2: Verify `playedCol` already emitted (explainContext.js:215 — code only; no change expected)
   - C3: Glossary §5.1 (`patterns*` provenance) + §5.2 (`playerMajorTotal` total relationship)
   - C4: Unit tests (Story C — total fields sum + prune-when-zero)

5. **Final** (after all stories land):
   - F1: Regenerate `eval_set_fv_suff_frozen_vectors.jsonl` via `run_eval.mjs --no-llm`
   - F2: Board spot-check — confirm all 10 failing eval cases are addressed

Stories A, B, C can execute in parallel (given their preconditions) — they touch different fields
and different assembly points. The only merge risk is `toFeatureVector` (all three projects into
it); sequence those projection steps after all three stories' logic lands.

---

## Complexity Tracking

No constitution violations. This epic touches a single server-side subsystem (the feature-vector
pipeline) with no new abstractions, no new external dependencies, and no DB changes.
