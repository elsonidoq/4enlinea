---
name: project_explain_simulate
description: "OBSOLETE — explainSimulate.js deleted in Epic 3 (2026-06-08); kept for historical reference only"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5521e723-b304-4e1e-8057-4c823e60f521
---

> **OBSOLETE as of 2026-06-08.** `explainSimulate.js` was deleted in Epic 3 (`specs/025-patterns-blunders-epic3`).
> Replaced by `tagBlunder` + `classifyPattern` in `server/explainContext.js`.
> The DETECTOR_REGISTRY concept is gone; `classifyPattern`'s inline detector list in `classifier.js` is the sole registry.
> See [[project_epic3_coach_rebuild]] for current state.

## Historical content (pre-Epic-3)

## Current signature (2026-05-27)

```js
explainSimulate(movestring, numPlies, anchorCell, perspective, solver, options = {})
```

Returns `{ totalLeaves, anchorCell, perspective, patterns, outcomes, timing }`.

Each entry in `patterns` now includes `examples: string[]` — up to 2 leaf movestrings where that pattern fired (collected in `aggregateLeaves`; `MAX_EXAMPLES = 2`). Callers extract like:
```js
const userExamplesByPattern = {};
for (const [name, entry] of Object.entries(userResult.patterns)) {
  if (entry.examples?.length > 0) userExamplesByPattern[name] = entry.examples;
}
```
The `ms` field is set on `depth_limit` and `intermediate` leaf objects (not on won/draw terminals whose `patterns` is null).

- `options.detectors` — string[] of detector names to enable. Default: all 11 in `DETECTOR_REGISTRY` (including `'claimeven'`). Filter to exclude: `DETECTOR_REGISTRY.map(d=>d.name).filter(n=>n!=='claimeven')`.
- `timing` — `{ totalMs, solverCalls, solverCacheHits }`. `solverCalls` = cache misses only.

## Detector registry

`DETECTOR_REGISTRY` is exported from `explainSimulate.js`. Each entry:
```js
{ name: string, fn: Function, isAsync: boolean, histType: 'col'|'cell'|null }
```
Sync detectors called as `fn(board, scores)`; async (`claimeven`) as `fn(board, solver)`.
**Adding a new detector = one entry in DETECTOR_REGISTRY; no other code changes required.**

`histType` controls the histogram field on each pattern entry:
- `'col'`  → `colHistogram` keyed by column index string
- `'cell'` → `cellHistogram` keyed by `"colC,rowR"`
- `null`   → no histogram

Only patterns in the active registry appear as keys in the output `patterns` object.

## Claimeven cost

`detectClaimeven` is async, ~20 solver queries per call. At `numPlies=3` (b≈3) this adds ~260 extra queries on top of ~40 for the tree walk. Check `result.timing.solverCalls` to measure actual cost per position.

## Leaf taxonomy

- `'won_by_perspective'` / `'won_by_opponent'` / `'draw'` — terminal; `patterns: null`
- `'depth_limit'` — `numPlies === 0`, game live; classified only if `currentPlayer === perspective`
- `'intermediate'` — perspective-to-move non-terminal node emitted while recursing

### Pattern ratio denominator

`perspectiveLeaves` = depth_limit + intermediate leaves where `currentPlayer === perspective`. Used as denominator so ratios are stable across depth and not diluted by won/draw branches.

### Intermediate-node accumulation

At every non-terminal perspective-to-move node, an `'intermediate'` sample is emitted **and** recursion continues into children. Patterns visible at shallow depth (resolved by later plies) are captured and not washed out.

### Transposition deduplication (classCache)

A `Map<movestring, patterns>` deduplicates classification work. A position reached via multiple optimal paths is classified once and emitted once. This underweights frequently-reached transpositions (counts once, not proportionally), but avoids redundant solver queries for the expensive async detectors.

## Outcomes (separate from patterns)

`{ total, wonByPerspective, wonByOpponent, draws, perspectiveLeaves, winRate, lossRate, drawRate }`

`winRate = wonByPerspective / total` — uses `total` as denominator, not `perspectiveLeaves`. Do not mix these denominators when comparing outcome rates to pattern ratios.
