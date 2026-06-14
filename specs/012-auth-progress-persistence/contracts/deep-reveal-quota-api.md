# Deep Reveal Quota API Contract

**Endpoint**: `POST /api/explain-move-llm`  
**Feature**: Auth & Progress Persistence (Epic 7)  
**Date**: 2026-05-30

---

## Authentication

All requests to this endpoint MUST include a bearer token:
```
Authorization: Bearer <session.access_token>
```

Unauthenticated requests are rejected with `401 Unauthorized`.

---

## Request

```json
{
  "movestring": "string (0–42 digits, 0-indexed columns 0–6)",
  "col": "integer (0–6)",
  "rounds": "integer (1–5, optional, default 1)"
}
```

---

## Responses

### 200 OK — Explanation returned
```json
{
  "explanation": "string",
  "prompt": "string | null"
}
```

### 400 Bad Request — Invalid input
```json
{ "error": "string" }
```

### 401 Unauthorized — Not authenticated
```json
{ "error": "Unauthorized" }
```

### 429 Too Many Requests — Weekly quota exceeded (free tier)
```json
{
  "error": "quota_exceeded",
  "resetsAt": "ISO 8601 timestamp (next Monday 00:00 UTC)"
}
```

### 503 Service Unavailable — LLM not configured
```json
{ "error": "LLM service not configured" }
```

---

## Quota Rules

| Tier | Cap | Reset period |
|---|---|---|
| `free` | 20 | Weekly; resets Monday 00:00 UTC |
| `paid` | Unlimited | N/A |

- If `users.deep_reveal_reset_at` is null or in the past, the quota resets before processing.
- The reset timestamp is set to next Monday 00:00 UTC.
- Quota is decremented only on successful LLM calls (after the explanation is generated).

---

## Client-Side Handling

```jsx
if (res.status === 401) {
  // Show AuthModal (user not signed in)
}
if (res.status === 429) {
  const { resetsAt } = await res.json();
  // Show UpgradeModal with resetsAt for display
}
```
