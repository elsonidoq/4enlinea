# eval-55 — VERIFY: both-lose accelerated-opponent-line → grain `line` (winner opponent)

## verdict: SOUND — grain `line`, winner `opponent`

Maps cleanly to the eval-7 / eval-42 both-lose template: the opponent four is the SAME diagonal on
both branches but is **accelerated** on the played branch (terminal ply 26) versus the best branch
(terminal ply 34). That timing gap is the discriminator → router rule 2 ("accelerated opp line on
played") fires `line`, NOT `not_a_blunder`. Re-solve-confirmed decisive on both branches.

## case facts
- board_state `33331042654101441336` (20 discs), **Green (P1, mover)** to move. pattern_category `overcut`, severity 1.
- pre-move per-col scores (Green to move): `[-5, -5, -11, -1000, -9, -11, -5]` → **every column loses ⇒ SAME-floor BOTH-LOSE**. No flip.
- correct_move col **0** (0-idx) = display **c1** → score **-5** (least-bad loss; dataset best).
- move_played col **4** (0-idx) = display **c5** → score **-9** (loss, worse floor magnitude).
- After either move it is **Gray (P2, opponent)** to move and Gray wins both branches.

## router (§5) trace
- `flip = (best loss != played loss)` → **false** (both loss).
- Rule 1 would give `not_a_blunder` ONLY IF no discriminating reachable winning four. Here a winning
  four IS reachable and discriminating (accelerated on played) → Rule 1 does NOT apply.
- Rule 2: opponent four re-solve-confirmed decisive on the crux (played) branch, accelerated vs best.
  No standing threat whose ownership flips → **grain = `line`**, winner = **opponent**.

## the opponent four (named on each branch)
Ascending diagonal `c1r1·c2r2·c3r3·c4r4`, completing cell **c3r3** (Gray). Pre-move board confirms
c1r1=Gy6, c2r2=Gy12, c4r4=Gy4 are already Gray; c3r3 completes it.
- **PLAYED branch** (`...4`, Gray to move): optimal dual-PV terminal `win` (Gray), completingCell
  **c3r3**, completingPly **26**, single winning window `[c1r1,c2r2,c3r3,c4r4]`.
- **BEST branch** (`...0`, Gray to move): optimal dual-PV terminal `win` (Gray), completingCell
  **c3r3**, completingPly **34**, double window `[c1r1..c4r4]` + `[c2r2..c5r5]`.
- Acceleration: played lands the four **8 plies sooner** (26 vs 34). Genuine, not a mistake-mode
  phantom — both PVs are full optimal lines.

## §8 gate checks — ALL PASS
1. Outcome from solver pre-move scores (both loss). ✓
2. Cell named is the re-solve-confirmed terminal completion (decisive_check verdict DECISIVE on BOTH
   branches: "win completes through candidate under optimal defense"). Not the earliest blockable
   threat; it is the actual terminal four. ✓
3. n/a (no ownership flip → `line`, not `line_parity`).
6. NOT routed to `not_a_blunder` because a discriminating reachable line exists (the timing diff). ✓
7. `betterMoveDoes` templated from verified fields only (cell, window, both completingPlies). ✓

## register
`forwardPlies = 43 − 2·|score| − discs(20)`: best −5 → **13** (slow_zugzwang); played −9 → **5**
(forced_sequence). completingPly cross-check: 20 premove + 1 move + forwardPlies = 34 (best) / 26
(played) — matches optimal_line exactly. Phase keyed to the crux/played branch → **forced_sequence**.

## player_sentence
"You were already lost here whatever you played. Column 1 would have dragged Gray all the way to move
34 before it could land the diagonal four at c3; column 5 let Gray complete that same diagonal eight
moves sooner (move 26). When every road loses, pick the one that makes the opponent work the longest —
it gives them the most room to slip."

## defect
None. The unified `line` grain carries exactly what the old eval-42 `resistance` schema discarded: the
concrete completing cell (c3r3), the window, and the per-branch completingPly that quantifies the
acceleration (26 vs 34). The eval-42 INSUFFICIENT finding is resolved by this grain.

## evidence (commands + key outputs)
- `visualize_board.sh 33331042654101441336` → Green to move, scr `[-5,-5,-11,--,-9,-11,-5]` (both-lose).
- `visualize_board.sh 333310426541014413360` (best) / `...4` (played) → Gray to move, Gray wins both.
- `forward_distance.mjs 33331042654101441336 0 4` → col0 score −5 forwardPlies 13 slow_zugzwang;
  col4 score −9 forwardPlies 5 forced_sequence.
- `optimal_line.mjs 333310426541014413360` → terminal win Gray, c3r3, ply 34, two windows.
- `optimal_line.mjs 333310426541014413364` → terminal win Gray, c3r3, ply 26, one window.
- `decisive_check.mjs 333310426541014413364 c3r3` → DECISIVE (completes through candidate under optimal defense).
- `decisive_check.mjs 333310426541014413360 c3r3` → DECISIVE.

## tools_used
`visualize_board.sh`, `forward_distance.mjs`, `optimal_line.mjs`, `decisive_check.mjs`.
## tools_created
none.

## one-line lesson / redundancy
eval-55 is a clean both-lose `line`/opponent case: the same opponent diagonal four (c3r3) wins on both
branches but is accelerated 8 plies on the played move — the unified `line` grain expresses this with
the cell + per-branch completingPly that the old `resistance` schema could not. **Confirms redundancy
with eval-42** (same template: both-lose, discriminating accelerated opponent line; differs only in
category=overcut and disc count). Also structurally identical to eval-7. The remaining both-lose
cases (eval-11/12/14/19/23/38/44/52/61) are now very likely the same line/opponent-accelerated template
or not_a_blunder (no timing/window discriminator) — no new grain needed.
