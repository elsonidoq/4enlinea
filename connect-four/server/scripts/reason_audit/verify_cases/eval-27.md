> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# eval-27 — VERIFY pass (forced_block / defensive_miss)

## verdict: SOUND
## grain: `line` (winner=opponent)

A pre-existing Green vertical threat at c2r5 is the crux. Gray (mover) must block by
landing on c2r5 (correct_move col1/0-idx = display col2) → win; the played move (col2/0-idx
= display col3) ignores it → Green completes the four at c2r5 next ply → immediate loss.
FLIP, no parity mechanism → `line`, winner=opponent. All clauses solver-grounded.

## Golden reason
```json
{
  "id": "eval-27",
  "grain": "line",
  "winner": "opponent",
  "outcomeDelta": { "best": "win", "played": "loss" },
  "register": { "bestPlies": 34, "playedPlies": 2, "phase": "immediate", "word": "immediate" },
  "line": {
    "playedLine": { "completingCell": "c2r5", "window": ["c2r2","c2r3","c2r4","c2r5"], "completingPly": 9, "forced": "yes" },
    "bestLine":   { "completingCell": "c6r6", "window": ["c3r3","c4r4","c5r5","c6r6"], "completingPly": 42, "forced": "no" }
  },
  "betterMoveDoes": "the better move blocks the opponent's threat at c2r5, turning a loss into a win"
}
```

## Case facts
- board_state `2115151` (7 discs), move_played col **2** (0-idx, display col3), correct_move col **1** (0-idx, display col2).
- Mover = Gray (P2). Opponent = Green (P1).
- preScores `[-17, 1, -17, -17, -17, -17, -17]` → bestCol=1 (+1 WIN), every other col -17 LOSS → FLIP, gap -18, severity 5.

## Refutation duties — all confirmed

### (a) Opponent threat pre-exists on the pre-move board — cell grounded, not invented
`parity_cells.mjs 2115151 1` (Green) → `allThreatCells:["c2r5"]`. Visualizer shows
`Major threats: col2 row5 (Gn) [GT]` (gravity-top vertical). The threat is Green's and
already standing on the pre-move board; the played move FAILED to remove it, did not create it.

### (b) Decisiveness of c2r5 on the crux (played) branch
`optimal_line.mjs 21151512` → `winner:first(Green/P1)`, `completingCell:c2r5`,
window `[c2r2,c2r3,c2r4,c2r5]`, `completingPly:9`, line `p9:Gcol1(s17)` — a single forced
reply, immediate vertical completion (score 17). Threat is alive in the played branch and
dead in the best branch → decisive.
Note: `decisive_check.mjs 2115151 c2r5` returns `NOT-THIS-CELL` because it is mover-oriented
(it simulates Gray occupying c2r5 = the block, then Gray wins slowly via c6r6). The relevant
decisiveness for winner=opponent is the played-branch `optimal_line`, which confirms it.

### (c) §5 router → `line`, winner opponent, block framing
flip = (best=win ≠ played=loss) = true. A winning four is re-solve-confirmed decisive on the
crux branch (Green's c2r5 alive-in-played / dead-in-best). Standing-threat-ownership-flip test:
`parity_cells.mjs 2115151 2` (Gray) → `[]` — Gray has no z-threat/claimeven, so there is no
parity mechanism; ownership does not flip, the block merely neutralizes. → NOT line_parity → `line`.

### (d) Both moves registered
`forward_distance.mjs 2115151 1 2`: col1 → win, forwardPlies 34, slow_zugzwang; col2 → loss,
forwardPlies 2, immediate. `bestPlies = 43 − 2·1 − 7 = 34`, `playedPlies = 43 − 2·17 − 7 = 2`. ✓

### (e) Cell came from the opp-perspective pass (FR-033 mover-perspective trap)
`parity_cells.mjs 2115151 2` (Gray / mover) → `allThreatCells:[]` — the mover-perspective
forced_block pass yields NO cells (FR-033). The grounded cell c2r5 comes ONLY from the
opponent-perspective (Green) pass. The defensive_miss branch must run that pass.

### completingCell == bestCell
`visualize_board.sh 21151511` (best/block board): move 8 (Gray) lands at display col2 row5 =
c2r5 — exactly the cell the opponent would otherwise complete. The two readings collapse to one cell.

## player_sentence
"Green already had three in a column with the top open — you had to block at c2r5; playing
elsewhere let Green complete the vertical four for an immediate win."

## defect
None (SOUND). Minor (non-blocking) provenance note carried from the iteration-2 audit: the
`line` payload alone cannot distinguish "opponent line you created" from "pre-existing opponent
line you failed to block" — provenance rests on the `betterMoveDoes` verb ("blocks") plus
patternsOpponent/parity_cells. Both align here (completingCell == bestCell == c2r5), so no
fabrication risk. If desired generally, an optional `line.preExisting:true` flag would make
defensive-miss provenance self-contained, but it is not required for soundness.

## tools_used
visualize_board.sh, TOOLS/forward_distance.mjs, TOOLS/optimal_line.mjs, TOOLS/decisive_check.mjs, TOOLS/parity_cells.mjs

## tools_created
none

## lesson / redundancy
forced_block/defensive_miss = FLIP + `line` with winner=opponent; completingCell = the
opponent's pre-existing immediate threat cell (== bestCell landing), register=immediate.
Grounded by the opponent-perspective parity_cells pass (mover-perspective returns [] — FR-033
trap). decisive_check is mover-oriented and will read NOT-THIS-CELL for the block; use the
played-branch optimal_line as the winner=opponent decisiveness witness.
Redundant cases (spot-check only that each is a single pre-existing immediate threat, blocked
by landing on threat cell == bestCell, immediate forced loss): **eval-14, eval-31**.
Re-audit any whose block column differs from the threat cell's column or whose loss is not immediate.
