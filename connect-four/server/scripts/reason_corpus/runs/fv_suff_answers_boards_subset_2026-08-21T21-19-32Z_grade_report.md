# Feature-Vector Sufficiency Report — post-fix subset re-measure (2026-08-21)

## Summary
- **Model:** `gpt-5.4-mini` — **PRODUCTION-FIDELITY run**, not a floor test. `prompt_confusion` here
  **cannot be separated from model capability**; every such triage below carries that caveat.
- Answer rows: 125 (25 boards × 5 runs, condition D). Parse failures: **0**.
- Code under test: branch `worktree-deep-reveal-grounding` @ `3771fba` (10 commits over `e5c0c75`).
- Comparison baseline: `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z` — same 25 frozen
  boards, same model, same n, pre-fix code.
- Cases passed (A1–A7 + G1–G7 on all runs): **5 / 25** (was 6 / 25). Intermittent: 14 (was 16).
- Triage of the 20 failures: `prompt_confusion` 14 · `render_bug` 6 · `missing_info` 0 · `vector_error` 0.
  **Zero failures attributable to the reason engine, again** — consistent with the 2026-08-06 finding
  that every defect is downstream of it.

## Per-run axis rates — before → after

| axis | before | after | read |
|---|---|---|---|
| A1 | 100% | 100% | flat, sanity |
| A2 | 100% | 100% | flat, sanity |
| A3 | 90% | 92% | flat — a recorded deferral, not a target |
| A4 | 86% | 87% | flat — recorded deferral |
| A5 | 90% | 93% | small gain |
| **A6** | **68%** | **76%** | gain, but see the stratification below |
| **A7** | **76%** | **83%** | gain on **all four** sub-tests |
| G2 | 86% | 91% | gain |
| G4 | 96% | 91% | small decline |
| G5 | 92% | 91% | flat |
| **G7** | **78%** | **71%** | **decline — see below** |
| G1 / G3 / G6 | 84% / 100% / 100% | 94% / 100% / 100% | **NOT comparable** — graded on 50 runs before vs 125 after (different sub-sampling) |

**A7 sub-test failures (count of runs), before → after:** A7a 7→3 · A7b 18→13 · A7c 9→6 · A7d 5→1.

## The falsifiable predictions, judged

| prediction | verdict |
|---|---|
| A6 on the **treated** L5/L6/L9 boards drops from ~58% per-run failure to near zero | **NOT MET.** 57% → 46% failure (15/35 → 19/35 pass). Improved, nowhere near zero. |
| A6 on the **control** L1/L2/L4/L8 boards stays flat at ~9% failure | **MOVED**, the wrong way: 13% → 22% failure. By the plan's own rule this weakens attribution. |
| A7 moves from deterministic-fail toward flaky-fail | **MET.** A7c is the clearest case (see eval-20). |
| A7c failures fall on fork boards | **MET, with a coverage gap** — see eval-47. |
| A3 and G2 flat | **MET** (90→92, 86→91). Recorded deferrals, not regressions. |
| The passing controls still pass | **NOT MET** — `eval-37` regressed. Bisected at code level, below. |

### A6's headline gain is in the confounded stratum
A6 by stratum: **mid/late 83% → 80%**, **opening 52% → 72%**. The entire +8pt headline is the opening
stratum, which the plan itself declares confounded (Task 4 and Task 6 land in the same pass) and says
**must not** be read as evidence for the salience hypothesis. On the mid/late stratum the prediction was
actually scoped to, A6 did not improve.

### The A6 story is not "prose beats parenthetical"
Three boards contradict that framing directly:
- `pin-L9-hedged-parity` (L9, **treated**): A6 fails **5/5** — the prompt says "Better move: column 4"
  verbatim; the model paraphrases it as "the central move".
- `eval-35` (L9, **treated**): A6 fails 4/5 — paraphrased as "central book move".
- `eval-36` (L8, **control**, parenthetical form): A6 fails **5/5**.

Naming the column in the template does not make the model reproduce the digit when a "central"
paraphrase is available. A paraphrase-friendly board defeats **both** template forms.

### G7's decline is only ~25% instrumentation artifact
Task 9 made a previously invisible defect visible: `annotationRepairs` non-empty went **0 → 2 runs**
(both `unoffered_term`), and those now trigger G7c's auto-fail where before they could not. That
accounts for 2 of the ~8-run decline. The remainder is real and comes from mis-bound or dropped
required handles — the offer set grew (Task 6's opening merge, Task 8's pivot), so there is more to
bind and more to drop.

## What this branch demonstrably fixed
- **G7b (term fidelity): 87% → 98%** (mid/late 92%→100%, opening 82%→97%). Task 9b's measured
  hypothesis — "the prompt teaches vocabulary it does not offer" — confirmed. Corpus-wide, records
  displaying an unoffered term slug went 49/63 → 0/63, and unoffered **zone** handles 44/63 → 0/63.
- **Task 9c (`eval-39`)**: was 5/5 deterministic failure with no hold-the-line reframe; now 4/5 carry
  it, 1 garbles it. Deterministic → flaky, which the plan defines as success.
- **Task 9d (`eval-11`)**: was 3/5 runs fabricating book-line adherence; now **zero** book-line
  fabrication, A6 5/5, A3/A4 clean.
- **Task 8 (`eval-20`)**: the fork pivot is offered *and* required; 4/5 runs use it. A7c moved from
  impossible-to-comply to intermittent — the next lever is enforcement, not offering.
- **Task 9 (`eval-13` run 4)**: the model invented `[term:central-column opening]`; it now appears in
  `annotationRepairs` instead of vanishing silently.

## Defects found by this run (none introduced by the reason engine)

### A defect this branch introduced — `pin-L5-deep-fork`, 3/5 runs
`zoneAnnotations.mjs` `roleText`: the sibling `future-fork` role ends *"…it matters later, once the
forced sequence reaches it, **not right now**"*, while Task 8's `fork-pivot` role omits that final
contrast. 3/5 runs conflate the deep (28-ply, unreachable) fork-creating cell `c7r6` with the actual
immediate best move (column 1). **This is the failure class D46 names as its revert trigger.** One-clause
fix; the numbers above predate any such fix.

### Pre-existing render defects, model-independent (survive a change of model)
1. **Sibling aliases with byte-identical role text** — `eval-9` (`you-key-square` / `you-key-square-2`)
   and `pin-L2-enabled-opponent` (`opp-key-square` / `opp-key-square-2`). No model can bind handle→cell
   deterministically; runs swap them. 2 boards, both intermittent.
2. **`projectedDeep` is built from the wrong half's line** — `reasonBoardSelect.mjs`'s `deepHalf` picker
   always prefers `lostResource.finalMovestring` for the shared board, so any `opponentPunishment`-owned
   alias with `truthBoard:"projectedDeep"` is verified against a continuation it does not belong to
   (`eval-5`, `eval-21`). One root cause behind several G5/G7/A7b failures.
3. **First-offer-wins dedupe attaches the wrong horizon framing** — `eval-33`, 5/5: the required
   `opp-key-line` handle says "not a threat right now" while the identical window is `immediate` on the
   shown board. All 5 runs read the board correctly and contradicted the handle: the model was right,
   the render was wrong.
4. **Decision-board threat list describes a different board** — `eval-47`: "double_threat at c3r6" while
   `c3r6` is only a minor threat pre-move.

### Task 8 coverage gap (honest limit)
`forkPivotCell` requires `half.tacticTag ∈ {double_threat, figure_7}` **and** `half.forkCells`. On
`eval-47` neither half carries a `tacticTag` at all — the fork lives in the *board tags*
(`you-double=windows:…`) — so no pivot is offered and A7c fails 5/5. **"20/20 fork halves get a pivot"
is true only for the tagged-half definition of a fork.** Do not report Task 8 as closing A7c generally.

### Control regression — `eval-37`, bisected at code level (no paid re-run)
Rendered eval-37's prompt at `e5c0c75` and at HEAD and diffed. The only changes are Task 9b's
worked-example substitutions; *"Never write a raw square"* is byte-identical in both, and the exemplar
coordinate "on c2" is present in both — no instruction was lost.

**Hypothesis (not a finding):** the Checkpoint-B fix that makes the worked example wrap the term's
`canonicalPhrase` turned
`[term:immediate_threat]the threat you need to keep alive[/term:immediate_threat]` into
`[term:double_threat]double threat (two winning squares at once)[/term:double_threat]` — ungrammatical
in its own sentence and modelling an inline technical parenthetical inside coach prose. `eval-37` fails
by dumping an inline technical coordinate list. Models imitate exemplars, and a 5/5 → 0/5 flip is too
clean to read as sampling noise. Confirming needs one targeted re-run. If confirmed, keep the
canonicalPhrase *binding* (it removed a real false pairing) but restore natural exemplar prose.

## Capability arm (`gpt-5.4`, n=3, same 25 boards)
Mechanical only: A1 100% · A2 100% · **A6 89%** · G7a 100% · G7b 97%.
**The A6 capability gap narrowed from 24 pts to 13 pts** (pre-fix 68% mini vs 92% full; post-fix 76% vs
89%). The shipped model closed roughly half the gap, which weakens the "ship a stronger model for deep
reveals" case. The full model's own 92→89 is 2 runs of 75 — noise.
