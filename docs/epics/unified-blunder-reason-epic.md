# Unified Blunder-Reason Field Epic (the dual-PV reason)

**Status:** ready for spec (created 2026-06-28; **verified + revised 2026-06-28** against the golden-fixture
verification pass — `reason_audit/REPORT_verify.md`). **Supersedes** `docs/epics/blunder-reason-field-epic.md`
(iteration 2). This is **iteration 3** of the Feature-Vector Sufficiency trajectory. It replaces that
epic's five-kind discriminated union and its routing ladder with a **single mechanism** and fixes the
rungs the sufficiency audit (`connect-four/server/scripts/reason_audit/REPORT.md`, 2026-06-28) proved
unsound or vacuous. The pre-implementation verification (20 hand-derived golden reasons) then found one
remaining design defect — the §7 "both-win, better sooner → `line`" row fabricated (eval-43) — now fixed by
the **discriminating-four test** (§5): a same-floor move is a blunder only on a *distinct* winning four or a
*material* same-window acceleration, never a faster win/loss of the identical four. The exact same-floor
acceleration threshold (§14 dec. 5) is deferred to post-implementation calibration (Story F), defaulting to
`not_a_blunder` until signed off.

**Owner artifact under test:** the **feature vector** (`toFeatureVector` in `server/explainContext.js`)
+ the **glossary** (`docs/architecture/feature-vector-glossary.md`). This epic improves *those*, not the
model. End goal: the vector must let a coach give the player **concrete, board-grounded feedback on why
the played move is worse than the best move — or honestly say there is no move-level lesson — never
fabricating.**

---

## 1. Why this exists

The previous epic added a `reason` field as a **five-kind discriminated union**
(`concrete_line` / `parity_control` / `positional` / `resistance` / `conversion`) routed by a ladder.
The sufficiency audit (19 of 66 `eval_set_large_3.json` cases deep-analyzed, evidence in
`reason_audit/cases/`) found that, as designed, only ~18% of cases got an honest, grounded reason. The
substance failures were structural, not cosmetic:

- **`parity_control` was unsound** — it derived control from local empty-square parity, which contradicts
  the solver (eval-5's controller wins on an *even* empties-beneath count, eval-49's on *odd*; the
  claimeven "rule of parity" called a solver-confirmed **win** a **draw** in eval-2/eval-40).
- **`positional`/`center_control` fabricated** off the empty board — line-centrality is solver-monotone
  on the opening (eval-0) but **inverts** mid-game (eval-1's *losing* move sits in the *most* fours).
- **`resistance` / `conversion` payloads were vacuous** — `{loserSide, speed, punishable}` is
  byte-for-byte identical between the genuinely-instructive eval-42 and the no-lesson eval-8.
- **The opponent's winning line was missing from the vector** for win→loss flips (`decisiveLine.opponent`
  null) — the half that explains the blunder was absent.

The fix is to recognize that all five "kinds" are facets of **one** mechanism (Occam — see memory
`feedback_occam_principled_extrapolation`): **exhibit the winning four-in-a-row line(s) and compare their
availability/timing across the better and played branches.** The branches differ only in *whose* four and
*on which branch* it lands.

## 2. The design principle (the one mechanism)

For the decision under scrutiny, compute the **optimal principal variation (PV) for both the played move
and the best move** (solver-optimal both sides, to the decisive event), then **characterize how the two
PVs diverge.** The `reason` describes the winning four exhibited on each branch and how they differ. The
old "kinds" become a **derived `grain` label** read off the divergence depth — not a router.

Three irreducible facts, all solver-grounded and mechanically checkable:
1. **Outcome delta** — best vs played ∈ {win, draw, loss} (from the solver on the pre-move board).
2. **The decisive four** — the concrete completing cell + 4-window + completion ply on each branch
   (from the PV / a re-solve), when one is nameable.
3. **Register** — the exact completion ply (from the score magnitude), phase-aware.

The hard constraint, inherited and strengthened: **`reason` never fabricates.** Every clause is gated on
a solver/search check; where no honest board-grounded reason exists, the field says so explicitly
(`zugzwang_class` or `not_a_blunder`) rather than inventing one.

## 3. Empirical findings (load-bearing — verified during the audit; the spec must not re-derive)

1. **Forward distance is `43 − 2·|score| − currentDiscs`** (verified: eval-6 played `score −1`, 18 discs →
   23 plies = the documented terminal ply; eval-0 `score 1`, 0 discs → 41). The live
   `outcomeTiming.pliesToEnd = Math.abs(score)` is **inverted** (smaller magnitude = later). Story A of
   the prior epic repairs this; it is carried forward unchanged.
2. **The dual PV already exists as a tool** — `reason_audit/TOOLS/optimal_line.mjs` walks both sides
   solver-optimal to the terminal completing cell/window. The decisive line is **not** reliably in the
   frozen lookahead (eval-6's winning diagonal surfaces only as a mislabeled `minor_threat`), so the
   completing cell must come from this re-solve, never from frozen `categoryExamples`.
3. **`decisiveLine.opponent` is null for win→loss flips beyond the immediate horizon** (Case-1
   short-circuit suppresses the opponent search): eval-15/29/46/51. It is **present** when the opponent's
   win is an on-board immediate/double threat (eval-32, realizedOnPly 1). So the opponent line must be
   computed by an optimal re-solve of the played branch on every flip-to-loss.
4. **Control/ownership must come from the solver outcome flip, named by ROW parity** (odd→P1, even→P2) —
   **never** from empty-square/empties-beneath parity counts (those contradict the solver: eval-5/49,
   eval-2/40). Row parity names *whose* threat (100% correct); the solver flip says *who controls*.
5. **Line-participation (4-windows through the landing cell) is solver-monotone only on the opening.**
   Empty board: counts `[3,4,5,7,5,4,3]` exactly rank the solver scores `[-2,-1,0,1,0,-1,-2]`. By 3 discs
   it inverts (eval-1: the losing col4 lands in 9 windows vs the drawing col3's 6). So it is honest only
   on a near-empty board where it is monotone with the solver across the candidate moves.
6. **A same-floor move (both win / both lose) is a real blunder only if a discriminating winning four is
   reachable** (it has no outcome delta to carry the explanation otherwise). Audit: of ~19 sampled
   same-floor cases, ~8 had a discriminating opponent/player line (groundable), the rest were
   "you-were-already-decided / not-a-blunder."
7. **The terminal four of a losing/winning PV is canonical only when forced.** eval-6 (18 discs, locked
   zugzwang) → the board-fill cell is unique and nameable. eval-1 (3 discs) → many interchangeable
   optimal lines end at different squares → the terminal cell is **non-canonical**, must not be named.
8. **Grain-3 (mechanism-class) needs the outcome delta to discriminate**, so it is **flipping-only**;
   same-floor diffuse cases are `not_a_blunder`, not grain-3.

## 4. The `reason` field (the contract)

A single object on `lookahead` (or top-level — spec author chooses; glossary in lockstep). Shared header
+ one grain-specific body. Honest-negatives are **truthy enum words** (never `false`/`0`/`[]` — those are
pruned by `toFeatureVector` and the answerer's `pruneVector`).

```jsonc
"reason": {
  // ── ALWAYS present ──
  "outcomeDelta": { "best": "win"|"draw"|"loss", "played": "win"|"draw"|"loss" },
  "register": {
    "bestPlies":   <int>|"none",     // forward distance of the better move (null→"none" for draws)
    "playedPlies": <int>|"none",
    "phase":  "opening" | "midgame" | "endgame",
    "word":   "immediate" | "forced_sequence" | "slow_zugzwang" | "opening"  // narration sugar; bestPlies is authoritative
  },
  "grain":  "line" | "line_parity" | "opening_principle" | "zugzwang_class" | "not_a_blunder",
  "winner": "player" | "opponent" | "none",     // whose four is the crux ("none" for not_a_blunder/opening drawn)
  "betterMoveDoes": "<templated from verified fields ONLY — see §8>",

  // ── EXACTLY ONE body, keyed by grain (others pruned) ──

  // grain = "line": a concrete winning four is nameable on the crux branch (covers flip-to-loss /
  // flip-to-win / both-win conversion / both-lose resistance / forced-terminal zugzwang like eval-6).
  "line": {
    "playedLine": { "completingCell":"cNrM", "window":["cNrM",...], "completingPly":<int>, "forced":"yes"|"no" } | "absent",
    "bestLine":   { "completingCell":"cNrM", "window":["cNrM",...], "completingPly":<int>, "forced":"yes"|"no" } | "absent"
    // at least one of playedLine/bestLine present; both present when both branches resolve to a four
  },

  // grain = "line_parity": the completing four is a STANDING threat whose OWNERSHIP flips (parity/zugzwang
  // with the threat already on the board). Same line body PLUS:
  "parity": {
    "controller": "player"|"opponent",   // FROM THE SOLVER FLIP — never a parity count
    "mechanism":  "z_threat"|"claimeven",
    "ownerParity":"odd"|"even",           // row parity of the controlling cell (descriptive)
    "surrenderedCell":"cNrM"|"none",      // your threat the played move gave up (flip)
    "enabledCell":"cNrM"|"none"           // opponent threat the played move handed over
  },

  // grain = "opening_principle": near-empty board, no threats; line-participation is solver-monotone.
  "principle": {
    "name": "line_participation",
    "bestCellFours":   <int>,   // 4-windows through the better move's landing cell
    "playedCellFours": <int>    // 4-windows through the played move's landing cell (strictly fewer)
  },

  // grain = "zugzwang_class": FLIPPING, diffuse — no nameable/canonical cell. Mechanism-class only.
  "zugzwang": {
    "noThreatWithinPlies": <int>   // forward search confirmed NO major threat for either side within H plies
  }

  // grain = "not_a_blunder": same-floor with no discriminating reachable line. Body is just the header
  // (outcomeDelta best==played) + winner:"none"; betterMoveDoes states "the position was already
  // decided; this move did not change the result reachably."
}
```

## 5. The routing algorithm (deterministic IF-THEN; reads off the dual-PV divergence)

Compute first, always: `outcomeDelta` (solver, pre-move), `register` (forward distance both moves), and
**both optimal PVs** (`optimal_line` on the best branch and the played branch).

```
LET flip = (outcomeDelta.best != outcomeDelta.played)

# 1. Same-floor with nothing to exhibit → not a blunder
IF (not flip) AND (no DISCRIMINATING winning four is reachable on either PV — see the test below):
    → grain = "not_a_blunder"           # both win / both lose, no distinct four, no material acceleration

# 2. A discriminating winning four IS nameable → name it
ELSE IF a winning four is re-solve-confirmed decisive on the crux branch
        (a threat that appears in one branch & dies in the other, OR a same-window opponent line
         MATERIALLY accelerated on the played branch [same-floor; see the G5 test], OR the player's
         forgone win on the best branch, OR a FORCED terminal board-fill four):
    IF that four is a STANDING threat whose ownership flips (parity/zugzwang, threat already on board):
        → grain = "line_parity"         # controller from the solver flip; cell by row parity
    ELSE:
        → grain = "line"

# 3. No threat nameable, but the board is a near-empty opening where line-participation is solver-monotone
ELSE IF board is near-empty AND line-participation ranks the candidate moves consistently with the solver:
    → grain = "opening_principle"        # eval-0 / col0,col1 opening

# 4. Flipping, diffuse: no nameable/canonical cell (non-canonical terminal, no threats in horizon)
ELSE IF flip:
    → grain = "zugzwang_class"           # eval-1/2/24/37/40 — mechanism-class, no cell

# (same-floor never reaches grain 3/4: covered by 1 or 2)
```

**Discriminating-four test (the same-floor `line` vs `not_a_blunder` gate — was unsound; fixed here):**
A same-floor move (best == played outcome) is a blunder worth a `line` reason **iff** at least one holds:
1. **Distinct four:** the crux winning four's window/cell **differs** between the two branches' optimal
   PVs (a forgone player four, or an enabled opponent four the other branch does not have). The machine
   test is window inequality: **identical `winningWindows` across both branch PVs ⇒ `not_a_blunder`,
   regardless of ply gap.** (This is what makes a faster *win* of the same four a preference, not a
   blunder — a both-win move never qualifies on timing alone; it needs a distinct forgone/enabled four.)
2. **Material acceleration (both-lose only):** the **same** opponent four completes materially sooner on
   the played branch than on the best branch. The threshold for "material" is **§14 open decision 5**
   (NOT yet pinned — calibrated post-implementation by Story F). **Until calibrated, the conservative
   default is `not_a_blunder`** — a borderline same-floor acceleration emits `not_a_blunder`, never a
   fabricated `line` lesson from a marginal acceleration.

Otherwise → `not_a_blunder`.

**Deterministic sub-rules:**
- IF the played move flips to a loss → run the **optimal-mode** punishment re-solve of the **played**
  branch and populate the opponent line (fixes `decisiveLine.opponent` null). Mistake-mode lines are
  phantoms — never used.
- **Decisiveness gate (operative criterion):** a cell may be named **only when** it **(a)** completes its
  four under the **optimal re-solve of its branch**, OR **(b)** it is the **forced terminal board-fill**
  cell. `winningLines>1` is at most a **fast pre-filter** — neither necessary nor sufficient, and may
  **never alone admit or reject** a cell. (A forced fork can read `winningLines:1` yet be decisive —
  eval-51; a parity/board-fill cell can read locally *blockable* yet complete decisively at the fill —
  eval-5/eval-49. Both are admitted by (a)/(b).) For a `winner:opponent` cell the decisiveness witness is
  the **played-branch optimal re-solve reaching that cell**, never the mover-oriented `decisive_check`.
- IF the terminal four is **not forced** (many optimal lines end at different squares) → do **not** name
  it; fall to `zugzwang_class` (flip) or `not_a_blunder` (same-floor).

## 6. Register definition (forward distance, phase-aware)

`register.bestPlies` / `playedPlies` = `43 − 2·|score| − currentDiscs` (draws → `"none"`). The **exact ply
is authoritative**; `phase ∈ {opening, midgame, endgame}` and `word ∈ {immediate, forced_sequence,
slow_zugzwang, opening}` are **distinct** fields (do not store a `word` value in `phase`). `word` is
narration sugar bucketed from the ply, **phase-aware**:
- `phase = opening` is keyed on the **resolution horizon, NOT the current disc count.** A near-empty board
  whose win resolves ~41 plies out (eval-0) is `opening`; but a 2–3-disc board whose loss resolves only at
  **board-fill** (eval-1 at 2 discs, eval-2 at 3 discs) is a deep zugzwang, **not** `opening` — so a low
  `currentDiscs` must **not** by itself force `phase = opening`. Operationally: `phase = opening` only when
  the board is near-empty **and** the outcome is an opening-style resolution (the move is not driving a
  near-board-fill zugzwang). When `phase = opening`, `word = "opening"` regardless of ply.
- else `word`: `immediate` (≤2), `forced_sequence` (≤10), `slow_zugzwang` (near board-fill). The exact
  band cutoffs are **§14 open decision 1** (narration only — the exact ply is always carried).

The only structurally special boundary is **win-in-one** (the move itself completes/concedes a four). No
solver score or raw magnitude is exposed — plies-to-completion is a board fact ("the opponent connects
four N moves from now"), not solver vocabulary.

## 7. Per-category coverage (the transition matrix)

| outcome category | typical grain | what is exhibited |
|---|---|---|
| **flip, win→loss / draw→loss, opponent line nameable** | `line` (winner opponent) | the opponent four on the played branch (optimal re-solve); `betterMoveDoes` = the block / forgone win |
| **flip, win→draw / draw→win, player line nameable** | `line` or `line_parity` (winner player) | the forgone player four on the best branch; `line_parity` when it is a standing odd/even threat (eval-5) |
| **flip, forced terminal zugzwang** | `line` (forced:"yes") | the unique board-fill completing cell (eval-6 c7r6) |
| **flip, diffuse zugzwang** | `zugzwang_class` | no cell; outcomeDelta + slow register + "no threat within H plies" (eval-1/2/24) |
| **flip, near-empty opening** | `opening_principle` | line-participation counts (eval-0) |
| **both win, DISTINCT forgone four on best** | `line` (winner player) | a winning four available on best but **not** on the played branch (different window). Requires the discriminating-four test #1 to hold. |
| **both win, same four wins both branches (any ply gap)** | `not_a_blunder` | "both win; a preference, not a blunder" (eval-43 ~20-ply gap, eval-53/63). A faster win of the *same* four is **never** a blunder — §5 test #1. |
| **both lose, opponent four MATERIALLY accelerated on played** | `line` (winner opponent) | the same opponent four, materially sooner on played (eval-42/55); "material" per §14 dec. 5, default `not_a_blunder` until calibrated |
| **both lose, no distinct line / only marginal acceleration** | `not_a_blunder` | "already lost; not the move that cost you" (eval-8/64 — same four, ~2 plies sooner) |

Cross-cutting:
- **Dual-line (eval-15: missed own win AND enabled opponent):** the crux `line` is the one the outcome
  flip hinges on. The grain is **`line`** (no `parity` body), and the **second cell is self-carried by the
  dual-PV body** — `bestLine.completingCell` and `playedLine.completingCell` are both present, and a
  **shared pivot** is detected when `bestLine.completingCell ∈ playedLine.window` (or the best move's
  landing cell == `playedLine.completingCell`). When a shared pivot is detected, `betterMoveDoes` MUST
  render the "claim-vs-surrender the same square" framing (eval-15: col2 plants your disc on c3r5 — the
  exact square the opponent needs — while your c1r3 four still wins). Do **not** route dual-line through a
  `parity.surrenderedCell`/`enabledCell` body; those fields belong only to `line_parity`.
- **`defensive_miss` (eval-27/7):** the opponent four pre-exists; `line.winner = opponent`,
  `completingCell` from the pre-move board, `betterMoveDoes` = "the better move blocks at C." When
  same-floor (eval-7), this is still `line` (the block cell is the re-solve-confirmed punish cell), not
  the old vacuous resistance.

## 8. Soundness gates (the never-fabricate heart — every clause is checked)

1. **Outcome** from the solver pre-move query (fall back when `case:losing_either_way` vector labels are
   null — memory `project_feature_vector_content_traps`).
2. **A cell is named only when** it **completes its four under the optimal re-solve of its branch** OR it
   is the **forced** terminal board-fill cell. `winningLines>1` is a **fast pre-filter only** — never
   alone sufficient (a forced fork can read `winningLines:1` — eval-51) and never alone necessary (a
   parity/board-fill cell reads locally *blockable* yet completes decisively at the fill — eval-5/eval-49).
   **Never** the earliest-surfacing blockable threat; **never** a non-canonical diffuse terminal. For a
   `winner:opponent` cell the witness is the **played-branch optimal re-solve**, not `decisive_check`
   (which is mover-oriented and rejects opponent cells).
3. **Control/ownership** (`line_parity.controller`) comes from the **solver outcome flip**; the cell is
   named by **row parity**. **Never** from empty-square or empties-beneath parity counts.
4. **`opening_principle`** is emitted only when line-participation is **monotone with the solver** across
   the candidate moves. This **monotonicity check is the sole gate** — do **not** rely on a `register`/
   near-empty disc test to refuse it (eval-2 at 3 discs has `word="opening"` yet must be refused; the
   stacked-center landing has the MOST 4-windows yet only draws, so monotonicity is what catches it). It
   inverts mid-game — never emit it where the ranking is non-monotone.
5. **`zugzwang_class`** asserts "no immediate threat / decided at the fill" only when the forward search
   **confirms** no major threat for either side within the horizon, and only for **flipping** cases.
6. **`not_a_blunder`** is emitted for same-floor with **no DISCRIMINATING reachable line** (§5
   discriminating-four test: no distinct four, and any same-window acceleration is below the §14-dec-5
   threshold / defaults to `not_a_blunder` until calibrated) — **never** a "lasts longer / wins sooner"
   claim dressed as a blunder, and **never** a faster win/loss of the **identical** four.
7. **`betterMoveDoes`** is **templated from verified fields only** — it names `bestCell`, the payload's
   verified cell(s), and the `outcomeDelta`/`register` words, and asserts **no** mechanism (parity, fork,
   center, tempo) absent from the payload. Any extra causal clause is a defect.

## 9. Worked examples (the acid tests — verified on the board)

- **eval-6** (`444423333643535655`, draw→loss): `grain:"line"`, `winner:opponent`,
  `playedLine:{c7r6, window c4r3-c5r4-c6r5-c7r6, completingPly 42, forced:"yes"}`,
  `register.word:"slow_zugzwang"`. The cell is the forced board-fill four (canonical).
- **eval-32** (fast win→loss): `grain:"line"`, `winner:opponent`, played opponent fork at c3r3
  (`winningLines>1`), `register.word:"immediate"` (|score|=12, 18 discs → 1 forward ply — verified). The
  opponent line is on-board (surfaces directly).
- **eval-5** (win→draw, standing odd z-threat): `grain:"line_parity"`, `winner:player`,
  `parity:{controller player, z_threat, ownerParity even, surrenderedCell c3r4}`. Controller from the flip.
- **eval-0** (empty board, win→draw): `grain:"opening_principle"`, `principle:{line_participation,
  bestCellFours 7, playedCellFours 5}`, `register.phase:"opening"`.
- **eval-1** (`44`, draw→loss): `grain:"zugzwang_class"`, `zugzwang:{noThreatWithinPlies 20}`,
  `outcomeDelta {draw,loss}`, `register.word:"slow_zugzwang"`. No cell — diffuse, non-canonical terminal.
- **eval-42** (both lose, opponent four materially accelerated): `grain:"line"`, `winner:opponent`. The
  **same** opponent four at **c4r2** completes ~20 plies sooner on the played branch (ply 38 → 18);
  `betterMoveDoes` = "the better move delays the opponent's four at c4r2 by ~20 moves." (The verification
  corrected the cell: the earlier `c2r5` was a mistake-mode phantom; the optimal-mode re-solve yields the
  standing four c4r2 — §5 "use optimal mode, never mistake-mode.")
- **eval-43** (both win, ~20-ply gap, SAME four): `grain:"not_a_blunder"`, `winner:none`. Both branches win
  through the **identical** four c4r2 (window c3r2-c4r2-c5r2-c6r2); only timing differs. A faster win of the
  same four is a preference, not a blunder (§5 discriminating-four test #1). This is the acid test that the
  old "both win, better sooner → line" row fabricated.
- **eval-8** (both lose, no discriminating line): `grain:"not_a_blunder"` — "you were already lost."

## 10. User stories (build units; each independently testable)

- **Story A — Register (phase-aware forward distance).** Repair `pliesToEnd` to `43−2·|score|−discs`;
  add phase; bucket the `word`. Test: matches the solver forward-ply on known positions incl. an opening
  and a slow-zugzwang. (Carried from the prior epic's Story A.)
- **Story B — Dual-PV engine + opponent-line population.** Promote `optimal_line` into the pipeline: on
  every flip-to-loss run the optimal-mode re-solve of the played branch and populate the opponent line;
  add the decisiveness gate and the **forced-vs-diffuse** terminal test. **Precondition gate:** a
  characterization test on the shared `collectNovelOpportunities`/`compareOpportunities` seam (memory
  `project_lookahead_shared_seam`) green before any edit. Test: opponent line present for eval-15/29/46/51;
  forced terminal named for eval-6; diffuse refused for eval-1.
- **Story C — Parity ownership pass.** A same-perspective standing-threat detector that names the
  controlling cell by **row parity** and takes the **controller from the solver flip** (drops
  `detectZThreat`'s odd-only gate; never uses empty-square parity). Test: eval-5 grounds; eval-2/40 do
  **not** produce a (wrong) parity verdict.
- **Story D — Opening principle.** Line-participation count per landing cell, emitted only when
  line-participation is **solver-monotone** across the candidate moves (the monotonicity check is the SOLE
  gate — §8.4; do not use a register/disc test to refuse it). Test: eval-0 grounds; eval-1 and eval-2 do
  **not** (non-monotone — must not emit, even at 2–3 discs where `word="opening"`).
- **Story E — `buildReason` assembler.** New module called from `toFeatureVector`. Runs the §5 IF-THEN,
  assembles the §4 payload, templates `betterMoveDoes`, applies all §8 gates, emits `not_a_blunder` /
  `zugzwang_class` honestly. Implements the **discriminating-four test** (§5) so same-floor moves route to
  `line` only on a distinct four (window inequality) or a §14-dec-5-material acceleration, **defaulting
  borderline same-floor accelerations to `not_a_blunder`** until Story F calibrates the threshold. Glossary
  `reason` subsection in lockstep. Does **not** modify the shared seam.
- **Story F — Same-floor acceleration threshold calibration (post-Story-E; resolves §14 dec. 5).** A
  diagnostic harness, NOT a production-path change: it (1) **harvests new both-lose positions** via
  `gameSampling` (`harvestBlunders`), binned to populate the region **around** the provisional `line` ↔
  `not_a_blunder` boundary (the frozen 66 carry only one near-boundary datapoint, eval-64 — see §13
  carve-out); (2) for each borderline board renders the board (`visualize_board.sh`), the §4 `reason` the
  current assembler would emit, and **all three candidate metrics side by side** — absolute ply-gap
  (`best_fwd − played_fwd`), relative gap (`gap / best_fwd`), and opponent-fallibility breadth (reachable
  opponent decision points where a slip flips the result); (3) presents them sorted by each metric for
  **manual sign-off** on BOTH the metric and its value. The chosen metric+threshold is then written as a
  single named constant consumed by Story E's discriminating-four test (replacing the `not_a_blunder`
  default). Test/exit criterion: a human confirms comfort with the boards immediately on each side of the
  chosen cut. Until that sign-off, the production default stays `not_a_blunder`.

## 11. Settled decisions (reflect verbatim — do not re-derive)

- **One mechanism, `kind`→`grain` is a derived label, not a router** (user decision; supersedes the
  five-kind union). See memory `project_reason_field_unification`.
- **Decide by Occam** (memory `feedback_occam_principled_extrapolation`): one rule generates the grains.
- **The reason is the winning four-line comparison across both branches**; the PV is computed *internally*
  to find/validate the cell — only the cell + register are surfaced (the prior epic's "no full PV in the
  output" holds; the *method* now walks the line).
- **Control from the solver flip; cell by row parity; never empty-square parity** (§8.3).
- **Line-participation is opening-only and solver-gated** (§8.4).
- **Same-floor needs a discriminating line or it is `not_a_blunder`** (§8.6) — "losing fast / winning
  slower with nothing to exhibit is not a blunder."
- **Grain-3 (`zugzwang_class`) is flipping-only and asserts no-threat only when the search confirms it**
  (§8.5). For the deepest diffuse cases its job is **classification, not coaching** — it tells the player
  "this is a deep parity result, no move-level lesson," which is honest feedback, not OMIT.
- **No cell is invented; non-canonical terminals are refused** (§8.2, finding §3.7).
- **`betterMoveDoes` is templated from verified fields only** (§8.7).
- **Register is the exact ply, phase-aware; the word is sugar** (§6).
- **OMIT is reserved for solver error/timeout only.** Every real case emits a reason (`line` /
  `line_parity` / `opening_principle` / `zugzwang_class` / `not_a_blunder`) — 100% coverage, no silent
  omission. (User requirement.)

## 12. Non-obvious facts (traps the spec/plan must respect)

- The decisive line is **not** in the frozen lookahead (eval-6 mislabels it `minor_threat`); the cell must
  come from the re-solve (`optimal_line`), never from `categoryExamples`.
- `decisiveLine.opponent` is **null** for win→loss flips beyond the immediate horizon (Case-1
  short-circuit) — must be filled by the played-branch optimal re-solve.
- `detectZThreat` returns `cells:[]` when `perspective ≠ currentPlayer` (FR-033 path) and is odd-distance
  only — Story C must not depend on it as-is.
- `pliesToEnd` is currently `Math.abs(score)` (inverted); Story A repairs it.
- `bestOutcome`/`postBlunderOutcome` are null for `case:losing_either_way` — fall back to the solver.
- `collectNovelOpportunities`/`compareOpportunities` are the **shared production seam** — read, never
  modify; the short-circuit removal needs the characterization test.
- Movestrings are 0-indexed; every `cNrM` in the vector is 1-indexed.
- Runner `npm run test:fast` (never full `npm test`).

## 13. NOT included (out of scope)

- **No empty-square parity-counting engine** — control comes from the solver flip; parity counts are
  banned as a control signal (they are unsound).
- **No full move-sequence PV surfaced in `reason`** — the PV is internal; only the completing cell +
  register are emitted.
- **No production prompt rewrite** — `buildExplainContext`'s `lookaheadSection` must remain functional
  with no regression; it is not rewritten to consume `reason` (a later trajectory step).
- **No changes to blunder detection / tagging / `classifier.js` detection logic** — detectors are called,
  not changed (except Story C's new same-perspective row-parity pass, which is additive).
- **No re-running the answerer / re-grading inside the epic** (separate user-triggered step).
- **No generalization/held-out validation of the reason logic** — scope is 100% on the 66
  `eval_set_large_3.json` cases; the overfitting risk is accepted (user decision). **Carve-out (Story F
  only):** the same-floor acceleration threshold (§14 dec. 5) is genuinely under-determined by the 66
  (one near-boundary datapoint), so Story F **may harvest new both-lose positions** purely to calibrate
  that one threshold by manual sign-off. This is a bounded calibration of a single constant, NOT held-out
  validation of the grain/router logic — the reason logic is still verified only against the 66 golden
  fixture.

## 14. Open decisions (resolve in `/clarify` or the spec — do not invent silently)

1. **Register `word` cutoffs and the `phase=opening` disc threshold** — derive empirically from the 66
   cases so the bands separate the known cases; the exact ply is always carried, so this only affects
   narration.
2. **The forward-search horizon `H`** for the opponent re-solve, the forced-vs-diffuse test, and
   `zugzwang_class.noThreatWithinPlies`. The audit measured the optimal-mode + dedupe search cheap to
   depth ≥24 (~300 calls, <200 ms); pick a fixed deep cap and confirm it grounds eval-6 (ply 42) while
   refusing eval-1 (diffuse). Decide whether `not_a_blunder` vs `zugzwang_class` needs a separate horizon.
3. **`opening_principle` "near-empty" + "solver-monotone" thresholds** — how many discs, and the exact
   monotonicity test across candidate moves.
4. **`line_parity` vs `line`** — the precise predicate for "the completing four is a *standing* threat
   whose ownership flips" vs a freshly created/forced line. *(Verification narrowed this: the discriminator
   is whether a STANDING same-perspective threat is actually present on the best branch — `parity_cells`
   non-empty and its ownership flips → `line_parity`; empty parity cells → `line`/`zugzwang_class`. eval-5/
   eval-49 ground as `line_parity`; eval-40/eval-2 do NOT. Confirm the exact predicate in `/clarify`.)*
5. **Same-floor "material acceleration" threshold (the `line` vs `not_a_blunder` boundary for both-lose)**
   — UNRESOLVED and **under-determined by the 66 cases** (only one near-boundary datapoint, eval-64). For a
   same-floor both-lose move where the **same** opponent four completes sooner on the played branch, how
   much sooner counts as a blunder (`line`) vs a preference (`not_a_blunder`)? The data does not even fix
   the **unit**: absolute ply-gap (`best_fwd − played_fwd`), relative gap (`gap / best_fwd`), or
   opponent-fallibility breadth (reachable opponent decision points where a slip flips the result) all fit
   the sampled `line` cases (eval-42/55/7) identically; the bracket from the data is only `gap ∈ (2, 8]`.
   **Do NOT bake the narration band cutoff (e.g. "10") into the router** — that compares each branch
   against an arbitrary absolute constant and is a knife-edge near the boundary. **Resolution = Story F**:
   calibrate empirically post-implementation against a harvested spread of near-boundary boards, choosing
   BOTH the metric and its value by manual sign-off. **Until calibrated, the router defaults borderline
   same-floor accelerations to `not_a_blunder`** (never fabricate). Both-WIN has no such threshold — it is
   settled by the distinct-four test (§5 #1), keyed on a different winning window, never on timing.

## 15. Grader acceptance test (the verifiability contract)

A generated `reason` is **accepted** iff a privileged grader (solver + `visualize_board.sh` + `checkWin` +
the `reason_audit/TOOLS`) confirms, by grain:

**Always:** every named cell exists on its stated snapshot board; `outcomeDelta` matches the solver;
`register.*Plies` match `43−2·|score|−discs`; `betterMoveDoes` contains only payload facts (no extra
mechanism clause).

- **`line` / `line_parity`:** the named four completes on its branch (re-solve), and the cell passes the
  decisiveness gate — **(a)** completes under the optimal re-solve of its branch OR **(b)** is the forced
  terminal board-fill cell. `winningLines>1` is a pre-filter only, **never** the acceptance criterion (a
  decisive forced fork may read `winningLines:1`; a parity/board-fill cell may read locally blockable). A
  `winner:opponent` cell is checked via the **played-branch optimal re-solve**, not the mover-oriented
  `decisive_check`. For a same-floor `line` (both-win/both-lose), the grader also confirms the
  **discriminating-four test** passed (distinct winning window between the branch PVs, OR a §14-dec-5
  material acceleration of the same opponent four). For `line_parity`, `controller` matches the solver flip
  and `ownerParity` matches the cell's row.
- **`opening_principle`:** `bestCellFours > playedCellFours` with both counts matching the geometric
  4-window count, AND the ranking is **solver-monotone across candidates** (the monotonicity check is the
  acceptance criterion — a board with `register.word="opening"` that is non-monotone is a DEFECT, not an
  acceptance).
- **`zugzwang_class`:** the case flips, `noThreatWithinPlies` is corroborated (no major threat for either
  side within that horizon on the played branch), and **no** cell is named.
- **`not_a_blunder`:** `outcomeDelta.best == outcomeDelta.played` AND the **discriminating-four test fails**
  — both branch PVs win/lose through the **identical** winning window (so a faster win/loss of the same
  four is correctly NOT a blunder), OR the same-window acceleration is below the §14-dec-5 threshold
  (default until calibrated). No cell is named.

If a `reason` is not mechanically verifiable, or it names a cell/controller the solver does not support,
it is a defect.

## 16. Acceptance criteria (epic-level)

- `reason` emitted by `toFeatureVector` in the §4 shape; glossary updated in lockstep; honest-negatives
  are truthy enums surviving both prunes.
- The §5 router + the five grains are produced; the §7 matrix is covered (flip / both-win / both-lose,
  dual-line, defensive_miss, parity, opening, diffuse).
- **All §8 soundness gates hold on the 66 cases** — verified against the **golden fixture** from the
  verification pass (`reason_audit/golden/*.json` + `GOLDEN.jsonl`; report `reason_audit/REPORT_verify.md`):
  every case is sound (no fabrication), concrete where the grain claims a cell, and correctly
  `not_a_blunder` / `zugzwang_class` where no lesson exists. The 20 analyzed golden reasons are the
  per-case acceptance targets; the remaining 46 map to a representative's template (coverage table in the
  report).
- The §9 worked examples emit the stated output (eval-6 forced cell; eval-1 zugzwang_class; eval-5/eval-49
  parity; eval-0 opening; eval-42 materially-accelerated opponent line at c4r2; eval-43/eval-8
  not_a_blunder).
- The production deep-reveal prompt builds with **no regression** (Story B characterization test green).
- Unit tests for register, dual-PV/opponent-line, parity ownership, opening principle, and `buildReason`
  (`npm run test:fast` green); frozen vectors regenerated.
- **Separate, user-triggered:** re-run the answerer + grader to measure the pass-rate delta.

## 17. Authoritative sources of truth

- `connect-four/server/scripts/reason_audit/REPORT.md` + `cases/` + `cases/UNIFY_*.md` +
  `cases/DESIGN_parity_*.md` — the iteration-2 audit and the design evidence (the requirements source).
- **`reason_audit/golden/*.json` + `GOLDEN.jsonl` + `REPORT_verify.md` + `verify_cases/`** — the
  pre-implementation verification pass (2026-06-28): the frozen per-case golden `reason` fixture (the
  implementation's acceptance target) and the defect list this iteration-3 revision resolves.
- `reason_audit/TOOLS/` — `optimal_line.mjs` (dual PV), `forward_distance.mjs` (register), `parity_cells.mjs`,
  `decisive_check.mjs`, `opp_punish_probe.mjs`, `forward_projection.mjs`. **Candidates to incorporate** —
  they prototype Stories A/B/C/D.
- `docs/architecture/feature-vector-glossary.md` (the contract under test), `feature-vector-sufficiency-experiment.md`.
- `server/sparseLookahead.js`, `server/explainContext.js`, `server/classifier.js`.
- Memories: `project_reason_field_unification`, `feedback_occam_principled_extrapolation`,
  `project_lookahead_shared_seam`, `project_feature_vector_content_traps`, `reference_c4solver_scores`,
  `reference_z_threat_detection`, `reference_claimeven_detection`, `feedback_deep_reveal_product_mindset`.
- `docs/best_practices_spec_driven_development.md`.

## 18. Pipeline justification

Single-subsystem (the feature-vector pipeline). Earns the speckit pipeline: **6 stories with real ordering
dependencies** (register → dual-PV → parity/opening → assembler → threshold calibration), a **high-risk
shared-seam edit** (the short-circuit removal, gated by a characterization test), **open design decisions**
(§14: horizons, thresholds, the line/line_parity predicate, and the §14-dec-5 same-floor acceleration
threshold deferred to post-implementation calibration in Story F), and durable counterexample→field
traceability (iteration 3 of a multi-pass trajectory, now with a frozen golden fixture). If §14 collapses
to trivial defaults during `/clarify`, downgrade to direct task-writing.
