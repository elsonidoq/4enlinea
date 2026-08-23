# Feature-Vector Sufficiency Report — FINAL post-fix re-measure (2026-08-23)

**This supersedes the 2026-08-21 report.** That run measured commit `3771fba`, which carried a defect
this measurement itself found (the fork-pivot role text). This run measures `2ef3ccb`, the code that
actually ships.

## Summary
- **Model:** `gpt-5.4-mini` — **PRODUCTION-FIDELITY run**, not a floor test. `prompt_confusion` here
  cannot be separated from model capability; every such triage carries that caveat.
- 125 rows (25 frozen boards × 5 runs, condition D), **0** parse failures, 3 runs with non-empty
  `annotationRepairs`.
- Cases passing: **5/25**. Triage: `prompt_confusion` 15 · `render_bug` **5** · `missing_info` 0 ·
  `vector_error` **0**.

## Per-run axis rates across all three runs

| axis | pre-fix (08-11) | v1 (08-21) | **final (08-23)** |
|---|---|---|---|
| A3 mechanism real & decisive | 90% | 92% | **98%** |
| A4 no fabrication | 86% | 87% | 81% |
| A5 coach voice | 90% | 93% | **94%** |
| **A6 names the column** | **68%** | 76% | **84%** |
| A7 utility | 76% | 83% | 81% |
| G2 per-link guardrail | 86% | 91% | 91% |
| G4 engine-line grounding | 96% | 91% | 89% |
| G5 threat-list fidelity | 92% | 91% | **96%** |
| **G7 annotation fidelity** | **78%** | 71% | **66%** |
| G7b (mechanical, terms) | 87% | 98% | **98%** |
| cases passing | 6 | 5 | 5 |
| **`render_bug` triages** | **7** | 6 | **5** |
| `prompt_confusion` triages | 11 | 14 | 15 |

A7 sub-test failures: A7a 7→3→6 · A7b 18→13→17 · A7c **9→6→4** · A7d 5→1→5.

## The honest headline

**The branch removed render-layer defects and shifted the residual failure mode to model compliance.**
`render_bug` triages fell 7 → 5 and `vector_error` stayed at 0 across all three runs (the reason engine
has never been the problem). A6 rose monotonically 68 → 76 → **84%**, A3 to 98%, G5 to 96%, A5 to 94%.

**But G7 fell 78 → 71 → 66%, and that is real, not an artifact.** Only 3 runs carry `annotationRepairs`
(vs 0 pre-fix), so Task 9's new visibility explains a small part. The rest is the branch's own success
working against it: Task 6's opening merge and Task 8's pivot **grew the offered and required sets**, so
there are strictly more handles the model must bind — and it drops or mis-binds them. Every G7 failure
now reads "required handle omitted" or "handle wrapped around the wrong cell", never "handle not
offered".

**The next lever is enforcement, not offering.** That is what this measurement establishes.

## Predictions, judged against the final run

| prediction | verdict |
|---|---|
| A6 on treated L5/L6/L9 boards drops toward zero failure | **Substantially met at last:** 43% → 54% → **74%** pass. Still not "near zero". |
| A6 control group stays flat | **Met** on the full control slice: 78% → 78% → 82%. (My earlier "control moved the wrong way" was a *mid/late-only* slice — see the correction below.) |
| A7 moves deterministic → flaky | **Met.** A7c, the fork axis, fell 9 → 4 run-failures. |
| A3 / G2 flat | **Exceeded** (A3 90→98, G2 86→91). |
| Passing controls hold | **Not met.** `eval-32` flipped to failing — attributed to a *pre-existing* L4 template defect (OI-194), unchanged by this branch. |

### Two corrections to the 08-21 report
1. **"The control group moved the wrong way (87→78%)"** was computed on the mid/late-restricted control
   slice (45 runs). On the full control slice (all ten L1/L2/L4/L8 boards, 50 runs) it is 78 → 78 → 82%
   — flat. Both numbers are real; the slice must be stated with the number.
2. **Per-board A6 at n=5 is very noisy.** Between v1 and final — two runs differing only by two wording
   changes — `pin-L9` went 0/5 → 4/5 and `eval-35` 1/5 → 4/5. Single-run per-board deltas cannot carry
   attribution. Treat **deterministic** failures as findings and **intermittent** per-board deltas as
   noise until replicated. `eval-33` and `eval-39` reproduced exactly across both runs; those are real.

## Task-by-task, on their own named boards
- **Task 8 (fork pivot)** — `eval-20`: A7c now passes on **all 5 runs**. Corpus-wide A7c failures 9 → 4.
  **Limit:** `eval-47`'s fork lives in board tags, not a tagged half, so it gets no pivot (OI-193).
- **Task 9 (repair recording)** — working: `eval-13`/`eval-20` invented term slugs now surface in
  `annotationRepairs` instead of vanishing.
- **Task 9b (display ⊆ offer)** — G7b 87% → 98% and holding; 0/63 records display an unoffered slug or
  zone handle.
- **Task 9c (L4 hold-the-line)** — `eval-39`: 5/5 deterministic failure → 4/5 carrying the reframe.
- **Task 9d (book-line gating)** — `eval-11`: book-line fabrication **eliminated**.
- **Post-measure fix (fork-pivot horizon)** — `pin-L5`: triage moved from `render_bug` ("role text omits
  the disclaimer") to `prompt_confusion` ("mishandled *despite being unambiguously specified*"). The
  render no longer invites the conflation, so **D46's revert trigger is defused**. The case still fails
  on handle compliance.

## Defects filed from this measurement
OI-190 (`projectedDeep` built from one half's line — confirmed on `eval-5`, `eval-21`, and
deterministically on `eval-11`) · OI-191 (sibling aliases, identical role text) · OI-192 (first-offer-wins
attaches the wrong horizon — `eval-33`, 5/5, reproduced) · OI-193 (`forkPivotCell` misses tag-carried
forks) · OI-194 (L1/L4/L8 templates embed raw `cNrM` into text the prompt forbids echoing — `eval-32`,
5/5) · OI-195 (L2 template names the wrong occupied cell — `pin-L2`, 4/5) · **OI-196 (the required-handle
block drops the `(on the … board)` disambiguator that the regions block carries — `eval-47`, 4/5, and a
one-line fix)**.

OI-196 and OI-190 are the highest-value next fixes: both are code-verified, both are model-independent,
and both drive the G7 decline this run measured.
