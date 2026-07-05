---
name: grade-fv-sufficiency
description: Use when grading a Feature-Vector Sufficiency Experiment answers jsonl (fv_suff_answers_*.jsonl from compute.mjs --llm) — scores axes A1–A4 and emits a counterexample report attributing failures to feature-field / glossary gaps
argument-hint: "<path-to-fv_suff_answers_*.jsonl> [--vectors <fv_suff_answers_*.jsonl>]"
user-invocable: true
---

# Feature-Vector Sufficiency Grader

You are grading a batch of structured blunder-explanations produced by the answerer
`server/scripts/compute.mjs --llm` (the "answerer"). Each explanation was written by a model
that saw **only** the **reason-engine feature vector** + the glossary
(`docs/architecture/feature-vector-glossary.md`) — no tools, no solver ground truth. **You are the
oracle:** you have the solver, the board, and the frozen record's `feature_vector` fields. Read the
experiment spec first: `docs/architecture/feature-vector-sufficiency-experiment.md` (§4 schema, §5
axes + pass rule, §7 output).

**The vector under test is the reason-engine evidence object** (`computeReason` output, with the raw
per-column `scores` array stripped by `toNarratorVector`). Its fields are `case`, `bestCol`,
`playedCol`, `bestScore`, `playedScore`, `player`/`opponent`, `lostResource`, `opponentPunishment`
(each with `kind`/`register`/`window`/`tacticTag`/`parityAttribution`/…), `opponentPunishment.tie`,
`replyHistogram`, `gate`, and — on opening-phase decisions only — the optional, mutually-exclusive
`openingContext.namedOpening` (`{id, family, matchedPrefixLen, bookNextCol}`, a KB book-line lookup),
or `openingContext.defense` (`{id, family, matchedPrefixLen, bestDefenseCol, centralityGrounded}`, a
second-player on-book losing-hold lookup), or `openingContext.centrality` (`{bestCol, playedCol,
betterHasMoreLines, text}`, a geometric fallback). See the glossary's §11 for all three. The glossary
defines every one. There is **no** separate
ground-truth file: the oracle columns (`bestCol`, `playedCol`, `movestring`, outcome) live **inside**
each eval record's `feature_vector`.

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
vector's `lostResource.forkWindows` is circular (the vector is what's under test). Run the position through
the visualizer and read its threat annotations. Prefer the observation whenever a claim is concrete
and load-bearing.

- **`./visualize_board.sh <movestring>`** (from repo root) — authoritative board view: raw board,
  annotated board marking every major/minor threat cell, the `par` row (per-column parity), the
  `scr` row (solver score per column), and an explicit major-threat list. Build movestrings as
  `movestring + bestCol` (after-best board) or `movestring + playedCol` (after-played
  board), 0-indexed. Use it to fact-check any board claim in A3/A4.
- **The solver** — `createSolverProcess` from `connect-four/server/c4solver-wrapper.js`: `cd
  connect-four`, `await solver.query(movestring)`, and `solver.destroy()` in a `finally` or it hangs.
  Queries on terminal/won positions throw "Invalid position" — guard each individually. Use it to
  confirm a move's true outcome.

## Coordinate normalization (do this before every comparison)

- `feature_vector` cells and the answer's `key_cells` are **`cNrM`, 1-indexed** (column 1 = leftmost,
  row 1 = bottom).
- The answer's `better_move` is **1-indexed display** (1–7), as the answerer's prompt states.
- The record's `feature_vector.{playedCol,bestCol}` and every `line[].col` are **0-indexed**.
- So A1 check is: `answer.better_move - 1 === feature_vector.bestCol`. When pasting columns into a
  movestring for `visualize_board.sh`, use the **0-indexed** value (`feature_vector.movestring` +
  `feature_vector.bestCol` for the after-best board; `+ feature_vector.playedCol` for after-played).

## Pruning-aware reading

The answerer prunes the vector to honor the glossary's absence-contract (§ pruning): empty
arrays/objects and `null` fields are dropped before the model sees them — but **meaningful scalars
are kept** (`playedScore: 0` = draw; `tie.tied: false` is real). A `tacticTag: null`, a `parity`
register's `line: null`, or `tie.kind: "independent"` are **honest signals**, not omissions: if the
model narrates them as "no named tactic," "too deep to spell out a line," or "geometrically
unrelated," that is **correct reading**, not a field-use failure.

## Input

Two files, joined by `id`:

1. **Answers jsonl** (the argument): one line per `(id, run_index, condition)`. Shape:
   ```json
   { "id":"wd-0", "run_index":0, "condition":"A", "model":"gpt-5.4",
     "pattern_category":"win_to_draw",
     "answer": { "better_move":2, "played_outcome":"draw", "best_outcome":"win",
                 "mechanism":"…", "key_cells":["c1r1",…], "fields_relied_on":["case","lostResource.tacticTag",…],
                 "unsure_about":"…", "confidence":"medium" },
     "raw":"…", "parse_error":null, "call_error":null }
   ```
2. **Vectors source** (default: the same answers file, or `--vectors <fv_suff_answers_*.jsonl>`):
   each answers row embeds its `feature_vector`; there is no separate eval-set file. Shape `{ id, pattern_category, feature_vector }`. **All oracle fields
   are inside `feature_vector`:** `movestring` (the pre-move board), `bestCol` (= the correct move,
   0-indexed), `playedCol` (= the move played, 0-indexed), `case` (the outcome class), `bestScore`,
   `playedScore` (your-perspective solver scores on the decision board), and the two halves
   (`lostResource`, `opponentPunishment`). Use the **solver** for any independent outcome check (the
   raw per-column `scores` array is intentionally absent — it was the leak `toNarratorVector` removes).

If a record has `call_error` or `parse_error` non-null, or `answer` is null, that run is a **parse
failure** — count it, exclude it from axis scoring, and treat the case as failing the pass rule
(a run that produced no gradeable answer cannot pass on all N runs).

## How to grade — per `(id, condition)`, across all N runs

Group answer rows by `(id, condition)`. Each group has up to N runs (default 3). A **case** is one
`(id, condition)` pair. Score the four axes (spec §5):

| Axis | What | How | Weight |
|---|---|---|---|
| **A1 better move** | `better_move - 1 === feature_vector.bestCol` | code (record field) | sanity |
| **A2 outcomes** | `played_outcome`/`best_outcome` match what `feature_vector.case` implies (table below); cross-check sign with the solver | code + solver | sanity |
| **A3 mechanism real & load-bearing** | the named tactic/threat and `key_cells` actually exist on the relevant board AND are the **decisive** reason (not a true-but-peripheral one) | board (`visualize_board.sh`) + solver | **high** |
| **A4 no fabrication** | every concrete claim (cells, threats, lines) is true on the board; `unsure_about` content is **excluded** | board verification | **high (zero tolerance)** |

A1/A2 are **sanity checks**: the vector already gives `bestCol` and the outcome labels, so a miss
there is a **glossary-read** failure (the model couldn't even read the vector), which is itself a
glossary counterexample. The substance is **A3/A4**.

**A2 outcome mapping** — `feature_vector.case` fixes both outcomes (it is the sign pair of
`bestScore`,`playedScore` from your perspective):

| `case` | `best_outcome` | `played_outcome` |
|---|---|---|
| `win_to_draw` | win | draw |
| `win_to_lose` | win | loss |
| `draw_to_lose` | draw | loss |
| `lose_to_faster_lose` | loss | loss |

Cross-check with the solver when unsure: query `feature_vector.movestring + bestCol` (and `+
playedCol`); each returns the opponent's scores after the move, so your outcome = sign of `−(best
legal opponent score)` (>0 win, =0 draw, <0 loss). For `lose_to_faster_lose` both outcomes are
`loss`, so A2 only checks the model didn't claim a win/draw.

**Per-run vs per-case.** Score each axis on **every run** in the group. The **case passes iff A1–A4
hold on ALL N runs** (spec §5). Intermittent success = **fail** — it exposes latent ambiguity in the
context. Record which runs failed and how they differed (e.g. run 0 named the fork, run 2 didn't).

## Grading opening-deviation cases (`openingContext`)

Some cases carry `feature_vector.openingContext` (opening-phase decisions, either player to move —
`namedOpening`/`centrality` are first-player branches, `defense` is the second-player branch).
This is an **additional lookup/geometry field**, not a different pass rule — A1–A4 (and, for
condition D, G1–G6) still apply exactly as above. **No `render_decision` exists for opening
cases** — the condition-D render layer (`causalLinks.mjs`/`buildRenderDecision`) has never been
wired for `openingContext` (the frozen condition-D corpus has no opening boards), so do **not**
expect or re-derive a `render_decision` for an opening board; verify these claims via the three
board checks below instead, whichever condition the case is.

**A `namedOpening` "you were following `<opening>`, the book move was column `<bookNextCol+1>`"
claim is graded TRUE by three board checks — never by narrative plausibility:**

1. **Prefix match** — `feature_vector.movestring` (or its mirror reflection, `col → 6 − col`) equals
   the first `matchedPrefixLen` plies of the named KB opening line's worked-example movestring
   (`docs/knowledge-base/<id>.md`).
2. **`scores[bookNextCol] === bestScore && bestScore > 0`** — `bookNextCol` is *a* solver-verified
   winning best move. **This is a score-equality check, NOT `bookNextCol === bestCol`.** Under a tie
   of equally-winning columns, the book move and the engine's own `bestCol` argmax can legitimately
   differ while both are correct — do **not** fail a case for that difference; only fail it if the
   book move's score is provably below the max (or the prefix doesn't actually match).
3. **The "why it loses" half** is grounded in `lostResource`/`opponentPunishment` as usual (same A3/A4
   board verification as any other case).

**A `defense` "you're the second side of `<opening>`, already lost, most resilient hold is column
`<bestDefenseCol+1>`" claim is graded TRUE by three board checks:**

1. **Prefix match** — same as `namedOpening` check 1 (movestring or its mirror is the first
   `matchedPrefixLen` plies of the named KB line). `family`-only with `id: null` is correct on a
   shared prefix.
2. **Player 2, losing, loses faster** — the board is player-2-to-move, `bestScore < 0`,
   `bestDefenseCol === bestCol`, and `scores[playedCol] < bestScore`. The opening name and the
   "theoretically lost" claim are **lookup/game-theoretic facts** (all legal scores < 0), NOT
   fabrication — do **not** fail A4 for stating them.
3. **The "why it loses faster" half** is grounded in `lostResource`/`opponentPunishment` (same A3/A4).

If the answer asserts "more central" / "even rows", require `centralityGrounded: true` in the vector
AND that `bestDefenseCol` runs through strictly more 4-cell windows than the played column; a "more
central" claim with `centralityGrounded: false` is an A4 fabrication (`vector_error` only if the
field itself is wrong; otherwise `prompt_confusion`). A `defense` claim that instead reads as
"you are building a winning attack" is an A4 fail (the second player is lost — `prompt_confusion`).

**Failure attribution for `defense`:** wrong `bestDefenseCol` (not the max-score legal move) or a
prefix that doesn't match → `vector_error`; a missing `defense` on a board a manual check confirms is
an on-book player-2 losing-faster position → `missing_info`; correct field but the model narrates a
fabricated attack/tactic → `prompt_confusion`.

**A `centrality` claim** is verified by counting winning lines (4-cell windows) through `bestCol` vs.
`playedCol` on the decision board (not by tracing a `finalMovestring` — there is none to trace for
this branch; it is a pure geometric count, confirm with `visualize_board.sh`'s threat annotations).
If the vector carries `resistAndWait: true`, the answer may add a hold-and-wait framing (the mover is
a losing second player) — this is a canon signal, not a geometric claim, and does not change the
window-count verification.

**Lookup-not-fabrication instruction (do not misfire A4 here):** naming the opening (or its family)
when checks 1+2 hold is a **verified lookup fact**, not a fabricated mechanism — do **not** grade it
as an A4 hedge/fabrication failure. A `family`-only label with `id: null` on a genuinely shared KB
prefix is **correct**, not a hedge failure — only flag it if the prefix is in fact unique to one KB
entry and the answer still reported `id: null`, or vice versa. This applies identically to `defense`.

**Failure-attribution wording for opening cases:**
- A wrong `bookNextCol`/`bestDefenseCol` (its score is not the max/least-bad, or the claimed prefix
  doesn't actually match the named KB line) → `vector_error`.
- A missing `namedOpening`/`defense`/`centrality` field on a board that a manual KB/geometry check
  confirms *is* on a known line / *is* more central → `missing_info`.
- The model narrating the field correctly but still fabricating a mechanism beyond it, or misreading
  `bookNextCol` vs. `bestCol` as required to be identical → `prompt_confusion`.

## Grading condition D — the `render_decision` rubric (G1–G6)

Condition D answers are graded against the **rendered, causally-composed artifact** (grounded-render
prompt, Phase 3), not the raw glossary+JSON the condition-A model saw. The eval pipeline emits a
per-record `render_decision` object on condition-D answers lines — this is the **routing ground
truth**. Shape: `{ case, route, direction, patternOnAfterBestBoard, link:{id,confidence,covers,
guardrail,text}, boards:[{id,shown,reason}], resource:{completingCell,registerToHorizon},
fieldPartition:{rendered,covered,excluded}, finalMovestring }`.

**Read the decision docs first (once per grading session), not per case:**
`docs/architecture/reason-case-taxonomy.md` (the authoritative `(bestScore, playedScore)` case
taxonomy), `docs/architecture/reason-DECISIONS.md` **D20** (the tag-first realized/denied router that
precedes the sign taxonomy and produces `route`/`direction`) and **D28** (composed causal frames per
L1–L9; the covers-audit is a **static causal-code check**, so a code in `link.covers` that is
**absent from this record is NORMAL, not `missing_info`** — covers names the whole family a frame
makes narratively moot, not a literal per-record presence claim; and `patternOnAfterBestBoard` /
L2-vs-L3 branch invariance is **computed at render time**, never read off `direction`), and
`connect-four/server/scripts/reason_engine/causalLinks.mjs` (the L1–L9 semantics: which link fires,
its `guardrail` text, and what its `covers` list names). Grading a case against a re-imagined case
meaning is the same error class as an alternate PV — read the actual docs, don't reconstruct the
taxonomy from memory.

**Consume `render_decision` as GROUND TRUTH; never re-derive it.** Do NOT re-run
`classifyCausalLink`, recompute branch-invariance, or re-select boards — that reintroduces exactly the
drift the single catalog was built to prevent. Read `link.id`/`confidence`/`covers`/`guardrail`/`text`,
the `boards` shown/omitted list + reasons, `patternOnAfterBestBoard`, `fieldPartition`, and
`finalMovestring` straight off the record and treat them as the pipeline's settled decisions. Your job
is to audit the ANSWER against these decisions (G1–G6), not to check whether the decisions themselves
are the ones you would have made.

**Ground truth from RAW evidence, not the narrator vector.** Outcomes/columns still come from the RAW
`feature_vector` fields (the narrator vector is score-scrubbed per D21). Verify every named cell/line
against `render_decision.finalMovestring` (G4) — **never an alternate solver PV**; multiple optimal
lines can exist, and grounding on the wrong one is exactly the eval-1/16/3 mis-grade bug that Task 8
fixed the cell-grounding source for.

The six additive checks, scored per `(id, condition D)` case in addition to A1–A4:

| Check | What | How |
|---|---|---|
| **G1 format-aware** | Grade against the **grounded artifact the model actually saw** — the rendered boards, the plain-language threat list, the composed frame `text`, the reading key — NOT the glossary+JSON condition A used. | read the answerer's condition-D prompt/render, not the raw vector |
| **G2 per-link** | (a) the answer honored `render_decision.link.guardrail` (e.g. an L3 link forbids "your move caused/enabled it" phrasing); (b) over-removal audit — a code in `link.covers` that the answer **actually needed** to make its case = a wrong removal, **but** a covered-but-**absent** field is normal (D28), not `missing_info`; (c) a `link.confidence:"low"` (L9) answer must **hedge**, not fabricate a crisp cause. | `render_decision.link` + board |
| **G3 board-selection** | Using `render_decision.boards`, an over-omission audit: did the answer need a board marked `shown:false`? | `render_decision.boards` |
| **G4 engine-line grounding** | Verify each named cell/line against `render_decision.finalMovestring` — never an alternate PV. | `visualize_board.sh` on `finalMovestring` |
| **G5 threat-list fidelity** | Each rendered threat-list entry must be board-true on its stated board; a wrong entry is a **render bug to REPORT**, not something to narrate around or silently forgive. | `visualize_board.sh` |
| **G6 branch-invariance provenance** | Given `patternOnAfterBestBoard` + `link.id`: (a) guardrail honored; (b) the routing was correct for the after-best board. A wrong L2/L3 pick (a miscomputed `patternOnAfterBestBoard`) is a **render bug attributable to the pipeline** — never a model failure. Triage it `render_bug`, not `prompt_confusion`. | `render_decision.patternOnAfterBestBoard` |

G1–G6 are **additive** for condition D — A1–A4 still apply and are scored exactly as in the "How to
grade" section above; do not substitute G1–G6 for them.

## Failure triage — WHERE the fault lives (required for every failing case)

A pass/fail is not enough. For every case that fails A3 or A4 (or, for condition D, any of G1–G6),
classify the **root cause** into exactly one bucket: the three condition-A/B/C buckets below, plus
`render_bug` for condition D. This is what tells the reader whether to fix the **vector**, the
**glossary**, the **prompt**, or the **render layer** — and it maps onto the experiment's dials
(vector/glossary vs. prompt-builder+model vs., for condition D, the render pipeline):

| `failure_triage` | Meaning | The vector/glossary was… | Fix owner |
|---|---|---|---|
| **`vector_error`** | A field carried a **wrong or junk value**; the model relied on it faithfully and was led astray. | actively **misleading** | vector/engine — correct or suppress the field |
| **`missing_info`** | The vector was **not wrong** but **lacked** a field the model needed to make the case decisive/complete; the model abstained or had to guess. | **incomplete** | vector/glossary — add the field |
| **`prompt_confusion`** | The vector + glossary carried the **correct, sufficient** information, but the model **misread / mis-anchored / dropped a field / hallucinated beyond it**. | **OK** — the model was confused | prompt-builder / model |
| **`render_bug`** *(condition D only)* | A **render-layer defect**: a wrong causal-frame guardrail/route, a mis-selected/omitted board, a false threat-list entry, or a miscomputed `patternOnAfterBestBoard`. The answerer narrated faithfully off a broken render; the model is not at fault. | the **render pipeline** (`causalLinks.mjs` / `selectBoards` / branch-invariance computation) was wrong | render-layer fix, not the vector/glossary/prompt |

For condition D, the `field_or_glossary` attribution in a counterexample becomes **"which
`render_decision` element or `causalLinks.mjs` rule is wrong"** (e.g. `"link.covers for L3 dropped
gate.witness.node — correctly (D28 static check), not a defect"` vs. `"patternOnAfterBestBoard:false
but tagBoard on the after-best board actually fires figure_7 — a render_bug, D28's L2-vs-L3 flip
computed wrong"`), rather than a feature-vector field name.

Deciding between them is itself an **oracle** job — you cannot read the triage off the board glance:

- **Before calling `vector_error`, prove the field is actually wrong.** On deep or near-empty boards a
  named cell/window/line can be **absent from the current board yet still solver-real** (a completing
  cell for a 40-ply parity win legitimately sits on empty squares). "Nothing visible on the board" is
  **inference from absence** — the same anti-pattern as trusting the vector. Trace the engine's own
  `finalMovestring` (from the record's raw evidence — `lostResource.finalMovestring` when the lost
  resource is a winning line, else `opponentPunishment.finalMovestring`) and check whether it actually
  passes through the field's named cell/window. **Never ground on an alternate optimal solver line** —
  multiple optimal lines can exist, and grounding on the wrong one (instead of the engine's own line) is
  exactly the eval-1/16/3 mis-grade bug. Only rule `vector_error` when the engine's own line
  **contradicts** the field. If you genuinely cannot resolve it with the tools, say so in
  `failure_summary` and pick the most defensible bucket rather than guessing `vector_error`.
- **`missing_info` vs `prompt_confusion`:** if the model **abstained** (`unsure_about`) or the needed
  fact has **no field** in the vector → `missing_info`. If the fact **was** present in a field (correct
  and unambiguous per the glossary) and the model still got it wrong, mis-anchored it, or invented past
  it → `prompt_confusion`.
- A case can have several defects; pick the **decisive** one (the reason the case fails). Note secondary
  ones in `failure_summary`.

Every failing case must carry a **one-sentence `failure_summary`**: plain-language "what went wrong,"
naming the culprit field and the board/solver finding (e.g. *"Named the win completing at c5r5, but the
engine's own `finalMovestring` line never reaches that square — `parityAttribution.completingCell` is junk on a
move-1 board (`vector_error`)."*). This sentence is surfaced verbatim after grading (see Output).

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
- after-best board:   <movestring><bestCol 0-indexed>
- after-played board: <movestring><playedCol 0-indexed>
For a move's true outcome, query the solver (createSolverProcess from
connect-four/server/c4solver-wrapper.js; cd connect-four; await solver.query; destroy() in finally).
When a claim names a cell/window/line that is NOT visible on the board, do NOT rule it false from
absence — on deep/near-empty positions a real winning line completes on currently-empty squares.
Trace the engine's OWN `finalMovestring` (given below) and check whether it passes through the named
cell BEFORE calling the field wrong. Never ground on an alternate optimal solver line — multiple
optimal lines exist and grounding on the wrong one is exactly the eval-1/16/3 mis-grade bug.

## Case metadata (oracle — all from feature_vector; the model saw the vector but you VERIFY on the board)
- id: <id>   condition: <condition>
- movestring: <feature_vector.movestring> (pre-move board; append a 0-indexed column for a board)
- playedCol (0-indexed): <feature_vector.playedCol>  → display column <playedCol + 1>
- bestCol (0-indexed): <feature_vector.bestCol> → display column <bestCol + 1>   (this is the correct move)
- pattern_category / case: <feature_vector.case>
- bestScore / playedScore (your-perspective, decision board): <…> / <…>
- expected outcomes from case: best=<…> played=<…> (win_to_draw→win/draw, win_to_lose→win/loss,
  draw_to_lose→draw/loss, lose_to_faster_lose→loss/loss)
- lostResource.kind / opponentPunishment.kind: <…> / <…>  (winning_line | denial | neutralization | conditional_swindle)
- engine's own finalMovestring (the grounding line — use `lostResource.finalMovestring` when
  `lostResource.kind` is a winning line, else `opponentPunishment.finalMovestring`): <…>. This is the
  ONLY line to trace when checking whether a named cell/window is real — never substitute an alternate
  optimal solver line.

Coordinate rule: answer.better_move is 1-indexed display; key_cells are cNrM 1-indexed; the oracle
cols above are 0-indexed. A1 holds iff better_move - 1 == feature_vector.bestCol.

## Render decision — GROUND TRUTH (do NOT re-derive) — condition D only
<omit this whole block for condition A/B/C. For condition D, fill every field from the record's
`render_decision` object VERBATIM. These are the pipeline's SETTLED decisions — trust them; your job
is to audit the ANSWER against them (checks G1–G6 below), never to recompute classifyCausalLink,
branch-invariance, or board selection yourself.>
- linkId: <render_decision.link.id>   confidence: <render_decision.link.confidence>
- covers: <render_decision.link.covers>  (a code listed here that is ABSENT from this record is
  NORMAL per D28's static causal-code check — do NOT flag it as `missing_info`; only a code the answer
  actually NEEDED and didn't have is an over-removal)
- guardrail: <render_decision.link.guardrail>  (e.g. an L3 guardrail forbids "your move
  caused/enabled it" phrasing — check the answer does not violate it)
- text (verbatim composed frame): <render_decision.link.text>
- boards: <render_decision.boards>  (each `{id, shown, reason}` — a `shown:false` board the answer
  needed is a G3 over-omission)
- patternOnAfterBestBoard: <render_decision.patternOnAfterBestBoard>  (the render-time L2-vs-L3
  branch-invariance computation, D28 sub-decision 3 — trust it as the routing ground truth for G6; if
  you independently observe on the board that this value looks wrong, that is a `render_bug`
  finding to REPORT, not something to silently re-route around)
- fieldPartition: rendered=<…> covered=<…> excluded=<…>
- finalMovestring: <render_decision.finalMovestring>  (the ONLY line to trace for G4 — never an
  alternate optimal solver PV, per the eval-1/16/3 mis-grade bug)

## The N runs to grade
<for each run: run_index, and the full `answer` JSON. Include any parse_error/call_error.>

## Score each axis on EACH run, then apply the pass rule
- A1: better_move - 1 == feature_vector.bestCol?
- A2: best_outcome / played_outcome match what feature_vector.case implies
      (win_to_draw→win/draw, win_to_lose→win/loss, draw_to_lose→draw/loss,
      lose_to_faster_lose→loss/loss); cross-check sign with the solver if unsure.
- A3: Does the mechanism's named tactic/threat exist on the after-best / after-played board
      (verify with visualize_board.sh), and is it the DECISIVE reason the better move wins/holds
      (not a true-but-peripheral observation)? Use the solver to confirm the outcome difference is
      real. key_cells must be the squares that reason rests on.
- A4: Is EVERY concrete claim (each key_cell's threat, each named line/fork) actually true on the
      board? A claim contradicted by the visualizer = A4 fail (zero tolerance). EXCLUDE anything the
      model put in `unsure_about` — that is honest abstention, not fabrication.

Abstention: for each run, capture `unsure_about` verbatim. It is a FEATURE-GAP signal: note which
vector field (or glossary section) would have resolved it.

## Condition D only — score G1–G6 on EACH run, IN ADDITION to A1–A4
<omit this whole section for condition A/B/C.> Consume the "Render decision — GROUND TRUTH" block
above AS GIVEN — do not recompute classifyCausalLink, branch-invariance, or board selection.
- G1 format-aware: grade against the rendered artifact (boards/threat-list/composed `text`/reading
  key) the model actually saw — not the glossary+JSON.
- G2 per-link: (a) guardrail honored (no forbidden phrasing per `guardrail`); (b) over-removal audit —
  a `covers` code the answer actually NEEDED and lacks = wrong removal, but a covered-but-ABSENT field
  is NORMAL (D28), not `missing_info`; (c) if `confidence:"low"` the answer must hedge, not fabricate.
- G3 board-selection: did the answer need a board the record marks `shown:false`? (over-omission)
- G4 engine-line grounding: verify every named cell/line against `finalMovestring` — never an
  alternate PV.
- G5 threat-list fidelity: is each rendered threat-list entry board-true on its stated board? A false
  entry is a render bug to REPORT, not to narrate around.
- G6 branch-invariance provenance: given `patternOnAfterBestBoard` + `linkId`, was the routing correct
  for the after-best board? A wrong L2/L3 pick is a RENDER BUG attributable to the pipeline — never a
  model failure; triage it `render_bug`, not `prompt_confusion`.

Pass rule: the CASE passes iff A1, A2, A3, A4 all hold on ALL runs (condition D: **and** G1–G6 all
hold on all runs). Any run failing any axis/check → case fails. Note intermittency explicitly.

## Counterexample attribution (the deliverable)
If the case fails A3 or A4 (condition D: or any of G1–G6), OR any run has a non-empty `unsure_about`,
attribute it: name the specific feature-vector FIELD that was missing/ambiguous (e.g.
"lostResource.forkWindows did not include the window the mechanism named", "opponentPunishment.tie
said independent but the model claimed a shared cell", "parityAttribution.leverCells absent so the
model invented a lever") or the GLOSSARY ambiguity, and state the board finding that proves it.
Condition D: if the defect is a render-layer one, name the specific `render_decision` element or
`causalLinks.mjs` rule instead (e.g. "patternOnAfterBestBoard:false but tagBoard on the after-best
board fires figure_7 — the L2-vs-L3 branch-invariance computation is wrong").

## Failure triage (required whenever the case fails A3 or A4, or condition D: any of G1–G6)
Classify the ROOT cause into exactly one bucket, and write a one-sentence plain-language summary:
- `vector_error` — a field carried a WRONG/junk value the model faithfully relied on. Before choosing
  this you MUST have shown the engine's own `finalMovestring` contradicts the field (trace that line;
  do not infer from board absence, and never ground on an alternate optimal solver line — that
  mis-grounding is exactly the eval-1/16/3 bug). Off-board-but-finalMovestring-real ≠ wrong.
- `missing_info` — the vector was not wrong but LACKED a field the model needed; the model abstained
  (`unsure_about`) or had to guess (no field carried the fact). Condition D: a `covers` code absent
  from the record is D28-normal, NOT `missing_info`.
- `prompt_confusion` — the correct, sufficient info WAS present in a field (unambiguous per glossary),
  but the model misread / mis-anchored a cell / dropped the field / hallucinated past it.
- `render_bug` (condition D only) — a render-layer defect: a wrong guardrail/route, a mis-selected or
  omitted board, a false threat-list entry, or a miscomputed `patternOnAfterBestBoard`. The answer
  narrated faithfully off a broken render; this is NEVER `prompt_confusion` — the model is not at
  fault. A wrong L2/L3 pick (G6) is always `render_bug`.
Pick the DECISIVE cause; mention secondaries in failure_summary. failure_summary must name the culprit
field (or, for condition D render bugs, the `render_decision` element / `causalLinks.mjs` rule) and
the board/solver finding.

Output exactly (add the `G1`-`G6` keys inside each `per_run` entry ONLY for condition D; omit them for
A/B/C):
{
  "id": "<id>", "condition": "<condition>", "n_runs": <int>,
  "per_run": [ { "run_index":0, "A1":"pass|fail", "A2":"pass|fail", "A3":"pass|fail",
                 "A4":"pass|fail",
                 "G1":"pass|fail (condition D only)", "G2":"pass|fail (condition D only)",
                 "G3":"pass|fail (condition D only)", "G4":"pass|fail (condition D only)",
                 "G5":"pass|fail (condition D only)", "G6":"pass|fail (condition D only)",
                 "unsure_about":"<verbatim or empty>" }, … ],
  "case_pass": true|false,
  "intermittent": true|false,
  "failure_triage": "vector_error|missing_info|prompt_confusion|render_bug|null (render_bug condition D only; null iff case_pass)",
  "failure_summary": "<one sentence: what went wrong, naming the field (or, condition D render bugs, the render_decision element/causalLinks.mjs rule) + board/solver finding; empty iff case_pass>",
  "notes": "<one line per failing axis/check: what was wrong, with the board finding>",
  "counterexamples": [ { "axis":"A3|A4|abstention|G1|G2|G3|G4|G5|G6", "field_or_glossary":"<the
     missing/ambiguous feature field or glossary section, OR condition D: the render_decision element
     / causalLinks.mjs rule>", "evidence":"<board finding proving it>" } ]
}
```
---

Collect each sub-agent's JSON as it completes. A malformed/no response → record the case as
`case_pass:false` with notes "sub-agent error".

## Output — the structured grades + the report

**1. Structured grades (for the `/admin/fv-suff` "Eval answers" browser).** Write every collected
sub-agent JSON object — one per line — to `<answers-dir>/<answers-stem>_grades.jsonl`. Each line is
exactly the sub-agent's output (`{ id, condition, n_runs, per_run:[{run_index,A1,A2,A3,A4,unsure_about}],
case_pass, intermittent, failure_triage, failure_summary, notes, counterexamples }`). The server (`GET /api/admin/fv-suff`) derives
this filename from the answers file (`gradesFilenameFor`) and joins it by `id`+`condition`, so the UI
shows the A1–A4 chips + pass/fail next to each board+vector+answer. (If you skip this file, the UI
just shows answers without grades — the markdown report below is still the human deliverable.)

**2. The report.** Write to `<answers-dir>/<answers-stem>_grade_report.md`:

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
> dl-N (cond A): A3 fail on run 2 — claimed a double_threat fork the after-played board does not show;
> A4 ok. Board: visualize_board.sh shows "Major threats: none" at c4r4.

## Failure triage (root cause per failing case)
One row per failing case, its bucket, and its one-sentence summary. Then a count line
(vector_error N · missing_info N · prompt_confusion N) — this split says whether the next iteration
should fix the vector/glossary or the prompt-builder.
| id | category | triage | one-sentence: what went wrong |

## Counterexample list (THE DELIVERABLE)
Every A3/A4 failure and every non-empty `unsure_about`, attributed to a missing/ambiguous feature
field or glossary ambiguity. Group by `field_or_glossary`; order by frequency.
| field / glossary gap | axis | triage | cases affected | evidence (board finding) | model's unsure_about |

## fields_relied_on distribution
Aggregate `fields_relied_on` across all answers. Which engineered fields are actually load-bearing
(cited often in passing A3 cases) vs. never cited? A field no answer relies on is a candidate for
removal or a sign the glossary doesn't surface it.

## Raw answers (per case)
For each case: the board (`feature_vector.movestring`, played/best cols) and each run's `answer` JSON.
```

**3. Present every failed eval in your reply (required).** After writing the two files, end your
response with a **Failed evals** list — one bullet per failing case, showing its triage bucket and its
one-sentence `failure_summary`:

```
## Failed evals (N)
- eval-1 (vector_error) — Named the win completing at c5r5, but the engine's own `finalMovestring` line never
  reaches that square; `parityAttribution.completingCell` is junk on a move-1 board.
- eval-8 (prompt_confusion) — The correct fork window was in `lostResource.window`, but the model
  narrated a row-3 window that the board does not show.
- …
```

Order by triage bucket (vector_error, then missing_info, then prompt_confusion) so the reader sees
the vector/glossary fixes first. Do not omit this list even if the report file already contains it —
it is the at-a-glance answer to "what went wrong."

## Key rules recap

- `better_move` is 1-indexed; oracle cols are 0-indexed (A1: `better_move - 1 == feature_vector.bestCol`).
- A case = one `(id, condition)`; it passes only if A1–A4 hold on **all N runs**.
- `unsure_about` is excluded from A4 and logged as a field-gap counterexample.
- Observe the board with `visualize_board.sh`/solver; never trust the vector to verify itself — and
  never rule a field wrong from board **absence**: trace the engine's own `finalMovestring` before
  calling `vector_error` (never an alternate solver PV — the eval-1/16/3 bug).
- Every failing case gets a **triage** (`vector_error` / `missing_info` / `prompt_confusion`) and a
  one-sentence `failure_summary`; present all failed evals as bullets at the end of your reply.
- The counterexample list (field/glossary attribution) is the point — not the pass rate.

## Do NOT reuse from the production judge

This is NOT `judge-deep-reveals`. Do **not** apply the 9-item production rubric, zone aliases,
`allowedSet`, or the annotation gate. Those grade the production annotation; here you grade a
structured explanation against the board on A1–A4 only.
