# fv-sufficiency runs

Answers + grades for the feature-vector sufficiency experiment. Read by
`GET /api/admin/fv-suff` (`server/index.js`'s `FV_SUFF_RUNS_DIR`) and written by
`server/scripts/compute.mjs --llm`.

> ## ⚠️ Every score in this directory is a FLOOR, not shipped behaviour
>
> `compute.mjs --llm --condition D` calls the model **once**. Production (`computeMechanism`) gets a
> second attempt whenever the answer omits a required square/line or never names the better column —
> both misses folded into one amended retry prompt. The harness does not exercise that path (**OI-183**).
>
> Measured 2026-08-26 by replaying the 125 runs of `…2026-08-25T20-16-50Z` through production's own
> trigger functions: **48 of 125 runs (38%) would have been retried** — 34 for a missing required
> handle, 22 for an unnamed better column. A6, A7c and G7 are the axes this understates most.
>
> **Consequence for readers:** a graded failure of the form "the model ignored the required set" or
> "never named the column" may already be handled in production. Two sessions concluded from these
> tables that enforcement was missing and needed building; it has existed all along. Check OI-183
> before acting on that failure family.
>
> Owner decision 2026-08-26: harness left unchanged deliberately; carry this caveat instead.

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

## Grader rubric versions (added 2026-08-25; dispatch-wrapper column added 2026-08-27, epic 059 T007)

Judgment-axis numbers (A3–A5, A7, G1–G7's judgment half) are only comparable between runs graded with
**both the same rubric version AND the same dispatch-wrapper identity** — the "methodology defect
found the same day" (`docs/epics/deep-reveal-remediation-epic.md`, "The evidence") showed the dispatch
message wrapping a frozen rubric is itself part of the instrument: the 08-26 run used rubric `v1`
unchanged but a dispatch message that deviated from the skill's own fixed three-line format (it listed
open issues by number), and that alone is the best-supported explanation for that run's A5 delta. The
frozen rubric files are `GRADER_INSTRUCTIONS_v1.md` (superseded for new runs),
`GRADER_INSTRUCTIONS_v2.md` (adds the per-axis "which string is graded" statement — pre-guard
`mechanism` vs post-guard `servedExplanation` — spec 059 US1 / T005) and, since 2026-09-01,
**`GRADER_INSTRUCTIONS_v3.md` (current)** in this directory.

**v3 = v2 verbatim (first 330 lines byte-identical, `diff`-verified) + one appended subtest,
`A7e SEVERITY`.** A7e fires only when the after-played board leaves the opponent a gravity-top four
(a mate in 1) and requires the served text to make it unmistakable that the opponent finishes on
their very next move; it is N/A otherwise. It triggers on **10 of the 63** corpus records.
**A7 under v3 is strictly stricter than under v2 — A7e can only ADD failures — so a v3-graded A7
number must never be compared against a v1- or v2-graded one.** Motivating case: `eval-29`, where
the played move loses to a mate in 1, all three runs described it as a persisting advantage, and the
case still PASSED A7 3/3 under v2 because no axis required conveying severity.

| run stem | rubric | dispatch wrapper |
|---|---|---|
| `fv_suff_answers_boards_smoke_a7wave1_2026-09-01T16-55-47Z` | **v2** | fixed three-line dispatch + one line naming the answers stem (the rubric's `<ANSWERS_STEM>` placeholder must be filled and two datasets shared the same case ids); 14-case counterexample subset, NOT the full corpus |
| `fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z` | **v3** — graded 2026-09-01 | mandatory checked-in three-line dispatch + the `<ANSWERS_STEM>` line, **Opus** graders, 63 independently dispatched per-case agents in 3 batches of 21, one private grade file each. Generated with `--retry` (first run ever to exercise production's retry: fired on 81/189 runs). Sonnet was rejected as grader after a 10-case blind calibration failed its pre-registered rule (A7 disagreement 40% vs a 24% Opus-vs-Opus band; every case-pass disagreement ran the same direction, Sonnet passing what Opus failed). |
| `fv_suff_answers_boards_2026-08-06T16-04-29Z` | skill directly (unversioned) — **not comparable** to v1/v2 | pre-freeze, no fixed-three-line dispatch existed yet |
| `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z` | skill directly (unversioned) — **not comparable** to v1/v2 | pre-freeze, no fixed-three-line dispatch existed yet |
| `fv_suff_answers_boards_subset_2026-08-21T21-19-32Z` | **v1** | legacy: full rubric text regenerated fresh to `<scratchpad>/GRADER_INSTRUCTIONS.md` each run (`SKILL.md`'s pre-T006 step 2) |
| `fv_suff_answers_boards_subset_2026-08-23T15-16-19Z` | **v1** | legacy: same scratchpad regeneration |
| `fv_suff_answers_boards_subset_2026-08-25T15-57-08Z` | **v1** | legacy: same scratchpad regeneration |
| `fv_suff_answers_boards_subset_2026-08-25T20-16-50Z` | **v1** | legacy: same scratchpad regeneration |
| `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` | **v1** (rubric file) | **deviated** from the skill's own fixed three-line dispatch — the dispatch message additionally listed known-open issues by number (including "OI-194 (raw cNrM notation)"); see the dispatch-wrapper-priming analysis in the 08-26 section below. This is the confounder T006/AC 4 exist to eliminate. |
| *(any run graded after 2026-08-27, epic 059 T006 lands)* | **v2** (must be) | mandatory checked-in three-line dispatch pointing at `GRADER_INSTRUCTIONS_v2.md`, no out-of-rubric context (spec 059 T006/T006a) — no run graded with this dispatch wrapper exists yet as of this entry |

### v3 + retry results, 2026-09-01 (the v3 baseline)

`fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z` — condition D, `gpt-5.4-mini`, n=3, all 63
boards, 189/189 answers, 0 parse/call errors. **This run is its own comparability group**: no prior run
combines rubric v3, retry-on and the full 63 boards, so its judgment axes cannot be compared to any
earlier number. Per-run rates:

| A1 | A2 | A3 | A4 | A5 | A6 | A7 | G1 | G2 | G3 | G4 | G5 | G6 | G7 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 100 | 98 | 86 | 98 | 94 | **73** | 95 | 97 | 99 | 99 | 95 | 100 | 96 |

Cases fully passing 20/63; of the 43 failures, 35 intermittent and **8 systematic** (all runs).
Triage: 27 `prompt_confusion`, 16 `render_bug`, **0 `vector_error`, 0 `missing_info`** — as in every
prior run, the engine's evidence is not the problem.

**A7e fired on 6 of its 10 trigger records** (`eval-29` ×2, `eval-33` ×2, `eval-37`, `eval-40`,
`pin-branch-invariance-true-2` ×2, `pin-branch-invariance-true-3` ×2 — 10 run-level charges) and on
**zero** non-trigger records. `eval-32`, `eval-39`, `eval-45` and `pin-L4-missed-defense` passed it.
Crediting back the 8 runs whose ONLY A7 failure was A7e gives a v2-equivalent reading of **this same
run** of 146/189 = 77.2% — the internal estimate of what A7e costs, and the only A7e-vs-no-A7e
comparison that holds the run fixed.

Mechanical axes (A1, A2, A6, G7a/G7b membership) come from `grade_mechanical.mjs` and ARE comparable
across all runs — that script did not change.

**Record the rubric version AND the dispatch-wrapper identity here for every future run.** To change
the rubric, add a `_v2.md` (or higher); never edit a frozen version in place. As of epic 059 T006,
`GRADER_INSTRUCTIONS_v2.md` is the skill's sole rubric source (`.claude/skills/grade-fv-sufficiency/
SKILL.md`'s dispatch step no longer regenerates rubric text into a scratchpad copy) — so "dispatch
wrapper" for any future run should normally just be "mandatory checked-in dispatch" unless someone
deviates from the skill again, which is exactly the failure mode this column exists to catch.


## G7 render-fix re-measure, 2026-08-25

`fv_suff_answers_boards_subset_2026-08-25T15-57-08Z` — condition D, `gpt-5.4-mini`, n=5, the frozen
25-board subset, 125/125 answers, 0 call/parse errors. Measures commit `b9be303` (D49: OI-191, OI-192,
OI-195, OI-196). Graded with **v1**, 25 independently dispatched per-case agents, one grade file each.

Comparable to `…2026-08-23T15-16-19Z` (same rubric version, same rollup method: per-run, `null`
excluded).

| axis | 08-23 | 08-25 |
|---|---|---|
| A3 | 98 | 100 |
| A4 | 81 | 78 |
| A5 | 94 | 88 |
| A6 (mech) | 84 | 80 |
| A7 | 81 | 74 |
| G1 | 87 | **97** |
| G2 | 91 | 86 |
| G3 | 100 | 100 |
| G4 | 89 | 80 |
| G5 | 96 | 84 |
| G6 | 100 | 100 |
| **G7** | 66 | **85** |
| G7b (mech) | 98 | 98 |

Cases fully passing: 5/25 → 3/25; 17 of 25 intermittent. Failure triage: 12 `render_bug`,
10 `prompt_confusion`, **0 `vector_error`, 0 `missing_info`** (as in all prior runs — the engine's
evidence is not the problem).

**Read this table with the noise band in mind** (plan STATUS corrections #2 and #4). Every run is
graded by a fresh fleet of 25 agents, and a judgment-axis delta of a few points is not attributable
without a named deterministic mechanism. What IS attributable here is per-board, verified at source —
see the write-up in `docs/superpowers/plans/2026-08-11-baseline-numbers.md`.


## OI-190 re-measure, 2026-08-25 (second run of the day)

`fv_suff_answers_boards_subset_2026-08-25T20-16-50Z` — condition D, `gpt-5.4-mini`, n=5, frozen
25-board subset, 125/125 answers, 0 errors. Measures commit `c0b0d97` (**D50**: one projected board per
deep half + board-truth alias binding). Graded with **v1**, 25 per-case agents.

| axis | 08-23 | 08-25a (D49) | 08-25b (D50) |
|---|---|---|---|
| A3 | 98 | 100 | 100 |
| A4 | 81 | 78 | 80 |
| A5 | 94 | 88 | **76** |
| A6 (mech) | 84 | 80 | 82 |
| A7 | 81 | 74 | 73 |
| G1 | 87 | 97 | 98 |
| G2 | 91 | 86 | **96** |
| G3 | 100 | 100 | 100 |
| **G4** | 89 | 80 | **94** |
| G5 | 96 | 84 | 80 |
| G6 | 100 | 100 | 100 |
| G7 | 66 | 85 | 82 |
| G7b (mech) | 98 | 98 | 98 |

**G4 +14 and G2 +10 are the OI-190 fix.** G4 is the axis defined as "verify every named cell against
`render_decision.finalMovestring`" — exactly what a wrongly-labelled projected board breaks. Ten
separate graders verified the fix cell-by-cell on their own board (eval-2, 5, 6, 11, 13, 20, 21, 35, 38,
pin-L9); `eval-11` and `eval-20`, previously 5/5 deterministic failures, no longer reproduce it.

**A5 −12 was a regression this same change introduced, since fixed.** The second board's caption read
*"for your opponent's punishment"* — and "opponent punishment" is on A5a's own banned-terminology list —
and the extra board gave the model board names to echo. Measured directly on the answers: runs leaking a
render/board label went **0/125 → 10/125**, on exactly the seven records that gained a second board.
Fixed after this run (plain-English caption + an explicit "never name a board" reading-key rule), so
**this table's A5 number does not reflect shipped code**; the next run measures it.

Cases fully passing 3/25 → 2/25; triage 16 `prompt_confusion`, 7 `render_bug`, **0 `vector_error`,
0 `missing_info`**.


## Prose-conversion + caption-fix re-measure, 2026-08-26

`fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` — condition D, `gpt-5.4-mini`, n=5, frozen
25-board subset, 125/125 answers, 0 call/parse errors, `model` read back and verified. Measures commit
`f6282be`, i.e. `cad8d55` (the A5 caption fix) + `086b8ea` (L1/L2/L4/L8 name the better column as
prose). Graded with **v1**, 25 independently dispatched per-case agents, one private grade file each,
concatenated by exact expected filenames into `<stem>_grades.jsonl`.

| axis | 08-23 | 08-25a (D49) | 08-25b (D50) | **08-26** |
|---|---|---|---|---|
| A3 | 98 | 100 | 100 | 100 |
| A4 | 81 | 78 | 80 | 70 |
| A5 | 94 | 88 | 76 | **60 — see caveat** |
| A6 (mech) | 84 | 80 | 82 | **78** |
| A7 | 81 | 74 | 73 | 66 |
| G1 | 87 | 97 | 98 | 94 |
| G2 | 91 | 86 | 96 | 92 |
| G3 | 100 | 100 | 100 | 100 |
| G4 | 89 | 80 | 94 | 100 |
| G5 | 96 | 84 | 80 | 84 |
| G6 | 100 | 100 | 100 | 100 |
| G7 | 66 | 85 | 82 | 88 |
| G7b (mech) | 98 | 98 | 98 | 98 |

Cases fully passing: 0/25; 17 of 25 intermittent. Triage: 12 `render_bug`, 13 `prompt_confusion`,
**0 `vector_error`, 0 `missing_info`** — as in every prior run. The engine's evidence is still not the
problem.

### The A5 number is NOT comparable to the rows left of it — it is a grading artifact

The caption fix worked, measured deterministically: render/board-label leak **0/125** (was 2/125 in
08-25b under this regex; the D50 write-up's 10/125 used a broader one). The banned caption phrase is
gone.

**CORRECTED 2026-08-26 (second correction — the first one was also measured at the wrong layer).** An
earlier version of this section reported raw-`cNrM` incidence as "flat: 123 → 121 → 120" and concluded
that graders charged OI-194 *inconsistently within a run*. Both were artifacts of regexing the WHOLE
raw string, `[zone:c6r2]` **tags included** — while A5's own rubric (`GRADER_INSTRUCTIONS_v1.md:116`)
orders markup stripped before grading. Measured on prose only, with tags dropped:

| run | prose `cNrM` incidence | of those, graders charged A5 | A5 fail rate | A5 |
|---|---|---|---|---|
| 08-25a | 109/125 | 15 (**14%**) | 15/125 | 88 |
| 08-25b | 89/125 | 25 (**28%**) | 30/125 | 76 |
| **08-26** | **62/125** | 49 (**79%**) | 50/125 | 60 |

Two things follow, and they replace the earlier claims:

1. **The defect roughly halved; it was never flat.** `086b8ea` (the prose conversion) cut prose-level
   raw-cell leakage 89 → 62. The code improved on this axis.
2. **Graders were largely CONSISTENT within each run** — at the prose layer, 49 of 50 A5 failures carry
   a prose `cNrM` and only 13 of 75 passes do. What actually moved is the **charge rate across runs**:
   14% → 28% → **79%**. A5 fell while the defect halved, which is only possible if the instrument
   changed.

**The instrument conclusion therefore survives, via a different mechanism than first stated.** The
surviving explanation is dispatch-wrapper priming: this run's dispatch message listed the known-open
issues including "OI-194 (raw cNrM notation)". Note also that
**`GRADER_INSTRUCTIONS_v1.md` contains zero mentions of `cNrM`, coordinates, or notation** — so "the
rubric charges raw cells" was never true either; graders imported that charge from outside the frozen
file. A v2 must **add** an explicit "grade the post-guard prose" rule rather than narrow an existing one.

**OI-194's player-facing severity is low but NOT zero.** Post-guard, raw `cNrM` reaching player-visible
prose is 0/125 — but the guard reaches zero partly by destroying highlights: 5 of 125 runs lose exactly
one `[zone:…]` span each to `P6:raw_coordinate` (5 of 340 spans). That measured cost, not a coordinate
leak, is the correct justification for fixing OI-194.

### What the prose conversion did to A6: nothing — and the first explanation here was WRONG

A6 went 84 → 80 → 82 → **78**: flat inside the established noise band, with no internal control left
(§12f — the control group is spent).

**CORRECTION (same session, before this file was ever acted on).** This section first claimed "~70% of
A6 failures are answers that named the better square as raw `cNrM`, so A6 is capped by OI-194". **That
is false.** It came from regexing the RAW LLM `mechanism` string. Production's `mentionsBetterColumn`
runs `stripInternalTokens` FIRST, which itself rewrites `cNrM`/`cN`/`colN` into "column N" — verified:
`stripInternalTokens('you should have played c2r1 next')` → `'you should have played column 2 next'`.
An answer naming the better column as `c4r3` therefore already PASSES A6. Measuring at the wrong layer
manufactured a finding that does not exist.

Decomposed through production's own function, the 27 A6 failures are:

| category | n |
|---|---|
| names some OTHER column, not the better one | 12 |
| names no column at all | 15 |
| raw `cNrM` standing in for the better column | **0** |

**All 27 fire `mentionsBetterColumn` = false, which is production's own retry trigger.** Per OI-183 the
harness never retries, so 78% is a floor for this axis in the strictest sense — every single failure
would have been re-asked in production.

### The raw-`cNrM` figures in this file measure text that never ships

Applying production's guard and dropping `[zone:…]` delimiters — highlight markup, not prose — gives
**raw `cNrM` reaching player-visible prose: 0 / 125**, reproduced through `guardExplainMoveLlmPayload`
with a real `board` + `allowedSet` (`reasonRenderGuard.mjs:418`, called from `index.js:1470`).
Production defends it three deep: `humanizeGroundedCoordinates` → `promoteRawCoordinates` →
`stripInternalTokens`.

**The eval grades the PRE-guard string, so A5/A7b/G7 are not measuring shipped behaviour.** That is the
instrument defect. See the corrected table above for what the graders actually did with it.

### Deterministic failures (8 of 25, all `render_bug`)

`eval-9`, `eval-21`, `eval-32`, `eval-37`, `eval-41`, `eval-47`, `eval-50`, `pin-L2-enabled-opponent`.
Already-filed reproductions: OI-194 (dominant), OI-202, OI-203 (`eval-41`, 5/5), OI-204 (`eval-50`,
`pin-L2`). `eval-21` and `eval-11` independently hit the same L7/opening centrality contradiction — the
frame invites a centrality explanation while the guardrail forbids one.

New this run: **OI-206** (below).

### Grader claims checked at source

- `eval-33`: "`lostResource.line` renders as four empty objects" — **TRUE**, and now filed as OI-206.
  Its attached reasoning was wrong, though: the field's disposition is `transformed`, not `render`, so
  nothing was *suppressed* that was meant to be shown. Right observation, wrong framing.
- `eval-47`: "`you-immediate-3`'s role is `you-immediate`'s minus its disambiguator" — **textually true,
  not a defect.** D49 scopes disambiguation to a shared `(role, truthBoard)` pair; `you-immediate-3` is
  on `afterPlayed` with no same-role sibling there, so it is left byte-identical *by design*, and the
  prompt prints the board alongside. This is the fourth grader report this week whose secondary claim
  contradicted a committed change; checking at source is what separated it from OI-206.
- `eval-47` secondary that DOES hold: `you-double`'s role reads "the single fork square" while its spec
  is a 3-cell set (`windows:c3r6,c6r5,c7r2`) — a role/spec arity mismatch. Also cosmetic: several roles
  read "you's four-in-a-row line".
