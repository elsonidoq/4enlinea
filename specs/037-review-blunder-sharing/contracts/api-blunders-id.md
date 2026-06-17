# Contract: GET /api/blunders/:id

## Overview

Public endpoint for fetching a single blunder by UUID. No authentication required.
Returns ownership signal (`is_owner`) without exposing the owner's `user_id`.

## Request

```
GET /api/blunders/:id
```

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | UUID string | Yes | Blunder UUID |

No query params. No request body.

Auth: Optional (`loadUser` runs globally; `req.user` may be null).

## Response

### 200 OK

```json
{
  "id": "8a1b2c3d-...",
  "board_state": "334441...",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "created_at": "2026-06-17T10:00:00.000Z",
  "resolved_at": null,
  "severity": 8,
  "blunder_severity": 1.42,
  "game_id": "uuid-or-null",
  "moveIndex": 14,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "is_owner": true
}
```

**Field notes**:
- `threat_cells`: computed server-side via `Board.majorThreatCells()` (same computation as `GET /api/coach/queue`). Empty array if no major threats.
- `moveIndex`: integer equal to `board_state.length` (global 0-indexed ply count).
- `is_owner`: `true` iff `req.user?.id === row.user_id`. Never exposes `user_id`.
- `severity`: integer [0, 10]. 0 for legacy rows.
- `blunder_severity`: float from the `blunder_severity` column.
- `resolved_at`: ISO timestamp if resolved; `null` otherwise.

### 400 Bad Request

```json
{ "error": "invalid id" }
```

Returned when `:id` is not a valid UUID format (validated with `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` or equivalent).

### 404 Not Found

```json
{ "error": "not found" }
```

Returned when `:id` is a valid UUID but no blunder row exists.

### 500 Internal Server Error

```json
{ "error": "<db error message>" }
```

### 503 Service Unavailable

```json
{ "error": "Database not configured" }
```

## Supabase query

```js
const { data, error } = await supabase
  .from('blunders')
  .select('id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at, severity, blunder_severity, game_id, moveIndex, threat_cells, user_id')
  .eq('id', id)
  .single();
```

`user_id` is selected for `is_owner` computation only; it is stripped from the response object before sending.

## Security notes

- No `user_id` filter — returns the blunder to any caller who knows the UUID.
- No 401/403 — the UUID itself is the access control (obscurity model).
- `is_owner` is computed server-side; client never receives the `user_id` UUID.
