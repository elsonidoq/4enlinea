# P4 A-vs-D ablation runbook — hand-off

**Purpose:** this is a **hand-off runbook**, not a completed experiment. It sets up and documents
the A-vs-D ablation comparing the raw glossary+JSON prompt (condition A) against the grounded,
render-decision-backed prompt (condition D, Phase 1–4) on the same frozen board set. Running it
requires an LLM budget and is non-deterministic; **do not run it as part of a docs task** — hand it
to whoever owns the next LLM-budget session.

Read `docs/architecture/reason-render-grounded-prompt.md` (condition-D design) and
`docs/architecture/reason-DECISIONS.md` D28/D29 before interpreting results.

## Prerequisites

- `OPENAI_API_KEY` set in `connect-four/server/.env`.
- `EXPLAIN_MODEL` set in `connect-four/server/.env` (or pass `--model` on the command line) — the
  model under test (the design doc's motivating model is `gpt-5.4-mini`).
- LLM budget: 29 boards × 2 conditions (A, D) × `--n 3` samples = up to 174 LLM calls. Budget
  accordingly before kicking this off.
- **Non-deterministic.** LLM sampling means re-runs can disagree on borderline cases; if a grading
  result looks surprising, rerun before concluding it's a real regression.
- **Run this ALONE.** Never run it concurrently with a solver harvest (`select_boards.mjs`,
  `build_evidence.mjs`, any `gameSampling`-backed script) or `npm run test:fast` — both this script
  and the solver harness spin up c4solver subprocesses over IPC, and concurrent solver-IPC use has
  caused hangs/deadlocks before (see `docs/architecture/testing-conventions.md`). Run it as the
  only thing touching the solver in that window.

## Step 1 — generate the answers file

The frozen-29 input board set is already committed:
`connect-four/server/scripts/boards_coverage_2026-07-02T11-37-56Z.jsonl` (this is the file that
produced the committed `reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` evidence — do
not regenerate it; use it as-is per D29, which retains this set as the ablation + regression anchor
distinct from the newer P4 32-board coverage set).

Run, from the repo root:

```bash
cd connect-four && node server/scripts/compute.mjs \
  --input server/scripts/boards_coverage_2026-07-02T11-37-56Z.jsonl \
  --llm --condition A,D --n 3
```

This produces a timestamped answers file:

```
connect-four/server/scripts/fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_<ts>.jsonl
```

Each line carries the board id, condition (`A` or `D`), the `n` LLM samples, and — **only on
condition-D lines** — a `render_decision` object (per D29: `case`/`route`/`direction`,
`patternOnAfterBestBoard`, the fired link `{linkId, confidence, covers, guardrail, text}`,
`boards[{id, shown, reason}]`, resource grounding, the field partition
`{rendered, covered, excluded}`, and `finalMovestring`). Condition-A lines carry no
`render_decision` (that condition never runs the render layer).

## Step 2 — grade it

Invoke the `grade-fv-sufficiency` skill on the produced answers file:

```
/grade-fv-sufficiency connect-four/server/scripts/fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_<ts>.jsonl
```

- Condition A is graded on the existing A1–A4 axes (glossary+JSON sufficiency).
- Condition D is graded via **G1–G6** (per `reason-render-grounded-prompt.md` §3f), consuming each
  record's `render_decision` as ground truth — the grader must NOT re-derive routing
  (re-run `classifyCausalLink`, recompute `patternOnAfterBestBoard`, or re-select boards). Per D29,
  cells are checked against the record's own `finalMovestring` (G4), never an alternate solver PV.

## Acceptance signals to check in the grading output

- **eval-3** no longer frames the deep fork as near-term (the horizon-from-`register` fix, D28 §1 /
  P3).
- **eval-23** stops asserting causation on a branch-invariant (`patternOnAfterBestBoard`-true) board
  — the L2-vs-L3 fix (D28 §3).
- **No regression** on the other 27 boards relative to their prior condition-A grades.
- **Per-link G1–G6 rubric green** for every fired link across the 29 boards: format-aware grading
  (G1), guardrail honored + no over-removal + low-confidence hedging (G2), board-selection audit
  (G3), engine-line grounding via `finalMovestring` (G4), threat-list fidelity (G5), and
  branch-invariance provenance — a wrong `patternOnAfterBestBoard` call is a render bug, not a model
  failure (G6).

## What NOT to do

- Do not regenerate or hand-edit the frozen-29 input file — it is the fixed ablation anchor.
- Do not run this concurrently with any other solver-backed script.
- Do not treat a single run's borderline result as final — LLM sampling is noisy; rerun before
  calling a regression real.
- Do not modify `grade-fv-sufficiency`'s rubric mid-run to make a result pass; if the rubric looks
  wrong, stop and revisit `reason-render-grounded-prompt.md` §3f / D29 first.
