# eval-46 — VERIFY verdict: SOUND

**grain: `line`  ·  winner: opponent**

This is the canonical case that proves the unified algorithm's §5 flip-to-loss sub-rule
("run OPTIMAL-mode re-solve of the PLAYED branch to populate the opponent line") is necessary
AND sufficient. In iteration-2 the engineered vector carried `decisiveLine.opponent = null`, so
the prior audit returned PAYLOAD_UNGROUNDABLE. The new algorithm mandates the played-branch
optimal re-solve, which supplies exactly the missing opponent completing cell — making the
grain groundable. Verdict: **SOUND**.

## Case facts
- movestring `333444343342525611` (18 discs), Green (P1) to move. severity 2.
- move_played `1` (0-idx col1 = display col2, lands **c2r3**); correct_move `2` (0-idx col2 =
  display col3, lands **c3r3**).
- Per-col solver scores: `[-12, -5, 3, --, 3, -12, 3]`. played col1 = **-5 (loss)**, best col2 =
  **+3 (win)**. FLIP win→loss.

## Evidence (commands + key outputs)

### Register — `forward_distance.mjs 333444343342525611 1 2`
```
col 1: score=-5  outcome=loss  forwardPlies=15  register=slow_zugzwang
col 2: score=3   outcome=win   forwardPlies=19  register=slow_zugzwang
```
bestPlies = 43−2·3−18 = 19; playedPlies = 43−2·5−18 = 15; phase midgame (18 discs); word
slow_zugzwang (15 > 10).

### Played branch (crux) — `optimal_line.mjs 3334443433425256111`
```
winner: second(Gray/P2)  completingCell: c1r2  completingPly: 34
winningWindows: [[c1r2,c2r2,c3r2,c4r2]]   (horizontal row2)
```
The opponent four is BEYOND the immediate horizon (completes at ply 34, col-0 fills p33/p34) —
absent from the production vector; recovered ONLY via this played-branch optimal re-solve.

### Decisiveness gate — `decisive_check.mjs 3334443433425256111 c1r2`
```
verdict: DECISIVE (win completes through candidate under optimal defense)
winnerIsPunisher: true   candidateInCompletedWindow: true
```
→ playedLine.forced = "yes". Passes §8 gate 2 (named only when re-solve-confirmed decisive;
not the earliest blockable threat).

### Best branch (forgone win) — `optimal_line.mjs 3334443433425256112`
```
winner: first(Green/P1)  completingCell: c2r5  completingPly: 37
winningWindows: [[c2r5,c3r5,c4r5,c5r5]]   (horizontal row5)
```
`decisive_check.mjs 3334443433425256112 c2r5` → **BLOCKABLE** (Green holds a double threat, so no
single cell is forced) → bestLine.forced = "no" (honest negative; the win is real per score +3,
just not via one canonical cell). bestLine is nameable as the forgone player win.

### Ownership / parity — `parity_cells.mjs … 2`
Gray (P2) `allThreatCells = [c1r2, c6r4]` IDENTICAL on pre-move / played / best; `zThreatCells = []`.
No controller flip → router step 2 resolves to `line`, NOT `line_parity`. c1r2 is a STANDING Gray
zugzwang threat (already a pre-move major threat), converted because the played move forgoes the
faster Green win.

## Router trace (§5)
flip = true (win≠loss) → step 2: accelerated/decisive opponent four on the played (crux) branch
(c1r2, DECISIVE) AND forgone player win on best (c2r5). Standing threat ownership does NOT flip
→ **`line`**, winner = opponent.

## golden payload
See `golden/eval-46.json`. Both `line` sub-objects present (playedLine forced:yes, bestLine
forced:no); ≥1 present requirement satisfied.

## player_sentence
"You had a winning move at column 3 (drop c3r3) that completes your own four at c2r5; column 2
instead throws it away — it lets Gray's standing bottom-row threat at c1r2 complete a four about
16 moves later in a slow zugzwang."

## defect
None. SOUND under the unified algorithm. (The iteration-2 UNGROUNDABLE verdict is resolved by the
mandated played-branch optimal re-solve — no further schema/router change needed for this clean,
disjoint-window case.)

## tools_used
forward_distance.mjs; optimal_line.mjs (both branches); decisive_check.mjs (c1r2 DECISIVE, c2r5
BLOCKABLE); parity_cells.mjs (pre/played/best, P2); visualize_board.sh.

## tools_created
none.
