# Contract: POST /api/games/analyze

**Epic**: 024-patterns-blunders-epic2 — Production Wiring

This document describes the contract change to `POST /api/games/analyze` introduced by
Epic 2. For the full endpoint spec, see `docs/architecture/api-conventions.md`.

---

## Request (unchanged)

```
POST /api/games/analyze
Content-Type: application/json
Authorization: Bearer <token>   (optional — anonymous users may call without)

{ "gameId": "<uuid>" }
```

---

## Response (extended)

```json
{
  "moves": [
    {
      "moveIndex": 1,
      "col": 3,
      "quality": "blunder",
      "score": -5,
      "bestScore": 3,
      "bestCol": 2,
      "patternTag": "forced_block",
      "reason": "matched defensive_miss: forced_block",
      "direction": "defensive_miss",
      "blunderSeverity": 0.72
    },
    ...
  ],
  "accuracy": 67,
  "optimalCount": 4,
  "suboptimalCount": 1,
  "blunderCount": 2,
  "scored": 6,
  "summaryPhraseKey": "coach.sparring.review.mistakes.0",
  "fullMovestring": "344455263...",
  "difficulty": "medium",
  "side": "first"
}
```

### New fields per move entry (Epic 2)

| Field | Type | When present |
|---|---|---|
| `reason` | `string` | `quality === 'blunder'` only; otherwise `null` |
| `direction` | `'defensive_miss' \| 'enabled_opponent' \| 'missed_own'` | `quality === 'blunder'` only; otherwise `null` |

`patternTag` was already present. It is now sourced from `tagBlunder()` instead of
`classify()`.

---

## Side-effect: server-side blunder INSERT

**For authenticated requests only** (`Authorization` header present and valid):

When the endpoint processes a ply with `quality === 'blunder'`, it inserts a row into the
`blunders` table with the columns listed in `data-model.md`. The INSERT:
- Is fire-and-forget: INSERT failure (other than `23505`) is logged but does NOT cause a
  non-200 response.
- Treats pg error `23505` (unique violation on `idx_blunders_game_unique`) as success.
- Does NOT block the response — response is returned before/after the INSERT completes.

**For anonymous requests** (`Authorization` header absent or invalid):
- `tagBlunder()` still runs; `patternTag`, `reason`, and `direction` are still returned.
- No INSERT is attempted.

---

## Error responses (unchanged)

| Status | Condition |
|---|---|
| 400 | `gameId` missing or not a string |
| 404 | No `games` row found for `gameId` |
| 500 | Solver or analysis loop error |
| 503 | Supabase not configured |
