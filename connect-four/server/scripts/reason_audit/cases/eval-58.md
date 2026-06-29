# Audit — eval-58 (z_threat, WIN→DRAW flip)

## verdict: SUFFICIENT (via `concrete_line`) — parity_control NOT validated

## parity_control_validation: **NO**
eval-58 does **NOT** validate the `parity_control` rung. Combined with the sibling eval-49
(also NO), **parity_control has NO valid case across BOTH of its only two candidates.**
→ Per the epic's §16 fallback, the rung must **ship dark** (no frozen validating case exists).

The blunder IS fully explainable from the engineered feature vector, but it grounds as
**`concrete_line`**, not `parity_control` — same mechanism, same detector failure as eval-49.

## Case facts
- movestring (pre-move, 36 discs): `333334104445143466655611556122222216`
- mover = **Green (P1, perspective 1)** — 36 discs ⇒ P1 to move (move 37). Green is the controller.
- move_played = **0** (internal col0 = display col1); correct_move = **5** (internal col5 = display col6).
- Pre-move solver (Green POV): `[0,-1000,-1000,-1000,-1000, 2,-1000]` ⇒ best internal col5 = **+2 WIN**, played internal col0 = **0 DRAW**. FLIP confirmed → Branch A (FLIP).
- threat_cells = `[{row2,col0},{row3,col0}]` = **c1r3 (Green major)** stacked directly under **c1r4 (Gray major)** in the leftmost column.
- Only **two** open columns pre-move: internal col0 (display1, 5 empty) and internal col5 (display6, 1 empty = the spare tempo).

## What actually happens (single-open-column zugzwang)
- **BEST (col5/display6):** Green fills the spare-tempo cell. Now col0 is the ONLY open column;
  Gray is forced in. Gray plays the bottom (display r2 / internal row1), then Green plays
  **c1r3** (internal row2) → terminal four. Forward plies = **3**, register = **forced_sequence**.
- **PLAYED (col0/display1):** Green drops into col0 himself (display r2), making his own winning
  cell c1r3 gravity-top **on Gray's move**. Gray occupies/neutralizes c1r3 → **draw**. Green burned
  the zugzwang tempo (left the spare col6 for the opponent to pass back the move).

## routed_kind: `concrete_line`  (catalog guess was parity_control)

### Hand-built payload
```json
{
  "register": "forced_sequence",
  "kind": "concrete_line",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "betterMoveDoes": "Playing c6r6 wins in 3 plies; the move played only draws.",
  "line": {
    "winner": "player",
    "completingCell": "c1r3",
    "col": 0,
    "winningLines": 1,
    "realizedOnPly": 3
  }
}
```

## §14 checks

### parity_control check — FAILS (ungroundable, same as eval-49)
Same-perspective pass (perspective = Green = 1) via `parity_cells.mjs`:
| board | `zThreatCells` (odd-distance) | `allThreatCells` |
|---|---|---|
| pre-move | `[]` (c1r3 is distance **2 = EVEN**) | `[c1r3]` |
| BEST (col5) | `[]` (still even) | `[c1r3]` |
| PLAYED (col0) | `[c1r3]` (now distance **1 = ODD**) | `[c1r3]` |

- keptCells (BEST, same-perspective z-threat set) = **`[]`** → violates the NON-EMPTY requirement.
- The z-threat detector fires on the **PLAYED (worse) board**, not the best board — control
  signal **inverted** relative to what a parity_control payload asserts.
- Root cause (identical to eval-49): the winning threat is an **EVEN-distance** threat;
  `detectZThreat`'s predicate is odd-distance-only, so it cannot see the kept threat on the best
  board and only lights up after Green fills beneath it. Plus `detectZThreat` returns `cells:[]`
  and hits the FR-033 recursion path when perspective ≠ currentPlayer.
  ⇒ **PAYLOAD_UNGROUNDABLE for parity_control.**

### concrete_line check — PASSES
- completingCell **c1r3 re-solve-confirmed decisive**: after `...165` (best) + forced Gray `0`
  (only open column) → Green `0` lands internal row2; `checkWin(board, 2, 0, player=1) === true`
  (terminal Green four). Window completes under optimal (forced single-column) defense.
- Solver outcome flips (win→draw). forwardPlies 3 / register forced_sequence
  (via forward_distance.mjs: col5 score=2 forwardPlies=3).

## Does the payload explain WHY it's a blunder?
Yes. `concrete_line` (completingCell c1r3, forward distance 3, "you had a forced win; playing the
left column yourself let Gray take c1r3 and draw") is a true causal account a coach can deliver.
The deeper parity nuance (Green inverted his own even threat into a neutralizable odd one by spending
the tempo) is richer but not required for sufficiency.

## missing_signal / proposal
For parity_control to be groundable, the detector layer must expose a perspective-correct
kept/surrendered cell set on the BEST board (even-distance threats for P1, odd for P2). `detectZThreat`
as spec'd (odd-only, `cells:[]`) reports the opposite. `parity_cells.mjs.allThreatCells` is the natural
perspective-clean source. Until a NEW signal exists, parity_control routing must defer to concrete_line
whenever a decisive completingCell exists (it does here) — masking the gap. Epic §16: ship parity_control dark.

## evidence (commands)
- `./visualize_board.sh 333334104445143466655611556122222216` (pre) / `...165` (best) / `...160` (played)
- `node server/scripts/reason_audit/TOOLS/parity_cells.mjs <ms> 1` (pre/best/played) → zThreatCells empty on BEST, fires on PLAYED
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs 333334104445143466655611556122222216 5 0` → col5 win/3/forced_sequence, col0 draw
- inline `checkWin(Board('...1650').board, 2, 0, 1) === true` → c1r3 decisive

## tools_used
- `./visualize_board.sh`; `parity_cells.mjs`; `forward_distance.mjs`; inline `Board`/`checkWin`.

## tools_created
- none (reused parity_cells.mjs from eval-49).

## one-line lesson (handoff log)
eval-58 confirms eval-49's finding: both z_threat WIN→DRAW candidates are single-open-column
zugzwangs that route to **concrete_line** (decisive completingCell), and `detectZThreat` (odd-only,
cells:[]) fires on the WRONG board → `parity_control` has **NO valid case across both candidates**
and must ship dark (epic §16).
