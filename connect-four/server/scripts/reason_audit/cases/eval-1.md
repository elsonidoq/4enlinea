# eval-1 — verdict: PAYLOAD_UNGROUNDABLE (degenerates to ROUTING_GAP under strict §14)

**One-line:** Draw→loss flip on a 2-disc opening; the ONLY kind that routes is positional/center_control,
and its payload is solver-refuted (an equally-good draw move is *less* central than the losing move), so
the vector cannot honestly state why the played move loses. This is the uncovered
**draw→loss near-opening flip** class.

## Case
- board_state `44` (2 discs, Green/P1 to move), move_played `4`, correct_move `3`. pattern_category `suboptimal_move`, severity 0, is_sparse false.
- Solver from `44` (per-col, mover=Green): `[-3,-2,-3,0,-1,0,-4]`.
  - col3 (correct) = **0 → DRAW**; col5 = **0 → DRAW**; col4 (played) = **-1 → LOSS**.
- outcomeDelta = { best: draw, played: loss } → **FLIP**.
- register: `forward_distance 44 4` → score -1, **forwardPlies=39, register=slow_zugzwang** (loss resolves at near-fill, ~ply 41).

## Routing ladder (FLIP: parity_control → concrete_line → positional → OMIT)
1. **parity_control — FAILS.** `parity_cells.mjs` on `444` and `443`, both perspectives → `zThreatCells:[]`, `allThreatCells:[]`. No parity structure at 3 discs (threat_cells=[] in catalog confirms).
2. **concrete_line — FAILS.** Loss is 39 plies out (slow_zugzwang). `print_lookahead 44 4 26`: case `better_holds_played_loses`; the only `realizedOnPly` lines (14/16) come from mistake-mode categoryExamples (`reachability.played.ceiling:"win"` is a phantom that needs the opponent to misplay). No optimal-mode decisive line within any sane depth.
3. **positional/center_control — ROUTES, but PAYLOAD UNGROUNDABLE.**
   - `detectCenterDominance({movestring:'44',playedCol:4,bestCol:3})` **FIRES** (best col3 centrality 0 > played col4 centrality -1; ply 2 ≤ MAX_PLY 6). Production emits a "column 4 is more central than column 5" reason.
   - **§14 positional check requires the principle hold on the solver. It does NOT.** From `44`, col5 (display c6, centrality -2) is strictly *less* central than the played col4 (centrality -1), yet col5 **DRAWS (0)** while col4 **LOSES (-1)**. A less-central move achieves a strictly better outcome → "more central = better" is false for this exact position. `detectCenterDominance` has no solver check, so it manufactures a plausible-but-refuted reason.

Under a strict §14 ("principle holds on solver") the positional payload is rejected → nothing grounds → reason OMITTED (ROUTING_GAP). As shipped, the detector emits an UNGROUNDABLE center_control payload (PAYLOAD_UNGROUNDABLE).

## Hand-built reason payload (what production would emit — and why it's unsound)
```json
{
  "register": "slow_zugzwang",
  "kind": "positional",
  "outcomeDelta": { "best": "draw", "played": "loss" },
  "principle": { "name": "center_control", "bestCells": ["c4r1"], "playedCells": ["c5r3"] },
  "betterMoveDoes": "Playing c4r1 holds the draw; the played c5r3 loses."
}
```
REFUTATION: c6r1 (col5) also holds the draw and is *less* central than the played c5r3, so center_control
is not the decisive differentiator. The genuine reason col4 loses is a near-fill zugzwang/parity effect
~39 plies away (3rd disc in col4 flips that column's empty-parity 4E→3O) — invisible at 3 discs.

## Evidence (commands)
- `node -e solver.query` on `44`,`444`,`443` → `[-3,-2,-3,0,-1,0,-4]`, `[-4,-3,-2,1,0,-2,-2]`, `[-18,-18,0,-18,-18,0,-18]`.
- `forward_distance.mjs 44 4 3 5` → col4: loss/39/slow_zugzwang; col3 & col5: draw.
- `parity_cells.mjs 444|443 1|2` → all empty.
- `print_lookahead.mjs 44 4 26` → case better_holds_played_loses; only phantom mistake-mode lines.
- `detectCenterDominance({'44',4,3})` → fires (geometric only, no solver guard).

## missing_signal
The vector has NO field that names "this move loses by slow zugzwang / parity decided near fill" when there
is no z-threat/claimeven structure yet AND no tree-searchable line. centerDominance is the only opening
signal and it is **not solver-validated** — it fires on geometric centrality alone and is refuted by an
equal-or-better less-central alternative.
Proposals (pick one):
- **(a) Solver-gate the positional route:** before emitting center_control, require that EVERY strictly-less-central legal move scores worse than the played move (i.e. centrality is monotone with solver score across alternatives). Here that gate kills it (col5 counterexample) → honest OMIT.
- **(b) New kind `zugzwang_opening`** for draw→loss/win→draw flips at low disc count with empty parity structure and forwardPlies near fill: payload states only "loses to long-range zugzwang; no nameable tactic" — an honest non-fabricating OMIT-with-register rather than a false center claim.

## Redundancy for the catalog
This very likely subsumes the other draw→loss small-board flips — **eval-3, eval-9, eval-13, eval-18, eval-22,
eval-25, eval-26, eval-47** — wherever (i) no parity cells at low disc count, (ii) the loss resolves near
fill (small |score|, slow_zugzwang), and (iii) centerDominance either doesn't fire or is refuted by an
equal-scoring less-central alternative. Each should be spot-checked for the col5-style counterexample, but
the class is the same: **near-opening draw→loss flips have no groundable kind; positional center_control is
unsound for them.**

## tools_used
visualize_board.sh, c4solver-wrapper (inline), forward_distance.mjs, parity_cells.mjs, print_lookahead.mjs, centerDominance.js (detectCenterDominance).
## tools_created
none (reused existing).
