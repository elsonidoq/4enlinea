# Handoff — grade the first `--retry` corpus run under rubric v3, and rebuild the comparison report

You are picking up finished work in a fresh session. Everything below is verified at source; where a
number appears, the command or file that produced it is named. Work from the worktree and never `cd`
to the original repo root:

`/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding`

## Context in four sentences

Connect Four "deep reveal" explains why a move was a blunder: a solver-backed engine emits a feature
vector, a render layer turns it into a grounded prompt offering the LLM a closed set of highlightable
board handles, and the answer is graded on axes A1–A7 / G1–G7. Production retries once when the answer
drops a required handle or never names the better column — and until 2026-09-01 **no eval had ever
exercised that retry**, so every historical number describes text production would have discarded.
A `--retry` flag now exists, and a full 63-board run has been generated with it.
**Your job is to grade that run and make the comparison legible. You are not fixing code.**

## The artifact

- **Answers:** `connect-four/server/scripts/reason_corpus/runs/fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z.jsonl`
  — 63 cases x 3 runs = 189 rows, 0 errors, generated with `--condition D --retry --model gpt-5.4-mini`.
- **Mechanical pass already done** (`..._mechanical.json`): A1 189/189, A2 189/189, A6 178/189 (94%),
  G7a 189/189, G7b 189/189. **Copy A1/A2/A6/G7a/G7b through; do not re-derive them.**
- Retry statistics for this run: fired on **81 of 189 (43%)**; recovered **74 of 81 (91%)** — 57 fully
  fixed, 17 partial, 7 unchanged.

## Step 1 — grade 63 cases, on OPUS

**Rubric: `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v3.md`.** It is
`GRADER_INSTRUCTIONS_v2.md` byte-identical for its first 330 lines plus one appended subtest,
**A7e SEVERITY**. Do not use v1 or v2.

**Grader model: Opus, all 63.** This is decided, and the reason matters: a Sonnet calibration on 10
blind-re-graded cases FAILED its pre-registered rule — A7 disagreement 40% against a measured
Opus-vs-Opus band of 24%, G1 16% against 8%, triage agreement 5/10 against a 8/10 threshold — and
**every single case-pass disagreement ran the same direction, Sonnet passing what Opus failed.** This
run becomes the v3 baseline every future wave compares against; a lenient or mixed-standard grader
would bake that bias into the whole series.

**Dispatch format is a hard constraint, not a style preference.** Each grader gets EXACTLY these lines
and nothing else — no open-issue lists, no hypotheses, no "known traps", no rationale for the case:

> Read `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v3.md` in full and follow it
> exactly. Your case: id = `<id>`, condition = `D`. Your answers file stem is
> `fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z`. Your grade output file:
> `connect-four/server/scripts/reason_corpus/runs/parts_v3retry63/<id>__D.json`.

Carrying anything more is a **measured** methodology defect: the 2026-08-26 run's dispatch listed open
issues by number and contaminated that run's A4/A5/A7 deltas. The stem line is the one permitted
addition — the rubric carries an `<ANSWERS_STEM>` placeholder that must be filled, and it cannot be
inferred. Sanitise awkward ids for the FILENAME only (`pin-L1-completes-your-tactic` -> `pin-L1__D.json`);
the `id` inside the JSON stays verbatim.

**Dispatch in THREE BATCHES OF 21, and STOP for owner confirmation between them.** `mkdir -p
.../parts_v3retry63` first. Each agent owns a private output path and never appends to a shared file.

- **Batch 1** — the first 21 case ids, in the order they first appear in the answers file. Launch all
  21 in ONE message (multiple tool calls), then wait for every one to return.
- **Then STOP.** Do not start batch 2 on your own initiative. Report to the owner: how many of the 21
  returned cleanly, how many failed or returned malformed JSON, the pass/fail split so far, anything
  that looked wrong, and the running cost. Then **ask for explicit confirmation to proceed**, using
  `AskUserQuestion` so it is a real gate and not a rhetorical question. Wait for the answer.
- **Batch 2** — the next 21, same rule. Stop and report and ask again.
- **Batch 3** — the final 21. Then proceed to the merge.

This is the owner's instruction and it is a hard gate: **63 Opus graders is the most expensive thing in
this workflow, and the batching exists so a systematic problem (a bad dispatch, a wrong rubric path, a
contaminated batch) is caught after 21 agents rather than after 63.** If batch 1 surfaces something
wrong, say so plainly and recommend fixing before continuing rather than pressing on.

While a batch runs, do NOT start the dashboard work — a partial `_grades.jsonl` would produce a table
that looks complete and is not.

When all 63 have returned, **you** concatenate them with a `node -e` script (not `cat`) into
`..._grades.jsonl`, one line per case, ordered by first appearance of `id` in the answers file,
asserting the count is 63 and that every dispatched id is present. A missing or unparseable part gets a
`case_pass:false, notes:"sub-agent error"` line written by you rather than being silently dropped.

## Step 2 — rebuild the report and add the comparison table

Target: `docs/deep-reveal-release-dashboard.html`, built by
`connect-four/server/scripts/reason_corpus/build_release_dashboard.mjs` (its `DS` map near line 27
declares the datasets; `jl()` reads `runs/<answers>.jsonl` and `<answers>_grades.jsonl`).

**The full table specification is INLINED at the end of this document** ("Appendix — comparison
table specification"). It was originally written to `.superpowers/sdd/`, which is git-ignored
scratch; it is reproduced here so this handoff stands alone.

Its requirements in brief (the spec has the detail and the measured numbers):

- **All 13 graded runs**, newest first — every answers file with a `_grades.jsonl` sidecar.
- **Comparability must be visually obvious.** Two rows are comparable only if *rubric version*,
  *retry setting* and *eval-set size* all match. Compute a comparability group from that triple and
  render it as a coloured left border plus a short chip (A, B, C…). Legend: same chip = directly
  comparable; different chip = do not compare judgment axes.
- **Expected effect of each instrument change**, in a legend above the table, with the measured basis:
  v2→v3 expect A7 **down** (A7e can only add failures; 10/63 records trigger; ≤25 runs at risk; worst
  case 60.3% → 47.1%); retry off→on expect A7 **up** (fires ~43–50%, recovers ~91%); 63→subset **not
  comparable in absolute terms** (subsets over-sample hard cases by design).
- **Heatmap** on numeric cells, greener = higher / redder = lower, on a **fixed 0–100 scale** so colour
  always means absolute quality and never a within-row rank.
- **Light-red highlight** on the run/case-count cell whenever cases < 63.
- **Columns:** run stem, date, cases, runs, rubric, retry, model, locale, then the axis rates.
- **Prose brief but self-contained** — a reader opening the HTML cold must understand it without the
  decision log: what the axes are, that judgment axes carry a measured grader band (±20–24% run-level
  even Opus-vs-Opus), and that the chip governs comparability. Roughly one short paragraph plus the legend.

Add the new run to the builder's dataset map as well, so the existing per-case sections cover it.

## Traps that have already cost this project time

- **`usedSpecs` must come from `raw`.** Recomputing it from the stored `answer` returns EMPTY for every
  row (measured 42/42) because the mechanism is already post-processed and `processAnnotations` matches
  `[zone:<handle>]`. It fails as a plausible *finding* ("the model never complies"), not an error.
  Correct: `parseAnswer(row.raw)` -> `postprocessAnswer(answer, row.render_decision)` -> its `usedSpecs`.
- **Grader contamination.** If two grade files cite the same cell / movestring for DIFFERENT records,
  one graded the wrong board. It happened on 2026-09-01 (`eval-29`'s grade described `pin-L6`'s board),
  produced a phantom regression and a wrong D-log entry, and the file was schema-valid and confident.
  Cross each grade's cited cells against that record's own `feature_vector`; a cell that appears nowhere
  in the vector is proof. Re-grade to a fresh path and keep the bad file as evidence.
- **Movestring digits are 0-indexed columns directly** (`playedCol` 1 appends `'1'`). An agent got this
  backwards this week.
- **Look records up by id, never by line number** — ids are not positional.
- **Triage labels are hypotheses**, not counts to sum: blind re-grading agreed only 7/10.

## Constraints

- **Do NOT commit and do NOT `git add`.** The owner commits WIP himself, and a background process
  commits STAGED work unpredictably. Leave everything unstaged. Never `git stash`.
- Do not create new test files; do not touch `package.json`. `npm run test:fast` inside `connect-four/`
  is currently **2102 pass / 0 fail / 282 suites, 0 eslint errors** — you should not need to change code,
  but if you do, end green.
- `OPENAI_API_KEY` is in `connect-four/server/.env`. Never print or echo it.

## Required reading before you interpret anything

- `docs/architecture/reason-DECISIONS.md` entry **D60** — what the wave changed, its measured numbers,
  **and its "Correction (2026-09-01, post-publication)" block at the end.** That entry was corrected
  four times for one recurring failure: asserting a cause or a number without checking it belonged to
  the record. Read the correction before trusting the narrative, and hold yourself to the same bar.
- `.superpowers/sdd/2026-09-01-deep-reveal-a7-remediation/progress.md` — the full ledger: every task,
  22 controller rulings, and the measurements behind them. **This path is git-ignored scratch and may
  not exist in your checkout.** If it is missing, D60 above carries the load-bearing content; nothing
  in this handoff depends on the ledger.

## What to report

The graded axis rates for the new run; how they compare **within their comparability group** and why
they cannot be compared outside it; whether A7e fired on the expected 10 records and what it caught;
any contaminated grade you found; and the path to the rebuilt dashboard. State plainly anything you
could not verify — that is the most useful line in a handoff.


---

# Appendix — comparison table specification (inlined; source was git-ignored)

Target: `docs/deep-reveal-release-dashboard.html`, built by
`connect-four/server/scripts/reason_corpus/build_release_dashboard.mjs` (its `DS` map at ~:27
currently declares 4 datasets; the table below is a NEW section covering all graded runs).

## R1 — comparability must be visually obvious

A row's numbers are comparable to another row's ONLY if all three match:
  (a) rubric version (v1 / v2 / v3), (b) retry (on / off), (c) eval-set size (63 = full).
Compute a **comparability group** from that triple and give every row a coloured left border plus a
short chip (A, B, C…). Legend: "same chip = directly comparable; different chip = do not compare
judgment axes". One sorted table is kept (owner chose columns+note over banding), so the chip is what
carries the grouping.

## R2 — every instrument difference states its EXPECTED effect

Render a small legend ABOVE the table. Directions are measured, not guessed:

| change | expected effect on A7 | why (measured) |
|---|---|---|
| rubric v2 → v3 | **↓ lower** | v3 adds A7e SEVERITY; it can only ADD failures. Triggers on 10/63 records; 25 of their 30 runs pass A7 under v2, so worst case 114/189 (60.3%) → 89/189 (47.1%). |
| retry off → on | **↑ higher** | measured 2026-09-01: retry fires on ~50% of runs and recovers 90% of those (12 fully fixed / 7 partial / 2 unchanged of 21 firings). Only a retry-on run reflects what production serves. |
| 63 cases → subset | **not comparable in absolute terms** | subsets (25-case, 14-case) deliberately over-sample hard/rare cases, so their rates are not corpus rates. |
| model change | direction unknown | note it; do not predict. |

## R3 — brief but self-contained

A reader opening the HTML cold must understand it WITHOUT the D-log. Cap the prose at roughly one
short paragraph plus the legend table. It must convey: what the axes are, that judgment axes carry a
measured grader band (±20–24% run-level even Opus-vs-Opus), and that the chip governs comparability.
No links required for comprehension.

## Also required

- **Heatmap** on numeric axis cells: greener = higher, redder = lower, on a fixed 0–100 scale so the
  colour always means absolute quality (never a within-row rank).
- **Partial-run highlight**: light red on the run/case-count cell whenever cases < 63.
- **Columns**: run (stem), date, cases, runs, rubric, retry, model, locale, then the axis rates.
- **All 13 graded runs** (those with a `_grades.jsonl` sidecar), newest first.
