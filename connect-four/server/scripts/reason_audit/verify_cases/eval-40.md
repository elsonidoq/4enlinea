# eval-40 — VERIFY: drawing_move, win→draw FLIP (3 discs)

## verdict: SOUND — grain `zugzwang_class`

eval-40 is a maximal slow_zugzwang win→draw flip (best score +1, forwardPlies=38, resolves at ply 42 /
board full). The router refuses every cell-naming grain — including the parity COUNT that would name a
wrong controller — and lands on `zugzwang_class`. Same family as eval-2 / eval-1.

## Case
- boardState `241` (3 discs), movePlayed col **2** (0idx, display c3), correctMove col **1** (0idx, display c2).
- Mover = Gray / P2 (4th disc; odd disc count = P2 to move; visualize confirms "Next: Gray").
- Pre-move solver scores (Gray to move): `[0, +1, 0, 0, 0, -2, -2]`.
  - Winning col (>0): **col1 only → winningColumnCount = 1**, score **+1** (slowest possible win).
  - correctMove = col1 (the win); movePlayed = col2 (score 0 = draw). **win→draw FLIP confirmed.**

## register
`forward_distance.mjs 241 1 2`:
- col1: score=1, **forwardPlies=38, register=slow_zugzwang** (43 − 2·1 − 3 = 38) → bestPlies = 38.
- col2: score=0, draw → playedPlies = "none".
Phase follows the slow_zugzwang precedent (eval-1, boardState `44`): the decisive event is a board-fill
zugzwang, so word = "slow_zugzwang" (not the raw discs≤6 "opening" label).

## Refutation duties

### (a) line_parity — REFUSED (parity COUNT contradicts the solver) — CRITICAL
`parity_cells.mjs` on **241, 2411 (best), 2412 (played)**, perspectives **1 AND 2**: ALL return
`zThreatCells:[]`, `allThreatCells:[]`. There is **no standing threat whose ownership flips** — nothing
for a "rule of parity" to count. Worse, any naive empty-square / empties-beneath COUNT here mislabels:
the board has 39 empties (odd) and the winner is the **second player (P2/Gray)**, whereas the claimeven
"rule of parity" heuristic generically credits zugzwang/odd-threat control to the **first player** (or
calls the odd-empty endgame a draw). So a parity COUNT would name the WRONG controller (or DRAW) and
contradict the solver's confirmed P2 win. Control can come ONLY from the solver flip → `line_parity`
MUST be refused. (§8 gate 3.)

### (b) line — REFUSED (terminal non-canonical / blockable)
`optimal_line.mjs 2411` → terminal **win for P2 at ply 42** (board full, 42 discs), single winning window
top-row-right `c4r6·c5r6·c6r6·c7r6`, completingCell **c7r6**, **nWinningWindows = 1** (not a fork).
`decisive_check.mjs 2411 c7r6` → **verdict "BLOCKABLE (defender escapes / candidate not decisive)"**,
`defenderCouldOccupyCandidateWhenGravityTop: true`. The completing cell is a board-FILL artifact of one
optimal line, not a stable decisive cell. §8 gate 2 not honestly met → grain-2 `line` refused.

### (c) opening_principle — REFUSED (line-participation NOT solver-monotone)
Near-empty (3 discs) but the participation count inverts vs the solver: best winning cell **c2r2 = 6**
four-windows; played drawing cell **c3r2 = 8**; center c4r1 = 10. The solver's WINNING move sits in
*fewer* fours than the drawing move → `bestCellFours < playedCellFours`, the opposite of the gate's
"best strictly more". §8 gate 4 (inverts mid-game) already inverted here → `opening_principle` refused.

### (d) forward_projection → noThreatWithinPlies
`forward_projection.mjs 241` / `2411`: along the optimal line the first **P2 major threat** appears only
at **ply 30** (c6r5), and the terminal winning window's first 3/1 major-threat is at **ply 36** with
`reachableThen=false` (not gravity-reachable until ply 41). From the 4-disc played position no P2 standing
threat is nameable for ~26 plies → `noThreatWithinPlies: 26`. Diffuse, no canonical cell → §5 rule 4.

## Router walk
flip=true (win≠draw). Rule 1 skipped (flip). Rule 2: no re-solve-confirmed decisive winning four — the
only completing cell is blockable board-fill (b). Rule 3: opening line-participation not solver-monotone
(c). → **Rule 4: flip → `zugzwang_class`.** ✓ matches predicted grain.

## golden reason
See `golden/eval-40.json`. winner=player, outcomeDelta {best:win, played:draw}, bestPlies 38,
playedPlies "none", phase/word slow_zugzwang, zugzwang.noThreatWithinPlies 26.

## player_sentence
"Your move drops a hair-thin endgame win — it only pays off when the board fills around ply 42 — down to a
draw; there is no threat or winning four to point at yet, so just hold the column that keeps the squeeze."

## defect
None. The algorithm correctly refuses all three cell-naming grains and never lets a parity COUNT name a
controller. zugzwang_class carries the honest "diffuse flip, no nameable cell" payload.

## tools_used
visualize_board.sh (241 / 2411 / 2412); forward_distance.mjs 241 1 2; parity_cells.mjs (241/2411/2412 ×
persp 1&2); optimal_line.mjs 2411; forward_projection.mjs 241 & 2411; decisive_check.mjs 2411 c7r6;
inline cell-four participation counter.
## tools_created
none.

## lesson
eval-40 is the parity-REFUSAL gate case: a +1 slow_zugzwang win for the SECOND player with empty parity
cells and 39 (odd) empties — exactly where a claimeven "rule of parity" COUNT would name the wrong
controller or call the win a draw. The algorithm refuses line_parity (no standing threat; controller only
from the solver flip), refuses line (blockable board-fill cell), refuses opening_principle (participation
anti-monotone: winning cell has FEWER fours), and routes to zugzwang_class.

## redundant cases
**eval-37** (`33333025`, scores `[-2,0,0,-3,0,1,0]`, win col5 +1, forwardPlies=33, slow_zugzwang, empty
parity) is the identical OMIT→zugzwang_class shape and is made redundant by this verification.
