# eval-2 — drawing_move, win→draw FLIP (3 discs)

## verdict: PAYLOAD_UNGROUNDABLE → correct output is OMIT (eval-24 / B-side, NOT eval-5 / A-side)

eval-2 is a **maximal deep zugzwang win** (forwardPlies=38, |score|=1, resolves on the **last disc, ply
42, board full**). It falls on the **eval-24 OMIT side**, not the eval-5 parity_control side. The forgone
win is NOT an on-board odd-distance z-threat (parity pass is empty on every board), so parity_control
cannot fire. The win's completing cell is a board-fill artifact that `decisive_check` flags BLOCKABLE /
defender-could-occupy, so concrete_line is a DECISIVENESS_FAIL. The ladder therefore falls to
**positional**, where `center_control` **fabricates** — and the important new finding: it fabricates even
though **winningColumnCount = 1** AND the centrality-direction guard PASSES (best move is dead-center).
So eval-24's `winningColumnCount>1` guard does NOT catch eval-2; only the `register==slow_zugzwang` guard
does. Correct output: **OMIT**.

## Case
- board_state `444` (3 discs, all col4-0idx), move_played col **4** (display c5), correct_move col **3**
  (display c4 = dead center). pattern_category drawing_move, **severity 0**, is_sparse false.
- Mover = Gray / P2 (4th disc).
- Pre-move solver scores (Gray to move): `[-4, -3, -2, +1, 0, -2, -2]`.
  - **Winning cols (score>0): col3 only → winningColumnCount = 1.** col3 = +1 (the SLOWEST possible win).
  - Drawing col: col4 (=0, the played move). **win→draw FLIP confirmed.**

## register — slow_zugzwang (maximal)
`forward_distance.mjs 444 3 4`:
- col3: score=1, **forwardPlies=38, register=slow_zugzwang** (43 − 2·1 − 3 = 38)
- col4: score=0, draw, no register
This is the deepest possible zugzwang win — Gray wins only as the final disc fills the board.

## Routed-kind walk (FLIP ladder: parity_control → concrete_line → positional)

### 1. parity_control — FAILS (empty, unlike eval-5)
`parity_cells.mjs` perspective 1 AND 2 on pre-move `444`, best `4443`, played `4444`: ALL return
`zThreatCells:[]`, `allThreatCells:[]`. No z-threat/odd-threat cells on the board — the parity structure
only materializes ~35 plies deep. No NON-EMPTY kept/surrendered set, no controller flip. This is the exact
opposite of eval-5, whose forgone win WAS an on-board odd-distance z-threat at c3r4.

### 2. concrete_line — DECISIVENESS_FAIL
`optimal_line.mjs 4443` → terminal **win for Gray at ply 42** (board completely full, 42 discs), single
winningWindow (top row) `c1r6·c2r6·c3r6·c4r6`, completingCell **c1r6**, winningWindows = **1** (not a fork).
`decisive_check.mjs 4443 c1r6`:
- winner=Gray, completingCellIsCandidate=true, candidateInCompletedWindow=true, BUT
- **verdict = "BLOCKABLE (defender escapes / candidate not decisive)"**, `defenderCouldOccupyCandidateWhenGravityTop: true`.
The cell is a board-FILL artifact of one optimal line: with |score|=1 the win is diffuse parity, and the
specific completing cell/window shifts with Green's defense. The epic gate ("winningLines>1 OR terminal
board-fill cell OR window completes under optimal defense — NEVER the earliest blockable threat") is not
honestly met: it is technically a terminal board-fill cell, but it is not a *stable* decisive cell — a
concrete_line claiming "the win completes at c1r6" would mislead a coach. Same failure mode as eval-24,
more extreme (ply 42 vs 39).

### 3. positional — REACHED, FABRICATES (even with winningColumnCount=1 + direction guard PASSING)
With rungs 1–2 dead, the ladder emits `center_control`. Here best col3 (0idx) = display **c4 = dead
center**; played col4 (0idx) = display c5. So bestCell IS strictly more central than playedCell → the
centrality-DIRECTION guard (eval-0/eval-24 proposal) **PASSES** and center_control reads **TRUE**. But the
real mechanism is a parity/zugzwang squeeze resolving at board fill — the winning move merely *happens* to
be the center column. center_control attributes the win to centrality when centrality is causally
irrelevant → **fabrication**. winningColumnCount = 1, so eval-24's `winningColumnCount>1` guard does NOT
trip. **Only the `register==slow_zugzwang` guard suppresses this.**

## Hand-built payload the ladder WOULD emit (the fabrication)
```json
{
  "register": "slow_zugzwang",
  "kind": "positional",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "betterMoveDoes": "Playing c4r1 keeps the win that c5r4 lets slip to a draw.",
  "principle": { "name": "center_control", "bestCells": ["c4r1"], "playedCells": ["c5r4"] }
}
```
center_control's premise reads TRUE here (best=center) yet is causally false — the honest reason is
parity/zugzwang, with no specific cell. Correct output: **OMIT**.

## The REAL reason
Gray has a deepest-possible zugzwang win: under optimal play the board fills to 42 discs and Gray completes
the top row on the final disc. col4 (played) neutralizes that parity edge and the board fills to a draw.
No on-board threat, no short forcing line, no center-control principle explains it. Honest coach sentence:
"The center move keeps a razor-thin endgame win that only pays off when the board fills; your move lets it
slip to a draw." No groundable kind captures this from the frozen vector.

## §14 — why it slips through
- positional "differs between boards": c4r1 ≠ c5r4 → PASSES.
- positional "named principle holds on solver": center_control direction is TRUE (best=center) → PASSES.
  Both §14 checks pass, yet the reason is fabricated. The mechanical check cannot detect that centrality
  is causally irrelevant to a parity win.

## missing_signal
Same as eval-24: the vector has no field surfacing "FLIP win is a deep board-fill zugzwang whose decisive
structure is not yet on the board." eval-2 STRENGTHENS the fix: the `winningColumnCount>1` guard is
**insufficient** (here winningColumnCount=1 and best is dead-center, so center_control passes the direction
guard). **Load-bearing guard: suppress positional whenever `register==slow_zugzwang`** (and on a
slow_zugzwang FLIP with empty parity cells and no stable decisive cell → OMIT). Optionally add a
SAME-PERSPECTIVE few-ply-deep parity search so genuine future-materializing zugzwang wins could ground as
parity_control with real cells (would also cover eval-5-style cases generically).

## Redundancy — eval-37 and eval-40 are REDUNDANT with eval-2
Both are the identical shape (|score|=1 slow_zugzwang, winningColumnCount=1, empty parity on best board):
- **eval-37** `33333025`: scores `[-2,0,0,-3,0,1,0]`, win col5 +1, forwardPlies=33, slow_zugzwang;
  parity `333330255` p1&p2 → empty. best col5(display c6) more central than played col6(display c7) →
  direction guard PASSES → center_control fabricates (same as eval-2). → OMIT.
- **eval-40** `241`: scores `[0,1,0,0,0,-2,-2]`, win col1 +1, forwardPlies=38, slow_zugzwang;
  parity `2411` p1&p2 → empty. best col1(display c2) is LESS central than played col2(display c3) →
  here the direction guard would REJECT, so center_control is caught even without the register guard.
  → OMIT (caught by direction guard too).
All three → OMIT. eval-2 + eval-37 are the cases proving the direction guard is insufficient (best happens
central); eval-40 is caught by the direction guard. None route parity_control or concrete_line.

## tools_used
visualize_board.sh (444 / 4443 / 4444); forward_distance.mjs; parity_cells.mjs (both perspectives, all
boards); optimal_line.mjs 4443; decisive_check.mjs 4443 c1r6; forward_distance + parity_cells on eval-37/40.
## tools_created
none (existing tools sufficed).

## one-line lesson (handoff log)
eval-2 is a maximal slow_zugzwang win→draw (ply-42 board-fill, |score|=1, winningColumnCount=1, empty
parity) → OMIT, eval-24 B-side not eval-5 A-side; it PROVES `winningColumnCount>1` is insufficient to stop
positional fabrication — best can be dead-center with winningColumnCount=1 and center_control still
fabricates, so the `register==slow_zugzwang` guard is the load-bearing one. Makes **eval-37 and eval-40
redundant** (same OMIT shape). The win→draw drawing_move family is **mostly OMIT** (deep diffuse zugzwang);
only eval-5's specific on-board odd-distance z-threat grounds (parity_control).
