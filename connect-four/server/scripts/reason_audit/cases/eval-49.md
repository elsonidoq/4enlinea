# Audit — eval-49 (z_threat, WIN→DRAW flip)

## verdict: SUFFICIENT (via `concrete_line`) — but parity_control NOT validated (ROUTING_GAP for that rung)

The blunder IS fully explainable from the engineered feature vector, but it grounds as
**`concrete_line`**, not `parity_control`. The pivotal claim the epic hoped to test —
that eval-49 validates the `parity_control` rung — is **FALSE**. The spec'd
`parity_control` payload is **ungroundable** here: `detectZThreat` produces an empty
kept-cell set on the BEST board and only fires (inverted) on the PLAYED board.

## Case facts
- movestring (pre-move, 35 discs): `33241034112213235544401245230150005`
- mover = **Gray (P2, perspective 2)** — 35 discs ⇒ P2 to move (move 36).
- move_played = **6** (internal col6 = display col7); correct_move = **5** (internal col5 = display col6).
- Solver pre-move (Gray POV): `[-1000,-1000,-1000,-1000,-1000, 3, 0]` ⇒ best internal col5 = **+3 WIN**, played internal col6 = **0 DRAW**. FLIP confirmed → Branch A.
- threat_cells = `[{row:1,col:6}]` = **c7r2** (display col7 row2 / internal col6 row1) — Gray's key cell.

## What actually happens (zugzwang, single open column)
- After BEST (col5): only one open column remains (internal col6 / display col7, 6 empty cells, **even** count). Green is forced into it (score -3). Green plays the bottom; Gray then plays **c7r2** → terminal win. Forward plies = **2**, register = **immediate**.
- After PLAYED (col6): Gray drops into the only open column **himself**, inverting parity. Green replies by taking **c7r2** (score 0) → draw. Gray wasted the zugzwang.

## routed_kind: `concrete_line`  (catalog guess was parity_control)

### Hand-built payload
```json
{
  "kind": "concrete_line",
  "flip": { "best": "win", "played": "draw" },
  "controller": "player",
  "completingCell": "c7r2",
  "decisiveLine": {
    "owner": "player",
    "completingCell": "c7r2",
    "winningLinesThroughCell": 1,
    "realizedOnPly": 2
  },
  "forwardPlies": 2,
  "register": "immediate",
  "narrative": "Gray had a forced win: every Green reply is forced into the only open column, after which Gray completes four at c7r2. Playing col7 himself surrendered the tempo, letting Green occupy c7r2 and draw."
}
```

## §14 checks

### parity_control check — FAILS (ungroundable)
Same-perspective z-threat pass (perspective = Gray = 2), via `parity_cells.mjs`:
| board | `detectZThreat` zThreatCells (odd) | allThreatCells |
|---|---|---|
| pre-move | `[]` (c7r2 is badgeCount **2 = EVEN**) | `[c7r2]` |
| BEST (col5) | `[]` (still even) | `[c7r2]` |
| PLAYED (col6) | `[c7r2]` (now badgeCount **1 = ODD**) | `[c7r2]` |

- keptCells (BEST, same-perspective) = **`[]`** → violates the NON-EMPTY requirement.
- The z-threat detector fires on the **PLAYED (worse) board**, not the best board — the
  control signal is **inverted** relative to what a parity_control payload asserts.
- Root cause: Gray's threat is an **EVEN** threat (correct zugzwang weapon for P2).
  `detectZThreat`'s predicate is **odd-distance only**, so it cannot see the kept threat
  on the best board; it only lights up after Gray fills beneath it (making it odd +
  immediately neutralizable). Plus `detectZThreat` ALWAYS returns `cells:[]` (geometry is
  in a capsule `highlightMetadata`), and on these boards perspective≠currentPlayer
  triggers the FR-033 recursion path that returns `{matched, cells:[]}` with no geometry.
  ⇒ **PAYLOAD_UNGROUNDABLE for parity_control.**

### concrete_line check — PASSES
- completingCell c7r2 re-solve-confirmed: after `...5` + forced Green `6` + Gray `6` → TERMINAL Gray win (`Invalid position` = 4-in-row reached). Decisive.
- Solver outcome flips (win→draw). forwardPlies 2 / register immediate.

## Does the payload explain WHY it's a blunder?
Yes. `concrete_line` (completingCell c7r2 + forward distance 2 + "surrendered tempo")
is a TRUE causal account a coach can deliver: "You had a forced win at c7r2; playing
col7 yourself let the opponent take that cell and escape to a draw." The deeper parity
nuance (you inverted an even threat into a neutralizable odd one) is richer but not
required for sufficiency.

## parity_control_validation: **NO**
eval-49 does **not** validate the parity_control rung. The mechanism is a single-open-column
zugzwang whose win is a short, concrete, re-solve-confirmable completing cell — exactly
`concrete_line` territory. Worse, the spec'd parity_control detector (`detectZThreat`,
odd-only, cells:[]) gives an empty/inverted kept set here. The epic's frozen finding stands:
**`parity_control` still has NO valid case — a headline gap.**

## missing_signal / proposal
If parity_control is to be groundable at all, the detector layer must:
1. Expose **even** threats (P2) / odd threats (P1) as a perspective-correct kept/surrendered
   **cell set** (not the odd-only capsule). `parity_cells.mjs.allThreatCells` already does
   this perspective-cleanly and is the natural source.
2. Define "controller flips" on the **even/odd-correct** threat, comparing BEST vs PLAYED:
   here BEST keeps c7r2 as a live even threat in a zugzwang; PLAYED neutralizes it. That IS
   a real parity story — but it requires a NEW signal, because `detectZThreat` as spec'd
   reports the opposite. Until then parity_control routing must defer to concrete_line
   whenever a decisive completingCell exists (which it does here), masking the gap.

## tools_used
- `./visualize_board.sh` (pre/best/played)
- `node server/scripts/print_lookahead.mjs <ms> 6` (distilled: immediate_threat, completingCell c7r2, win 2 plies)
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs <ms> 5 6`
- inline `createSolverProcess` decisive-line confirmation
- `node server/scripts/reason_audit/TOOLS/parity_cells.mjs` (created)

## tools_created
- **`server/scripts/reason_audit/TOOLS/parity_cells.mjs`** — same-perspective, solver-free
  z-threat/odd-threat + all-threat cell extractor. Works around detectZThreat's `cells:[]`
  + FR-033 recursion trap. Reusable by other auditors.

## one-line lesson (handoff log)
z_threat WIN→DRAW "parity" flips with a single open column are **concrete_line** (decisive
completingCell), and `detectZThreat` (odd-only, cells:[]) fires on the WRONG board — so it
cannot ground parity_control. Makes **eval-58** (the other z_threat win→draw) redundant:
expect the same concrete_line routing + same parity_control non-grounding.
