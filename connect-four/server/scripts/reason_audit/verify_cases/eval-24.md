> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# eval-24 — VERIFY — verdict: SOUND — grain: `zugzwang_class`

Maps cleanly onto the **eval-2 zugzwang_class template** (deep win→draw FLIP, diffuse, no canonical
cell). The iteration-2 audit's PAYLOAD_UNGROUNDABLE verdict was against the OLD ladder
(parity_control→concrete_line→positional, which fabricated center_control). Under the unified §5 router
the same board routes soundly to **zugzwang_class** — exactly the OMIT-but-with-a-truthy-register outcome
the old audit asked for.

## Case
- board_state `333332562100` (12 discs), move_played col **4**, correct_move col **0**, `drawing_move`,
  is_sparse, severity 1. Green (P1) to move.
- Pre-move per-col solver scores (Green to move): `[2, 0, 2, 2, 0, 2, 2]`.
  - Winning cols (score 2): **0, 2, 3, 5, 6** — both edges (0,6) AND center (3).
  - Drawing cols (score 0): **1, 4** — col 4 is the played move.
- FLIP: outcomeDelta `{best:"win", played:"draw"}`. `Major threats: none` on the pre-move board.

## §5 router walk (FLIP branch)
**Rule 1 (not_a_blunder)** — N/A: this is a FLIP (win→draw), discriminating outcome difference exists.

**Rule 2 (line / line_parity)** — REFUSED. A winning four exists on the best branch but is **non-canonical
and blockable**, and the terminal is a **diffuse multi-win board-fill, not a forced single line**:
- `optimal_line.mjs 3333325621000` (col0 best) → terminal win, completingCell **c2r3**, completingPly **39**
  (board-fill), winningWindows = **2**.
- `decisive_check.mjs 3333325621000 c2r3` → **BLOCKABLE** (`defenderCouldOccupyCandidateWhenGravityTop:true`).
- col3 branch: `optimal_line.mjs 3333325621003` → completingCell **c2r6**; `decisive_check 3333325621003 c2r6`
  → **BLOCKABLE**.
- 5 of 7 columns win → the win is overall parity/zugzwang superiority, not one forced four. §8 gate 2
  ("never a non-canonical diffuse terminal") forbids naming a cell → `line` refused.

**Rule 2 line_parity sub-case** — REFUSED. No standing on-board threat whose ownership flips:
- `parity_cells.mjs 333332562100 1` and `… 2` → `zThreatCells:[]`, `allThreatCells:[]` (both perspectives).
- The winning threats only materialize deep in the forced line: `forward_projection.mjs` shows the first
  major threat (c2r3) appearing at p15 (3 plies forward) and it is never gravity-reachable/decisive.
  No standing threat now → no ownership flip to encode → `line_parity` refused.

**Rule 3 (opening_principle)** — REFUSED (§8 gate 4). Two independent failures:
- NOT near-empty: 12 discs, register slow_zugzwang (resolves at +27).
- line-participation is NOT solver-monotone: best = **edge col0** while center col3 is *also* a win and
  center-ish col4 *draws*. The most-central legal move is not the best, and 5 winning columns span
  edge→center, so centrality/line-participation has no monotone relation to the solver. (This is the
  iteration-2 "centrality direction is FALSE / arbitrary" finding — under the unified grain it simply
  fails gate 4 and never emits.)

**Rule 4 (zugzwang_class)** — LANDS. FLIP + diffuse + no canonical cell + no standing parity threat.
Body `zugzwang.noThreatWithinPlies = 27`.

## register — slow_zugzwang
- `forward_distance.mjs 333332562100 0 4 3` → col0 win forwardPlies=**27** register=**slow_zugzwang**;
  col3 win forwardPlies=27; col4 draw (no register).
- Formula check: bestPlies = 43 − 2·|2| − 12 = **27** (matches). playedPlies = draw → **"none"**.
- phase: 12 discs (>6) and bestPlies 27 (near fill) → word **slow_zugzwang**.

## noThreatWithinPlies = 27
`forward_projection.mjs 333332562100 22` → terminal **null** (no decisive terminal within 22 plies; the
threats that appear are non-gravity, non-decisive). The win does not resolve into a nameable four until the
board-fill at +27 (completingPly 39). So no standing/decisive threat exists within the 27-ply run to
resolution → `noThreatWithinPlies: 27`, grounded by forward search (§8 gate 5 satisfied).

## winner = player
Green (P1, the mover whose move is graded) has the win on best and only draws on played → winner `"player"`.

## player_sentence
"Most moves here keep a slow endgame win — col 1 throws it away to a draw. The win only shows up ~27 plies
later as the board fills, so there's no single threatening square to point at; it's a parity/zugzwang win."

## defect
None. The unified grain set resolves the iteration-2 PAYLOAD_UNGROUNDABLE: zugzwang_class is the
sound landing, betterMoveDoes is templated only from verified fields (no center_control fabrication), and
the honest "no nameable four" is carried by a truthy register + noThreatWithinPlies. The old finding's
demanded fixes (suppress positional on slow_zugzwang / winningColumnCount>1, OMIT) are subsumed by router
rules 3→4 plus gate 4.

## Redundancy with eval-2
**CONFIRMED redundant.** eval-24 is the same template as the predicted eval-2 zugzwang_class case: a deep
win→draw (or symmetric) FLIP where (1) parity_cells is empty both perspectives, (2) every optimal
completion is BLOCKABLE / multi-win diffuse (no decisive cell), (3) the position is mid/late game (not
near-empty) so opening_principle fails, and (4) the win is a board-fill zugzwang. Any other drawing_move
FLIP that shares these four solver signatures (empty parity cells + blockable completions + multi-winning-
column diffuse terminal + non-opening) routes identically and needs no separate hand-derivation — only a
quick check that no decisive cell exists. eval-24 strengthens the template with the extra stress that the
**best move is the edge** (col0) and 5/7 columns win, proving the router does NOT lean on centrality.

## tools_used
- `./visualize_board.sh 333332562100` (scores [2,0,2,2,0,2,2], no major threats)
- `forward_distance.mjs 333332562100 0 4 3` → col0/col3 win +27 slow_zugzwang; col4 draw
- `parity_cells.mjs 333332562100 1` / `… 2` → all empty
- `forward_projection.mjs 333332562100 22` → terminal null (diffuse)
- `optimal_line.mjs 3333325621000` (col0) win@p39 c2r3 / `… 3333325621003` (col3) c2r6 / `… 3333325621004`
  (col4 played) → "board full, no win" (DRAW)
- `decisive_check.mjs 3333325621000 c2r3` / `… 3333325621003 c2r6` → both BLOCKABLE

## tools_created
- none (reused existing)
