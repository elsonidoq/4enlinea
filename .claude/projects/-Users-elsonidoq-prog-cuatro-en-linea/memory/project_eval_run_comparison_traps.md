---
name: project_eval_run_comparison_traps
description: "Comparing two fv_suff eval runs — the --model default silently breaks it, case-pass is not comparable across different n, corpus rates are per-case-type, and the grader has a measured +/-20% error bar on A4/A7/G1 that makes small deltas on those axes meaningless"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8d2dc42e-b93c-4b0f-babd-372173310677
  modified: 2026-08-28T18:35:04.650Z
---

**Trigger: about to compare two `fv_suff_answers_*` runs (before/after a render change, A/B of two
code states, "did this epic help").** Four things silently invalidate the comparison. All four were
hit or verified 2026-08-28 while measuring Epic 12.

## 1. The `--model` default is not the model your baseline used

`compute.mjs --llm` defaults to `$EXPLAIN_MODEL`, which is **`gpt-5.4`**. Every recorded baseline in
`reason_corpus/runs/` is **`gpt-5.4-mini`**. Omit `--model` and you have measured a model upgrade, not
your change — a stronger model flatters every judgment axis and A6/G7b too.

Happened exactly this way: a first 8-board comparison showed A6 88→94% and G7b 94→100%, reported as
attributable to the fixes, then retracted on finding the new run was `gpt-5.4` and the baseline
`gpt-5.4-mini`. **Always pass `--model` explicitly and diff the `model` field of both files before
reporting any delta.**

## 2. Case-pass is not comparable across different `n`; per-run axis rates are

A case passes only if every axis holds on **all N runs**, so an n=3 case is strictly easier to pass
than an n=5 one. Comparing an n=3 new run against the n=5 baseline on case-pass hands the new side a
free win. **Per-run axis pass rates are N-independent** — lead with those, and show case-pass only
within a dataset. Grading cost is per *case*, not per run, so raising `n` is nearly free relative to
adding boards; that makes matching the baseline's `n` cheap, not a reason to skip it.

## 3. Corpus rates are per case type, NOT per player encounter

`boards.jsonl` (63) / `boards_subset.jsonl` (25) are built for **case-taxonomy coverage**, with rare
cases deliberately over-sampled (see [[project_coverage_sampler_rarefill_trap]]). An error rate
measured on them answers "how often across the space of case types", never "how often will a player
hit this" — and it overstates rare defects. A real frequency estimate has to come from blunders
harvested out of simulated play (`harvestBlunders()`, `connect-four/server/gameSampling.js:157`),
classified by case type. Note `boards_subset` is a **strict subset** of `boards.jsonl` (verified), so
a 63-board run covers the 25 baseline boards and the delta is computed on that overlap.

## 4. Every failure rate from the harness is a FLOOR, not a player-facing rate

The harness is single-attempt (**OI-183**); production retries, and 38% of recorded runs would have.
The most common judgment failures observed — model dropped a required handle, model didn't name the
better column — are *exactly* the retry triggers. So a harness failure rate systematically overstates
what ships. Say this next to any failure number given to a decision-maker.

## 5. The grader is an instrument with a MEASURED error bar, and it is not uniform

Measured 2026-09-01: 5 cases re-graded blind on both sides by fresh agents, identical dispatch.

| | agreement |
|---|---|
| case verdict (pass/fail) | 10/10 |
| **triage** (render_bug vs prompt_confusion) | **8/10** |
| intermittency (3/3 vs 1-of-N) | 8/10 |
| per-axis, per-run | 94.6% (435/460) |

**The 5.4% disagreement is concentrated, not spread.** A4, A7 and G1 each disagree **20%** of runs;
G5 10%; G4/G7 5%; **A1, A2, A3, A5, A6, G2, G3, G6 are 0%.**

Consequences, both of which retracted a reported finding:
- **Any delta ≤20 points on A4 / A7 / G1 is noise.** A reported "A7 −10, G1 −6 regression" from Epic 12
  collapsed to *no measured change*. A6 +14 survived — A6 has 0/40 disagreement.
- **Per-case `failure_triage` is an attribution HYPOTHESIS, never a count to sum.** `eval-34` flipped
  render_bug↔prompt_confusion on BOTH sides under re-grading, in opposite directions; a reported
  "prompt_confusion → render_bug reclassification" was pure grader noise. Confirm triage at source
  (build the real prompt, check the board) before any recommendation depends on it.

## 6. Dataset-specific: the 08-06 baseline has an EMPTY `requiredSet` on 33% of boards

Mean requiredSet size: **08-06 = 1.44 (21/63 empty), 08-26 = 2.60 (0 empty), current = 3.00 (0 empty)**.
G1 asks whether the answer used the handles it was *required* to use, so on a third of the 08-06 boards
there was **nothing to fail**. Its G1 88% is inflated by absence of the mechanism, and the current run's
84% is NOT a regression against it. Recompute this before quoting any G1 delta against an old run:
`[...new Set(rows.map(r=>r.id))]` then mean of `render_decision.requiredSet.length`.

## Which baseline to compare against

- `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` — 25 boards, n=5, `gpt-5.4-mini`. The frozen
  pre-Epic-12 baseline (`deep-reveal-remediation-epic.md:80`). Delta is attributable to Epic 12.
- `fv_suff_answers_boards_2026-08-06T16-04-29Z` — 63 boards, n=2, `gpt-5.4-mini`. The only full-corpus
  baseline, but it **predates Epic 11 too**, so its delta conflates two epics. Label it as such.

**Re-grading a recorded answers file is not "running the old code"** — the answers are text on disk.
This distinction confused the owner once; state it explicitly when proposing a both-sides grading.

## Rubric-version comparability

A judgment-axis delta is only meaningful between runs graded with the **same rubric version**.
`GRADER_INSTRUCTIONS_v1.md` is frozen; `v2` = v1 verbatim + an appended addendum. Old grades on disk
predate v2 (and the 08-26 grades came from a dispatch carrying open-issue numbers, which the epic
records as contaminating A4/A5/A7) — so **existing grades cannot back a before/after claim**; the
recorded answers must be re-graded under the current rubric. See
the merged section below.

Related: [[project_fv_suff_answers_layer_trap]] (name the string layer before counting),
[[feedback_eval_design_methodology]], [[project_deep_reveal_eval_harness_gap]].


---

## (merged from `project_grader_rubric_source_of_truth` — the dispatch wrapper is part of the instrument)

The rubric FILE is no longer the whole instrument even now that graders read a checked-in one
(`reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md`, which `.claude/skills/grade-fv-sufficiency/SKILL.md`
now points at — the old "the skill regenerates the rubric from its own body each run" trap is FIXED).
**The dispatch message the orchestrator sends is also part of the instrument.** The 2026-08-26 run's
dispatch listed the open issues by number, including "OI-194 (raw `cNrM` notation)" — a charge that
appears **nowhere** in the rubric file. The graders imported it from outside the frozen file, and A5
moved *opposite* to that defect's own prose incidence (89 → 62 while A5 went 76 → 60). **Treat that
run's A4/A5/A7 deltas as unattributable.**

**How to apply:** judgment-axis numbers are comparable only within a rubric version **and** a frozen
dispatch wrapper. If you change the dispatch text, you have changed the instrument — a v1→v2 rubric
delta with "exactly one known cause" is the property versioning exists to protect, and an ad-hoc
dispatch addendum destroys it just as thoroughly as editing the rubric would.

## 7. Sub-sampled grades manufacture phantom regressions (2026-09-03)

Some recorded grade files grade only a SUBSET of runs on the expensive axes — the v3retry63 grades
carry `null` for A3/A4/G2/G4/G5 on run 2, grading runs 0–1 only. Compare a new fully-graded run against
one of those and a board can look like it collapsed when nothing changed.

Measured: `eval-44` read as **A3 2/2 → 0/3, A4 2/2 → 0/3, G4 2/2 → 0/3** — an alarming regression that
triggered a root-cause hunt. The truth: the same board-false claim ("the opponent takes column 3" for a
square that is never occupied) was **already present in the old run's run 2**, which was never graded on
those axes. Old incidence 1 of 3 runs, new 2 of 3 — sampling noise at n=3, not a change in behaviour.

**Two habits that catch it:**
- Before reporting a per-board delta, print the DENOMINATORS, not just the pass counts. `2/2 → 0/3` is
  not a comparison; `filter(v => v != null)` on both sides first.
- When a board looks like it collapsed, grep the OLD run's ungraded runs for the same defect before
  attributing it to your change. A defect that predates the change will sit there in plain text.

This also means **a clean old grade is not evidence the defect was absent** — only that nobody looked.

## 8. A graded run is often the WRONG instrument — check if the property is board-decidable first

The cheapest thing that worked, repeatedly: a deterministic audit over stored evidence, zero API cost,
seconds to run, exhaustive over all 63 records. Session 2026-09-03 found **three** issues that way
(OI-226 negative result, OI-227, and the OI-227 number correction) — the graders only *pointed*; the
audit is what proved or refuted each one.

Rule of thumb: if the claim is checkable against the board (`checkWin`, `colHeights`, spec cell counts),
audit it — do not buy a graded run. Reserve grading for what only a human-ish reader can judge: coach
voice, actionability, whether prose is *useful*. See [[project_fork_claim_oracle_traps]] for the oracle
you must get right when you do.


## 9. The rubric CANNOT check the render layer — and it says so, in three places (2026-09-03)

§8 says "audit it, don't buy a graded run" when a claim is board-decidable. This is *why* the grader
cannot substitute, traced at source in `.claude/skills/grade-fv-sufficiency/SKILL.md`. The delegation
chain closes on itself:

- `:529-533` — *"`zones` is consumed as GROUND TRUTH exactly like every other `render_decision`
  element: never re-derive the offered set yourself. Your job is to audit the ANSWER against these
  decisions, not to check whether the decisions themselves are the ones you would have made."*
- `:136` — A4's condition-D carve-out delegates zone fidelity to **G7/G5**.
- `:552` — G7a checks the model's phrase **against the `role`**; board-truth of the alias's **`spec`**
  is delegated to **G5**. G5 checks threat-list entries and the spec — never the role's own PROSE.

So a role text asserting something false about the board (a cardinality, a causal claim) is checked by
**nobody**, and a model that faithfully repeats it passes the zero-tolerance no-fabrication axis **by
complying**. The instruction is not grader drift — it is deliberate, and correct for ROUTING (a grader
re-deriving routing caused the eval-1/16/3 mis-grades). It is wrong only for factual assertions in role
prose, which are not decisions but claims with a truth value.

**Corroboration that grading could never have caught it anyway**: the false `-fork-pivot` cardinality
D64 removed stood on 25 aliases yet appeared verbatim in **1 of 45** runs on the 11 board-false records
— and that run sat in a corpus with no grades file. Even a perfect grader gets one noisy sample.

**How to apply:** never propose a graded run to validate render-layer/role-text correctness; that is
`zoneAnnotations.test.mjs`'s corpus-wide guards (all 11 claim types, OI-231). Grade for A3/A5/A7 —
coach voice, actionability, is-this-useful — which no deterministic check can reach.

## 10. A before/after eval diff needs a CONTROL ARM, or you are measuring the model's variance

Measured 2026-09-03, comparing a pre-D63/D64 run against a fresh 63x3 run on the same corpus, same
model (`gpt-5.4-mini`), same `--retry`. Records were split by whether their assembled prompt actually
changed (`assembleGroundedPrompt` diffed old vs new): **26 treatment / 37 control**.

| | control (prompt IDENTICAL) | treatment (prompt changed) |
|---|---|---|
| named-column set change (mean Jaccard) | **0.175** | **0.112** |
| records whose named columns changed at all | **16/37 (43%)** | 8/26 (31%) |

**The treatment group moved LESS than the control group.** Control records got a byte-identical prompt,
so 100% of their movement is model variance — and that floor is enormous: 43% of them named a different
set of columns. Without the control arm, "8 of 26 treatment records changed substantially" reads as a
real effect. It is not.

**How to apply:** before diffing two runs, compute which records' prompts actually changed, and run the
UNCHANGED ones in the same job as the null. It is free — same run, same day, same model — and it is the
only thing that makes "substantially changed" falsifiable. A tag for this exists in the UI:
`deriveSetFromAnswers` returns `promptArm` and `/admin/fv-suff` renders it as a chip
(`hasForkRolePrompt`, `server/evalResultsHelpers.js`) — but it is defined for the D63/D64 fork-role
change specifically and MUST be re-derived for any other change; its own comment carries that warning.

**Caveat that bit this measurement**: arms defined by *prompt* change do not control for non-prompt
changes shipped at the same time. D63 also added `ensureBetterColumnMention`, a deterministic repair
that fires on ALL records regardless of arm — better-column mention went 0.94 -> 1.00 on BOTH arms, and
it was the run's largest real delta. Name what your arms do and do not isolate.
