# eval-8 — VERIFY pass

## verdict: SOUND
## grain: not_a_blunder   winner: none

Same-floor BOTH-LOSE on a center-opening reply. P2 (Gray) is theoretically lost the
moment it must answer `"3"`; every reply loses. There is **no discriminating reachable
winning four** that distinguishes the played move from the best move, so the honest §5
rule-1 outcome is `not_a_blunder`. This is NOT OMIT (OMIT is solver-error only) and it
must NOT emit a "loses slower" claim.

## case facts (eval_set_large_3.json id eval-8)
- board_state `"3"` (1 disc, Green/P1 center opening at c4r1) ⇒ **Gray/P2 to move**.
- move_played col 5 (0-idx) → `"35"`; correct_move col 3 (0-idx) → `"33"`.
- pattern_category `suboptimal_move`, severity 0, threat_cells `[]`, is_sparse true.

## evidence (commands + key outputs, run from connect-four/)

### 1. Pre-move scores — every reply loses (same-floor)
`./visualize_board.sh 3`
```
scr |  -4  |  -2  |  -2  |  -1  |  -2  |  -2  |  -4  |
Major threats: none
```
Best = col3 (-1, slowest loss); played = col5 (-2). outcomeDelta {best: loss, played: loss}.
`flip = false` ⇒ §5 enters rule 1.

### 2. Register
`node server/scripts/reason_audit/TOOLS/forward_distance.mjs 3 3 5`
```
col 3: score=-1  outcome=loss  forwardPlies=40
col 5: score=-2  outcome=loss  forwardPlies=38
```
43 − 2·|score| − discs(1): col3 = 40, col5 = 38. discs=1 ≤ 6 ⇒ phase/word = "opening".

### 3. Both PVs lose to the SAME opponent at DIFFERENT, incidental terminal cells
`node .../TOOLS/optimal_line.mjs 33`  → terminal win, winner first(Green/P1),
completingCell **c5r5**, completingPly **41**, window [c2r5,c3r5,c4r5,c5r5].
`node .../TOOLS/optimal_line.mjs 35`  → terminal win, winner first(Green/P1),
completingCell **c6r3**, completingPly **39**, window [c3r3,c4r3,c5r3,c6r3].

The two branches lose via **entirely different ~40-ply optimal lines** ending at different
squares. No single standing winning four is "alive in one branch & dead in the other."

### 4. No threat structure at the crux (diffuse / non-forced)
`node .../TOOLS/forward_projection.mjs 35 6`
```
p3..p8: P1mj:[] P2mj:[]   terminal: null   startDiscs=2
```
No major threat for either player in the surfacing window; the win materializes only at
near-total board fill (ply 39/41 of a 42-max fill).

### 5. decisive_check is non-discriminating here
`node .../TOOLS/decisive_check.mjs 35 c6r3` and `... 33 c5r5` both return
"DECISIVE (win completes through candidate under optimal defense)". This is **tautological**:
each tool follows that branch's own optimal line to its own board-fill terminal and confirms
the completing cell sits in the completed window. It is NOT evidence of a forced terminal
zugzwang nor of a discriminating four — both branches "pass" with different cells. Naming
either would surface exactly the forbidden "wins sooner" (ply39 vs ply41) timing artifact.

## refutation duties discharged
(a) Both optimal PVs + decisive_check + forward_projection confirm **no discriminating winning
    four** is reachable: not an accelerated opp line the §5 grain-2 would name (the 2-ply gap is
    a board-fill artifact, both near 42-max, not a forced terminal), and no forgone player line
    (player P2 loses on BOTH branches — no player win exists to forgo).
(b) Must NOT emit "loses slower": the prior schema's `punishable=win` was a phantom
    (`reachability.best.ceiling` is ALSO win → non-discriminating near-opening reachability
    artifact) and `speed=slower` was a 2-ply board-fill noise. Both are suppressed by §6.
(c) `not_a_blunder` is the SOUND honest negative, not OMIT: the solver is fully grounded (no
    solver error / null label); the position is simply already decided.

## contrast with eval-42 (why that IS `line`, this is `not_a_blunder`)
eval-42: `412225155414` (12 discs), severity 3, pattern_category **forced_win**,
threat_cells `[{row:1,col:3}]` — a genuine flip with a concrete, reachable winning four that
the played move surrenders (a discriminating accelerated/forgone four nameable on the crux
branch). eval-8: severity 0, no threat cells, **same-floor both-lose**, opening-determined —
the loss predates the move and the terminal four is incidental to which deep optimal line is
wandered into. eval-42 has a discriminating decisive four at the decision point; eval-8 has
none.

## golden payload (golden/eval-8.json)
```json
{
  "id": "eval-8",
  "grain": "not_a_blunder",
  "winner": "none",
  "outcomeDelta": { "best": "loss", "played": "loss" },
  "register": { "bestPlies": 40, "playedPlies": 38, "phase": "opening", "word": "opening" },
  "betterMoveDoes": "position already decided; this move did not change the result reachably."
}
```

## player_sentence (honest no-lesson)
"Nothing to fix here — answering a center opening as second player is already a theoretically
lost position, so every reply loses; this move did not change the result."

## defect: none (algorithm-on-paper handles this soundly via §5 rule-1 + §8 gate 6)

## tools_used
- ./visualize_board.sh 3
- TOOLS/forward_distance.mjs 3 3 5
- TOOLS/optimal_line.mjs 33 ; TOOLS/optimal_line.mjs 35
- TOOLS/decisive_check.mjs 35 c6r3 ; TOOLS/decisive_check.mjs 33 c5r5
- TOOLS/forward_projection.mjs 35 6
## tools_created: none

## lesson
Same-floor BOTH-LOSE with two different board-fill terminal cells reached via distinct optimal
lines = `not_a_blunder`: a decisive_check "DECISIVE" verdict on a board-fill terminal is
tautological and must NOT be promoted to a grain-2 `line` — it does not discriminate the
branches.

## redundant cases
- eval-16, eval-30, eval-33: identical pre-move board `"3"`, same best=col3, differ only in the
  losing reply column → same grain (`not_a_blunder`), same payload. Fully redundant.
- spot-check eval-19 (5 discs), eval-23 (18 discs), eval-44 (11 discs): deeper both-lose sev-0
  suboptimal cases in the same honest-negative class; very likely `not_a_blunder` but deeper
  boards could harbor a discriminating accelerated four — confirm each PV pair before stamping.
