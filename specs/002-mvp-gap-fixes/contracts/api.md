# API Contracts: MVP Gap Fixes

**Date**: 2026-04-30  
**Scope**: Changed and new endpoints only. Unchanged endpoints are not documented here.

---

## Modified Endpoints

### POST /api/puzzles/:id/check

**Change**: Request body gains `attemptNumber` field.

**Request body** (was):
```json
{
  "moveHistory": [],
  "candidateCol": 3
}
```

**Request body** (now):
```json
{
  "moveHistory": [],
  "candidateCol": 3,
  "attemptNumber": 1
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `attemptNumber` | integer | yes | `1` (first attempt) or `2` (second attempt) |

**Behavior change**: Blunder is inserted only when `attemptNumber === 1 && !isSuccess`. Previously the guard was `moveHistory.length === 0`, which fired on every attempt since the client always sent `[]`.

**Response**: Unchanged.

---

## New Endpoints

### POST /api/admin/seed-puzzles

Seeds placeholder puzzles from `server/data/placeholder_puzzles.json` into the `puzzles` table.

**Auth**: None (guarded by localhost-only middleware).

**Request body**: Empty `{}`.

**Response**:
```json
{
  "inserted": 6,
  "skipped": 0
}
```

`skipped` counts puzzles already present (matched by `move_sequence + category`).

---

### POST /api/admin/puzzles

Saves a single authored puzzle to the `puzzles` table.

**Auth**: None (guarded by localhost-only middleware).

**Request body**:
```json
{
  "category": "forcing_moves",
  "move_sequence": "4431",
  "goal_prompt": "Win in two moves.",
  "predicate_type": "immediate_win",
  "difficulty": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | string | yes | One of the 6 category keys |
| `move_sequence` | string | yes | Column numbers 1–7; validated client-side before call |
| `goal_prompt` | string | yes | Instruction shown to player |
| `predicate_type` | string | yes | Key recognized by `predicates.js` |
| `difficulty` | integer | yes | 1–3 |

**Response (201)**:
```json
{
  "id": "<uuid>",
  "verified": false
}
```

`verified` is set to `true` by the caller after running `/api/scores` and confirming score ≥ 0 for the intended move.

**Response (400)**:
```json
{
  "error": "Invalid category | Invalid move_sequence | Missing required field"
}
```

---

## Unchanged Endpoints Used in New Flows

### GET /api/scores?moves=:moveString

Used in two new contexts:

1. **Puzzle curation tool** — after "Run solver" is clicked, to display per-column scores.
2. **Post-commit reveal** — called in parallel with `/api/explain-move` to provide pre-move scores for comparison. The `moves` parameter is the position **before** the user's committed move (so the returned scores show how each column, including the played column, would have been rated).

No changes to this endpoint. Existing response format:
```json
{
  "scores": [-1, 0, 1, 1, 1, 0, -1]
}
```

---

### GET /api/coach/queue

Returns the next unresolved blunder for the signed-in user. No changes.

**Response (200)**:
```json
{
  "blunderId": "<uuid>",
  "puzzle": {
    "id": "<uuid>",
    "move_sequence": "4431",
    "goal_prompt": "Win in two moves.",
    "category": "forcing_moves"
  },
  "queueCount": 3
}
```

**Response (204)**: Queue is empty.

**Response (403)**: User is not on paid tier.

---

### POST /api/coach/queue/:blunderId/resolve

Marks a blunder as resolved. No changes.

**Response (200)**:
```json
{ "resolved": true }
```
