# API Contract: GET /api/games

**Feature**: Past Games Navigation (Epic A)
**Endpoint**: `GET /api/games`
**Status**: New in Epic A

---

## Request

```
GET /api/games?outcome=won&has_blunder=true&limit=50
```

### Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes | `Bearer <supabase_access_token>` |

### Query Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `outcome` | `"won"` \| `"lost"` | No | — | Filter by game result |
| `has_blunder` | `"true"` | No | — | Filter to games with ≥1 blunder |
| `limit` | integer | No | `50` | Max games to return (cap: 50) |

### Authentication

Required. Returns `401 Unauthorized` if `req.user` is null. No `device_uuid` fallback.

---

## Response

### 200 OK

```json
{
  "games": [
    {
      "id": "a1b2c3d4-...",
      "outcome": "won",
      "date": "2026-06-07T14:30:00.000Z",
      "source": "ai",
      "difficulty": "medium",
      "accuracy": 82,
      "blunder_count": 2,
      "move_count": 24,
      "cols": [
        "ggg",
        "ddd",
        "g",
        "dd",
        "gdg",
        "",
        "gdd"
      ]
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Unique game identifier |
| `outcome` | `"won"` \| `"lost"` \| `"draw"` | Game result for the authenticated user |
| `date` | string (ISO 8601) | `games.created_at` — game completion timestamp |
| `source` | `"ai"` | Always `"ai"` in MVP |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` \| `"perfect"` | AI difficulty level |
| `accuracy` | number \| null | Percentage of optimal moves (0–100). `null` for pre-migration games |
| `blunder_count` | number | Number of blunders tagged to this game. 0 for pre-migration games |
| `move_count` | number | `LENGTH(games.moves)` — total plies |
| `cols` | string[7] | Column-thumbnail in g/d encoding, bottom-to-top per column |

### `cols` Encoding

Each string in the `cols` array represents one column's discs from bottom (index 0) to top:

- `'g'` = first-player disc (Red/Green, placed at even 0-based indices)
- `'d'` = second-player disc (Yellow/Gray, placed at odd 0-based indices)

Example: movestring `"0101"` (col 0, col 1, col 0, col 1) produces:
```
cols = ["gd", "gd", "", "", "", "", ""]
```

**Client-side conversion**: `colsToBoard(cols)` in `src/lib/board.js` → `board[row][col]` 2D array.

### Error Responses

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "limit must be ≤ 50" }` | `limit` param exceeds cap |
| 400 | `{ "error": "invalid outcome" }` | `outcome` not `"won"` or `"lost"` |
| 401 | `{ "error": "Unauthorized" }` | No valid auth token |
| 500 | `{ "error": "<message>" }` | DB error |
| 503 | `{ "error": "Database not configured" }` | Supabase unavailable |

---

## Server Implementation Notes

### Query

```sql
SELECT
  g.id,
  g.result,
  g.created_at,
  g.difficulty,
  g.accuracy,
  g.moves,
  COUNT(b.id) AS blunder_count
FROM games g
LEFT JOIN blunders b
  ON b.game_id = g.id
  AND b.user_id = $1
WHERE g.user_id = $1
  [AND g.result = $2]       -- when outcome param present
  [AND COUNT(b.id) > 0]     -- when has_blunder=true (HAVING clause)
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $N
```

### `outcome` mapping

The `games.result` column uses `'win'`/`'loss'`/`'draw'`. Map to API values:
- `'win'` → `"won"`
- `'loss'` → `"lost"`
- `'draw'` → `"draw"`

### `has_blunder` filter

When `has_blunder=true`, add `HAVING COUNT(b.id) > 0`. This requires the LEFT JOIN + GROUP BY approach rather than a simple WHERE clause, since the filter operates on the aggregate.

### `cols` computation

```js
function movesToCols(moves) {
  const cols = ['', '', '', '', '', '', ''];
  for (let i = 0; i < moves.length; i++) {
    cols[parseInt(moves[i], 10)] += (i % 2 === 0) ? 'g' : 'd';
  }
  return cols;
}
```

### Auth

The endpoint is registered **after** `loadUser` middleware. Check `req.user` at the top of the handler; return 401 if null.

### Rate Limiting

Covered by the default `/api/` rate limit of 120 req/min. No special rate limit needed.

### Registration Order

Register `GET /api/games` alongside other game endpoints (after `POST /api/games/from-position`, before `POST /api/games/analyze`). No Express first-match ordering concerns — the path has no parameterized segments.

---

## Related Endpoint Changes

### `POST /api/games` — extend

Add optional `accuracy` field to request body validation:

```json
{
  "device_uuid": "<string>",
  "moves": "<movestring>",
  "difficulty": "easy",
  "side": "first",
  "result": "win",
  "accuracy": 82        // NEW: optional, 0–100
}
```

Validation: if present, must be a number `0 ≤ accuracy ≤ 100`. Stored in `games.accuracy`.

### `POST /api/games/analyze` — extend

1. **SELECT change**: Add `created_at` to the game row fetch:
   ```js
   .select('id, moves, side, difficulty, created_at')
   ```

2. **Response change**: Add `gameDate` to the response JSON:
   ```json
   {
     "moves": [...],
     "accuracy": 82,
     "gameDate": "2026-06-07T14:30:00.000Z",  // NEW
     ...existing fields...
   }
   ```

3. **Blunder insert change**: Pass `game_id: gameId` to `insertGameBlunder`:
   ```js
   await insertGameBlunder(supabase, {
     user_id: req.user.id,
     // ... existing fields ...
     game_id: gameId,  // NEW
   });
   ```

4. **`insertGameBlunder` change**: Accept `game_id` in destructured fields:
   ```js
   const { user_id, board_state, move_played, correct_move, pattern_category,
           reason, direction, severity, blunder_severity, game_id } = row;
   ```
   Add to INSERT:
   ```js
   game_id: game_id ?? null,
   ```
