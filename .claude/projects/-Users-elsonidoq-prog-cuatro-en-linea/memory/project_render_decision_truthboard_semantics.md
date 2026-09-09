---
name: project_render_decision_truthboard_semantics
description: "Writing a programmatic detector over render_decision — a 'future' cell being OCCUPIED is the NORMAL case on projectedDeep/projectedDeepOpp, so an occupancy check without a truthBoard filter is ~97% false positives and looks like a huge finding"
metadata:
  node_type: memory
  type: project
---

**Trigger: about to write a programmatic detector that inspects `render_decision` — `requiredSet`,
`zones.aliases`, or any `future:cNrM` spec — and decide whether a cell is "wrong".**

`requiredSet` entries carry a `truthBoard`, and its value changes what "occupied" MEANS:

| truthBoard | a `future:` cell being occupied |
|---|---|
| `decision` / `afterBest` / `afterPlayed` | **anomaly** — the coach is obliged to point at a square that is not there |
| `projectedDeep` / `projectedDeepOpp` | **normal** — the projection plays the line out, so the cell gets filled by the very move being described |

Measured on the 63-board corpus (2026-09-01): of 62 occupied required cells, **60 sit on a projected
board and are correct.** Breakdown by truthBoard — projectedDeep 35 occupied / 10 empty,
projectedDeepOpp 25 / 2, decision 0 / 30, afterBest 0 / 5, afterPlayed **1** / 2.

A first version of detector D1 in `server/scripts/reason_corpus/frequency_probe.mjs` omitted the
truthBoard filter and fired on **37 of 63 boards** — it read as a systemic defect and was nearly
reported as one. Restricted to the near boards it fires on exactly **1** (`eval-47`), the single board
graders had independently flagged. The restriction is load-bearing and is commented as such in the
script; do not "simplify" it away.

**Generalisation, which is the reusable part:** validate every new detector against cases whose answer
you already know BEFORE trusting its corpus-wide count. A detector firing on a majority of boards is
far more likely to be miscalibrated than to have found a majority-wide bug. Build the board with
`new Board(ms)` where `ms` comes from `boardMs(nv, truthBoard)` (exported from `frequency_probe.mjs`)
— note `afterBest = movestring + String(bestCol)` with **no `+1`**; this corpus appends the
0-indexed column.

Related: [[project_fv_suff_answers_layer_trap]], [[project_eval_run_comparison_traps]],
[[project_reason_render_layer]].
