# eval-27 — forced_block / defensive_miss

## verdict: SUFFICIENT (with one low-priority provenance note)

The FLIP/concrete_line route, hand-built with `line.winner=opponent` + a defensive_miss
`betterMoveDoes` ("the better move blocks at c2r5"), honestly and correctly explains a
failure-to-block. The pre-existing-threat provenance IS grounded — not by the `line` payload
itself, but by `patternsOpponent` (`immediate_threat:{cells:[c2r5]}` from a pre-move
opponent-perspective pass) plus the "blocks at" verb. completingCell == bestCell == c2r5
(the better move occupies exactly the cell the opponent would otherwise complete), a coherent,
self-consistent signal. No fabrication risk.

## Case facts
- board_state `2115151` (7 discs), move_played col **2** (0-idx, display col3), correct_move col **1** (0-idx, display col2).
- Mover = Gray (P2). Opponent = Green (P1).
- preScores `[-17, 1, -17, -17, -17, -17, -17]` → bestCol=1 (+1 WIN), every other col -17 LOSS.
- outcomeDelta: **best=win, played=loss** → FLIP. gap -18 (large), severity 5.
- Confirmed live: `tag:"forced_block", direction:"defensive_miss", positionTier:"WINNING"`.

## Mechanism (board evidence)
Column 2 (display) holds Gn at rows 2,3,4 (moves 3,5,7) over a Gy base at row1 → Green has a
**pre-existing immediate vertical threat at c2r5** (`<Gn>` gravity-top major threat on the
pre-move board). It is Gray's turn:
- **Block (bestCol=1):** Gray lands on c2r5, neutralizing the column. Post-best board: "Major
  threats: none", all Green replies negative → Gray wins.
- **Played (col=2):** Gray plays col3, ignoring the threat. Green plays c2r5 next ply → vertical
  four, immediate win for Green (post-played col2 score = 17 for Green).

The threat PRE-EXISTED; the played move did not create it, it failed to remove it.

## routed_kind: concrete_line  (parity_control rejected: tactical immediate loss, no kept/surrendered parity cells; ladder falls through to concrete_line)

```json
{
  "register": "immediate",
  "kind": "concrete_line",
  "outcomeDelta": { "best": "win", "played": "loss" },
  "line": {
    "winner": "opponent",
    "completingCell": "c2r5",
    "col": 1,
    "winningLines": 1,
    "realizedOnPly": 8
  },
  "betterMoveDoes": "the better move blocks at c2r5, turning a loss into a win"
}
```
(`col` 0-indexed = 1 / display col2. realizedOnPly 8 = the very next ply.)

## §14 checks (FLIP/concrete_line) — all PASS
- Named cells exist on their snapshots: c2r5 empty on pre-move/played boards (completed by Green), occupied by Gray on best board. OK.
- outcomeDelta matches solver (+1 win vs -17 loss). OK.
- register: `forward_distance 2115151 1 2` → played forwardPlies=**2** → **immediate**. OK.
  (Better move's own forward distance is 34/slow, but the register describes the blunder = the immediate loss.)
- line present on played branch (Green completes c2r5), absent on better branch (threat neutralized). OK.
- completingCell decisive: c2r5 is the sole threat and is **unblockable** from the played board (Green's move, immediate vertical completion) → "window completes under optimal defense". Not an earliest-blockable premature pick. PASS. (winningLines=1, but terminal/unanswerable.)
- betterMoveDoes asserts no extra mechanism — just "blocks". OK.

## The harder question
1. **Does concrete_line + winner=opponent + "blocks at C" honestly explain a defensive miss?**
   Yes. winner=opponent says "after your move the opponent completes a four at c2r5"; the
   defensive_miss verb "blocks" tells the coach the fix and implies the threat pre-existed (you
   can only block something already there). Together they read as a clean failure-to-block.
2. **Is completingCell provenance unambiguous — pre-move vs played board?** Recoverable but not
   self-contained. The `line` payload fields (winner/completingCell/realizedOnPly) are
   **structurally identical** whether your move CREATED the line or you FAILED TO BLOCK a
   pre-existing one. Disambiguation rests on two out-of-payload signals: (a) the defensive_miss
   `betterMoveDoes` verb "blocks", and (b) `patternsOpponent = immediate_threat:{cells:[c2r5]}`
   computed on the PRE-MOVE board. Both are present here, so the framing is grounded and a coach
   will not mis-read which board the cell is on — especially since completingCell == bestCell ==
   c2r5 makes the two readings collapse to one cell.
3. **Does the vector make clear the threat PRE-EXISTED (vs created by the played move)?** Yes, via
   `patternsOpponent`/`patternsPreMove`. Verified live: opponent-perspective classify on the
   pre-move board returns `immediate_threat:{cells:["c2r5"]}`; the production prompt already
   surfaces this as "YOUR OPPONENT's threat cells: [c2r5]". The mover-perspective pass returns
   `forced_block:{cells:[]}` (the FR-033 empty-cells trap) — so the grounded cell ONLY comes
   from the opponent-perspective augmentation, which the defensive_miss branch correctly runs.

## missing_signal (low priority — does not block SUFFICIENT)
The `line` payload carries no flag distinguishing "opponent line you created" from "pre-existing
opponent line you failed to block". Proposal: add an optional `line.preExisting: true` (or
`line.source: "pre_move_opponent_threat"`) for the defensive_miss case so provenance is
unambiguous WITHIN the payload instead of relying on cross-reference to the betterMoveDoes verb
+ patternsOpponent. Low priority because both disambiguators already exist and align.

## evidence (commands)
- `./visualize_board.sh 2115151` (pre), `21151511` (best/block), `21151512` (played) — boards above.
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs 2115151 1 2` → col1 win/34 slow; col2 loss/**2 immediate**.
- `node server/scripts/print_lookahead.mjs 2115151 2` → case `better_holds_played_loses`, edgeType `tactical`, `opponent:null`, `oppCategoryExamples:[]` (the loss mechanism is NOT in the lookahead distill — only the opponent-perspective classify pass carries c2r5).
- Inline classify (scratchpad/chk27.mjs): persp1(Green)=`immediate_threat:{cells:[c2r5]}`; persp2(Gray)=`forced_block:{cells:[]}` + minor_threat.
- AUDIT jsonl: `direction:"defensive_miss"`, prompt "YOUR OPPONENT's threat cells: [c2r5]".

## tools_used
visualize_board.sh, TOOLS/forward_distance.mjs, print_lookahead.mjs, inline classifyPattern, eval_set_large_3_AUDIT.jsonl

## tools_created
scratchpad/chk27.mjs (throwaway perspective-pair classify check; not added to TOOLS/).

## lesson / redundancy
forced_block/defensive_miss = FLIP/concrete_line with `winner=opponent`, completingCell = the
opponent's pre-existing immediate threat cell (== bestCell landing), register=immediate,
grounded by `patternsOpponent` not the mover-perspective forced_block (cells:[] trap). This
establishes the pattern and very likely makes **eval-7, eval-14, eval-31** redundant — spot-check
only that each is (a) a single pre-existing immediate threat, (b) blocked by landing on that exact
cell (threat cell == bestCell), and (c) an immediate forced loss. Re-audit any whose block column
differs from the threat cell's column or whose loss is not immediate.
