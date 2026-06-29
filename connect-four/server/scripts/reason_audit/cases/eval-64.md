# eval-64 — verdict: INSUFFICIENT (resistance passes §14 but is near-vacuous; recommend OMIT for this subclass)

**Case:** movestring `3333545554434344605506060060` (28 discs), played col 2, best col 1, pattern_category `z_threat`, severity 0, blunder_severity null.

## Verdict
**INSUFFICIENT.** The ladder correctly routes this to **resistance** (SAME-floor BOTH-LOSE; no flip, so parity_control is genuinely inapplicable — the parity battle was already lost). The hand-built resistance payload **passes every §14 check**, but it does NOT honestly explain the mistake:
- The only discriminating signal is `speed = slower` (best lasts 7 plies, played 5 → 2-ply delta).
- `punishable = reachability.played.ceiling = win` is **non-discriminating** (best.ceiling is ALSO `win` — the eval-8 problem) and is a **mistake-mode phantom** (solver shows Green loses optimally on every column, so the "win" is reachable only if Gray slips).
- This is a **severity-0** both-lost board: best −4 vs played −5, a single forced ply of difference.

So the payload reduces to "the better move loses one Gray-move slower," dressed with a `punishable=win` flag that is identical on both branches and unreachable under optimal play. It mechanically passes; it does not explain.

## Routed kind: resistance (catalog guess confirmed)

```json
{
  "register": "forced_sequence",
  "kind": "resistance",
  "outcomeDelta": { "best": "loss", "played": "loss" },
  "payload": {
    "loserSide": "Green",
    "speed": "slower",
    "punishable": "win"
  },
  "betterMoveDoes": "Playing c2r1 (col 2) loses more slowly than col 3, giving Gray more chances to go wrong."
}
```
(loserSide = Green = mover/P1; bestCell = c2r1, the bottom of internal col 1.)

## Evidence (commands + key outputs)
- `./visualize_board.sh 3333545554434344605506060060` → Next: Green; `scr` row `-- -4 -5 -- -- -- -7`. All legal cols lose for Green ⇒ SAME-floor BOTH-LOSE. Pre-move major threats already stacked in col3: `col3 row2 (Gn)`, `col3 row6 (Gy)`, plus `col7 row6 (Gn+Gy)`.
- `forward_distance.mjs 3333545554434344605506060060 1 2` →
  `col 1: score=-4 forwardPlies=7 register=forced_sequence` / `col 2: score=-5 forwardPlies=5 register=forced_sequence`. speed=slower real, **Δ = 2 plies**, both forced_sequence.
- `print_lookahead.mjs … 2 22` → `case: losing_either_way`; `outcomeTiming {best: loss/4, played: loss/5}`; `reachability {best:{floor:loss,ceiling:win}, played:{floor:loss,ceiling:win}}` ⇒ **ceilings identical**; `decisiveLine {owner:opponent, completingCell c2r2, winningLinesThroughCell:1, realizedOnPly via fast side 5}` — Gray's single-line win, in the very column (display col2) Green vacated.
- `parity_cells.mjs` (same-perspective passes):
  - played (col3) persp1 zThreatCells `[c3r2]`, persp2 zThreatCells `[c3r6]` — playing col3 turns the inner column into a stacked odd/odd threat pair.
  - best (col1) persp1 `[]`, persp2 `[]` — col3 stays empty, no z-threat created.
- `opp_punish_probe.mjs … 2` → opponent decisive cell `c2r2` (winningLinesThroughCell 1, realizedOnPly 5); no Green optimal win surfaced ⇒ ceiling=win is phantom.

## §14 grader trace (resistance branch)
- outcomeDelta {loss,loss} matches solver ✓
- register forced_sequence matches forward bucket (7,5 ≤ 10) ✓
- speed=slower ⇒ best forward distance strictly larger: 7 > 5 ✓
- punishable matches reachability.played.ceiling = win ✓
- no cell in payload ⇒ nothing to re-solve-confirm ✓
- betterMoveDoes asserts no extra mechanism ✓
**PASSES** — yet fails the harder "does it explain" test.

## missing_signal
Two distinct gaps, both in the same-floor resistance design:

1. **Non-discriminating `punishable`.** The field is defined as `reachability.played.ceiling` with no comparison to `reachability.best.ceiling`. When both ceilings are `win` (here, and on eval-8), the flag carries zero signal about why *played* is worse, and is a phantom besides (Green has no optimal win). **Proposal:** drop the raw ceiling; replace with a *delta* that is only emitted when best and played differ — `punishabilityEdge: moreChances|same|fewerChances` derived from (ceiling AND forward-distance gap), and treat ceiling=win as informative ONLY if a re-solve-confirmed Green winning cell exists under optimal play (here none → suppress).

2. **The discriminating content is discarded as unroutable.** The genuinely explanatory fact — playing col3 hands Gray the stacked zugzwang column (creates Green's c3r2 / Gray's c3r6 odd-threat pair and lets Gray win in the column Green vacated) — is z_threat geometry. Because there is no outcome FLIP, parity_control is (correctly) unavailable, so this content is dropped and resistance carries only a 2-ply speed delta. **Proposal:** for severity-0 / marginal-edge same-floor cases where the only signal is a small forward-distance delta and `punishable` is non-discriminating, the ladder should **OMIT** rather than emit a vacuous resistance — the move is barely a blunder and an honest coach would say nothing. Alternatively, allow a *non-flip* parity annotation (mechanism-only, no controller-flip claim) so resistance can name the surrendered column, but that risks over-claiming on an already-lost board.

The right product answer here is **OMIT**: severity 0, ceilings non-discriminating, edge marginal, 2-ply resistance. A grounded resistance string would be technically true but misleadingly weighty.

## tools_used
visualize_board.sh, forward_distance.mjs, print_lookahead.mjs, parity_cells.mjs, opp_punish_probe.mjs. **tools_created:** none (all reused).

## one-line lesson
Parity-TAG + SAME-floor (no flip) is NOT a routing gap — parity_control rightly can't fire on an already-lost board — but resistance then collapses to a marginal speed delta with a non-discriminating phantom `punishable`; for severity-0 / marginal-edge both-lose cases the honest output is OMIT. Likely makes **eval-54** (z_threat both-lose, 30 discs) and **eval-60/62** (claimeven both-lose) redundant: same parity-tag-same-floor class — check each for (a) speed-delta size and (b) whether best.ceiling == played.ceiling before trusting `punishable`.
