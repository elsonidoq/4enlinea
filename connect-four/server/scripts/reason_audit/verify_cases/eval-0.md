# eval-0 — VERIFY — verdict: SOUND — grain: opening_principle

## Case
- board_state `""` (EMPTY board), move_played col **4**, correct_move col **3**, category `drawing_move`, is_sparse, severity 0.
- Outcome: win→draw FLIP, 0 discs.

## Golden grain: `opening_principle`
Replaces the iteration-2 `positional`/`center_control` payload. `line_participation` is the *mechanistic*
grounding (4-window count) that center_control only approximated correlationally — and it is gated to
near-empty + solver-monotone boards, which closes the eval-24 fabrication hole (eval-24 is 12 discs, not
near-empty, so it never routes here).

```json
{
  "id": "eval-0",
  "grain": "opening_principle",
  "winner": "player",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "register": { "bestPlies": 41, "playedPlies": "none", "phase": "opening", "word": "opening" },
  "principle": { "name": "line_participation", "bestCellFours": 7, "playedCellFours": 5 },
  "betterMoveDoes": "Taking the center landing cell c4r1 (it sits in 7 possible fours vs 5 for c5r1) keeps the opening win that the played move concedes to a draw."
}
```

## Evidence (reproducible)

### Solver scores + FLIP
Inline solver `query("")`:
```
empty: [-2,-1,0,1,0,-1,-2]
```
col3 = +1 (win), col4 = 0 (draw). outcomeDelta `{best:win, played:draw}` → FLIP. ✔

### §5 router
- not_a_blunder: requires NOT flip → skip (this is a flip).
- line / line_parity: no completing/decisive four exists 41 plies from terminal on the empty board → no nameable cell (gate 2). Skip.
- **opening_principle**: near-empty (0 discs) AND line-participation solver-monotone → **FIRES**.

### Refutation duty (a) — line-participation MONOTONE with solver
Geometric 4-window count of each bottom-row landing cell vs solver scores:
```
bottom-row 4-window counts per col: [3,4,5,7,5,4,3]
solver scores                     : [-2,-1,0,1,0,-1,-2]
argsort counts: [0,6,1,5,2,4,3]
argsort scores: [0,6,1,5,2,4,3]
rank-monotone (counts predict scores): true
```
Counts rank-order the solver scores exactly (both symmetric, both peak at col3). Monotonicity HOLDS →
opening_principle is permitted by gate 4. ✔ (Had this failed, opening_principle MUST NOT be emitted.)

### Refutation duty (b) — register is PHASE-AWARE
`forward_distance.mjs "" 3 4`:
```
col 3: score=1  outcome=win  forwardPlies=41  register=slow_zugzwang
col 4: score=0  outcome=draw forwardPlies=null register=draw_no_register
```
The tool's distance-only bucket calls 41 plies `slow_zugzwang` — WRONG for an empty board (no
zugzwang/parity mechanism). §4 contract override: discs=0 ≤ 6 → **phase="opening", word="opening"**. The
~41-ply opening win buckets as opening, NOT slow_zugzwang. Golden uses opening. ✔
- bestPlies = 43 − 2·|+1| − 0 = **41**; playedPlies = draw → **"none"**.

### Refutation duty (c) — strict + geometric
bestCellFours(col3 c4r1) = **7** > playedCellFours(col4 c5r1) = **5**, strict. Both equal the exact
4-window geometry (center bottom cell participates in 4 horizontal + 1 vertical + 1 + 1 diagonal = 7;
col4 bottom cell = 5). ✔

## player_sentence
"On move 1, take the center column: its landing square sits in 7 possible four-in-a-rows versus 5 for the
column you played — that extra line participation is exactly why the center first move is the only one
that wins."

## Defect
None blocking. SOUND. One TOOL gap (not an epic-paper gap): `forward_distance.mjs` distance-buckets the
register to `slow_zugzwang` and is not phase-aware; the §4 contract's opening override already corrects
this, so the algorithm-on-paper is sound. (This is prior FINDING 1, now resolved in the contract.) The
new `opening_principle`/`line_participation` grain also resolves prior FINDING 2: line-count is the real
mechanism (monotone-gated), so the eval-24 edge-best counterexample cannot fabricate here.

## tools_used
- inline solver `query("")` → `[-2,-1,0,1,0,-1,-2]`
- `forward_distance.mjs "" 3 4` (register)
- `./visualize_board.sh ""` (board/threats: none)
- inline node geometry computation of bottom-row 4-window counts (monotonicity proof)
## tools_created
- none

## Lesson + redundancy
opening_principle/line_participation on the empty board is SOUND and strictly better-grounded than the old
center_control. **Makes eval-21 redundant**: eval-21 is the same empty board, played col2 (correct col3) —
identical structure; only playedCellFours changes to 5 (col2 bottom cell also sits in 5 windows), bestCellFours
stays 7. Swap the played cell to c3r1 and the golden is otherwise identical.
