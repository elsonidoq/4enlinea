# Data Model: Past Games Navigation

**Feature**: Past Games Navigation (Epic A)
**Date**: 2026-06-09

Extends the existing `games` and `blunders` tables. No new tables are introduced.

---

## Modified Entities

### `blunders` — new column

| Column | Type | Constraints | Description |
|---|---|---|---|
| `game_id` | `uuid` | nullable, FK → `games(id) ON DELETE SET NULL` | Links a blunder to the game where it occurred. `NULL` for puzzle blunders and legacy rows. |

**Index**: `idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL`

**Access pattern**: Written server-side inside `POST /api/games/analyze`. Read via LEFT JOIN COUNT in `GET /api/games` for per-game blunder counts.

**Null-safe**: All existing blunders (puzzle and game) have `game_id = NULL` after migration. Only game blunders captured by `POST /api/games/analyze` after this migration carry a `game_id`.

---

### `games` — new column

| Column | Type | Constraints | Description |
|---|---|---|---|
| `accuracy` | `real` | nullable | Percentage of optimal user moves (0–100), computed client-side at game-end. `NULL` for games played before this migration. |

**Access pattern**: Written by `POST /api/games` when the client sends the `accuracy` field. Read by `GET /api/games` for display in GameCard.

**Computation**: `Math.round(optimalCount / scored * 100)` where `optimalCount` and `scored` come from the client's in-memory counters during gameplay (already computed for the Post-Game Review screen).

---

## Response Entities (not persisted)

### `GameRecord`

Returned by `GET /api/games`. Computed from `games` + LEFT JOIN on `blunders`.

| Field | Type | Source | Description |
|---|---|---|---|
| `id` | `string` (UUID) | `games.id` | Unique game identifier |
| `outcome` | `"won"` \| `"lost"` \| `"draw"` | `games.result` mapped | `win`→`"won"`, `loss`→`"lost"`, `draw`→`"draw"` |
| `date` | `string` (ISO 8601) | `games.created_at` | Game completion timestamp |
| `source` | `"ai"` | hardcoded | Always `"ai"` in MVP; `"papergames"` reserved |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` \| `"perfect"` | `games.difficulty` | AI difficulty level |
| `accuracy` | `number` \| `null` | `games.accuracy` | Percentage of optimal moves. `null` for pre-migration games |
| `blunder_count` | `number` | LEFT JOIN COUNT | Number of blunders with `game_id = games.id`. 0 for pre-migration games |
| `move_count` | `number` | `LENGTH(games.moves)` | Total number of plies in the game |
| `cols` | `string[7]` | computed from `games.moves` | Column-thumbnail: 7 strings in g/d encoding, bottom-to-top per column |

### `cols` encoding

Each string in the `cols` array represents a single column's discs from bottom to top:

- `'g'` = first-player disc (Red/Green, placed at even 0-based indices: 0, 2, 4, ...)
- `'d'` = second-player disc (Yellow/Gray, placed at odd 0-based indices: 1, 3, 5, ...)

**Computation** (server-side, O(moves.length)):
```js
function computeCols(moves) {
  const cols = ['', '', '', '', '', '', ''];
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    cols[col] += (i % 2 === 0) ? 'g' : 'd';
  }
  return cols;
}
```

**Client-side conversion**: `colsToBoard(cols)` in `src/lib/board.js` converts the `cols` array to `board[row][col]` (`'empty'`|`'red'`|`'yellow'`). Delegates to the existing `boardSpecToBoard` utility.

### `POST /api/games/analyze` — extended response

The existing `GameAnalysis` response gains one field:

| Field | Type | Source | Description |
|---|---|---|---|
| `gameDate` | `string` (ISO 8601) | `games.created_at` | Game completion timestamp. Used by PostGameReview for the blunder-tap-to-game navigation flow (Epic B). |

---

## State Transitions

### `PastGamesList` screen variants

The `gamesVariant` prop drives which UI state is rendered:

| Variant | Condition | UI |
|---|---|---|
| `"out"` | Anonymous user (no session) | Signed-out gate with AuthModal CTA |
| `"empty"` | Authenticated, 0 games returned | Coach avatar, "No games yet", "Play a game" CTA |
| `"in"` | Authenticated, ≥1 game returned | Filter tabs + scrollable GameCard list |

Within `"in"`, additional local states:
- **Loading**: spinner while `GET /api/games` is in flight
- **Error**: user-friendly error message with retry
- **Empty filter**: "Nothing here" message when active filter returns zero results

### Filter state (local, not persisted)

Four filter tabs: All, Won, Lost, Blunder. Filtering is O(n) on already-loaded data:
- Won: `game.outcome === 'won'`
- Lost: `game.outcome === 'lost'`
- Blunder: `game.blunder_count > 0`
- All: no filter
