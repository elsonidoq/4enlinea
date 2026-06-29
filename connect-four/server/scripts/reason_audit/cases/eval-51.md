# eval-51 — audit

## verdict: PAYLOAD_UNGROUNDABLE
(secondary: ROUTING_GAP risk to parity_control; the epic's decisiveness gate is *necessary
but not sufficient* — it cannot fire because the production vector never surfaces an
opponent cell to gate.)

The genuinely-correct reason (a FLIP/concrete_line: the opponent forces a winning line
completing at **c3r2**) is solver-verifiable and would PASS §14 — but it is **not
groundable from the production feature vector as built**, because `runSparseLookahead`
takes the Case-1 early-return path for this case and hardcodes `opponent: null` /
`oppCategoryExamples: []`. The decisive cell is absent from the live vector entirely.

## Position
- pre-move `4333345154` (10 discs, Green/P1 to move). Per-col solver scores
  `[-13,-14,-15,-14,-13,0,-14]` → only col5 (0-idx) draws; every other col loses.
- played col0 → loss (Gray now scores +13). best col5 → draw (Gray forced to block the
  c6r4 major threat). **outcomeDelta = { best: draw, played: loss } → FLIP.**
- register: `forward_distance 4333345154 0` → forwardPlies=7 → **forced_sequence**.

## Q1 — what the live lookahead surfaces
`print_lookahead 4333345154 0` (= production `runSparseLookahead`) returns **case 1,
`better_holds_played_loses`**, with `player.tag = major_threat_parity` cells
`[c3r5,c3r3]` (Green's *lost* odd-row threats in column 3 on the BEST/draw branch),
`opponent: null`, `oppCategoryExamples: []`, no `decisiveLine`. **The opponent's winning
line is never computed.** Reason: the Case-1/2 block returns as soon as a *player-side*
structure delta exists (`out` truthy at sparseLookahead.js:634); the opponent-punishment
search at :662-688 is only reached in the *no-player-delta* fallback.

When I FORCE the Case-3 opponent search (`TOOLS/opp_punish_probe.mjs 4333345154 0`):
`decisiveLine.completingCell = c3r2`, `winningLinesThroughCell = 1`,
`fastSideRealizedOnPly = 7`; `oppWinner.tag = double_threat` cells `[c3r2, c7r2]`. Cell is
surfaced cheaply — stable from **depth 8** upward.

## Q2 — is c3r2 decisive or blockable?
`TOOLS/decisive_check.mjs 43333451540 c3r2` → **DECISIVE under optimal defense**: win
completes through window `[c2r1,c3r2,c4r3,c5r4]` at ply18. The bare
`winningLinesThroughCell:1` understates it — it is a *fork*: if Green occupies c3r2
(`optimal_line 43333451540445022`) Gray instead wins the horizontal `[c3r3,c4r3,c5r3,c6r3]`;
the alternate fork prong is c7r2. So c3r2 passes the gate via the **"window completes
under optimal defense"** criterion (NOT via winningLines>1). The earliest-surfaced cell
here **coincides with** the genuine decisive cell.

## Q3 — reachable affordably?
Yes. The opponent search surfaces c3r2 @ply7 at depth 8/12/16/20 identically. The fork
prong c7r2 emerges at ply11. A bounded iterative-deepening opponent search to ~depth 12
is sufficient and cheap.

## Q4 — the load-bearing gap
The epic frames eval-51 as the canonical *decisiveness trap* (vector exposes a blockable
@ply7 cell → naming it grounds a FALSE concrete_line). For eval-51 that framing is
**partly mischaracterised**:
1. The production vector exposes **no opponent cell at all** (opponent:null) — not a
   blockable one. So the failure mode is not "false accept of a blockable cell"; it is
   "the concrete_line payload has nothing to point at." → **PAYLOAD_UNGROUNDABLE**.
2. When the opponent cell IS surfaced (forced search), c3r2 is **genuinely decisive**, not
   blockable. The decisiveness gate's role is to **upgrade** weak evidence
   (`winningLinesThroughCell:1`) to a confirmed grounding via re-solve — preventing a false
   *REJECT*, not a false *ACCEPT*. So the gate is correct and load-bearing, but only
   *after* the upstream opponent search is made to run on FLIP-to-loss.
3. Routing risk: the only tactical content the live vector carries is Green's
   `major_threat_parity` col3 cells, which can lure the FLIP ladder into **parity_control**
   (checked before concrete_line) and misattribute the loss to "surrendered parity control"
   when the real cause is a forced fork in column 3.

## Hand-built reason (from real solver evidence — would PASS §14 if grounded)
```json
{
  "register": "forced_sequence",
  "kind": "concrete_line",
  "outcomeDelta": { "best": "draw", "played": "loss" },
  "line": {
    "winner": "opponent",
    "completingCell": "c3r2",
    "col": 2,
    "winningLines": 1,
    "realizedOnPly": 7
  },
  "betterMoveDoes": "col5 forces the opponent to block your c6r4 threat and holds the draw; col0 lets the opponent complete c3r2 in column 3."
}
```
§14 (FLIP/concrete_line): line present on played / absent on best ✓; outcome flips ✓;
completingCell re-solve-confirmed decisive ✓ (decisive_check); register = forced_sequence
matches forwardPlies 7 ✓; betterMoveDoes asserts no extra mechanism ✓. The payload is
SOUND — the only failure is that the production vector does not carry `line` for this case.

## missing_signal / proposal
On any **FLIP whose played floor = loss**, `runSparseLookahead` must run the
opponent-punishment search and emit the opponent `decisiveLine` *even when a player-side
delta already produced `out`* (lift the :662 block out of the `if (!out)` fallback, or run
it unconditionally and attach as `oppDecisiveLine`). Then apply the epic's re-solve
decisiveness gate to its earliest way (the bare `winningLinesThroughCell` count is NOT a
sufficient decisiveness signal — c3r2 reads `1` yet is decisive). Without the upstream
fix, the gate has no input and concrete_line stays ungroundable.

## tools
- used: visualize_board.sh, print_lookahead.mjs, forward_distance.mjs, optimal_line.mjs
- created: TOOLS/opp_punish_probe.mjs (force Case-3 opponent search on a played root),
  TOOLS/decisive_check.mjs (re-solve-confirm a candidate completingCell under optimal defense)

## lesson (handoff)
eval-51's real gap is not the decisiveness *gate* but opponent-line *suppression*: Case-1
early-return zeroes the opponent search whenever a player-side delta exists, so DRAW→LOSS
(and WIN→LOSS) flips that should be concrete_line surface only the player's lost threats
and `opponent:null`. The decisive cell IS cheap (depth 8) and IS genuinely decisive once
searched, so the fix is upstream (always run opponent punishment on FLIP-to-loss) + the
gate. This finding likely makes redundant other FLIP-to-loss / figure_7 concrete_line
cases that also carry a player-side structure delta (they will share `opponent:null`).
