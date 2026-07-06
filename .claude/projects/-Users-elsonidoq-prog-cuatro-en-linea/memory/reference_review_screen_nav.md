---
name: reference-review-screen-nav
description: ReviewScreen navigation contract — uses id (game UUID), not moveString
metadata:
  type: reference
---

`ReviewScreen` is registered at URL pattern `/game/:id` and receives a single prop `id` (game UUID). Navigate to it with:

```js
go('review', { id: game.id })
```

The screen fetches `POST /api/games/analyze` using that `id`. Do NOT pass `moveString` — it is not a prop and the URL mapping only knows about `id`.


---

## (merged from `reference_review_screen_navigate_to_mistake` — ReviewScreen.navigateToMistake routes ALL non-optimal moves to blunderDetail (no explorer fallback since 2026-06-21 unification))

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
