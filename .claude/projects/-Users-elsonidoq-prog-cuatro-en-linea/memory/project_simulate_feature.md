---
name: project_simulate_feature
description: Design of the simulate() function for forward-looking pattern aggregation to feed the coach LLM
metadata:
  type: project
---

## Purpose

`explainSimulate(movestring, numPlies, anchorCell, perspective)` plays out all optimal-play continuations (all tied-best solver moves for both players) and aggregates `classifyAll` results at the **leaf nodes only**. Goal: explain *why* a move is good in terms of patterns it enables.

## Caller pattern

Caller plays the move first, then calls simulate:
```javascript
const anchorRow = board.height(col);
const anchorCell = { col, row: anchorRow };
const result = await explainSimulate(movestring + col, numPlies, anchorCell, perspective);
```

One call per candidate move; results are NOT merged across moves — presented side-by-side to the coach LLM.

## Parameters

- `movestring` — position after the move-under-analysis is already played
- `numPlies` — remaining depth (2–4 is practical range)
- `anchorCell: {col, row}` — the original disc's landing cell, passed explicitly through all recursive calls (NOT re-derived from movestring, which changes each recursion)
- `perspective: 1 | 2` — which player's patterns to aggregate; filters out noise from the other player

## Simulation tree

At each node: collect all moves with score == best_score (optimal + ties). Recurse for each. At `numPlies == 0` (or terminal): run `classifyAll`, filter to `perspective`, return leaf result.

## Aggregation types

**Type 1 — Boolean** (`forced_win`, `claimeven`, `forbidden_columns`):
`{ frequency, total, ratio }`

**Type 2 — Coordinate** (`z_threat`, `figure_7`, `j_shape`, `undercut`, `overcut`):
`{ frequency, total, ratio, cellHistogram: {"col2,row3": 8} }`

**Type 3 — Directional** (`double_threat`, `immediate_threat`):
`{ frequency, total, ratio, colHistogram: {"4": 7} }`

## Disc involvement

Each pattern result also carries:
- `withAnchorDisc: J` — leaves where the pattern's `activeCells` included `anchorCell`
- `withoutAnchorDisc: K - J`

**Requires** `classifyAll` patterns to emit `activeCells: [{col, row}]`. Until that's added, use column-proxy fallback: `involvesDisc ≈ (pattern.primaryCol == anchorCell.col)`.

## Key design decisions

- Leaves only (not every node) — cleaner semantics, cheaper
- `anchorCell` is explicit parameter, not derived from movestring
- `perspective` filters patterns — coach asks from one player's viewpoint
- Results per candidate move are separate, not merged

## Plan prompt

Full self-contained planning prompt was written in conversation on 2026-05-26; references `classifier.js`, `candidate-generator.js`, `index.js`, and KB entries `community-z-threat`, `community-parity-trap`, `allis-claimeven`.
