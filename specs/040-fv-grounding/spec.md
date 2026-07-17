# Feature Specification: Feature-Vector Grounding

**Feature Branch**: `040-fv-grounding`
**Created**: 2026-06-26
**Status**: Draft
**Epic source**: `docs/epics/feature-vector-grounding-epic.md`

---

## Context (why this exists)

The Feature-Vector Sufficiency Experiment ran `gpt-5.4` against 18 frozen eval cases, feeding it
only the feature vector + glossary and asking it to explain why a move was a blunder. A1 (better
move identified) and A2 (outcomes matched) were **perfect — 53/53**. All 10 failures were A3
(mechanism real and load-bearing) and A4 (no fabrication).

Because A1/A2 are perfect, this is **not** a legibility or capability problem. Every failure is the
vector asserting something untrue or failing to ground something, which the model then faithfully
relayed. Every failing case was positional, deep, or already-losing; every passing case had a
concrete, present, on-board tactic. The vector works when a fact is *present, differential, and
tactical* all at once; it fails the moment any of those three is not obviously true.

**Artifact under test**: the feature vector (`toFeatureVector` in `server/explainContext.js`) + the
glossary (`docs/architecture/feature-vector-glossary.md`). This epic improves **those**, not the
model.

---

## Design principle (spine of all three stories)

Every fact the vector carries must be unambiguous on three axes:

1. **Time** — is this true on the board *now*, or projected N plies into a search?
2. **Causation** — did this feature *change between the two moves*, or is it scenery on both?
3. **Stakes** — what outcome, and *how reachable* (immediate vs deep, forced vs only-if-they-slip)?

---

## Settled decisions (reflect verbatim — do not re-derive)

- **This is the floor test's follow-up.** The artifact under test is the feature vector + glossary,
  not the model. A3 and A4 are the substance.
- **No full move-sequence principal variation.** Gap 7 is addressed by the decisive-line-with-timing
  contrast (Story A) + the free mate distance. A full forcing line is a new fabrication surface and
  is over-specified for a learner.
- **The timing signal requires empirical validation first.** Story A task 1 is a mandatory spike:
  verify the c4solver score-magnitude → moves-to-end mapping before designing or coding
  `outcomeTiming`. If the mapping holds, `pliesToEnd` is a concrete move-count (distance-to-decisive-event),
  derived free from the solver score. If coarse, the fallback is band-only. **The owner explicitly
  overrode the "coarse band only" recommendation — a raw integer is required if the mapping holds.**
- **Played-novel differential uses a second swapped call, not a modified shared function.**
  `collectNovelOpportunities(bestTally, playedTally)` is directional and is shared with the
  production annotation gate. The reverse direction is obtained by calling the same function a second
  time with arguments swapped (or a new pure wrapper). The shared function must be left untouched. A
  characterization test must be green before any seam edit.
- **Decisive-line cells are only available within the search horizon.** For deep/positional wins,
  expose the mate-distance number + honest `edgeType: positional` — never a fabricated line.
- **The differential is cell-set based, not count based, and symmetric.** A category is
  non-differential only when best and played share the same cell-sets. Surface both best-novel and
  played-novel cells.
- **`perCategory` bare-cell redesign is superseded by symmetric `categoryExamples` (Decision 1 /
  Option B).** The bare-cell `perCategory` redesign with `bestNovelCells`/`playedNovelCells` lists
  is NOT introduced. Instead, the existing `categoryExamples` field is extended to be symmetric:
  each entry carries both `bestNovel` cells (present on best line, absent on played line) and
  `playedNovel` cells (present on played line, absent on best line), with `realizedOnPly` timing on
  every cell in both directions. Bare-cell lists without per-cell timing violate the Time axis
  (Design Principle 1) and are prohibited.
- **win-in-1 generalizes to win-in-X and is owner-symmetric.**
- **`losing_either_way` = floor + ceiling.** `floor=loss/ceiling=win` means a punishable
  opponent-mistake line was found within the search. `floor=loss/ceiling=loss` means no such
  line was found within the search — but this is NOT "provably lost" or a "lost cause"; a mistake
  beyond the search horizon may still exist. NEVER phrase ceiling=loss as "lost cause," "you cannot
  win," or "provably lost." A larger `pliesToEnd` on a losing-floor side = slower loss = more
  chances for the opponent to err — read `reachability` and `outcomeTiming` jointly.
- **Pruning trap is a hard constraint.** Both `toFeatureVector`'s prune and the answerer's
  `pruneVector` strip falsey/empty values (glossary §6: absence = "not present"). Every new
  honest-negative signal must be a truthy enum (`edgeType: 'positional'`, `winChance: 'none'`, …) or
  it is invisible exactly when it matters most.
- **Glossary is the model's only spec.** Every field change is a lockstep glossary edit.
- **Scope is feature vector + glossary.** The production deep-reveal prompt (`lookaheadSection`) must
  remain functional with no regressions, but is not rewritten to consume new fields (a later
  trajectory step).
- **Acceptance stops at** code + glossary + unit tests + regenerated
  `eval_set_fv_suff_frozen_vectors.jsonl` + board spot-check. Re-running the `gpt-5.4` answerer and
  re-grading is a separate, user-triggered step.

---

## Non-obvious facts (traps the plan and tasks must respect)

- **`realizedOnPly` is already relative** to the pre-move board and is documented in glossary §5.3.
  Do **not** "convert to relative" — the gap is an *aggregate* signal, not per-cell labeling.
- **`categoryExamples` is already diff-only (best-novel only).** Story B extends it to also carry
  `playedNovel` cells with `realizedOnPly` timing, making it the single symmetric time-stamped
  structure. The old count-based `perCategory` field is not reintroduced.
- **`collectNovelOpportunities` / `compareOpportunities` are shared** between the vector projection
  and the production prompt's `allowedSet`/`aliasMap`. Changing them must not regress production
  annotation — highest-risk seam.
- **Feature-vector lookahead config**: depth=20, one-col-per-score-value (provably equivalent
  outcome class — collapse columns with identical solver scores to one representative), no
  per-candidate budget (correctness-over-speed). Production depth tiers are out of scope for this
  spec; production behavior is not analyzed or changed here.
- **`runSparseLookahead` has FOUR distinct return paths** (not one assembly point). Fields that
  must always be present (`outcomeTiming`, `edgeType`) must be spread into all four return objects.
  `decisiveLine` is assembled via a per-path helper invoked at each return with the correct source
  tally and explicit `owner` field.
- **The solver has no native PV** — `c4solver-wrapper.js::query()` returns per-column scores only.
  Mate distance comes from the score magnitude; do not attempt tree-walk PV synthesis.
- **`sparseLookahead.js` has documented traps**: `selectOpponentMistakeCols` only explores score≤0
  concessions; the INITIAL depth tier; the pre-move query; budget-per-candidate. New detectors must
  not disturb these.
- **Cases 1/2 played root is searched in OPTIMAL mode** (not mistake-mode). If `reachability` is
  emitted for the played side in Cases 1/2, a new mistake-mode search pass on the played root is
  required to compute an honest ceiling. The -Infinity→'loss' ceiling default is prohibited
  (ceiling must be ≥ floor).
- **Movestrings are 0-indexed** (board_state digits 0–6).
- **No existing unit tests** cover `sparseLookahead.js` / `explainContext.js` / `toFeatureVector`.
  Stories must create them. Runner: `npm run test:fast` (inside `connect-four/`).
- **`playedCol` is already present** at `explainContext.js:215` — it was added after the frozen
  vectors were generated. Story C task 1 confirms this before any code is written; no new code is
  needed for this field; only frozen vector regeneration is required.

---

## User Scenarios & Testing *(mandatory)*

### User Story A — Ground threats in time + decisive-line-with-timing contrast (Priority: P1)

**Closes gaps 1, 2, 6, 7 (tactical regime).**

A developer or eval harness consuming the feature vector can determine:
- Whether a listed structure is present on the board *right now* vs realized N plies into a search
- How many moves remain until the decisive outcome appears on each of the two lines (best vs played),
  used comparatively to say "you win/lose faster vs. slower"
- Which concrete 4-window completes the decisive win (when it falls within the search horizon),
  including whether it is a single-line win or a genuine multi-line fork

**Why this priority**: The two highest-impact gaps (projected structures read as present tactics;
`immediate_threat` cells with no grounding) account for 9 of the 10 failed cases. This story
directly closes those gaps.

**PRECONDITION (Story A task 1)**: Before any new field is designed or coded, empirically verify the
c4solver score-magnitude → moves-to-end mapping on known-distance positions in both query
perspectives and document the confirmed formula (or fallback). `outcomeTiming` and `edgeType` are
contingent on this result — do not proceed to task 2 until the spike resolves.

**Independent Test**: Can be tested by regenerating the 18 frozen vectors and confirming the
targeted counterexamples (eval-6, eval-12, eval-29, eval-42, eval-51) are retired when re-graded —
independently of Stories B and C.

**Acceptance Scenarios**:

1. **Given** a position where the better line wins in 5 moves and the played line draws, **when**
   the feature vector is generated, **then** `lookahead.outcomeTiming.best.pliesToEnd` is 5 and
   `.played.pliesToEnd` is null (draw), allowing "you win 5 moves faster on the better move."

2. **Given** a position where the better line contains a concrete 4-window completing at ply 3,
   **when** the feature vector is generated, **then** `lookahead.decisiveLine.cells` names the
   completing window and `fastSideRealizedOnPly` is 3.

3. **Given** a position that is deep/positional (no near-term forcing line), **when** the vector
   is generated, **then** `lookahead.decisiveLine` is absent (pruned), `lookahead.edgeType` is
   `"positional"` (truthy, survives pruning), and no fabricated line is emitted.

4. **Given** a position with a single-line immediate win (not a fork), **when** the vector is
   generated, **then** `lookahead.decisiveLine.winningLinesThroughCell` is 1, preventing the
   "double threat" mislabel (gap 6).

5. **Given** a horizon-exceeded case where mate distance is known but no line fits the search
   depth, **when** the vector is generated, **then** `outcomeTiming.pliesToEnd` is present with the
   solver-derived count, `decisiveLine` is absent, and `edgeType` is `"positional"`.

---

### User Story B — Frame causation and stakes (Priority: P2)

**Closes gaps 1 (positional), 3, 4.**

A consumer of the feature vector can determine:
- Which threat/pattern categories actually *changed* between the best line and the played line (so
  the model cannot anchor on a non-differential feature as the decisive reason)
- Whether a win chance survives under perfect opponent play vs. only if the opponent slips
- Whether the position is a tactical fight, a positional game, or a marginal difference (honest
  `edgeType` signal)
- For `losing_either_way` cases, whether the played move made the loss worse or both moves are
  equivalent dead losses
- **Reading `reachability` + `outcomeTiming` jointly**: on a losing-floor side, a larger
  `outcomeTiming.pliesToEnd` means the game takes longer to resolve = more turns for the opponent
  to err. `reachability.*.ceiling = 'win'` confirms a punishable mistake was found within the
  search depth. These two fields together let the consumer say "this move loses, but it buys
  more time / creates more opponent-slip opportunities than the alternative" — which is the core
  reason a losing-floor move can still be the better choice.

**Why this priority**: The "no decisive differentiator" and "`losing_either_way` mislabeled" gaps
drove failures in eval-42, eval-56, eval-10, eval-8. Addressing them requires editing the shared
`collectNovelOpportunities` / `compareOpportunities` seam — which demands the characterization-test
gate run first.

**PRECONDITION (Story B task 1)**: A characterization test snapshotting the current `allowedSet` /
`aliasMap` output on a fixed set of positions must be created and passing before any edit to
`collectNovelOpportunities` or `compareOpportunities`. "No regression" means that snapshot is
unchanged after all seam edits.

**Independent Test**: Can be tested by confirming eval-0, eval-8, eval-10, eval-42, and eval-56 are
retired when the regenerated frozen vectors are spot-checked — independently of Stories A and C.

**Acceptance Scenarios**:

1. **Given** a position where a j_shape threat is identical on both the best and played boards,
   **when** the feature vector is generated, **then** that j_shape category is absent from
   `lookahead.categoryExamples` (cell-set tie dropped — not a differentiator).

2. **Given** a position where a major threat at c5r4 appears only on the played line (not the best
   line), **when** the vector is generated, **then**
   `lookahead.categoryExamples['j_shape'].playedNovel` includes `{cell: "c5r4", realizedOnPly: N}`
   and `bestNovel` is empty (absent) for that category.

3. **Given** a `losing_either_way` position where the played move does not create any new opponent
   threats but the position is already lost, **when** the vector is generated, **then**
   `lookahead.reachability.best.floor` = `"loss"` and `lookahead.reachability.played.floor` =
   `"loss"`, allowing "both moves lose; the difference is resistance quality, not causation."

4. **Given** a position where the opponent can only win if they play optimally (no realistic slip
   available), **when** the vector is generated, **then**
   `lookahead.reachability.*.ceiling` reflects the best outcome reachable within the search, with
   wording scoped to "within the search" (never "provably").

5. **Given** a tactically sharp position (outcome flip within shallow search), **when** the vector
   is generated, **then** `lookahead.edgeType` is `"tactical"`.

6. **Given** the characterization test snapshot was taken, **when** Story B edits to
   `collectNovelOpportunities` are applied, **then** the characterization test still passes
   unchanged.

---

### User Story C — threatStats legibility + grounding ride-alongs (Priority: P3)

**Closes gaps 5, 8, 9.**

A consumer of the feature vector can determine:
- The total number of player/opponent major threats at each snapshot (so "0 parity-aligned majors"
  cannot be misread as "no majors")
- The exact column the player played (not just the landing cell)
- Which board snapshot each `patterns*` map describes (provenance documented unambiguously in the
  glossary)

**Why this priority**: These are cheaper, cross-cutting fixes. Story C task 1 (field-presence audit)
must run first to confirm which §5A fields are already present vs genuinely missing, preventing
redundant work.

**FIRST — field-presence audit**: Before coding anything, confirm which §5A fields are already
present in the current `toFeatureVector` output vs. genuinely missing. Every §9 traceability row
must be re-validated against live code. The grade report's field-presence claims may be stale (proof:
`playedCol` was already at `explainContext.js:215` when the report was written).

**Independent Test**: Can be tested by confirming eval-12, eval-15 (parity totals), and eval-29/42
(provenance) are retired when spot-checked against the regenerated frozen vectors — independently of
Stories A and B.

**Acceptance Scenarios**:

1. **Given** a position where `playerMajorParityAligned.count` is 0 but a non-parity major exists,
   **when** the feature vector is generated, **then** `threatStats.played.playerMajorTotal` is
   non-zero, making the total explicitly visible alongside the parity breakdown.

2. **Given** a position where `playerMajorNonParity.count` is 2, **when** the feature vector is
   generated, **then** `playerMajorTotal` = `playerMajorParityAligned.count` +
   `playerMajorNonParity.count` ≥ 2 (the totals are consistent and non-zero).

3. **Given** a frozen vector regenerated after this epic, **when** `playedCol` is read from the
   vector, **then** it matches the 0-indexed column of the played move (field is present on all
   records, not absent as in the pre-epic frozen vectors).

4. **Given** the glossary §5.1, **when** a reader asks which board state `patternsOpponent`
   describes, **then** the glossary gives an unambiguous answer with the snapshot provenance
   stated explicitly.

---

### Edge Cases

- What happens when the search horizon is exceeded and no decisive line is found? (Story A — must
  emit `edgeType: 'positional'`, omit `decisiveLine`, retain `outcomeTiming.pliesToEnd` if solver
  magnitude confirms it.)
- What happens when both moves are exactly equivalent by cell-set (true tie in `categoryExamples`)?
  (Story B — that category is dropped; this is correct and intentional per settled decisions.)
- What happens when `pliesToEnd` is unavailable because the spike shows the mapping is coarse?
  (Story A / Story B — `pliesToEnd` is null; `edgeType` is still emitted using the coarse branch:
  `"tactical"` if the outcome (win/draw/loss) differs between best and played lines within the
  search; `"positional"` if no decisive line is found within the horizon; `"marginal"` if both sides
  share the same outcome. Fallback to omission is prohibited.)
- What happens if `playerMajorParityAligned` and `playerMajorNonParity` are both absent (pruned)?
  (Story C — `playerMajorTotal` would be 0 and is itself pruned; absence correctly means "no
  majors.")
- What happens when `collectNovelOpportunities` is called with swapped arguments and the result
  is an empty set (no played-novel categories)? (Story B — `playedNovel` is absent for that
  category in `categoryExamples` per the pruning rule; a category entry without either direction is
  dropped entirely.)
- What happens when `reachability` floor = loss and ceiling = loss on both sides? (Story B —
  present as `reachability.best.floor = 'loss', ceiling = 'loss'`; `reachability.played` same;
  both are emitted as truthy enums and survive pruning.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Story A — Time grounding + decisive-line-with-timing contrast**

- **FR-A01**: Before designing `outcomeTiming` or `edgeType`, the system MUST empirically verify
  the c4solver score-magnitude → moves-to-end mapping on known-distance positions in both query
  perspectives; this spike result MUST be documented before any Story A task 2+ proceeds.

- **FR-A02**: The feature vector MUST expose `lookahead.outcomeTiming` with per-side `outcome`
  (win/draw/loss) and `pliesToEnd` (concrete move-count derived from solver magnitude, or null if
  draw or spike shows mapping is coarse).

- **FR-A03**: `pliesToEnd` MUST be a distance-to-decisive-event (how many moves until the specific
  pattern/outcome appears), used comparatively between the best and played lines. It MUST NOT be raw
  solver-score magnitude exposed bare.

- **FR-A04**: `pliesToEnd` MUST be kept distinct from `realizedOnPly` (mistake-branch depth) in
  both code and glossary; the two fields measure different things and must carry different labels.

- **FR-A05**: The system MUST expose `lookahead.decisiveLine` with the completing 4-window, the
  completing cell, the count of winning lines through that cell (`winningLinesThroughCell`), the
  `fastSide` (which move line surfaces this win soonest), and per-side `realizedOnPly`.

- **FR-A06**: `decisiveLine` MUST be owner-symmetric — it MUST record wins for either the player
  or the opponent, whichever is the decisive actor.

- **FR-A07**: When no concrete completing window falls within the search horizon, `decisiveLine`
  MUST be absent (pruned), `edgeType` MUST be `"positional"` (a truthy enum), and no fabricated
  line MUST be emitted.

- **FR-A08**: `winningLinesThroughCell` MUST correctly distinguish a single-line win (count = 1)
  from a genuine fork (count > 1), retiring the "double threat" mislabel (gap 6).

- **FR-A09**: All new fields MUST be computed in shared search code so both the eval
  (`lookaheadDepth: 20`) and production (tiered depth) inherit them.

- **FR-A10**: Glossary §5.3 MUST be updated in lockstep: new fields documented, present-vs-projected
  discipline stated, `pliesToEnd` ≠ `realizedOnPly` ≠ "mate distance" explicitly called out.

- **FR-A11**: Unit tests MUST cover the per-side timing signal, the decisive-line detector (win-in-X,
  owner-symmetric), the horizon-exceeded case (timing present, line absent), and the
  single-vs-multi-line counter.

- **FR-A12**: The 18 frozen vectors MUST be regenerated via `run_eval.mjs --no-llm` after all Story
  A projections land; board spot-check MUST confirm eval-6, eval-12, eval-29, eval-42, eval-51 are
  retired.

---

**Story B — Causation and stakes**

- **FR-B01**: Before any edit to `collectNovelOpportunities` or `compareOpportunities`, a
  characterization test MUST be created that snapshots the current `allowedSet` / `aliasMap` output
  on a fixed set of positions, and that test MUST be green before any seam edit is made.

- **FR-B02**: The vector MUST extend `lookahead.categoryExamples` to be a cell-set-based, symmetric
  diff: each entry MUST carry both `bestNovel` (cells present on best line, absent on played line)
  and `playedNovel` (cells present on played line, absent on best line), with `realizedOnPly` timing
  on every cell in both directions. The old count-based `{bestInstances, playedInstances}` shape of
  `perCategory` is NOT reintroduced; bare-cell lists without per-cell timing violate Axis 1 (Time)
  and are prohibited.

- **FR-B03**: A category MUST appear in `categoryExamples` only when its cell-sets differ between
  the two lines (true cell-set ties are dropped). The played-novel direction MUST be obtained by
  calling `collectNovelOpportunities` a second time with its two arguments swapped — the shared
  function must not be modified.

- **FR-B04**: The system MUST expose `lookahead.reachability` with per-side `floor` (outcome under
  perfect opponent play) and `ceiling` (best outcome reachable if the opponent errs, within the
  search). Emitted only when at least one side's floor is "loss".

- **FR-B05**: `reachability.*.ceiling` wording in the glossary MUST be "best outcome found within
  the search" — never "provably" (the search is bounded).

- **FR-B06**: The system MUST expose `lookahead.edgeType` as a truthy enum (`"tactical"` |
  `"positional"` | `"marginal"`), derived via the **coarse branch** (shipped in iteration 1 as a
  MUST) using a total ordered if/else: `"tactical"` when outcomes diverge between the two lines;
  `"positional"` when no decisive line is found within the search horizon (`decisiveLine` absent);
  `"marginal"` (catch-all) otherwise — same outcome on both lines regardless of whether a decisive
  line was found on one or both sides. `edgeType` MUST be emitted on all four return paths — omission
  is prohibited. The **fine-grained branch** (K/D numeric thresholds from `pliesToEnd` values) is
  **DEFERRED** to a follow-up iteration after Story A ships and the frozen vectors are regenerated
  with real `pliesToEnd` values; K and D must be derived empirically and cannot be set before those
  values exist.

- **FR-B07**: All new signals (`categoryExamples` symmetric extension, `reachability`, `edgeType`)
  MUST be truthy enums or non-empty containers — they MUST survive both `toFeatureVector`'s
  `pruneEmpty` and the answerer's `pruneVector`.

- **FR-B08**: The production annotation gate (`allowedSet` / `aliasMap` from `lookaheadSection`)
  MUST behave identically after all Story B edits; the characterization test MUST remain green.

- **FR-B09**: Glossary §5.3 MUST be updated: `categoryExamples` symmetric extension shape (with
  per-cell `realizedOnPly` in both `bestNovel` and `playedNovel` directions), `edgeType` values and
  both derivation branches (fine-grained and coarse), `reachability` floor/ceiling semantics, "no
  chance found within search" wording.

- **FR-B10**: Unit tests MUST cover the `categoryExamples` symmetric extension (including a true-tie
  case that drops a category, and both `bestNovel` and `playedNovel` directions with `realizedOnPly`
  timing), `reachability` floor/ceiling (both sides losing, one-side losing), `edgeType`
  classification for tactical / positional / marginal regimes in both fine-grained and coarse
  branches, and regression of the characterization snapshot.

- **FR-B11**: Board spot-check MUST confirm eval-0, eval-8, eval-10, eval-56 are retired.

---

**Story C — threatStats legibility + grounding ride-alongs**

- **FR-C01**: Before writing any Story C code, the system MUST audit which §5A fields are already
  present in the current `toFeatureVector` output vs. genuinely missing; every §9 traceability row
  MUST be re-validated against live code.

- **FR-C02**: Each `threatStats.<state>` snapshot MUST expose `playerMajorTotal` and
  `opponentMajorTotal` (sum of parity-aligned + non-parity buckets), so that a zero in a parity
  bucket cannot be misread as "no majors."

- **FR-C03**: `playerMajorTotal` / `opponentMajorTotal` MUST be omitted (pruned) when the total
  is zero (consistent with the pruning-trap rule — absence = "no majors" is correct).

- **FR-C04**: The system MUST verify `playedCol` is already emitted by `toFeatureVector`
  (explainContext.js:215); if confirmed present, no new code is required for this field.

- **FR-C05**: The frozen vector set (`eval_set_fv_suff_frozen_vectors.jsonl`) MUST be regenerated
  to capture the current `toFeatureVector` state (including `playedCol` and the new total fields).

- **FR-C06**: The glossary §5.1 MUST be updated to state, for each `patterns*` map
  (`patternsPreMove`, `patternsBest`, `patternsPostBlunder`, `patternsOpponent`), which board
  snapshot it describes — explicitly and unambiguously.

- **FR-C07**: The glossary §5.2 MUST be updated to state that `playerMajorParityAligned` and
  `playerMajorNonParity` are **subsets** of the major-threat total, and that "0 parity-aligned ≠ 0
  majors."

- **FR-C08**: Unit tests MUST cover the new total fields (sum correct, pruned when zero, consistent
  across all three snapshots).

- **FR-C09**: Board spot-check MUST confirm eval-12, eval-15 (parity totals), and eval-29/42
  (provenance in glossary) are addressed.

---

### Key Entities

- **Feature vector**: the compact, board-grounded projection of a single Compare-Two-Moves decision,
  produced by `toFeatureVector` and consumed by the LLM answerer.
- **Glossary** (`feature-vector-glossary.md`): the model's only spec; defines every field and value.
- **Frozen vector set** (`eval_set_fv_suff_frozen_vectors.jsonl`): 18 eval cases; regenerated after
  each projection change (18 case selections stay constant; vector contents may change).
- **`outcomeTiming`**: new lookahead sub-object: per-side outcome + `pliesToEnd` (distance-to-decisive-event).
- **`decisiveLine`**: new lookahead sub-object: the completing 4-window, owner, `winningLinesThroughCell`,
  and per-side `realizedOnPly`.
- **`reachability`**: new lookahead sub-object: per-side `floor` / `ceiling` (perfect-opponent vs
  opponent-slips outcomes).
- **`edgeType`**: new truthy-enum lookahead field: `"tactical"` | `"positional"` | `"marginal"`.
- **`categoryExamples` (extended)**: existing per-category best-novel cells extended to be symmetric;
  each entry now carries both `bestNovel` and `playedNovel` directions, with `realizedOnPly` timing
  on every cell. Replaces the old count-based `perCategory` table.
- **`playerMajorTotal` / `opponentMajorTotal`**: new `threatStats` fields summing aligned + non-parity
  major buckets.

---

## Counterexample → field traceability (§9)

This table is a first-class deliverable: it must survive into future trajectory iterations so grader
failures are not regressed by forgetting their fix.

| Grader counterexample | Cases | Fixing field/change | Glossary § | Story |
|---|---|---|---|---|
| Lookahead projections read as present tactics | eval-0,8 | `edgeType` + present-vs-projected discipline | §5.3 | B (A supports) |
| `immediate_threat` cells ungrounded (no playability/win/line) | eval-6,10,29,42,51 | `decisiveLine` (win-in-X, owner-symmetric) + completing window | §5.3 | A |
| No decisive differentiator | eval-10,42,56 | symmetric `categoryExamples` with `playedNovel` + per-cell timing | §5.3 | B |
| `losing_either_way` mislabeled | eval-8,10,42,56 | `reachability` floor/ceiling | §5.3 | B |
| Parity-major collapses "exists" vs "useful" | eval-12,15 | `playerMajorTotal` / `opponentMajorTotal` | §5.2 | C |
| No "number of winning lines" | eval-12 | `decisiveLine.winningLinesThroughCell` | §5.3 | A |
| "How converts / why faster" | nearly all | `outcomeTiming.pliesToEnd` + `decisiveLine` contrast | §5.3 | A |
| `playedCol` absent from frozen vectors | eval-12 | verify already emitted (explainContext.js:215); regenerate frozen vectors | §2 | C |
| Snapshot provenance ambiguous | eval-29,42 | `patterns*` provenance (glossary only) | §5.1 | C |

---

## Open design decisions (must be resolved in /clarify or /plan — do not invent silently)

1. **`edgeType` fine-grained thresholds**: The coarse-case derivation rule is now closed (FR-B06).
   Remaining open: the numeric K and D thresholds for the fine-grained branch (when `pliesToEnd` is
   available) — positional when pliesToEnd is within K of game end; marginal when both sides share
   an outcome and their pliesToEnd differ by ≤ D; tactical otherwise. K and D MUST be derived
   empirically from the 18 frozen eval cases after the Story A spike confirms the pliesToEnd mapping
   — not set to arbitrary constants.

2. **`pliesToEnd` derivation**: contingent on Story A task 1 spike. If the mapping is confirmed, a
   raw integer is required. If coarse, the coarse-case `edgeType` branch (FR-B06b) applies.
   Document confirmed formula or fallback in the spike output before proceeding.

3. **`decisiveLine` extraction horizon**: how deep the search reports a concrete completing line
   before falling back to `null`, tied to the depth tiers (eval depth 20 vs production 10/8/4).

4. **`categoryExamples` near-tie policy**: §6 settles cell-set equality as the drop rule; confirm
   no residual count-magnitude signal (e.g. 25-vs-23 minors) needs surfacing alongside the
   `bestNovel`/`playedNovel` cell diff.

---

## Out of scope

- No full move-sequence principal variation / forcing line.
- No production prompt rewrite (kept functional only; not enhanced to use the new fields).
- No re-running the `gpt-5.4` answerer or re-grading inside the epic (separate user-triggered step).
- No changes to blunder detection / tagging / `classifier.js`.
- No changes to `c4solver-wrapper.js` (no PV synthesis).
- No derived "undercuttable: yes/no" verdict.
- No count-threshold tuning or bare-cell redesign of `perCategory` (superseded by Option B —
  `categoryExamples` symmetric extension).
- Not testing other models or the `gpt-5.4-mini` dial (later trajectory step).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 10 failing cases (eval-0, 6, 8, 10, 12, 15, 29, 42, 51, 56) show no A3/A4
  fabrication when the regenerated frozen vectors are spot-checked via `visualize_board.sh` + solver.
  (Board spot-check is the verifier; re-running the LLM answerer is a separate, user-triggered step.)

- **SC-002**: Every new honest-negative signal (`edgeType: 'positional'`, `reachability` floor/
  ceiling, absent `playedNovel` in `categoryExamples`) survives `toFeatureVector`'s `pruneEmpty`,
  confirmed by unit tests. Survival through the answerer's `pruneVector` (in
  `explain_from_vector.mjs`) is guaranteed by the signals being truthy enums or non-empty
  containers, and is not a separately tested assertion (the answerer is out of scope for this epic).

- **SC-003**: The production deep-reveal prompt builds with no regression — `lookaheadSection` /
  `allowedSet` / `aliasMap` output is byte-identical before and after all edits, confirmed by the
  Story B characterization test.

- **SC-004**: `npm run test:fast` (inside `connect-four/`) is green for all new unit tests added
  by Stories A, B, and C.

- **SC-005**: The `eval_set_fv_suff_frozen_vectors.jsonl` file is regenerated via `run_eval.mjs
  --no-llm` and every new/changed field documented in the glossary appears with a non-empty value
  in at least one of the 18 frozen records.

- **SC-006**: The §9 counterexample → field traceability table is present in the spec and
  cross-referenced in the glossary, so future trajectory iterations have a concrete record of which
  field retires which failure.

---

## Assumptions

- The c4solver score-magnitude → moves-to-end mapping will be validated empirically (Story A task 1
  spike) before any `outcomeTiming` field is coded; if the mapping is coarse, `pliesToEnd` is null
  and the fallback is band-only.
- The 18 frozen eval cases (their selections) remain constant throughout the epic; only vector
  contents are regenerated after projection changes.
- `npm run test:fast` (inside `connect-four/`) is the test runner for all new unit tests; `npm test`
  (with `candidate-generator.test.js`) is not used during this epic.
- The production deep-reveal prompt (`lookaheadSection`) is treated as a black box during this
  epic — it must remain functional but will not be updated to consume the new fields; that is a
  future trajectory step.
- The `edgeType` band thresholds (K, D) will be derived empirically from the 18 frozen eval cases
  after the Story A spike completes, not set to arbitrary constants.
- `playedCol` is already present in `toFeatureVector` (explainContext.js:215 as of epic creation);
  Story C task 1 confirms this; no new code is required for that field.
- The eval/production depth divergence (`lookaheadDepth: 20` in the frozen set vs. INITIAL=10 /
  EARLY=8 / default=4 in production) is accepted for this iteration. Frozen-set retirement via board
  spot-check does NOT imply production emission of new fields until production search depth tiers are
  revisited in a future trajectory step.
