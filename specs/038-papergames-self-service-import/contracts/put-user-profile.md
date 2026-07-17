# Contract: PUT /api/user/profile

## Purpose

Save or update the authenticated user's Papergames hex account ID.

## Auth

Required. Returns `401 { "error": "Unauthorized" }` if `req.user` is null.

## Request

```
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "papergames_id": "<string>" }
```

- `papergames_id`: required — must be a non-empty string, at most 64 characters.

## Validation

| Condition | Status | Body |
|---|---|---|
| `papergames_id` absent or not a string | 400 | `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` |
| `papergames_id` is empty string | 400 | `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` |
| `papergames_id.length > 64` | 400 | `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` |

## Success Response

```
204 No Content
```

## Error Responses

| Status | Condition |
|---|---|
| 400 | Validation failure (see above) |
| 401 | Unauthenticated |
| 503 | Supabase not configured |
| 500 | DB error (update fails) |

## Implementation Notes

- Uses `.update({ papergames_id })` on the `users` table, filtered by `id = req.user.id`.
- Never uses `.upsert()` — the `users` row is guaranteed to exist (created by `loadUser` on first
  auth).
- Does NOT write `last_import_at`. That column is only updated at the end of a successful import
  run.
- No rate limit beyond the global 120 req/min default.
