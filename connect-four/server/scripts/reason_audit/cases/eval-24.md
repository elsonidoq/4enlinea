# eval-24 — verdict: PAYLOAD_UNGROUNDABLE (positional fabrication CONFIRMED + concrete_line DECISIVENESS_FAIL)

**Verdict: PAYLOAD_UNGROUNDABLE.** This is a deep zugzwang win→draw FLIP that NO FLIP kind honestly
captures. parity_control finds no cells; concrete_line has NO re-solve-confirmed decisive completing
cell (both candidate completions are BLOCKABLE); so the ladder falls to **positional**, where
`center_control` **fabricates** — and worse than eval-0 predicted: the best move is the EDGE (col0), and
in fact **5 of 7 columns win** (cols 0,2,3,5,6 span edge→center), so the "bestCell more central than
playedCell" assertion is not just false, it is **arbitrary/undefined**. eval-0's FINDING 2 is confirmed
and strengthened: a centrality-DIRECTION guard is still insufficient — when multiple equivalent winning
moves span the board, center_control has no defined truth value and must OMIT.

## Case
- board_state `333332562100` (12 discs), move_played col **4**, correct_move col **0**, `drawing_move`,
  is_sparse, severity 1. Green (P1) to move.
- Pre-move per-col solver scores (Green to move): `[2, 0, 2, 2, 0, 2, 2]`.
  - **Winning cols (score 2): 0, 2, 3, 5, 6** — includes BOTH edges (0,6) AND the center (3).
  - **Drawing cols (score 0): 1, 4** — col **4** is the played move.
- Branch: **FLIP**, outcomeDelta `{ best: win, played: draw }`. Re-confirmed by `optimal_line`:
  - col0 board → Green wins at ply 39 (39 discs, near fill).
  - col3 board → Green wins at ply 39.
  - col4 (played) board → "board full, no win" → **DRAW**.

## register — slow_zugzwang
`forward_distance.mjs 333332562100 0 4 3` → col0 win **forwardPlies=27** register=**slow_zugzwang**;
col3 win forwardPlies=27 slow_zugzwang; col4 draw (no register). The win resolves ~27 plies out at board
fill — a parity/zugzwang win, not a near-term tactic.

## Routed kind walk (ACTUAL ladder, FLIP: parity_control → concrete_line → positional)
1. **parity_control — FAILS.** `parity_cells.mjs` perspective 1 AND 2, on pre-move/best/played boards: all
   return `zThreatCells:[]`, `allThreatCells:[]`. No z-threat/odd-threat cells exist on the current board
   — the winning threats only materialize deep in the forced line, so no NON-EMPTY kept/surrendered set.
2. **concrete_line — DECISIVENESS_FAIL.** `optimal_line` gives a completing cell, but it is NOT decisive:
   - col0 board: completingCell **c2r3** (winningWindows = 2). `decisive_check 3333325621000 c2r3` →
     **"BLOCKABLE (defender escapes / candidate not decisive)"**, `defenderCouldOccupyCandidateWhenGravityTop: true`.
   - col3 board: completingCell **c2r6** → `decisive_check` also **"BLOCKABLE"**.
   - Both candidate completions are blockable; the win is a diffuse zugzwang (Green wins on overall
     parity/threat-count superiority), so NO single cell is the genuine decisive completion. The epic's
     gate ("winningLines>1 OR terminal board-fill OR window completes under optimal defense — NEVER the
     earliest-surfacing blockable threat") is NOT met. concrete_line cannot honestly ground.
3. **positional — REACHED, and FABRICATES.** With the first two rungs failing, the ladder emits
   center_control. This is the second fabrication mode the assignment asked about — and it is real here
   (unlike where concrete_line could have rescued it; it cannot).

## The positional fabrication (hand-built payload, as the ladder WOULD emit it)
```json
{
  "register": "slow_zugzwang",
  "kind": "positional",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "betterMoveDoes": "Playing c1r3 keeps the win that c5r1 lets slip to a draw.",
  "principle": { "name": "center_control", "bestCells": ["c1r3"], "playedCells": ["c5r1"] }
}
```
- bestCell = col0 (0-idx) → display col1, next empty row3 → **c1r3** (centrality distance from center col4-display = **3**, the EDGE).
- playedCell = col4 (0-idx) → display col5, row1 → **c5r1** (centrality distance = **1**).
- So **playedCell is MORE central than bestCell** → center_control's premise is FALSE.

## §14 positional checks — the unsoundness
- "named principle holds on solver": center_control means *best is more central*. Here best (edge col0)
  is the LEAST central winning move → the principle is **FALSE on the solver**. A correctly-worded check
  would REJECT.
- "differs between the two boards": c1r3 ≠ c5r1 → **PASSES**. The §14 wording keys on *difference*, not
  *direction*, so the fabrication slips through. (Exactly eval-0 FINDING 2.)
- **NEW, stronger refutation:** eval-0 proposed fixing this with a centrality-DIRECTION guard
  (bestCell strictly more central). That is STILL insufficient here: **5 of 7 columns win** and they span
  edge→center (col0 edge, col3 center, col6 edge). The lookahead's own `bestCol` is **3 (center)** while
  the catalog's correct_move is **0 (edge)**. So whether center_control reads TRUE or FALSE depends
  entirely on WHICH equivalent winning column is nominated as bestCell — its truth value is **arbitrary**.
  center_control is not a property of the position at all; it is an artifact of an arbitrary tie-break.

## The REAL reason the played move only draws
Green has a **long-term zugzwang win**: under optimal play the board fills to ~39 discs and Green's threat
parity converts to a connect-four near the top (completion ~ply 27 forward). Col 4 (and col 1) neutralize
that parity advantage and the board fills to a draw. The mechanism is parity/zugzwang, **not** a
near-term tactic and **not** center control. The honest coach sentence is: *"Most moves here keep a slow
endgame win; col 5 (and col 2) throw it away to a draw."* No specific cell explains it.

## Does ANY groundable kind honestly capture it? NO.
- parity_control would be the *semantically correct* kind, but its detector (detectZThreat) yields no
  cells because the parity threats are not yet on the board — they emerge 10+ plies deep. The vector has
  no field that surfaces a FUTURE-materializing parity win.
- concrete_line is ungroundable (no stable decisive cell; both completions BLOCKABLE).
- positional fabricates (best is edge; centrality undefined across 5 winning columns).
→ The correct output is **OMIT**, but the implemented ladder emits a fabricated center_control instead.

## missing_signal
The vector lacks any signal that a FLIP win is a **deep zugzwang/parity win whose decisive structure is
not yet on the board**. Concretely:
1. A reachability/decisiveness flag distinguishing "near-term tactical line" from "board-fill zugzwang
   win" (register slow_zugzwang ALONE is emitted, but the ladder ignores it when choosing the kind).
2. A `winningColumnCount` / "best-move tie set" field. When ≥2 winning columns exist spanning a wide
   centrality range, center_control is meaningless and MUST be suppressed.
**Proposals:**
- (a) Gate positional/center_control OFF whenever `register == slow_zugzwang` OR `winningColumnCount > 1`
  (the latter makes centrality direction undefined). On a slow_zugzwang FLIP with empty parity cells and
  no decisive cell → **OMIT**, do not invent a principle.
- (b) Add a parity-control detector path that runs a SAME-PERSPECTIVE search a few plies deep so genuine
  zugzwang wins (like this one) can ground as parity_control with real kept/surrendered cells, instead of
  silently falling through to positional.
- (c) Keep eval-0's centrality-DIRECTION guard, but it is necessary-not-sufficient; the
  winningColumnCount>1 guard is the load-bearing one for eval-24.

## tools_used
- `./visualize_board.sh 333332562100 / 3333325621000 / 3333325621004` (pre/best/played)
- `forward_distance.mjs 333332562100 0 4 3` → 27-ply slow_zugzwang win for cols 0 & 3
- `parity_cells.mjs` perspective 1 & 2 on all three boards → all empty
- `print_lookahead.mjs 333332562100 4 22` → bestCol=3, overcut/major-threat zugzwang, deep realizedOnPly
- `optimal_line.mjs` on col0 / col3 / col4 boards → wins at ply 39 / 39 / draw
- `decisive_check.mjs` on c2r3 (col0) and c2r6 (col3) → both **BLOCKABLE**
## tools_created
- none (reused existing)

## Lesson (handoff log)
eval-24 CONFIRMS positional's second fabrication mode and is STRONGER than eval-0 guessed: not "best is
edge" alone but **5 of 7 columns win (edge→center)**, making center_control's truth value arbitrary —
a centrality-direction guard is necessary but insufficient; the real fix is to suppress positional when
`winningColumnCount>1` or `register==slow_zugzwang`, and OMIT. concrete_line cannot rescue it (no decisive
cell — both optimal completions BLOCKABLE). This likely makes **eval-2 / eval-37 / eval-40** (drawing_move
win→draw, non-central best) redundant for the *positional-fabrication* finding: each should be checked
only for whether a real decisive cell exists (concrete_line) — if not, they OMIT, they do NOT route
center_control. Verify each has multiple winning columns before declaring full redundancy.
