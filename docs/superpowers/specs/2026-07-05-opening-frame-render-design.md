# Opening-frame grounded-render design

**Date:** 2026-07-05
**Status:** design (awaiting user review before planning)
**Owner:** reason-engine / condition-D grounded-render pipeline

## Problem

The condition-D grounded-render path crashes on every opening-phase board with
`UncoveredVectorFieldError: openingContext.*`. Root cause (verified empirically, RCA session
2026-07-05):

- The engine (D31/D32, `computeOpeningContext.mjs`) emits an `openingContext` object on opening
  decisions (one of three mutually-exclusive variants: `namedOpening` / `defense` / `centrality`).
- `renderReasonModel.mjs → buildReasonRenderModel → assertCoverage` (`fieldDisposition.mjs:76`) walks
  every leaf of the pruned narrator vector and throws on the first leaf with no disposition. The
  `openingContext.*` subtree was **never registered**, so every opening board trips the tripwire
  *before* the LLM call. The tripwire fired as designed ("a new engine field forces a conscious
  render/exclude decision").
- Confirmed on the frozen run `fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_*`:
  all 25 opening records have `answer:null` + a `call_error` of this form; the crashing set equals the
  `openingContext` set exactly. Error field varies by key-insertion order
  (centrality→`betterHasMoreLines`, namedOpening→`id`, defense→`id` or `family` when `id:null` is
  pruned first).
- Conditions A/B/C never call `assertCoverage` (it lives inside `buildReasonRenderModel`, condition-D
  only); the glossary §11 already documents all three variants — so only the condition-D render layer
  is missing.

This is a **half-wired feature**: the engine produces `openingContext`; the render layer can't consume
it.

## Design principle

At ply 1–6 the two evidence halves degrade into a sound-but-unteachable artifact. Example (eval-1):
`lostResource` = `conditional_swindle`/parity, completingCell **c6r2**, `pliesToEnd:35`;
`opponentPunishment` = `winning_line`/parity, completingCell **c1r3**, `pliesToEnd:37`. Both halves are
*solver-true* (`lostResource` = the winning line the best move keeps; `opponentPunishment` = how the
opponent denies it), but their completing cells sit on squares filled 35–37 plies later. Rendering
"the winning group runs through c3r2·c4r2·c5r2·c6r2" is technically true but pedagogically noise.

**The opening is the teachable reason; the two halves demote to sound proof-of-outcome, summarized by
their horizon — never rendered as crisp deep cells.** This is purely a render-layer decision: the
engine keeps emitting the full halves unchanged (soundness invariant I0 / `feedback_engine_soundness_then_render`).

The opening frame explains the blunder through **book line + column centrality + row parity**, grounded
in an empirical winning-cell distribution (below), and **anchored to the landing cells of the better vs.
played move** — concrete this-move squares in the low rows where the sample is densest — not the deep
resource.

## Empirical winning-cell distribution

**This spec is the source of truth for the heatmap — the implementation has NO dependency on any
branch.** The JSON below is hardcoded configuration: the implementation copies it verbatim into
`reason_engine/data/winning-cell-heatmap.json` (with a provenance header) and reads it from there. Do
**not** merge or reference `worktree-win-dist-grid`.

Provenance: 27,976 self-play games, both sides 90% optimal / 10% random, meanPlies ~31.9.

Semantics (pinned here, self-contained — derived from the embedded `parity` sums, no external
verification needed): `heatmap[player][row][col]` = P(that cell is part of the winner's line | that
player wins). **Array row 0 = internal r0 = bottom = display row 1** (confirmed: summing
`heatmaps['1']` rows `{0,2,4}` yields 71% of mass = `parity['1'].oddRowMass 0.718`; display-even rows
`{1,3,5}` carry player-2's `evenRowMass 0.674`). Column index 3 (display col 4) dominates both heatmaps
(peaks 0.36 / 0.39). `player` and `col` are 0-indexed in the lookup; `heatmap` keys `'1'`/`'2'` are
strings.

```json
{
  "games": 27976,
  "p1Wins": 15900,
  "p2Wins": 10000,
  "draws": 2076,
  "meanPlies": 31.858235630540463,
  "heatmaps": {
    "1": [
      [0.03352201257861635, 0.10169811320754717, 0.09540880503144654, 0.17125786163522014, 0.09779874213836479, 0.10427672955974843, 0.03691823899371069],
      [0.03528301886792453, 0.029685534591194968, 0.1320125786163522, 0.028238993710691825, 0.1329559748427673, 0.031572327044025156, 0.03446540880503145],
      [0.07125786163522013, 0.1171069182389937, 0.11566037735849057, 0.29037735849056606, 0.11874213836477987, 0.11886792452830189, 0.07415094339622641],
      [0.05194968553459119, 0.06006289308176101, 0.14408805031446542, 0.06937106918238994, 0.14276729559748427, 0.05817610062893082, 0.05578616352201258],
      [0.09169811320754717, 0.2021383647798742, 0.2683018867924528, 0.36257861635220123, 0.27050314465408803, 0.20836477987421384, 0.09767295597484277],
      [0.02779874213836478, 0.017987421383647798, 0.02666666666666667, 0.08553459119496855, 0.02679245283018868, 0.016540880503144655, 0.02918238993710692]
    ],
    "2": [
      [0.0822, 0.0357, 0.0729, 0.0118, 0.07, 0.0364, 0.0846],
      [0.086, 0.1966, 0.1725, 0.3267, 0.1726, 0.1915, 0.0841],
      [0.0354, 0.0587, 0.2138, 0.0841, 0.2181, 0.0573, 0.0389],
      [0.0869, 0.1723, 0.2027, 0.3873, 0.1954, 0.1724, 0.0871],
      [0.0321, 0.0273, 0.0745, 0.0564, 0.0768, 0.0235, 0.0337],
      [0.0381, 0.067, 0.0715, 0.093, 0.0706, 0.0648, 0.0393]
    ]
  },
  "parity": {
    "1": { "oddRowMass": 0.7176360754898504, "evenRowMass": 0.2823639245101496 },
    "2": { "oddRowMass": 0.32613571428571236, "evenRowMass": 0.6738642857142876 }
  }
}
```

The data **measures** the parity canon and the centrality gradient rather than asserting them.

## Components

### 1. `reason_engine/openingFrame.mjs` (new)

Composer parallel to `causalLinks.mjs` (kept separate so `causalLinks.mjs` stays the L1–L9
sign/realized taxonomy). One export:

```
composeOpeningFrame(prunedFv, heatmap) → { id, kind, confidence, text, guardrail, covers }
```

`id` ∈ `{O1,O2,O3}`, `kind` ∈ `{namedOpening,defense,centrality}`. Text = **lead + centrality/parity
clause + demoted horizon tag**.

**Lead per variant** (all columns rendered 1-indexed):

- **O1 namedOpening** (mover has a book win; case `win_to_*`):
  *"In the opening you were following the {family}{ (id) }. The book move is column {bookNextCol+1};
  you played column {playedCol+1}, leaving the line."*
- **O2 defense** (second player; case `lose_to_faster_lose`) — **no "theoretically lost" framing**
  (pedagogy: `feedback_pedagogy_preferences`); purely comparative resilience:
  *"In the opening you were following the {family}{ (id) }. The more resilient move is column
  {bestDefenseCol+1}; column {playedCol+1} gives ground faster."*
- **O3 centrality** (geometric fallback, either player): existing `openingContext.centrality.text` as
  the lead.

**Centrality/parity clause** (shared; heatmap used **internally only** — no numbers surface). For the
mover's player, compare the landing cells of the better and played move
(`landingCell(movestring, col)`):
`gap = heatmap[player][rBetter][cBetter] − heatmap[player][rPlayed][cPlayed]`.

- large gap → *"it'll be much easier to build a connected four through {betterCell} than through
  {playedCell}"*
- moderate gap → *"…easier…"*
- small / negative gap → **omit the clause entirely** (make no centrality claim)

Parity rider (appended only when the better cell's row parity favors the mover and the played cell's
does not):
- O1 / O3 (winning framing): *"— that square sits on the {even/odd} rows your winning lines tend to run
  through."*
- O2 (resistance framing, a lost mover has no "winning lines"): *"— the more central hold contests the
  rows the opponent needs and is harder to break through."*

**Demoted horizon tag** (the L1–L9 text compressed; no doom verb):
*"The solver confirms this resolves deep (~{pliesToEnd} plies, a parity battle) — too far to pin to one
square; the lesson is the opening."*

**Guardrail:** *"Explain the blunder through the opening — book line, centrality, parity. Do NOT ground
a specific deep completing cell; the deep resolution is a horizon, not a teachable square."*

`covers`: empty/minimal — the opening frame is **additive**, not a replacement; the deep-cell
suppression is expressed via `render_decision.openingContext.deepResourceGrounded:false`, not via a
covers list (covers must be causal-codes and the halves' codes still legitimately describe the
outcome).

Thresholds (large/moderate/small gap cutoffs) live as named constants in this module, tuned against the
real heatmap during implementation.

### 2. `renderReasonModel.mjs` wiring

`buildReasonRenderModel` and `buildRenderDecision` detect `pruned.openingContext`. When present:

- `frames = [openingFrame]` — a single self-contained primary frame (lead + clause + horizon tail).
  `classifyCausalLink` still runs (unchanged) but its text is **not** rendered; it only populates
  `render_decision`'s outcome scaffolding + the horizon `register`/`pliesToEnd` the opening frame's tail
  consumes.
- `selectBoards` → **decision board only** (no `projectedDeep`; we deliberately do not ground the deep
  square).
- Non-opening boards: entirely unchanged.

### 3. `fieldDisposition.mjs`

Register every `openingContext.*` leaf so `assertCoverage` passes the *right* way:

- `openingContext.namedOpening.bookNextCol`, `openingContext.defense.bestDefenseCol`,
  `openingContext.centrality.bestCol`, `openingContext.centrality.playedCol` → **transformed** (rendered
  1-indexed in the frame; raw 0-indexed withheld — Fix-A coordinate-leak rule).
- `openingContext.centrality.text` → **transformed** (the frame carries it; not double-shown in
  residue).
- names / flags (`id`, `family`, `matchedPrefixLen`, `centralityGrounded`, `betterHasMoreLines`,
  `resistAndWait`) → **render**, each with a reading-key entry.

### 4. `render_decision` opening block

Add an `openingContext` block to the condition-D `render_decision` (previously absent for openings):

```json
"openingContext": {
  "kind": "namedOpening|defense|centrality",
  "frameId": "O1|O2|O3",
  "lead": { "id": …, "family": …, "matchedPrefixLen": …, "bookCol": <1-indexed|null>, "holdCol": <1-indexed|null> },
  "centralityComparison": { "player": …, "betterCell": "cNrM", "playedCell": "cNrM", "qualitative": "much_easier|easier|null" },
  "parityFavor": { "betterCellRowParity": "even|odd", "favorsMover": true|false },
  "deepResourceGrounded": false,
  "horizon": { "register": …, "pliesToEnd": … }
}
```

`deepResourceGrounded:false` is the load-bearing grader signal: **do not expect or reward a deep
completing-cell claim.**

### 5. `grade-fv-sufficiency` SKILL.md update (required)

A render change is not done until the grader knows it (`feedback_reason_case_requires_eval_and_grader`).
Replace the current *"No `render_decision` exists for opening cases"* instruction with:

- the new `render_decision.openingContext` block as condition-D ground truth for opening boards;
- a check that the answer honored `deepResourceGrounded:false` (grounding a deep completing cell = fail);
- a check that the answer's qualitative centrality claim matches `centralityComparison.qualitative`
  direction (and made none when it is `null`).

## Data flow

```
computeReason (unchanged)
  → toNarratorVector → pruneVector
  → buildReasonRenderModel:
        classifyCausalLink (unchanged)            # outcome scaffolding + horizon
        if openingContext present:
            composeOpeningFrame(pruned, heatmap)  # single primary frame: lead + clause + horizon tail
            frames = [openingFrame]               # causalLink text not rendered; feeds render_decision only
            boards = [decision]
        assertCoverage (now passes: openingContext registered)
  → assembleGroundedPrompt → LLM
buildRenderDecision → render_decision.openingContext{…, deepResourceGrounded:false}
```

## Testing

- `openingFrame.test.mjs`: each variant composes correct 1-indexed text, guardrail, qualitative
  direction from a **stub** heatmap, parity rider only when warranted, and **never** emits a deep
  completing cell. O2 asserts absence of any "lost" framing.
- `renderReasonModel`: `buildReasonRenderModel` on real opening vectors (eval-9 namedOpening, eval-5
  defense, eval-1 centrality) no longer throws; `frames[0]` is the opening frame; `selectBoards` →
  decision only; `buildRenderDecision` emits the `openingContext` block with `deepResourceGrounded:false`.
- `fieldDisposition`: `assertCoverage` passes on all three pruned opening variants.
- Regression: the 25 crashed records replay without `UncoveredVectorFieldError`.
- Data task: copy the JSON embedded in this spec verbatim into
  `reason_engine/data/winning-cell-heatmap.json` with a provenance header; a test asserts the loaded
  shape (2 players × 6 rows × 7 cols, `parity` sums matching). No branch access.

## Worked examples (real records)

- **eval-9 namedOpening** — `movestring 33322226`, player 1, `win_to_draw`, played col 5 / best col 6,
  `openingContext.namedOpening {id:"allen-3-4-opening", family:"central-column opening",
  matchedPrefixLen:8, bookNextCol:6}`. Frame O1: *"…following the central-column opening
  (allen-3-4-opening). The book move is column 7; you played column 6, leaving the line."* + clause
  comparing landing cells of col 6 vs col 5 for player 1 + horizon.
- **eval-5 defense** — `movestring 33322`, player 2, `lose_to_faster_lose`, played col 0 / best col 2,
  `openingContext.defense {id:null, family:"central-column opening", matchedPrefixLen:5,
  bestDefenseCol:2, centralityGrounded:true}`. Frame O2 (no "lost" framing): *"…following the
  central-column opening. The more resilient move is column 3; column 1 gives ground faster."* + O2
  resistance-framed clause (col 3 vs col 1 landing cells, player 2) + horizon. `id:null` with `family`
  present is correct (shared prefix).

## Non-goals

- Not merging or referencing `worktree-win-dist-grid` — the heatmap JSON is hardcoded in this spec.
- Not changing the engine's `openingContext` computation or the two evidence halves.
- Not adding opening rules to `CAUSAL_LINKS` (L1–L9 stays the sign/realized taxonomy; the opening
  frame is a separate additive layer).
- Not touching conditions A/B/C (they use the glossary path and never crash).
