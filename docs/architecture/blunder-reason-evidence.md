# Blunder-reason evidence collection

Companion to [`reason-case-taxonomy.md`](./reason-case-taxonomy.md), which is the authoritative case taxonomy.
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
| `win_to_draw` (fork) | `winning_line` (stops at fork — D16) | `denial` (occupation-witness PV walk — D18, replaces D17 BFS) |
| `win_to_draw` (no fork) | `winning_line` | `denial` (occupation-witness PV walk on `lostResource.window` — D26, replaces the legacy `neutralization`) |
| `win_to_lose` | `winning_line` (stops at fork — D16) | `winning_line` (stops at fork — D16) |
| `draw_to_lose` (tactical) | `denial` (occupation-witness PV walk — D18, ply-0 root occupation) | `winning_line` |
| `draw_to_lose` (zugzwang) | `denial` (occupation-witness PV walk — D18, deeper PV node) | `winning_line` |
| `lose_to_faster_lose` | `conditional_swindle` (gated) | `winning_line` (faster) |

**D16 fork-stop (applies to `win_to_draw` and `win_to_lose` half (a) and half (b)).** `walkOptimal` does NOT walk every win to the completed four. After each winner move it checks for an unstoppable double-threat fork (`detectDoubleThreat` + `!detectImmediateThreat(opponent)`) and stops there, returning the fork cells and windows as the resource (`terminal:'fork'`). This means `lostResource` for these cases describes **where the fork forms**, not where the four completes. The `win_to_draw`/`win_to_lose` half (b) also uses this fork-stopped position as the basis for its search. See DECISIONS **D16**.

**D18 occupation-witness PV walk (unified primitive).** The unified `findOccupationWitness` primitive replaces the D17 BFS (`denyOpponentPunishment`, deleted) **and** provides the `draw_to_lose` half-a denial. For `win_to_draw` half (b) with a fork: walk the canonical argmax PV from `playedRoot`; return the first node where the opponent occupies a cell of `lostResource.forkWindows` (LIVE→DEAD). Verdict: `occupation` (the occupied cell is the constructive D14-tie) or `no_occupation` (two-valued by `exhaustive`). For `draw_to_lose` half (a): walk the canonical argmax PV from `bestRoot`; return the first node where the player occupies a cell of the opponent's conceded window (from the half-b walk). Both tactical and zugzwang sub-cases use this single primitive; tie is `tied` at the occupation cell in both cases. **D26 (2026-07-02):** the non-fork `win_to_draw` half (b) now uses this same primitive on `[lostResource.window]` (the single winning-line window) — the legacy `neutralization` is retired; `register` is fwd-derived but the full `line` is retained regardless (soundness-first, rendering deferred downstream). See DECISIONS **D17**, **D18**, **D26**.

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
- `parityAttribution` — for parity-register wins: controlling group + per-cell height-parity
  (`empties`). The `leverCells` / `forcedFirstRequired` / `groupKind` fields were removed 2026-07-02
  (review F3) as an I2 fabrication — an odd height-parity count is not a detector-backed z-threat/lever.
  The detector-backed naming **landed as `namedRule` (D7/D27, 2026-07-02)**: `nameParityRule` names a
  parity win `allen-v3`/`allen-v4` **only** when the production z-threat / odd-even detector confirms
  the completing cell at its lock-in node, else abstains (`namedRule: null`). See DECISIONS **D7**,
  **D24**, **D27**.
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
  move, **exactly 1** (this is the counterplay count the old `neutralization.savingReplyCount` carried;
  it now lives here in `replyHistogram.afterPlayed`). The histogram establishes the counterplay count;
  the actual explanation for **all** `win_to_draw` cases is the **denial search** (D18/D26) — the first
  moment the opponent occupies+kills a cell of the winning window(s) under optimal play (fork windows
  for the fork sub-case, the single winning-line window for the non-fork sub-case) — not the identity
  of the saving reply.
- **`lose_to_faster_lose` gate:** fires iff the opponent has an **admissible** non-winning reply
  (`oppScore ≤ 0` AND the reply leaves the player no immediate win-in-1 threat), or the player's
  immediate threat is **unblockable** (D19). A non-winning reply that hangs/creates a win-in-1 is not
  counted — the opponent is assumed to block immediate threats. "Buying time" = keeping the opponent
  on a narrow forced path of *admissible* moves.

Both read the same histogram; it is the cheapest way to express "how much counterplay survived."

## 5. The `lose_to_faster_lose` gate (the only real search)

Both `bestScore < 0` and `playedScore < 0`: the player is lost either way, so the move is a blunder
**only if the best move preserved a practical chance** (a reachable *admissible* opponent mistake that
flips to ≥ 0) that the played move throws away. **Admissible** (D19) = a mistake an opponent that
always blocks IMMEDIATE (win-in-1, gravity-top) threats could still make — never "hang an immediate
threat." An IMMEDIATE threat (a group of 3 completable by one gravity-top drop) is not a MAJOR threat
(a group of 3 not completable in one move); the gate only ever consults `detectImmediateThreat`.

```
GATE(P + bestCol):                    # opponent to move; player is lost so opponent HAS a winning move
  DFS over opponent nodes, tracking oppPlies:
    oppScores = query(node)
    # ADMISSIBLE (D19): moves after which the PLAYER has no immediate win-in-1
    #   (blocks the existing threat AND creates none). Winning replies (oppScore>0) are always
    #   admissible — an opponent win-in-1 leaves the player no win-in-1 — so this only filters ≤0 replies.
    adm = { c in legalCols : detectImmediateThreat(node+c, player) is empty }
    if player has an immediate threat AND adm is empty:   # unblockable: double / forced-col / poisoned block
        return BLUNDER, witness = { node, unblockable, devCol = argmax oppScore }
    if min(oppScore over adm) <= 0:                        # an ADMISSIBLE non-winning reply -> SWINDLE
        return BLUNDER, witness = { node, devCols = {c in adm : oppScore[c] <= 0}, oppPlies }
    for oc in (adm ∩ winningCols) sorted ascending by score [:BRANCH]:  # least-winning first = most fragile
        for pc in argmax(playerScores(node+oc)) [:2]:                   # player-optimal, tied-best capped at 2
            descend(node + oc + pc, oppPlies+1)
    stop when oppPlies > DEPTH
  return NOT_A_BLUNDER
```

The admissibility filter is what makes the witness *teachable*: without it, a player immediate threat
lets the gate return a "swindle" that assumes the opponent ignored a win-in-1 (e.g. `332123` played 4
formerly witnessed at `3321232` with the opponent skipping the `c3r4` block). With D19 the search
descends *through* the forced block and the witness is the first node where the opponent could
realistically go wrong (`332123` → witness `33212322543`).

**Budget (provisional, D23):** a single uniform depth-bounded search — `gateMaxPlies = 15` total plies
from the gate root, `gateBranch = 3` (opponent winning replies, deduped by score), player tied-best
capped at `gatePlayerTiedCap = 2`, `gateNodeBudget` hard node cap, dedup by movestring. In practice the
witness is found at `oppPlies = 0` (≈1 query); deep cases terminate in a handful of nodes. The old
exhaustive(≤10 empties)/bounded two-mode split is retired.

**Soundness is asymmetric — respect it (I7).** The gate is *sound for declaring BLUNDER* (every witness
is solver-verified). It is *not complete for NotABlunder*: a swindle deeper than `gateMaxPlies` is
missed. NotABlunder is therefore a **practical-chance policy** ("no practical swindle within 15 plies"),
not a completeness proof — a single greedy PV cannot prove swindle-absence. This asymmetry is now
uniform (no per-board "exhaustive" claim).

**Grade the chance, don't just detect it.** A root-level swindle where the opponent has only one
holding move out of seven is a far stronger practical chance than a 4-ply-deep single-column draw
temptation, yet both pass the binary gate. Grade by `oppPlies` (shallower = more practical) and by
`#{c : oppScore ≤ 0}` (wider = more instructive).

## 6. Validated boards

All boards 0-indexed; render with `./visualize_board.sh <movestring>`. Selectors written during the
investigation: `reason_engine/TOOLS/wtl_selector.mjs`, `reason_engine/TOOLS/select_win_to_draw.mjs`,
`reason_engine/TOOLS/select_w2d_byregister.mjs`, `scratchpad/select_draw_to_lose.mjs`,
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
  a contested column; opponent's winning window completes at `c7r6` near board-fill. Half (a) is now
  the D18 occupation witness: the player's best-move PV occupies `c4r6` — a cell **inside** the
  opponent's conceded winning window — tie `tied` (not `independent`). The former `c2r3` parity-lever
  cell was the old `parity_group` anchorCell; the D18 witness supersedes it for half (a).

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
dominates. This collapses the deep `win_to_*` cases onto one mechanism (`parity_group`) rather than
multiple fallbacks.

**D18 update for `draw_to_lose`:** the `parity_group` fallback for `draw_to_lose` half (a) is
superseded by the D18 occupation-witness PV walk. The zugzwang zugzwang hold is now described by
the concrete cell the player occupies inside the opponent's conceded window (constructive
window-aware tie), NOT by a parity-lever cell. The `draw_to_lose` **half-(a) occupation cell** is a
denial, not a walked win, so it carries no `namedRule` (D7/D27 names only walked parity-WIN halves —
here that is the half-(b) `opponentPunishment` winning line). The occupation cell is the anchor; the
parity language around half (a) is not canonicalized.

See `docs/architecture/server-conventions.md` (`detectClaimeven` parity rule and simulation; z_threat generation guards) and memory `reference_verified_tactical_movestrings`.

## 8. Tooling map

| Tool (`reason_engine/TOOLS/`) | Use |
|---|---|
| `optimal_line.mjs` | both-optimal PV walk → completing cell + line (all cases) |
| `forward_projection.mjs` | PV trace + earliest major-threat appearance per window |
| `forward_distance.mjs` | the `fwd` register gate |
| `decisive_check.mjs` | confirm a candidate cell is genuinely decisive under optimal defense |
| `opp_punish_probe.mjs` | probe opponent replies (gate / refutation) |
| `parity_cells.mjs` | parity / z-threat cells (zugzwang register) |
| `compute_feature_vector.mjs` | dump the full `computeReason(movestring, playedCol)` vector for one board (+ `matchOpeningPrefix`, + `--narrator` pruned view). 0-indexed; meaningful `--help`. Use this instead of hand-rolling a scratch script. |

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

**Board selection is now a named-universe coverage selector.** `select_boards.mjs --strategy coverage`
enumerates the full closed predicate universe (`REASON_UNIVERSE` — every value of `route`, `case`,
`player`, `phase`, `severity`, the 7 `rd_<tag>_<direction>` pairs, `lost_*`, `opp_*`, `tie_*`, `reg_*`,
`tactic_*`, `parity_*`, `gate_*`) upfront, partitioned into `required` (must reach target; `satisfied()`
gates on these) and `provisional` (known-rare/structurally-unreachable, reported non-blocking). It logs
fulfilled / under-target / never-seen predicates against the named universe (`*` marks provisional) and
throws if the engine emits a predicate absent from the universe (`discovered ⊆ named` guard). `MAX_GAMES`
is a bug-bound, not the expected exit path — see `reason-DECISIONS.md` D22.

**Rare `(tag, direction)` pairs are sourced via an all-suboptimal-columns harvest, not played-move
sampling alone.** `rd_double_threat_enabled_opponent` and `rd_figure_7_enabled_opponent` stayed
PROVISIONAL/unsourced even after the coverage run; a targeted harvest probing *every* suboptimal legal
column per self-play position (not just the played move) examined 13,937 `enabled_opponent`-tagged
blunders through `computeReason` across 44,110 suboptimal-column probes over 425 games and found ZERO
such forks — reinforcing D20's 0/60k finding that the enabled-direction fork is a narrow existential over
optimal replies. See `reason-DECISIONS.md` D22 and `reason-tag-fastpath-pseudocode.md` §Honest-limits.

## 10. Honest limits (current)

- **Provisional thresholds.** `forced_sequence ≤ ~6`, `parity > ~12`, and the gate
  `gateMaxPlies=15 / gateBranch=3 / gatePlayerTiedCap=2 / gateNodeBudget` were each validated on a
  handful of boards. Tune against a labeled set before locking.
- **Gate incompleteness (D23).** The `lose_to_faster_lose` gate is one uniform depth-bounded search
  (`swindleGate`, cap `gateMaxPlies=15`): a swindle FOUND within the cap → Blunder (sound — a real
  solver witness); NOT found → NotABlunder **by policy** ("no practical swindle within 15 plies", a
  practical-chance threshold, NOT a completeness proof). This is the I7 asymmetry made uniform and
  explicit; the old exhaustive(≤10 empties)/bounded two-mode split and the `exhaustive` flag are
  retired. A single greedy PV cannot prove swindle-*absence* (worst-by-eventual-outcome ≠
  worst-by-solver-score), so full completeness was never cheaply attainable and is not the goal.
- **Gate is depth-AND-width incomplete — ACCEPTED known-gap (D25, owner decision 2026-07-02).** The
  "NotABlunder = no swindle within 15 plies" policy is more precisely "no swindle within the depth bound
  **AND** the width caps": the gate also prunes on solver SCORE (`gateBranch=3`, `gatePlayerTiedCap=2`,
  and an unconditional dedup-by-score), and those width caps can drop real admissible swindles that
  exist *within* `gateMaxPlies` → a rare false OMIT (`notABlunder:true` on a genuine blunder). Confirmed
  via `TOOLS/gate_cap_ablation.mjs` (production `swindleGate` vs an uncapped/dedup-free reference at
  equal depth): user-visible counterexample `20312225101223110055056066165433` played 3 (sign route),
  ≈1 per ~470 ltfl boards. The I0-motivated fix (drop the score-caps, keep only `gateMaxPlies` +
  `gateNodeBudget`) was **considered and declined on cost grounds** — the uncapped search is too
  expensive for the ~0.2% miss. The width caps are the accepted practical-chance policy. Soundness for
  declaring **Blunder** (I7) is unaffected — every emitted witness is still real. See DECISIONS **D25**.
- **Multi-window board-fill** (no dominant parity group) remains genuinely unnameable; emit a
  low-specificity parity reason rather than invent geometry.
- **Display cap is real information loss.** The show/don't-show ply threshold is a product knob, not a
  correctness threshold; raising it trades instructiveness for completeness.
- **`win_to_slower_win`** is out of scope (NotABlunder) per `reason-case-taxonomy.md`.

## 11. Implementation map (built 2026-06-29)

All under `connect-four/`. Coordinates 0-indexed internally; the engine emits `cNrM` (1-indexed) cells.

| File | Role |
|---|---|
| `server/scripts/reason_engine/reasonEngine.mjs` | the engine + CLI. `computeReason(movestring, playedCol, {solver})` → evidence JSON. CLI: `node server/scripts/reason_engine/reasonEngine.mjs <ms> <playedCol>`. Holds `REASON_CONFIG` (the provisional thresholds + gate budget — one named object, do not scatter). |
| `server/scripts/reason_engine/lib/boardUtils.mjs` | shared board helpers (buildBoard / winningWindows / cellStr / parseCell / loadEnv). |
| `server/scripts/select_boards.mjs` | board generator, two strategies via `--strategy {fixture\|coverage}`. `fixture`: stratified rejection-sampling fixture builder (fixed seed) + curated ANCHOR boards from §6; writes `reason_engine/reason_fixture.jsonl`. `coverage`: named-universe (`REASON_UNIVERSE`) coverage harvester for the from-vector eval — see §9 and `reason-DECISIONS.md` D22. |
| `server/scripts/reason_engine/reason_fixture.jsonl` | committed fixture: `{movestring, playedCol, bestCol, scores, discs, expectedCase, route?, expectedTag?, expectedDirection?, expectedGate?, bucket}` (`expectedExhaustive` retired per D23; some legacy rows still carry it, ignored). |
| `server/scripts/compute.mjs` | runs the engine over a board set (fixture or coverage output) → evidence JSONL (each row = evidence + ground-truth labels); per-board `try/catch` isolation + crash-safe incremental (`appendFileSync`) writes; `--llm` mode also produces `fv_suff_answers_*.jsonl` for `grade-fv-sufficiency`. Supersedes the deleted `build_fixture.mjs`/`build_evidence.mjs` pair. |
| `server/tests/reasonEngine.test.mjs` | `node --test` (in `npm run test:fast`): asserts case == expectedCase, completingCell occupied on each half's `finalMovestring`, register matches the fwd formula, gate verdict present for ltfl (realized_denied rows assert route/tag/direction instead). |

**Evidence object shape** (per `(movestring, playedCol)`): `{ case, notABlunder, bestScore,
playedScore, scores, lostResource, opponentPunishment, replyHistogram, gate, winSamples }`. Each half =
`{ kind, register, completingCell, window, pliesToEnd, line, finalMovestring }` (line nulled for the
`parity` register by `renderHalf`, but the `denial` halves — incl. the D26 non-fork `win_to_draw`
half (b) — retain the full `line` regardless of register; `defensive_hold`/`parity_group` set
`register`/`finalMovestring` explicitly rather than from a walk). `gate` (ltfl sign-route only; null on the realized_denied route)
= `{ ran, verdict, witness, nodesVisited }` (`exhaustive` retired per D23).

**`winSamples` (DISABLED by default 2026-07-02 via `REASON_CONFIG.enableWinSamples`; `null` unless
re-enabled).** Judged not useful for explaining the blunder, so the whole computation is gated off with
the code path left intact — flip `enableWinSamples: true` to restore. When enabled: computed for
opening & mid-game only (`null` for `closing`/`discs ≥ 30`). `{ best, played }`,
each the `sampleOptimalWins` aggregate (`{ n, distinct, orientation, oddCompletingFraction, lines }`,
see §sampleWins.mjs) of the optimal winning-line realizations from a root: `best` = the player's own
forced win the best move preserves (from `movestring+bestCol`), `played` = the opponent's forced win
the blunder concedes (from `movestring+playedCol`). Each is restricted to its `winnerMark`'s wins, so
a root where that side has no forced win yields `distinct:0` (e.g. `best` is empty for
`lose_to_faster_lose`/`draw_to_lose`; `played` is empty for `win_to_draw`). An already-won `best` root
(best is an immediate winning drop) returns the completing window without querying the terminal
position. **Evidence-only** — like `optimalWinSamples`, `winSamples` is stripped by `toNarratorVector`
(`isNarratorHidden`) and never reaches the LLM; it drives the `/admin/fv-suff` pre-move overlay (green
= `best` windows, red = `played` windows). Sample count from `REASON_WIN_SAMPLES` (default 40).

**Case classifier caveat:** `win_to_slower_win` is gated on `bestScore>0 && playedScore>0` (both
strictly positive). A naive `bestScore*playedScore>0` is wrong — it also matches both-negative and would
swallow `lose_to_faster_lose`. (The same caution is inlined on the first branch of `reason-case-taxonomy.md`.)

**Viewer:** `/admin/fv-suff` (`src/pages/AdminFvSuffPage.jsx`) browses `reason_evidence_*.jsonl` via
`GET /api/admin/reason{,/files}` — see `api-conventions.md`. No solver in the web server; the file is
fully precomputed by `compute.mjs`.

**Production coach still runs the OLD feature vector, NOT this engine.** `toFeatureVector` /
`buildExplainContext` in `server/explainContext.js` remain the live coach behind `/api/explain*`
(index.js). The 2026-06-30 reorg replaced only the *eval's* use of `toFeatureVector` with the reason
engine — production still calls the old path. Do **not** delete `explainContext.js`/`toFeatureVector`
as "old FV"; migrating production onto the reason engine is a separate, deferred effort.

**Exception (2026-07-05, Part B / opening theory):** production `explainContext.js` DOES already
consume the new engine's opening evidence indirectly — `buildOpeningReason` (Task B5) calls the same
shared `computeOpeningContext.mjs` helper described in §12 below, even though the rest of
`explainContext.js`/`toFeatureVector` still runs the old feature vector. This is a narrow, deliberate
carve-out (one shared opening-guard mechanism, I9), not a signal that the broader production migration
has started.

## 12. Opening evidence (`openingContext`) — book-line lookup / centrality, opening decisions only

Part B (Tasks B1–B6) added a second, orthogonal evidence field alongside the case/half machinery
above: `openingContext`, present only on early first-player decisions. It answers a different
question than §§1–11 — not "why does the played move lose" (still answered by the ordinary
`lostResource`/`opponentPunishment` halves), but "is this position on a documented book line, and if
so what does the book recommend." See `reason-DECISIONS.md` **D31** for the full guard rationale and
`feature-vector-glossary.md` §11 for the reader-facing field contract; this section records the
validated boards and the implementation seam.

**The four guards** (`computeOpeningContext.mjs`, shared by `reasonEngine.mjs` and production
`explainContext.js` — one mechanism, no duplication after the post-B5-review extraction):
1. on-book prefix (`matchOpeningPrefix`, mirror-normalized against 5 parsed `allen-*` KB lines);
2. beneficiary is the mover (`player === 1` — every parsed KB line is a first-player win);
3. **book move is solver-verified best via SCORE-EQUALITY**: `scores[bookNextCol] === bestScore &&
   bestScore > 0` — **not** `bookNextCol === bestCol` (a tied book move can legitimately differ from
   the engine's own argmax `bestCol` under equally-winning ties);
4. specific `id` vs. shared `family` (`id: null` on a multi-line shared prefix is correct, not a gap).

A `centrality` fallback (reusing `detectCenterDominance`) fires when Guard 1 fails (off-book) or a
later guard fails on an otherwise on-book prefix (e.g. Guard 3 fails because the book move isn't
solver-best) — so `centrality` can legitimately appear on a technically on-book position.

### Validated boards (Task B2's I12 table, solver-verified via `optimal_line.mjs` + direct queries)

All boards below are genuine first-player winning positions (`optimal_line` confirms P1 wins from
each), so every P1-to-move board is a real blunder opportunity and the P2-to-move board is a genuine
losing-side counterexample.

| board | played | player | what it demonstrates | `openingContext` |
|---|---|---|---|---|
| `3333` | col 0 | 1 | shared KB prefix (matches both `allen-5-4-opening` and `allen-candlesticks-opening`'s stems) → honest `id: null` + `family` only, Guards 1–4 all pass | `namedOpening{id:null, family:'central-column opening', matchedPrefixLen:4, bookNextCol:3}` |
| `333331` | col 0 | 1 | unique direct-orientation match, single KB id | `namedOpening{id:'allen-candlesticks-opening', matchedPrefixLen:6, bookNextCol:1}` |
| `333335` | col 0 | 1 | unique **mirror-reflected** match (col 5 = 6−1) — the mirror-normalization path, same id as above | `namedOpening{id:'allen-candlesticks-opening', matchedPrefixLen:6, bookNextCol:5}` |
| `3332223` | col 0 | **2** | Guard 2 negative counterexample — 7 plies means player 2 to move, so the beneficiary check fails even though the prefix matches; also the losing side, so no blunder scope at all | absent |
| `32` | col 0 | 1 | Guard 3 negative counterexample — the book's next column (col 6, score +1) is on-book but is NOT the solver-verified best (unique best is col 5, score +2); falls through to the geometric fallback rather than a false "best" claim | `centrality{bestCol:5, playedCol:0, betterHasMoreLines:true, text:…}` — **not** `namedOpening` |
| `30` | col 1 | 1 | genuinely off-book (Guard 1 fails, no KB prefix match at all) but the better move (col 3) is still more central than the played move (col 1) | `centrality{bestCol:3, playedCol:1, betterHasMoreLines:true, text:…}` |

A cross-branch mutual-exclusivity test additionally confirms `namedOpening` and `centrality` never
both appear on the same evidence object.

### Opening defense (`openingContext.defense`)

D32 adds a third mutually-exclusive mode, `defense` — the second-player mirror of `namedOpening`,
for a mover who is on a known KB opening line but is the theoretically **losing** side
(`case === lose_to_faster_lose`). It answers "what is the least-bad move that resists longest," not
"what wins" — there is no winning connection to recommend. Three required guards: on-book prefix match
(`matchOpeningPrefix`, shared with `namedOpening`), player 2, and `case === lose_to_faster_lose`.
`bestDefenseCol = bestCol` (the solver's own least-bad argmax) — unlike `namedOpening`'s Guard 3, there
is **no `bookNextCol`-equality requirement**. Precedence is `namedOpening` → `defense` → `centrality`.

**Owner correction (2026-07-05):** the originally planned "companion suppress-fix" — silencing
`centrality`'s win-oriented framing on a provably losing board — is **dropped**. Instead, both `defense`
and a losing-P2 `centrality` carry `resistAndWait: true` plus a conditional citation of KB
[`allen-parity.md`](../knowledge-base/allen-parity.md)'s even-row canon ("Even-row threats (rows 2, 4,
6): Favour the second player") — stated as **general strategic canon only**, never as a per-board claim
that a specific cell is a confirmed even-row threat (that would re-fabricate the parity claims D24-F3
retracted). `centralityGrounded = detectCenterDominance(...) != null` is conditional and honest per
board — see the table below.

### Validated boards (verified via `TOOLS/compute_feature_vector.mjs`, 2026-07-05)

| board | played | player | demonstrates | `openingContext` |
|---|---|---|---|---|
| `3333344` | col 2 | 2 | unique id, no centrality clause (equidistant cols) | `defense{id:'allen-5-4-opening', family:'central-column opening', matchedPrefixLen:7, bestDefenseCol:4, centralityGrounded:false}` |
| `333` | col 4 | 2 | shared prefix → family only; centrality clause fires | `defense{id:null, family:'central-column opening', matchedPrefixLen:3, bestDefenseCol:3, centralityGrounded:true}` |
| `333331` | col 0 | 1 | `namedOpening` UNCHANGED (regression anchor — `defense` never displaces it on a P1 board) | `namedOpening{id:'allen-candlesticks-opening', family:'central-column opening', matchedPrefixLen:6, bookNextCol:1}` |
| `305` | col 1 | 2 (off-book) | `centrality` NOT suppressed for a losing mover; carries `resistAndWait:true` | `centrality{bestCol:4, playedCol:1, betterHasMoreLines:true, text:'In the opening, the more central a column is, the more four-in-a-row lines run through it, so it can take part in more future threats and shapes. Column 5 sits in more of those lines than column 2, so playing there keeps more ways to build a winning connection open, while the less central choice gives some of them up.', resistAndWait:true}` |

The `305` row is the same board Task 1 used to close the opening-defender reason gap (memory `project_reason_opening_traps`); its
`route`/`tag`/`direction` (`realized_denied`/`double_threat`/`enabled_opponent`) also fire on this
board, orthogonal to `openingContext`.

**Known v1 boundary (not a bug):** transposition (reaching a documented line via a different move
order) is not detected — the matcher is a literal, mirror-normalized prefix match against recorded KB
worked-example movestrings, not a canonicalized board-state search. A board that is strategically on a
known line but arrived at by a different move order gets no `namedOpening` credit. See D31.

**Render-layer boundary:** the condition-D render layer (`causalLinks.mjs`/`buildRenderDecision`) is
NOT wired for `openingContext` — the frozen condition-D corpus contains no opening boards, so there is
no `render_decision` for any opening board. Production `explainContext.js`/`llmCoachHelpers.js`
grounds `openingContext` directly into a `## Opening theory` prompt section, independent of the
render-layer pipeline. Grading an opening case (any condition) verifies claims via the three board
checks in the glossary/grader, never by expecting a `render_decision`.
