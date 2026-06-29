> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# eval-32 — VERIFY — verdict: SOUND

Grain: **line**, winner **opponent**. Predicted grain confirmed. This is the bounding case where
`decisiveLine.opponent` IS present in the frozen vector: the opponent's punishing four is a FAST,
on-board double_threat (realizedOnPly~1) that surfaces directly, so the opponent-line-suppression gap
seen in slow-loss cases (eval-46/eval-15) does NOT apply here.

## Case facts (eval_set_large_3.json)
- board_state `341302131131644152` (18 discs), Green (P1) to move. category immediate_threat, severity 7.
- move_played **0** (col1, 1-idx), correct_move **2** (col3, 1-idx).

## Solver evidence (commands + key outputs)

**Pre-move scores** — `visualize_board.sh 341302131131644152`:
`scr = [-12, --, 12, -12, -12, 12, -12]`. col0 = -12 LOSS, col2 = +12 WIN → **FLIP win→loss**.
Board shows TWO gravity-top Gray major threats `<*>` at **c3r3** and **c6r2** (standing double threat).

**Register** — `forward_distance.mjs 341302131131644152 0 2`:
- col0: score=-12, forwardPlies=**1**, register=**immediate**
- col2: score=12, forwardPlies=**1**, register=**immediate**
- formula 43−2·|12|−18 = 1. phase: discs=18 → midgame; word: 1 ply ≤2 → **immediate**.

**Played branch optimal_line** — `optimal_line.mjs 3413021311316441520`:
terminal **win** for `second(Gray/P2)`, completingCell **c3r3**, window **[c5r1, c4r2, c3r3, c2r4]**,
completingPly **20**, line `p20:gcol2(s12)`.

**Decisive gate (a/b)** — `decisive_check.mjs 3413021311316441520 c3r3`:
verdict **DECISIVE (win completes through candidate under optimal defense)**.
Second Gray win — `decisive_check.mjs 3413021311316441520 c6r2`: "opponent wins but through a different
window" → confirms a SECOND distinct Gray winning cell. ⇒ **winningLines>1 (double threat)** ⇒ Green
cannot block both ⇒ the opponent line is **forced:"yes"**.

**Best branch (c) — forgone player win** — `visualize_board.sh 3413021311316441522`:
Move 19 Green plays col2 landing **c3r3** → **[GAME OVER]**, Green completes diagonal
**c1r1-c2r2-c3r3-c4r4** (c1r1=Gn5, c2r2=Gn7, c3r3=Gn19, c4r4=Gn11). This is the unique saving move
(only winning survives the pre-existing double threat); the line completes by Green playing it directly
⇒ bestLine forced:"yes", completingPly 19.

Elegant convergence: both lines complete at the SAME contested gravity-top cell **c3r3** — whoever
takes it wins (Green via c1r1..c4r4; Gray, after Green wastes the tempo, via c5r1..c2r4).

**Register both moves (d)** — done above (forward_distance on cols 0 and 2): both immediate.

## §8 gate audit
1. Outcome from solver pre-move scores (not null labels): ✓
2. Cell c3r3 named only after re-solve-confirmed DECISIVE + winningLines>1: ✓ (never an earliest blockable threat)
3. n/a (grain=line, not line_parity) — winner=opponent taken from the SOLVER FLIP, not parity counts: ✓
7. betterMoveDoes asserts only verified fields (own four at c3r3 + opponent four at c3r3 next ply); no
   center/tempo/fork-mechanism narration beyond winningLines (carried as forced:"yes"): ✓

## Golden reason (frozen)
See `golden/eval-32.json`. grain=line, winner=opponent; playedLine c3r3 / [c5r1,c4r2,c3r3,c2r4] /
ply20 / forced=yes; bestLine c3r3 / [c1r1,c2r2,c3r3,c4r4] / ply19 / forced=yes;
register immediate (bestPlies/playedPlies=1, phase midgame).

## player_sentence
"You had a forced win — dropping in column 3 completes your diagonal four and ends the game; the move
you played instead lets your opponent complete their own four in that same square next turn."

## defect
None affecting the algorithm. **Minor worked-example inaccuracy** in the epic (§9, line 247): it labels
eval-32 `register.word:"forced_sequence"` at `ply~7`. The solver-grounded register is **immediate**
(|score|=12, 18 discs → 1 forward ply; opponent completes at move 20, two plies from pre-move). This is a
documentation/illustration error in the worked example, NOT a router or gate defect — fix is to correct
the worked example's word to "immediate" (no general algorithm change needed).

## tools_used
visualize_board.sh (pre / played-branch / best-branch); TOOLS/forward_distance.mjs;
TOOLS/optimal_line.mjs (played branch); TOOLS/decisive_check.mjs (c3r3 DECISIVE, c6r2 second-cell confirm).
## tools_created
none.

## Lesson + redundant cases
Lesson: when the opponent's punishing win is a fast on-board immediate/double threat, the dual-PV carries
both the opponent completing cell (played branch) and the player's forgone win (best branch) at the SAME
contested gravity-top cell — fully groundable as grain=line, winner=opponent.
Redundant: **eval-31** (same game, 17-disc prefix `34130213113164415`, Gray to move, mirror win→loss
flip, opponent win on-board immediate) — same family, groundable for the identical reason; forced_block
is just the opponent-perspective framing of the same fast tactic.
