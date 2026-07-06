# Known issues — opening-phase grounded-render (FV-sufficiency, 2026-07-06)

This folder is a **frozen snapshot** of a Feature-Vector Sufficiency grading run over the
opening-cluster coverage set, kept so the 3 failing evals it surfaced can be fixed later. Nothing
here is fixed yet — this is a documented backlog, not a resolved log.

## What was run

- **Answerer:** `server/scripts/compute.mjs --llm` (condition **D** — the grounded, causally-composed
  render artifact), model `gpt-5.4`, 1 run per board.
- **Boards:** 57 opening-cluster coverage boards (`boards_coverage_opening_2026-07-05T18-58-35Z`),
  players 1 & 2, phases opening/mid-game/closing, cases `win_to_lose` / `lose_to_faster_lose` /
  `win_to_draw` / `draw_to_lose`.
- **Grader:** `/grade-fv-sufficiency` (skill `grade-fv-sufficiency`), axes A1–A5 + condition-D render
  checks G1–G7. Each board's answer was checked against the board via `visualize_board.sh` + the
  solver, and against its `render_decision` as ground truth.

## Result: 54 / 57 pass

| axis | pass | | axis | pass |
|---|---|---|---|---|
| A1 better-move | 57/57 | | G1 format-aware | 57/57 |
| A2 outcomes | 57/57 | | G2 per-link | 57/57 |
| A3 mechanism | 57/57 | | G3 board-select | 57/57 |
| **A4 no-fabrication** | **54/57** | | **G4 engine-line** | **56/57** |
| A5 coach-voice | 57/57 | | **G5 threat-list** | **56/57** |
| | | | G6 branch-invariance | 57/57 |
| | | | G7 annotation | 57/57 |

Every failure is an **A4 / G4 / G5 board-truth** miss. A5 (coach voice, incl. the player-2-opening
hold-the-line reframe) passed on all 40 opening boards — the defeatist-reframe and terminology
stripping are holding. The three non-empty `unsure_about` entries (eval-26/29/40) are **honest
abstentions** on deep opening boards where `deepResourceGrounded:false` intentionally suppresses the
deep completing cell; they are expected and excluded from A4.

## The 3 failing evals

Two are **render-layer defects** (fix the render pipeline, not the vector/glossary/prompt); one is a
**model mis-phrasing** of a correct-and-sufficient vector. All three are `win_to_lose` opening boards.

### 1. eval-50 — `render_bug` — L2 realized_denied grounds an *empty* cell (G4/G5/A4)

- **Board:** `334`, player 2, opening, `win_to_lose`. Better col 3 (`bestCol=2`) wins; played col 4
  loses. `render_decision.link.id = L2` (realized_denied).
- **Defect:** `link.text` says *"Your move let the opponent occupy **c2r1**, completing their double
  threat … the better move (col 3) denied it at c3r1."* On `finalMovestring 33432` the opponent
  actually occupies **c3r1** (the shared/conceded cell, matching `tie.sharedCells` and
  `lostResource.completingCell`). **c2r1 is an *empty* winning square**, never occupied. The model
  faithfully echoed the board-false cell (*"you let them grab c2r1"*).
- **Root cause / where to fix:** `connect-four/server/scripts/reason_engine/causalLinks.mjs` — the L2
  (`realized_denied`, `enabled_opponent`, non-`lose_to_faster_lose`) `link.text` cell-grounding names
  a threat/winning square instead of the cell the opponent actually **occupies** on `finalMovestring`.
  It should name the occupied conceded/denial cell (`c3r1` here), not one of the empty double-threat
  squares.
- **Note:** this is the same class as the historical eval-1/16/3 cell-grounding mis-grade — ground on
  the engine's own `finalMovestring`, never an alternate PV.

### 2. eval-26 — `render_bug` — O1 opening guardrail mandates a parity lens with no suppressor (A4)

- **Board:** `3265533353`, player 1, opening, `win_to_lose`. Better col 6 (`bestCol=5`) wins; played
  col 3 loses. Frame **O1** (`namedOpening`), `deepResourceGrounded:false`,
  `centralityComparison.qualitative:null`, **`parityFavor.favorsMover:false`**.
- **Defect:** the mechanism claims *"keep the book line **and parity on your side**."* But
  `parityFavor.favorsMover=false` — the better cell's row parity does **not** favor the mover, so the
  claim is board-false. The model correctly abstained from the deep cell (`key_cells:[]`); the false
  bit is the parity framing.
- **Root cause / where to fix:** `connect-four/server/scripts/reason_engine/openingFrame.mjs:65–70`.
  The `GUARDRAIL` string statically instructs *"Explain the blunder through the opening — book line,
  **centrality, parity**."* There is a `GUARDRAIL_NO_CENTRALITY` corrective that suppresses the
  centrality lens when `centralityQualitative(fv) === null`, but **no equivalent parity suppressor**
  when `parityFavor.favorsMover === false`. The guardrail invites a "parity favors you" claim the
  vector does not support. Fix: add a `GUARDRAIL_NO_PARITY`-style corrective (or drop "parity" from the
  lens list) whenever parity does not favor the mover.

### 3. eval-20 — `prompt_confusion` — model inverts "central file" (A4)

- **Board:** `3333311115`, player 1, opening, `win_to_lose`. Better col 6 (`bestCol=5`, display col 6,
  right-of-center) is the only winning move (solver +1); played col 4 (the central file) loses
  (solver −3). Frame O1, `qualitative:null`.
- **Defect:** the vector + render zones were correct and sufficient (`better-col=col6`,
  `played-col=col4`), but the model wrote *"play the book move **in the central file**"* — inverted,
  since the book/winning move is col 6 and col 4 (central) is exactly where the *losing* move went.
  This is the model's own locational phrasing, not a render defect → `prompt_confusion`.
- **Secondary:** the mechanism also leans on *"the parity battle the position is built around"* — the
  same O1 parity-lens weakness as eval-26 (`parityFavor.favorsMover:false` here too). Fixing the O1
  parity guardrail (issue #2) would also remove this board's secondary parity framing, though its
  decisive fault is the model's "central file" inversion.

## Fix summary

| # | eval | triage | fix owner | one-line fix |
|---|---|---|---|---|
| 1 | eval-50 | render_bug | `causalLinks.mjs` | L2 realized_denied text must name the *occupied* conceded cell, not an empty threat square |
| 2 | eval-26 | render_bug | `openingFrame.mjs:65` | add a parity-lens suppressor when `parityFavor.favorsMover===false` (mirror `GUARDRAIL_NO_CENTRALITY`) |
| 3 | eval-20 | prompt_confusion | prompt / model | model inverted "central file"; partially mitigated by fix #2 |

Two of three are render fixes; the O1 parity-lens gap (#2) shows up in both eval-26 and eval-20.

## Files in `data/`

| file | what |
|---|---|
| `boards_coverage_source.jsonl` | **the source input to `compute.mjs`** — the 57-board coverage set (`{id, movestring, playedCol, strategy, selection}` per row). Re-run `compute.mjs --llm` over this file to regenerate the graded artifact after the render fixes land. |
| `boards_compute_and_answers.jsonl` | the full 57-board *output*: each row = board (`feature_vector.movestring`) + **compute.mjs output** (`feature_vector`, the reason-engine evidence object) + `render_decision` (the grounded-render ground truth) + the model's `answer`. This is the exact artifact graded. |
| `grades.jsonl` | all 57 grade lines (per-axis A1–A5 + G1–G7, `case_pass`, `failure_triage`, `failure_summary`, `counterexamples`). |
| `grade_report.md` | the full human-readable grade report (summary, per-case verdict table, triage, counterexample list, fields_relied_on distribution, raw answers). |
| `failing_evals.jsonl` | just the 3 failing input records (board + compute output + render_decision + answer), for quick repro. |
| `failing_grades.jsonl` | just the 3 failing grade lines. |

## How to reproduce one failing case

Read the row from `data/failing_evals.jsonl` (id = `eval-20`/`eval-26`/`eval-50`), then observe the
board — build the movestring from `feature_vector.movestring` + the 0-indexed column:

```
./visualize_board.sh <movestring><bestCol>     # after-best board
./visualize_board.sh <movestring><playedCol>   # after-played board
```

Verify named cells against `render_decision.finalMovestring` (never an alternate solver PV). The
render defect for eval-26/eval-50 lives in the `render_decision.link.text` / opening-frame text; the
eval-20 defect is only in the model's `answer.mechanism`.

## Canonical references (read before fixing)

- `docs/architecture/reason-DECISIONS.md` — **D30** (L2/L3 keys on the sign `case`;
  `patternOnAfterBestBoard` is informational), **D28** (composed causal frames, covers audit).
- `docs/architecture/reason-render-grounded-prompt.md` — the grounded-render prompt / frame catalog.
- `connect-four/server/scripts/reason_engine/causalLinks.mjs` — L1–L9 link semantics (issue #1).
- `connect-four/server/scripts/reason_engine/openingFrame.mjs` — O1/O2/O3 opening frames + guardrail
  (issue #2).
