# Data Model: Past Mistakes Review (Epic 3c)

**Branch**: `101-new-design` | **Date**: 2026-06-01

---

## Entities

### Blunder (existing table — no migration)

Table: `blunders`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, used as `blunderId` in API |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `board_state` | `text` | 0-indexed movestring of the position **before** the blunder move (= `puzzle.move_string` at write time) |
| `move_played` | `integer` | 0-indexed column of the blunder move |
| `correct_move` | `integer` | 0-indexed column of the better move |
| `pattern_category` | `text` | Slug from `VALID_CATEGORIES` or `'unknown'` (CHECK constraint includes `'unknown'` per migration 027 in Epic 3b) |
| `created_at` | `timestamptz` | Set by DB default |
| `resolved_at` | `timestamptz` | `null` = unreviewed; set by `POST /api/coach/queue/:blunderId/resolve` |
| `puzzle_id` | `uuid` | FK → `puzzles.id`; always `null` for blunders captured from post-game review (Epic 3b) |

**No new migration**: Migration 027 (adding `'unknown'` to CHECK constraint) was applied in Epic 3b. This epic adds no schema changes.

---

## `threat_cells` — computed field (not stored)

Type: `Array<{ col: number, row: number }>`

Computed server-side in `GET /api/coach/queue` for each blunder:

```
postBlunderBoard = new Board(blunder.board_state + String(blunder.move_played))
// postBlunderBoard.currentPlayer is the opponent
opponent = postBlunderBoard.currentPlayer  // 1 (Red) or 2 (Yellow)
threatMap = postBlunderBoard.majorThreatCells()  // { "row,col": { rm, rn, ym, yn } }
threat_cells = Object.entries(threatMap)
  .filter(([_, flags]) => opponent === 1 ? flags.rm : flags.ym)
  .map(([key, _]) => {
    const [row, col] = key.split(',').map(Number);
    return { col, row };
  })
```

**Why opponent**: In the post-blunder position it is the opponent's turn. The `td` overlay represents the opponent's major threats — cells where the opponent can win (or set up a winning threat). These are the cells the user should have been trying to prevent.

---

## API Response Shapes

### `GET /api/coach/queue` — new shape

Query params:
- `?status=all` (default) — return all blunders
- `?status=unreviewed` — only where `resolved_at IS NULL`
- `?status=reviewed` — only where `resolved_at IS NOT NULL`

Response (`200 OK`):
```json
{
  "blunders": [
    {
      "id": "uuid-string",
      "board_state": "3344",
      "move_played": 2,
      "correct_move": 4,
      "pattern_category": "forced_block",
      "created_at": "2026-05-24T10:00:00Z",
      "resolved_at": null,
      "threat_cells": [{ "col": 5, "row": 0 }, { "col": 5, "row": 1 }]
    }
  ],
  "total": 1
}
```

Errors: `401` if no `req.user`. `503` if Supabase unavailable.

### `POST /api/coach/queue/:blunderId/resolve` — fixed shape (no change to response)

Path param: `blunderId` — UUID string (not integer)

Response: `204 No Content`

Errors: `400` if `blunderId` is empty string. `401` if no `req.user`. `403` if blunder does not belong to user (implicit via ownership check failing silently — Supabase returns 0 rows, not an error). `503` if Supabase unavailable.

---

## Navigation Params

When `MistakesListScreen` navigates to `mistakeDetail`, it calls:
```js
go('mistakeDetail', { blunders: blundersArray, index: selectedIndex, status: currentFilter })
```

The detail screen reads these from `props.params`. On Prev/Next, the detail screen updates `index` locally (component state), not by re-calling `go()`. Only Back → `go('mistakes')` (no params — the list screen re-fetches on mount).

**State preserved across back-navigation**: The `MistakesListScreen` re-fetches from the API on every mount. The active filter tab defaults to `"all"` on each visit. This matches the spec: "filter state held in component" and "navigating back from `mistakeDetail` while a filter is active: the `mistakes` list screen preserves the active filter tab **from the session** (state held in component)."

Resolution: The list screen holds `filter` in local `useState`. The filter persists while the list screen is mounted. Since navigating to `mistakeDetail` does not unmount `MistakesListScreen` (the Navigator renders one screen at a time, replacing the DOM), the filter state is preserved if the Navigator keeps the list mounted. However, if the Navigator unmounts screens on navigation (common), filter state is lost. Per spec "state held in component" — this is the intended trade-off. No special action needed.

---

## Component State Summary

### `MistakesListScreen`

| State | Type | Initial |
|---|---|---|
| `blunders` | `Blunder[]` | `[]` |
| `loading` | `boolean` | `true` |
| `error` | `string \| null` | `null` |
| `filter` | `'all' \| 'unreviewed' \| 'reviewed'` | `'all'` |

Data fetch: `GET /api/coach/queue?status=all` — called once on mount. Tab filtering (`all`/`unreviewed`/`reviewed`) is performed client-side by filtering the in-memory `blunders` array on `resolved_at`. No re-fetch on filter change.

### `MistakeDetailScreen`

| State | Type | Initial |
|---|---|---|
| `index` | `number` | `props.params.index` |
| `isReviewed` | `boolean` | `blunder.resolved_at !== null` |
| `resolving` | `boolean` | `false` |
| `deepRevealOpen` | `boolean` | `false` |

The `blunders` array is read from `props.params.blunders` (passed by the list screen). The active blunder is `props.params.blunders[index]`.

---

## Overlay Derivation

For the detail screen's Board component:

```js
const blunder = blunders[index];
const preBoardObj = buildBoard(blunder.board_state);
const trRow = preBoardObj.heights[blunder.move_played];  // landing row of blunder disc

const overlays = [
  { c: blunder.move_played, r: trRow, type: 'tr' },
  ...blunder.threat_cells.map(({ col, row }) => ({ c: col, r: row, type: 'td' })),
];
```

For the list card thumbnail (compact Board):

```js
const preBoardObj = buildBoard(blunder.board_state);
const trRow = preBoardObj.heights[blunder.move_played];
const overlays = [
  { c: blunder.move_played, r: trRow, type: 'tr' },
  ...blunder.threat_cells.map(({ col, row }) => ({ c: col, r: row, type: 'td' })),
];
```

**`buildBoard` return type**: `{ board: board[row][col], heights: number[7] }` — where `heights[col]` is the next empty row in that column (number of discs placed).

---

## i18n Keys (new in `src/i18n/en.json`)

All under `"mistakes"` namespace:

```json
"mistakes": {
  "title": "Past Mistakes",
  "reviewed": "Reviewed",
  "emptyFilter": "Nothing here — switch tabs to see your other moves.",
  "gate": {
    "heading": "Sign up to save your mistakes",
    "body": "Create a free account and DecodeC4 will remember every blunder so you can review them with the Coach later.",
    "cta": "Create free account",
    "later": "Maybe later"
  },
  "empty": {
    "heading": "No mistakes captured yet",
    "body": "Play a game and review it afterwards — I'll collect the tricky moments here so we can study them together.",
    "cta": "Play a game"
  },
  "filter": {
    "all": "All",
    "unreviewed": "Unreviewed",
    "reviewed": "Reviewed"
  },
  "pattern": {
    "immediate_threat": "Immediate threat",
    "forced_block": "Forced block",
    "double_threat": "Double threat",
    "forced_win": "Forced win",
    "forbidden_columns": "Forbidden columns",
    "z_threat": "Z-threat",
    "claimeven": "Claimeven",
    "undercut": "Undercut",
    "overcut": "Overcut",
    "figure_7": "Figure 7",
    "j_shape": "J-shape"
  },
  "detail": {
    "topbarTitle": "Mistake",
    "moveLabel": "Move {{n}}",
    "coach": {
      "line1": "You played column {{n}} here.",
      "line2": "Let me show you what worked better."
    },
    "legend": {
      "yourMove": "your move",
      "opponentThreat": "opponent threat"
    },
    "whatShouldIHave": "What should I have played?",
    "markReviewed": "Mark as reviewed",
    "markedReviewed": "Marked as reviewed"
  }
}
```

**Note**: `unknown` pattern_category never produces a visible tag — checked with `pattern_category !== 'unknown'` before rendering.
