# Grounded-Render Prompt — presenting the reason vector to the LLM

**Status:** proposal (design doc). Not yet implemented.
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

A composed frame **removes only the terse semantic *codes* it restates in plain language** — never
the *cells*. Specifically:

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
| L2 | **enabled_opponent, genuinely causal** — `direction=enabled_opponent` ∧ `case∈{win_to_lose,draw_to_lose}` ∧ **pattern NOT on the after-best board** | "Your move let the opponent occupy {cell}, completing their {tag} on {window}; the better move denied it — {best}→{played}." | high | same as L1 | 2 |
| L3 | **enabled_opponent, branch-invariant / already-losing** — `direction=enabled_opponent` ∧ (`case=lose_to_faster_lose` ∨ pattern present on the after-best board) ← **eval-23 fix** | "You were already losing. The opponent's {tag} at {cell} exists no matter what you play here — your move does NOT create it, it only loses faster ({afterPlayed} vs {afterBest} punishing replies). **Do not say your move caused/enabled it.**" | high | `route,tag,direction,lostResource.kind,lostResource.verdict,lostResource.exhaustive,opponentPunishment.kind,opponentPunishment.verdict,tie.kind,gate.witness.node/devVal` | 4 |
| L4 | **defensive_miss** — `direction=defensive_miss` (LR=`denial`, OP=`realized_pattern`) | "The better move (col B) occupies {cell}, blocking the opponent's {tag} on {window}; the played move skipped it — {best}→{played}." | high | same as L1 | 4 |

> **The branch-invariance check (L2 vs L3) is the crux of the eval-23 fix and must be computed, not
> read off `direction`.** The engine renders the opponent pattern on the after-best board; if it is
> present there too, the link is L3 (no causation) regardless of what `direction` says. This is why
> the fix is a *render-layer* computation, not trusting the terse code.

### Family 2 — `route: sign` (deep `forced_sequence`/`parity` → confidence varies)

| # | Link (trigger) | Composes (gist) | Confidence | Removes (covers) | Corpus n |
|---|---|---|---|---|---|
| L5 | **denied winning line** — `route=sign` ∧ LR=`winning_line` ∧ OP=`denial` | "You had a forced {win} — it resolves ~{pliesToEnd} plies out via a {fork/parity} completing at {completingCell} (discs {supportingDiscs} already on that line). The played move let the opponent take {denialCell} on it — {win}→{played}." | high (denial provable; horizon stated) | `route,*.kind,opponentPunishment.verdict,*.terminal,*.forkCase,tie.kind,tie.tied,register→horizon` | 4 |
| L6 | **two winning lines** — `route=sign` ∧ LR=`winning_line` ∧ OP=`winning_line` (`win_to_lose`) | "You had a forced win via {A} (~N plies); the played move both gives it up and lets the opponent force their own win via {B}." | high if both lines have named completing cells; else **low** | `route,*.kind,*.terminal,*.forkCase,register→horizon` | 4 |
| L7 | **swindle, both lose** — `route=sign` ∧ LR=`conditional_swindle` (`lose_to_faster_lose`) | "You were already losing. The better move kept a practical swindle — a slip in column {gate.witness.devCols} within {oppPlies} plies lets you back; the played move loses faster. **Neither move wins.**" | high | `route,lostResource.kind,opponentPunishment.kind,*.verdict,register→horizon,tie.kind,tie.playedPlies,tie.swindlePlies` (gate.witness.devCols/oppPlies **restated, not dropped**) | 4 |
| L8 | **draw abandoned** — `route=sign` ∧ `case=draw_to_lose` (LR=`denial`, OP=`winning_line`) | "The position was a draw; the better move holds it by occupying {cell}. The played move abandons it and the opponent now has a forced win (~{pliesToEnd} plies, completing at {completingCell})." | high | `route,*.kind,*.verdict,*.terminal,*.forkCase,tie.kind,register→horizon` | 1 |
| L9 | **diffuse parity win** — `route=sign` ∧ LR=`winning_line` ∧ `register=parity` ∧ no single denial/shared cell | "You had a parity/zugzwang win (resolves deep, ~{pliesToEnd} plies); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. See the parity group {controllingGroup}." | **low** → thin frame | `route,*.terminal` only — keeps `register`, `parityAttribution.*`, both halves' cells | (subset of L5/L6 parity rows) |

L9 is the graceful-degradation bucket: when the causal link can't be proven, we **don't** aggressively
remove — we keep `parityAttribution`, `register`, and the cells, and let the LLM reason. This is the
concrete form of "cases we can't write an algorithm to exclude parts a-priori."

### Coverage check

Every corpus record maps to exactly one link (L1–L9): realized_denied → L1–L4 (16 records);
sign → L5–L9 (13 records). The `covers` lists above, unioned per record with §6's static excludes and
the transformed/rendered fields, must account for **every** present field — enforced by the coverage
assertion (§6), which throws if any link's `covers` names a field that isn't present, or if any
present field is owned by nothing.

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
    when: (fv, ctx) => fv.route==='realized_denied' && fv.direction==='enabled_opponent'
                       && (fv.case==='lose_to_faster_lose' || ctx.patternOnAfterBestBoard),
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
- **P4 — grader + sampler integration.** `grade-fv-sufficiency` per-link rubric (guardrail honored /
  over-removal audit / low-confidence hedging) driven by the catalog · `select_boards.mjs` emits
  `link_<id>` predicates + the two new distinctions + a targeted harvest for the rare links (L3-figure_7,
  L9, `lost_fork_B`). Closes the loop: every rule is exercised and its output graded.

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
   - **Covers audit:** a `causal-covers` field counts as owned **only if a live frame actually names
     it** in `covers[]`. If such a field is present but *no* firing frame covers it, it must fall back
     to `render` (not silently vanish); and a frame whose `covers[]` names a field that isn't present
     is itself a bug (throws). This is what makes confidence-gated removal auditable rather than lossy.

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

## 8. Open questions

1. **`reachableInPlies` source** — read off the stored `line` length to the cell, or recomputed?
2. **Glossary residue** — which codes still need a short reading key once frames/guardrails are inlined.
3. **L2-vs-L3 branch-invariance check** — the exact predicate (pattern present on the after-best
   board) and where it's computed in the render model.
4. **Two latent-error audit** — re-verify the *passing* parity/`finalMovestring` cases (eval-2, 8,
   9, 11, 13, 15) the same way, since the grader's PV-mismatch bug could have produced false passes
   too (lower risk, but unaudited).
