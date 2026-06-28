---
name: grade-fv-sufficiency
description: Use when grading a Feature-Vector Sufficiency Experiment answers jsonl (fv_suff_answers_*.jsonl from explain_from_vector.mjs) against the frozen run_eval --no-llm vectors — scores axes A1–A4 and emits a counterexample report attributing failures to feature-field / glossary gaps
argument-hint: "<path-to-fv_suff_answers_*.jsonl> [--vectors <frozen_vectors.jsonl>]"
user-invocable: true
---

# Feature-Vector Sufficiency Grader

You are grading a batch of structured blunder-explanations produced by the answerer
`server/scripts/explain_from_vector.mjs` (the "answerer"). Each explanation was written by a model
that saw **only** the feature vector + the glossary
(`docs/architecture/feature-vector-glossary.md`) — no tools, no solver ground truth. **You are the
oracle:** you have the solver, the board, and the frozen record's ground-truth fields. Read the
experiment spec first: `docs/architecture/feature-vector-sufficiency-experiment.md` (§4 schema, §5
axes + pass rule, §7 output).

## Core principle: the feature vector + glossary are the artifact under test, not the model

The model is a strong model (`gpt-5.4`) running a **floor test**: if even it cannot make a case
crystal-clear from the vector, the deficiency is a **context blindspot** — a missing or ambiguous
**feature field** or a **glossary ambiguity** — not a capability gap. So when an explanation fails
A3/A4, do not stop at "the model was wrong." Trace the failure to *what the vector did not carry or
the glossary did not disambiguate*. That attribution is the deliverable: the **counterexample
list** drives the next vector/glossary improvement. The pass-rate number is secondary.

## Core principle: an honest "couldn't tell" is a feature-gap signal, not a fabrication

The answer schema has an `unsure_about` field. Content there is the model **abstaining** because the
vector did not let it determine something. That is **excluded from A4** (it is NOT a fabrication) and
is itself a **candidate field gap** — log every non-empty `unsure_about` as a counterexample
attributed to whatever field would have resolved it. A wrong *claim* fails A4; an honest *abstention*
does not. Never conflate the two.

## Core principle: observe the board with tools, never infer it from the vector

You can run tools — use them to OBSERVE ground truth. Deciding "that fork exists" by reading the
vector's `lookahead.ways` is circular (the vector is what's under test). Run the position through
the visualizer and read its threat annotations. Prefer the observation whenever a claim is concrete
and load-bearing.

- **`./visualize_board.sh <movestring>`** (from repo root) — authoritative board view: raw board,
  annotated board marking every major/minor threat cell, the `par` row (per-column parity), the
  `scr` row (solver score per column), and an explicit major-threat list. Build movestrings as
  `board_state + correct_move` (after-best board) or `board_state + move_played` (after-played
  board). Use it to fact-check any board claim in A3/A4.
- **The solver** — `createSolverProcess` from `connect-four/server/c4solver-wrapper.js`: `cd
  connect-four`, `await solver.query(movestring)`, and `solver.destroy()` in a `finally` or it hangs.
  Queries on terminal/won positions throw "Invalid position" — guard each individually. Use it to
  confirm a move's true outcome.

## Coordinate normalization (do this before every comparison)

- `feature_vector` cells and the answer's `key_cells` are **`cNrM`, 1-indexed** (column 1 = leftmost,
  row 1 = bottom).
- The answer's `better_move` is **1-indexed display** (1–7), as the answerer's prompt states.
- The record's `correct_move`, `move_played`, and `feature_vector.{playedCol,bestCol}` are
  **0-indexed**.
- So A1 check is: `answer.better_move - 1 === record.correct_move`. When pasting columns into a
  movestring for `visualize_board.sh`, use the **0-indexed** value.

## Pruning-aware reading

The answerer prunes the vector to honor glossary §6 (absence = "not present"): empty maps, all-zero
`{count,cells}` buckets, nulls/false/empty strings are dropped before the model sees them. So if a
field is absent from the answer's `fields_relied_on` or the model says "no minor threats," that is
the model correctly reading an absence — **never** score it as "the model failed to use a field."

## Input

Two files, joined by `id`:

1. **Answers jsonl** (the argument): one line per `(id, run_index, condition)`. Shape:
   ```json
   { "id":"eval-0", "run_index":0, "condition":"A", "model":"gpt-5.4",
     "pattern_category":"drawing_move",
     "answer": { "better_move":4, "played_outcome":"draw", "best_outcome":"win",
                 "mechanism":"…", "key_cells":["c4r1",…], "fields_relied_on":["lookahead.case",…],
                 "unsure_about":"…", "confidence":"medium" },
     "raw":"…", "parse_error":null, "call_error":null }
   ```
2. **Frozen vectors jsonl** (default: the `eval_set_fv_suff_frozen_vectors.jsonl` next to the answers,
   or `--vectors <path>`): the full `run_eval --no-llm` records. Oracle fields per record:
   `correct_move`, `move_played`, `board_state` (== `feature_vector.movestring`), `premove_scores`,
   `played_scores`, `best_scores` (the last two are **opponent-perspective**, after the move),
   `feature_vector` (with `bestCol`, `playedCol`, `tag`, `direction`,
   `lookahead.{bestOutcome,postBlunderOutcome}`, `threatStats`, `patterns*`), `prompt_data`.

If a record has `call_error` or `parse_error` non-null, or `answer` is null, that run is a **parse
failure** — count it, exclude it from axis scoring, and treat the case as failing the pass rule
(a run that produced no gradeable answer cannot pass on all N runs).

## How to grade — per `(id, condition)`, across all N runs

Group answer rows by `(id, condition)`. Each group has up to N runs (default 3). A **case** is one
`(id, condition)` pair. Score the four axes (spec §5):

| Axis | What | How | Weight |
|---|---|---|---|
| **A1 better move** | `better_move - 1 === correct_move` | code (record field) | sanity |
| **A2 outcomes** | `played_outcome` matches `feature_vector.lookahead.postBlunderOutcome` and `best_outcome` matches `lookahead.bestOutcome` (strip the `_with_best_play` suffix → `win`/`draw`/`loss`); cross-check sign with the solver | code + solver | sanity |
| **A3 mechanism real & load-bearing** | the named tactic/threat and `key_cells` actually exist on the relevant board AND are the **decisive** reason (not a true-but-peripheral one) | board (`visualize_board.sh`) + solver | **high** |
| **A4 no fabrication** | every concrete claim (cells, threats, lines) is true on the board; `unsure_about` content is **excluded** | board verification | **high (zero tolerance)** |

A1/A2 are **sanity checks**: the vector already gives `bestCol` and the outcome labels, so a miss
there is a **glossary-read** failure (the model couldn't even read the vector), which is itself a
glossary counterexample. The substance is **A3/A4**.

**A2 outcome mapping** — `feature_vector.lookahead.bestOutcome`/`postBlunderOutcome` are the
reference. Map `win_with_best_play`→`win`, `draw_with_best_play`→`draw`, `loss_with_best_play`→`loss`.
If `lookahead` is absent/null, derive from the solver: `best_scores`/`played_scores` are
opponent-perspective after the move, so the moving player's outcome = sign of `-(opponent best
legal score)` (>0 win, =0 draw, <0 loss).

**Per-run vs per-case.** Score each axis on **every run** in the group. The **case passes iff A1–A4
hold on ALL N runs** (spec §5). Intermittent success = **fail** — it exposes latent ambiguity in the
context. Record which runs failed and how they differed (e.g. run 0 named the fork, run 2 didn't).

### Scoring via sub-agents

For each `(id, condition)` group, spawn a fresh `general-purpose` sub-agent (it runs in the repo
root with shell access, so it can use `./visualize_board.sh` and the solver directly). Process groups
**sequentially** — there can be many. Give the sub-agent ONLY that group's data plus the record's
oracle fields. Sub-agent prompt template:

---
```
You are grading Connect Four blunder-explanations for ONE case (one position, one ablation
condition) across N independent runs. Output ONLY a valid JSON object — no prose, no fences.

You are an AGENT with shell access, run from the repo root. For any board-level claim (A3/A4) you
MUST OBSERVE the board, not infer it from the feature vector (the vector is the artifact under
test). Run `./visualize_board.sh <movestring>` and read its threat/par/score annotations:
- after-best board:   <board_state><correct_move 0-indexed>
- after-played board: <board_state><move_played 0-indexed>
For a move's true outcome, query the solver (createSolverProcess from
connect-four/server/c4solver-wrapper.js; cd connect-four; await solver.query; destroy() in finally).

## Case metadata (oracle — the model did NOT see these)
- id: <id>   condition: <condition>
- board_state: <board_state> (pre-move movestring; append a 0-indexed column for a board)
- move_played (0-indexed): <move_played>  → display column <move_played + 1>
- correct_move (0-indexed): <correct_move> → display column <correct_move + 1>
- pattern_category: <pattern_category>   tag: <feature_vector.tag>   direction: <feature_vector.direction>
- lookahead.bestOutcome: <…>   lookahead.postBlunderOutcome: <…>
- premove_scores: <…> (player-perspective)  best_scores / played_scores: <…> (opponent-perspective, after the move)

Coordinate rule: answer.better_move is 1-indexed display; key_cells are cNrM 1-indexed; the oracle
cols above are 0-indexed. A1 holds iff better_move - 1 == correct_move.

## The N runs to grade
<for each run: run_index, and the full `answer` JSON. Include any parse_error/call_error.>

## Score each axis on EACH run, then apply the pass rule
- A1: better_move - 1 == correct_move?
- A2: played_outcome == map(postBlunderOutcome) AND best_outcome == map(bestOutcome)
      (win_with_best_play→win, etc.); cross-check sign with the solver if unsure.
- A3: Does the mechanism's named tactic/threat exist on the after-best / after-played board
      (verify with visualize_board.sh), and is it the DECISIVE reason the better move wins/holds
      (not a true-but-peripheral observation)? Use the solver to confirm the outcome difference is
      real. key_cells must be the squares that reason rests on.
- A4: Is EVERY concrete claim (each key_cell's threat, each named line/fork) actually true on the
      board? A claim contradicted by the visualizer = A4 fail (zero tolerance). EXCLUDE anything the
      model put in `unsure_about` — that is honest abstention, not fabrication.

Abstention: for each run, capture `unsure_about` verbatim. It is a FEATURE-GAP signal: note which
vector field (or glossary section) would have resolved it.

Pass rule: the CASE passes iff A1, A2, A3, A4 all hold on ALL runs. Any run failing any axis →
case fails. Note intermittency explicitly.

## Counterexample attribution (the deliverable)
If the case fails A3 or A4, OR any run has a non-empty `unsure_about`, attribute it: name the
specific feature-vector FIELD that was missing/ambiguous (e.g. "patternsPostBlunder lacked a
figure_7 entry with cells") or the GLOSSARY ambiguity, and state the board finding that proves it.

Output exactly:
{
  "id": "<id>", "condition": "<condition>", "n_runs": <int>,
  "per_run": [ { "run_index":0, "A1":"pass|fail", "A2":"pass|fail", "A3":"pass|fail",
                 "A4":"pass|fail", "unsure_about":"<verbatim or empty>" }, … ],
  "case_pass": true|false,
  "intermittent": true|false,
  "notes": "<one line per failing axis: what was wrong, with the board finding>",
  "counterexamples": [ { "axis":"A3|A4|abstention", "field_or_glossary":"<the missing/ambiguous
     feature field or glossary section>", "evidence":"<board finding proving it>" } ]
}
```
---

Collect each sub-agent's JSON as it completes. A malformed/no response → record the case as
`case_pass:false` with notes "sub-agent error".

## Output — the report

Write to `<answers-dir>/<answers-stem>_grade_report.md`:

```
# Feature-Vector Sufficiency Report — <answers filename>

## Summary
- Answer rows: N   parse failures: N
- Cases (id × condition): N   passed (A1–A4 on all runs): N   failed: N
- Per-axis pass rate (over all gradeable runs): A1 x/y · A2 x/y · A3 x/y · A4 x/y

## Pass/fail by condition  (A vs B vs C delta — §6 ablation)
| condition | cases | passed | A3 pass-rate | A4 pass-rate |
If B ≈ A, the engineered fields add little for a capable model (the board carries it; won't transfer
to the weak model). If C ≪ A, the distilled fields alone don't carry the reasoning.

## Per-case verdict
| id | category | condition | A1 | A2 | A3 | A4 | pass | intermittent |
(one row per case; A1–A4 = "all runs pass" / "k/N" when mixed)

For each failing or intermittent case, a notes block below its row:
> eval-N (cond A): A3 fail on run 2 — claimed a figure_7 fork the after-played board does not show;
> A4 ok. Board: visualize_board.sh shows "Major threats: none" at c4r4.

## Counterexample list (THE DELIVERABLE)
Every A3/A4 failure and every non-empty `unsure_about`, attributed to a missing/ambiguous feature
field or glossary ambiguity. Group by `field_or_glossary`; order by frequency.
| field / glossary gap | axis | cases affected | evidence (board finding) | model's unsure_about |

## fields_relied_on distribution
Aggregate `fields_relied_on` across all answers. Which engineered fields are actually load-bearing
(cited often in passing A3 cases) vs. never cited? A field no answer relies on is a candidate for
removal or a sign the glossary doesn't surface it.

## Raw answers (per case)
For each case: the board (`board_state`, played/correct cols) and each run's `answer` JSON.
```

## Key rules recap

- `better_move` is 1-indexed; oracle cols are 0-indexed (A1: `better_move - 1 == correct_move`).
- A case = one `(id, condition)`; it passes only if A1–A4 hold on **all N runs**.
- `unsure_about` is excluded from A4 and logged as a field-gap counterexample.
- Observe the board with `visualize_board.sh`/solver; never trust the vector to verify itself.
- The counterexample list (field/glossary attribution) is the point — not the pass rate.

## Do NOT reuse from the production judge

This is NOT `judge-deep-reveals`. Do **not** apply the 9-item production rubric, zone aliases,
`allowedSet`, or the annotation gate. Those grade the production annotation; here you grade a
structured explanation against the board on A1–A4 only.
