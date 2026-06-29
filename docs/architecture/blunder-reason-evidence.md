# Blunder-reason evidence collection

Companion to [`my_pseudocode.md`](./my_pseudocode.md), which is the authoritative case taxonomy.
That file defines *which* `reason` each `(bestScore, playedScore)` blunder gets; this file defines
*how the evidence behind each reason is computed*, with the validated boards and budgets.

> Status: **IMPLEMENTED 2026-06-29** (see §11 Implementation map). Design derived empirically
> 2026-06-28/29 from four per-case investigations on real solver-backed boards. Thresholds marked
> **provisional** were each validated on only a handful of boards and must be tuned against a labeled
> set before being locked as constants.

## 1. The core finding — no combinatorial explosion

The fear that motivated this work was that citing concrete examples (winning lines, threats,
refutations) requires exponential game-tree instantiation. It does not. **Under optimal play each
side collapses to a single `argmax` line**, so every example we need to show is one bounded walk to
terminal. Total solver cost per blunder is `O(plies)` — typically **≤ 80 queries, sub-second** — with
no branching anywhere except the `lose_to_faster_lose` gate (which is itself tightly bounded).

This was confirmed independently on every case below.

## 2. The unifying engine — two halves

Every `reason` decomposes into the same two halves, each computed the same way:

| Half | Meaning | Computation |
|---|---|---|
| **(a) lost resource** | what the *best* move preserved | one bounded optimal-line walk from `board + best` |
| **(b) opponent punishment** | how the *played* move loses / fails to win | one opponent-optimal walk from `board + played` |

Each walk returns `{ completingCell, window, pliesToEnd, register }`. Only the **kind** of half (a)
varies by case:

| case | half (a) kind | half (b) kind |
|---|---|---|
| `win_to_draw` | `winning_line` | `neutralization` (opponent's single saving reply) |
| `win_to_lose` | `winning_line` | `winning_line` |
| `draw_to_lose` | `defensive_hold` (tactical) or `parity_group` (zugzwang) | `winning_line` |
| `lose_to_faster_lose` | `conditional_swindle` (gated) | `winning_line` (faster) |

**Keep the two halves in separate fields.** In `draw_to_lose` the half-(a) parity/hold cell is *not*
the half-(b) opponent completing cell (validated board below: `c2r3` vs `c7r6`). Merging them into a
single "the opponent wins here" claim fabricates.

**Additive enrichments (implemented 2026-06-29; full mechanism in
[`reason-engine-pseudocode.md`](./reason-engine-pseudocode.md)).** Each half also carries, on top of
the walk fields above:

- `anchorCells` — the move-level squares that define the lost resource (winning-move cells for
  win cases; the hold/lever cell otherwise). See DECISIONS **D14**.
- `tacticTag` / `tacticCells` / `tacticFromDiff` — a `classifyPattern` tactic name, admitted only
  through the two solver gates (register-class + realized-locus); `null` when none is admissible.
  See DECISIONS **D13**.
- `parityAttribution` — for parity-register wins: controlling group + odd-z `leverCells`
  (+ `forcedFirstRequired` when there is no lever). See DECISIONS **D7**.
- `opponentPunishment.tie` — the verified relationship of half (b) to half (a):
  `tied` | `independent` | `temporal`. See DECISIONS **D14**, **D15**.

## 3. Register selection (shared sub-routine, applied per half)

The forward distance to resolution, `fwd = 43 − 2·|score| − discs`, picks how deeply to *render*
each half:

- `fwd ≤ 2` → **immediate** — state it as a fact ("column 3 completes your four at c3r5").
- `fwd ≤ ~6` → **forced_sequence** — show the literal short line. The most instructive form. **(provisional ≈6)**
- `fwd > ~12` → **parity** — do *not* render the line; name the controlling parity group + odd/even cell. **(provisional ≈12)**

The search always runs to terminal (to learn the target cell); the register only governs whether the
move **line** is shown. `|score|` is a free, reliable proxy for "is there something short and
nameable here." A 25-ply optimal grind is unlearnable and must not be rendered as a sequence.

## 4. The opponent reply-histogram (free counterplay signal)

At any node `board + move`, the opponent's score vector — already computed — yields the counterplay
count directly:

- **`win_to_draw`:** after the winning move the opponent has **0** non-losing replies; after the draw
  move, **exactly 1**. That one cell *is* the explanation: "you handed them their one escape."
- **`lose_to_faster_lose` gate:** fires iff `min(oppScores) ≤ 0` — i.e. the player still has a threat
  the opponent is *forced* to answer (any non-answer scores ≤ 0). "Buying time" = keeping the
  opponent on a narrow forced path.

Both read the same histogram; it is the cheapest way to express "how much counterplay survived."

## 5. The `lose_to_faster_lose` gate (the only real search)

Both `bestScore < 0` and `playedScore < 0`: the player is lost either way, so the move is a blunder
**only if the best move preserved a practical chance** (a reachable opponent mistake that flips to
≥ 0) that the played move throws away.

```
GATE(P + bestCol):                    # opponent to move; player is lost so opponent HAS a winning move
  DFS over opponent nodes, tracking oppPlies:
    oppScores = query(node)
    if min(legal oppScores) <= 0:     # opponent has a non-winning reply -> SWINDLE EXISTS
        return BLUNDER, witness = { node, devCols = {c : oppScores[c] <= 0}, oppPlies }
    for oc in winningCols sorted ascending by score [:BRANCH]:   # least-winning first = most fragile
        for pc in argmax(playerScores(node+oc)) [:2]:            # player-optimal, tied-best capped at 2
            descend(node + oc + pc, oppPlies+1)
    stop when oppPlies > DEPTH
  return NOT_A_BLUNDER
```

**Budget (provisional):** `DEPTH = 6` opponent plies, `BRANCH = 3`, player tied-best capped at 2,
dedup by movestring. In practice the witness is found at `oppPlies = 0` (≈1 query); deep cases
terminated in ≤ 5 nodes.

**Soundness is asymmetric — respect it.** The gate is *sound for declaring BLUNDER* (every witness is
solver-verified). It is *not complete for NotABlunder*: a swindle deeper than the budget is missed.
Asserting NotABlunder is only **exact** when the subtree was exhausted — which is true in the
near-full endgames where this case lives (validated NotABlunder board: 4 empty cells, 2 nodes
searched). Elsewhere the honest posture is "no practical chance within budget."

**Grade the chance, don't just detect it.** A root-level swindle where the opponent has only one
holding move out of seven is a far stronger practical chance than a 4-ply-deep single-column draw
temptation, yet both pass the binary gate. Grade by `oppPlies` (shallower = more practical) and by
`#{c : oppScore ≤ 0}` (wider = more instructive).

## 6. Validated boards

All boards 0-indexed; render with `./visualize_board.sh <movestring>`. Selectors written during the
investigation: `reason_audit/TOOLS/wtl_selector.mjs`, `reason_audit/TOOLS/select_win_to_draw.mjs`,
`reason_audit/TOOLS/select_w2d_byregister.mjs`, `scratchpad/select_draw_to_lose.mjs`,
`scratchpad/select_ltfl.mjs`. All stream `playGame` (gameSampling.js) and filter by the case's sign
pattern.

### win_to_draw — `3325` (Green to move, best col1 = +18, played col5 = 0)
- Missed win: col 1 → bottom-row open three → completes `c5r1`, window `c2r1 c3r1 c4r1 c5r1`.
- Neutralization: after the draw move, opponent score vector is `[-2, 0, -17, -17, -2, -17, -17]` —
  **col 1 is the opponent's only drawing reply**, and it is the exact square the player declined.
  Reason: "col 2 (display) both wins for you and is the opponent's only save."

### win_to_lose — `463512252326` (Green, best col2 = +15, played col0 = −15)
- Missed win: vertical four, drop col 3 completes `c3r5` (immediate).
- Opponent refutation: after played col0, opponent wins next move at `c5r2`, window
  `c4r2 c5r2 c6r2 c7r2` (immediate). Both halves `immediate` — the canonical teachable blunder.
- Contrast case `333331111616` (best col0 = +1 → `fwd 28`, slow_zugzwang, line NOT shown; played
  col5 = −13 → opponent forced win in 5 plies, `forced_sequence`, shown).

### draw_to_lose — two registers
- **Tactical** `3342652233354244431011` (Green, scores `[-10,0,-10,--,-10,-10,-10]`): col 1 is the
  *unique* draw. Holding resource = opponent's gravity-top win-in-one at `c2r4`; the draw move
  occupies it, every other move surrenders it. `decisive_check` verdict `DECISIVE`.
- **Zugzwang** `2444422235255630400333` (Green, scores `[-1,0,0,0,0,-1,-1]`): draw held by parity of
  a contested column; opponent's win completes at `c7r6` near board-fill. The parity hold cell
  (`c2r3`) ≠ the opponent completing cell (`c7r6`) — separate fields.

### lose_to_faster_lose
- **BLUNDER** `3333325662555225` (Green, all cols lose; best col0 = −3, played col1 = −12). After
  `+best`, opponent vector `[3,-5,-5,-5,-12,-5,-5]` — opponent has **one** holding move, the other
  six lose: gate fires at `oppPlies=0`, `devCols={1..6}`. Demonstration (col4): player wins +12 at
  `c5r2`. Played move collapses: opponent wins in 3 plies (`c1r2`) vs the best move's 18-ply grind.
- **NotABlunder (exact)** `33343022442233255525004414106106605511` (Green, 38 discs, 4 empty; best
  col1 = −1, played col6 = −2). Gate exhausts the tiny subtree (`nodesVisited = 2`), no opponent
  non-winning reply exists → exact NotABlunder. The "lose one move later, no counterplay" endgame
  the spec wants filtered.

## 7. The parity-group correction (important)

An earlier draft of this analysis claimed deep zugzwang wins are "diffuse, no nameable deciding
cell." **That was wrong** — it was a tooling artifact, not a fact about the game.

On `25224334` (Green's deep zugzwang win, `scr` col4 = +5, completes at ply 33), the terminal winning
window is a single clean horizontal group — row 2, cols 1–4 — and it first appears as a 3/1 major
threat at **ply 17, sixteen plies before it completes.** The mistake was that `forward_projection.mjs`
only flags a window once it is physically 3-of-4 filled; but the **parity claim** on that group locks
in even earlier (the completing cell is the even cell of a column whose parity the player controls).

**Therefore: name deep zugzwang wins by their parity-aligned group of 4 + odd/even completing cell,
detected via z-threat / Allis odd-even threat detection — not via major-threat materialization.** The
only genuinely unnameable case is a *multi-window* board-fill where no single controlling parity group
dominates. This collapses `draw_to_lose`'s zugzwang register and the deep `win_to_*` cases onto one
mechanism (`parity_group`) rather than three different fallbacks.

See KB / memory: `reference_z_threat_detection`, `reference_claimeven_detection`,
`reference_allis_rule_examples`.

## 8. Tooling map

| Tool (`reason_audit/TOOLS/`) | Use |
|---|---|
| `optimal_line.mjs` | both-optimal PV walk → completing cell + line (all cases) |
| `forward_projection.mjs` | PV trace + earliest major-threat appearance per window |
| `forward_distance.mjs` | the `fwd` register gate |
| `decisive_check.mjs` | confirm a candidate cell is genuinely decisive under optimal defense |
| `opp_punish_probe.mjs` | probe opponent replies (gate / refutation) |
| `parity_cells.mjs` | parity / z-threat cells (zugzwang register) |

**Gotcha:** `decisive_check.mjs` assumes the *side-to-move is the punisher*. Correct for `win_to_lose`
/ `draw_to_lose` / `lose_to_faster_lose`; **wrong for `win_to_draw`**, where the player is the winner —
it mislabels the player's own winning line as `BLOCKABLE`. Use `optimal_line.mjs` for the player's
winning half, or extend the tool with an explicit `winnerSide` param so the engine has one code path.

## 9. Harvesting note (for building a labeled / puzzle set)

Random self-play resolves either *immediately* (large `|score|`) or via *deep zugzwang* (`|score| ≈ 1`);
the instructive **mid-length forced lines** (`fwd` in the 3–12 `forced_sequence` band) are the rare
middle. A `discs ≥ ~20` floor fixes board *depth* (skips opening theory) but **not** this register
skew. To concentrate teachable cases, sample with the disc floor **and additionally
stratify/reject on `fwd` (or `|score|`)**. For `win_to_lose`, the selector must also require
`max(scores) > 0`, or it grabs `losing_either_way` boards, which are a different case.

## 10. Honest limits (current)

- **Provisional thresholds.** `forced_sequence ≤ ~6`, `parity > ~12`, gate `DEPTH=6 / BRANCH=3` were
  each validated on a handful of boards. Tune against a labeled set before locking.
- **Gate incompleteness.** A swindle deeper than the gate budget → false NotABlunder unless the
  subtree was exhausted. Safe only to *assert* NotABlunder when exhaustive; else report "no chance
  within budget."
- **Multi-window board-fill** (no dominant parity group) remains genuinely unnameable; emit a
  low-specificity parity reason rather than invent geometry.
- **Display cap is real information loss.** The show/don't-show ply threshold is a product knob, not a
  correctness threshold; raising it trades instructiveness for completeness.
- **`win_to_slower_win`** is out of scope (NotABlunder) per `my_pseudocode.md`.

## 11. Implementation map (built 2026-06-29)

All under `connect-four/`. Coordinates 0-indexed internally; the engine emits `cNrM` (1-indexed) cells.

| File | Role |
|---|---|
| `server/scripts/reason_audit/reasonEngine.mjs` | the engine + CLI. `computeReason(movestring, playedCol, {solver})` → evidence JSON. CLI: `node server/scripts/reason_audit/reasonEngine.mjs <ms> <playedCol>`. Holds `REASON_CONFIG` (the provisional thresholds + gate budget — one named object, do not scatter). |
| `server/scripts/reason_audit/lib/boardUtils.mjs` | shared board helpers (buildBoard / winningWindows / cellStr / parseCell / loadEnv). |
| `server/scripts/reason_audit/build_fixture.mjs` | stratified rejection-sampling fixture builder (fixed seed) + curated ANCHOR boards from §6; writes `reason_fixture.jsonl`. |
| `server/scripts/reason_audit/reason_fixture.jsonl` | committed fixture: `{movestring, playedCol, bestCol, scores, discs, expectedCase, expectedGate?, expectedExhaustive?, bucket}`. |
| `server/scripts/reason_audit/build_evidence.mjs` | runs the engine over the fixture → `server/scripts/reason_evidence_all.jsonl` (each row = evidence + ground-truth labels). |
| `server/tests/reasonEngine.test.mjs` | `node --test` (in `npm run test:fast`): asserts case == expectedCase, completingCell occupied on each half's `finalMovestring`, register matches the fwd formula, gate verdict/exhaustive present for ltfl. |

**Evidence object shape** (per `(movestring, playedCol)`): `{ case, notABlunder, bestScore,
playedScore, scores, lostResource, opponentPunishment, replyHistogram, gate }`. Each half =
`{ kind, register, completingCell, window, pliesToEnd, line, finalMovestring }` (line nulled for the
`parity` register; `defensive_hold`/`neutralization`/`parity_group` set `register`/`finalMovestring`
explicitly rather than from a walk). `gate` (ltfl only) = `{ ran, exhaustive, verdict, witness,
nodesVisited }`.

**Case classifier caveat:** `win_to_slower_win` is gated on `bestScore>0 && playedScore>0`, NOT the
`my_pseudocode.md` literal `bestScore*playedScore>0` (which also matches both-negative and would
swallow `lose_to_faster_lose`). See memory `project_reason_engine_case_classifier_trap`.

**Viewer:** `/admin/fv-suff` (`src/pages/AdminFvSuffPage.jsx`) browses `reason_evidence_*.jsonl` via
`GET /api/admin/reason{,/files}` — see `api-conventions.md`. No solver in the web server; the file is
fully precomputed by `build_evidence.mjs`.
