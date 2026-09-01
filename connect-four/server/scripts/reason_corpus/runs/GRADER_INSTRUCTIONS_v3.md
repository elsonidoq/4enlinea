<!-- v2 = v1 (verbatim, below) + the v2 addendum (bottom). READ THIS BOX FIRST. -->
# READ FIRST — precedence rule (v2)

**The "v2 addendum" at the bottom of this file OVERRIDES the v1 body above it wherever they
disagree. Read the addendum's "Per-axis grading target" table BEFORE you grade anything.**

The v1 body is a frozen historical snapshot and is deliberately not edited. It predates the
`servedExplanation` field and therefore tells you, in `## Step 2` and the A5/A7 sections, to grade
the `mechanism` prose. **That instruction is superseded.** For A3, A4, A5, A7, G1 and G7's judgment
half you MUST grade `servedExplanation` (markup stripped, inner text kept) — the string production
actually serves. Grading `mechanism` for those axes charges the model for text no player ever sees
and is a measurement error, not a stricter standard.

Concretely, and most often gotten wrong: a raw `cNrM` in `mechanism` is **not** an A5 failure if
`servedExplanation` renders it as "column N, row M" — the guard rewrites it before serving. Check
the served string before charging any coordinate-notation failure.

The per-axis table at the bottom is authoritative. If you find yourself applying a rule from the v1
body that the addendum names, the addendum wins.

---

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

---

# v2 addendum (appended 2026-08-27, epic 059 task 1.3 / T005) — do not edit v1 above this line

**Scope of this addendum.** Everything above this line is `GRADER_INSTRUCTIONS_v1.md`
(`connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v1.md`), copied verbatim and
never edited in place — diffed byte-identical against commit `f6282be` before this file was written.
This addendum adds exactly one thing v1 lacks: an explicit statement, per axis, of **which string is
graded** — the raw model output (`mechanism`, pre-guard) or the string production actually serves
(`servedExplanation`, post-guard: `mechanism` run through `guardExplainMoveLlmPayload`,
`connect-four/server/reasonRenderGuard.mjs:418`, called with a real `board`/`allowedSet` exactly as
`connect-four/server/index.js:1470` does it). Nothing is relocated out of `.claude/skills/
grade-fv-sufficiency/SKILL.md` and nothing is folded in from it — see "SKILL.md divergence" below.

## Why this addendum exists

The owner's 2026-08-26 decision (`docs/epics/deep-reveal-remediation-epic.md`, "Settled decisions" #1)
is: **the eval must grade POST-GUARD, PRE-RETRY text.** The harness still calls the model once — the
retry stays unexercised (OI-183) — but graders must see the text a player would actually receive, i.e.
after `guardExplainMoveLlmPayload` runs. As of the 2026-08-26T15-47-56Z re-measure, every answers row
now carries both fields (`compute.mjs`'s `computeServedExplanation`, spec 059 batch 1): the unchanged
pre-guard `mechanism` AND the new post-guard `servedExplanation`. Before that field existed, v1's own
text (`## Step 2`, A5/A7) told graders to grade `mechanism` prose with markup stripped by hand — that
was the closest available approximation of served text, not the served text itself. This addendum
tells graders which field is now the correct one to read per axis.

## Per-axis grading target

| Axis | String graded | Notes |
|---|---|---|
| A1 | n/a (numeric field compare) | `better_move` vs `fv.bestCol`; not a prose read. |
| A2 | n/a (label compare) | `best_outcome`/`played_outcome` vs `fv.case`; not a prose read. |
| A3 | `servedExplanation` | Board-level factual/decisiveness check. Grade the served prose (markup stripped, `[zone:…]`/`[term:…]` tags removed, inner text kept) — not the raw model string, which can still carry an unstripped internal token or an unpromoted raw coordinate the guard would remove or humanize before serving. |
| A4 | `servedExplanation` | Zero-tolerance fabrication check. Must be graded on what a player would actually read; a claim the guard strips (e.g. inside a span dropped by `stripFailingZoneSpans`) never reaches the player and cannot fabricate anything for them. |
| A5 | `servedExplanation` (prose, tags stripped) | v1 already said "grade the `mechanism` prose … STRIP all `[zone:…]…[/zone:…]` and `[term:…]…[/term:…]` markup first" (`:115-117`). Read that instruction as `servedExplanation`, not `mechanism` — the pre-guard string can carry a raw `cNrM`/`colN` token that never ships (guard's `stripInternalTokens`, `reasonRenderGuard.mjs:99-116`, rewrites it to "column N" before serving). Grading `mechanism` here would charge the model for text no player sees. **v1 never mentions `cNrM`/coordinates/notation anywhere** (epic-verified, grepped zero hits) — so a grader charging A5 for raw-coordinate notation was always importing that charge from outside the frozen rubric (the dispatch wrapper), not applying an A5 rule; this addendum makes the correct target (`servedExplanation`) explicit precisely so that charge, if ever made, is at least made against the string a player would see. |
| A6 | **special case — see below** | Pre-computed by `grade_mechanical.mjs`; copy through, do not re-derive. |
| A7 (incl. A7b) | `servedExplanation` (prose, tags stripped) | Same reasoning as A5. A7b in particular ("REFERENTS LOCATABLE") depends on whether a phrase's referent is still wrapped in an emitted `[zone:…]` — grading against the pre-guard string can credit a zone span the guard subsequently stripped, which the player never saw resolve. Grade against `servedExplanation`. |
| G1 | `servedExplanation` | v1: "grade against the rendered artifact the model actually saw" (`:166`) — for the *served* artifact (what ships), that is `servedExplanation`; the assembled prompt (`PROMPT`, Step 0b) remains the source for what the model *saw as input*, unchanged. |
| G2–G6 | `render_decision` fields / board truth (unchanged) | These grade routing and render-layer correctness against `render_decision` and the solver-verified board, not model prose — no guard-string dependency to state. |
| G7 (a/b membership) | pre-computed, see A6 | `G7a_offered`/`G7b_offered` are computed by `grade_mechanical.mjs` from the row's `raw` text (the model's original, pre-`processAnnotations` string) per v1 `:39` — unchanged by this addendum; that check is about handle *offering*, not served prose. |
| G7 (judgment half + G7c) | `servedExplanation` | The judgment half ("does each handle wrap a phrase whose meaning matches its role") and `annotationRepairs` auto-fail must be read against what the player would receive, consistent with A5/A7. |

## A6 — special case, verified at source

v1 (`:137-138`) says A6 is PRE-COMPUTED by `grade_mechanical.mjs` and must be copied through, never
re-derived. That script imports production's own `mentionsBetterColumn` directly
(`connect-four/server/scripts/grade_mechanical.mjs:12`) and calls it as
`mentionsBetterColumn({ mechanism: a.mechanism }, fv.bestCol, locale)`
(`connect-four/server/scripts/grade_mechanical.mjs:42-43`) — **confirmed present at these lines by
reading the file for this addendum.**

This reads the pre-guard `mechanism` field, not `servedExplanation` — but it is still an accurate
predictor of the post-guard result, and this is deliberate, not an oversight:
`mentionsBetterColumn` (`connect-four/server/mechanismExplainer.mjs:115-122`) runs the mechanism
through `stripInternalTokens` **internally**, the very same final-pass function
`guardExplainMoveLlmPayload` applies before serving (`reasonRenderGuard.mjs:99`), before testing for
the "column N" phrase. So A6, though it reads the `mechanism` field, is checking exactly the transform
production's own retry-trigger applies to that field before deciding whether to retry — it is
"production's own predictor of what the player is served" (`grade_mechanical.mjs:40`), not a raw-string
regex.

**One documented residual gap** (`mechanismExplainer.mjs:110-113`, "Residual, accepted imprecision"):
the real serving path can additionally run `stripFailingZoneSpans` *before* its own final
`stripInternalTokens` pass, and that step can rarely delete a span whose inner text carried the column
word — a case `mentionsBetterColumn({ mechanism })` cannot see because it never runs
`stripFailingZoneSpans` at all. This can only cause A6 to under-count failures relative to what a
literal `servedExplanation` read would show (a pass computed on `mechanism` that a `servedExplanation`
read would fail), never over-count. This gap is accepted upstream in production code, not introduced by
this rubric; graders must still copy the pre-computed A6 verbatim per v1 and not "fix" it by reading
`servedExplanation` themselves.

## SKILL.md divergence — known non-comparability, not resolved here

`.claude/skills/grade-fv-sufficiency/SKILL.md` contains its own long-form axis text (orchestrator-side
sections, not the per-case dispatch template) that has diverged from this file by roughly 452 lines
since `GRADER_INSTRUCTIONS_v1.md` was frozen. **This addendum does not fold in, reconcile, or resolve
that divergence.** `GRADER_INSTRUCTIONS_v2.md` (this file: v1 verbatim + this addendum) is declared the
SOLE rubric a dispatched grader reads — see task 1.4 / T006, which points `SKILL.md`'s dispatch step at
this checked-in file instead of regenerating rubric text from `SKILL.md`'s own body into a scratchpad
copy. Any future adoption of `SKILL.md`'s drifted text into the checked-in rubric is a deliberate v3,
scheduled only after a v2-graded run establishes its own baseline — not something to resolve here.

## What does NOT change

The retry logic, budget, and trigger set are unchanged (epic "Settled decisions" #4) — the harness
still calls the model once; grading POST-GUARD does not imply grading POST-RETRY. `render_decision`
consumption (Step 0), the assembled-prompt check (Step 0b), and the board-truth verification steps
(Step 1) are unaffected — they already operate on ground-truth fields and the solver, not on the
model's served string.

---

# v3 addendum (appended 2026-09-01) — do not edit v2 above this line

**Scope of this addendum.** Everything above this line is `GRADER_INSTRUCTIONS_v2.md`
(`connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md`), copied verbatim and
never edited in place — diffed byte-identical before this file was written. A frozen rubric is never
edited in place: editing in place silently invalidates every comparison that cites it, so a change
becomes a new version file plus an addendum. This addendum adds exactly one thing: the **A7e**
subtest. No other axis, subtest, triage bucket, or output field changes.

## Why this addendum exists

On record `eval-29` the played move loses to a **mate in 1**: on the after-played board the opponent
has a gravity-top four and completes it on their very next move. All three served explanations said
only *"keeps that four-in-a-row line alive"*, *"the threat comes through more cleanly"*, *"gave them
the cleanest route"*. A player reading that would not learn the game was effectively over. **It
passed A7 on all three runs under v2** — because no axis in A1–A7 requires an explanation to convey
**severity**. A7a asks for cause-not-outcome; nothing asked whether the player learns that this move
loses on the spot. A7e closes that hole.

## A7e — the fifth A7 subtest

- **A7e SEVERITY (applies ONLY when the trigger below fires):** the graded string must make it
  unmistakable that the played move lets the opponent finish **on their very next move**. PASS
  requires the timing to be explicit.
  - **Trigger — mechanical, never a judgment call.** A7e applies only when, on the **after-played**
    board (`<movestring><playedCol>`, appended digit 0-indexed), the **opponent** has a gravity-top
    four — i.e. they complete four on their very next move. You already run `./visualize_board.sh` in
    Step 1: the marker is `<X>` / `<O>` on the cell, or a `[GT]` suffix in the Major-threats list, for
    the opponent's colour. Equivalently
    `detectImmediateThreat(new Board(afterPlayed), fv.opponent).matched` using the production detector
    from `connect-four/server/classifier.js`. **N/A otherwise — neither fail nor credit**, exactly
    like A7c.
  - **FAIL examples, quoted from the real `eval-29` runs:** "keeps that four-in-a-row line alive";
    "the threat comes through more cleanly"; "gave them the cleanest route to the square they want".
    Each describes a persisting advantage and hides that the game ends next move.
  - Grade A7e against the same string the other A7 subtests use — `servedExplanation`, markup
    stripped (see the v2 addendum's per-axis table).
  - Record an A7e failure in `A7_failed_subtests` alongside `A7a`–`A7d`.

## Reconciliations — both mandatory, state both explicitly

- **A7e vs A7a.** A7a fails an answer that gives the outcome *as the whole reason*. A7e requires
  severity **in addition to** the named cause, never instead of it. An answer that says only "you lose
  next move" with no mechanism fails **A7a**; an answer that names the mechanism but hides the timing
  fails **A7e**. Both must hold simultaneously.
- **A7e vs A5b.** A5b (fires when `player === 2` AND `boardState === "opening"`) forbids telling the
  player they are lost and requires a hold-the-line reframe. A7e requires stating what **this move**
  allows. These are different claims and both can be honoured: *"column N lets your opponent finish on
  their very next turn"* satisfies A7e and does **not** violate A5b, whereas *"you are lost"* / *"both
  moves lose"* remains an A5b failure. **This overlap is real, not hypothetical: it fires on exactly 3
  corpus records — `eval-39`, `eval-40`, `pin-L4-missed-defense`.**

## Measured reach

A7e's trigger fires on **10 of the 63 corpus records**, measured 2026-09-01 through the production
`detectImmediateThreat` on each record's after-played board: `eval-29`, `eval-32`, `eval-33`,
`eval-37`, `eval-39`, `eval-40`, `eval-45`, `pin-L4-missed-defense`, `pin-branch-invariance-true-2`,
`pin-branch-invariance-true-3`.

## A7e triage

Before charging A7e, check (Step 0b) whether the assembled prompt actually carried the fact that the
opponent finishes next move. If it did not, the bucket is `render_bug` / `missing_info`, **never**
`prompt_confusion` — no model can state what it was not shown.

## Comparability — read this as forcefully as the version rule at the top of this file

A7e makes A7 **strictly stricter**: an answer that passed A7 under v2 can fail under v3. Therefore a
**v3-graded A7 number must NEVER be compared against a v1- or v2-graded A7 number**, and the rubric
version used MUST be recorded in `runs/README.md` when a run is graded. The runs graded under **v2**
include `fv_suff_answers_boards_2026-08-28T18-35-46Z` and
`fv_suff_answers_boards_smoke_a7wave1_2026-09-01T16-55-47Z` — both of those baselines are **not**
comparable to any future v3 run on A7.
