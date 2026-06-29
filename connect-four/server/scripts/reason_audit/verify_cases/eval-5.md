# eval-5 — VERIFY pass

## verdict: SOUND — grain `line_parity`

board_state `444423333` (9 discs, Gray/P2 to move), move_played col6 (0-idx, display c7),
correct_move col5 (0-idx, display c6). pattern_category drawing_move (TAG), severity 1.
Outcome: win→draw FLIP.

## Router (§5) — enters line_parity by STRUCTURE, not by tag
flip = (best=win != played=draw) = true. Rung 2: a winning four is re-solve-confirmed decisive on the
crux (best) branch — the diagonal `c6r1·c5r2·c4r3·c3r4` completes a Gray win at ply 40 — AND it is a
STANDING z-threat whose OWNERSHIP flips (Gray's major threat on best, absent on played) → **line_parity**.
The `drawing_move` tag is irrelevant to the routing; structure (standing-threat-ownership-flip) decides.

## Evidence (commands + key outputs)

1. Pre-move solver scores (`forward_distance.mjs 444423333 5 6`):
   `per-col scores: [-2, 0, 0, 0, 0, 2, 0]` → display col6 (=correct, 0-idx 5) UNIQUE win (+2);
   display col7 (=played, 0-idx 6) = draw (0). **win→draw FLIP confirmed from solver.**
   - col5: score=2, forwardPlies=**30**, register=**slow_zugzwang** (43−2·2−9=30).
   - col6: draw, no register → playedPlies="none".

2. Boards (`visualize_board.sh`):
   - PRE-MOVE: only major threat = col6 row4 (**Gn**, Green). c3r4 is only a *minor* (gy). The
     dataset `threat_cells` row3/col5 (0-idx) = display c6r4 = **the GREEN threat — a red herring**,
     NOT the surrendered cell.
   - BEST `4444233335`: Gray plays c6r1; NEW major threat appears at **col3 row4 (Gy)** = c3r4.
     All 7 cols score −2 (Green to move → Green loses everywhere → Gray wins).
   - PLAYED `4444233336`: only major threat remains col6 row4 (Gn); NO Gray threat at c3r4; draw.

3. Standing threat / ownership flip (`parity_cells.mjs <ms> 2`):
   - pre-move → `zThreatCells: []`
   - best `4444233335` → `zThreatCells: ["c3r4"]`  (Gray owns the odd-distance z-threat)
   - played `4444233336` → `zThreatCells: []`
   Controller flips: Gray-on-best → nobody-on-played. mechanism = z_threat. ✓

4. Optimal-line re-solve:
   - BEST `optimal_line.mjs 4444233335` → terminal **win**, winner second(Gray/P2),
     completingCell **c3r4**, completingPly **40** (of 42 = forced terminal board-fill),
     single window `[c6r1,c5r2,c4r3,c3r4]`. → bestLine forced="yes".
   - PLAYED `optimal_line.mjs 4444233336` → "board full, no win" (draw). → playedLine="absent".

5. Decisiveness gate (`decisive_check.mjs 4444233335 c3r4`):
   verdict = **"BLOCKABLE (defender escapes / candidate not decisive)"**,
   `defenderCouldOccupyCandidateWhenGravityTop: true`. This is the PARITY signature: the cell is NOT a
   short-range forcing tactic, yet the full optimal_line re-solve forces the win at ply 40 via zugzwang.
   Qualifies §8 gate 2 under the "forced terminal board-fill" clause (ply 40 of 42).

## Refutation duties (CRITICAL — soundness-gate stress case)
- **(a) controller from SOLVER FLIP only.** best=win(Gray=player), played=draw → controller="player".
  A parity-count derivation would be WRONG/AMBIGUOUS here: (i) c3r4 is not even a threat pre-move (it
  is *created* by the best move, so no empties-beneath count applies pre-move); (ii) both candidate
  major threats are EVEN-row (Gray c3r4 and Green c6r4 both row 4) — an odd/even-row heuristic cannot
  pick the winner; (iii) decisive_check itself returns BLOCKABLE for c3r4. Only the win→draw solver
  flip identifies player as controller. CONFIRMED a non-solver derivation fails here.
- **(b) ownerParity = ROW parity of controlling cell.** c3r4 → row 4 (1-indexed) → **even**. Matches.
- **(c) genuine standing decisive threat.** parity_cells flags c3r4 as a real zThreatCell on the best
  board; optimal_line re-solve confirms it is the decisive completing cell of the terminal Gray win
  (board-fill). CONFIRMED.

## player_sentence
"Your move only draws — c6 instead keeps a z-threat at c3r4 (diagonal c6r1·c5r2·c4r3·c3r4) that Green
can't defuse, and you win the parity squeeze as the board fills."

## defect
None. line_parity grounds cleanly. (Note: the frozen vector's `realizedOnPly:2`/`pliesToEnd:2` for this
cell are the known inverted-bug values =|score|; the line_parity payload does NOT consume them — register
comes from repaired forward_distance (30) and completingPly from optimal_line re-solve (40) — so no harm.)

## tools_used
visualize_board.sh; forward_distance.mjs; parity_cells.mjs; optimal_line.mjs; decisive_check.mjs.
## tools_created
none.

## lesson + redundant cases
A drawing_move win→draw flip whose forgone win is an odd-distance z-threat routes to **line_parity by
structure** (standing threat ownership-flips), never by tag; controller MUST come from the solver flip
because decisive_check reads BLOCKABLE and the empties/row-parity counts are ambiguous (both candidate
threats even-row). This template likely makes the other shallow drawing_move win→draws (eval-2/37/40)
line_parity as well — verify each shows a non-empty zThreatCell flip on its best branch.
