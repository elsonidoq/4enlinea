---
name: grade-fv-sufficiency
description: Use when grading a Feature-Vector Sufficiency Experiment answers jsonl (fv_suff_answers_*.jsonl from compute.mjs --llm) — scores axes A1–A7 (incl. A5 coach-voice, A6 actionability, A7 utility-to-the-blunderer) and emits a counterexample report attributing failures to feature-field / glossary / render gaps
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
`(id, condition)` pair. Score the seven axes (spec §5 + the A5 coach-voice, A6 actionability and A7
utility axes):

| Axis | What | How | Weight |
|---|---|---|---|
| **A1 better move** | `better_move - 1 === feature_vector.bestCol` | code (record field) | sanity |
| **A2 outcomes** | `played_outcome`/`best_outcome` match what `feature_vector.case` implies (table below); cross-check sign with the solver | code + solver | sanity |
| **A3 mechanism real & load-bearing** | the named tactic/threat and `key_cells` actually exist on the relevant board AND are the **decisive** reason (not a true-but-peripheral one). *Condition D:* zone-derived `key_cells` are display-overlay cells (the highlighted regions from an emitted `[zone:…]`, e.g. a whole column or window), not per-cell threat assertions — grade A3 on the tactic(s) the `mechanism` actually names and rests on, not on every cell the overlay spans; zone offered/board-truth fidelity is G7 (and G5 for spec board-truth on the truthBoard). | board (`visualize_board.sh`) + solver | **high** |
| **A4 no fabrication** | every concrete claim (cells, threats, lines) is true on the board; `unsure_about` content is **excluded**. *Condition D:* do NOT treat an empty cell inside an emitted `[zone:…]` (e.g. a non-landing cell of a highlighted column or window) as an A4 fabrication — it is a display-overlay cell, not a per-cell threat claim; the zones' own offered/board-truth fidelity is covered by G7/G5. | board verification | **high (zero tolerance)** |
| **A5 coach voice** | the `mechanism` reads as a coach speaking directly to the player: 2nd-person address, **no internal/vector terminology**, and (player-2 opening only) **no defeatist "you're losing / both lose" framing — a hold-the-line reframe instead**. Full rules in **"A5 — coach voice"** below | read the `mechanism` prose (+ render text for triage) | **high** |
| **A6 actionable better move** | the **`mechanism` prose itself** names the column the player should have played — not only the `better_move` JSON field. Full rules in **"A6 — actionable better move"** below | read the `mechanism` prose | **high** |
| **A7 utility to the blunderer** | the explanation has a real chance of *teaching* the player who just made this move: it names a cause rather than restating the outcome, every specific referent is locatable, a fork's pivot is named and not just its effects, and the idea is concrete-and-transferable. Four sub-tests, all must hold. Full rules in **"A7 — utility to the blunderer"** below | read the `mechanism` prose + board | **high** |

A1/A2 are **sanity checks**: the vector already gives `bestCol` and the outcome labels, so a miss
there is a **glossary-read** failure (the model couldn't even read the vector), which is itself a
glossary counterexample. The substance is **A3/A4/A5/A6/A7**.

**A1 vs A6 — these are deliberately different questions, do not collapse them.** A1 asks whether the
model *knew* the better column (a JSON field it fills every time). A6 asks whether the *player is
told* it, in the prose that actually ships. Production serves `mechanism`; it does not serve
`better_move`. The combination **A1 pass + A6 fail** is a real, measured regression — on 3 of the 4
spec-058 feedback boards the explanation never named the better column in prose — and it is
invisible to any grader that checks only the field.

**A3 vs A7 — truth versus usefulness.** A3 asks "is the named mechanism real and decisive?"; A7 asks
"could the player *use* it?". A perfectly true, decisive, correctly-grounded mechanism can still fail
A7 (e.g. an explanation that correctly identifies the winning square and then explains the loss only
as "you let your opponent take that square away later" — true, decisive, and teaches nothing). Score
them independently. But do **not** double-charge a fabrication: if a claim already failed A3 or A4,
record that as the primary axis and do not also fail A7a for the same sentence.

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

**Per-run vs per-case.** Score each axis on **every run** in the group. The **case passes iff A1–A7
hold on ALL N runs** (spec §5). Intermittent success = **fail** — it exposes latent ambiguity in the
context. Record which runs failed and how they differed (e.g. run 0 named the fork, run 2 didn't).

## A5 — coach voice (the explanation is a coach speaking TO the player)

The `mechanism` field is **not** an analyst's note — it is what a coach says **directly to the
player** about the move they just made. A5 grades that voice. **A5 grades the `mechanism` prose only**
(plus `better_move` phrasing if any). It **explicitly does NOT penalize** `fields_relied_on` (that
field names internal vector fields *by design* — it is grader-facing introspection, never shown to a
player) or `unsure_about` (meta abstention, also never shown to a player). Do not fail A5 for a field
name appearing there.

A5 has two parts. **A5a applies to every case (any player, any phase); A5b applies only to a
player-2 opening board.** A run fails A5 if it violates either.

**Strip markup before grading (condition D).** Before checking A5, STRIP all `[zone:…]…[/zone:…]` and
`[term:…]…[/term:…]` markup from `mechanism` and grade the cleaned prose — the markup is machine
tokens the frontend removes, exactly as production `checkP3` strips tags before its jargon scan. Do
NOT fail A5 for the mere presence of a `[zone:…]`/`[term:…]` tag.

**A5a — voice & terminology (all cases):**
- **Direct 2nd-person address.** The coach addresses the player as "you" / "your" and the other side
  as "your opponent." Third-person analyst voice ("the first player should…"), or **player names**
  ("Gray", "Green"), is a fail.
- **No internal / vector / render terminology.** The coach must speak plain English (Connect Four
  jargon allowed — see below). It must NOT surface any name of the underlying data structure or engine
  machinery. Banned wording (name the field OR its meta-phrase form) includes — **this list is scoped
  to terms that actually occur in THIS vector / glossary / render, not the production explain-prompt's
  list** (so it deliberately omits "simulation / pattern data / pattern comparison / leaf", which never
  appear here):
  - **Structure/field names & their prose echoes:** `case`, `route`, `direction`, `link`, `frame`,
    `guardrail`, `covers`, "render" / "render decision", "vector" / "feature vector", `openingContext`
    / "opening context" / "the opening-book context", `lostResource` / "lost resource",
    `opponentPunishment` / "opponent punishment", `replyHistogram` / "reply histogram", `gate` /
    "swindle gate" / "gate verdict", `parityAttribution` / "parity attribution",
    `completingCell` / "completing cell" *(the plain "the square that finishes the four" is fine)*,
    `window` *as the jargon for the 4-cell group (plain "four-in-a-row line" is fine)*,
    `namedOpening` / `defense` / `centrality` **used as a field label** *(the word "central" / "more
    central" in plain use is fine; "the centrality signal/field" is not)*, `matchedPrefixLen`,
    `bookNextCol` / `bookCol` / `bestDefenseCol`, `betterHasMoreLines`, `resistAndWait`,
    `deepResourceGrounded`, `patternOnAfterBestBoard`, `finalMovestring`, `boardState`, `register`,
    `horizon`, `pliesToEnd` *(plain "about N moves later" is fine)*, `tacticTag` / `tag`, `kind`,
    `tie`.
  - **Engine/solver meta:** `forced_win` / `losing_position` **as slugs** *(the plain phrases "a
    forced win" / "a losing position" are fine)*, "solver", "score" / "numerical evaluation", "the
    data", "the evidence".
- **Allowed:** plain English + Connect Four jargon — **major threat, minor threat, fork, double
  threat, winning line / four-in-a-row, block, diagonal, row, column, more central, claimeven**, etc.
  **Naming the actual opening as given is allowed** (e.g. "you were following the 3-4 opening" / "the
  candlesticks opening") — a real opening name is coach vocabulary, not an internal-structure
  reference. "Practical swindle" / "swindle" (a trap that invites an opponent slip) is allowed.

**A5b — no defeatist framing for a player-2 opening board (`player === 2 && boardState ===
"opening"`):**
- The coach must **NOT** tell the player they are lost: phrasings like "you're losing," "you were
  already losing," "both moves (still) lose," "neither move wins," "the position is lost" are a
  **fail** on such a board. A player 2 is theoretically behind from move 1; saying so is demoralizing
  and unhelpful, and this is exactly where the production coach reframes.
- The coach **must positively reframe as hold-the-line**: play the toughest defense / make it as hard
  as possible for the opponent / keep the most central lines and wait for a slip. A bare omission with
  **no** constructive framing also fails A5b. (This mirrors production `llmCoachHelpers.js`: the
  second player "holds the toughest defense and waits for a slip" and does NOT claim to be building a
  win — so a player-2 board where the coach claims to be *building an attack/win* is also an A5b fail.)
- A5b does **not** apply outside the player-2 opening case: for a first-player board, or a
  mid-game/closing board, plainly stating the outcome is fine (A5a still applies).

**A5 failure triage.** Locate the source of the bad wording before bucketing:
- If the **render's own composed frame text supplies the wording** — e.g. the condition-D
  `render_decision.link.text` (or the opening frame) literally says "you were already losing… neither
  move wins" on a player-2 opening board, and the model faithfully echoed it — the fault is the
  **render layer** → **`render_bug`**, `field_or_glossary` = the culprit `render_decision` element /
  `causalLinks.mjs` rule (e.g. *"causalLinks.mjs L7 text emits defeatist 'neither move wins' for a
  player-2 opening board — should route to a hold-the-line opening frame"*). This is the expected
  bucket for A5b on this vector today.
- If the render text was clean (or gave a usable hold-the-line frame) and the **model introduced** the
  banned terminology or defeatist wording on its own → **`prompt_confusion`**.
- A missing field that would have let the coach reframe (e.g. no opening hold-the-line frame exists for
  this board at all) → **`missing_info`**.

## A6 — actionable better move (the player is TOLD which column, in the prose)

A deep reveal that never names the column the player should have played instead is not something the
player can act on. **A6 grades the `mechanism` prose only** — the same field A5 grades, and the only
field production actually serves. `better_move` is a separate JSON key that the answer schema forces
the model to fill on every run; it is grader-facing, never shown to a player. A1 already covers it.

**How to score.** Strip all `[zone:…]…[/zone:…]` and `[term:…]…[/term:…]` markup from `mechanism`
first (same preprocessing as A5), then check whether the cleaned prose names the better column in
player-facing form — `column N` where `N = feature_vector.bestCol + 1` (or the localized equivalent,
e.g. `columna N`, if the run was generated in another locale).

- **Pass:** "the better move was column 6", "you should have dropped in column 4 instead".
- **Fail:** the column appears only inside a `[zone:…]` handle or as a raw `cNrM` / `colN` token with
  no column word in the prose; or the prose refers to it only as "the better move" / "the move that
  preserves…" without ever naming it.
- **Fail:** the prose names a *different* column as the better move than `feature_vector.bestCol + 1`.
  (If it names the right one somewhere and a wrong one elsewhere, that is an A6 fail *and* likely an
  A4 fabrication — record both.)
- **Not a fail:** naming the played column too. Naming both is normal and good.

**Do not soften this for a "the position is subtle" case.** If the vector carried `bestCol` — and it
always does — there is no honest-abstention exception here. Abstention applies to *reasons*, never to
*which column*.

**Triage.** An A6 failure is almost never `missing_info`: `renderDecision` puts the better column in
the prompt verbatim (`- Better move: column N (lands at cNrM)`). Default to **`prompt_confusion`**
unless you can show the Decision block was absent or wrong for that record.

## A7 — utility to the blunderer (does this have a chance of teaching?)

**The reader model — adopt it explicitly before grading.** You are the player who *just made this
move*. You can see the board and the highlights. You do **not** already know why the move was bad —
that is the entire reason you are reading. Grade whether this text gives that person something they
did not have. Do not grade it as an analyst's note, and do not credit yourself with understanding you
only have because you ran the solver.

A7 has four sub-tests. **All four must hold for the run to pass A7.** Record which one failed.

**A7a — names a CAUSE, not a restatement of the outcome.** The explanation must say what actually
changed on the board, not what the result was.
- Fail: "you lost the race", "your best result there is only a draw", "the better move keeps the win
  alive", "you gave up your long win" — these are results, restated.
- Fail: "you let your opponent take that square away later" *as the whole reason* — it names no
  mechanism for how or why they get to take it.
- Pass: the reply that punishes it, the square that changes hands and why the player cannot contest
  it, the line that gets blocked or completed.

**A7b — every specific referent is locatable.** Any noun phrase that promises a particular board
object — "the key square", "the central threat", "your winning line", "the double threat", "that
line" — must resolve to a specific cell or line the player can find: named in prose, or (condition D)
wrapped in an emitted `[zone:…]` that points at it.
- Fail: a phrase that names something specific and points at nothing. This is the exact defect the
  grounding effort exists to fix; treat it strictly.
- Fail: **the same phrase used for two different objects** in one explanation (e.g. "the key square"
  used once for the player's square and once for the opponent's). Ambiguous reference is worse in
  speech than in text, and these are read aloud by TTS.
- Not a fail: a genuinely general noun used generally ("a fork", "a threat") that does not promise a
  specific location.

**A7c — a fork's PIVOT is named, not only its effects.** When the mechanism is a double threat /
fork, the explanation must name the square that *creates* it — the move that makes both threats live
at once — not merely the two finishing squares.
- Fail: "your opponent answers with a double threat on the two finishing squares at X and Y" with no
  mention of the move that produces the fork. The player cannot see it coming, which is the only
  thing worth learning here.
- N/A (do not fail, do not credit): the case's mechanism is not a fork.
- This sub-test exists because the required set currently obliges the endpoints and not the pivot;
  see **OI-182**. Expect failures here to be `missing_info` / `render_bug`, not model error — check
  whether the pivot square was even offered before you attribute it.

**A7d — concrete and transferable, failing BOTH ways.** The explanation should name the mechanism
(a fork, a parity/zugzwang squeeze, a blocked line, who-completes-first) *tied to the squares on
screen*.
- Fail (too narrow): pure move narration — "you played here, they play there, then you…" — with no
  named idea a player could carry to another game.
- Fail (too abstract): textbook rule recitation with no connection to the squares on screen ("control
  the centre", "odd threats win for the first player") when nothing anchors it to this board. The
  project's stated pedagogy is concrete-first and explicitly rejects abstract rule recitation — an
  abstract rule is **not** a safe default that earns a pass.
- Pass: a named idea *and* the squares that instantiate it.

**Honest-minimal exception (do not over-penalize honesty).** If the position genuinely has no
distinguishing feature to teach — the moves are near-equivalent and the vector carried nothing
decisive — a brief, honest explanation with a non-empty `unsure_about` **passes A7**, consistent with
the abstention principle at the top of this skill.
**But this exception is void when the vector DID carry the decisive fact.** If you can point to the
field that would have supplied the reason, a vague-but-honest-sounding answer is not honesty — it is
the symptom of a selection or prompt failure. Score A7 fail and attribute it. Do not let an
honest-sounding answer mask a decisive position the pipeline failed to surface.

**Manufactured specificity is an A7 failure even when it is not an A4 fabrication.** On a sparse
opening board with no major threats, an explanation that asserts a personally-owned four-in-a-row and
two "key squares" across empty cells may survive A4 (the cells exist; the line is reachable) while
being useless and misleading to a learner. Fail A7a/A7b and say so. **An explanation that admits the
position is still abstract is better than one that invents concrete structure it cannot support** —
grade it that way.

**Length and focus.** One clear idea a player retains beats three they do not. Do not fail A7 on
length alone, but if the explanation is a coordinate list or stacks three unrelated ideas such that
none lands, that is an A7d failure — record it with the quoted text.

**Triage.** A7 failures split cleanly and you must say which:
- the reason was never in the vector → **`missing_info`** (name the field that would have carried it);
- it was in the vector/offer but the render or required set did not oblige it → **`render_bug`**
  (name the element — this is the expected bucket for A7c today);
- everything was supplied and the model still restated the outcome → **`prompt_confusion`**.

## Grading opening-deviation cases (`openingContext`)

Some cases carry `feature_vector.openingContext` (opening-phase decisions, either player to move —
only `namedOpening` is first-player-exclusive; `defense` is second-player-exclusive; `centrality`
applies to **either** player, which is exactly why a player-2 `centrality` board legitimately carries
`resistAndWait: true`. Do not flag a player-2 `centrality` board as suspicious on that basis alone.)
This is an **additional lookup/geometry field**, not a different pass rule — A1–A7 (and, for
condition D, G1–G7) still apply exactly as above. Note these opening boards are exactly where **A5b**
(no defeatist framing for a player-2 opening board; hold-the-line reframe required) bites. **Condition-D opening cases now carry a `render_decision.openingContext` block** (shipped
2026-07-05). Shape: `{ kind, frameId (O1|O2|O3), lead:{id,family,matchedPrefixLen,bookCol,holdCol
(1-indexed)}, centralityComparison:{player,betterCell,playedCell,qualitative (much_easier|easier|
null)}, parityFavor:{betterCellRowParity,favorsMover}, deepResourceGrounded:false, horizon:
{register,pliesToEnd} }`. Consume it as GROUND TRUTH like any other `render_decision` element. Two
opening-specific checks, in addition to the three board checks (prefix / book-move score-equality /
"why it loses" grounding):
- **Deep-cell suppression (G4/G5):** `deepResourceGrounded:false` means the opening frame deliberately
  does NOT ground a deep completing cell. An answer that names a specific deep winning/losing cell
  (e.g. a 35-ply `cNrM` from `lostResource.completingCell`) as the mechanism is a **fail** — the render
  told it not to. Naming the book/hold column and the near-term landing cells is correct.
- **Centrality claim direction (A3):** this check is scoped to the *landing-cell* clause only — "it'll
  be much easier/easier to build a connected four through `{betterCell}` than through `{playedCell}`".
  That clause must match `centralityComparison.qualitative`, and the answer must make **no** such
  landing-cell claim when `qualitative` is `null`. A landing-cell claim against a `null` comparison is
  an A4 fabrication (`render_bug` if `qualitative` is wrong for the board; else `prompt_confusion`).
  This is **separate** from the O3 (`centrality`) frame's geometry *lead* — "the more central column
  runs through more four-in-a-row lines," backed by `openingContext.centrality.betterHasMoreLines: true`
  — which is an always-valid solver/geometry fact for opening boards and is **not** gated by
  `qualitative`; do not flag that lead as fabrication when `qualitative` is `null`.

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

## Grading condition D — the `render_decision` rubric (G1–G7)

Condition D answers are graded against the **rendered, causally-composed artifact** (grounded-render
prompt, Phase 3), not the raw glossary+JSON the condition-A model saw. The eval pipeline emits a
per-record `render_decision` object on condition-D answers lines — this is the **routing ground
truth**. Shape: `{ case, route, direction, patternOnAfterBestBoard, link:{id,confidence,covers,
guardrail,text}, boards:[{id,shown,reason}], resource:{completingCell,registerToHorizon},
fieldPartition:{rendered,covered,excluded}, finalMovestring,
zones:{aliases:[{handle,spec,role,truthBoard,kbId}],terms:[{slug,kbId,canonicalPhrase,description}]} }`.

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
the `boards` shown/omitted list + reasons, `patternOnAfterBestBoard`, `fieldPartition`,
`finalMovestring`, and `zones` (the offered `[zone:]`/`[term:]` alias/term set) straight off the record
and treat them as the pipeline's settled decisions — `zones` is consumed as GROUND TRUTH exactly like
every other `render_decision` element: never re-derive the offered set yourself. Your job
is to audit the ANSWER against these decisions (G1–G7), not to check whether the decisions themselves
are the ones you would have made.

**Ground truth from RAW evidence, not the narrator vector.** Outcomes/columns still come from the RAW
`feature_vector` fields (the narrator vector is score-scrubbed per D21). Verify every named cell/line
against `render_decision.finalMovestring` (G4) — **never an alternate solver PV**; multiple optimal
lines can exist, and grounding on the wrong one is exactly the eval-1/16/3 mis-grade bug that Task 8
fixed the cell-grounding source for.

The seven additive checks, scored per `(id, condition D)` case in addition to A1–A7:

| Check | What | How |
|---|---|---|
| **G1 format-aware** | Grade against the **grounded artifact the model actually saw** — the rendered boards, the plain-language threat list, the composed frame `text`, the reading key — NOT the glossary+JSON condition A used. | read the answerer's condition-D prompt/render, not the raw vector |
| **G2 per-link** | (a) the answer honored `render_decision.link.guardrail` (e.g. an L3 link forbids "your move caused/enabled it" phrasing); (b) over-removal audit — a code in `link.covers` that the answer **actually needed** to make its case = a wrong removal, **but** a covered-but-**absent** field is normal (D28), not `missing_info`; (c) a `link.confidence:"low"` (L9) answer must **hedge**, not fabricate a crisp cause. | `render_decision.link` + board |
| **G3 board-selection** | Using `render_decision.boards`, an over-omission audit: did the answer need a board marked `shown:false`? | `render_decision.boards` |
| **G4 engine-line grounding** | Verify each named cell/line against `render_decision.finalMovestring` — never an alternate PV. | `visualize_board.sh` on `finalMovestring` |
| **G5 threat-list fidelity** | Each rendered threat-list entry must be board-true on its stated board; a wrong entry is a **render bug to REPORT**, not something to narrate around or silently forgive. | `visualize_board.sh` |
| **G6 branch-invariance provenance** | Given `patternOnAfterBestBoard` + `link.id`: (a) guardrail honored; (b) the routing was correct for the after-best board. A wrong L2/L3 pick (a miscomputed `patternOnAfterBestBoard`) is a **render bug attributable to the pipeline** — never a model failure. Triage it `render_bug`, not `prompt_confusion`. | `render_decision.patternOnAfterBestBoard` |
| **G7 annotation fidelity** | **G7a (zones):** every emitted `[zone:handle]` in `mechanism` used a handle listed in `render_decision.zones.aliases` (unoffered handles are dropped by the pipeline, so a surviving one is a pipeline bug); each handle wraps a phrase whose meaning matches its `role`; nothing is over-wrapped. Board-truth of the alias's `spec` is delegated to **G5**, checked on the alias's `truthBoard` (not the displayed decision board). **G7b (terms):** every `[term:slug]` used a slug in `render_decision.zones.terms`, and the wrapped phrase genuinely denotes that KB concept. **G7c (malformed-tag auto-fail):** if the record's `annotationRepairs` array (a top-level field sibling to `answer`/`render_decision`) is non-empty, G7 is an automatic FAIL for that run — the render pipeline already bare-stripped an unclosed `[zone:]`/`[term:]` tag the model emitted, so the model produced malformed markup even though the final text the pipeline shipped is clean; triage this `prompt_confusion` (the model's fault, not the render layer's). | `render_decision.zones` + `visualize_board.sh` on the alias's `truthBoard` |

G1–G7 are **additive** for condition D — A1–A7 still apply and are scored exactly as in the "How to
grade" section above; do not substitute G1–G7 for them.

## Failure triage — WHERE the fault lives (required for every failing case)

A pass/fail is not enough. For every case that fails A3 or A4 (or, for condition D, any of G1–G7),
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
- **G7 (zone/term annotation) triage:** a handle or slug not offered in `render_decision.zones`, or
  bound to a semantically wrong phrase, or over-wrapped → `prompt_confusion`. An offered alias whose
  `spec` is board-false on its `truthBoard` → `render_bug` (surfaced by G5). A cell/tactic the case
  needed that the render layer never offered as a zone/term at all → `missing_info`.
- **G7c (malformed-tag) triage:** always `prompt_confusion` — a non-empty `annotationRepairs`
  means the model emitted an unclosed tag; the pipeline already repaired the player-facing text, so
  there is nothing for the render layer to have done differently.
- A case can have several defects; pick the **decisive** one (the reason the case fails). Note secondary
  ones in `failure_summary`.

Every failing case must carry a **one-sentence `failure_summary`**: plain-language "what went wrong,"
naming the culprit field and the board/solver finding (e.g. *"Named the win completing at c5r5, but the
engine's own `finalMovestring` line never reaches that square — `parityAttribution.completingCell` is junk on a
move-1 board (`vector_error`)."*). This sentence is surfaced verbatim after grading (see Output).

### Scoring via sub-agents

For each `(id, condition)` group, spawn a fresh `general-purpose` sub-agent (it runs in the repo
root with shell access, so it can use `./visualize_board.sh` and the solver directly, and can read the
answers/vectors jsonl itself). Process groups **sequentially, one at a time** — there can be many, and
this is required, not just a suggestion: sub-agents append their grade to a shared `_grades.jsonl`
file (Step 3 below), and concurrent appends from parallel sub-agents can interleave and corrupt lines.

Give the sub-agent ONLY a locator — the file paths, the `id`, and the `condition` — never the record
contents. The sub-agent locates and reads its own data. This keeps your dispatch prompt small
regardless of how verbose a condition-D `render_decision` block is. Sub-agent prompt template:

---
```
You are grading Connect Four blunder-explanations for ONE case (one position, one ablation
condition) across N independent runs. You are an AGENT with shell access, run from the repo root.

## Your case
- answers file: <path to the answers jsonl>
- vectors file: <path — same as answers file unless --vectors was passed>
- id: <id>   condition: <condition>
- grades output file: <answers-dir>/<answers-stem>_grades.jsonl

## Step 0 — load your own record (do this first)
Read the answers jsonl and collect every line matching this exact `id` and `condition` — these are
your N runs. If any matching row has `call_error`/`parse_error` non-null or `answer` null, that run is
a parse failure: count it, exclude it from axis scoring, and the case fails (a run with no gradeable
answer cannot pass on all N runs).

Read the vectors file and find the `feature_vector` embedded in one of those rows (identical across
runs for the same id). From it derive:
- movestring, playedCol/bestCol (0-indexed; display column = col + 1)
- player, boardState (A5b bites iff player === 2 AND boardState === "opening")
- case, bestScore/playedScore, and the expected outcomes the case implies (win_to_draw→win/draw,
  win_to_lose→win/loss, draw_to_lose→draw/loss, lose_to_faster_lose→loss/loss)
- lostResource.kind / opponentPunishment.kind (winning_line | denial | neutralization | conditional_swindle)
- the engine's own finalMovestring — use `lostResource.finalMovestring` when `lostResource.kind` is a
  winning line, else `opponentPunishment.finalMovestring`. This is the ONLY line to trace when checking
  whether a named cell/window is real — never substitute an alternate optimal solver line (that
  mis-grounding is exactly the eval-1/16/3 mis-grade bug).

Coordinate rule: answer.better_move is 1-indexed display; key_cells are cNrM 1-indexed; the derived
cols above are 0-indexed. A1 holds iff better_move - 1 == feature_vector.bestCol.

**Condition D only:** also extract `render_decision` from the row(s) — `{ case, route, direction,
patternOnAfterBestBoard, link:{id,confidence,covers,guardrail,text}, boards:[{id,shown,reason}],
resource:{completingCell,registerToHorizon}, fieldPartition:{rendered,covered,excluded},
finalMovestring, zones:{aliases:[…],terms:[…]} }`. If it's present per-run, confirm it's identical
across runs for this id (note any divergence in `notes` — that would itself be a bug). Consume every
field as GROUND TRUTH — do NOT recompute `classifyCausalLink`, branch-invariance, board selection, or
the offered zone/term set yourself. For G4, use `render_decision.finalMovestring` (not the raw
feature_vector one) as the line to trace. Omit all condition-D steps below for condition A/B/C.

## Step 1 — observe the board
For any board-level claim (A3/A4) you MUST OBSERVE the board, not infer it from the feature vector
(the vector is the artifact under test). Run `./visualize_board.sh <movestring>` and read its
threat/par/score annotations:
- after-best board:   <movestring><bestCol 0-indexed>
- after-played board: <movestring><playedCol 0-indexed>
For a move's true outcome, query the solver (createSolverProcess from
connect-four/server/c4solver-wrapper.js; cd connect-four; await solver.query; destroy() in finally).
When a claim names a cell/window/line that is NOT visible on the board, do NOT rule it false from
absence — on deep/near-empty positions a real winning line completes on currently-empty squares.
Trace the engine's OWN finalMovestring (from Step 0) and check whether it passes through the named
cell BEFORE calling the field wrong. Never ground on an alternate optimal solver line.

## Step 2 — score each axis on EACH run, then apply the pass rule
- A1: better_move - 1 == feature_vector.bestCol?
- A2: best_outcome / played_outcome match what feature_vector.case implies
      (win_to_draw→win/draw, win_to_lose→win/loss, draw_to_lose→draw/loss,
      lose_to_faster_lose→loss/loss); cross-check sign with the solver if unsure.
- A3: Does the mechanism's named tactic/threat exist on the after-best / after-played board
      (verify with visualize_board.sh), and is it the DECISIVE reason the better move wins/holds
      (not a true-but-peripheral observation)? Use the solver to confirm the outcome difference is
      real. key_cells must be the squares that reason rests on. CONDITION D EXCEPTION: when
      `key_cells` were derived by expanding an emitted `[zone:…]` (e.g. a whole highlighted column or
      window), they are display-overlay cells, not per-cell threat assertions — grade A3 on the
      tactic(s) the `mechanism` actually names and rests on, not on every cell the overlay spans;
      offered/board-truth fidelity of the zones themselves is G7 (and G5 for spec board-truth on the
      truthBoard).
- A4: Is EVERY concrete claim (each key_cell's threat, each named line/fork) actually true on the
      board? A claim contradicted by the visualizer = A4 fail (zero tolerance). EXCLUDE anything the
      model put in `unsure_about` — that is honest abstention, not fabrication. CONDITION D EXCEPTION:
      do NOT treat an empty cell inside an emitted `[zone:…]` (e.g. a non-landing cell of a
      highlighted column or window) as an A4 fabrication — it is a display-overlay cell, not a
      per-cell threat claim; zone offered/board-truth fidelity is covered by G7/G5.
- A5 (COACH VOICE — grade the `mechanism` prose only; do NOT penalize `fields_relied_on` or
      `unsure_about`, which are grader-facing and never shown to a player):
      Before checking A5, STRIP all `[zone:…]…[/zone:…]` and `[term:…]…[/term:…]` markup from
      `mechanism` and grade the CLEANED prose — the markup is machine tokens the frontend removes,
      exactly as production `checkP3` strips tags before its jargon scan. Do NOT fail A5 for the mere
      presence of a `[zone:…]`/`[term:…]` tag.
      A5a (ALL cases): the `mechanism` addresses the player in the 2nd person ("you"/"your opponent";
        no player names "Gray"/"Green", no 3rd-person analyst voice) AND uses NO internal / vector /
        render terminology — no field names or their prose echoes (case, route, direction, link,
        frame, guardrail, "opening context"/"opening-book context", "lost resource", "opponent
        punishment", "reply histogram", "swindle gate"/"gate verdict", "parity attribution",
        "completing cell" [plain "the square that finishes the four" is fine], "window" [plain
        "four-in-a-row line" is fine], matchedPrefixLen, bookCol/bestDefenseCol, betterHasMoreLines,
        resistAndWait, deepResourceGrounded, patternOnAfterBestBoard, finalMovestring, boardState,
        register, horizon, pliesToEnd [plain "about N moves later" is fine], tacticTag/tag, kind, tie),
        no engine/solver meta (forced_win/losing_position AS SLUGS, "solver", "score"). ALLOWED: plain
        English + Connect Four jargon (major/minor threat, fork, double threat, winning line, block,
        diagonal, row, column, more central, claimeven) and naming the ACTUAL opening as given
        (e.g. "the 3-4 opening"); "practical swindle" is allowed.
      A5b (ONLY when player === 2 AND boardState === "opening"): the coach must NOT say the player is
        lost — "you're losing"/"you were already losing"/"both moves (still) lose"/"neither move
        wins"/"the position is lost" is a FAIL — and MUST positively reframe as HOLD-THE-LINE (play the
        toughest defense / make it hardest for your opponent / keep central lines and wait for a slip).
        A bare omission with no constructive frame also fails A5b; claiming to be building a win as the
        2nd player also fails. A5b does NOT apply to first-player boards or mid-game/closing boards.
      A5 triage: if the render's OWN composed text (`render_decision.link.text` / opening frame) SUPPLIED
        the defeatist wording on a player-2 opening board and the model echoed it → `render_bug` (name the
        `causalLinks.mjs` rule / frame). If the render was clean and the model introduced the banned
        terminology or defeatist wording itself → `prompt_confusion`. If no hold-the-line frame exists for
        the board at all → `missing_info`.
- A6 (ACTIONABLE BETTER MOVE — grade the `mechanism` prose only, markup STRIPPED exactly as for A5):
      the cleaned prose names the better column as `column N` (or the locale equivalent) where
      `N = feature_vector.bestCol + 1`. PASS: "the better move was column 6". FAIL: the column appears
      only inside a `[zone:…]` handle, only as a raw `cNrM`/`colN` token, or only as "the better move"
      / "the move that preserves…" with no column named. FAIL also if the prose names a DIFFERENT
      column as the better move (that is usually an A4 fabrication too — record both).
      Do NOT check `better_move` here — that JSON field is A1's job and is never shown to a player.
      There is NO honest-abstention exception for A6: the vector always carries `bestCol`.
      A6 triage: default `prompt_confusion` — `renderDecision` states the better column in the prompt
      verbatim. Only call it `missing_info` if you can show the Decision block was absent or wrong.
- A7 (UTILITY TO THE BLUNDERER — grade the `mechanism` prose against the board, markup STRIPPED):
      Read as the player who JUST MADE THIS MOVE: they see the board, they do NOT know why it was
      wrong. All FOUR sub-tests must hold; record every one that failed.
      A7a CAUSE not outcome: names what changed on the board, not the result. FAIL on "you lost the
        race" / "your best result is only a draw" / "the better move keeps the win alive", and on
        "you let your opponent take that square away later" as the WHOLE reason.
      A7b REFERENTS LOCATABLE: every phrase promising a specific board object ("the key square", "the
        central threat", "your winning line", "the double threat") resolves to a findable cell/line —
        named in prose or wrapped in an emitted `[zone:…]`. FAIL a phrase that names something
        specific and points at nothing. FAIL the same phrase reused for two different objects.
      A7c FORK PIVOT: when the mechanism is a double threat, the square that CREATES the fork is
        named — not only the two finishing squares. N/A when the mechanism is not a fork (neither
        fail nor credit). Check whether the pivot was even offered before attributing (see OI-182).
      A7d CONCRETE AND TRANSFERABLE — fails BOTH ways: FAIL pure move narration with no named idea;
        FAIL abstract rule recitation with nothing anchoring it to these squares. An abstract rule is
        NOT a safe default. PASS = a named idea PLUS the squares that instantiate it.
      Honest-minimal exception: a brief honest answer with non-empty `unsure_about` PASSES A7 when the
        position genuinely has nothing to teach — but the exception is VOID if you can name the vector
        field that carried the decisive reason. Then it is a pipeline failure, not honesty.
      Manufactured specificity FAILS A7 even when it survives A4: asserting a personally-owned
        four-in-a-row and "key squares" across empty cells on a threatless opening board is an
        A7a/A7b fail. Admitting the position is still abstract is BETTER than inventing structure.
      Do NOT double-charge: if a sentence already failed A3 or A4, record that as the primary axis and
        do not also fail A7a for it.
      A7 triage: reason never in the vector → `missing_info` (name the field); in the vector/offer but
        not obliged by the render or required set → `render_bug` (expected bucket for A7c today);
        everything supplied and the model still restated the outcome → `prompt_confusion`.

Abstention: for each run, capture `unsure_about` verbatim. It is a FEATURE-GAP signal: note which
vector field (or glossary section) would have resolved it.

## Condition D only — score G1–G7 on EACH run, IN ADDITION to A1–A7
<omit this whole section for condition A/B/C.> Consume the "Render decision — GROUND TRUTH" block
above AS GIVEN — do not recompute classifyCausalLink, branch-invariance, board selection, or the
offered zone/term set.
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
- G7 annotation fidelity (zones/terms; condition D only): **G7a (zones)** — every emitted
  `[zone:handle]` in `mechanism` used a handle listed in `render_decision.zones.aliases` (a surviving
  unoffered handle is a pipeline bug); each handle wraps a phrase matching its `role`; nothing is
  over-wrapped. Board-truth of the alias's `spec` is delegated to G5, checked on the alias's
  `truthBoard` (not the displayed decision board). **G7b (terms)** — every `[term:slug]` used a slug
  listed in `render_decision.zones.terms`, and the wrapped phrase genuinely denotes that KB concept.
 Additionally: if the record's `annotationRepairs` array is non-empty, G7 auto-fails
  (`prompt_confusion`) regardless of the above — the model emitted at least one unclosed tag, even
  though the pipeline already bare-stripped it before the player saw it.

Pass rule: the CASE passes iff A1, A2, A3, A4, A5, A6, A7 all hold on ALL runs (condition D: **and** G1–G7 all
hold on all runs). Any run failing any axis/check → case fails. Note intermittency explicitly.

## Counterexample attribution (the deliverable)
If the case fails A3, A4, A5, A6 or A7 (condition D: or any of G1–G7), OR any run has a non-empty
`unsure_about`,
attribute it: name the specific feature-vector FIELD that was missing/ambiguous (e.g.
"lostResource.forkWindows did not include the window the mechanism named", "opponentPunishment.tie
said independent but the model claimed a shared cell", "parityAttribution.leverCells absent so the
model invented a lever") or the GLOSSARY ambiguity, and state the board finding that proves it.
Condition D: if the defect is a render-layer one, name the specific `render_decision` element or
`causalLinks.mjs` rule instead (e.g. "patternOnAfterBestBoard:false but tagBoard on the after-best
board fires figure_7 — the L2-vs-L3 branch-invariance computation is wrong").

## Failure triage (required whenever the case fails A3, A4, A5, A6 or A7, or condition D: any of G1–G7)
Classify the ROOT cause into exactly one bucket, and write a one-sentence plain-language summary
(for an A5 coach-voice failure see the A5-triage rule above — a defeatist/terminology leak the render's
own text supplied is `render_bug`; one the model introduced itself is `prompt_confusion`):
- `vector_error` — a field carried a WRONG/junk value the model faithfully relied on. Before choosing
  this you MUST have shown the engine's own `finalMovestring` contradicts the field (trace that line;
  do not infer from board absence, and never ground on an alternate optimal solver line — that
  mis-grounding is exactly the eval-1/16/3 bug). Off-board-but-finalMovestring-real ≠ wrong.
- `missing_info` — the vector was not wrong but LACKED a field the model needed; the model abstained
  (`unsure_about`) or had to guess (no field carried the fact). Condition D: a `covers` code absent
  from the record is D28-normal, NOT `missing_info`. A G7 cell/tactic the case needed that the render
  layer never offered as a zone/term at all is also `missing_info`.
- `prompt_confusion` — the correct, sufficient info WAS present in a field (unambiguous per glossary),
  but the model misread / mis-anchored a cell / dropped the field / hallucinated past it. A G7 handle
  or slug not offered in `render_decision.zones`, or bound to a semantically wrong phrase, or
  over-wrapped, is also `prompt_confusion`.
- `render_bug` (condition D only) — a render-layer defect: a wrong guardrail/route, a mis-selected or
  omitted board, a false threat-list entry, or a miscomputed `patternOnAfterBestBoard`. The answer
  narrated faithfully off a broken render; this is NEVER `prompt_confusion` — the model is not at
  fault. A wrong L2/L3 pick (G6) is always `render_bug`. A G7 offered alias whose `spec` is board-false
  on its `truthBoard` is also `render_bug` (surfaced by G5).
Pick the DECISIVE cause; mention secondaries in failure_summary. failure_summary must name the culprit
field (or, for condition D render bugs, the `render_decision` element / `causalLinks.mjs` rule) and
the board/solver finding.

## Step 3 — write your grade line to the grades file, THEN return a one-liner

Build the full grade object (add the `G1`-`G7` keys inside each `per_run` entry ONLY for condition D;
omit them for A/B/C):
{
  "id": "<id>", "condition": "<condition>", "n_runs": <int>,
  "per_run": [ { "run_index":0, "A1":"pass|fail", "A2":"pass|fail", "A3":"pass|fail",
                 "A4":"pass|fail", "A5":"pass|fail", "A6":"pass|fail",
                 "A7":"pass|fail", "A7_failed_subtests":["A7a"|"A7b"|"A7c"|"A7d"],
                 "G1":"pass|fail (condition D only)", "G2":"pass|fail (condition D only)",
                 "G3":"pass|fail (condition D only)", "G4":"pass|fail (condition D only)",
                 "G5":"pass|fail (condition D only)", "G6":"pass|fail (condition D only)",
                 "G7":"pass|fail (condition D only)",
                 "unsure_about":"<verbatim or empty>" }, … ],
  "case_pass": true|false,
  "intermittent": true|false,
  "failure_triage": "vector_error|missing_info|prompt_confusion|render_bug|null (render_bug condition D only; null iff case_pass)",
  "failure_summary": "<one sentence: what went wrong, naming the field (or, condition D render bugs, the render_decision element/causalLinks.mjs rule) + board/solver finding; empty iff case_pass>",
  "notes": "<one line per failing axis/check: what was wrong, with the board finding>",
  "counterexamples": [ { "axis":"A3|A4|A5|A6|A7|abstention|G1|G2|G3|G4|G5|G6|G7", "field_or_glossary":"<the
     missing/ambiguous feature field or glossary section, OR (A5 / condition D render bug) the
     render_decision element / causalLinks.mjs rule>", "evidence":"<board finding proving it>" } ]
}

Append this object as exactly one JSON line to `<grades output file>` (`JSON.stringify(obj) + "\n"`,
appended — do not overwrite the file, other sub-agents' lines may already be in it). This write MUST
complete before you return. Only after the write succeeds, return ONLY this one-line JSON to the
caller — no prose, no fences, no full grade object:
{ "id":"<id>", "condition":"<condition>", "case_pass":true|false, "intermittent":true|false,
  "failure_triage":"vector_error|missing_info|prompt_confusion|render_bug|null",
  "failure_summary":"<empty iff case_pass>" }
```
---

Collect each sub-agent's one-line summary as it completes — this is just a progress signal, the full
grade already lives in the grades file. A malformed/no response, or a response whose `id`+`condition`
line is missing from the grades file → append a `case_pass:false, notes:"sub-agent error"` line to the
grades file yourself before moving to the next group.

## Output — the structured grades + the report

**1. Structured grades (for the `/admin/fv-suff` "Eval answers" browser).** Each sub-agent already
appended its own full grade JSON line to `<answers-dir>/<answers-stem>_grades.jsonl` in Step 3 above —
you do not assemble this file yourself. Before writing the report, read it back in full to confirm one
line per dispatched `(id, condition)` group (recover any gap per the paragraph above). Each line is
`{ id, condition, n_runs, per_run:[{run_index,A1,A2,A3,A4,A5,A6,A7,A7_failed_subtests,unsure_about}], case_pass, intermittent,
failure_triage, failure_summary, notes, counterexamples }`. The server (`GET /api/admin/fv-suff`)
derives this filename from the answers file (`gradesFilenameFor`) and joins it by `id`+`condition`, so
the UI shows the axis chips + pass/fail next to each board+vector+answer.

**2. The report.** Write to `<answers-dir>/<answers-stem>_grade_report.md`:

```
# Feature-Vector Sufficiency Report — <answers filename>

## Summary
- Answer rows: N   parse failures: N
- Cases (id × condition): N   passed (A1–A7 on all runs): N   failed: N
- Per-axis pass rate (over all gradeable runs): A1 x/y · A2 x/y · A3 x/y · A4 x/y · A5 x/y · A6 x/y · A7 x/y
- A7 sub-test failures: A7a x · A7b x · A7c x · A7d x  (a run can fail more than one)

## Pass/fail by condition  (A vs B vs C delta — §6 ablation)
| condition | cases | passed | A3 pass-rate | A4 pass-rate | A5 pass-rate | A6 pass-rate | A7 pass-rate |
If B ≈ A, the engineered fields add little for a capable model (the board carries it; won't transfer
to the weak model). If C ≪ A, the distilled fields alone don't carry the reasoning.

## Per-case verdict
| id | category | condition | A1 | A2 | A3 | A4 | A5 | A6 | A7 | pass | intermittent |
(one row per case; A1–A7 = "all runs pass" / "k/N" when mixed; for a failing A7 append the sub-tests, e.g. "fail(A7a,A7c)")

For each failing or intermittent case, a notes block below its row:
> dl-N (cond A): A3 fail on run 2 — claimed a double_threat fork the after-played board does not show;
> A4 ok. Board: visualize_board.sh shows "Major threats: none" at c4r4.

## Failure triage (root cause per failing case)
One row per failing case, its bucket, and its one-sentence summary. Then a count line
(vector_error N · missing_info N · prompt_confusion N · render_bug N) — this split says whether the
next iteration should fix the vector/glossary, the prompt-builder, or the render layer.
| id | category | triage | one-sentence: what went wrong |

## Counterexample list (THE DELIVERABLE)
Every A3/A4/A5/A6/A7 failure and every non-empty `unsure_about`, attributed to a missing/ambiguous feature
field, glossary ambiguity, or (A5 / render bug) a `render_decision` element / `causalLinks.mjs` rule.
Group by `field_or_glossary`; order by frequency.
| field / glossary / render gap | axis | triage | cases affected | evidence (board finding) | model's unsure_about |

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
- A case = one `(id, condition)`; it passes only if A1–A7 hold on **all N runs**.
- `unsure_about` is excluded from A4 and logged as a field-gap counterexample.
- **A5 = coach voice** (grade the `mechanism` prose, NOT `fields_relied_on`/`unsure_about`): 2nd-person,
  no internal/vector terminology, and — player-2 opening boards only — no defeatist "you're losing/both
  lose" framing but a hold-the-line reframe instead. A defeatist/terminology leak the render's own
  `link.text` supplied → `render_bug`; one the model introduced itself → `prompt_confusion`.
- Observe the board with `visualize_board.sh`/solver; never trust the vector to verify itself — and
  never rule a field wrong from board **absence**: trace the engine's own `finalMovestring` before
  calling `vector_error` (never an alternate solver PV — the eval-1/16/3 bug).
- Every failing case gets a **triage** (`vector_error` / `missing_info` / `prompt_confusion`) and a
  one-sentence `failure_summary`; present all failed evals as bullets at the end of your reply.
- The counterexample list (field/glossary attribution) is the point — not the pass rate.

## Do NOT reuse from the production judge

This is NOT `judge-deep-reveals`. Do **not** apply the 9-item production rubric, zone aliases,
`allowedSet`, or the annotation gate. Those grade the production annotation; here you grade a
structured explanation against the board on A1–A7 only (A5 = coach voice, A6 = actionable better move, A7 = utility to the blunderer, all defined above).
