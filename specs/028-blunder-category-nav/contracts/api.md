# API Contracts: Blunder Category Navigation & Two-Way Links

**Feature**: spec 028  
**Branch**: `101-new-design`  
**Date**: 2026-06-10

---

## `GET /api/coach/queue` — extended

### New query params

**`?category=<slug>`** (optional)
- Validates `slug` is in `VALID_BLUNDER_TAGS` (server/blunderTags.js)
- Returns `400 { "error": "invalid category" }` for unrecognised slugs
- Adds `WHERE pattern_category = $1` to the existing query

**`?game_id=<uuid>`** (optional)
- Validates basic UUID format
- Returns `400 { "error": "invalid game_id" }` for non-UUID values
- Adds `WHERE game_id = $1` to the existing query

Both params are independent and can be combined (though no current UI does so).

### Extended response shape

Adds two new fields to each blunder object. All existing fields unchanged.

```json
{
  "blunders": [
    {
      "id": "uuid",
      "board_state": "3344",
      "move_played": 3,
      "correct_move": 2,
      "pattern_category": "immediate_threat",
      "created_at": "2026-06-01T10:00:00Z",
      "resolved_at": null,
      "severity": 7,
      "blunder_severity": 0.42,
      "threat_cells": [{ "col": 4, "row": 2 }],
      "game_id": "some-uuid-or-null",
      "moveIndex": 4
    }
  ],
  "total": 1
}
```

**`game_id`**: from `blunders.game_id` column (added in Epic A migration 036). Null for puzzle blunders or pre-migration game blunders.

**`moveIndex`**: `board_state.length` computed at the response layer. Represents the 0-indexed global ply count when the blunder occurred. This is the join key used by `ReviewScreen` to match blunders to timeline nodes.

### Auth

Unchanged: inline `requireAuth` (401 if `req.user` is null).

### Error codes (additions)

| Code | Condition |
|---|---|
| `400` | `category` param present but not in `VALID_BLUNDER_TAGS` |
| `400` | `game_id` param present but not a valid UUID format |

All existing error codes (`401`, `500`, `503`) are unchanged.

---

## `POST /api/games/analyze` — no change

`gameDate` (ISO 8601) is already returned in the response on this branch (Epic A). No server changes required. `ReviewScreen` reads `analysis.gameDate` and formats it client-side.

---

## Navigation contracts (frontend only)

These are not HTTP contracts but the in-memory prop shapes passed via `go()`.

### `go('mistakeDetail', { category: string })`

Navigates to Level 2. `category` is a DB slug (e.g. `"claimeven"`). `MistakesListScreen` receives it as a prop.

### `go('blunderDetail', { blunderNavList, index, mistakeContext, mistakeSource })`

Navigates to Level 3. All four params are required at the call site.

```ts
go('blunderDetail', {
  blunderNavList: Blunder[],         // ordered array, never null
  index: number,                     // 0-based index into blunderNavList
  mistakeContext: 'list' | 'game',
  mistakeSource: MistakeSource | null
})
```

`MistakeDetailScreen` receives all four as direct props (Navigator spreads params).

### `go('review', { id: string })`

Unchanged. Called from `MistakeDetailScreen` when `mistakeContext === 'game'` or when the source-game link is tapped.
