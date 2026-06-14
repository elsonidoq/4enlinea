# API Contracts: Post-Game Review & Position Explorer (Epic 3b)

## `POST /api/games/analyze`

### Request
```json
{ "gameId": "<uuid>" }
```

### Response (200)
```json
{
  "moves": [
    {
      "moveIndex": 1,
      "col": 3,
      "quality": "optimal",
      "score": 5,
      "bestScore": 5,
      "bestCol": 3,
      "patternTag": "double_threat"
    }
  ],
  "accuracy": 82,
  "optimalCount": 17,
  "suboptimalCount": 3,
  "blunderCount": 2,
  "scored": 22,
  "summaryPhraseKey": "coach.sparring.review.mistakes.1",
  "fullMovestring": "334441...",
  "difficulty": "medium",
  "side": "first"
}
```

### Field Notes
- `moves` array contains **only user plies** (AI plies omitted).
- `moveIndex` is **1-based** user-move ordinal.
- `quality` is **never null** — every non-forced move receives a definitive quality.
- `scored` excludes forced moves (positions with exactly 1 legal column).
- `accuracy` = `Math.round(optimalCount / scored * 100)`. Returns `0` when `scored === 0` (client displays `--` in this case).
- `summaryPhraseKey` is selected via `pickFromPool` from `coach.sparring.review.clean.*` (0 blunders) or `coach.sparring.review.mistakes.*` (≥1 blunder).
- `fullMovestring` = complete game movestring (all plies, including AI).
- `patternTag` per move may be `null`.
- `bestCol` per move = the 0-indexed column with the highest solver score (derived from `scoreMove` return value); used as `correct_move` in blunder writes.
- `score` per move = `scores[col]` (raw solver score for the played column).
- `bestScore` per move = `scores[bestCol]` (raw solver score for the best column).
- `difficulty` and `side` are top-level fields (fetched from the `games` row); passed through so the Review screen can forward them to the Explorer without a second DB call.

### Auth
- `loadUser` runs; `req.user` may be null. No auth required to analyze.

### Errors
- `400` — missing or invalid `gameId`
- `404` — game not found
- `503` — Supabase not configured

---

## `POST /api/games/from-position`

### Request
```json
{ "gameId": "<uuid>", "N": 7, "difficulty": "medium" }
```
- `N` = total number of moves played up to (not including) the selected mistake position.
- `gameId` is used to fetch `side` and the original `moves` string server-side.
- `difficulty` is passed by the client from the original game's difficulty param (validated server-side against the allowed set).

### Response (200)
```json
{
  "moves": "334441",
  "side": "first",
  "difficulty": "medium"
}
```

### Field Notes
- Server fetches `side` from the `games` row — client must NOT send `side`.
- `moves` = first `N` characters of the original game's movestring.
- **No games row is inserted** at this point. When the spawned game ends, `GameScreen.saveGame` calls `POST /api/games` to create the row — same as any new game. This avoids phantom rows with a fake `result` placeholder.
- The original game row is never mutated.

### Auth
- Optional auth (same as `POST /api/games`). No row is written here, so `device_uuid` is not required in the request.

### Errors
- `400` — missing/invalid params
- `404` — original game not found
- `503` — Supabase not configured

---

## `POST /api/blunders`

### Request
```json
{
  "board_state": "334441",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "double_threat"
}
```
- `board_state` — movestring before the blunder move (validates as `/^[0-6]{0,42}$/`).
- `move_played` — 0-indexed column the user played (the blunder).
- `correct_move` — 0-indexed column with the highest solver score (`bestCol` from the analyze response).
- `pattern_category` — valid slug or `'unknown'` sentinel; must pass the CHECK constraint updated by migration 027.

### Response (201)
```json
{ "id": "<uuid>" }
```

### Field Notes
- `puzzle_id` is always `null` for game-sourced blunders.
- `user_id` is read from `req.user` server-side — the client does NOT send it.
- The client fire-and-forgets this write; response body is not consumed by the caller.

### Auth
- **Required**. `loadUser` runs; returns 401 if `req.user` is null. The client must include the `Authorization` header (see memory: `feedback_auth_header_on_fetch.md`).

### Errors
- `400` — missing or invalid fields
- `401` — unauthenticated (anonymous users cannot write blunders)
- `503` — Supabase not configured

---

## Reused Endpoints (no changes)

| Endpoint | Purpose in this epic |
|---|---|
| `POST /api/explain-move-llm` | Deep Reveal panel — same cache key, same auth gate (401 for anon), same quota logic |
| `POST /api/llm-feedback` | "Flag this explanation" write |
| `POST /api/evaluate-move` | Used by Explorer's interactive board for per-move Coach feedback (same as GameScreen) |
| `POST /api/scores` | Used by Explorer's `useGameBoard` hook for AI moves and hint overlays |
