# eval-42 — VERIFY pass

## verdict: SOUND
grain: **`line`** · winner: **opponent** · outcomeDelta {best:loss, played:loss}

This is the both-lose-with-discriminating-accelerated-opponent-line case. §5 router rule 1
(not_a_blunder) does NOT fire because a discriminating winning four IS reachable: the opponent's
standing horizontal four at **c4r2** is re-solve-confirmed decisive on both branches but **accelerated
by 20 plies** on the played branch (completes at ply 18 vs ply 38). Rule 2 fires; ownership does NOT
flip (c4r2 belongs to Gray in both branches) → **`line`** (not `line_parity`, not `not_a_blunder`).

## case facts (re-confirmed)
- board_state `412225155414`, 12 discs, **Green (P1, mover)** to move. pattern_category forced_win.
- move_played col **2** (0-idx, display c3) → loss; correct_move col **1** (0-idx, display c2) → loss.
- pre-move Green per-col scores: `[-13, -3, -13, -15, -3, -13, -13]` → every column loses ⇒
  **SAME-floor BOTH-LOSE** (no outcome flip). best = idx1 (-3), played = idx2 (-13).

## refutation duty (a) — acceleration is REAL, not a mistake-mode phantom
Dual OPTIMAL-mode PVs (`optimal_line.mjs`) on BOTH post-move branches:
- BEST `4122251554141` (Gray to move): terminal **win for second(Gray/P2)**, completingCell **c4r2**,
  completingPly **38**, window c3r2–c6r2. scr row `[-14, 3, -14, -14, -14, -14, -14]` — Gray has exactly
  one winning column (+3); the win is a long 25-ply resistance.
- PLAYED `4122251554142` (Gray to move): terminal **win for second(Gray/P2)**, completingCell **c4r2**,
  completingPly **18**, window c3r2–c6r2. scr row `[3, 3, 3, -3, 13, 3, 3]` — Gray wins fast (+13).
- `decisive_check.mjs c4r2` on BOTH branches → **DECISIVE (win completes through candidate under
  optimal defense)**, winnerIsPunisher true. So the opponent line is solver-confirmed under optimal
  defense on each branch — NOT a mistake-mode artifact.
- Numeric forward-distance gap (`forward_distance.mjs 412225155414 1 2`): best forwardPlies **25**
  (slow_zugzwang) vs played forwardPlies **5** (forced_sequence). Same 20-ply acceleration the absolute
  completing plies (38 vs 18) express.

**Correction to the predicted cell:** the prediction named c2r5. That was the iteration-2
`cases/eval-42.md` *mistake-mode phantom* — the cell where Green wins **if Gray slips**. Under optimal
play Green never wins (both branches lose), so c2r5 is not the canonical discriminating line. The §5
sub-rule ("mistake-mode lines are phantoms; re-solve OPTIMAL-mode of the PLAYED branch to populate the
opponent line") yields the opponent's own four at **c4r2**, which is the standing Gray major threat
already present in the pre-move board ("Major threats: col4 row2 (Gy)"). Grain/winner unchanged.

## refutation duty (b) — `line`, not `not_a_blunder`
Same-floor, so rule 1 would route not_a_blunder ONLY if no discriminating reachable line existed. Here
the opponent four at c4r2 IS discriminating: it is the SAME cell on both branches but the temporal
acceleration (ply 38 → 18) is the discriminator §5 rule 2 explicitly enumerates ("accelerated opp line
on played"). Ownership does not flip → `line`. A real lesson exists (don't accelerate a lost position;
the better move forces the opponent through a long resistance), so not_a_blunder would be wrong.

## refutation duty (c) — payload now carries the discriminating fact
Old vacuous schema `{loserSide:"player", speed:"slower", punishable:"win"}` was byte-identical to
eval-8 and discarded everything that makes this honest. The `line` grain now carries:
- `line.playedLine.completingCell = c4r2` + `completingPly = 18`
- `line.bestLine.completingCell = c4r2` + `completingPly = 38`
The 20-ply acceleration (the actual reason the played move is the worse loss) is now expressible as the
diff of the two completingPly values, with the canonical cell named. The schema gap eval-42 originally
proved (enums not magnitudes, no cell slot) is closed by the line body.

## refutation duty (d) — both moves registered
move_played col2 (display c3) → played branch, loss, opponent four ply 18.
correct_move col1 (display c2) → best branch, loss, opponent four ply 38. Both in outcomeDelta + line body.

## golden reason
See `golden/eval-42.json`.

## player_sentence
"Column c2 was no save — every column loses here — but it drags Gray's win out to a 25-ply resistance;
column c3 instead walks straight into Gray's standing four at c4r2, losing in just 5 plies."

## defect
None. The `line` grain soundly expresses a same-floor both-lose case via a temporally-accelerated
opponent line (same cell, two completing plies). This is the clean SUCCESS the old resistance schema
could never produce.

## evidence (commands)
- `visualize_board.sh 412225155414 | 4122251554141 | 4122251554142` — pre/best/played scr rows.
- `forward_distance.mjs 412225155414 1 2` → best 25 (slow_zugzwang) / played 5 (forced_sequence).
- `optimal_line.mjs 4122251554141` → Gray win, c4r2, ply 38.
- `optimal_line.mjs 4122251554142` → Gray win, c4r2, ply 18.
- `decisive_check.mjs <branch> c4r2` → DECISIVE under optimal defense on both.

## tools_used
`visualize_board.sh`, `forward_distance.mjs`, `optimal_line.mjs`, `decisive_check.mjs`.
## tools_created
none.
