# Grounded-Render Prompt — presenting the reason vector to the LLM

**Status:** P1 (foundation) + P2 (grounding) + P3 (causal frames) + P4 (grader + sampler integration)
IMPLEMENTED on `stagging` (modules in `connect-four/server/scripts/`: `reason_engine/causalLinks.mjs`,
`fieldDisposition.mjs`, `renderReasonModel.mjs`, `reasonCellGrounding.mjs`, `reasonBoardTags.mjs`,
`reasonBoardSelect.mjs`, `renderUniverse.mjs`; wired as ablation condition D in `compute.mjs`). P3
shipped one composer + one test per L1–L9, the L2-vs-L3 branch-invariance computation
(`patternOnAfterBestBoard`), and the static causal-code covers audit — see `reason-DECISIONS.md` D28.
P4 shipped the persisted `render_decision` record (grader ground truth), the `grade-fv-sufficiency`
G1–G6 rubric for condition D, the shared `renderUniverse.mjs` coverage universe + a freshly
regenerated 32-board coverage set, and closed the flip-case (D28 I12) gap — see D29.
**Owner layer:** the *render* step (downstream of engine soundness — see `reason-INVARIANTS.md`,
and the memory rule "engine soundness first, render later"). This doc does **not** change what
`computeReason` *stores*; it changes how the stored evidence is *grounded and presented* to the
answerer LLM.

**Motivating evidence:** the FV-sufficiency run
`fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_2026-07-02T17-15-56Z`, graded via
`grade-fv-sufficiency`, then hand-re-verified against the solver. See §2.

---

## 1. What reaches the model today

`compute.mjs --llm` (`buildPrompt`) sends exactly one user message:

```
<feature-vector-glossary.md — 607 lines>
---
<TASK: "explain why the played move was a blunder, using ONLY the glossary and the facts in this
        vector AND THE BOARD ITS movestring DESCRIBES; return one JSON object">
# Feature vector
```json
<pruned narrator vector, JSON.stringify(_, null, 2)>
```
```

To answer, the model must, in one shot:
1. hold a 607-line glossary in attention,
2. parse a deeply-nested JSON object,
3. map each field path to its meaning,
4. **mentally reconstruct the board from a raw movestring**, and
5. for any `line`/`window`/`completingCell`/`forkCells`, **mentally simulate a 20–40 ply forced
   sequence** to know what those cells refer to.

Steps 4–5 are engine work pushed onto the LLM. A strong model (`gpt-5.4`) does them
inconsistently; a small model (`gpt-5.4-mini`, the deployment target) will not.

## 2. What the failures actually proved (re-verified against the solver)

Of 29 cases, the grader initially flagged 4 failures. Hand-re-verification against **the engine's
own `finalMovestring`** (not an alternate solver PV) overturned two of them and reclassified a
third:

| case | initial verdict | re-verified truth |
|---|---|---|
| eval-1 | `vector_error` | **PASS.** `completingCell c5r5` / window `c2r5-c5r5` complete exactly on the engine's move-41 line (a ~40-ply parity win). The field was solver-real; the grader convicted it from move-2 board absence. |
| eval-16 | `prompt_confusion` (A4 fabrication) | **PASS.** Both fork windows `[c3r5..c6r5]` (completes c6r5) and `[c4r2..c7r5]` (completes c7r5) are Gy,Gy,Gy,empty on the engine's move-38 line; opponent's `[c3r3..c6r3]` completes c3r3 on its move-35 line. Every field board-true; the model rendered them faithfully. The grader's "fabrication" rested on a *different* optimal PV. |
| eval-3 | `prompt_confusion` | **`missing_info` (altitude).** The diagonal `c4r3-c5r4-c6r5-c7r6` IS real on the engine's move-38 fork (c5r4=Gy, c6r5=Gy, c7r6=Gy, completes c4r3) — but it is ~28 plies deep, while the immediately-decisive feature (a gravity-top Gy threat at **c2r1**, solver −16 across the after-best board) was never surfaced. |
| eval-23 | `prompt_confusion` | **Confirmed genuine.** The `figure_7` at c4r3 is real but *branch-invariant* (present on pre-move, after-best AND after-played boards); the model read `direction:"enabled_opponent"` as "your move *caused* it." |

Two conclusions:

- **The vector fields were sound in 3 of the 4 "failures."** The residual real defects are (a) an
  *altitude/grounding* gap (eval-3: deep cells surfaced flat, immediate feature buried) and (b) a
  *semantic over-read* (eval-23: terse routing codes narrated as causation).
- **The grader suffered the same bug as the answerer.** Sub-agents (and the orchestrator) convicted
  correct deep fields by comparing to an *alternate* optimal line instead of the engine's own
  grounded line. Any fix that grounds cells against the engine's line helps the grader too.

### The three root causes

- **A — cells are ungrounded coordinates.** `"completingCell":"c4r3"` says nothing about whether
  c4r3 is *occupied now*, *playable next move*, or *empty and 22 plies away on a forced line*. The
  model defaults to "present concrete threat." No small model reliably distinguishes these by
  simulating the movestring.
- **B — no decisiveness / horizon tier.** The vector often foregrounds the deep *terminal* fork or
  parity line as "the winning_line," with no marker of what a human should hear first, nor of
  immediate-vs-deep. eval-3's graspable story (c2r1 now) is invisible next to a 28-ply fork.
- **C — terse semantic codes invite false causality.** `direction:"enabled_opponent"`,
  `route:"realized_denied"`, `kind:"denial"/verdict:"no_occupation"`, `tie.kind:"independent"`
  encode careful engine distinctions that, as flat keys, get woven into wrong causal stories —
  especially for `lose_to_faster_lose`, where the model was never plainly told *both moves lose;
  only speed/swindle differs.*

## 3. Proposal — move grounding into the engine; present a staged, board-anchored frame

Principle: **the LLM should narrate already-grounded facts, not reconstruct the game.** The engine
has the board and the solver; it must resolve every cell and every semantic code into grounded,
plain tokens *before* the LLM sees them, and the prompt must be **staged by altitude** rather than
dumped. Replace `glossary + JSON` with six ordered sections.

> **⓪ Decision block (added by D30, Fix A) — leads the prompt.** Before the situation frame, the
> shipped `assembleGroundedPrompt` emits a canonical, board-anchored **Decision block**: `you = player
> {X}`, `Better move: column {display} (lands at {cNrM})`, `Played move: column {display} (lands at
> {cNrM})`, each with a `win`/`draw`/`loss` **outcome derived from `case`**. It exists because the raw
> `# Vector facts` JSON previously leaked 0-indexed `bestCol`/`playedCol` while every other layer was
> 1-indexed, so the model emitted the raw value as the recommended column and scrambled
> move→cell→role (9 condition-D fails). The raw 0-indexed leaves are now withheld from the JSON
> residue (disposition `transformed`, like `movestring`); the Decision block is the single
> authoritative statement of which move is best vs played and where each lands. See
> [`reason-DECISIONS.md`](./reason-DECISIONS.md) D30.

### ① Situation frame (engine-composed, plain language, per `case`)

One short paragraph the engine writes from `case`/`route`/`direction`, replacing raw codes. The
per-case sketches below are **generalized and made authoritative by the causal-links catalog in
§3b** — that catalog (L1–L9), not this list, is what P3 implements. Illustrative sketches:

- `win_to_draw` / `win_to_lose`: *"You had a forced {win}. The played move throws it away to a
  {draw/loss}. Explain what winning resource the played move gave up."*
- `draw_to_lose`: *"The position was a draw. The played move loses. Explain the defensive resource
  the played move abandoned."*
- `lose_to_faster_lose`: *"You were **already losing** before this move. Both the played move and the
  better move lose with perfect play — the only difference is **how fast**, and whether a practical
  swindle survived. Do NOT say the played move *caused* or *enabled* the opponent's win."*  ← kills eval-23.

### ② Pre-rendered boards (engine supplies ASCII; the model never simulates)

The decision board (and the after-best / after-played boards where they carry the contrast) rendered
as ASCII so the model *reads* the board instead of reconstructing it from a movestring.

**Do NOT reuse `visualize_board.sh` for the prompt** — it is the right tool for humans/graders, the
wrong one for the model. Verified against eval-3 and eval-23 (2026-07-02):

- **It leaks the solver scores.** Every non-terminal board prints a `scr` row (per-column solver
  score). That is exactly the score family `toNarratorVector` deep-scrubs; emitting it re-leaks the
  ground truth and diverges from production (the coach gets no scores). Disqualifying on its own.
- **Its exhaustive annotation competes with, and can contradict, the vector.** It marks every threat
  on every empty cell. On the eval-3 decision board it reports "Major threats: none" and marks c5r4
  as an *opponent* minor threat `(gn)` — while the vector calls c5r4 a cell in *your* winning line
  (the fork is 28 plies deep, which the board cannot express). On eval-23 it lists two major threats
  but does not tell the model which one is the `figure_7`, nor group the figure_7 diagonal.
- **Notation load:** move numbers, four threat glyphs (`<>`/`[]`/`()`/`[*]`), `[GT]`, the `par` row,
  two boards, and a 6-line legend — mostly irrelevant to narrating one reason.

Instead, build a **purpose-built `renderReasonBoard(fv)`** for the prompt:
- one board, perspective-labeled (You / Opponent), coordinates in `cNrM`;
- **no `scr`, no `par`** (include a minimal parity note only when parity IS the mechanism), **no move
  numbers**;
- overlay **only the cells the vector names**, each with its role glyph (completing/threat cell;
  supporting discs of the winning line; opponent's denial cell) — not every incidental threat;
- name the geometry explicitly (e.g. "diagonal c6r1·c5r2·c4r3·c3r4") so the model needn't find it;
- keep **deep-horizon cells OFF the current board** — they are empty now, so marking them invites the
  exact "present-threat" error §3-A targets; they belong in the "deeper forced line" block (④/⑤),
  optionally as a projected final-board snippet.

Because the renderer needs the vector's cell list + horizon to decide what to draw, it necessarily
lives with the render step, not in the generic `visualize_board.sh`.

### ③ The load-bearing resource, with every cell grounded

Replace bare coordinates with status-tagged objects the engine fills in from the board + line:

```json
"resource": {
  "completingCell": {
    "cell": "c4r3",
    "status": "empty",                 // occupied-you | occupied-opp | empty-playable-now | empty
    "reachableInPlies": 22,            // plies until this square is fillable on the forced line
    "horizon": "deep-forced-line",     // immediate | short | deep-forced-line | deep-parity
    "role": "where your winning fork completes"
  },
  "window": [ { "cell":"c4r3", "status":"empty", ... }, { "cell":"c5r4", "status":"empty", ... }, ... ],
  "supportingDiscs": ["c5r4","c6r5","c7r6"]   // the discs that already exist ON the winning line
}
```

Now the model cannot mistake a 22-ply-away empty for a present threat, and will naturally
temporal-frame it. For eval-3/16 the model would *see* the window is deep-future and either hedge or
demote it. (This also exposes latent vector errors: grounding a bogus deep cell reveals it never
gets filled — precisely the check the grader failed to do by hand.)

### ④ Headline + horizon tag (engine picks the resource to lead with)

The engine marks the ONE resource to lead with and its horizon. eval-3 would headline the
**immediate** c2r1 threat, not the 28-ply diagonal. Rule of thumb: prefer the shallowest solver-real
threat that is decisive; keep the deep terminal line as *supporting* context, tagged `deep-*`.

### ⑤ The contrast (best vs played), pre-differenced

Engine states the delta explicitly: *after best* → resource preserved / outcome; *after played* →
resource denied at cell X / outcome; and whether the two resources share a cell (`tie`). This is the
plain-language form of `opponentPunishment` + `tie`.

### ⑥ Per-case "do not claim" guardrails

A tiny engine-emitted checklist, e.g.:
- *Don't call a `deep-*` horizon cell a current threat — frame it as the end of a forced line.*
- *Don't attribute a branch-invariant pattern to the played move (see the situation frame).*
- *Don't name an Allen/parity rule unless `namedRule` is present.*

Replaces the reader having to infer the absence-contract from glossary §9.

**The 607-line glossary shrinks to a short reading key** for the few codes that remain; the full
reference stays a doc, not in-context ballast. Big attention-budget win for `gpt-5.4-mini`.

### Before / after (eval-3, schematic)

```
TODAY →  "completingCell":"c4r3", "window":["c4r3","c5r4","c6r5","c7r6"], "forkCase":"B"
         model writes: "the forced double-threat fork at c4r3" — ungrounded, wrong altitude.

PROPOSED →
 SITUATION: You had a forced win; the played move only draws.
 HEADLINE (immediate): You hold a gravity-top threat at c2r1 right now (after the better move,
           every reply loses for the opponent).
 BOARDS:   <decision / after-best (c2r1 marked <Gy>) / after-played>
 RESOURCE: c2r1 — status: empty-playable-now, horizon: immediate.
 DEEPER:   A longer forced win also runs through the c4r3–c7r6 diagonal, but those squares are empty
           and ~22–28 plies away (horizon: deep-forced-line).
 DO-NOT:   Don't present the diagonal squares as present threats.
```

## 3b. Causal-links catalog (the synthetic report — review before implementing)

This is the authoritative list of every causal link the engine composes, the **conditions** under
which each fires, and — the load-bearing part — **which vector fields it removes from the prompt and
why**. Each link is a `causal frame` `{ text, confidence, covers[] }` (§3-⑥ and §6). P3 of the plan
implements **one composer + one test per link**.

### The removal principle (applies to every link)

A composed frame **removes the terse semantic *codes* it subsumes in plain language** — never
the *cells*. "Subsumes" is qualitative, not a verbatim-restatement test: once a fired frame narrates
the family's routing/label story, the underlying codes (`route`, `tag`, `*.verdict`, etc.) are
narratively redundant even when the sentence doesn't quote each one word-for-word. Specifically:

- **Covered (removed when the frame fires):** the routing/label/semantic codes — `route`, `tag`,
  `direction`, `lostResource.kind`, `opponentPunishment.kind`, `*.verdict`, `*.terminal`,
  `*.forkCase`, `tie.kind`, `tie.tied`, and `register` (restated as a horizon phrase). These are
  exactly what the sentence now says; leaving them raw duplicates and — per eval-23 — invites the
  mis-narration.
- **Always kept grounded (never covered):** the *cells* — `completingCell`, `window`, `forkCells`,
  `forkWindows`, `anchorCells`, `tie.sharedCells`, `parityAttribution.namedRule.*`, plus
  `pliesToEnd` (→ horizon magnitude) and `replyHistogram`. Cells become board glyphs; the frame
  *references* them by name.
- **Confidence gate:** a frame covers its codes **only at `confidence: high`**. At `confidence: low`
  the frame is thinner and covers almost nothing — the codes render through and the LLM reasons.
  This is the "can't be certain a-priori" fallback. **Every `covers` entry is audited by the §6
  assertion**, so a code is hidden only when a live frame names it.

### Family 1 — `route: realized_denied` (near-term, `immediate` register → high confidence)

| # | Link (trigger) | Composes (gist) | Confidence | Removes (covers) | Corpus n |
|---|---|---|---|---|---|
| L1 | **missed_own** — `direction=missed_own` (LR=`realized_pattern`, OP=`denial`; `win_to_lose`/`win_to_draw`) | "The correct move (col B) completes your {tag} at {cell}; the played move let the opponent take {denialCell}, denying it — {best}→{played}." | high | `route,tag,direction,*.kind,*.verdict,*.register,*.terminal,tie.kind` | 6 |
| L2 | **enabled_opponent, genuinely causal** — `direction=enabled_opponent` ∧ `case≠lose_to_faster_lose` (i.e. `win_to_lose`/`win_to_draw`/`draw_to_lose`) | "Your move let the opponent occupy {cell}, completing their {tag} on {window}; the better move denied it — {best}→{played}." | high | same as L1 | 2 |
| L3 | **enabled_opponent, already-losing** — `direction=enabled_opponent` ∧ `case=lose_to_faster_lose` | *(D34 hold-the-line rewrite)* "Your opponent's {plainTag} at {cell} is coming no matter what you play here — your move didn't create it. Column B makes your opponent work hardest for it; the move you played only speeds up the finish." (no-causation moved to the **guardrail**, not the player text) | high | `route,tag,direction,lostResource.kind,lostResource.verdict,lostResource.exhaustive,opponentPunishment.kind,opponentPunishment.verdict,tie.kind,gate.witness.node/devVal` | 4 |
| L4 | **defensive_miss** — `direction=defensive_miss` (LR=`denial`, OP=`realized_pattern`) | "The better move (col B) occupies {cell}, blocking the opponent's {tag} on {window}; the played move skipped it — {best}→{played}." | high | same as L1 | 4 |

> **⚠️ UPDATED by [`reason-DECISIONS.md`](./reason-DECISIONS.md) D30 (supersedes D28 sub-decision 3).**
> The L2/L3 split is now gated on the sign **`case`**, NOT on `patternOnAfterBestBoard`. **L3 fires iff
> `case=lose_to_faster_lose`** (both moves genuinely lose — the only state in which L3's "you were
> already losing" outcome sentence is true). `patternOnAfterBestBoard` is a *geometric* fact
> ("opponent threat cell present on the after-best board") and is **NOT** equivalent to "the best line
> loses" — D28 conflated the two, which flipped genuine `win_to_lose`/`draw_to_lose` cases into a false
> loss narration (eval-53 best WINS, eval-51 best DRAWS). It stays informational in `render_decision`
> and may soften L2's guardrail wording, but **never** drives the outcome sentence. The rows and the
> §3d catalog snippet below are retained as historical design context; the sign-case `when` predicates
> are authoritative. (The original eval-23 case is `lose_to_faster_lose`, so it still routes to L3.)

> **L3's shipped `covers` is a subset of the design list above.** `lostResource.exhaustive`,
> `gate.witness.node`, and `gate.witness.devVal` were dropped from L3's `covers` — they are already
> statically `exclude`d (§6) on every record, so a causal-code `covers` entry naming them would be
> redundant, not load-bearing. This is exactly what the static causal-code audit (§6) checks: every
> `covers` entry must resolve to a `causal-code` disposition, and these three never did.

> **⚠️ UPDATED by [`reason-DECISIONS.md`](./reason-DECISIONS.md) D34 (coach-voice pass, 2026-07-06).**
> Three composer-layer changes, all in `causalLinks.mjs` + `renderReasonModel.mjs`, no vector/schema
> change: **(1)** L3 and L7 no longer emit the defeatist bookends ("You were already losing" /
> "Neither move wins" / "it only loses faster") — keyed on the mover being lost (`lose_to_faster_lose`),
> they now lead with the practical-resistance / hold-the-line frame (name the better column, "toughest
> defense", "makes your opponent work hardest", keep the swindle alive). The no-causation instruction
> moved from L3's player text into its **guardrail**. **(2)** A canonical Connect Four vocabulary layer
> (`TAG_PHRASE`/`plainTag`) maps every internal tactic slug to plain theory phrasing (`double_threat` →
> "double threat (two winning squares at once)", `figure_7` → "7-shaped double threat", …) in L1/L2/L3
> so no raw slug leaks into player text. **(3)** The answerer's `mechanism` is now contracted as the
> ONLY player-facing field (2nd-person, plain C4, no field names/solver/score/"window"/"completing
> cell" — those go in `fields_relied_on`); the `assembleGroundedPrompt` JSON block was renamed
> `# Vector facts` → `# Internal evidence fields (for your reading only — do NOT name these in
> mechanism)`. The catalog texts above are updated to the D34 wording.

### Family 2 — `route: sign` (deep `forced_sequence`/`parity` → confidence varies)

| # | Link (trigger) | Composes (gist) | Confidence | Removes (covers) | Corpus n |
|---|---|---|---|---|---|
| L5 | **denied winning line** — `route=sign` ∧ LR=`winning_line` ∧ OP=`denial` | "You had a forced {win} — it resolves ~{pliesToEnd} plies out via a {fork/parity} completing at {completingCell} (discs {supportingDiscs} already on that line). The played move let the opponent take {denialCell} on it — {win}→{played}." | high (denial provable; horizon stated) | `route,*.kind,opponentPunishment.verdict,*.terminal,*.forkCase,tie.kind,tie.tied,register→horizon` | 4 |
| L6 | **two winning lines** — `route=sign` ∧ LR=`winning_line` ∧ OP=`winning_line` (`win_to_lose`) | "You had a forced win via {A} (~N plies); the played move both gives it up and lets the opponent force their own win via {B}." | high if both lines have named completing cells; else **low** | `route,*.kind,*.terminal,*.forkCase,register→horizon` | 4 |
| L7 | **swindle, both lose** — `route=sign` ∧ LR=`conditional_swindle` (`lose_to_faster_lose`) | *(D34 hold-the-line rewrite)* "Column B is your most stubborn defense: it keeps a practical swindle alive — {if oppPlies>0: if your opponent slips within about {oppPlies} moves (watch columns {devCols}), you can climb back in / else: one slip by your opponent (watch columns {devCols}) could let you climb back in}. The move you played gives that up and lets your opponent finish faster." (no "already losing"/"neither move wins") | high | `route,lostResource.kind,opponentPunishment.kind,*.verdict,register→horizon,tie.kind,tie.playedPlies,tie.swindlePlies` (gate.witness.devCols/oppPlies **restated, not dropped**) | 4 |
| L8 | **draw abandoned** — `route=sign` ∧ `case=draw_to_lose` (LR=`denial`, OP=`winning_line`) | "The position was a draw; the better move holds it by occupying {cell}. The played move abandons it and the opponent now has a forced win (~{pliesToEnd} plies, completing at {completingCell})." | high | `route,*.kind,*.verdict,*.terminal,*.forkCase,tie.kind,register→horizon` | 1 |
| L9 | **diffuse parity win** — `route=sign` ∧ LR=`winning_line` ∧ `register=parity` ∧ no single denial/shared cell | "You had a parity/zugzwang win (resolves deep, ~{pliesToEnd} plies); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. See the parity group {controllingGroup}." | **low** → thin frame | `route,*.terminal` only — keeps `register`, `parityAttribution.*`, both halves' cells | (subset of L5/L6 parity rows) |

L9 is the graceful-degradation bucket: when the causal link can't be proven, we **don't** aggressively
remove — we keep `parityAttribution`, `register`, and the cells, and let the LLM reason. This is the
concrete form of "cases we can't write an algorithm to exclude parts a-priori."

> **L7's shipped `covers` also dropped `tie.playedPlies`/`tie.swindlePlies`.** These are `render`
> counts, not causal codes — they stay grounded and are restated qualitatively in the composed
> sentence ("a slip within N plies") rather than hidden. Same static-audit reasoning as L3 above:
> a `covers` entry only belongs on a field with a `causal-code` disposition.

### Coverage check

Every corpus record maps to exactly one link (L1–L9): realized_denied → L1–L4 (16 records);
sign → L5–L9 (13 records). The `covers` lists above, unioned per record with §6's static excludes and
the transformed/rendered fields, must account for **every** present field — enforced by the coverage
assertion (§6), which throws if any *present* field is owned by nothing, and (statically, across the
whole catalog rather than per record) if any `covers` entry names a field that isn't a `causal-code`
disposition. See §6 and `reason-DECISIONS.md` D28 for why the audit is static, not per-record.

## 3c. Render-object schema

`buildReasonRenderModel(fv)` returns the intermediate object the assembler turns into prompt text:

```json
{
  "perspective": { "you": "player 2 (Gray)", "opponent": "player 1 (Green)" },
  "boards": {
    "decision":    { "ascii": "...", "tags": [ { "cell":"c4r3", "kind":"major|immediate|double|figure_7", "owner":"you|opp" } ] },
    "afterBest":   { "ascii": "...", "tags": [ ... ] },
    "afterPlayed": { "ascii": "...", "tags": [ ... ] },
    "projectedDeep": { "ascii": "...", "tags": [ ... ], "atPly": 38 }   // only for deep resources
  },
  "resource": { "completingCell": { "cell":"c4r3","status":"empty","reachableInPlies":22,"horizon":"deep-forced-line","role":"..." },
                "window": [ ... ], "supportingDiscs": ["c5r4","c6r5","c7r6"] },
  "frames": [ { "id":"L5", "confidence":"high", "text":"You had a forced win — ...", "covers":["route","lostResource.kind", ...] } ],
  "rendered": { "replyHistogram": {...}, "pliesToEnd": 28, ... },   // literal fields not covered by a frame
  "coverage": { "ok": true, "unowned": [] }                        // §6 assertion result
}
```

## 3d. One declarative catalog, three consumers (auditability requirement)

The L1–L9 catalog (§3b) **must be a single declarative data module** — `reason_engine/causalLinks.mjs`
— not logic scattered across composers. This is a hard requirement: the rules "look good now but there
may be mistakes," so there must be **one place to read, audit, and edit them**, and every consumer must
derive its behavior from that one place. The module exports:

```js
export const CAUSAL_LINKS = [
  { id:'L3', family:'realized_denied',
    // D30: gated on the sign case ONLY — NOT ctx.patternOnAfterBestBoard (supersedes D28 sub-decision 3).
    when: (fv) => fv.route==='realized_denied' && fv.direction==='enabled_opponent'
                       && fv.case==='lose_to_faster_lose',
    confidence:'high',
    covers:['route','tag','direction','lostResource.kind','lostResource.verdict', /* … */],
    guardrail:'must NOT claim the played move caused/enabled the pattern',
    template:(fv,ctx)=>`You were already losing. The opponent's ${fv.opponentPunishment.tag} …`,
    corpusNote:'4 records; figure_7 variant is rare (PROVISIONAL in the sampler)' },
  // … L1, L2, L4–L9
];
export function classifyCausalLink(fv, ctx) { /* first matching `when`, else throw */ }
```

`classifyCausalLink` is the **single decision procedure** for which link a record is. Three consumers
import it and the catalog — and nothing re-implements the rules:

1. **Composer / render** — `classifyCausalLink` → pick the entry → `template()` for the text,
   `covers` for what to remove.
2. **Grader (`grade-fv-sufficiency`)** — receives `linkId` + the catalog entry per record and runs a
   **per-link rubric** on top of A1–A4: (a) the answer honored the entry's `guardrail` (e.g. L3 → no
   causal claim — the eval-23 check, now mechanical); (b) the `covers` fields were genuinely *not
   needed* (over-removal audit — if the answer was degraded for lack of a covered field, that field
   should not have been covered); (c) `confidence:'low'` links (L9) are **hedged, not fabricated**.
   This is how "the grader knows about these rules."
3. **Sampler (`select_boards.mjs`)** — `classifyCausalLink` emits a `link_<id>` predicate into the
   coverage universe, so **each rule is a coverage target** and provably exercised. The existing
   `REASON_UNIVERSE` already covers the axes behind L1/L4–L8; add `link_<id>` predicates and the two
   **new distinctions** this design introduces:
   - **branch-invariance** (`rd_*_enabled_opponent` split into L2 genuinely-causal vs L3
     branch-invariant), and
   - **diffuse-vs-clean parity** (L9 vs L5/L6-parity: presence of a single shared/denial cell).
   Keep the `discovered ⊆ universe` guard. **Rarity caveat:** L3-figure_7, L9, `lost_fork_B` are
   `PROVISIONAL` (rare in self-play) — to *guarantee* they are evaluated, the sampler needs a
   **targeted harvest** for those links (directed search / higher budget), not only the diversity
   sweep. (Never hand-build boards — use `playGame` with a property filter; see memory
   `feedback_reproduce_fv_case_from_coverage`, `feedback_no_random_boards`.)

**Auditability guarantee:** to change a rule, edit one entry in `causalLinks.mjs`; the composer,
grader rubric, coverage universe, and the §6 completeness assertion all re-derive from it. A mistake
in a rule is fixed in exactly one place, and the grader + coverage test surface its effects.

## 3e. Selection decisions are catalog-driven, sampler-covered, grader-aware (general principle)

Any render decision that **selects or prunes what the model sees** — not only causal-frame `covers` —
is a first-class contract, never a silent local choice. Each such decision MUST be:

1. **One declared rule** (single source of truth), the way `causalLinks.mjs` is for L1–L9.
2. **A sampler coverage dimension** — `select_boards.mjs` adds a predicate for each variant the rule
   can produce, so every branch is exercised by real harvested boards (and, being rare-aware, gets a
   targeted harvest if self-play doesn't reach it).
3. **Grader-aware** — `grade-fv-sufficiency` receives the rule's output (what was included/excluded
   and *why*) and audits it: did an omission/removal cost the answer? (the over-omission / over-removal
   audit).

Instances of the pattern:
- **Causal-frame `covers`** (§3b/§3d) — which semantic codes are hidden.
- **Board selection** (below) — which boards reach the model.
- Any future selection/pruning decision inherits the same three-consumer treatment by default.

### Board selection (P2 rule; consumers in P4) — Option A, operationalized

`selectBoards(fv, tags) -> [{ board, reason }]` — reuses the P2 tagger's curated tag-set (the same
tags that drive the board glyphs), so "carries signal" means "changes the tactical picture":

- **decision** — always (the position under judgment).
- **after-best** — included iff its curated tag-set differs from the decision board's; omitted if
  identical (an unchanged board teaches nothing).
- **after-played** — included iff its curated tag-set differs from the decision board's.
- **projected-deep** — included iff the resource is deep (`register ∈ {forced_sequence, parity}`),
  rendering the fork/parity completion so a deep win is shown as deep.

Consumer wiring (P4, alongside the causal-link consumers):
- **Sampler predicates:** `board_afterbest_{shown,omitted}`, `board_afterplayed_{shown,omitted}`,
  `board_projecteddeep_{shown,absent}` — so the corpus contains both boards where after-best is
  redundant (omitted) and boards where it carries signal (shown), and both render paths are graded.
- **Grader:** told which boards were rendered and each `reason`; runs an over-omission audit — if an
  answer needed a board `selectBoards` dropped, that omission rule is wrong.

**Phase-4 sampler task — a board set that MAXIMIZES coverage of the feature-vector × prompt-decision
space, with a runnable coverage test (consolidating §3d item 3).** This is a first-class P4 deliverable,
not just "add a few predicates." `select_boards.mjs` must produce a board set that **maximizes coverage
of the joint universe** below, and P4 must ship a **coverage test that runs after Phase 4 completes** and
asserts (or reports the gaps in) that coverage.

- **The joint coverage universe** = (A) every **feature-vector field** the narrator vector can carry
  (each leaf path the render pipeline can present — cells, halves' `kind`/`register`/`terminal`/`tag`,
  `tie.*`, `gate.witness.*`, `parityAttribution.*`, `replyHistogram`, `pliesToEnd`, …) **×** (B) every
  **prompt decision variant** the render layer can make:
  - the fired **causal link** — one `link_<id>` predicate for each of L1–L9;
  - the **branch-invariance branch** — `enabled_causal` (L2) vs `enabled_branch_invariant` (L3), made a
    first-class axis (the L2-vs-L3 distinction turns on `patternOnAfterBestBoard`, not `direction`; D28);
  - **board selection** — `board_afterbest_{shown,omitted}`, `board_afterplayed_{shown,omitted}`,
    `board_projecteddeep_{shown,absent}` (both render paths of every board decision);
  - **covers-gating** — for each link, at least one record where its `covers` actually hides a present
    causal-code (so the covered-vs-rendered-vs-excluded partition is exercised, not just theoretical);
  - **horizon / register** — `immediate` / `forced_sequence` (deep-forced-line) / `parity` (deep-parity);
  - **case × route × direction** — every reachable combination (the D20 router + the sign taxonomy).
- **Maximize, don't just sample.** Keep the upfront-named closed `REASON_UNIVERSE` + the
  `discovered ⊆ REASON_UNIVERSE` guard (D22); `satisfied()` = every REQUIRED predicate met. Rare
  predicates that self-play won't reach get a **targeted harvest** (directed search / higher budget,
  never hand-built boards — `playGame` with a property filter; `feedback_no_random_boards`): the
  flip-case (`win_to_lose`/`draw_to_lose` + `enabled_opponent` + pattern-present-on-after-best, absent
  from the frozen 29-record corpus per D28's I12 note), plus L3-figure_7, L9, `lost_fork_B`.
- **The coverage test (the acceptance artifact, runnable after P4):** load the board set
  `select_boards.mjs` produced, run each board through the render pipeline (`toNarratorVector` →
  `buildReasonRenderModel`/condition-D prompt), collect the predicates each record hits, and assert
  **every REQUIRED predicate in the joint universe is covered ≥1** (fail listing the uncovered
  predicates; PROVISIONAL/rare ones reported, non-blocking). This makes "the board set exercises every
  feature-vector field and every prompt decision" a checkable claim, so Phase 4 can be validated
  end-to-end against it.

## 3f. Grader rubric additions for condition D (P4) — consolidated

The grader is the `grade-fv-sufficiency` skill (`.claude/skills/grade-fv-sufficiency/SKILL.md`). Today
it grades condition A (glossary + JSON dump) on axes A1–A4. It is **not yet modified** — every item
below is a P4 requirement, consolidated here so nothing raised during design is lost. The grader is a
consumer of the same catalog as the composer and sampler (§3e), and its rubric must gain:

- **G1 — Format-aware grading (from the board-format decision, §7.10).** Grade against the *grounded*
  presentation the model actually saw: the clean board(s), the plain-language threat list, and the
  causal-frame text — NOT the old glossary+JSON. Verify each concrete claim against the rendered
  boards/threat-list as shown.
- **G2 — Per-link rubric (from "the grader must know these rules", §3d).** For the fired link L1–L9:
  (a) its `guardrail` was honored (e.g. L3 → the answer makes no "your move caused/enabled it" claim —
  the mechanical eval-23 check); (b) over-removal audit — a `covers`-hidden code the answer actually
  needed = the removal was wrong; (c) low-confidence links (L9) must hedge, not fabricate a crisp cause.
- **G3 — Board-selection audit (from "the grader must be aware of it", §3e).** The grader is told which
  boards `selectBoards` rendered and each `reason`; over-omission audit — if the answer needed a board
  that was dropped, the selection rule is wrong.
- **G4 — Engine-line grounding (from the eval-1/16 mis-grade lesson, §2).** Verify cells against the
  engine's OWN winning line (`finalMovestring`), never an alternate solver PV — the bug that produced
  the false convictions in the P1 grading run.
- **G5 — Threat-list fidelity (from the board-format decision, §7.10).** The rendered threat list is
  now part of the artifact under test; the grader must check each listed tactic is board-true on its
  stated board. A wrong threat-list entry is a render bug the grader must catch, not narrate around.

These are wired in P4 alongside the sampler's `link_<id>` / `board_*` predicates, all reading the one
catalog (§3e principle).

### The per-case render-decision record the grader consumes (so it can determine WHAT HAPPENED, not re-derive it)

To grade a condition-D case the grader must be able to reconstruct **every decision the render layer
made** for that case. It must **not** re-derive that routing itself (re-running `classifyCausalLink`,
recomputing branch-invariance, re-selecting boards inside the grader risks the exact drift the single
catalog exists to prevent, and the eval-1/16/3 PV-mismatch shows re-derivation is where graders go
wrong). Instead, **the P4 render/compute pipeline MUST persist a per-record `render_decision` object**
(emitted from `buildReasonRenderModel` into the answers/vectors jsonl, next to `feature_vector`), and
the grader consumes it as ground truth. It carries the complete decision set:

- **`case`** (sign taxonomy → the outcome pair) and **`route`** (`realized_denied` via the D20 tag-first
  router, vs `sign`) and, for realized_denied, **`direction`** (`missed_own`/`enabled_opponent`/`defensive_miss`).
- **`patternOnAfterBestBoard`** — the branch-invariance value (D28), now **informational only** (D30).
  It NO LONGER drives L2 vs L3 — that turns on the sign `case` (`case=lose_to_faster_lose` → L3, else
  L2). The grader keeps it as context, but must not treat it as the routing cause.
- **The fired link:** `linkId` (L1–L9) + `confidence` + `covers[]` + `guardrail` + the composed `text`
  (verbatim, as the model saw it).
- **Board selection:** which of decision / after-best / after-played / projected-deep were rendered,
  each with its `reason` and shown/omitted flag.
- **Resource grounding:** `completingCell` `status`/`horizon`/`reachableInPlies`, and the
  `register → horizon` mapping used.
- **The field partition:** which vector fields were **rendered**, which were **covered** (hidden by the
  fired frame), and which were **statically excluded** — so the grader knows exactly what the model saw.
- **`finalMovestring`** — the engine's own winning line, for cell grounding (G4).

- **G6 — L2/L3 routing audit.** Given `case` + the fired `linkId`, the grader audits BOTH (a) that the
  answer honored the fired link's guardrail (L3 → no causal claim, no "you were already losing" on a
  win/draw case), AND (b) that the routing itself matches the sign case — **L3 iff
  `case=lose_to_faster_lose`** (D30). A link whose outcome sentence contradicts `case` (e.g. L3 on a
  `win_to_lose`/`draw_to_lose` board — the eval-51/eval-53 misroute) is a **render bug, attributable to
  the pipeline**, never a model failure. (Pre-D30 this audit keyed on `patternOnAfterBestBoard`; that
  geometric flag is now informational only.)

**The grader must read the decision docs, because "what a case is" is DEFINED there, not in this file.**
Before grading condition D, `grade-fv-sufficiency` must consult `reason-case-taxonomy.md` (the sign
cases), `reason-DECISIONS.md` — especially **D20** (the tag-first realized/denied router that produces
`route`/`direction`) and **D28** (the covers audit is a static causal-code check; a covered-but-absent
field is normal, not `missing_info`) — and `causalLinks.mjs` (the L1–L9 semantics, the single source of
truth for what each link asserts). Grading a case against a re-imagined notion of its meaning is the
same class of error as grading against an alternate PV (G4).

- **Phase-4 task: review all code from specs Phase 1–3 and update `grade-fv-sufficiency`** to
  (a) fix "trace the solver PV" → "trace the engine's own `finalMovestring`" (the eval-1/16/3
  mis-grade bug, §2/G4); (b) grade condition D against the grounded artifact (boards + composed
  sentences + guardrails + reading key), reading `causalLinks.mjs` as the source of truth for the
  per-link rubric (G2); (c) treat a covered code's absence as intended (not `missing_info`) and a
  needed-but-covered field as over-removal — i.e. the grader must know that the covers audit changed
  meaning (§6, D28) from "must this field be present" to "does every `covers` entry resolve to a
  causal code," so a covered-but-absent field is normal, not a defect; (d) apply the L3 no-causation
  guardrail check and the deep-horizon mechanical checks (register→horizon consistency).

## 4. Why this specifically helps `gpt-5.4-mini`

Every change trades reasoning small models are bad at (board simulation, line-walking, code
decoding, prioritization) for reading pre-digested structure they are good at. The residual LLM job
is *narrate already-grounded, pre-prioritized facts in fluent prose.*

## 5. Scope, risks, rollout

- **Render only.** Does not touch what `computeReason` stores (INVARIANT: soundness first). All new
  fields (`status`, `horizon`, `reachableInPlies`, headline, frames) are computed in the render/prompt
  layer from evidence the engine already has (`line`, `finalMovestring`, board).
- **Cost.** Grounding cells + pre-rendering boards is more work per record — accepted under the
  FV-grounding "correctness over speed" premise.
- **Grader parity.** The same grounded objects should feed `grade-fv-sufficiency` so the oracle
  checks cells against the engine's own line (would have prevented the eval-1/16 mis-grades).
- **Measurement.** The `--condition A|B|C` ablation harness already exists. Add the grounded prompt
  as a new condition (e.g. `D`) and compare A vs D on the same frozen set; success = eval-3 no longer
  presents the deep fork as near-term and eval-23 stops asserting causation, with no regression on the
  27 passes.

### Phased rollout (each independently shippable + measurable)

- **P1 — foundation (fully specified, near-zero risk).** `causalLinks.mjs` catalog module +
  `classifyCausalLink` (data + classifier, no rich composers yet) · field-disposition registry +
  covers-aware coverage assertion (§6) · faithful structured render (sections, boards not yet tagged,
  frames = trivial passthrough) · `--condition D` wiring · corpus coverage test (zero uncovered fields).
  Ships the completeness guardrail and the single source of truth.
- **P2 — grounding.** Board tagger (`tagBoard`, reusing `classifier.js`/`shapeDescriptor.js`) + grounded
  cells (`status`/`horizon`/`reachableInPlies`) + projected deep board. Boards now uniform-tagged.
- **P3 — causal frames.** Implement one composer + one test per link L1–L9 (text + `covers` + guardrail),
  incl. the L2-vs-L3 branch-invariance computation. The eval-3/eval-23 fixes land here.
- **P4 — grader + sampler integration. IMPLEMENTED (see D29).** A persisted per-record
  `render_decision` (`buildRenderDecision`, condition-D lines only) is the grader's ground truth —
  `grade-fv-sufficiency` grades condition D via G1–G6 (format-aware grading, per-link rubric,
  board-selection audit, engine-line grounding via `finalMovestring` not an alternate solver PV,
  threat-list fidelity, branch-invariance provenance) consuming that record directly, never
  re-deriving routing. `select_boards.mjs --strategy coverage` + the coverage test share one
  `renderUniverse.mjs` spanning `link_L1`–`link_L9`, the branch-invariance split, `board_*`,
  covers-exercised, horizon, and `case × route × direction`, with a bounded directed rare-fill. A
  freshly regenerated 32-board coverage set is committed with precomputed evidence
  (`renderCoverageUniverse.test.mjs`, solver-free, 35/35 `RENDER_REQUIRED` predicates); the frozen 29
  is retained as the ablation input + P1–P3 regression anchor. The flip-case (D28 I12) gap is
  CLOSED — reachable-but-rare, confirmed via two harvested boards (`reason-flip-case-investigation.md`).

**Acceptance:** corpus coverage test green (no field silently dropped) · condition-D vs A on the frozen
set: eval-3/eval-23 fixed, no regression on the 27 passes · every L1–L9 link has ≥1 board in the
coverage set and a green per-link grader rubric.

## 6. Completeness invariant — the implementation MUST be defensive (mandatory)

> **Implementer: read this as a hard requirement, not advice.** The narrator vector is a large,
> nested, *evolving* dictionary. The failure mode this section prevents is **silent loss**: a
> `<key, value>` pair (especially a field a future engine change adds) that never reaches the model
> and never trips an error, so a whole class of blunder quietly loses its reason. The staged prompt
> (§3) makes this *more* likely than today's raw `JSON.stringify`, because each field is now routed
> by hand into a section. You must make silent loss **impossible by construction**, not "careful."

Implement the following, in this spirit of defensive programming (fail loud, fail early, no
implicit drop):

1. **Explicit field-disposition registry (single source of truth).** Every field path that can
   appear in the narrator vector has exactly one *base* disposition:
   - `render:<section>` — surfaced to the model (literally, or transformed — e.g. `movestring`,
     `finalMovestring`, `line` → the rendered board; `window[].cell` → a status-tagged board glyph).
     Record *how*.
   - `causal-covers` — *conditionally* removed: withheld **only** when a live causal frame (§3b) lists
     the path in its `covers[]`. When no confident frame fires, the field falls back to `render`.
     This is the disposition for the semantic *codes* (`route`, `tag`, `direction`, `*.kind`,
     `*.verdict`, `register`, `*.terminal`, `*.forkCase`, `tie.kind`, `tie.tied`, `gate.witness.*`).
   - `exclude:<reason>` — *statically* withheld from every prompt, with a one-line reason. This is the
     confirmed A + C1 list from the brainstorm: `notABlunder`, `discs`, `*.exhaustive`,
     `*.tacticFromDiff`, `*.nameable`, `*.parityNamingDeferred`, `gate.ran`, `gate.nodesVisited`,
     `gate.witness.node`, `gate.witness.devVal` (plumbing / diagnostics / control flags), on top of the
     score/samples family already scrubbed upstream by `toNarratorVector`. An exclusion without a
     reason is a bug.
   Mirror the discipline of `toNarratorVector`'s `isNarratorHidden` scrub-list — this is its
   render-side counterpart (see memory: a NEW score-family field leaks unless added to
   `isNarratorHidden`; here a NEW field is *lost* unless added to the registry).

2. **Coverage assertion that walks the ACTUAL vector and fails loud.** At render time (at minimum in
   dev/eval; ideally always), enumerate every leaf path present in the pruned vector for this record
   and assert each is in the registry. **Any unregistered path throws** (e.g.
   `UncoveredVectorFieldError: opponentPunishment.newThing`). Do not warn-and-continue; do not
   coerce to a default. The whole point is that adding a field to the engine *forces* a conscious
   decision (render it or exclude-with-reason) before the pipeline will run.
   - Arrays of objects (`window`, `line`, `forkWindows`) assert on the *element shape* (leaf paths of
     the first/representative element), not per-index, so N cells don't need N registrations.
   - Distinguish **absent-by-pruning** (empty/`null` dropped per the glossary contract — legitimate,
     no action) from **present-but-unhandled** (a non-empty value with no registry entry — the error
     case). Coverage is checked over paths that are actually present after pruning, plus the known
     schema, so pruning never masks a missing registration.
   - **Covers audit — a static causal-code check, not a per-record presence check.** A `causal-covers`
     field counts as owned **only if a live frame actually names it** in `covers[]`. If such a field is
     present but *no* firing frame covers it, it must fall back to `render` (not silently vanish). The
     audit on the `covers[]` side is **static**: every entry across the whole catalog must resolve to a
     field with `causal-code` disposition — a `render`/`exclude`/typo entry throws. It is **not** a
     per-record "this record must have this field present" throw — that was tried and found infeasible,
     because `covers` lists are family-wide supersets shared by every link in a family
     (`CODES_SIGN`/`CODES_REALIZED`), so every link legitimately names codes absent from many individual
     records (verified across all 29 corpus records; see `reason-DECISIONS.md` D28). This is what makes
     confidence-gated removal auditable rather than lossy, without over-constraining to one record's shape.

3. **Registry-completeness test over the frozen corpus.** A test runs the renderer across the frozen
   `boards_coverage_*.jsonl` set and asserts **zero** `UncoveredVectorField` errors across all
   records and all five cases. This is the regression guard: when the engine grows a field, this test
   goes red until the registry is updated — exactly the tripwire we want. (Pair it with a check that
   every `render:*` disposition actually appears in a rendered section for at least one corpus record,
   so dead registrations are caught too.)

4. **Belt-and-suspenders fallback (optional but recommended).** After building the staged prompt,
   append a compact **"other vector fields (unformatted)"** appendix containing any registered
   `render` field not already placed by a section, dumped as `key: value`. This guarantees the
   *information* survives even if a section's formatting logic misses it — the coverage assertion
   guarantees *nothing is unregistered*, and the appendix guarantees *nothing registered-to-render is
   dropped in practice*. The two together make "a field silently vanished" unreachable.

Net guarantee to hold and to state in the code: **for every record, every present vector field is
either (a) rendered into a section, (b) carried in the render appendix, (c) covered by a live causal
frame that names it, or (d) statically excluded by a registry entry that names a reason — and any
field matching none of these halts the run.**

## 7. Settled decisions (brainstorm 2026-07-02)

1. **Headline / altitude → horizon-honest, vector-faithful.** No manufactured immediacy; deep wins
   framed explicitly as deep (register→horizon). The eval-3 decision board genuinely has no immediate
   threat, so there is nothing to headline — surfacing one would be fabrication.
2. **Board tagging → uniform curated tags** (immediate / major / double / figure-7) on all rendered
   boards; no scores / minors / move-numbers / parity. Reuses `classifier.js` / `shapeDescriptor.js`
   detectors. Parity-per-column deferred.
3. **Composition → hybrid (engine pre-composes the dangerous sentences) via confidence-gated causal
   frames** (§3b). High-confidence frames subsume-and-focus (cover their codes); low-confidence frames
   defer to the LLM.
4. **Systematic field removal → A (upstream scores/samples) + C1 (plumbing/diagnostics) only.** All
   C2 fields retained (`gate.witness.devCols/oppPlies` causal-frame-covered; `boardState`/`entryCell`/
   `ownDiscs` kept as low-priority render).

### P2 decisions (decision pass 2026-07-02, post-P1)
5. **General principle (§3e): every render selection/pruning decision is catalog-driven +
   sampler-covered + grader-aware.** Board selection is the second instance after causal-frame covers.
6. **Board selection → Option A (only signal-carrying boards).** `selectBoards` rule in §3e; decision
   always, after-best/after-played only when their tag-set differs, projected-deep when `register` is
   forced_sequence/parity. Sampler + grader wiring per §3e (P4).
7. **`reachableInPlies` → derived from `finalMovestring`** (present 29/29), replaying to the cell's
   fill-ply; the sparse `line` (≈7/29) is a cross-check only.
8. **`horizon` enum → `immediate | deep-forced-line | deep-parity`,** mapped from `register`; no
   "short" tier (corpus is bimodal); magnitude carried by `pliesToEnd`.
9. **Array-traversal fix (required P2):** `renderedFields` recurses into array *elements* and
   classifies per element-leaf (mirroring `leafPaths`), so a `transformed`/`exclude` subfield of a
   grounded cell object (once `window` becomes `[{cell,status,…}]`) is dropped, not kept wholesale.
10. **Tag presentation → (i) clean board + explicit plain-language threat list.** Discs only on the
    ASCII grid (`A`/`B` with the you/opponent mapping stated); tactics listed beneath as sentences
    (each = a grounded-cell object rendered as prose). No glyph legend. This is also a grader-rubric
    input (see §3f G1/G5). Revisit only if the eval shows it hurts.

## 8. Open questions

1. **RESOLVED (P2 decision 7, §7).** **`reachableInPlies` source** — read off the stored `line`
   length to the cell, or recomputed? Answer: derived from `finalMovestring` (present 29/29),
   replaying to the cell's fill-ply; the sparse `line` (≈7/29) is a cross-check only. (Left open here
   at P1 write-up time; already answered by the time P2 shipped — noted resolved during P4 docs pass.)
2. **RESOLVED (P3).** **Glossary residue** — which codes still need a short reading key once
   frames/guardrails are inlined. Answer: the 607-line glossary shrinks to a short reading key for the
   residual uncovered/low-confidence codes; see §3-⑥/§3d and the P3 design doc
   (`docs/superpowers/specs/2026-07-03-grounded-render-prompt-phase3-design.md`).
3. **RESOLVED (P3).** **L2-vs-L3 branch-invariance check** — the exact predicate (pattern present on
   the after-best board) and where it's computed in the render model. Answer: computed at render time
   via `patternOnAfterBestBoard`, reusing the P2 `tagBoard` on the after-best board — never read off
   `direction`. See §3b Family 1 (L2/L3 rows), `causalLinks.mjs`, and `reason-DECISIONS.md` D28.
4. **Two latent-error audit** — re-verify the *passing* parity/`finalMovestring` cases (eval-2, 8,
   9, 11, 13, 15) the same way, since the grader's PV-mismatch bug could have produced false passes
   too (lower risk, but unaudited).

## 9. Opening-phase boards — the additive opening frame (D33, shipped 2026-07-05)

Opening-phase decisions carry `openingContext` (`namedOpening` / `defense` / `centrality`; see D31/D32).
The condition-D render layer handles them as an **additive** frame, not a new causal-link family — the
opening is the teachable reason; the deep two halves demote to a horizon.

- **Composer:** `reason_engine/openingFrame.mjs` → `composeOpeningFrame(prunedFv)` returns the primary
  frame `O1` (namedOpening) / `O2` (defense, no "lost" doom framing) / `O3` (centrality) = lead +
  landing-cell centrality/parity clause + horizon tail. `classifyCausalLink` (L1–L9) still runs to feed
  `render_decision` outcome scaffolding + horizon `register`/`pliesToEnd`, but its text is **not
  rendered**; the opening frame is `frames[0]` and the only rendered frame. `selectBoards` → decision
  board only (no after-best/after-played/projectedDeep).
- **Horizon demotion (no crisp deep cell):** the opening branch of `buildReasonRenderModel` wraps its
  residue in `pruneOpeningResidue`, reducing `lostResource`/`opponentPunishment` to `{register,
  pliesToEnd}`. This prevents a 30–40-ply `completingCell`/window from leaking into the "Vector facts"
  block — which would both violate the "no deep cell in the opening prompt" contract and cause the
  grader's `deepResourceGrounded:false` to false-fail an answer that grounds it. Non-opening residue is
  unchanged (plain `renderedFields`). Engine output is unchanged (render-only; I0).
- **Centrality has two independent notions:** `O3`'s lead is the engine geometry statement
  (`openingContext.centrality.text` + `betterHasMoreLines:true`) — always valid, NOT gated. The
  landing-cell clause is gated on `centralityQualitative` (heatmap mass ratio; `null` ⇒ no clause). The
  grader's qualitative direction check applies to the landing-cell clause only.
- **Winning-cell heatmap:** `reason_engine/data/winning-cell-heatmap.json` (27,976 self-play games,
  90/10 policy) is hardcoded config, used internally by the composer to pick qualitative words
  ("much easier" / "easier" / omit) — never a number in prose. `heatmap[player][row][col]`, row 0 =
  bottom.
- **`fieldDisposition`:** every `openingContext.*` leaf is registered — full-path checks run BEFORE the
  leaf-name fallbacks (else `bestCol`/`playedCol`/`text` collide). Columns (`bookNextCol`,
  `bestDefenseCol`) are `transformed` (1-indexed in the frame, raw withheld — Fix-A); names/flags render.
- **`render_decision.openingContext`** `{kind, frameId, lead:{id,family,matchedPrefixLen,bookCol,holdCol},
  centralityComparison:{player,betterCell,playedCell,qualitative}, parityFavor, deepResourceGrounded:false,
  horizon}` is the grader ground truth (previously there was NONE for opening boards). `grade-fv-sufficiency`
  was updated to consume it.

## 10. Inline highlight/term annotation tags (shipped 2026-07-06)

Condition-D coach output can carry inline `[zone:handle]…[/zone:handle]` board-highlight tags and
`[term:slug]…[/term:slug]` KB-popup tags in `mechanism`. Single source of truth:
`reason_engine/zoneAnnotations.mjs`. This is an **output-format axis on existing cases** — no new
reason-case and no new harvested board; only `renderUniverse.mjs`'s predicate set grew.

- **Offer (`buildAnnotationOffer(prunedFv, boardDecisions)` → `{aliases, zoneAliasMap, terms}`):**
  derives the *offered* handle set from the near-term board tags + the two move columns. `alias =
  {handle, spec, role, truthBoard, kbId}`; `spec` is a 1-indexed `zoneParser` spec (`colN` / `cNrM` /
  `windows:…`). Both `buildReasonRenderModel` (prompt) and `buildRenderDecision` (ground truth) call it
  with the SAME args, so the set the LLM sees == the set the grader trusts.
- **Structural-only highlights:** only board-true `getMajorThreatCells` tag kinds
  (`immediate`/`major`/`double`) become aliases; the vector-named *overlay* kinds
  (`figure_7`/`double_threat`, injected onto the decision board by `reasonBoardSelect.mjs`) are EXCLUDED
  (they often complete deep → highlighting the empty cell is the present-threat illusion). `truthBoard` =
  first near-term board a tag is board-true on. The projected-deep board is ignored.
- **Terms are independent of zones:** term vocab is restricted to the four KB-backed slugs
  (`immediate_threat`/`double_threat`/`figure_7`/`claimeven`); `figure_7` CAN fire as a term (via the
  two halves' `tag`) even though its overlay tag is not an alias. `conditional_swindle` is NOT a term
  (no KB entry → empty popup). `canonicalPhrase` is imported from `causalLinks.mjs` `TAG_PHRASE` (no
  local copy).
- **Prompt:** `assembleGroundedPrompt` emits `# Highlightable regions` (handles + roles + truthBoard) +
  `# KB terms you may name` (slugs + canonical phrase + gloss) + a no-overlap instruction, immediately
  BEFORE `# Internal evidence fields`. Empty lists fall back to prose (never `null`/`undefined` in the
  prose half). The LLM only ever writes offered handles/slugs, never a raw `cNrM`. The instruction
  requires a paired open+close for every tag (`[zone:<handle>]phrase[/zone:<handle>]`, never a bare
  handle used as a noun), with an explicit bad/good example (D35, 2026-07-06) — added after a grading
  run showed the model sometimes emitting an unclosed opener.
- **Post-LLM (`compute.mjs` `postprocessAnswer(answer, render_decision)`, condition-D only):**
  `processAnnotations` normalizes mismatched close tags, drops any unoffered handle/slug (keeping the
  inner words), **bare-strips any tag still unclosed after normalization** (D35: `stripUnclosedTags`,
  LIFO stack-paired — deletes just the token, no canonical-phrase substitution, reported via a
  `repairs: string[]` field e.g. `["unclosed_tag:term:immediate_threat"]`), expands offered zone
  handles → real specs, and re-derives `key_cells` from the expanded specs. `postprocessAnswer` returns
  `{ answer, repairs }` (not a bare `answer`); `compute.mjs` surfaces `repairs` on the eval output line
  as `annotationRepairs`, and `grade-fv-sufficiency` treats a non-empty `annotationRepairs` as an
  automatic G7 fail (`prompt_confusion`) — see `.claude/skills/grade-fv-sufficiency/SKILL.md` G7c.
  **GOTCHA — the bare-strip only handles unmatched OPENERS, not unmatched CLOSERS:** a stray
  `[/term:x]` with no matching opener is not detected or reported (deferred as a low-incidence gap;
  all observed failures were bare openers). **GOTCHA — condition-D `answer.key_cells` are now
  display-overlay cells, not per-cell threat claims:** a `[zone:better-col]` expands to a whole 6-cell
  column; a fork window to its cells. The grader's A3/A4 carry a condition-D carve-out so an empty
  highlighted-column/window cell is NOT graded as fabrication (zone offered/board-truth fidelity is
  G7/G5). `key_cells` is overwritten ONLY when the model actually emitted ≥1 zone (transition safety);
  A/B/C are untouched (null `render_decision`).
- **Guardrail assembly (D35, 2026-07-06):** `assembleGroundedPrompt`'s `Guardrail:` line is
  `combinedGuardrail(model)`, NOT a bare `model.link.guardrail` — it appends `model.frames[0].guardrail`
  too when that differs from `model.link.guardrail` (opening records only; for non-opening records the
  two are already identical, so no duplication). This fixed a bug where the opening frame's own
  guardrail (e.g. `openingFrame.mjs`'s `GUARDRAIL`) was silently dropped from the prompt. `GUARDRAIL`
  gained a conditional clause (`GUARDRAIL_NO_CENTRALITY`, appended when `centralityQualitative(fv)` is
  null) forbidding an invented centrality/difficulty claim; `causalLinks.mjs`'s L3/L7 `guardrail` fields
  (not `template`) gained an explicit banned-defeatist-phrase clause ("ends poorly", "goes against
  you", etc.).
- **`render_decision.zones`** `{aliases:[{handle,spec,role,truthBoard,kbId}], terms:[{slug,kbId,
  canonicalPhrase,description}]}` (the `zoneAliasMap` is prompt-only, omitted from the record). Grader
  axis **G7** (annotation fidelity): G7a zones delegate spec board-truth to **G5** checked on the
  alias's `truthBoard`; G7b terms. A5 strips `[zone:]`/`[term:]` markup before coach-voice checks.
- **Coverage:** `renderDecisionPredicates` emits `zone_speckind_{cell,window,col}` / `term_emitted` /
  `zones_no_tactical` from `render_decision.zones`; `zone_speckind_window` + `zones_no_tactical` are
  PROVISIONAL (rare in self-play). Closed-registry invariant intact.
- **Not wired to production:** this makes the grounded path *capable*; `explainContext.js` /
  `annotationGate.js` production zone code is untouched (a later deletion pass, once the grounded path
  serves a live endpoint).
- **TODO(production-wiring) — `deep_reveal_failures` logging for repaired tags.** `processAnnotations`
  returns a `repairs: string[]` array (e.g. `["unclosed_tag:term:immediate_threat"]`) whenever it had
  to bare-strip a tag the model left unclosed — see `zoneAnnotations.mjs`. This is NOT a user-facing
  error (the shipped text is already clean) but IS an internal defect worth logging. `processAnnotations`
  stays pure (no DB call); whoever wires the production endpoint that eventually replaces
  `/explain-move-llm` with condition-D must, when `repairs.length > 0`, insert a row into the existing
  `deep_reveal_failures` table (no schema change) shaped like:
  `{ position_hash, movestring, col, endpoint: '<the new endpoint name>', llm_prompt: <the assembled prompt>,
  raw_llm_output: <answer.mechanism BEFORE processAnnotations ran>, failure_reason: JSON.stringify(repairs),
  created_at: new Date().toISOString() }` — the same shape/convention `server/index.js` (~line 1085)
  already uses for `P5strong:*` validation failures.
