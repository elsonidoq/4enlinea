# Feature-Vector Grounding Epic

**Status:** ready for spec (created 2026-06-26)
**Owner artifact under test:** the **feature vector** (`toFeatureVector` in `server/explainContext.js`)
+ the **glossary** (`docs/architecture/feature-vector-glossary.md`). This epic improves *those*, not
the model.

---

## 1. Why this exists

The Feature-Vector Sufficiency Experiment
(`docs/architecture/feature-vector-sufficiency-experiment.md`) ran a **floor test**: a strong model
(`gpt-5.4`) was given *only* the feature vector + glossary and asked to explain why a move was a
blunder. The grader (`server/scripts/fv_suff_answers_2026-06-26T18-15-36Z_grade_report.md`) scored 18
cases on four axes:

- **A1 (better move) 53/53**, **A2 (outcomes) 53/53** — the model can always *read* the vector.
- **A3 (mechanism real & load-bearing) 32/53**, **A4 (no fabrication) 29/53** — **all 10 failures
  were A3/A4.**

Because A1/A2 are perfect, this is **not** a legibility or capability problem. Every failure is the
vector **asserting something untrue** or **failing to ground something**, which the strong model then
faithfully relayed. Every failing case was in a **positional, deep, or already-losing** position; every
passing case had a concrete, present, on-board tactic. So the vector works when a fact is *present,
differential, and tactical* all at once, and fails the moment any of those three is not obviously true.

This epic makes those three properties explicit so a model only ever **narrates**, never **infers**.

## 2. The design principle (the spine of every story)

Every fact the vector carries must be unambiguous on **three axes**. The grader's failures map cleanly
onto the axis that was left ambiguous:

1. **Time** — is this true on the board **now**, or projected N plies into a search? (drove gaps 1, 2, 9)
2. **Causation** — did this feature **change between the two moves**, or is it scenery present on both? (gaps 3, 4)
3. **Stakes** — what outcome, and **how reachable** (immediate vs deep, forced vs only-if-they-slip)? (gaps 2, 4, 6, 7)

## 3. Goal & outcomes

A feature vector in which: (a) present-board threats are never confusable with projected structures;
(b) only what *differs* between the two moves is presented as a reason; (c) the model is told whether a
winning chance survives and how fast each side wins/loses; and (d) parity-bucketed threat counts can't
be misread as "no threats." Plus a glossary updated in lockstep, since it is the model's only spec.

**Pipeline justification.** This is a single-subsystem change (the feature-vector pipeline — no
frontend/DB) and §6 settles much of the design, which by the best-practices doc's sizing test argues
*against* the full speckit pipeline. It nonetheless earns the pipeline + manager overhead because: (a)
~22 tasks across three stories; (b) the high-risk shared `collectNovelOpportunities` /
`compareOpportunities` seam (vector projection ↔ production annotation gate) warrants a critique gate
before each artifact; (c) it is iteration 1 of a multi-pass trajectory whose value is durable
counterexample→field traceability; and (d) real design decisions remain open (§12). If §12 collapses to
trivial defaults during clarify, downgrade to direct task-writing.

## 4. The gaps the grader found (requirements source)

| # | Gap | Cases | Axis |
|---|-----|-------|------|
| 1 | Projected lookahead structures read as **present-board** tactics | eval-0, 1, 2, 8 | Time |
| 2 | `immediate_threat` cells with **no playability / win / line grounding** | eval-6, 10, 29, 51, 42 | Time |
| 3 | **No decisive differentiator** — threats identical on both lines cited as the reason | eval-42, 56, 10 | Causation |
| 4 | **`losing_either_way` mislabeled** — direction implies a loss the move didn't cause | eval-8, 10, 42, 56 | Stakes |
| 5 | **Parity-major counts collapse "major exists" vs "parity-useful"** → "no majors / only minors" | eval-15, 12 | legibility |
| 6 | **No "number of winning lines"** → single-line win called a "double threat" | eval-12 | Stakes |
| 7 | **No way to say "how the win converts / why faster"** (the dominant honest abstention) | nearly all | Stakes |
| 8 | `playedCol` not exposed (only `playedCell`) | eval-11, 12 | trivial |
| 9 | `patternsOpponent` snapshot provenance ambiguous (pre-move vs played-line) | eval-42, 29 | Time |

The full traceability (which field retires which counterexample) is in §9.

## 5. User stories

Each story is independently testable and re-gradeable. Tasks are indicative; the spec/tasks stages own
the final task list.

### Story A — Ground threats in *time* + a decisive-line-with-timing contrast
**Closes gaps 1, 2, 6, 7 (tactical regime).**

The win-in-1 idea generalizes to **win-in-X**, made **owner-symmetric** (player *or* opponent winning
line), and is paired with a **timing signal** (see §6 + §12.2) expressing *how many moves until a
decisive pattern/outcome appears*, used **comparatively** between the best line and the played line to
justify "you win/lose faster vs. slower." This is a distance-to-decisive-event, not a raw solver-score
magnitude exposed bare. For deep/positional wins where no line is reachable, this story defers to
Story B's positional signal rather than inventing a line.

**PRECONDITION task (task 1) gates the rest of this story:** the c4solver score-magnitude → moves-to-end
mapping must be empirically confirmed before `outcomeTiming` and `edgeType` fields are designed or coded.
If the mapping is coarse, the fallback is band-only (no raw integer) — but a concrete move-count IS
required if the mapping holds (see §12.2).

Indicative tasks:
1. **Empirical validation spike:** on a small set of known-distance positions (both query perspectives),
   verify the c4solver score magnitude → moves-to-end mapping; document the confirmed formula (or the
   coarseness limit). `outcomeTiming` and `edgeType` are **contingent** on this result — do not proceed
   to task 2 until the spike is resolved.
2. Per-side **timing signal** from the confirmed solver formula (optimal-play distance-to-decisive-event;
   free — no extra queries). Labeled as `pliesToEnd` in `outcomeTiming`; see §5A and §12.2.
3. **Decisive winning-line detector** in the search: record the completing 4-window for the winning
   side, within the search horizon, with its `realizedOnPly` (= X).
4. Generalize win-in-1 → **win-in-X**, **owner-symmetric**.
5. Assemble the **best-vs-played contrast** in `runSparseLookahead` (line present/fast here vs
   delayed/gone there).
6. Project into `toFeatureVector` (pruning-safe; labeled **distinct from `realizedOnPly`**).
7. Glossary §5.3 rewrite: new fields + present-vs-projected discipline + timing-signal ≠ realizedOnPly.
8. Unit tests, incl. a **horizon-exceeded** case that returns timing signal only (no line).
9. Regenerate the affected frozen vectors; board spot-check eval-12/42/43/59/51/29.

### Story B — Frame *causation* and *stakes*
**Closes gaps 1 (positional), 3, 4.**

**Shared-seam precondition:** `collectNovelOpportunities(bestTally, playedTally)` is directional
(best-minus-played) and is **shared** with the production annotation gate (`allowedSet`/`aliasMap` in
`lookaheadSection`). The played-novel direction (played-minus-best) must be obtained by calling the
**same function a second time with its two arguments swapped** (or via a new pure wrapper that does exactly
that), leaving the shared function **untouched**. A **characterization test** snapshotting the current
`lookaheadSection` / `allowedSet` / `aliasMap` output on a fixed set of positions must be created and
passing **before any edit to `collectNovelOpportunities` or `compareOpportunities`** — "no regression"
means that snapshot is unchanged after all seam edits.

Indicative tasks:
1. **Characterization test (precondition gate):** snapshot the live coach's current `allowedSet` /
   `aliasMap` output on the eval set (or a fixed subset); this test must be green before any seam edit.
2. **Cell-aware, symmetric** differential: a category is non-differential only when best and played have
   the **same cell-sets**; surface **best-novel AND played-novel** cells. Implement played-novel as a
   second call to `collectNovelOpportunities` with arguments swapped (pure, shared function untouched).
3. Reshape `perCategory` to that symmetric cell diff (drop only true cell-set ties).
4. **Winnable-if-opponent-errs** detector: track the max player score reached at any player node, **per
   root** → a floor/ceiling pair (floor = outcome with perfect opponent play; ceiling = best outcome
   reachable if the opponent slips).
5. **`edgeType` / horizon-band** signal: tactical vs positional vs marginal. Thresholds **derived
   empirically** from the 18 frozen eval cases (tune K/D so the bands correctly separate the known
   pass/fail cases — see §12.1); the honest "no near-term tactic" flag for eval-0/8.
6. Make all three **pruning-safe truthy enums** (see §6 — falsey/empty is stripped before the model sees it).
7. Wire returns + projection; confirm characterization test still passes.
8. Glossary updates (new `perCategory` shape, `edgeType`, reachability; "no chance found **within
   search**" wording — never "provably lost").
9. Unit tests + board spot-check eval-0/2/8/10/56.

### Story C — threatStats legibility + grounding ride-alongs
**Closes gaps 5, 8, 9.** (Glossary-heavy; bundles the cheap cross-cutting fixes.)

**FIRST: diff current output vs §5A.** Before coding anything, task 1 confirms which §5A fields are
already present vs genuinely missing, so no Story creates redundant work. The grade report is the
requirements source but its field-presence claims may be stale (proof: `playedCol` was already implemented
at explainContext.js:215 before the frozen vectors were generated). Every §9 row must be re-validated
against live code.

Indicative tasks:
1. **Field-presence audit:** diff the current `toFeatureVector` output + glossary against the §5A target
   field list; re-confirm every §9 traceability row against live code rather than the grade report; demote
   any §5A field already present to 'verify + regenerate' status and document findings for the spec author.
2. Glossary: clarify that `playerMajorParityAligned` / `…NonParity` are **subsets** of the major-threat
   total — **0 parity-aligned ≠ 0 majors** (the eval-12/15 fabrication).
3. `threatStats` projection: make the major total (or the aligned/non-aligned relationship) explicit so
   "no parity-aligned major" cannot read as "only minors."
4. **Verify `playedCol`** is already emitted by `toFeatureVector` (explainContext.js:215 as of epic
   creation); confirm the frozen vectors pre-date this field and therefore misrepresent it as absent.
   Regenerate frozen vectors to capture the current state — no new code required for this field.
5. Verify in code which board `patternsOpponent` (and each `patterns*` map) actually describes — pre-move
   vs played-line — and document the resolved truth in the glossary (§5.1).
6. Glossary §5.1: state each map's **snapshot provenance** explicitly.
7. Unit tests for the threatStats projection change.
8. Board spot-check eval-12/15 (parity), eval-11 (playedCol), eval-42/29 (provenance).

## 5A. Target feature-vector shape (the contract)

The new/changed fields, given as concrete shape so the spec author does not invent them. Cells are
`cNrM`, 1-indexed (glossary §1); columns are 0-indexed. **Every value below that can be falsey/empty
must be a truthy enum or it is pruned — see §6.** Glossary edits land in the sections named in §9. Exact
band cutoffs / derivations flagged below are **open** — see §12.

### Top-level field (Story C — verify already present)
```jsonc
"playedCol": 3            // 0-indexed column of the played move (sibling of bestCol)
                          // NOTE: already emitted by toFeatureVector (explainContext.js:215);
                          // absent from frozen vectors only because they predate this field.
                          // Story C task: verify presence, then regenerate frozen vectors.
```

### threatStats — per state (pre / best / played): parity legibility (Story C)
```jsonc
// ADD to each threatStats.<state>:
"playerMajorTotal":   2,  // = playerMajorParityAligned.count + playerMajorNonParity.count
"opponentMajorTotal": 1
// Rationale: a 0 in a parity bucket must not read as "no majors". The total is present (non-zero)
// whenever majors exist, so "0 parity-aligned" can no longer be misread as "only minors".
```

### lookahead — the bulk of the change (Stories A & B)
After (new/changed fields shown; `case` / `bestOutcome` / `postBlunderOutcome` / `categoryExamples` /
`oppCategoryExamples` keep today's shape):
```jsonc
"lookahead": {
  // (A) outcome + timing per side. pliesToEnd = number of moves until the decisive pattern/outcome
  //     appears — a distance-to-event, derived from the c4solver score magnitude (confirmed empirically
  //     in Story A task 1 spike; fallback = coarse band if mapping is coarse). Used COMPARATIVELY
  //     (best vs played) to justify "win/lose faster vs. slower." null for a draw or if spike shows
  //     magnitude is not suitable as a raw count. DISTINCT from realizedOnPly (see note).
  "outcomeTiming": {
    "best":   { "outcome": "win",  "pliesToEnd": 17 },     // outcome ∈ win|draw|loss
    "played": { "outcome": "draw", "pliesToEnd": null }
  },

  // (A) the decisive winning line — owner-symmetric, win-in-X. null when no concrete line is within the
  //     search horizon (deep/positional — see edgeType). winningLinesThroughCell = 1 → single immediate
  //     win; >1 → genuine multi-line fork (the single-vs-double-threat fix, gap 6).
  "decisiveLine": {
    "owner": "opponent",                       // "opponent" | "player"
    "cells": ["c2r4","c3r4","c4r4","c5r4"],    // the completing 4-window
    "completingCell": "c4r4",
    "winningLinesThroughCell": 1,
    "fastSide": "played",                      // move on which this win completes soonest: "best" | "played"
    "fastSideRealizedOnPly": 1,                // X
    "slowSideRealizedOnPly": null              // X+Y, or null = not within horizon / does not appear
  },

  // (B) outcome FLOOR (perfect opponent play, = outcomeTiming.outcome) + CEILING (best outcome reachable
  //     IF the opponent errs, WITHIN the search). Emitted only when at least one side's floor is "loss".
  //     ceiling=win/draw → punishable opponent-mistake line found within the search.
  //     ceiling=loss → no such line found within the search (NOT "lost cause" — bounded search only).
  "reachability": {
    "best":   { "floor": "loss", "ceiling": "win"  },
    "played": { "floor": "loss", "ceiling": "loss" }
  },

  // (B) nature of the edge. Truthy enum (survives pruning). Band thresholds are OPEN — see §12.
  "edgeType": "tactical",                      // "tactical" | "positional" | "marginal"

  // (B) per-category CELL diff, SYMMETRIC. Replaces the old {bestInstances,playedInstances} count table.
  //     A category appears only when its cell-sets differ between the lines (true cell-set ties omitted).
  //     bestNovelCells = on the better line, absent on the played line; playedNovelCells = the reverse
  //     (the "played move leaves a lower, more-undercuttable threat" fact — the row lives in the cNrM).
  "perCategory": [
    { "tag": "major_threat_parity", "bestNovelCells": ["c5r5"], "playedNovelCells": [] }
  ]
}
```

Notes the spec must honor:
- `outcomeTiming.pliesToEnd` is a **distance-to-decisive-event** (how many moves until the specific
  pattern/outcome appears), used comparatively between lines. It is NOT raw solver-score magnitude
  exposed bare, and NOT the same as the general "mate distance under optimal play" framing — it is
  anchored to *when a specific pattern appears*, enabling "you win/lose faster vs. slower" reasoning.
  Contingent on Story A task 1 spike confirming the solver magnitude is suitable as a move-count.
- `outcomeTiming.pliesToEnd` and `*.realizedOnPly` (mistake-branch depth) are **different numbers**
  and must be labeled as such in glossary §5.3 — conflating them re-creates the present/projected
  confusion. Keep both labels distinct from "mate distance" (optimal-play concept) as well.
- `reachability.*.ceiling` glossary wording is "best outcome found **within the search**," never "provably".
- `decisiveLine` and `reachability` are **absent** (pruned) in regimes where they don't apply; absence =
  "not present" per §6. They are not `null`-in-vector — they are dropped.
- Snapshot provenance (gap 9) is a **glossary-only** fix (§5.1), not a field.

## 6. Settled decisions (reflect verbatim — do not re-derive)

- **This is the floor test's follow-up.** The artifact under test is **feature vector + glossary**, not
  the model. A3 (mechanism real & load-bearing) and A4 (no fabrication) are the substance.
- **No full move-sequence principal variation.** Gap 7 is addressed by the **decisive-line-with-timing
  contrast** (Story A) + the **free mate distance**. A full forcing line is a new fabrication surface
  (budget-truncation, loose transcription) and is over-specified for a learner. Half the gap-7
  abstentions were the model reaching for a line that does not exist or does not matter.
- **The timing signal requires empirical validation first.** Story A task 1 is a mandatory spike:
  verify the c4solver score magnitude → moves-to-end mapping on known-distance positions in both
  query perspectives before designing or coding `outcomeTiming`. If the mapping holds, `pliesToEnd`
  is a **concrete move-count** (a distance-to-decisive-event — how many moves until the specific
  pattern/outcome appears), derived free from the solver score (large |score| = fast/near-term;
  |score|≈1 = deep). It is **optimal-play** distance, used **comparatively** between best and played
  lines to justify "win/lose faster vs. slower" — it is NOT raw solver-score magnitude exposed bare.
  If the mapping is coarse, the fallback is band-only (no raw integer). The timing signal **must be
  kept distinct from `realizedOnPly`**, which is depth along a *mistake* branch — a different number;
  surfacing both unlabeled re-creates the present/projected confusion.
- **Played-novel differential uses a second swapped call, not a modified shared function.**
  `collectNovelOpportunities(bestTally, playedTally)` is directional and is shared with the production
  annotation gate. Obtain the reverse direction (played-minus-best) by calling the **same function
  a second time with arguments swapped** (or a new pure wrapper that does exactly that). The shared
  function must be left **untouched**. A characterization test (snapshot of current `allowedSet` /
  `aliasMap`) must be created and passing before any seam edit, as a regression gate.
- **Decisive-line cells are only available within the search horizon.** For deep/positional wins, expose
  the mate-distance number + the honest `edgeType: positional` signal — never a fabricated line. The
  horizon limit and the "show a line" need are aligned (fast wins are shallow, hence reachable).
- **The differential is cell-set based, not count based, and symmetric.** A category is non-differential
  only when best and played share the same cell-sets (so eval-42's identical c4r2 and eval-56's identical
  j_shape correctly drop out, while "same count, different row" survives). Surface both best-novel and
  played-novel cells.
- **win-in-1 generalizes to win-in-X and is owner-symmetric.** Items 1 (decisive line), 2
  (winnable-if-opponent-errs), and gap 7 collapse into **one** generalized field family.
- **`losing_either_way` = floor + ceiling.** `ceiling=win/draw` (on a losing-floor side) →
  a punishable opponent-mistake line was found within the search. `ceiling=loss` → no such line
  found within the bounded search — this is NOT "lost cause" or "provably lost"; a mistake beyond
  the search horizon may still exist. "Better" = breadth of *punishable* opponent mistakes and
  slower loss (larger `pliesToEnd`), never causation of a pre-existing loss.
- **Pruning trap is a hard constraint.** Both `toFeatureVector`'s prune and the answerer's `pruneVector`
  strip falsey/empty values (glossary §6: absence = "not present"). **Every new honest-negative signal
  must be a truthy enum** (`edgeType: 'positional'`, `winChance: 'none'`, …) or it is invisible exactly
  when it matters most.
- **Glossary is the model's only spec.** Every field change is a lockstep glossary edit. Absence = "not
  present" (§6) must be preserved.
- **Never fabricate; score is a compass, not the reason.** Honesty wording: "no winning chance found
  **within the search**," never "you cannot win."
- **Scope is feature vector + glossary.** The production deep-reveal prompt (`buildExplainContext`'s
  `lookaheadSection`) must remain **functional with no regressions**, but is **not** rewritten to consume
  the new fields (a later trajectory step).
- **Acceptance stops at** code + glossary + unit tests + regenerated `eval_set_fv_suff_frozen_vectors.jsonl`
  + board spot-check. Re-running the `gpt-5.4` answerer and re-grading is a **separate, user-triggered**
  step (costs OpenAI calls), not part of this epic.

## 7. Non-obvious facts (traps the spec/plan must respect)

- **`realizedOnPly` is already relative** to the pre-move board (`1 + (depth - pliesLeft)`, root=1) and is
  already documented in glossary §5.3. Do **not** "convert to relative" — the gap is an *aggregate*
  signal, not per-cell labeling.
- **`categoryExamples` is already diff-only** (`collectNovelOpportunities` drops non-differential
  categories). **`perCategory` is the only count-based leak** (it keeps best==played rows).
- **`collectNovelOpportunities` / `compareOpportunities` are shared** between the vector projection and
  the **production prompt's** `allowedSet`/`aliasMap` (the annotation gate). Changing them must **not
  regress** the production annotation — this is the highest-risk seam under the "keep prod prompt working"
  constraint.
- **The eval/frozen set uses `lookaheadDepth: 20, budget: null`** (`run_eval.mjs`); production uses tiered
  depth `INITIAL=10 / EARLY=8 / default=4`. Compute new signals in **shared search code** so both inherit,
  and make the horizon bands account for the depth difference.
- **The solver has no native PV** — `c4solver-wrapper.js::query()` returns per-column scores only. Mate
  distance comes from the score *magnitude*; do not attempt tree-walk PV synthesis.
- **`best_scores`/`played_scores`** in frozen records are **opponent-perspective, after the move**; the
  **pre-move** solver query drives `bestOutcome`/`postBlunderOutcome`.
- **`sparseLookahead.js` has documented traps** (memory `project_sparse_lookahead_unvalidated`):
  `selectOpponentMistakeCols` only explores score≤0 concessions; the INITIAL depth tier; the pre-move
  query; budget-per-candidate. New detectors must not disturb these.
- **Movestrings in this codebase are 0-indexed** (board_state digits can be 0–6).
- **`threatStats` splits majors into `parityAligned` / `nonParity`** — these are subsets; a 0 in one bucket
  does not mean zero majors (Story C).
- **No existing unit tests** cover `sparseLookahead.js` / `explainContext.js` / `toFeatureVector`. Stories
  must create them. Runner: `npm run test:fast` (inside `connect-four/`; never the full `npm test`).

## 8. NOT included (out of scope)

- No full move-sequence principal variation / forcing line.
- No production prompt rewrite (kept functional only; not enhanced to use the new fields).
- No re-running the `gpt-5.4` answerer or re-grading inside the epic (separate user-triggered step).
- No changes to blunder detection / tagging / `classifier.js`.
- No changes to `c4solver-wrapper.js` (no PV synthesis).
- No derived "undercuttable: yes/no" verdict — expose the row and let the reasoning use it.
- No count-threshold tuning on `perCategory` (cell-based differential supersedes it).
- Not testing other models or the `gpt-5.4-mini` dial (later trajectory step).

## 9. Counterexample → field traceability (the deliverable)

| Grader counterexample | Cases | Fixing field/change | Glossary § | Story |
|---|---|---|---|---|
| Lookahead projections read as present tactics | eval-0,1,2,8 | `edgeType` + present-vs-projected discipline | §5.3 | B (A supports) |
| `immediate_threat` cells ungrounded | eval-6,10,29,51,42 | `decisiveLine` (win-in-X, owner-symmetric) + completing window | §5.3 | A |
| No decisive differentiator | eval-42,56,10 | cell-aware **symmetric** `perCategory` diff | §5.3 | B |
| `losing_either_way` mislabeled | eval-8,10,42,56 | `reachability` floor/ceiling | §5.3 | B |
| Parity-major collapses "exists" vs "useful" | eval-15,12 | `playerMajorTotal` / `opponentMajorTotal` | §5.2 | C |
| No "number of winning lines" | eval-12 | `decisiveLine.winningLinesThroughCell` (single vs multi) | §5.3 | A |
| "How converts / why faster" | nearly all | `outcomeTiming.pliesToEnd` + `decisiveLine` contrast | §5.3 | A |
| `playedCol` absent from frozen vectors | eval-11,12 | verify already emitted (explainContext.js:215); regenerate frozen vectors | §2 | C |
| Snapshot provenance ambiguous | eval-42,29 | `patterns*` provenance (glossary only) | §5.1 | C |

## 10. Authoritative sources of truth (for spec/plan/critique agents)

- `docs/architecture/feature-vector-sufficiency-experiment.md` — experiment design; **frozen set stays
  constant** invariant (the 18 **case selections** stay constant; vector **contents** may be regenerated
  after a projection change — see experiment doc lines 194-195); the model/prompt-builder trajectory.
- `docs/architecture/feature-vector-glossary.md` — the **contract under test**; §5.3 (lookahead), §6
  (pruning/absence), §5.1 (patterns*), §5.2 (threatStats).
- `connect-four/server/sparseLookahead.js` — the search; the detectors live here.
- `connect-four/server/explainContext.js` — `toFeatureVector` projection (lines ~208–275) **and** the
  production `lookaheadSection` (lines ~806–926) that must not regress.
- `connect-four/server/scripts/fv_suff_answers_2026-06-26T18-15-36Z_grade_report.md` — the grader's
  counterexample list (the requirements source).
- `connect-four/server/scripts/run_eval.mjs` — how the frozen set is generated (`--no-llm`, depth 20).
- `docs/best_practices_spec_driven_development.md`.

## 11. Acceptance criteria (epic-level)

- Every new/changed field documented in `feature-vector-glossary.md` in lockstep.
- Every new honest-negative signal is a **truthy enum**, verified to survive **both** `toFeatureVector`'s
  prune and the answerer's `pruneVector`.
- The production deep-reveal prompt builds with **no regression** (existing behavior of
  `lookaheadSection` / `allowedSet` / `aliasMap` preserved for current cases). Because **no tests cover
  these files today**, this is made objectively decidable by a **characterization test** created as
  **Story B task 1 (precondition gate)**: it snapshots the current `lookaheadSection` / `allowedSet` /
  `aliasMap` output on a fixed set of positions; this test must be green **before any edit to
  `collectNovelOpportunities` or `compareOpportunities`**, and "no regression" means that snapshot is
  unchanged after all shared-seam edits.
- Unit tests exist for each new detector/projection (`npm run test:fast` green).
- `eval_set_fv_suff_frozen_vectors.jsonl` regenerated via `run_eval.mjs --no-llm`.
- Board spot-check confirms each targeted counterexample (§9) is retired.
- The spec carries the §9 traceability so future trajectory iterations don't regress a field whose reason
  has been forgotten.
- **Separate, user-triggered:** re-run `explain_from_vector.mjs` + `grade-fv-sufficiency` to measure the
  pass-rate delta.

## 12. Open design decisions (resolve in `/clarify` or the spec — do NOT invent silently)

These are genuinely unresolved; the §5A shapes are settled but these *values/derivations* are not. The
proposals below are starting points for clarification, not settled decisions.

1. **`edgeType` band thresholds.** The numeric rule mapping `(outcome, optimal-play pliesToEnd)` →
   `tactical` | `positional` | `marginal`. Candidate: **positional** when the winning side's `pliesToEnd`
   is within K of game end (deep, no near-term line); **marginal** when both sides share an outcome and
   their `pliesToEnd` differ by ≤ D; **tactical** otherwise. **K and D must be derived empirically from
   the 18 frozen eval cases**: tune them so the bands correctly separate the known pass/fail cases; do
   not use arbitrary constants that risk re-mislabeling the very cases this epic fixes.
2. **`pliesToEnd` derivation and framing.** The owner's intent: `pliesToEnd` is a **concrete move-count**
   expressing *how many moves until the specific decisive pattern/outcome appears*, used **comparatively**
   between the best line and the played line (e.g. "you lose 4 moves faster on the played line"). It is
   NOT raw solver-score magnitude exposed bare. **Story A task 1 spike** must empirically verify the
   solver score-magnitude → moves-to-end mapping on known-distance positions in both query perspectives
   before this field is coded. If the mapping holds, a raw integer is required (coarse band is the
   fallback only if the spike shows the mapping is coarse). Document the confirmed formula or the
   fallback in the spike output before proceeding.
3. **`decisiveLine` extraction horizon.** How deep the search reports a concrete completing line before
   falling back to `null` (the point at which "show a line" yields to "positional"), tied to the existing
   depth tiers (eval depth 20 vs production 10/8/4).
4. **`perCategory` near-tie policy confirmation.** §6 settles cell-set equality as the drop rule; confirm
   no residual count-magnitude signal (e.g. 25-vs-23 minors) needs surfacing alongside the cell diff.

---

## Deferred

### edgeType fine-grained K/D threshold branch

**Deferred**: the fine-grained `edgeType` branch (K/D numeric thresholds mapping `pliesToEnd` to
`tactical` | `positional` | `marginal`) is deferred to a follow-up iteration after Story A lands and
the frozen vectors are regenerated with real `pliesToEnd` values.

**Rationale**: K and D must be derived empirically from `pliesToEnd` values in the regenerated frozen
set. Those values do not exist until Story A ships; deriving thresholds before regeneration would
require arbitrary constants that risk mislabeling the very cases this epic fixes. The coarse branch
(ships in iteration 1) is self-sufficient and correctly handles all four cases without K/D.

**What ships in iteration 1**: coarse branch only, derived via a total ordered if/else:
`"tactical"` when outcomes diverge; `"positional"` when no decisive line found within the horizon
(`decisiveLine` absent); `"marginal"` (catch-all) when the same outcome holds on both lines —
regardless of whether a decisive line was found on one side, both sides, or neither. The old
"both sides" qualifier on `marginal` is dropped; `marginal` is the final catch-all covering all
same-outcome cases.
