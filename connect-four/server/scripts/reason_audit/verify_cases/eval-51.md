> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY — eval-51 (figure_7 / draw→loss FLIP — DECISIVENESS GATE stress: winningLines=1 fork)

## verdict: SOUND
## grain: `line` (flip-to-loss; opponent forces winning four BEYOND the immediate horizon)

Board `4333345154`, 10 discs, Green/P1 to move. Played 0-idx col0 (display c1), correct
0-idx col5 (display c6). Outcome draw→loss FLIP. Router §5 rule 2: a winning four,
re-solve-confirmed decisive on the crux (PLAYED) branch via OPTIMAL re-solve, no ownership
flip → **`line`** (not line_parity, not zugzwang_class). The opponent line sits past the
production immediate horizon (Case-1 short-circuit suppresses it in the live vector); the
golden is grounded by an explicit OPTIMAL-mode re-solve of the played branch.

## Evidence (reproducible)

### 1. Scores + outcomeDelta + register
`node server/scripts/reason_audit/TOOLS/forward_distance.mjs 4333345154 0 5`
```
per-col scores (Green): [-13,-14,-15,-14,-13,0,-14]
col 0: score=-13  outcome=loss  forwardPlies=7   register=forced_sequence
col 5: score=0    outcome=draw  forwardPlies=null register=draw_no_register
```
- played col0 = -13 → loss; best col5 = 0 → draw. outcomeDelta {best:"draw", played:"loss"} → FLIP. ✓
- register.playedPlies = 43 − 2·13 − 10 = **7** → forced_sequence bucket → word **forced_sequence**. ✓
- register.bestPlies = "none" (draw). ✓

### 2. Dual-PV (optimal_line — both sides solver-optimal)
PLAYED branch `node …/optimal_line.mjs 43333451540`:
```
terminal: win   winner: second(Gray/P2)
completingCell: c3r2   completingPly: 18
winningWindows: [["c2r1","c3r2","c4r3","c5r4"]]   (exactly ONE window)
finalMovestring: 433334515404450202
```
BEST branch `node …/optimal_line.mjs 43333451545`:
```
board full, no win  → draw, bestLine = "absent"
```
Refutation (c) handled: the BEST branch is a **draw — no winning four exists**, so
`line.bestLine = "absent"` is correct and required (a draw branch cannot name a player four).
winner = opponent; betterMoveDoes asserts the better move *avoids* the opponent four. ✓

### 3. decisive_check — the DECISIVENESS GATE stress (refutation a)
`node server/scripts/reason_audit/TOOLS/decisive_check.mjs 43333451540 c3r2`
```
verdict: "DECISIVE (win completes through candidate under optimal defense)"
winnerIsPunisher: true  completingCellIsCandidate: true  candidateInCompletedWindow: true
defenderCouldOccupyCandidateWhenGravityTop: true
winningWindows: [["c2r1","c3r2","c4r3","c5r4"]]   (length 1)
```
**The naive `winningLines>1` test would REJECT** (only ONE window through c3r2). Yet the
cell IS decisive: `defenderCouldOccupyCandidateWhenGravityTop:true` AND verdict still
DECISIVE means Green can sit on c3r2 and *still loses* — c3r2 is a **fork prong**, not a
blockable single threat. The cell passes the gate strictly via the **"window completes
under optimal defense"** criterion. → §8 gate 2 satisfied; `winningLines>1` alone is
insufficient. ✓

### 4. Fork confirmation (refutation a, corroborating)
`node server/scripts/reason_audit/TOOLS/opp_punish_probe.mjs 4333345154 0` →
```
earliestWay: { cells:[c3r2], ply:7 }
decisiveLine: { completingCell:c3r2, winningLinesThroughCell:1, fastSideRealizedOnPly:7 }
oppWinner: { tag:"double_threat", allowedSetEntries:[ cells:[c3r2,c7r2] ] }
```
`winningLinesThroughCell:1` UNDERSTATES — the engine itself tags the position
`double_threat` with prongs **[c3r2, c7r2]**: c3r2 is one head of a fork. The bare count
agrees with decisive_check's single window but both miss that occupying c3r2 hands Gray the
other prong. Decisiveness must come from re-solve under optimal defense, never from the count.

### 5. c3r2 is the genuinely decisive cell, reachable cheaply (refutation b)
`node server/scripts/reason_audit/TOOLS/opp_punish_probe.mjs 4333345154 0 8` → at **depth 8**
the search already surfaces `cells:[c3r2] ply:7 completingCell:c3r2` (identical to depth 20).
So c3r2 is not an artifact of deep search nor the earliest *blockable* threat — it is the
forced fork head, reachable affordably. ✓

## player_sentence
"Column c1 looks safe but hands Gray a forced win: Gray builds a double threat on the c2-c5
up-diagonal and completes the four at c3r2 — you cannot block both prongs (c3r2/c7r2).
Column c6 instead forces the draw."

## defect (gate insufficiency — GENERAL recommendation, not a per-case patch)
The decisiveness gate must NOT accept `winningLinesThroughCell > 1` (or any raw
window/way count) as a *sufficient* decisiveness signal: eval-51's decisive cell reads
`winningLinesThroughCell:1` yet is a forced fork. §8 gate 2 / §5 sub-rule should require the
disjunction **(completes under optimal re-solve) OR (forced terminal board-fill)** as the
operative criterion, with `winningLines>1` demoted to at most a fast *pre-filter* that can
never alone admit or reject. (Already phrased correctly in §5 sub-rules — this case is the
witness that the "winningLines>1" clause must stay an OR-branch, never a gate.)

Upstream caveat (carried from prior iter-2 audit, not a golden defect): production
`runSparseLookahead` takes the Case-1 short-circuit and emits `opponent:null` for this FLIP,
so the live vector never surfaces c3r2. The golden is grounded by the mandatory OPTIMAL
re-solve of the played branch (§5 flip-to-loss sub-rule) — confirming why that re-solve is
load-bearing and must run on every FLIP-whose-played-floor=loss.

## tools_used
- visualize_board.sh 4333345154
- TOOLS/forward_distance.mjs 4333345154 0 5
- TOOLS/optimal_line.mjs 43333451540 (played) / 43333451545 (best)
- TOOLS/decisive_check.mjs 43333451540 c3r2
- TOOLS/opp_punish_probe.mjs 4333345154 0 [8]

## tools_created: none (all needed diagnostics already in TOOLS/)

## one-line lesson
A draw→loss flip where the opponent forces a forked winning four is grain `line` with
playedLine forced:"yes" / bestLine:"absent"; the decisive cell can read winningLines=1 yet be
a fork, so decisiveness MUST come from re-solve-under-optimal-defense, never a window count.
This likely makes redundant the other FLIP-to-loss / figure_7 concrete_line cases whose live
vector carries `opponent:null` and a single-window forced fork (same shape: optimal re-solve →
single diagonal window, bestLine absent, register forced_sequence).
