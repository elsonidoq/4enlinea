# API Conventions

## Route Naming

**MUST**: Public puzzle/game routes use `/api/<resource>` (e.g., `/api/puzzles`, `/api/scores`).
**MUST**: Curation and admin routes use `/api/admin/<resource>` (e.g., `/api/admin/candidates`).
**MUST**: Stripe routes use `/api/stripe/<action>` (e.g., `/api/stripe/create-checkout`).
**MUST**: Coach routes use `/api/coach/<resource>` (e.g., `/api/coach/weakness-map`).

## Error Response Shape

**MUST**: All error responses use `{ "error": "<message string>" }` with no other keys.
**MUST**: HTTP status codes: 400 for invalid input, 401 for unauthenticated, 403 for unauthorized/tier-gated, 404 for not found, 409 for conflict (already exists), 429 for quota exceeded, 500 for server errors, 503 for unavailable dependencies.

## Success Response Shape

**MUST**: 204 No Content for mutations with no return value (DELETE, resolve actions).
**MUST**: 201 Created for insert operations that return an id.
**MUST**: 200 with a JSON body for all other successful responses.

## Auth Threading

**MUST**: All routes run through the `loadUser` middleware, which:
1. Reads `Authorization: Bearer <token>` from the request header.
2. Validates the JWT with `supabase.auth.getUser(token)`.
3. Fetches the user's `tier`, `deep_reveal_count`, `deep_reveal_reset_at`, `device_uuid` from `public.users`.
4. Populates `req.user` (null for anonymous/invalid token).

**MUST NOT**: Any route skip `loadUser` — it is registered globally via `app.use(loadUser)`.

## Access Guards

- **`requirePaid`**: Middleware for coach endpoints. Returns 403 if `req.user?.tier !== 'paid'`.
- **`userCanAccessCategory(user, categoryId)`**: Helper used in puzzle routes. Returns false for paid categories unless `user?.tier === 'paid'`.
- **`requireLocalhost`**: Middleware for admin endpoints. Checks `req.ip` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`. Returns 403 for all other IPs. Admin endpoints are never exposed publicly.
  Threat model: the server is expected to run behind a firewall or on a private network without port forwarding. `requireLocalhost` is the sole access control layer — there is no API key, session token, or other authentication for admin routes. If the deployment model changes (e.g. cloud-hosted server with a remote admin UI), admin routes must be migrated to token-based auth before deployment.

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

All three require `requirePaid` (403 if `req.user?.tier !== 'paid'`).

### `GET /api/coach/weakness-map`

Returns per-category miss rates for the authenticated user.

**Response**: `{ "weaknessMap": [{ "category": string, "attempted": number, "missRate": number }] }`
- Sorted by `missRate` descending. Empty array if the user has no attempts.

### `GET /api/coach/queue`

Returns the next unresolved blunder in the user's coach queue.

**Response**: `{ "queueCount": number, "puzzle": { "blunderId": uuid, "puzzleId": uuid, "category": string, "moveString": string, "goalPrompt": string } | null }`
- `puzzle` is `null` if the queue is empty.
- Queue is ordered oldest-first; max 50 returned.

### `POST /api/coach/queue/:blunderId/resolve`

Marks a blunder as resolved. Ownership-checked: the blunder must belong to the authenticated user.

**Response**: `204 No Content`

**Errors**: 400 for non-integer `blunderId`, 500 for DB errors.

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

**Request body**: `{ movestring: string, col: number, rounds: number }`
- `movestring`: position **before** the human's move
- `col`: 0-indexed column the human played
- `rounds`: 1–5

**Response**: `{ "explanation": "<LLM text>", "prompt": "<raw prompt>" }`

**Rate limit**: 5 req/min.

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

## Puzzle GET Endpoint

`GET /api/puzzles/:id` returns puzzle data including `userPlayer` (1 = Red, 2 = Yellow).
Frontend uses `userPlayer` to determine which color disc to place on click and to display the "Playing as Red/Yellow" context chip.

## Sequence-Mode Puzzle Endpoint

`POST /api/puzzles/:id/sequence/move` handles per-move validation for `interaction_mode = 'sequence'` puzzles.
Accepts `{ position, col }` where `position` is the current move string (before the learner's move) and `col` is 0-indexed.
Returns `{ outcome: 'success' | 'fail' | 'continue', aiCol?, reason? }`.
All validation is bitboard-only — no solver calls.
`POST /api/puzzles/:id/check` returns 400 for sequence-mode puzzles; callers must use the `/sequence/move` endpoint instead.

## LLM Feedback Endpoint

`POST /api/llm-feedback` — records a flagged LLM response for human review. No auth required.

**Request body**: `{ movestring, llm_prompt, llm_response, human_note, feature }`
- `feature`: string identifying which LLM feature produced the response (e.g. `"explain-move-llm"`).

**Response**: `204 No Content` on success.

**Rate limit**: 10 req/min.
