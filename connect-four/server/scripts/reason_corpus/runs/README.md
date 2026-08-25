# fv-sufficiency runs

Answers + grades for the feature-vector sufficiency experiment. Read by
`GET /api/admin/fv-suff` (`server/index.js`'s `FV_SUFF_RUNS_DIR`) and written by
`server/scripts/compute.mjs --llm`.

**File families**, all sharing one stem:

| file | producer |
|---|---|
| `fv_suff_answers_<stem>.jsonl` | `compute.mjs --llm` — one row per (id, condition, run_index) |
| `<stem>_mechanical.json` | `grade_mechanical.mjs` — deterministic A1/A2/A6/G7-membership |
| `<stem>_grades.jsonl` | `grade-fv-sufficiency` skill — judgment axes, one row per (id, condition) |
| `<stem>_grade_report.md` | `grade-fv-sufficiency` skill — the human-readable report |

`*.jsonl` and `*.json` here are **git-ignored** (`.gitignore` has a blanket `*jsonl`), so these are
regenerable artifacts, not version-controlled records. What IS in git: the frozen board list
(`../build_boards_subset.mjs`'s `SUBSET_IDS`) and the analysis
(`docs/superpowers/plans/2026-08-11-baseline-numbers.md`).

---

## Render-remediation experiment, 2026-08-11 — PRE-FIX BASELINE

Captured on the unmodified render layer at commit `7995a87`, before any Phase B fix. Plan:
`docs/superpowers/plans/2026-08-11-deep-reveal-render-remediation.md`. All arms are condition D on the
frozen 25-board subset (`../boards_subset.jsonl`), with `--model` stated explicitly on every run —
never the `$EXPLAIN_MODEL` default, which is `gpt-5.4`, NOT production's `gpt-5.4-mini`.

| stem | arm | model | n | boards | answers |
|---|---|---|---|---|---|
| `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z` | **1 — baseline** (production fidelity; the headline) | `gpt-5.4-mini` | 5 | 25 | 125 |
| `fv_suff_answers_arm2-capability-gpt5.4-n3_2026-08-11T18-38-17Z` | **2 — capability** (the floor test; separates prompt design from model limits) | `gpt-5.4` | 3 | 25 | 75 |
| `fv_suff_answers_arm3-budget4-6-mini-n5_2026-08-11T18-43-54Z` | **3 — budget ablation** (`--sentence-budget "4-6"`; the ONLY variable vs arm 1) | `gpt-5.4-mini` | 5 | 13 | 65 |

Arm 3 covers only the 13 A7-deterministic boards, so it must be compared against arm 1 **restricted to
those same 13 ids** — never against arm 1's 25-board figure.

All three: 0 parse/call errors, every board at its full run count, `model` field read back and verified.

### Earlier corpus

`fv_suff_answers_boards_2026-08-06T16-04-29Z` — the 63-board full-corpus run that motivated the
remediation. Model `gpt-5.4-mini`, n=2, condition D. Its `_grades.jsonl` was produced under the OLD A6
definition (a raw `cNrM` counted as a failure); the current definition follows production's
`mentionsBetterColumn`, which moves 15 of its 126 runs from fail to pass. Do not compare its A6 number
directly against the 2026-08-11 arms.

## Grader rubric versions (added 2026-08-25)

Judgment-axis numbers (A3–A5, A7, G1–G7's judgment half) are only comparable between runs graded with
the **same rubric version**. The frozen rubric is `GRADER_INSTRUCTIONS_v1.md` in this directory.

| run stem | rubric |
|---|---|
| `fv_suff_answers_boards_2026-08-06T16-04-29Z` | skill directly (unversioned) — **not comparable** to v1 |
| `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z` | skill directly (unversioned) — **not comparable** to v1 |
| `fv_suff_answers_boards_subset_2026-08-21T21-19-32Z` | **v1** |
| `fv_suff_answers_boards_subset_2026-08-23T15-16-19Z` | **v1** |

Mechanical axes (A1, A2, A6, G7a/G7b membership) come from `grade_mechanical.mjs` and ARE comparable
across all runs — that script did not change.

**Record the rubric version here for every future run.** To change the rubric, add a `_v2.md`; never
edit a frozen version in place.
