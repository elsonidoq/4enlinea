# eval-15 — verdict: PAYLOAD_UNGROUNDABLE (compounded INSUFFICIENT)

**One-line verdict:** The canonical "dual-line" reason cannot be built from the vector — the
engineered vector carries ONLY the player's missed win (`decisiveLine.opponent = null`); the
enabling opponent line is absent. Even if both lines were present, a single `completingCell` + a
templated `betterMoveDoes` cannot honestly express that BOTH lines pivot on the SAME surrendered
cell `c1r3`, which is the actual reason the move loses.

## Case facts
- movestring `3333302555551413111222444416` (28 discs), Green (P1) to move.
- playedCol 0 → score **-6 (LOSS)**; bestCol 2 → score **+2 (WIN)**. FLIP win→loss. severity 2.
- Per-col solver scores: `[-6, --, 2, --, 2, 2, 2]`.

## The geometry — both lines pivot on c1r3
Column 0 (display col1) is a zugzwang stack: `r1=Gray(filled)`, `r2=empty(next)`, `r3=c1r3`,
`r4=c1r4`.
- **c1r3 is the contested square.** It completes **Green's horizontal** four on row3:
  `[c1r3,c2r3,c3r3,c4r3]` (c2r3,c3r3,c4r3 are already Green). It is ALSO the missing link in
  **Gray's diagonal** `[c1r3,c2r4,c3r5,c4r6]` (c2r4,c4r6 already Gray).
- Whoever is forced to play `r2` (col0) lets the OPPONENT take `r3 = c1r3`.

Solver-confirmed optimal lines (TOOLS/optimal_line.mjs):
- **Best (col2):** Green WINS, completingCell **c1r3**, window `[c1r3,c2r3,c3r3,c4r3]` (horizontal),
  ply39. Green plays col2 (waiting/zugzwang) and eventually claims c1r3.
- **Played (col0):** Gray WINS, completingCell **c3r5**, window `[c1r3,c2r4,c3r5,c4r6]` (diagonal),
  ply32. Line: `p30 Gray col0 (takes c1r3) → p31 Green col0 (forced, c1r4) → p32 Gray col2 (c3r5)`.
  Green's own col0 fills `r2` and hands Gray the contested cell c1r3 on Gray's turn.

So the move is a TRUE missed_own + enabled_opponent dual, but **both lines route through c1r3** —
Green's win uses c1r3; Gray's win is enabled by taking c1r3 first (its terminal completingCell c3r5
is a 2-step completion).

## Register
`TOOLS/forward_distance.mjs`: played col0 forwardPlies=3 → **forced_sequence** (Gray forces the win
in 3 plies). Best col2 forwardPlies=11 → slow_zugzwang. Register differs by which line you describe.

## Routed kind (ACTUAL)
FLIP ladder: parity_control? `parity_cells.mjs`: Green (P1) zThreatCells `[]`; Gray (P2) z_threat
`c1r4`. No same-perspective NON-EMPTY kept/surrendered pair for the winning side → does NOT route
parity_control. Routes **concrete_line** (matches catalog). The parity is WHY c1r3 is contested, but
the payload kind is concrete_line.

## Hand-built payload — and why it can't carry the story
From the VECTOR ALONE (`print_lookahead`, depth 26), the only decisive line available is:
```json
{ "register":"forced_sequence", "kind":"concrete_line",
  "outcomeDelta": { "best":"win", "played":"loss" },
  "line": { "winner":"player", "completingCell":"c1r3", "col":0,
            "winningLines":1, "realizedOnPly":10 },
  "betterMoveDoes": "Playing c3r1 (col2) completes your win at c1r3 — register forced_sequence." }
```
because `decisiveLine.opponent = null` and `oppCategoryExamples = []` at every depth tried (22/26).
**The vector never surfaces Gray's diagonal at c3r5.** A payload builder driven by the FV alone
would emit Option B above and silently DROP the enabled_opponent fact entirely. `betterMoveDoes` is
templated to bestCell + payload cell(s) only; since c3r5 is nowhere in the vector, it cannot even be
named.

The alternative (Option A, line = opponent punishing diagonal `{winner:opponent, completingCell:c3r5}`)
is not derivable from the vector at all, and even if hand-injected, its templated `betterMoveDoes`
could reference only bestCell + c3r5 — it could NOT name c1r3, dropping the missed_own win.

**Either way one decisive fact is lost. And the deepest fact is structurally unrepresentable:** that
the SAME square c1r3 is simultaneously the player's winning cell and the opponent's enabling cell —
i.e. the move loses precisely because it surrenders the one contested square. A coach handed
`completingCell: c3r5` would point at the diagonal and miss that the real error was letting Gray onto
c1r3 in column 0; a coach handed `completingCell: c1r3 (winner:player)` would never learn the move
hands Gray a win.

## §14 grader checks
- Cells exist on snapshots: yes (c1r3 both boards; c3r5 on played terminal). 
- outcomeDelta matches solver: yes (best win / played loss).
- register matches forward bucket: forced_sequence for the punishing line (3 plies). PASS only for the
  opponent line; the FV-derivable player line would carry slow_zugzwang (11) — register is ambiguous
  because the two lines have different forward distances.
- completingCell re-solve-confirmed decisive: c1r3 decisive for Green ✓; c3r5 decisive for Gray ✓ —
  but c3r5 is a 2-step completion whose pivot (c1r3) the payload cannot flag.
- The mechanical check PASSES for a single-line payload, yet it does NOT explain the mistake.

## Missing signal + proposal
1. **Vector gap (primary):** for win→loss FLIPs the engineered vector sets `decisiveLine.opponent =
   null` / `oppCategoryExamples = []` — the opponent's punishing line is not computed. The "dual-line"
   reason the epic claims for this case has no data source. *Proposal:* populate an opponent decisive
   line (run the mistake-repaired OPTIMAL search on the played branch, the way optimal_line.mjs does)
   so the vector carries BOTH lines.
2. **Schema gap:** `line` holds ONE `completingCell`; `betterMoveDoes` is templated with no free
   narrative. Neither can express a cell that is shared between the player's win window and the
   opponent's win window, nor a 2-step enabling→completing chain. *Proposal:* either (a) a `pivotCell`
   field on `line` flagged `sharedWithOpponent: true` + an `enables` window, or (b) a distinct
   `dual_line` kind carrying `{ contestedCell, playerWindow, opponentWindow, enablingMove }`. A single
   line + one templated clause is not expressive enough to carry the second line honestly.

## Redundancy
Likely makes redundant any other concrete_line FLIP case of the **shared-cell zugzwang** family
(best=win / played=loss where the player's own winning cell is the very square surrendered to the
opponent), AND any win→loss FLIP that would need `decisiveLine.opponent` (currently always null) to
build its punishing line. Both failure modes are demonstrated here.

## tools_used
visualize_board.sh; print_lookahead.mjs (depth 22/26); TOOLS/optimal_line.mjs (both branches);
TOOLS/forward_distance.mjs; TOOLS/parity_cells.mjs (P1 & P2).
## tools_created
none (reused existing).
