---
name: reference-review-screen-navigate-to-mistake
description: ReviewScreen.navigateToMistake takes a number (user-move ordinal), not a move object — branching on quality requires a find() first
metadata:
  type: reference
---

`ReviewScreen.jsx` has a `navigateToMistake(moveIndex)` helper used by both Prev and Next mistake buttons. It takes a **number** — the user-move ordinal (`move.moveIndex` from `analysis.moves`, 1-indexed, counting user plies only).

To branch on move quality (e.g. route blunders to `blunderDetail`, suboptimal to Explorer):
```js
const move = analysis.moves.find(m => m.moveIndex === moveIndex);
if (move?.quality === 'blunder') { /* go to blunderDetail */ }
else { /* go to Explorer */ }
```

**Why this matters:** Passing a move object or trying `moveIndex.quality` always gives `undefined` — the branch silently never fires and all mistakes route to Explorer. The function signature is a number, not a move object.

Also relevant: timeline tap handler currently uses `isOptimal ? undefined : () => go('explorer', ...)` — not a `quality === 'blunder'` check. Read the actual current code before writing the implementation task.
