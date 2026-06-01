# API Contract: POST /api/explain-move-llm (Extended)

**Epic**: 014-challenges-deep-reveal  
**Date**: 2026-05-31

---

## Endpoint

`POST /api/explain-move-llm`

Rate-limited to 5 req/min (LLM cost guard).

---

## Authentication

**Required.** All requests must include `Authorization: Bearer <session.access_token>`.

Unauthenticated requests return `401 Unauthorized` immediately, before any cache or quota check.

---

## Request Body

```json
{
  "movestring": "0-indexed string of column digits, 0-42 chars, regex /^[0-6]{0,42}$/",
  "col": "integer 0-6, the column the user played",
  "rounds": "optional integer 1-5, default 1 (controls explainSimulate depth)"
}
```

Validation errors return `400 Bad Request` with a descriptive `error` field.

---

## Processing Order (corrected in Epic 2b)

1. **Auth gate**: `if (!req.user) → 401`
2. **Input validation**: validate `movestring`, `col`, `rounds` → `400` on failure
3. **LLM service check**: `if (!OPENAI_API_KEY || !OPENAI_MODEL) → 503`
4. **Cache check**: compute `positionHash = SHA256(movestring + ":" + col)`; query `explanation_cache` for this hash
   - **Cache hit**: return `{ explanation, bestLine, cached: true }` immediately — no quota decrement
5. **Quota decrement** (cache miss only): call `checkAndDecrementQuota(user)` for `free`-tier users
   - Quota exceeded: return `429 { error: 'quota_exceeded', resetsAt: <ISO string> }`
   - Paid tier: skip quota check
6. **`computeBestLine`**: walk solver PV for up to 5 moves starting from `movestring + col`
7. **LLM call**: build prompt, call OpenAI API, receive `explanation`
8. **Cache write** (fire-and-forget): write `{ position_hash, one_liner: '', deep_reveal_json: { explanation, bestLine } }` to `explanation_cache`
9. **Response**: return `{ explanation, bestLine }`

---

## Response (success)

### Cache miss

```json
{
  "explanation": "Playing column 5 completes four across the bottom row immediately...",
  "bestLine": ["Col 5", "Col 2", "Col 6"]
}
```

HTTP 200. `cached` field is absent (undefined) on cache miss.

### Cache hit

```json
{
  "explanation": "Playing column 5 completes four across the bottom row immediately...",
  "bestLine": ["Col 5", "Col 2", "Col 6"],
  "cached": true
}
```

HTTP 200. `cached: true`. Quota is NOT decremented.

### `bestLine` empty cases

`bestLine` is `[]` (empty array) when:
- All legal scores are equal (no meaningful contrast — the prompt itself returns early and no PV is computed)
- Solver error during PV walk
- Position is already a terminal (win/draw)

The client MUST treat an empty `bestLine` by omitting the "BEST LINE" section entirely (not rendering an empty chip row).

---

## Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "movestring must be 0–42 digits 0–6" }` | Invalid movestring |
| 400 | `{ "error": "col must be integer 0–6" }` | Invalid col |
| 400 | `{ "error": "rounds must be an integer between 1 and 5" }` | Invalid rounds |
| 400 | `{ "error": "column is full" }` | col's column is already full |
| 401 | `{ "error": "Unauthorized" }` | No valid auth token |
| 429 | `{ "error": "quota_exceeded", "resetsAt": "2026-06-02T00:00:00.000Z" }` | Free-tier weekly limit reached |
| 500 | `{ "error": "Internal server error" }` | Solver, LLM, or DB error |
| 503 | `{ "error": "LLM service not configured" }` | Missing OPENAI_API_KEY/OPENAI_MODEL |

---

## Quota Semantics

- **Free-tier users**: 20 Deep Reveals per week, reset Monday 00:00 UTC.
- **Paid-tier users**: No quota check; all requests allowed.
- **Anonymous users**: 401 before quota check (server gate; client should show `AuthModal`).
- **Cache hits**: quota NOT decremented regardless of tier. A free-tier user with 0 remaining quota CAN view a previously cached explanation.

---

## `computeBestLine` Implementation Notes

The `bestLine` array is computed by walking the solver principal variation:

1. Start from `movestring + col` (post-user-move position).
2. Query solver for scores; pick highest-scoring legal column (first of ties by 0-indexed col order).
3. Append that column (as `"Col N"` 1-indexed label) to the array.
4. Advance position, repeat until: win detected (`board.hasWon()`), board full, or `maxPlies=5` reached.

The first element of `bestLine` is always `"Col N"` where N = col + 1 (the user's own move, 1-indexed).

Example: user plays col 4 (0-indexed) on movestring `"11152"` → `bestLine` might be `["Col 5", "Col 2", "Col 6"]`.

The solver IPC is serialized (promise chain). `computeBestLine` queues behind any concurrent solver requests; it does not run in parallel with other solver queries on the same request.

---

## Changes from Pre-Epic-2b Behavior

| Aspect | Before | After |
|--------|--------|-------|
| Cache check | None (endpoint had no cache logic) | Checks `explanation_cache` before quota |
| Quota ordering | Decrement before any processing | Decrement only on cache miss |
| Response shape | `{ explanation, prompt }` | `{ explanation, bestLine, cached? }` |
| `bestLine` field | Not present | Solver PV as 1-indexed label array |
| `cached` field | Not present | `true` on cache hit; absent on miss |
| `prompt` field | Returned (debug) | Removed from production response |
