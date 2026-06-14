# Contract: buildExplainContext (v2)

## Signature

```js
buildExplainContext(movestring, col, rounds = 1)
→ Promise<null | { prompt: null, allowedSet: null, allMovesEqual: true } | { prompt: string, allowedSet: AllowedSetEntry[] }>
```

**Module**: `connect-four/server/index.js` (module-private function)

## Flow (v2 — unified two-sided grounding)

```
1. preScores, isSettled, contrast, gap/gapBucket/inverted  (unchanged)
2. Determine bestCol:
     inverted == true  → bestCol = col (user played optimally)
     inverted == false → bestCol = contrastCol (user was suboptimal)
3. BLUNDER PATH (col ≠ bestCol, inverted == false):
     a. tagBlunder(movestring, col, bestCol, solver) → {tag, reason, direction}
     b. humanReason = REASON_TEMPLATES.get(`${tag}:${direction}`) ?? "A stronger move was available."
     c. correctMovePatterns = await classifyPattern(movestring + bestCol, perspective, solver)
4. OPTIMAL PATH (col == bestCol, inverted == true):
     a. correctMovePatterns = await classifyPattern(movestring + col, perspective, solver)
     b. tag = null, direction = null, humanReason = null
     c. positiveReason = POSITIVE_TEMPLATES.get(first key in correctMovePatterns)
                         ?? "This was the strongest move available."
5. allowedSet derivation:
     base = union of:
       - classifyPattern(movestring, perspective, solver)          [pre-move patterns]
       - classifyPattern(movestring + bestCol, perspective, solver) [post-best-move patterns]
     if direction == 'enabled_opponent':
       oppBestCol = argmax(solver.query(movestring + col))  [ignore -1000 sentinels]
       augment with classifyPattern(movestring + col + oppBestCol, opponentPerspective, solver)
     if direction == 'defensive_miss':
       augment with classifyPattern(movestring, opponentPerspective, solver)
         filtered to forced_block + immediate_threat entries only
     Only non-empty-cells entries contribute to allowedSet:
       { cells: entry.cells, zoneSpec: 'tg' }
6. Board visualizations (unchanged): boardViz, postBoardViz, afterOpponentBoardViz
     (afterOpponentBoardViz: getOpponentResponseMs → getBoardVisualization or null)
7. positiveReason derivation (optimal path): first matched tag in correctMovePatterns
     → POSITIVE_TEMPLATES.get(tag) ?? "This was the strongest move available."
8. buildBlunderExplainPrompt({tag, direction, humanReason, positiveReason, correctMovePatterns,
     boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet})
9. Return { prompt, allowedSet }
```

## Edge Cases

- `selectContrastMove` returns null → return null (all legal scores equal — no comparison possible)
- `isSettled == true` (all scores zero) → return `{ prompt: null, allMovesEqual: true }`
- `classifyPattern` returns empty Map → allowedSet is `[]`; prompt uses generic fallbacks
- `REASON_TEMPLATES` miss → generic fallback `"A stronger move was available."`
- `POSITIVE_TEMPLATES` miss or empty correctMovePatterns → `"This was the strongest move available."`
- `afterOpponentBoardViz` is null when game is over after the move

## Retained Unchanged

- `checkAllMovesEqual` — early return behavior
- `selectContrastMove` — early return on null behavior
- `getGapAndFraming` — gap/gapBucket/inverted computation
- `getBoardVisualization` — board string rendering
- `getOpponentResponseMs` — third board visualization
- `validateAnnotation` gate (called by the endpoint, not by this function)

## Removed After Rework

- `classifyExplanationType` dispatch
- Two parallel `explainSimulate` calls
- `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet`
- `buildGroupContextBlock`
- `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt`
