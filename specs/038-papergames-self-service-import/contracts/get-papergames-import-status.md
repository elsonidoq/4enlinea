# Contract: GET /api/user/papergames/import/status

## Purpose

Poll the status of a background import job.

## Auth

Required. Returns `401` if `req.user` is null.

## Request

```
GET /api/user/papergames/import/status?jobId=<uuid>
Authorization: Bearer <token>
```

**Query param**: `jobId` — a UUID string.

## Success Response

```
200 OK
```

```json
{
  "status":     "pending" | "running" | "done" | "error",
  "imported":   7,
  "skipped":    2,
  "capReached": false,
  "error":      null
}
```

- `status`: current job state.
- `imported`: count of `papergames_games` rows successfully written this run.
- `skipped`: count of rooms skipped (fetch error, parse error, no moves, etc.).
- `capReached`: `true` only when a free-tier user's 15-game lifetime cap was reached before
  any import work started (C2b short-circuit). `false` for all other jobs, including jobs that
  imported 0 games for any other reason (e.g., no new rooms since last import).
- `error`: error message string or `null`. Only populated when `status === "error"`.

## Error Responses

| Status | Condition |
|---|---|
| 400 | `jobId` query param absent or not a valid UUID |
| 401 | Unauthenticated |
| 404 | `jobId` not found in the in-memory Map **or** `job.userId !== req.user.id` (ownership mismatch is treated identically to not-found to avoid leaking job existence) |
| 503 | Supabase not configured |

## Implementation Notes

- Lookup is O(1): `jobMap.get(jobId)`.
- Ownership check: `if (job.userId !== req.user.id) return 404`.
- A server restart wipes the Map. All jobs become 404 after restart.
- UUID validation regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  (same as `UUID_REGEX` used in `GET /api/blunders/:id`).
