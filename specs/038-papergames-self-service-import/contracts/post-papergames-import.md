# Contract: POST /api/user/papergames/import

## Purpose

Start a background import of the user's Connect 4 games from papergames.io.
Returns immediately with a `jobId` for polling.

## Auth

Required. Returns `401` if `req.user` is null.

## Request

```
POST /api/user/papergames/import
Authorization: Bearer <token>
```

No request body. The server reads `papergames_id` from the user's DB row (not from the request
body) to prevent importing on behalf of other users.

## Success Response

```
202 Accepted
```

```json
{ "jobId": "<uuid>" }
```

## One-In-Flight Guard

If the authenticated user already has a job with `status: "pending"` or `status: "running"` in
the in-memory Map, the endpoint returns the **existing** `jobId` with `202 Accepted` instead of
starting a new job.

## Pre-condition Failures

| Condition | Status | Body |
|---|---|---|
| `papergames_id` is null or empty in the DB row | 400 | `{ "error": "No Papergames account ID saved" }` |
| Supabase not configured | 503 | `{ "error": "Supabase not configured" }` |

## Job Lifecycle

1. Endpoint creates a `JobState` with `status: 'pending'` and inserts into the Map.
2. Returns `202 { jobId }` immediately.
3. `setImmediate` (or `Promise.resolve().then(...)`) kicks off `importForUser()` async.
4. On start: job transitions to `status: 'running'`.
5. On success: `status: 'done'`, `imported` and `skipped` counts set, `last_import_at` updated.
6. On throw: `status: 'error'`, `error` field set.

## Import Limits

| Tier | Limit |
|---|---|
| free | `max(0, 15 − current_papergames_count)` games |
| paid | 50 games per run |

`current_papergames_count` = count of `papergames_games` rows with `user_id = req.user.id`.
Queried at job-start time, not at POST time.

## Implementation Notes

- `papergames_id` is read from the DB row via a single `SELECT papergames_id FROM users WHERE
  id = req.user.id`. This is a separate query from `loadUser` to ensure freshness (the user may
  have just saved it).
- The in-memory Map is keyed by `jobId` (uuid). The one-in-flight guard iterates Map values to
  find entries where `entry.userId === req.user.id` and `entry.status` is `pending` or `running`.
