<!-- FROZEN RUBRIC v1 — do not edit in place. -->
# Per-case grader instructions — v1 (frozen 2026-08-25)

**Why this file exists.** G7 appeared to fall 78% → 66% across the 2026-08-11 and 2026-08-2x gradings.
It was NOT a code regression: only 5 of 25 boards had their offer/required set changed by that branch,
and those 5 IMPROVED (52→64%) while the 20 untouched boards "fell" (84→66%). The likeliest cause is
that the grading instructions differed between runs — the 08-11 grading ran the skill directly, these
runs used the text below, which foregrounds G7's judgment half. `eval-32` is the proof case: the text
failing it 5/5 here is pre-existing, unchanged, and passed two earlier gradings.

**The rule this establishes: a G7 (or any judgment-axis) delta is only meaningful between runs graded
with the SAME rubric version.** When you grade a run, record which version you used in
`runs/README.md`. If you need to change the rubric, add `GRADER_INSTRUCTIONS_v2.md` — never edit v1,
or you silently invalidate every comparison that cites it.

**Runs graded with v1:** `fv_suff_answers_boards_subset_2026-08-21T21-19-32Z`,
`fv_suff_answers_boards_subset_2026-08-23T15-16-19Z`.
**Runs graded WITHOUT it (not comparable on judgment axes):**
`fv_suff_answers_boards_2026-08-06T16-04-29Z`, `fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z`.

Substitute `<ANSWERS_STEM>` with the run's stem before dispatching.

---

# Feature-Vector Sufficiency Grader — per-case instructions

You are grading Connect Four blunder-explanations for ONE case (one position, condition D) across
5 independent runs. You are an AGENT with shell access. Run from the repo root:
`/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding`

## Your files
- answers file: `connect-four/server/scripts/reason_corpus/runs/<ANSWERS_STEM>.jsonl`
- vectors: the `feature_vector` embedded in your own answer rows (same file)
- mechanical verdicts: `connect-four/server/scripts/reason_corpus/runs/<ANSWERS_STEM>_mechanical.json`
- your id + condition + grade output path are in the dispatch message.

## Pre-computed mechanical axes — copy through, do NOT re-derive
`grade_mechanical.mjs` already decided **A1, A2, A6, G7a_offered, G7b_offered** for every run, using
production's own `mentionsBetterColumn` for A6 and the row's `raw` text for G7 membership. Read the
mechanical json yourself and select the keys `"<your id>|D|<run_index>"` for run_index 0..4.
Copy A1, A2 and A6 verbatim into the matching `per_run` entry. Do NOT re-check them, do NOT overrule
them, do NOT spend a tool call on them — a regex decided them more reliably than you can. If a run's
key is missing, grade it yourself and say so in `notes`.

**G7 is a COMBINATION, not a copy.** `G7a_offered`/`G7b_offered` answer only "was every emitted
handle/slug in the offered set". You still judge, per run: does each handle wrap a phrase whose
meaning matches its `role`; is anything over-wrapped; is `annotationRepairs` non-empty (G7c auto-fail).
Record `G7 = "pass"` only when the script's membership checks passed AND your judgment checks pass.

You are grading: **A3, A4, A5, A7, G1–G6, and G7's judgment half.**

## Run sub-sampling — spend tool calls where the signal is
Grade **A5 and A7 on EVERY run** (A7's deterministic-vs-flaky split IS the measurement; sub-sampling
destroys the resolution). Grade **A3, A4, G2, G4, G5 on the first 2 runs only**. In `per_run`, set the
ungraded runs' value for those axes to `null` (NOT `"pass"` — a skipped check is not a passing one)
and note the sub-sampling once in `notes`.

## Step 0 — load your own record
Read the answers jsonl; collect every line matching your exact `id` and condition `D` (5 runs). If a
row has `call_error`/`parse_error` non-null or `answer` null, that run is a parse failure: count it,
exclude it from axis scoring, and the case fails.

From the embedded `feature_vector` derive: `movestring`, `playedCol`/`bestCol` (0-indexed; display
column = col+1), `player`, `boardState` (A5b bites iff `player === 2` AND `boardState === "opening"`),
`case`, `bestScore`/`playedScore`, the outcomes the case implies (win_to_draw→win/draw,
win_to_lose→win/loss, draw_to_lose→draw/loss, lose_to_faster_lose→loss/loss),
`lostResource.kind`/`opponentPunishment.kind`, and the engine's own `finalMovestring` — use
`lostResource.finalMovestring` when `lostResource.kind` is a winning line, else
`opponentPunishment.finalMovestring`. That is the ONLY line to trace when checking whether a named
cell/window is real — NEVER substitute an alternate optimal solver line (that mis-grounding is
exactly the eval-1/16/3 mis-grade bug).

Also extract `render_decision`. Consume every field as GROUND TRUTH for ROUTING — do NOT recompute
`classifyCausalLink`, branch-invariance, board selection, or the offered zone/term set. For G4 use
`render_decision.finalMovestring`.

## Step 0b — build the ACTUAL PROMPT the model saw (MANDATORY)
`render_decision` is the routing record, NOT the prompt.
```js
const { buildReasonRenderModel, assembleGroundedPrompt } =
  await import('/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/scripts/renderReasonModel.mjs');
const PROMPT = assembleGroundedPrompt(buildReasonRenderModel(row.feature_vector));
```
Before ANY finding of the form "the model ignored/dropped X which render_decision states verbatim",
check `PROMPT.includes(X)`. If X is absent from `PROMPT`, the triage is **`render_bug` (information
suppression), NEVER `prompt_confusion`** — no model can name what it was not shown.

**MODEL REGIME — read it and state it.** These rows are `"model": "gpt-5.4-mini"`, which is the model
production ships. This is a **PRODUCTION-FIDELITY run, not a floor test**: `prompt_confusion` here
CANNOT be separated from model capability. Say so explicitly in `failure_summary` whenever you use
that bucket, rather than asserting a prompt defect. Prefer model-INDEPENDENT attributions (a cell or
line absent from the assembled prompt, a board-false rendered region, a handle never offered) — they
survive a change of model.

## Step 1 — observe the board, never infer it from the vector
The vector is the artifact under test. For any board-level claim (A3/A4) run
`./visualize_board.sh <movestring>` from the repo root and read its threat/par/score annotations:
- after-best board:   `<movestring><bestCol 0-indexed>`
- after-played board: `<movestring><playedCol 0-indexed>`
For a move's true outcome use the solver (`createSolverProcess` from
`connect-four/server/c4solver-wrapper.js`; `cd connect-four`; `await solver.query(...)`; `destroy()`
in a `finally` or it hangs; queries on terminal positions throw — guard each individually).
When a claim names a cell/window NOT visible on the board, do NOT rule it false from absence — on
deep/near-empty positions a real winning line completes on currently-empty squares. Trace the engine's
OWN `finalMovestring` first.

## Step 2 — score each axis per run, then apply the pass rule
- **A3** mechanism real AND decisive: does the named tactic/threat exist on the after-best/after-played
  board, and is it the DECISIVE reason (not true-but-peripheral)? CONDITION D EXCEPTION: `key_cells`
  expanded from an emitted `[zone:…]` are display-overlay cells, not per-cell threat assertions — grade
  A3 on the tactic the `mechanism` actually names and rests on.
- **A4** no fabrication (zero tolerance): is EVERY concrete claim true on the board? EXCLUDE anything in
  `unsure_about` (honest abstention). CONDITION D EXCEPTION: an empty cell inside an emitted `[zone:…]`
  is a display-overlay cell, not a fabrication.
- **A5** coach voice — grade the `mechanism` prose ONLY; do NOT penalize `fields_relied_on` or
  `unsure_about` (grader-facing, never shown to a player). STRIP all `[zone:…]…[/zone:…]` and
  `[term:…]…[/term:…]` markup first and grade the cleaned prose; do NOT fail A5 for a tag's presence.
  - **A5a (all cases):** 2nd-person address ("you"/"your opponent"; no player names "Gray"/"Green", no
    3rd-person analyst voice) AND no internal/vector/render terminology — no field names or their prose
    echoes (case, route, direction, link, frame, guardrail, "opening context", "lost resource",
    "opponent punishment", "reply histogram", "swindle gate", "parity attribution", "completing cell"
    [plain "the square that finishes the four" is fine], "window" [plain "four-in-a-row line" is fine],
    matchedPrefixLen, bookCol/bestDefenseCol, betterHasMoreLines, resistAndWait, deepResourceGrounded,
    patternOnAfterBestBoard, finalMovestring, boardState, register, horizon, pliesToEnd [plain "about N
    moves later" is fine], tacticTag/tag, kind, tie), no engine/solver meta (forced_win/losing_position
    AS SLUGS, "solver", "score"). ALLOWED: plain English + Connect Four jargon (major/minor threat,
    fork, double threat, winning line, block, diagonal, row, column, more central, claimeven) and
    naming the ACTUAL opening as given; "practical swindle" is allowed.
  - **A5b (ONLY when `player === 2` AND `boardState === "opening"`):** must NOT say the player is lost
    ("you're losing"/"you were already losing"/"both moves still lose"/"neither move wins" = FAIL) and
    MUST positively reframe as hold-the-line (toughest defense / hardest for the opponent / keep central
    lines and wait for a slip). A bare omission with no constructive frame also fails; claiming to be
    building a win as the 2nd player also fails.
  - **A5 triage:** defeatist/terminology wording the render's OWN text supplied and the model echoed →
    `render_bug` (name the `causalLinks.mjs` rule / frame). Render clean, model introduced it →
    `prompt_confusion`. No hold-the-line frame exists for the board at all → `missing_info`.
- **A6** PRE-COMPUTED — copy through. If the prose names a DIFFERENT column as the better move, record
  that under **A4**, do not override A6.
- **A7** utility to the blunderer — grade the `mechanism` prose (markup stripped) against the board, as
  the player who JUST MADE THIS MOVE and does NOT know why it was wrong. ALL FOUR sub-tests must hold;
  record every one that failed in `A7_failed_subtests`.
  - **A7a CAUSE not outcome:** FAIL "you lost the race" / "your best result is only a draw" / "the better
    move keeps the win alive"; FAIL "you let your opponent take that square away later" as the WHOLE reason.
  - **A7b REFERENTS LOCATABLE:** every phrase promising a specific board object ("the key square", "the
    central threat", "your winning line", "the double threat") resolves to a findable cell/line — named
    in prose or wrapped in an emitted `[zone:…]`. FAIL a specific-sounding phrase pointing at nothing.
    FAIL the same phrase reused for two different objects.
  - **A7c FORK PIVOT:** when the mechanism is a double threat/fork, the square that CREATES it must be
    named, not only the two finishing squares. N/A when the mechanism is not a fork (neither fail nor
    credit). **Check whether the pivot was even OFFERED before attributing** — look for a
    `*-fork-pivot` handle in `render_decision.zones.aliases`.
  - **A7d CONCRETE AND TRANSFERABLE, fails BOTH ways:** FAIL pure move narration with no named idea;
    FAIL abstract rule recitation with nothing anchoring it to these squares. PASS = a named idea PLUS
    the squares that instantiate it.
  - **Honest-minimal exception:** a brief honest answer with non-empty `unsure_about` PASSES A7 when the
    position genuinely has nothing to teach — VOID if you can name the vector field that carried the
    decisive reason.
  - **Manufactured specificity FAILS A7 even when it survives A4.**
  - Do NOT double-charge: if a sentence already failed A3 or A4, record that as primary and do not also
    fail A7a for it.
  - **A7 triage:** reason never in the vector → `missing_info` (name the field); in the vector/offer but
    not obliged by the render/required set → `render_bug`; everything supplied and the model still
    restated the outcome → `prompt_confusion`.

## Condition D — also score G1–G7 per run
- **G1** grade against the rendered artifact the model actually saw, not glossary+JSON.
- **G2** (a) `link.guardrail` honored; (b) over-removal audit — a `covers` code the answer NEEDED and
  lacks = wrong removal, but a covered-but-ABSENT field is NORMAL (D28), not `missing_info`;
  (c) `confidence:"low"` (L9) must hedge, not fabricate a crisp cause.
- **G3** did the answer need a board marked `shown:false`? (over-omission)
- **G4** verify every named cell/line against `render_decision.finalMovestring` — never an alternate PV.
- **G5** is each rendered threat-list entry board-true on its stated board? A false entry is a render
  bug to REPORT, not to narrate around.
- **G6** given `patternOnAfterBestBoard` + `link.id`, was the routing correct for the after-best board?
  A wrong L2/L3 pick is ALWAYS `render_bug`, never a model failure.
- **G7** see the combination rule at the top. `annotationRepairs` non-empty → auto-FAIL,
  `prompt_confusion`.

## Pass rule
The CASE passes iff A1–A7 AND G1–G7 hold on every run where they were SCORED. A `null` from
sub-sampling is "not scored" — never a pass, never a fail. Note intermittency explicitly, and note in
`notes` that the sub-sampled axes saw only 2 runs.

## Triage buckets (required whenever the case fails any axis)
- `vector_error` — a field carried a WRONG/junk value. Before choosing this you MUST have shown the
  engine's own `finalMovestring` CONTRADICTS the field. Off-board-but-finalMovestring-real ≠ wrong.
- `missing_info` — the vector was not wrong but LACKED a needed field; the model abstained or had to
  guess. A `covers` code absent from the record is D28-normal, NOT `missing_info`. A cell/tactic the
  case needed that was never offered as a zone/term at all IS `missing_info`.
- `prompt_confusion` — correct sufficient info WAS present and unambiguous, but the model misread /
  mis-anchored / dropped it / hallucinated past it. A handle or slug not offered, or bound to a
  semantically wrong phrase, or over-wrapped, is also `prompt_confusion`. REMEMBER the production-
  fidelity caveat above.
- `render_bug` — a render-layer defect: wrong guardrail/route, mis-selected/omitted board, false
  threat-list entry, miscomputed `patternOnAfterBestBoard`, or an offered alias whose `spec` is
  board-false on its `truthBoard`. The model is NOT at fault.
Pick the DECISIVE cause; mention secondaries in `failure_summary`.

## Step 3 — write your grade file, THEN return a one-liner
Build this object (include G1–G7 inside each `per_run`):
{ "id":"<id>", "condition":"D", "n_runs":<int>,
  "per_run":[ {"run_index":0,"A1":"pass|fail","A2":"pass|fail","A3":"pass|fail|null",
    "A4":"pass|fail|null","A5":"pass|fail","A6":"pass|fail","A7":"pass|fail",
    "A7_failed_subtests":["A7a"|"A7b"|"A7c"|"A7d"],"G1":"pass|fail","G2":"pass|fail|null",
    "G3":"pass|fail","G4":"pass|fail|null","G5":"pass|fail|null","G6":"pass|fail","G7":"pass|fail",
    "unsure_about":"<verbatim or empty>"}, … ],
  "case_pass":true|false, "intermittent":true|false,
  "failure_triage":"vector_error|missing_info|prompt_confusion|render_bug|null",
  "failure_summary":"<one sentence naming the culprit field or render_decision element + the board/
    solver finding; empty iff case_pass>",
  "notes":"<one line per failing axis, with the board finding>",
  "counterexamples":[ {"axis":"…","field_or_glossary":"…","evidence":"<board finding>"} ] }

Write it as exactly ONE JSON line (`JSON.stringify(obj)`) to YOUR grade output file with the Write
tool. That path is yours alone — overwrite freely, never append, never write to any shared file.
The write MUST complete before you return. Then return ONLY this one-line JSON — no prose, no fences:
{ "id":"<id>", "condition":"D", "case_pass":true|false, "intermittent":true|false,
  "failure_triage":"…", "failure_summary":"<empty iff case_pass>" }
