> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# eval-1 — VERIFY pass — verdict: SOUND (grain `zugzwang_class`)

**One-line:** Draw→loss flip on a 2-disc opening. The router correctly REFUSES to name a four
(non-canonical board-fill terminal) and REFUSES `opening_principle` (centrality is not solver-monotone),
landing on `zugzwang_class` — an honest, non-fabricating classification of the loss.

This is the BIG-GAP stress case from iteration 2 (`cases/eval-1.md` flagged it PAYLOAD_UNGROUNDABLE /
ROUTING_GAP). Under the iteration-3 five-grain contract it is **no longer a gap**: `zugzwang_class` is
exactly the honest coverage for a diffuse flip with no nameable cell.

## Case
- board_state `44` (2 discs, Green/P1 to move), move_played 4, correct_move 3, category suboptimal_move.
- Solver from `44` (per-col, mover Green/P1): `[-3,-2,-3,0,-1,0,-4]`.
  - col3 (correct) = 0 DRAW; col5 = 0 DRAW; col4 (played) = -1 LOSS. → **FLIP** (best draw / played loss).

## Router trace (§5)
- flip = (draw != loss) = **true** → rule 1 (`not_a_blunder`) does not apply.
- **Rule 2 (`line` / `line_parity`) — FAILS** (no nameable winning four; refutation duty a + b).
- **Rule 3 (`opening_principle`) — FAILS** (centrality not solver-monotone; refutation duty c→here labeled b).
- **Rule 4 → `zugzwang_class`.** ✓

## Refutation duties

### (a) No winning four nameable on either PV → cannot be `line`
- BEST branch `443`: `optimal_line.mjs 443` → "board full, no win" (draw, no completing four).
- PLAYED branch `444`: `optimal_line.mjs 444` → terminal win for P2 at **completingPly 42** (the last cell),
  window = top row `c1r6..c4r6`. `decisive_check 444 c1r6` → "DECISIVE" — but that is a SINGLE optimal line.
- **Interchangeability probe** (40 random-optimal both-sides playouts from `444`): the win completes through
  **two distinct windows** — `c1r6|c2r6|c3r6|c4r6` (36×) and `c2r6|c3r6|c4r6|c5r6` (13×). Both are top-row
  board-fill artifacts. The completing four is **non-canonical** → §8 gate 2 forbids naming it → not `line`.
- `forward_projection 444 20` and the full `optimal_line` trace show **P1mj:[] P2mj:[]** at every ply
  (4–23) — there is NO standing major threat anywhere on the line until the board fills. Nothing to name.
- `line_parity` also fails: `parity_cells.mjs` on `444`/`443`, both perspectives → `zThreatCells:[]`,
  `allThreatCells:[]`. No standing threat whose ownership flips.

### (b) `opening_principle` must be REFUSED even at 2 discs → would FABRICATE
- Gate 4 requires line-participation (centrality) be solver-monotone across candidates. From `44`:
  col5 is strictly LESS central than the played col4 (centrality -2 < -1) yet scores strictly BETTER
  (0 DRAW > -1 LOSS). "more central = better" is **false** for this exact position.
- Emitting `opening_principle` here (or production's `detectCenterDominance`, which fires geometrically with
  no solver guard) would manufacture a refuted reason. Correctly refused.

### (c) Forward projection fixes `noThreatWithinPlies`
- `forward_projection 444 20` → no major threat for either side within the horizon (terminal null at p23).
  Conservative verified value: **noThreatWithinPlies = 20**.

## Register (§4: `*Plies = 43 − 2·|score| − discs`)
- `forward_distance.mjs 44 4 3 5` → col4: score -1, **forwardPlies 39, register slow_zugzwang**;
  col3 & col5: draw (no register).
- bestPlies = "none" (draw); playedPlies = 39; phase/word = **slow_zugzwang** (loss resolves at ~ply 42,
  near board fill). NOTE the disc-count "opening (≤6)" phase rule and the resolution-horizon "slow_zugzwang"
  word disagree here; the resolution horizon is the load-bearing one (see defect below).

## Golden reason
```json
{
  "grain": "zugzwang_class",
  "winner": "opponent",
  "outcomeDelta": { "best": "draw", "played": "loss" },
  "register": { "bestPlies": "none", "playedPlies": 39, "phase": "slow_zugzwang", "word": "slow_zugzwang" },
  "zugzwang": { "noThreatWithinPlies": 20 },
  "betterMoveDoes": "Holds the draw instead of conceding a long-range zugzwang loss that resolves only as the board fills (~ply 42); no winning four or standing threat is nameable within 20 plies."
}
```

## player_sentence (honest no-move-lesson note)
"There's no tactic to point at here: column 4 loses only to a deep board-fill zugzwang ~40 plies away, with
no threat visible in the near term. Columns 3 and 5 both draw — prefer either, but don't expect a teachable
pattern, the difference is purely long-range parity."

## defect (minor, GENERAL — not blocking)
The §4 `register` couples `phase` ("opening if discs≤6") with `word` (forward-distance bucket). For a
low-disc FLIP whose crux resolves near fill (this case: 2 discs but resolution at ply 42), the two disagree.
**General fix:** define `phase` from the PLAYED line's resolution horizon (forward distance), not from current
disc count, so flips are described by WHERE they resolve. The `zugzwang_class` grain otherwise covers the
board honestly; no new field/router change needed.

## Verdict
**SOUND.** `zugzwang_class` is honest coverage (classification, not coaching). The iteration-2 "uncovered
draw→loss near-opening flip" gap is closed by the five-grain contract: the algorithm refuses to name a cell
and refuses the opening principle, yet still emits a truthful non-OMIT reason.

## tools_used
visualize/solver (inline), forward_distance.mjs, parity_cells.mjs, optimal_line.mjs, decisive_check.mjs,
forward_projection.mjs.
## tools_created
`scratchpad/interchange.mjs` — random-optimal-playout interchangeability probe (proves non-canonical
terminal). Ephemeral; promote to TOOLS/ if other zugzwang_class cases need the same check.
