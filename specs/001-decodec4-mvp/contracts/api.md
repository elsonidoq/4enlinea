# API Contracts: DecodeC4 MVP

**Feature**: `001-decodec4-mvp`
**Date**: 2026-04-30
**Base URL**: `https://<railway-domain>/api`

All endpoints return JSON. Auth is via Supabase JWT passed in `Authorization: Bearer <token>`.
Unauthenticated requests are treated as anonymous tier. All endpoints validate input at the
boundary; invalid input returns HTTP 400 with `{ error: string }`.

---

## Existing Endpoints (keep as-is)

### `GET /api/ping`
Health check.

**Response**: `{ ok: true }`

---

### `POST /api/scores`
Get solver scores for a board position.

**Request**: `{ moves: string }`
- `moves`: 1-indexed column string (e.g. `"44332"`)

**Response**: `[number, number, number, number, number, number, number]`
- 7 scores for columns 1–7. Score > 0: winning for current player. Score < 0: losing.
  Score = 0: draw. Large positive: faster win. Large negative: faster loss.

**Latency target**: < 300ms p95

---

### `POST /api/explain`
Heatmap generation for hover preview.

**Request**: `{ moves: string }`

**Response**: `{ human: number[][], ai: number[][] }`
- Each is a 6×7 grid of heat values [0, 1]. Row 0 = bottom of board.

**Latency target**: < 500ms

---

## New Endpoints

### `POST /api/explain-move`
Core Explanation Engine endpoint. Returns a one-line summary and optionally a full
Deep Reveal for a specific move in a position.

**Request**:
```json
{
  "moves": "443352",
  "candidateCol": 3,
  "humanFirst": true
}
```
- `moves`: move history string (1-indexed columns); the board state before the candidate move.
- `candidateCol`: 0-indexed column the user is asking about (0–6).
- `humanFirst`: `true` if the human moved first (affects player-to-move mapping).

**Auth behavior**:
- Anonymous: `deepReveal` is always `null`.
- Free (signed-in): `deepReveal` returned if quota > 0 and user explicitly requested it
  (requires `requestDeepReveal: true` in body); quota decremented server-side.
- Paid: `deepReveal` always returned on request.

**Request (with Deep Reveal)**:
```json
{
  "moves": "443352",
  "candidateCol": 3,
  "humanFirst": true,
  "requestDeepReveal": true
}
```

**Response (one-liner only)**:
```json
{
  "oneLiner": "Optimal move. Creates a double threat at columns 4 and 5.",
  "patternTag": "double_threat",
  "deepReveal": null,
  "quotaRemaining": null
}
```

**Response (with Deep Reveal, free user)**:
```json
{
  "oneLiner": "Optimal move. Creates a double threat at columns 4 and 5.",
  "patternTag": "double_threat",
  "deepReveal": {
    "fullText": "Optimal move. Creates a double threat...",
    "continuationLine": [4, 3, 5],
    "boardAnnotation": [
      { "row": 3, "col": 3, "highlight": "winning" },
      { "row": 3, "col": 4, "highlight": "winning" }
    ]
  },
  "quotaRemaining": 2
}
```

**Error responses**:
- `403 { error: "Deep Reveals require a free account" }` — anonymous user requested Deep Reveal.
- `429 { error: "Daily Deep Reveal limit reached", quotaRemaining: 0 }` — free user quota exhausted.
- `400 { error: "Invalid move string" }` — unparseable `moves`.
- `400 { error: "candidateCol out of range" }` — column not in 0–6.

**Latency target**: < 100ms (cache hit), < 2s (cache miss)

---

### `POST /api/track`
Record an analytics event. Fire-and-forget; always returns 204.

**Request**:
```json
{
  "event": "puzzle_attempted",
  "path": "/puzzles",
  "data": { "puzzleId": "uuid", "category": 1, "outcome": "correct_first" }
}
```
- `uid` (device hash) is extracted from the request or session server-side.
- `user_id` is added server-side from the JWT if signed in.

**Response**: `204 No Content`

**Note**: This endpoint never returns an error to the client. Server-side failures are
logged to Sentry but do not affect the user.

---

### `GET /api/puzzles`
List available puzzle categories and counts for the requesting user's tier.

**Response**:
```json
{
  "categories": [
    { "id": 1, "name": "Immediate Threat", "locked": false, "count": 8 },
    { "id": 2, "name": "Forced Block",     "locked": false, "count": 8 },
    { "id": 3, "name": "Double Threat",    "locked": false, "count": 8 },
    { "id": 4, "name": "Fork Setup",       "locked": true,  "count": 8 },
    { "id": 5, "name": "Zugzwang",         "locked": true,  "count": 9 },
    { "id": 6, "name": "Parity Control",   "locked": true,  "count": 9 }
  ]
}
```
- `locked: true` for cats 4–6 when tier is `anonymous` or `free`.
- Count reflects active puzzles only.

---

### `GET /api/puzzles/:id`
Get a single puzzle by ID.

**Auth**: Validates that the requesting tier can access this category. Returns 403 if locked.

**Response**:
```json
{
  "id": "uuid",
  "category": 1,
  "moveString": "44332",
  "goalPrompt": "You are Red — find the immediate win",
  "goalPredicateType": "immediate_threat",
  "cooperativeAiMoves": [],
  "difficulty": 1
}
```

---

### `POST /api/puzzles/:id/check`
Evaluate a user's move against the puzzle's goal predicate.

**Request**:
```json
{
  "candidateCol": 3,
  "moveHistory": [3, 3, 2, 2]
}
```
- `candidateCol`: the column the user is submitting (0-indexed).
- `moveHistory`: columns played so far in this puzzle attempt (for multi-move puzzles).

**Response (correct)**:
```json
{
  "result": "correct",
  "oneLiner": "Correct! Immediate win in column 4.",
  "tiedWith": null
}
```

**Response (tied)**:
```json
{
  "result": "tied",
  "oneLiner": "Also works — ties with col 4 in the engine's analysis.",
  "tiedWith": 3
}
```

**Response (wrong)**:
```json
{
  "result": "wrong",
  "message": "Not the best move — try again."
}
```

**Response (cooperative AI move, for multi-move puzzles)**:
```json
{
  "result": "await_next",
  "aiMove": 4,
  "message": "Opponent plays column 5. Your move."
}
```

---

### `GET /api/coach/weakness-map`
Get the authenticated user's weakness map. Paid only.

**Auth**: Requires `tier = 'paid'`. Returns 403 otherwise.

**Response**:
```json
{
  "weaknessMap": [
    { "category": 4, "name": "Fork Setup",       "attempted": 8,  "missRate": 0.625 },
    { "category": 5, "name": "Zugzwang",          "attempted": 5,  "missRate": 0.400 },
    { "category": 3, "name": "Double Threat",     "attempted": 12, "missRate": 0.250 },
    { "category": 1, "name": "Immediate Threat",  "attempted": 10, "missRate": 0.100 },
    { "category": 2, "name": "Forced Block",      "attempted": 9,  "missRate": 0.111 },
    { "category": 6, "name": "Parity Control",    "attempted": 3,  "missRate": 0.333 }
  ]
}
```
- Sorted by `missRate` descending (weakest first).
- `missRate = first_attempt_failures / attempted`.

---

### `GET /api/coach/queue`
Get the next puzzle from the user's blunder review queue. Paid only.

**Auth**: Requires `tier = 'paid'`. Returns 403 otherwise.

**Response (queue has items)**:
```json
{
  "hasItems": true,
  "queueCount": 12,
  "puzzle": {
    "id": "blunder-uuid",
    "boardState": "44332165",
    "goalPrompt": "Find the best move",
    "category": 3
  }
}
```

**Response (empty queue)**:
```json
{
  "hasItems": false,
  "queueCount": 0,
  "puzzle": null
}
```

---

### `POST /api/coach/queue/:blunderId/resolve`
Mark a blunder as resolved (called when user solves the review puzzle correctly).

**Auth**: Requires `tier = 'paid'`.

**Response**: `204 No Content`

---

### `POST /api/stripe/create-checkout`
Create a Stripe Checkout session for subscription.

**Auth**: Must be signed in (not anonymous).

**Request**: `{ plan: "monthly" | "annual" }`

**Response**: `{ checkoutUrl: string }` — redirect user to this URL.

---

### `POST /api/stripe/webhook`
Stripe webhook receiver. Validates `Stripe-Signature` header.

**Handles**:
- `checkout.session.completed` → set `tier = 'paid'`, store `stripe_customer_id`
- `customer.subscription.deleted` → set `tier = 'free'`
- `customer.subscription.updated` → update tier if status changed

**Response**: `200 OK` always (Stripe retries on non-200).

**Note**: Every payload inserted to `stripe_events` before processing. Human reviews this
table, not an admin panel.

---

### `POST /api/stripe/portal`
Create a Stripe Customer Portal session for subscription management.

**Auth**: Must be signed in with a Stripe customer ID.

**Response**: `{ portalUrl: string }`

---

## Rate Limits (applied via express-rate-limit)

| Endpoint | Limit |
|---|---|
| `POST /api/explain-move` | 30 req/min per IP |
| `POST /api/scores` | 60 req/min per IP |
| `POST /api/explain` | 60 req/min per IP |
| `POST /api/puzzles/:id/check` | 60 req/min per IP |
| `POST /api/stripe/create-checkout` | 10 req/min per IP |
| All other endpoints | 120 req/min per IP |

---

## Input Validation Rules

Applied to all endpoints before any processing:

- `moves` (board string): must match `/^[1-7]{0,42}$/`; decoded position must be legal
  (no column overflow, no prior win condition before final move).
- `candidateCol`: must be integer in [0, 6].
- `plan`: must be exactly `"monthly"` or `"annual"`.
- `event` (track): must be a known event name string; unknown events are accepted but
  flagged in Sentry for investigation.
