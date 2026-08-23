# Pre-fix baseline — 25-board frozen subset, 2026-08-11

Captured on the **unmodified** render layer (HEAD `7995a87`), before any Phase B fix. This is the
reference every Task 10 comparison is measured against.

**Read per-run rates, never case pass rates.** The all-runs-pass rule is not comparable across arms
with different `n`. **The subset's pass rate is NOT the corpus pass rate** — the subset was chosen by
set-cover over failure strata, so it is deliberately enriched for failures.

## Arms

| arm | model | n | boards | answers | file (`server/scripts/reason_corpus/runs/`) |
|---|---|---|---|---|---|
| 1 baseline | `gpt-5.4-mini` (production) | 5 | 25 | 125 | `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z.jsonl` |
| 2 capability | `gpt-5.4` (eval-only full) | 3 | 25 | 75 | `fv_suff_answers_arm2-capability-gpt5.4-n3_2026-08-11T18-38-17Z.jsonl` |
| 3 budget | `gpt-5.4-mini`, `4-6` sentences | 5 | 13 | 65 | `fv_suff_answers_arm3-budget4-6-mini-n5_2026-08-11T18-43-54Z.jsonl` |

All arms: condition D, 0 parse/call errors, every board at its full run count, `model` field verified
by reading it back out of the answers file.

## Mechanical axes (deterministic — `grade_mechanical.mjs`)

| axis | arm 1 (mini) | arm 2 (gpt-5.4) |
|---|---|---|
| A1 | 125/125 (100%) | 75/75 (100%) |
| A2 | 125/125 (100%) | 75/75 (100%) |
| **A6** | **85/125 (68%)** | **69/75 (92%)** |
| G7a offered | 125/125 (100%) | 74/75 (99%) |
| G7b offered | 109/125 (87%) | 70/75 (93%) |

### The headline: A6 is 68% on the model we ship and 92% on the stronger one

Same prompts, same boards, same render layer — a **24-point gap attributable purely to model
capability**. This is what arm 2 exists to separate, and it lands before a single grading agent runs.
A1/A2 at 100% on both confirms the deficit is composition, not extraction: both models read the
Decision block flawlessly every time and then differ on whether the column survives into the prose.

### A6 by template group — Task 4's scope, confirmed on the model that ships

| `link.text` form | arm 1 (mini) | arm 2 (gpt-5.4) |
|---|---|---|
| prose "Column N" · mid/late | 15/15 **100%** | 9/9 100% |
| parenthetical "(col N)" · mid/late | 39/45 **87%** | 26/27 96% |
| **absent (L5/L6/L9) · mid/late** | **0/5 — 0%** | 2/3 67% |
| prose · opening | 16/25 64% | 13/15 87% |
| parenthetical · opening | 0/5 0% | 2/3 67% |
| **absent · opening** | **15/30 — 50%** | 17/18 94% |

Pooled across phases on the production model: **absent 15/35 (43%)** vs parenthetical 39/50 (78%) and
prose 31/40 (78%).

**Task 4's scope (L5/L6/L9 only) is confirmed, and its rationale is now stronger than the plan states.**
The column-absent templates are the worst group on the production model by a wide margin, while the
parenthetical group sits level with prose — which is exactly why the parenthetical rewrite was dropped.

**But the effect is largely a mini phenomenon**: `gpt-5.4` recovers the absent group to 67%/94%. So
Task 4 buys much more for production than a floor test would have suggested. Had we run only the
capability arm, we would have under-valued it.

### Caveat — thin cells, stated rather than buried

`absent · mid/late` is **one board** (`pin-L5-deep-fork`), so 5 runs in arm 1 and 3 in arm 2. Six of
the seven L5/L6/L9 boards in the subset are opening records. The 0/5 is suggestive, not solid; the
50% on 30 opening runs is the load-bearing number for Task 4.

## Agent-graded axes (A3, A4, A5, A7, G1–G6, G7 judgment half)

*(pending — filled in after `grade-fv-sufficiency` runs on each arm)*

## Provenance

- Subset frozen by `server/scripts/reason_corpus/build_boards_subset.mjs` (`SUBSET_IDS`, commit `f378fb1`).
- Answers produced by `compute.mjs` with `--model` stated explicitly on every arm (never the
  `$EXPLAIN_MODEL` default, which is `gpt-5.4` — NOT production's `gpt-5.4-mini`).
- Mechanical axes by `grade_mechanical.mjs` (commit `d0536db`), A6 via production's own
  `mentionsBetterColumn`.

---

# AFTER — post-fix re-measure, 2026-08-21 (branch `worktree-deep-reveal-grounding` @ `3771fba`)

Same 25 frozen boards, same `--model gpt-5.4-mini`, same `--n 5`, condition D. 125 rows, 0 parse
failures. Full analysis: `connect-four/server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-21T21-19-32Z_grade_report.md`.

## Per-run axis rates, before → after

| axis | before | after |
|---|---|---|
| A1 / A2 | 100% / 100% | 100% / 100% |
| A3 | 90% | 92% |
| A4 | 86% | 87% |
| A5 | 90% | 93% |
| A6 | 68% | 76% |
| A7 | 76% | 83% |
| G2 | 86% | 91% |
| G4 | 96% | 91% |
| G5 | 92% | 91% |
| **G7b (mechanical)** | **87%** | **98%** |
| G7 (overall) | 78% | 71% |
| G1 / G3 / G6 | 84% / 100% / 100% | 94% / 100% / 100% — **NOT comparable**, 50 vs 125 runs graded |

A7 sub-test failures: A7a 7→3 · A7b 18→13 · A7c 9→6 · A7d 5→1.
Cases passing: 6/25 → 5/25. Triage: `prompt_confusion` 14 · `render_bug` 6 · `missing_info` 0 ·
`vector_error` 0 (**zero reason-engine failures, again**).

## A6 by stratum and template group — the attribution actually fails

| group | before | after |
|---|---|---|
| mid/late (13 boards) | 83% | 80% |
| opening (12 boards) | 52% | 72% |
| TREATED L5/L6/L9 (pooled) | 43% pass | 54% pass |
| CONTROL L1/L2/L4/L8 (mid/late) | 87% pass | 78% pass |
| L3/L7 prose (mid/late) | 100% | 100% |
| L3/L7 prose (opening) | 64% | 88% |

The entire A6 headline gain is the **opening** stratum, which this plan declares confounded (Task 4 and
Task 6 land together) and says must not be read as evidence for the salience hypothesis. The treated
group's predicted "~58% → near zero" failure came out **57% → 46%**, and the control group **moved the
wrong way**. Three boards (`pin-L9-hedged-parity` 5/5, `eval-35` 4/5, both TREATED L9; `eval-36` 5/5,
CONTROL L8) fail A6 while the prompt states the column verbatim, because the model paraphrases it as
"the central move". **The A6 result does not support "prose beats parenthetical."**

## Capability arm (`gpt-5.4`, n=3)
A1 100% · A2 100% · A6 **89%** · G7a 100% · G7b 97%. The A6 capability gap **narrowed from 24 pts to
13 pts** — the shipped model closed about half of it.

## Status of Step 4 (full-corpus sweep)
**NOT RUN.** The plan gates it on "the subset shows the predicted movement". It partly does not (see
above), and the subset surfaced a defect this branch introduced (`pin-L5-deep-fork`) plus a control
regression (`eval-37`). Running a 63-board sweep before resolving those would measure known-defective
code.

---

# FINAL — post-fix re-measure, 2026-08-23 (`2ef3ccb`) — SUPERSEDES the 08-21 section above

The 08-21 numbers measured `3771fba`, which carried a defect that measurement itself found (the
fork-pivot role text). This section measures the code that ships. Same frozen 25 boards, same
`--model gpt-5.4-mini`, same `--n 5`. Report:
`connect-four/server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-23T15-16-19Z_grade_report.md`

| axis | pre-fix | 08-21 | **final** |
|---|---|---|---|
| A3 | 90% | 92% | **98%** |
| A4 | 86% | 87% | 81% |
| A5 | 90% | 93% | **94%** |
| **A6** | **68%** | 76% | **84%** |
| A7 | 76% | 83% | 81% |
| G2 | 86% | 91% | 91% |
| G4 | 96% | 91% | 89% |
| G5 | 92% | 91% | **96%** |
| **G7** | **78%** | 71% | **66%** |
| G7b (mechanical) | 87% | 98% | **98%** |
| cases passing | 6 | 5 | 5 |
| **`render_bug` triages** | **7** | 6 | **5** |
| `prompt_confusion` triages | 11 | 14 | 15 |
| `vector_error` triages | **0** | **0** | **0** |

A6 by group: treated L5/L6/L9 43% → 54% → **74%**; control L1/L2/L4/L8 (full slice) 78% → 78% → 82%;
L3/L7 prose 78% → 93% → 95%. A7 sub-tests: A7c **9 → 6 → 4**.

**Read:** the branch removed render-layer defects (`render_bug` 7 → 5, `vector_error` 0 throughout) and
shifted the residual to model compliance (`prompt_confusion` 11 → 15).

**CORRECTED on the G7 row (2026-08-23, same day).** An earlier draft of this section said "G7's decline
is real: Tasks 6 and 8 grew the required set". **That is wrong — the data says the opposite.** Only 5 of
the 25 boards had their offer/required set changed by this branch at all (`eval-11`, `eval-13`,
`eval-16`, `eval-20`, `pin-L5-deep-fork`, verified by re-rendering both commits and diffing). Splitting
G7 on that line: the **5 boards we changed went 52% → 64%**, while the **20 we left untouched went 84% →
66%**. The decline is entirely on prompts this branch did not structurally change, and none of the five
boards driving it is one we changed.

G7 is therefore **not comparable across these runs**. The likeliest cause is a stricter grader: the
08-11 grading ran the skill directly, while both 08-2x runs used a `GRADER_INSTRUCTIONS.md` that
foregrounds the judgment half. `eval-32` is the proof case — the pre-existing, unchanged L4 raw-`cNrM`
text fails it 5/5 here after passing two earlier gradings. The comparable half, produced by the same
script both times, is **G7a 100% → 100% and G7b 87% → 98%**.

Enforcement may still be the right next lever, but this measurement does not establish it.

**Two corrections to the 08-21 section:** (1) its "control moved the wrong way" was a *mid/late-only*
slice; on the full control slice the control is flat. (2) Per-board A6 at n=5 is very noisy — two runs
differing by two wording changes moved `pin-L9` 0/5→4/5 and `eval-35` 1/5→4/5. Trust deterministic
failures; treat intermittent per-board deltas as noise until replicated.

**Step 4 (63-board sweep): still NOT run**, per the owner's decision to defer it until the fixes landed.
It is now unblocked — the fixes are in and the subset shows the predicted movement on A6/A7c.
