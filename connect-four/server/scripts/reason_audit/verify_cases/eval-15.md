# eval-15 — VERIFY pass — verdict: **SOUND** (grain `line`, winner opponent)

**The iteration-2 `MISSING_FIELD` is RESOLVED by the iteration-3 dual-PV §4 contract.** The prior audit
(`cases/eval-15.md`) was against the engineered FV, which carried only the player's missed win
(`decisiveLine.opponent = null`) and a single `completingCell`. Iteration 3 computes **both** optimal PVs
and the §4 `line` body carries **both full windows + both completing cells**, so the shared pivot is
recoverable — no new field is required for this case.

## Case facts (reconfirmed)
- movestring `3333302555551413111222444416` (28 discs), Green (P1) to move.
- played col0 → score **-6 (LOSS)**; correct col2 → score **+2 (WIN)**. FLIP win→loss.
- Per-col solver scores `[-6, --, 2, --, 2, 2, 2]` (`forward_distance.mjs`).

## Dual-PV evidence (`optimal_line.mjs`)
- **BEST (`...16` + `2`):** Green WINS, completingCell **c1r3**, window `[c1r3,c2r3,c3r3,c4r3]`
  (horizontal), completingPly 39. Green's own move col2 **lands at c3r5**.
- **PLAYED (`...16` + `0`):** Gray WINS, completingCell **c3r5**, window `[c1r3,c2r4,c3r5,c4r6]`
  (diagonal), completingPly 32. Line `p30:Gray col0 (takes c1r3) → p31:Green col0 (forced, c1r4) →
  p32:Gray col2 (c3r5)`.

## Decisiveness (`decisive_check.mjs`)
- c3r5 on PLAYED: `DECISIVE (win completes through candidate under optimal defense)`, winnerIsPunisher
  true. → playedLine valid, `forced:"yes"`.
- c1r3 on BEST: PV-terminal at ply39 (zugzwang win); local gate `BLOCKABLE` (not an immediate tactical
  force) → it is the slow standing-threat win, so bestLine `forced:"no"`. Canonical: c1r3 is Green's
  ONLY standing threat (`parity_cells.mjs` P1 allThreatCells `[c1r3]`; visualize `[Gn]` major).

## Register (`forward_distance.mjs`)
- played col0: forwardPlies **3** → forced_sequence (= 43 − 2·6 − 28).
- best col2: forwardPlies **11** → slow_zugzwang (= 43 − 4 − 28).
- Both carried in payload (`bestPlies:11`, `playedPlies:3`); `word` keyed to the punishment speed
  (forced_sequence). phase=endgame (28/42 discs).

## CRITICAL TEST — can §4 `line` express the SHARED pivot? **YES — two independent carriers, both
## from verified fields (no `parity.surrenderedCell`/`enabledCell`, no dual schema needed):**
1. `bestLine.completingCell` = **c1r3** ∈ `playedLine.window` `[c1r3,c2r4,c3r5,c4r6]`.
   → window intersection recovers c1r3 (the player's win cell = the opponent's enabling cell).
2. `bestCell` (col2) lands at **c3r5** = `playedLine.completingCell`.
   → the better move physically occupies the opponent's completing square (denies the diagonal).
   This is derivable from the pre-move board + bestCell column height.

Both shared cells (c1r3, c3r5) are present as verified `line`-body fields. `betterMoveDoes` (§8 gate 7)
names `bestCell`, both completingCells, and the register words — every clause grounded. The story
"claim the contested square yourself vs surrender it" is fully expressible.

## Refutation duties — all discharged
- (a) optimal_line both branches → both completing cells + windows produced (above).
- (b) decisive_check on c3r5 (DECISIVE) and on c1r3 (PV-terminal, standing-threat zugzwang win).
- (c) shared pivot IS expressible in §4 — via `bestLine.completingCell ∈ playedLine.window` AND
  `bestCell-landing == playedLine.completingCell`. No `MISSING_FIELD`.
- (d) both moves registered: col0 playedPlies 3, col2 bestPlies 11.

## Grain justification
flip=true. Router rule 2: opponent line on played branch is re-solve-confirmed decisive. The CRUX four
(the one the flip hinges on, played→loss) is the **opponent diagonal** — NOT a standing on-board threat
(needs c1r3 AND c3r5, both empty pre-move) → router ELSE → **`line`**, winner opponent. (Matches §7
matrix row "flip, win→loss, opponent line nameable → line (winner opponent)". `line_parity` is reserved
for winner=PLAYER standing-threat flips, e.g. eval-5 win→draw.)

## Defect — MINOR (doc inconsistency, non-blocking; general fix, not per-case)
§7 line 216 says the dual-line "other cell is named in `parity.surrenderedCell`/`enabledCell` or
templated `betterMoveDoes`." But for grain=`line` there is **no** parity body, so that field reference is
dangling/misleading. Minimal GENERAL fix: clarify §7 that for grain=`line` dual-line cases the second
cell is carried by **`bestLine.completingCell`** (already in the body) and that `betterMoveDoes` MUST
detect a shared pivot via `bestLine.completingCell ∈ playedLine.window` (or `bestCell-landing ==
playedLine.completingCell`) and render the "claim-vs-surrender the same square" framing. (Residual
sub-family safeguard: if a future shared-pivot case has the enabling move BLOCK and win via a different
window not containing the enabling cell, promote `surrenderedCell`/`enabledCell` to optional header-level
fields so grain=`line` can carry it too. eval-15 itself does not need this — its enabling cell is inside
the opponent window.)

## player_sentence
"Col0 looked safe but it surrenders the contested square c1r3 in the column-0 zugzwang — the opponent
takes it and finishes a diagonal at c3r5. Col2 wins instead: it plants your disc on c3r5 (killing that
diagonal) while your row-3 three-in-a-row at c1r3 still connects."

## tools_used
visualize_board.sh; TOOLS/optimal_line.mjs (both branches); TOOLS/decisive_check.mjs (c3r5, c1r3);
TOOLS/forward_distance.mjs (col0, col2); TOOLS/parity_cells.mjs (P1, P2).
## tools_created
none.
