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
