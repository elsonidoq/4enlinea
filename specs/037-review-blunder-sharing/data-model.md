# Data Model: Review & Blunder Sharing (spec-037)

## Schema changes

**No new tables. No new columns. No migrations required.**

All data needed by this feature already exists in the database:
- `games.side` — already stored and already selected in `GET /api/games` queries
- `papergames_games.side` — same
- `blunders.user_id` — used server-side only for `is_owner` computation; never exposed to client
- `blunders.board_state`, `blunders.move_played`, `blunders.correct_move`, etc. — all present

---

## API shape changes

### GET /api/games — updated unified game object

Previously missing `side` field; now included:

```json
{
  "id": "<uuid>",
  "outcome": "won" | "lost" | "draw",
  "created_at": "<ISO timestamp>",
  "source": "ai" | "papergames",
  "difficulty": "easy | medium | hard | perfect | null",
  "accuracy": 82 | null,
  "blunder_count": 2,
  "move_count": 22,
  "cols": ["gdg", "", "d", ...],
  "side": "first" | "second" | null
}
```

`side` is `null` for legacy rows that predate the column.

### GET /api/games — new `?sort=` param

| Value | Order |
|---|---|
| `recent` (default) | `created_at DESC` |
| `played_well` | `accuracy DESC NULLS LAST`, then `created_at DESC` |
| `worst_blunders` | `blunder_count DESC`, then `created_at DESC` |

Invalid values → `400 { "error": "invalid sort" }`.

### GET /api/blunders/:id — new endpoint

Response `200 OK`:

```json
{
  "id": "<uuid>",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "created_at": "2026-06-17T10:00:00Z",
  "resolved_at": null,
  "severity": 8,
  "blunder_severity": 1.42,
  "game_id": "<uuid>" | null,
  "moveIndex": 14,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "is_owner": true | false
}
```

Field-for-field compatible with `GET /api/coach/queue` blunder items (plus `is_owner`).

Errors:
- `400 { "error": "invalid id" }` — non-UUID path param
- `404 { "error": "not found" }` — valid UUID, no row
- `500 { "error": "..." }` — DB error
- `503 { "error": "Database not configured" }` — supabase null

---

## Frontend state changes

### MistakeDetailScreen — new props path

No new props. Cold-boot introduces internal state:
```
navList: BlunderItem[] (derived from prop or fetched)
coldBootState: 'loading' | 'not_found' | 'error' | 'ready'
```

### PastGamesListScreen — new state

```
sort: 'recent' | 'played_well' | 'worst_blunders'  (default: 'recent')
```

---

## `is_owner` derivation

Server-side only:
```js
const is_owner = req.user?.id != null && req.user.id === row.user_id;
```

- Authenticated owner: `true`
- Authenticated non-owner: `false`
- Unauthenticated visitor: `false`

The `user_id` UUID is never included in any API response.

---

## Color chip heuristic

For blunders (MistakesListScreen, MistakeDetailScreen when `game_id = null`):
```
board_state.length % 2 === 0  →  Green (even length = Green's turn = user played Green)
board_state.length % 2 === 1  →  Gray
```

For ReviewScreen/ExplorerScreen: use `analysis.side` directly (`'first'` → Green, `'second'` → Gray).
