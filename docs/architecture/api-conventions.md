# API Conventions

## Route Naming

**MUST**: Public puzzle/game routes use `/api/<resource>` (e.g., `/api/puzzles`, `/api/scores`).
**MUST**: Curation and admin routes use `/api/admin/<resource>` (e.g., `/api/admin/candidates`).
**MUST**: Stripe routes use `/api/stripe/<action>` (e.g., `/api/stripe/create-checkout`).
**MUST**: Coach routes use `/api/coach/<resource>` (e.g., `/api/coach/weakness-map`).
**MUST**: Authenticated user-data routes use `/api/user/<resource>` (e.g., `/api/user/profile`, `/api/user/streak`). Established in spec 030; full endpoint contracts at `specs/030-server-mediated-data-access/contracts/api-user-endpoints.md`.

## Error Response Shape

**MUST**: All error responses use `{ "error": "<message string>" }` with no other keys.
**MUST**: HTTP status codes: 400 for invalid input, 401 for unauthenticated, 403 for unauthorized/tier-gated, 404 for not found, 409 for conflict (already exists), 429 for quota exceeded, 500 for server errors, 503 for unavailable dependencies.

## Success Response Shape

**MUST**: 204 No Content for mutations with no return value (DELETE, resolve actions).
**MUST**: 201 Created for insert operations that return an id.
**MUST**: 200 with a JSON body for all other successful responses.

## Auth Threading

**MUST**: All routes run through the `loadUser` middleware, which:
1. Reads the token from two sources in priority order: `Authorization: Bearer <token>` header first, then the `sb_access_token` httpOnly cookie as a fallback.
2. Validates the JWT with `supabase.auth.getUser(token)`.
3. Fetches the user's `tier`, `deep_reveal_count`, `deep_reveal_reset_at`, `device_uuid`, `papergames_id`, `last_import_at` from `public.users`.
4. Populates `req.user` (null for anonymous/invalid token).

**Frontend auth**: The client uses `credentials: 'include'` (not `Authorization` header). The session object stores only `{ user }` — no `access_token` field. The token lives exclusively in the httpOnly cookie and is never exposed to client-side JS. Sending `Authorization: Bearer` with a stale/undefined value shadows the cookie fallback.

**MUST NOT**: Any route skip `loadUser` — it is registered globally via `app.use(loadUser)`.

## Access Guards

- **`requirePaid`**: Middleware for paid-tier coach endpoints. Returns 403 if `req.user?.tier !== 'paid'`. Currently used by `GET /api/coach/weakness-map` only. Queue and resolve endpoints use inline `requireAuth` (401) instead.
- **`userCanAccessCategory(user, categoryId)`**: Helper used in puzzle routes. Returns false for paid categories unless `user?.tier === 'paid'`.
- **`requireLocalhost`**: Middleware for admin endpoints. Checks `req.ip` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`. Returns 403 for all other IPs. Admin endpoints are never exposed publicly.
  Threat model: the server is expected to run behind a firewall or on a private network without port forwarding. `requireLocalhost` is the sole access control layer — there is no API key, session token, or other authentication for admin routes. If the deployment model changes (e.g. cloud-hosted server with a remote admin UI), admin routes must be migrated to token-based auth before deployment.

### `/api/user/*` ownership invariants (spec 030)

**MUST**: Every `/api/user/*` endpoint MUST check `req.user` at the top of the handler and return `401 { "error": "Unauthorized" }` if null. The `loadUser` middleware runs globally, but the explicit inline guard is required — do not rely on middleware ordering alone.

**MUST**: Every `/api/user/*` endpoint MUST filter all DB queries with `user_id = req.user.id` (or `id = req.user.id` for the `users` table). No endpoint may read or write another user's data.

**MUST**: `device_uuid` MUST be sourced from `req.user.device_uuid` (populated by `loadUser`). Client request bodies MUST NOT include `device_uuid` — the server derives it, never trusts it from the wire.

Full endpoint contracts: `specs/030-server-mediated-data-access/contracts/api-user-endpoints.md`.

## Supabase Usage Pattern

**MUST**: The server uses the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) for all DB operations. This bypasses RLS.
**MUST NOT**: The server use the anon key for DB writes.
The `supabase` client is initialized once at startup; routes check `if (!supabase)` and return 503 when the environment variable is not set.

## Fire-and-Forget Writes

**MUST**: Analytics writes (`tracks`) and non-critical DB inserts that must not block the response use the pattern:
```js
supabase.from('table').insert(data)
  .then(() => {})
  .catch(err => console.error('[label]', err.message));
```
The response is sent before the DB write completes.
Rationale: Constitution §V — analytics writes MUST NOT block user-facing operations.

## Pagination

**MUST**: Admin list endpoints support `limit` (default 50, max 100) and `offset` query params.
**MUST**: Return `total` (count) alongside `data` array.
```json
{ "candidates": [...], "total": 142 }
```

## Input Validation

**MUST**: Validate `moves` strings with the regex `/^[0-6]{0,42}$/`.
**MUST**: Validate `candidateCol` as an integer `0–6`.
**MUST**: Validate `category` against `VALID_CATEGORIES` (Set from `server/categories.js`).
All validation happens at the route handler, before any solver or DB call.

## i18n Key Selection Pattern (`pickFromPool`)

**MUST**: When a server endpoint needs to return a localizable string to the client, it MUST return an i18n **key string** (e.g. `"coach.immediate_threat.optimal.0"`), never resolved English text. The client calls `t(key)` to resolve it.

The `pickFromPool(translations, prefix)` helper (defined in `server/index.js`) navigates the imported `en.json` object by dot-path, collects leaf keys, and returns a randomly selected full key string. Returns `null` if the prefix resolves to nothing.

Example usage in `POST /api/evaluate-move`:
```js
const coachPhraseKey = pickFromPool(i18nTranslations, `coach.${phrasePoolKey}.${quality}`);
// → "coach.immediate_threat.optimal.0"
```

The `eval.*` i18n namespace is the canonical location for Tier-1 summary lines:
`eval.<category>.<quality>.summary.<index>` (e.g. `eval.immediate_threat.optimal.summary.0`).

## Route Registration Ordering Constraint

Express uses first-match routing for parameterized path segments. Any new `/api/puzzles/<literal-path>` route (e.g. `/counts`, `/draw`) MUST be registered **before** `GET /api/puzzles/:id` in `server/index.js`. If registered after, Express silently treats the literal path as the `:id` parameter.

Add a comment at the registration point as a guard:
```js
// NOTE: /counts and /draw MUST remain above /:id — Express first-match ordering
```

## Pseudo-Category Pre-Check Pattern

Pseudo-categories not in `VALID_CATEGORIES` (e.g. `mixed`) MUST be checked **before** the `VALID_CATEGORIES.has(category)` guard in route handlers. If the order is reversed, any pseudo-category always falls through to the 400 branch. Add a comment at the branch:
```js
// mixed is not in VALID_CATEGORIES — must be checked first
```

## Empty Board Special Case

The solver hangs on empty input. The server returns `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` (center-favoring, approximate) for empty-board queries without invoking the solver.

## Rate Limiting

Applied via `express-rate-limit` per route prefix, per-IP, 60-second windows:
- `/api/explain-move`: 30 req/min
- `/api/recommend-move`, `/api/explain-move-llm`: 5 req/min
- `/api/llm-feedback`: 10 req/min
- `/api/scores`, `/api/explain`: 60 req/min
- `/api/stripe/create-checkout`: 10 req/min
- All other `/api/` routes: 120 req/min

## Explanation Engine Endpoint

`POST /api/explain-move` — returns a one-liner explanation of a candidate move. Optionally returns a full deep-reveal if the user has quota.

**Request body**: `{ moves: string, candidateCol: number, humanFirst?: boolean, requestDeepReveal?: boolean }`
- `moves`: 0-indexed move string for the current position (before the candidate move).
- `candidateCol`: 0-indexed column being evaluated.
- `requestDeepReveal`: if `true` and the user is authenticated, decrements the daily Deep Reveal quota and returns full explanation text.

**Response**:
```json
{
  "oneLiner": "<short explanation string>",
  "patternTag": "<classifier tag slug>",
  "deepReveal": { "patternTag": "...", "fullText": "...", "continuationLine": [], "boardAnnotation": [] } | null,
  "quotaRemaining": number | null
}
```
- `deepReveal` is `null` unless `requestDeepReveal: true` and the user has remaining quota.
- `quotaRemaining` reflects the user's remaining Deep Reveal count after this request; `null` for anonymous requests.
- Anonymous users receive `oneLiner` only; `requestDeepReveal: true` from an anonymous user returns 403.
- Results are cached in `explanation_cache` keyed by `sha256(moves:candidateCol)`; cache hits skip the solver and classifier.

**Errors**: 400 for invalid params, 403 if anon requests deep reveal or quota exhausted with `{ quotaRemaining: 0 }`, 429 when rate limit hit.

**Rate limit**: 30 req/min.

## Coach Endpoints: weakness-map, queue, resolve

`GET /api/coach/weakness-map` still requires `requirePaid` (403 if `req.user?.tier !== 'paid'`). Queue and resolve endpoints now use inline `requireAuth` (401 if `req.user` is null) instead of `requirePaid`, making them available to all authenticated users.

### `GET /api/coach/weakness-map`

Returns per-category miss rates for the authenticated user.

**Response**: `{ "weaknessMap": [{ "category": string, "attempted": number, "missRate": number }] }`
- Sorted by `missRate` descending. Empty array if the user has no attempts.

### `GET /api/coach/queue`

Returns the authenticated user's blunders with server-computed threat cell locations.

**Query params**:
- `status`: `all` (default), `unreviewed` (resolved_at IS NULL), `reviewed` (resolved_at IS NOT NULL)
- `category`: optional string, must be a valid blunder tag slug. Filters blunders to a single pattern category.
- `game_id`: optional UUID string. Filters blunders to those linked to a specific **AI sparring game** via the `game_id` column. Does NOT match papergames blunders — those use `papergames_game_id` and are not filterable via this param.

**Response**: `{ "blunders": [...], "total": number }`

Each blunder object:
```json
{
  "id": "uuid",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "created_at": "2026-05-01T12:00:00Z",
  "resolved_at": null,
  "severity": 12,
  "game_id": "<uuid>" | null,
  "moveIndex": 8,
  "threat_cells": [{ "col": 4, "row": 2 }]
}
```

- `game_id`: UUID of the related game, or `null` if the blunder is not linked to a game.
- `moveIndex`: integer equal to `board_state.length` — the global 0-indexed ply count for this blunder position.

- `threat_cells` is computed server-side via `Board.majorThreatCells()`, filtering for the opponent's major threats after the played move.
- `severity` is `round((best_score − score) / 36 * 10)`, an integer in [0, 10]. Normalized by 36 (max possible spread on a 7×6 board) and scaled to 10. Stored at insert time; 0 for legacy rows. UI buckets: Minor=1, Moderate=2–3, Critical=4–10 (chosen from empirical simulation data — ~58% / 28% / 14% of non-zero blunders).
- Capped at 50 rows, ordered by `severity DESC, created_at ASC` (worst mistakes first; ties broken by oldest-first).
- Auth: inline `requireAuth` (401).
- Errors: 400 `{ "error": "invalid category" }` when `?category=` is not a valid blunder tag; 400 `{ "error": "invalid game_id" }` when `?game_id=` is not a valid UUID.

### `POST /api/coach/queue/:blunderId/resolve`

Marks a blunder as resolved. Ownership-checked: the blunder must belong to the authenticated user.

**Path param**: `blunderId` is a UUID string (not integer).

**Response**: `204 No Content` on success.

**Errors**: 400 for missing/invalid `blunderId`, 401 (unauthenticated), 500 for DB errors.

**Auth**: inline `requireAuth` (401).

## Coach Endpoint: explain-simulate

`POST /api/coach/explain-simulate` — plays out optimal continuations and aggregates which tactical patterns appear at the leaves, answering "what does this move set up?"

**Request body**:
```json
{
  "moves":       "<movestring including the candidate move>",
  "anchorCell":  { "col": 3, "row": 2 },
  "perspective": 1,
  "numPlies":    2
}
```
- `moves`: 0-indexed move string that already includes the candidate move being explained.
- `anchorCell`: 0-indexed cell where the candidate disc landed. Caller computes as `new Board(movesBeforePlay).colHeights[col]`.
- `perspective`: `1` (Red) or `2` (Yellow) — whose patterns to aggregate.
- `numPlies`: optional, default `2`, integer `0–6`. Practical range: 2–4.

**Response** (`200 OK`):
```json
{
  "totalLeaves": 9,
  "anchorCell":  { "col": 3, "row": 2 },
  "perspective": 1,
  "patterns": {
    "figure_7":      { "frequency": 7, "total": 9, "ratio": 0.78, "withAnchorDisc": 5, "withoutAnchorDisc": 2, "cellHistogram": { "col3,row2": 6 } },
    "z_threat":      { "frequency": 0, "total": 9, "ratio": 0.00, "withAnchorDisc": 0, "withoutAnchorDisc": 0, "cellHistogram": {} },
    "double_threat": { "frequency": 4, "total": 9, "ratio": 0.44, "withAnchorDisc": 3, "withoutAnchorDisc": 1, "colHistogram": { "3": 3 } },
    "claimeven":     { "frequency": 0, "total": 9, "ratio": 0.00, "withAnchorDisc": 0, "withoutAnchorDisc": 0 }
  }
}
```
- All 11 pattern names are present in `patterns` (claimeven is always `frequency: 0` — excluded from simulation due to cost).
- `withAnchorDisc + withoutAnchorDisc = frequency` for every pattern.
- Coordinate patterns (`z_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`) include `cellHistogram`; directional patterns include `colHistogram`; boolean patterns have neither.

**Errors**: 400 for invalid/missing params, 500 for solver errors.

## LLM Coach Endpoints

### `POST /api/recommend-move`

Provides a pre-move recommendation for the current board position.

**Request body**: `{ movestring: string, rounds: 1 | 2 }`
- `movestring`: 0–42 digits `0–6` (current position before the player's move)
- `rounds`: depth of LLM reflection (1 = single-pass)

**Response**:
```json
{
  "recommendation": "<LLM text>",
  "prompt": "<raw prompt sent to LLM>",
  "colRankings": [{ "col": 4, "tier": "winning" }, { "col": 3, "tier": "drawing" }]
}
```
- `colRankings`: top-2 columns sorted best-first by tier; `col` is 0-indexed; `tier` is the classification tier string.
- No solver scores are included — constitution Principle IV prohibits surfacing numerical evaluations.

**Rate limit**: 5 req/min (LLM cost guard). Returns 503 if `OPENAI_API_KEY` or `OPENAI_MODEL` env vars are absent.

### `POST /api/explain-move-llm`

Explains a specific move the human just played (post-move reflection).

**Request body**: `{ movestring: string, col: number, rounds?: number }`
- `movestring`: position **before** the human's move
- `col`: 0-indexed column the human played
- `rounds`: optional integer 1–5 (default 1)

**Response**:
```json
{
  "explanation": "<LLM-generated explanation paragraph>",
  "prompt": "<LLM prompt used to generate the explanation>",
  "terms": { "community-z-threat": "<short_summary>", "allen-t4": "<short_summary>" },
  "cached": true
}
```
- `cached`: `true` when served from `explanation_cache`. Absent (undefined) on cache miss.
- `prompt`: the LLM prompt used to generate the explanation. Used by the `POST /api/llm-feedback` flag feature. Empty string `''` on the no-contrast fallback path.
- `terms`: always present (minimum `{}`). Map of `{ kbId: short_summary }` for KB concepts tagged in the explanation via `[term:kbId]` markup. Values carry `short_summary` (1-2 sentence plain-language definitions), never the full `statement` field. Present on both cache hits and cache misses. Cache hits from pre-feature rows return `terms: {}` (those rows lack the `terms` JSONB field).

**Processing order**:
1. Auth gate: 401 for unauthenticated
2. Input validation: 400 for invalid movestring/col/rounds
3. LLM service check: 503 if `OPENAI_API_KEY`/`OPENAI_MODEL` absent
4. Cache check: `SHA256(movestring + ":" + col)` → `explanation_cache` lookup → return `{ explanation, prompt, cached: true }` on hit (quota NOT decremented)
5. Quota decrement (cache miss only): 429 when free-tier quota exhausted; paid tier skips
6. LLM call → `explanation` string
7. Fire-and-forget cache write: `{ position_hash, one_liner: '', deep_reveal_json: { explanation, prompt } }`
8. Response: `{ explanation, prompt }`

**Quota note**: Cache hits do NOT decrement quota. A user with 0 quota remaining can still receive a cached explanation.

**Errors**: 400 for invalid params, 401 (unauthenticated), 429 (quota exceeded), 503 (LLM not configured), 500 (internal error).

**Rate limit**: 5 req/min.

### `GET /api/user/tts/deep-reveal`

Returns spoken (TTS) audio for a cached deep-reveal explanation. The client points an `<audio>` element at this endpoint. On a cache hit, the server redirects (302) to a signed Supabase Storage URL; on a miss, it streams OpenAI TTS audio directly while buffering for background upload to the cache.

**Query params**: `moveString=<0-indexed movestring>&col=<0-indexed column>`
- `moveString`: position **before** the move (0–42 chars, digits 0–6)
- `col`: 0-indexed column played

**Response — cache hit**: `302 Found` with `Location: <signed Supabase Storage URL>` (1-week lifetime). The client's `<audio>` element follows the redirect transparently.

**Response — cache miss**: `200 OK` with `Content-Type: audio/mpeg` and chunked transfer encoding. OpenAI TTS audio streamed directly to the client (~300 ms to first byte).

**Processing order**:
1. Auth gate: 401 if `req.user` is null (inline check, not middleware)
2. Input validation: 400 for invalid `moveString` or `col`
3. Supabase check: 503 if not configured
4. `explanation_cache` lookup by `SHA256(moveString + ":" + col)` → 404 if no cached explanation
5. Annotation stripping: removes `[zone:X]...[/zone:X]` and `[term:X]...[/term:X]` tags (keeping inner text) for clean TTS speech
6. Audio hash: `SHA256(stripped_text)` computes deterministic storage path `tts/deep-reveal/<hash>.mp3`
7. Cache hit (`row.audio_path === computed path`): generate signed URL → 302 redirect
8. Cache miss: call OpenAI TTS streaming API → pipe audio to response while collecting chunks → fire-and-forget upload to Supabase Storage + `explanation_cache` row update

**No quota consumed**: The deep-reveal quota is decremented by `POST /api/explain-move-llm`. This TTS endpoint only converts text to speech — it does not generate new explanations.

**Errors**: 400 (invalid params), 401 (unauthenticated), 404 (no explanation cached), 500 (internal), 502 (OpenAI TTS service error), 503 (Supabase not configured / `OPENAI_API_KEY` missing).

**TTS config**: Uses the same voice, speed, and instructions as the existing admin TTS system, read via `readTtsConfig()` (from `server/tts-prompt.json`).

**Rate limit**: 120 req/min (default `/api/` bucket). No additional rate limiting.

## Move Evaluation Endpoint

`POST /api/evaluate-move` — scores a move and returns i18n keys for the Coach dialog and Tier-1 strip. Supports two paths: **user-move** (default, for puzzle attempts and sparring user clicks) and **AI-move** (for sparring AI move commentary).

### User-Move Path (default, `aiMove` absent or false)

**Request body**: `{ movestring: string, col: number, category?: string, aiMove?: false }`
- `movestring`: position **before** the move (0-indexed, 0–42 chars).
- `col`: 0-indexed column played.
- `category`: optional override for the phrase pool key (e.g. `"forced_block"`). When omitted, the classifier derives the pattern tag from the position via `classify()` (synchronous, pre-move board).
- `aiMove`: absent or `false`.

### AI-Move Path (`aiMove: true`)

When `req.body.aiMove === true`, the server classifies the **post-move** board from the AI player's perspective:

1. Computes `postMoveMovestring = movestring + col` and `aiPlayerInt = (movestring.length % 2) + 1`.
2. Calls `await classifyPattern(postMoveMovestring, aiPlayerInt, solver)` — async, returns a `Map<tag, details>`.
3. Applies the fixed priority ordering to select a single `patternTag`:
   `immediate_threat` > `double_threat` > `forced_win` > `forced_block` > `forbidden_columns` > `z_threat` > `odd_even_threat` > `claimeven` > `figure_7` > `j_shape` > `overcut` > `undercut` > `claimodd`
4. If no tags match, `patternTag` is `null`.

The `coachPhraseKey` in the AI-move response is ignored by the client. The client uses `quality` and `patternTag` from the response to select phrases from `coach.ai_move.*` pools (see FR-007 in spec 029).

**Latency note**: The AI-path evaluate-move call may exceed the 2 s latency guideline on `forced_win` positions due to `classifyPattern`'s solver queries (re-evaluates the board for each of 13 detectors). This is a known, tracked exception — caching is deferred to a future performance pass.

### Response Shape (both paths)

```json
{
  "badge": "good" | "mid" | "bad",
  "quality": "optimal" | "suboptimal" | "blunder",
  "coachPhraseKey": "coach.immediate_threat.optimal.0" | null,
  "coachMood": "happy" | "think" | "oops",
  "summaryLineKey": "eval.immediate_threat.optimal.summary.0" | null,
  "patternTag": "<category slug>" | null
}
```
- `badge` and `quality` are derived from the solver score for `col` relative to the best available score.
- `coachPhraseKey` and `summaryLineKey` are randomly selected from the matching i18n pool; `null` if no pool exists for the pattern.
- `patternTag` is the classifier's category slug for the position; `null` if the position doesn't match any known pattern.
- No auth required; anonymous calls are accepted.

**Errors**: 400 for invalid `movestring` or `col`, 500 for solver errors.

**Rate limit**: 120 req/min (default).

**Routing note**: registered before `GET /api/puzzles/:id` — see Route Registration Ordering Constraint above.

## Puzzle Check Endpoint

`POST /api/puzzles/:id/check` evaluates one candidate column against the puzzle's goal predicate.

**Request body**: `{ candidateCol: 0-6, moveHistory?: number[], attemptNumber?: number, timeMs?: number }`

**Response**:
```json
{
  "result": "correct" | "wrong" | "tied",
  "correctCol": number | null,
  "tiedWith": number[] | null,
  "threatCells": [{"col": 0-6, "row": 0-5}] | null,
  "forbiddenCols": number[] | null
}
```

- `threatCells`: populated for `double_threat` puzzles when `result` is `correct` or `tied`. Contains the two (or more) major threat cells created by the correct move. Frontend uses these to render `major_threat` highlights after reveal.
- `forbiddenCols`: populated for `forbidden_columns` puzzles on every response. Contains the full set of 0-indexed columns that are forbidden in the position. Frontend uses this to reveal missed forbidden columns after multi-select submit.
- `correctCol`: the canonical correct column for categories that have a single answer; `null` for categories where any non-forbidden column is correct (e.g. `forbidden_columns`).

Returns 400 for `interaction_mode = 'sequence'` puzzles — use `/sequence/move` instead.

## GET /api/games

Lists past sparring games for the authenticated user.

**Auth**: Required (401 if `req.user` is null).

**Query params**:
- `limit`: positive integer ≤ 50 (default 20). Returns 400 if non-numeric, zero, negative, or > 50.
- `outcome`: `'won'` or `'lost'`. Returns 400 for any other value (including `'draw'`). When omitted, all outcomes are returned.
- `has_blunder`: `'true'` (string). Returns 400 for any other value. When omitted, all games are returned.
- `sort`: `'recent'` (default), `'played_well'` (highest accuracy first), or `'worst_blunders'` (most blunders first). Returns 400 for any other value. When omitted, defaults to `'recent'`.

**Response** (`200 OK`):
```json
{
  "games": [
    {
      "id": "<uuid>",
      "outcome": "won" | "lost" | "draw",
      "side": "first" | "second",
      "date": "<ISO timestamp>",
      "source": "ai",
      "difficulty": "easy | medium | hard | perfect",
      "accuracy": 82 | null,
      "blunder_count": 2,
      "move_count": 22,
      "cols": ["gdg", "", "d", ...]
    }
  ]
}
```

- `outcome`: DB values `win`/`loss`/`draw` are mapped to `won`/`lost`/`draw` in the response.
- `side`: `'first'` (user moves first, plays Green) or `'second'` (user moves second, plays Gray).
- `accuracy`: from the `games.accuracy` column (written by `POST /api/games/analyze`); `null` if the game has not been analyzed.
- `blunder_count`: count of `blunders` rows linked to this game via `game_id`.
- `cols`: 7-element array of per-column move encoding (`g` = current player, `d` = opponent), produced by `movesToCols`.
- Games with `blunder_count === 0` are excluded when `has_blunder=true`.

**Errors**: 400 (invalid params), 401 (unauthenticated), 503 (Supabase not configured), 500 (DB error).

## POST /api/games

Saves a completed sparring game record.

**Request body**:
```json
{
  "device_uuid": "<string>",
  "moves": "<0-indexed movestring [0-6]>",
  "difficulty": "easy | medium | hard | perfect",
  "side": "first | second",
  "result": "win | loss | draw"
}
```

- `moves`: 0-indexed column movestring, validated against `^/^[0-6]{0,42}$/`
- `side`: `'first'` = user moves first (Green), `'second'` = user moves second (Gray)
- Auth: Optional. `user_id` = `req.user?.id ?? null`

**Response** (201):
```json
{ "id": "<uuid>" }
```

**Errors**: 400 for validation failures; 503 if Supabase not configured.

## Puzzle GET Endpoint

`GET /api/puzzles/:id` returns puzzle data including `userPlayer` (1 = Red, 2 = Yellow).
Frontend uses `userPlayer` to determine which color disc to place on click and to display the "Playing as Red/Yellow" context chip.

## Sequence-Mode Puzzle Endpoint

`POST /api/puzzles/:id/sequence/move` handles per-move validation for `interaction_mode = 'sequence'` puzzles.
Accepts `{ position, col }` where `position` is the current move string (before the learner's move) and `col` is 0-indexed.
Returns `{ outcome: 'success' | 'fail' | 'continue', aiCol?, reason? }`.
All validation is bitboard-only — no solver calls.
`POST /api/puzzles/:id/check` returns 400 for sequence-mode puzzles; callers must use the `/sequence/move` endpoint instead.

## Game Analysis & Explorer Endpoints

### `POST /api/games/analyze`

Scores every user ply in a completed game and returns a quality summary.

**Request body**: `{ gameId: string }`

**Response** (`200 OK`):
```json
{
  "moves": [
    {
      "moveIndex": 1,
      "col": 3,
      "quality": "optimal" | "suboptimal" | "blunder",
      "score": 5,
      "bestScore": 5,
      "bestCol": 3,
      "patternTag": "double_threat" | null
    }
  ],
  "accuracy": 82,
  "optimalCount": 17,
  "suboptimalCount": 3,
  "blunderCount": 2,
  "scored": 22,
  "summaryPhraseKey": "coach.sparring.review.mistakes.1",
  "fullMovestring": "334441...",
  "difficulty": "easy | medium | hard | perfect",
  "side": "first | second"
}
```

- `moves`: all user plies (odd indices if `side = 'first'`, even indices if `side = 'second'`). Forced moves (only 1 legal column) are included in `moves` with a quality label but excluded from `scored`.
- `patternTag`: classifier slug for the position at that ply; `null` if no pattern matched.
- `accuracy`: percentage of scored plies that were optimal.
- `scored`: number of plies that were not forced (i.e., denominator for `accuracy`).
- `summaryPhraseKey`: i18n key selected from the coach phrase pool based on blunder/suboptimal counts.
- Auth: Optional (`loadUser` runs; `req.user` may be null).

**Errors**: 400 (missing `gameId`), 404 (game not found), 500 (solver error), 503 (Supabase not configured).

### `POST /api/games/from-position`

Returns a truncated movestring for spawning a new game from a specific position in a past game. Does **not** insert a new `games` row — the caller navigates to the game screen and the row is created by `saveGame` when the spawned game ends.

**Request body**: `{ gameId: string, N: number, difficulty: "easy" | "medium" | "hard" | "perfect" }`
- `N`: number of plies to keep (must be a positive integer ≤ length of the stored movestring).
- `difficulty`: difficulty for the new game session.

**Response** (`200 OK`):
```json
{ "moves": "<truncated movestring>", "side": "first | second", "difficulty": "easy | medium | hard | perfect" }
```

- `side`: carried over from the original game row unchanged.
- Auth: Optional.

**Errors**: 400 (invalid or missing params, `N` out of range), 404 (game not found), 503.

## Blunders Endpoint

### `POST /api/blunders`

Records a blunder detected during post-game review. Fire-and-forget from the client — the response is not awaited before navigation.

**Request body**:
```json
{
  "board_state": "<movestring at the point of the blunder>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "<slug>",
  "score": -4,
  "best_score": 8
}
```
- `pattern_category`: must be one of the valid slugs (see Data Model — `blunders` constraint). Use `"unknown"` when the classifier returns no pattern.
- `score`: c4solver score of the column actually played (current-player perspective, range ±18). Optional; defaults to 0.
- `best_score`: c4solver score of the optimal column. Optional; defaults to 0.
- The server computes `severity = best_score − score` and stores it. Do not send `severity` directly.
- Auth: **Required** (401 if `req.user` is null).

**Response** (`201 Created`): `{ "id": "<uuid>" }` — the inserted blunder's primary key.

**Notable behavior**: `puzzle_id` is always stored as `null` for blunders created from post-game review (as opposed to blunders created from puzzle attempts, which carry a `puzzle_id`).

**Errors**: 400 (missing or invalid fields), 401 (not authenticated), 500 (DB error), 503 (Supabase not configured).

### `GET /api/blunders/:id`

Returns a single blunder by UUID. No auth required — this is the public permalink endpoint.

**Path param**: `id` is a UUID string, validated against `UUID_REGEX` (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).

**Response** (`200 OK`):
```json
{
  "id": "<uuid>",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "created_at": "2026-05-01T12:00:00Z",
  "resolved_at": null,
  "severity": 12,
  "blunder_severity": 7.50,
  "game_id": "<uuid>" | null,
  "moveIndex": 8,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "is_owner": true
}
```

- `is_owner`: `true` when the authenticated user owns the blunder; `false` when a different user or an anonymous visitor fetches it. Computed server-side as `req.user?.id === row.user_id`.
- `user_id` is **never** exposed in the response.
- Response shape is field-for-field identical to coach queue items, plus the `is_owner` boolean.
- Threat cells are computed server-side via `computeThreatCells(board_state, move_played)`.

**Errors**:
- `400` — `{ "error": "invalid blunder id" }` when `id` is not a valid UUID.
- `404` — `{ "error": "blunder not found" }` when no row matches the UUID.
- `503` — `{ "error": "internal error" }` when Supabase is not configured.

## LLM Feedback Endpoint

`POST /api/llm-feedback` — records a flagged LLM response for human review. No auth required.

**Request body**: `{ movestring, llm_prompt, llm_response, human_note, feature }`
- `feature`: string identifying which LLM feature produced the response (e.g. `"explain-move-llm"`).

**Response**: `204 No Content` on success.

**Rate limit**: 10 req/min.

## Papergames Import Endpoints (spec 038)

### `PUT /api/user/profile`

Saves the user's Papergames account ID for self-service import.

**Request body**: `{ papergames_id: "<string>" }`
- `papergames_id`: non-empty string, max 64 characters.

**Response**: `204 No Content` on success.

**Errors**: 400 `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` for missing/invalid input; 401 for unauthenticated; 503 if Supabase not configured.

**Auth**: Required (inline `requireUser` -> 401).

---

### `POST /api/user/papergames/import`

Starts an asynchronous background import of the user's papergames.io games and blunders. Returns immediately with a `jobId` for polling.

**Request body**: empty `{}` (the `papergames_id` is read from `req.user.papergames_id` server-side).

**Response** (`202 Accepted`):
```json
{ "jobId": "<uuid>" }
```

**Processing order** (enforced in exact sub-step order):

1. **C2a** -- `papergames_id` guard: returns `400 { "error": "no papergames_id configured" }` if `req.user.papergames_id` is null or empty. This is the FIRST check, before the cap query.
2. **C2b** -- Cap check: counts existing `papergames_games` rows for the user. Free tier: `gameLimit = max(0, 15 - count)`; paid tier: `gameLimit = 50`. If `gameLimit === 0`, returns `202` with a synthetic done-job (`capReached: true`) -- no import is started.
3. **C2c** -- One-in-flight guard: iterates the in-memory job Map. If any entry has `userId === req.user.id` and status is `pending` or `running`, returns `202 { jobId: entry.jobId }` (resume polling the existing job).
4. **C2d** -- Spawn: generates a `jobId` via `crypto.randomUUID()`, inserts a job entry with status `pending`, returns `202 { jobId }`. Then **asynchronously** (via `Promise.resolve().then(...)`):
   - Updates status to `running`
   - Calls `importForUser(supabase, userId, papergamesId, gameLimit, lastImportAt)`
   - On success: updates status to `done`, writes `last_import_at` to the `users` table
   - On failure: updates status to `error`, sets `error: err.message`; does NOT update `last_import_at`

**Jobs are in-memory only**: Stored in a module-level `Map` keyed by `jobId`. Server restarts clear all jobs. There is no database persistence for job state.

**Auth**: Required (inline `requireUser` -> 401).
**Rate limit**: 120 req/min (default `/api/` bucket).

---

### `GET /api/user/papergames/import/status`

Polls the status of an import job.

**Query params**: `jobId=<uuid>` (required, validated against UUID regex).

**Response** (`200 OK`):
```json
{
  "status": "pending | running | done | error",
  "imported": 0,
  "skipped": 0,
  "capReached": false
}
```
- `capReached`: `true` when the import was short-circuited because the user had already reached the 15-game free-tier limit.
- `error`: present only when `status === "error"` -- contains the error message string.

**Errors**: 400 `{ "error": "invalid jobId" }` for missing or non-UUID `jobId`; 401 for unauthenticated.

**Privacy-preserving 404 convention**: Both "job not found" and "job belongs to a different user" return `404 { "error": "job not found" }`. An attacker cannot distinguish "the jobId exists but belongs to someone else" from "the jobId does not exist." Clients poll every 2 seconds; transient network errors are silently retried on the next tick.

**Auth**: Required (inline `requireUser` -> 401).

---

### `POST /api/user/papergames/save-live-game`

Saves a single live game (played via the Play Online screen against a random papergames.io opponent) immediately after it finishes, then runs blunder extraction fire-and-forget.

**Request body**: `{ roomUid: string, papergamesAccountId: string }`
- `roomUid`: the papergames room UID from the `room:join-auto` WebSocket event.
- `papergamesAccountId`: the socket-level user ID from the `user:connect` event. This is the same value used as `action.userId` in the replay API, and is sent from the client because it is the guest session's socket ID — not derivable from `req.user.papergames_id` (which holds the user's configured permanent account, not the guest ID).

**Response** (`201 Created`):
```json
{ "id": "<uuid>" }
```
The `papergames_games` row UUID. The client navigates to `ReviewScreen` with this id; analysis is produced by `POST /api/games/analyze`, same as sparring.

**Save-fast strategy**: `saveLiveGame()` writes the game row (no blunder analysis) and returns quickly. After the response is sent, `extractAndSaveBlunders()` runs as a fire-and-forget background task — it spawns a dedicated solver, writes blunder rows, and updates the row's `accuracy`. Failures are logged, never surfaced to the client. Blunders are only consumed by the coach queue, not required for the review summary.

**Errors**: 400 `{ "error": "roomUid is required" }` / `{ "error": "papergamesAccountId is required" }` for missing/invalid input; 401 for unauthenticated (the client shows a "Log in to save" prompt and stays on the screen); 503 if Supabase not configured; 500 on save failure.

**Auth**: Required (inline `requireUser` -> 401).
