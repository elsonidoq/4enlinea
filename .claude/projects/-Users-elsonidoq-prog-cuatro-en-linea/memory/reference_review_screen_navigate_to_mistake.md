---
name: reference-review-screen-navigate-to-mistake
description: ReviewScreen.navigateToMistake routes ALL non-optimal moves to blunderDetail (no explorer fallback since 2026-06-21 unification)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 08d189a6-0456-480f-895e-3cf14198c683
---

`ReviewScreen.jsx` has a `navigateToMistake(moveIndex)` helper used by both Prev/Next buttons and the timeline-node onClick. It takes a **number** — the user-move ordinal (`move.moveIndex` from `analysis.moves`, 1-indexed, counting user plies only).

Since the suboptimal+blunder unification (2026-06-21), the function routes **all** non-optimal moves to `blunderDetail` via the `gameBlunderList` DB match. There is no Explorer fallback:

```js
function navigateToMistake(moveIndex) {
  const globalPlyIndex = analysis.side === 'first'
    ? 2 * (moveIndex - 1)
    : 2 * (moveIndex - 1) + 1;
  const matchedIdx = gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex);
  if (matchedIdx !== -1) {
    go('blunderDetail', { ..., difficulty: analysis.difficulty ?? null });
  }
  // No match (queue loading or anon) — no-op
}
```

`gameBlunderList` now includes both suboptimal and blunder rows (both are persisted to `blunders` since migration 051). The timeline-node onClick delegates directly to `navigateToMistake(move.moveIndex)` for non-optimal moves.
