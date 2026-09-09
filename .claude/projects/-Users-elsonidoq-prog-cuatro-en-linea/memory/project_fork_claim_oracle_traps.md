---
name: project_fork_claim_oracle_traps
description: "Checking a fork/threat claim like \"makes both winning squares live at once\" — GRAVITY-TOP is the discriminator; a forkCells-length proxy and an all-completing-cells count each produced a confident wrong number, in opposite directions, on the same 25 aliases"
metadata: 
  node_type: memory
  type: project
  originSessionId: e109b492-9966-4e14-8358-10e8d664791d
  modified: 2026-09-03T16:41:41.109Z
---

**Trigger: about to verify any render-layer claim of the form "N winning squares", "a fork", "a double
threat", or "live at once" against the board.** Three oracles look reasonable. Two are wrong, and they
fail in *opposite* directions, so agreeing with one of them proves nothing.

Measured 2026-09-03 over the 63-record corpus, on the 25 `-fork-pivot` aliases whose role text says
*"the move that makes both winning squares live at once"*.

| oracle | verdict | why it is wrong |
|---|---|---|
| `half.forkCells.length < 2` | 12 violations | **Wrong field, and inapplicable to one of the three mint paths.** Several of these halves have no `forkCells` key *at all* (`eval-43`: `kind: realized_pattern`, `cells: [...]`, `forkCells: undefined`) because their pivot comes from `boardTagPivotCell`, not `forkPivotCell`. A literal `.length` throws or reads 0. |
| count every empty completing cell | **0 violations** | Too permissive. On `pin-L5-deep-fork` it counts `c4r3`, `c4r4`, `c4r5` — all **stacked in column 4**, only one playable. Nearly caused a real issue to be retracted as a proxy artifact. |
| count **gravity-top** completing cells | 11 violations | Correct. "Live at once" means *playable at once*. |

## The rule

**A stack of completing cells in one column is not two live squares.** The upper ones are unreachable
until the lower fills, and the opponent simply answers the bottom one. Any "two threats" /
"double threat" / "fork" claim must be checked with `colHeights[col] === row`, not merely
`grid[row][col] === 0`.

## The placement bug this implies, which is easy to write and silent

A probe that places a hypothetical disc must check reachability *before* placing:

```js
if (g[r0]?.[col] !== 0) { skipped++; continue; }   // occupied — NOT enough
if (hs[col] !== r0)     { skipped++; continue; }   // gravity-top — the one you forget
g[r0][col] = player; hs[col]++;
```

Without the second line you drop a **floating disc** into mid-air over an empty cell and corrupt
`colHeights`. On `pin-branch-invariance-true-1` (`opp-fork-pivot = c5r3`, `colHeights[4] === 1`, pivot
row `2`) this hid the two genuine completing cells and reported **"0 live winning squares"** — the most
dramatic number in the issue, and pure artifact. An unreachable pivot is **undecidable on that board**,
not board-false; skip it, don't score it.

## Two more properties of this class of audit

- **The count is a FLOOR.** A gravity-top sweep counts every completing cell for that owner, including
  ones already live before the pivot and ones belonging to a different line. It cannot distinguish
  "this pivot created them" from "they were there".
- **Watch whose turn it is.** Placing an `opp-` pivot on the `decision` board models the opponent moving
  when it is actually the player's turn. Verdicts usually survive, but the model is an approximation —
  say so rather than presenting it as board truth.

## Why this keeps happening here

This is the third instance of one defect class in the render layer — a role text asserting a
cardinality the board does not support (T031/OI-180 on `double`; D63/OI-225 on `-fork-square`;
OI-227 on `-fork-pivot`). **When you fix one branch of `roleText`, audit its siblings in the same
change** — each fix so far has left the next one standing.

Related: [[feedback_verify_at_the_source_layer]] (the proxy-vs-source rule this instantiates),
[[project_reason_render_layer]], [[feedback_eval_design_methodology]].
