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

## Auth Session Endpoints: `POST /api/auth/refresh`, `GET /api/auth/session` (spec 045)

Both read `sb_access_token`/`sb_refresh_token` httpOnly cookies and both delegate the actual token exchange to `attemptRefresh` (`server/authRefresh.js`) — see server-conventions.md "Session Persistence & Silent Refresh" for the shared helper and the `REFRESH_TOKEN_MAX_AGE` (60-day) change.

### `POST /api/auth/refresh`

Unchanged request/response shape. Reads `sb_refresh_token`; 401 `{ error: 'No refresh token' }` if absent. On success, sets new `sb_access_token`/`sb_refresh_token` cookies and returns `200 { ok: true }`. On failure (`attemptRefresh` returns `null`), clears both cookies and returns `401 { error: 'Refresh failed' }`.

**Concurrent-call behavior (FR-002a)**: there is **no** server-side de-duplication/coalescing of concurrent calls presenting the same refresh token — each call independently invokes `authClient.auth.refreshSession()`. This is safe in practice because `specs/045-account-session-checkout/research.md` (R1) empirically confirmed this project's Supabase/GoTrue instance does not enforce refresh-token rotation-with-reuse-detection: a refresh token remains valid even after being exchanged once, so two concurrent refreshes from the same token both succeed independently rather than the second failing against an already-rotated token. (Only verified against anonymous sessions — re-verify before relying on this for a different auth provider config.)

### `GET /api/auth/session`

**New processing order** (spec 045 US2, FR-004/FR-005 — never surprise-sign-out mid-session):
1. If `sb_access_token` is absent AND `sb_refresh_token` is absent → `401 { error: 'Not authenticated' }` (no cookies to clear).
2. If `sb_access_token` is present, validate via `authClient.auth.getUser(token)`. Valid → fetch profile, `200 { user: { id, tier } }` (unchanged from pre-045 behavior).
3. If the access token is absent/invalid/expired (including the "access token missing but refresh token present" case from step 1) → **silently attempt a refresh**: call `attemptRefresh(sb_refresh_token)`.
   - Success → set new cookies (same as `POST /api/auth/refresh`), re-fetch the profile with the refreshed user id, return `200 { user: { id, tier } }`. The caller cannot distinguish this from "was already signed in" — no new response fields.
   - Failure (refresh token itself invalid/expired/revoked/absent) → clear both cookies, `401 { error: 'Token invalid' }`.

Response shape is unchanged either way: `{ user: { id, tier } }` on success, `{ error }` on 401/503. No client changes were required to consume the improved behavior.

**FR-007 (in-flight sign-in guard)**: no interaction with the OAuth hash-callback branch — that branch returns early after `POST /api/auth/callback` succeeds, before `GET /api/auth/session` is ever called. The two paths are mutually exclusive by control flow.

## Stripe Webhook Endpoint: `POST /api/stripe/webhook` (spec 045, FR-025)

Registered by `registerStripeRoutes` (`server/stripeRoutes.js`) — see server-conventions.md "PaymentProcessor Seam" for the module layout. Mounted behind a route-scoped `express.raw({ type: 'application/json' })` parser registered **before** the global `express.json()` (required for Stripe signature verification — see server-conventions.md).

**Request**: raw Stripe event body + `stripe-signature` header. No auth (Stripe-signed, not user-authenticated).

**Response**: `200 { received: true, handled: boolean, eventType: string }` on any recognized/processed event, including duplicates (`eventType: 'duplicate'`, `handled: false`) and passthrough event types the processor doesn't act on (`handled: false`). `400 { error }` if signature verification fails.

**Tier-mirror contract (FR-025)** — `users.tier` is written as a **live derivation of the Stripe subscription's current status**, not set once at purchase:

| Event | Status | Write |
|---|---|---|
| `checkout.session.completed` | — | `tier: 'paid'`, `stripe_customer_id` set, `tracks` insert (`upgrade_completed`) |
| `customer.subscription.updated` | `active` / `trialing` | `tier: 'paid'` |
| `customer.subscription.updated` | `past_due` | no write (retry window; does not downgrade) |
| `customer.subscription.updated` | `canceled` / `unpaid` | `tier: 'free'` |
| `customer.subscription.deleted` | — | `tier: 'free'` (unconditional, terminal) |

**Idempotency**: every event is first inserted into `stripe_events` (`stripe_event_id` UNIQUE); a `23505` conflict short-circuits before any tier write or `tracks` insert, returning `{ handled: false, eventType: 'duplicate' }`. Webhook redelivery of the same event is therefore safe to re-send with no double side effects.

## Access Guards

- **`requirePaid`**: Middleware for paid-tier coach endpoints. Returns 403 if `req.user?.tier !== 'paid'`. Currently used by `GET /api/coach/weakness-map` only. Queue and resolve endpoints use inline `requireAuth` (401) instead.
- **`userCanAccessCategory(user, categoryId)`**: Helper used in puzzle routes. Returns false for paid categories unless `user?.tier === 'paid'`.
- **`requireLocalhost`**: Middleware for curation/generation admin endpoints. Checks `req.ip` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`. Returns 403 for all other IPs.
- **`requireAdmin`**: Middleware for admin endpoints that need remote access (lessons, eval-set, etc.). In non-production allows all requests; in production checks `req.user.email` against the `ADMIN_EMAILS` env var. Use this instead of `requireLocalhost` when the endpoint must be reachable from the hosted admin UI.

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

## Coach Endpoints: weakness-map, queue, category-counts, resolve

`GET /api/coach/weakness-map` still requires `requirePaid` (403 if `req.user?.tier !== 'paid'`). Queue, category-counts, and resolve endpoints all use inline `requireAuth` (401 if `req.user` is null) instead of `requirePaid`, making them available to all authenticated users.

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
- `limit`: optional integer, default 50, max 200. 400 `{ "error": "invalid limit" }` if non-numeric, non-integer, `< 1`, or `> 200`.
- `offset`: optional integer, default 0. 400 `{ "error": "invalid offset" }` if non-numeric, non-integer, or `< 0`.

**Response**: `{ "blunders": [...], "total": number }`
- `blunders`: up to `limit` rows for the current filter set, starting at `offset`, in the ordering below.
- `total`: the **true count** of all rows matching the current filters (computed via a DB-side `count()` query with the same filter chain, minus `.order()`/`.range()`) — independent of `limit`/`offset`. This is a corrected behavior: prior to spec 041, `total` was `enriched.length` (silently `min(true_total, limit)`); it is now the actual total.

**Pagination contract (spec 041, FR-001–FR-003a)**: The 50-row response is a **page**, not the full result set. Any caller (UI screen or internal consumer) that needs *all* of a user's matching blunders — not just one page — **MUST** page to completion: loop with `offset += limit` until either the page returned fewer than `limit` rows, or accumulated rows equal `total` (the dual guard; checking `accumulated === total` alone can spin forever if a row is deleted mid-session and `total` becomes unreachable). See `server/coachQueuePagination.js` (`parseQueuePaginationParams`) and `src/lib/coachQueuePagination.js` (`shouldContinuePaging`) for the extracted pure functions implementing this contract; `MistakesListScreen.jsx` and `ReviewScreen.jsx` are current examples of consumers paging to completion. A response with `blunders.length < limit` is not itself evidence that no more rows exist unless it also satisfies the dual guard above.

Each blunder object:
```json
{
  "id": "uuid",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "quality": "blunder" | "suboptimal",
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
- One page is at most `limit` rows (default 50, max 200), ordered by `severity DESC, created_at ASC, id ASC` (worst mistakes first; ties broken by oldest-first, then by `id` as a final deterministic tiebreaker) and preserved identically across pages within one paging session (no re-sorting/re-windowing between pages). The `id` tiebreaker is load-bearing: without it, rows sharing an identical `(severity, created_at)` — e.g. a batch import inserting many blunders in one statement, all stamped with the same `created_at` — can be returned in different relative order across separate `OFFSET`/`LIMIT` queries, causing pagination to skip some rows and duplicate others (found via QA with 137 seeded blunders: 8 became unreachable).
- Auth: inline `requireAuth` (401).
- Errors: 400 `{ "error": "invalid category" }` when `?category=` is not a valid blunder tag; 400 `{ "error": "invalid game_id" }` when `?game_id=` is not a valid UUID.

### `GET /api/coach/category-counts`

Returns the true per-category blunder count for the authenticated user (spec 041, User Story 2 /
FR-004–006, FR-009) — a DB-side grouped `count()` over `blunders.pattern_category`, independent of
any single page of `/api/coach/queue`. Drives the mistakes-overview cards in
`CategoryListScreen.jsx` so no category (e.g. `undercut`, `forced_win`) silently vanishes for
users with more blunders than a queue page.

**Request**: no query params. Always scoped to `user_id = req.user.id`.

**Response**: `{ "categories": [{ "category": "undercut", "count": 8 }, ...] }`
- One entry per `pattern_category` with `count ≥ 1` for this user. Categories with zero blunders
  are omitted.
- `count` is a true DB-side count (`supabase.from('blunders').select('pattern_category,
  count()').eq('user_id', req.user.id)`), scale-correct beyond 1,000 rows since it never
  materializes individual rows into Node.
- Filter set is `eq('user_id', ...)` only — same as `/api/coach/queue` — no `quality` filter
  (`blunder`- and `suboptimal`-quality rows both counted).
- Sorted by `CATEGORY_ORDER` (`server/categories.js`) for a stable card layout; unrecognized
  categories sort last, alphabetically.

**Auth**: inline `requireAuth` (401 `{ "error": "unauthorized" }` if `req.user` is null) — same
pattern as `/api/coach/queue`, not `requirePaid`.

**Errors**: `401 { "error": "unauthorized" }`; `503 { "error": "database unavailable" }` (no
`supabase` client); `500 { "error": "<message>" }` (DB error).

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

## Scores Endpoint

`POST /api/scores` (**not** GET) — `server/index.js`.
- **Request body**: `{ moves: string }` (the movestring so far, 0-indexed).
- **Response**: `{ scores: number[7] }` — per-column solver scores from the current player's perspective. Invalid/full columns are masked with the sentinel `INVALID_MOVE = -1000` (exported from `src/lib/aiDifficulty.js`).
- **Filtering rule**: always filter `score > INVALID_MOVE` (strictly greater) before ranking columns — never treat a masked column as a candidate. Callers: the deliberate-mistake mechanic (`secondBestColumn`) and the Hint overlay. Score semantics: see `reference_c4solver_scores` memory.
- **Do NOT revive depth-limited difficulty**: depth-limited negamax (`-d N`) produces all-zero early-game scores and was abandoned in favor of softmax over full solver scores (`src/lib/aiDifficulty.js`). Tech debt: the endpoint still accepts an optional `depth` body field and `queryDepth` infrastructure remains — both unused.

## Migrate Endpoint (POST /api/user/migrate)

Three invariants: (1) the DB helpers return `{ error }` rather than throwing — the handler must check `results.find(r => r?.error)`; (2) `on_auth_user_created` gives new users `device_uuid = null` — the endpoint must generate one server-side **before** writing `puzzle_attempts`; (3) the bulk insert falls back to row-by-row on FK violations, skipping error codes `23503`/`23505`.

**`onboarding_status` carry-over (Epic 8 — Onboarding Experience, spec 048, T021, FR-012)**: the request body accepts an optional sixth key, `onboarding_status`, alongside `puzzle_attempts`/`session_stats`/`lesson_progress`/`sparring_record`/`streak`. Handling:
- Validated via the single shared `isValidOnboardingStatus()` (`server/userHelpers.js`) — no inline enum re-check.
- Applied with a **conditional** update, never a blind overwrite:
  `supabase.from('users').update({ onboarding_status }).eq('id', req.user.id).eq('onboarding_status', 'not_encountered')`
  — this is a `WHERE id = $1 AND onboarding_status = 'not_encountered'` write, so an account that already has a real prior `seen`/`skipped` status (e.g. from a different device's earlier migration) is never clobbered by a fresh device's migrating value.
- Absent or invalid `onboarding_status` is a **silent no-op** — it does not add an entry to `operations` and MUST NOT fail the rest of the migration (the other five data categories migrate independently of this one optional field, matching the endpoint's existing per-category tolerance).
- Client side: `IndexedDBStore.migrateToSupabase` (`connect-four/src/store/IndexedDBStore.js`) reads a fresh `getProfile()` and includes `profile?.onboarding_status` in the POST body as one more key — the `profile` object store is not cleared by this method (only the other 5 stores are).

## Move Evaluation Endpoint

`POST /api/evaluate-move` — scores a move and returns i18n keys for the Coach dialog and Tier-1 strip. Supports two paths: **user-move** (default, for puzzle attempts and sparring user clicks) and **AI-move** (for sparring AI move commentary).

### User-Move Path (default, `aiMove` absent or false)

**Request body**: `{ movestring: string, col: number, category?: string, aiMove?: false }`
- `movestring`: position **before** the move (0-indexed, 0–42 chars).
- `col`: 0-indexed column played.
- `category`: optional override for the phrase pool key (e.g. `"forced_block"`). When omitted, the classifier derives the pattern tag from the position via `classify()` (synchronous, pre-move board).
- `aiMove`: absent or `false`.

**`correctCol` / `highlightMetadata` (spec 049, Epic 9)**: optional request fields, sent by the
client when `category` is one of `SINGLE_ANSWER_CATEGORIES` (`z_threat`, `overcut`, `claimeven`,
`undercut`, `figure_7`, `j_shape`) — `{ correctCol: number | null, highlightMetadata: object |
null }`. These are camelCase wire names matching what `evaluatePredicate`/`buildPredicatePuzzle`
read (`puzzle.correctCol`, `puzzle.highlightMetadata`). **The client is responsible for remapping
from its locally-held snake_case puzzle object** before sending: `correctCol:
current.correct_col`, `highlightMetadata: current.highlight_metadata` — this is a top-level rename
only, the inner `highlight_metadata` JSON shape (`.column`, `.cells[].role`) is unchanged. Ignored
(harmless if sent) for every other category. Absence of these fields for a single-answer category
is **not** a 400 — it flows through to `evaluatePredicate`'s existing fail-closed `{ result:
'wrong' }` path, so a missed client-side remap silently yields `accepted: false` rather than an
error; this is why `tests/integration/singleAnswerCategoriesAccepted.test.js` asserts a positive
`accepted: true` case per category, not only negatives. See
`specs/049-puzzle-scoring-spanish-localization/contracts/api-evaluate-move.md` for the full
contract delta.

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
  "patternTag": "<category slug>" | null,
  "accepted": true | false | null
}
```
- `badge` and `quality` are derived from the solver score for `col` relative to the best available score.
- `coachPhraseKey` and `summaryLineKey` are randomly selected from the matching i18n pool; `null` if no pool exists for the pattern.
- `patternTag` is the classifier's category slug for the position; `null` if the position doesn't match any known pattern.
- `accepted` (spec 044 US3 FR-015a, widened by spec 049 Epic 9 FR-001–FR-012): additive field, computed via `evaluatePredicate`, present (non-null) for **nine categories total**: the three multi-solution categories (`immediate_threat`, `forced_block`, `double_threat` — correctness allows more than one valid answer column) plus the six single-answer categories via `SINGLE_ANSWER_CATEGORIES` (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape` — correctness has exactly one taught answer column, or in `undercut`'s case, one taught avoid-column). `true` when the played column independently satisfies the category's condition (`evaluatePredicate` result `'correct'` or `'tied'`), `false` otherwise, `null` for every other category (`forced_win`, `forbidden_columns`, `odd_even_threat`). One shared gate expression covers both sets (`server/categories.js`'s `SINGLE_ANSWER_CATEGORIES` is a separate, explicit list — never derived as "not multi-solution"). Recomputed at solve time; not persisted. For the six single-answer categories, computed from the request's `correctCol`/`highlightMetadata` fields (see above) via the shared `buildPredicatePuzzle` helper. See server-conventions.md's "Multi-solution acceptance" note.
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

**Casing mismatch with `/draw`**: `GET /api/puzzles/draw` returns **raw DB rows in snake_case** (`move_string`, `correct_col`, `interaction_mode`, `highlight_metadata`, `user_player`, …) — it does NOT camelCase-transform, while `GET /api/puzzles/:id` returns camelCase (`moveString`, `goalPrompt`, …). Any component that passes a `/draw` row to a sub-component expecting camelCase needs a callsite adapter; read the consumer's field accesses first to catch every field.

## Sequence-Mode Puzzle Endpoint

`POST /api/puzzles/:id/sequence/move` handles per-move validation for `interaction_mode = 'sequence'` puzzles.
Accepts `{ position, col }` where `position` is the current move string (before the learner's move) and `col` is 0-indexed.
Returns `{ outcome: 'success' | 'fail' | 'continue', aiCol?, reason? }`.
All validation is bitboard-only — no solver calls.
`POST /api/puzzles/:id/check` returns 400 for sequence-mode puzzles; callers must use the `/sequence/move` endpoint instead.

## Game Analysis Endpoints

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
- Auth: Optional (`loadUser` runs; `req.user` may be null). For authenticated users, non-optimal plies that pass the **storage rule** (`server/mistakeStorageRule.js` — see Data Model) are inserted into the `blunders` table with the rule's graded `quality`. Not every `suboptimal`/`blunder`-badged ply is persisted: slower wins and dead-position faster losses are skipped, so `moves[].quality` (from `scoreMove`, drives badges/counters) can differ from whether a `blunders` row exists. Anonymous users get no persistence.
- **Ownership**: a game whose row has a non-null `user_id` is private to that user — a non-owner (including a different signed-in user) gets `404`, because this endpoint also *writes* blunder rows under the caller's `user_id` and a foreign `gameId` would corrupt the real owner's sibling data. Anonymous, device-scoped games (`user_id` null) stay open (no account to scope to, request body carries only `gameId`); do **not** authorize them by comparing `device_uuid` to `req.user.id` (different id namespaces — never matches). Papergames games always have a `user_id`, so ownership is always enforced for them.

**Errors**: 400 (missing `gameId`), 404 (game not found **or not owned**), 500 (solver error), 503 (Supabase not configured).

**Cache path (authenticated users with existing blunders)**: If the `blunders` table already contains rows for this user + game, the endpoint reconstructs the response from stored data instead of re-running the solver. One SELECT replaces all solver + tagBlunder + blunderSeverity calls. The cached `moves` array has `score`, `bestScore`, `bestCol` set to `null` (the ReviewScreen does not use these fields; MistakeDetailScreen reads them from the coach queue, not from here).

**Technical debt**: In the cached path, `scored` counts all user plies rather than only non-forced ones (legalCount > 1). Forced moves (only 1 legal column open) are excluded from `scored` in the live path to avoid inflating accuracy. In practice forced moves are extremely rare in real games (occur only on a near-full board), so the accuracy deviation is negligible. Fixing this properly would require storing `legalCount` per ply in the `blunders` table or a separate `game_analysis_cache` table.

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
- `quality` is derived server-side by the storage rule, not sent by the client.
- Auth: **Required** (401 if `req.user` is null).

**Storage rule**: the same `classifyStoredMistake` gate as `/api/games/analyze` (`server/mistakeStorageRule.js`) runs here. A move that is not a stored mistake (slower win, or a dead-position faster loss) is **not** inserted — the endpoint returns `200 { "stored": false, "reason": "not_a_stored_mistake" }` instead of `201`.

**Response** (`201 Created`): `{ "id": "<uuid>" }` — the inserted blunder's primary key. **Or** (`200 OK`) `{ "stored": false, ... }` when the storage rule declined the move, or `{ "deduplicated": true }` on a unique-index conflict.

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
  "papergames_game_id": "<uuid>" | null,
  "moveIndex": 8,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "patternCells": [{ "col": 0, "row": 3 }],
  "quality": "blunder" | "suboptimal",
  "is_owner": true,
  "totalMoves": 41,
  "siblingMistakes": [
    { "id": "<uuid>", "moveIndex": 16, "quality": "suboptimal", "resolved_at": null },
    { "id": "<uuid>", "moveIndex": 18, "quality": "blunder", "resolved_at": null }
  ]
}
```

- `is_owner`: `true` when the authenticated user owns the blunder; `false` when a different user or an anonymous visitor fetches it. Computed server-side as `req.user?.id === row.user_id`.
- `quality`: `'blunder'` for severe mistakes (sign-crossing score drop), `'suboptimal'` for same-sign but non-optimal moves. Legacy rows default to `'blunder'`.
- `user_id` is **never** exposed in the response.
- Response shape is field-for-field identical to coach queue items, plus the `is_owner` boolean.
- Threat cells are computed server-side via `computeThreatCells(board_state, move_played)`.
- `papergames_game_id`: mutually exclusive with `game_id` — exactly one of the two is non-null for any real row. Always included in the `.select()` (spec 042 — previously omitted).
- `totalMoves`: the parent game's total ply count (`moves.length` on the `games` or `papergames_games` row matching whichever of `game_id`/`papergames_game_id` is set). `null` only if neither FK is set on the blunder row.
- `siblingMistakes`: every `blunders` row sharing the same parent game (matched on whichever of `game_id`/`papergames_game_id` is set on the requested row), ordered by `move_index` ascending, **including the row being requested**. Each entry carries only `id`, `moveIndex`, `quality`, `resolved_at` — no `board_state`/`move_played`/`correct_move`, so stepping to a sibling issues its own lazy `GET /api/blunders/:id`. No `user_id` filter is applied — consistent with the endpoint's public-permalink contract (a visitor sees the same sibling set the owner would). Rows are **de-duplicated by `move_index`** (keeping the currently-viewed `id` if it is itself a duplicate) so "X of Y" stays correct even against pre-existing duplicate AI-sparring rows — see `db-schema.md` `idx_blunders_game_unique` (migration 054).
- `patternCells`: `[{ col, row }]`, 0-indexed, pattern-agnostic. Computed by looking up `pattern_category` in the tag→detector map (`PATTERN_TAG_TO_DETECTOR`, `server/blunderDetailResponse.js`; source map originates at `classifier.js:1536`) and, if mapped, running that pattern's detector against the board state/perspective that tag requires, converting the detector's 1-indexed `"cXrY"` cell strings to `{col, row}` via `parseCxRy`. Empty array when `pattern_category` has no detector mapping, the detector doesn't match, or the detector legitimately returns no cells (e.g. score-consuming/solver-based detectors). This is a *different* computation from `threat_cells` (which uses `move_played`, not `correct_move`) — see `specs/042-mistake-review-unification/contracts/api-blunders-id.md` for the full per-tag derivation table and the `double_threat`/`immediate_threat` traps. Feeds the same client highlight channel as `threat_cells`.
- Shape composition (all four new fields) lives in `server/blunderDetailResponse.js` (`buildBlunderDetailResponse`, `fetchBlunderDetailContext`, `computePatternCells`, `parseCxRy`).
- **List/enriched-map parity**: the list-variant endpoint (`GET /api/blunders`, builder in `server/index.js` around the `res.json({ blunders: enriched, ... })` call) independently constructs its own blunder shape and does **not** delegate to this handler — it carries the same `totalMoves`, `siblingMistakes`, and `patternCells` per row, computed the same way, so in-app navigation and cold-boot permalinks never diverge.

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

## Admin Deep-Reveal Eval Viewer Endpoints

Back the `admin/deep-reveal-eval` page (`src/pages/AdminDeepRevealEvalPage.jsx`). All read JSONL/JSON files from `server/scripts/`. Filenames are validated by `isValidEvalFilename` / `isValidEvalSetFilename` (`server/evalResultsHelpers.js`) to block path traversal. All guarded by `requireLocalhost + requireAdmin`.

- `GET /api/admin/eval-sets` → `{ files }` — eval-set JSON filenames (`eval_set_*.json`).
- `GET /api/admin/eval-set/:name` → the eval-set entries array.
- `GET /api/admin/eval-results` → `{ files }` — result JSONL filenames (`eval_set_*_results_*.jsonl`, incl. `.enriched.jsonl`).
- `GET /api/admin/eval-results/:filename` → `{ rows }` — each row `{ id, board_state, final_response, prompt, prompt_data, feature_vector, filtered_prompt_data, attempt1_failures, attempt2_failures }`. Row fields are an explicit allow-list built in `index.js` (`GET /api/admin/eval-results/:filename` handler) — a new field added to the eval JSONL is silently dropped from the API response unless it is also added to that field map.

### `POST /api/admin/eval-feedback`

Appends one human flag for an eval entry to a per-run sidecar JSONL file. Mirrors the in-app flag UX (`DeepRevealPane`), but writes to a file instead of the `llm_feedback` table.

**Request body**: `{ filename, id, human_note }`
- `filename`: a valid eval-results filename (validated by `isValidEvalFilename`). The sidecar name is derived by `feedbackFilenameFor` — inserting `feedback_` after the `_results_` segment (`..._results_<ts>.jsonl` → `..._results_feedback_<ts>.jsonl`).
- `id`: the eval entry id (required; join key).
- `human_note`: optional free-text reviewer note.

**Response**: `201 { ok: true, feedback_file }`. Appended record shape: `{ id, human_note, flagged_at }`. The `judge-deep-reveals` skill left-joins this sidecar onto the results by `id`.

**Errors**: `400 { "error": "invalid filename" }` / `{ "error": "id is required" }`; `500` on write failure.

## Admin Blunder-Reason Browser Endpoints

Back the `admin/fv-suff` page (`src/pages/AdminFvSuffPage.jsx`), a desktop, localhost+admin tool with **two modes** (route still named `fv-suff` for historical reasons; see memory `project_admin_fv_suff_repurposed`). Both read JSONL from `server/scripts/`. Guarded by `requireLocalhost + requireAdmin`. Responses are **not field-whitelisted** — records are returned whole.

**Evidence mode** — browses **blunder-reason evidence** (the `computeReason` output precomputed by `server/scripts/compute.mjs`). Evidence rows have shape `{id, evidence, groundTruth}`.

- `GET /api/admin/reason/files` → `{ files }` — evidence-file names matching `reason_evidence_*.jsonl`, sorted.
- `GET /api/admin/reason?file=<name>` → `{ rows }` — the full parsed evidence file (default `reason_evidence_all.jsonl`). `file` is validated against `/^reason_evidence_[\w.-]*\.jsonl$/`; a missing file is a 404.

**Eval-answers mode** — joins, by `id`, the LLM **answers** and the **grades** (the eval set is derived from the answers file itself via `deriveSetFromAnswers`), so each board+vector shows its LLM answer + A1–A4 grade:

- `GET /api/admin/fv-suff/files` → `{ answers }` — `answers` = `fv_suff_answers_*.jsonl` (excluding `*_grades.jsonl` sidecars).
- `GET /api/admin/fv-suff?answers=<name>` → `{ set, answers, grades }`. `set` is DERIVED from the answers file via `deriveSetFromAnswers` (no separate eval-set file or `set` query param); `answers` (default `fv_suff_answers_all.jsonl`, validated `isFvSuffAnswersFile`) = `compute.mjs --llm` rows, each embedding its `feature_vector`; `grades` = the `gradesFilenameFor(answers)` sidecar (`<stem>_grades.jsonl` from `grade-fv-sufficiency`), `[]` if absent. Missing answers file is a 404; missing grades are non-fatal (empty). Validators live in `evalResultsHelpers.js` (unit-tested).

## Lesson Audio Generation & Pruning Endpoints (spec 046 US3/US4)

Additive routes under the existing `/api/admin/lessons/*` family. Both guarded by `requireLocalhost,
requireAdmin` (same double-gate pattern as spec 039's `/api/admin/audio/generate*`). Full contract:
`specs/046-lessons-progression-audio-polish/contracts/lesson-audio-generation.md`.

### `POST /api/admin/lessons/:id/generate-audio`

**Path param**: `id` — lesson id; `404 { error: 'not_found' }` if it doesn't exist.

**Request body**: none — the server loads the lesson from disk (`getLesson(id)`), not from the client,
so a stale client-held copy can't overwrite a concurrent edit.

**Behavior**: for every concept-slide `coachMessages[]` entry with non-empty `text` whose current
`audio` doesn't already match `hashMessageText(text) + '.mp3'`, calls `synthesize(text)`
(`server/ttsProvider.js`), writes `public/audio/lessons/<hash>.mp3`, and sets
`coachMessages[i].audio = '/audio/lessons/<hash>.mp3'`. Per-message failures are caught individually
(that message's `audio` is left unchanged) — one bad synth does not abort the batch. Persists via
`saveLessonFile` + `reloadLessons()`.

**Response** (`200 OK`): `{ lesson, generated: [<locator>, ...], failed: [{ locator, error }, ...] }` —
`generated` lists messages that got a *new* file this run (already-current messages are skipped
silently); `failed` lists messages whose synthesis failed this run.

**Errors**: `403` (non-localhost or non-admin), `404` (lesson not found), `500` (unexpected write error
— per-message TTS errors are non-fatal, see above).

### `POST /api/admin/lessons/prune-audio`

**Request body**: none.

**Behavior**: scans `public/audio/lessons/*.mp3`, computes the set of `audio` paths referenced across
all lessons (`getLessonsAll()`), deletes any file not referenced.

**Response** (`200 OK`): `{ deleted: [<filename>, ...] }` — empty array if nothing was orphaned.

**Errors**: `403` (guard), `500` (filesystem error).

## `requireLocalhost` Closure Across `/api/admin/*` (FR-028)

**MUST**: every `/api/admin/*` route — all 39, as of spec 046 — carries `requireLocalhost` in addition
to any existing `requireAdmin`, registered in that exact order: `app.<verb>('/api/admin/...',
requireLocalhost, requireAdmin, handler)`. Grep-verifiable: `grep -n "app\.\(get\|post\|put\|delete\)('/api/admin" server/index.js` must show `requireLocalhost` in every match's handler-argument list.
Previously some admin routes (lessons, puzzles) relied on `requireAdmin` alone, which is a no-op outside
`NODE_ENV=production` (memory `project_admin_localhost_directive`) — this closure makes the localhost
restriction unconditional and independent of `NODE_ENV`. New `/api/admin/*` routes MUST follow the same
two-middleware order.

## Papergames Import Endpoints (spec 038)

### `GET /api/user/profile`

Returns an explicit, projected view of the authenticated user's profile — never `req.user` verbatim.

**Response** (`200 OK`):
```json
{
  "device_uuid": "<string>" | null,
  "tier": "free" | "paid",
  "deep_reveal_count": 3,
  "deep_reveal_reset_at": "2026-06-16T00:00:00.000Z",
  "papergames_id": "<string>" | null,
  "last_import_at": "2026-05-01T12:00:00Z" | null,
  "onboarding_status": "not_encountered" | "seen" | "skipped"
}
```
- `onboarding_status` (Epic 8 — Onboarding Experience, spec 048): sourced from `req.user.onboarding_status`, itself populated by `USER_PROFILE_SELECT_COLUMNS` (`server/userHelpers.js`) — see that file's doc comment and `data-model.md`'s `onboarding_status` section for the three-state model.

**Auth**: Required (inline `requireUser` -> 401). No DB call — `200` even when Supabase is not configured (all fields come from `req.user`, already populated by `loadUser`).

### `PUT /api/user/profile`

Saves the user's Papergames account ID and/or onboarding status. Both fields are optional but **at
least one must be present**; either or both may be sent in a single call.

**Request body**: `{ papergames_id?: "<string>", onboarding_status?: "not_encountered" | "seen" | "skipped" }`
- `papergames_id`: non-empty string, max 64 characters, when present.
- `onboarding_status` (Epic 8 — Onboarding Experience, spec 048): one of the fixed 3-value enum, when present. Validated via the single shared `isValidOnboardingStatus()` (`server/userHelpers.js`) — the ONE place this enum is checked; no other call site (including `POST /api/user/migrate`) may duplicate the check inline.

**Response**: `204 No Content` on success.

**Errors**:
- 400 `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` when `papergames_id` is present but invalid.
- 400 `{ "error": "invalid onboarding_status" }` when `onboarding_status` is present but not one of the three enum values.
- 400 `{ "error": "no valid fields provided" }` when neither field is present in the request body.
- 401 for unauthenticated; 503 if Supabase not configured; 500 `{ "error": "Failed to update profile" }` on DB error.

**Auth**: Required (inline `requireUser` -> 401).

**Client store interface**: both `IndexedDBStore` and `SupabaseStore` (`connect-four/src/store/`) expose `async updateProfile(patch)` as the storage-agnostic entry point to this endpoint (`SupabaseStore`'s implementation `PUT`s `patch` straight through) — see `data-model.md`'s `onboarding_status` section. Callers never special-case which backend is active: `await store.updateProfile({ onboarding_status: 'seen' })`.

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
  "blunderErrors": 0,
  "capReached": false
}
```
- `imported`: count of rooms that were successfully fetched, parsed, analyzed, and upserted into `papergames_games` (spec 041 US5/FR-014).
- `skipped`: count of rooms **abandoned mid-processing** due to a transient failure -- `fetchReplay` HTTP error, move-parsing error, an empty move string, a solver (`extractBlunders`) error, or an `upsertGame` write error (`server/papergamesImporter.js` ~:305-350). **This is not a duplicate-detection counter**: `importForUser` has no "already imported this room" check -- a room already owned by the user is simply re-processed and re-upserted (idempotent update via the `(user_id, papergames_room_uid)` unique constraint) and counts toward `imported`, not `skipped`. In practice, a same-user re-import shortly after a prior import is more likely to import 0 new rooms than to report `skipped > 0`, because the endpoint's incremental `lastImportAt` stop (see `POST /api/user/papergames/import` processing order) skips re-fetching rooms older than the last import entirely, before `importForUser` ever sees them.
- `blunderErrors`: count of individual blunder-row inserts that failed for a genuine (non-duplicate) reason -- `insertGameBlunder` returning `false`. A `23505` (unique-violation) on the per-user blunder index is treated as an idempotent no-op success and is **not** counted here (`server/insertGameBlunder.js`).
- `capReached`: `true` when the import was short-circuited because the user had already reached the 15-game free-tier limit.
- `error`: present only when `status === "error"` -- contains the error message string.

> **Known contract/implementation gap (spec 041 US5, flagged 2026-07-07)**: `contracts/papergames-ownership-migration.md` § US1.5 describes `skipped` as meaning "already-imported room for this user (genuine same-user duplicate)". The current `importForUser` implementation does not match that description -- it has no duplicate-room detection at all; `skipped` is purely a processing-failure counter, as documented above. Frontend copy (`SettingsScreen.jsx`) was written to describe the field's *actual* behavior (processing failures) rather than the contract's aspirational "duplicate" framing, to avoid presenting users with a fabricated explanation. A follow-up epic is needed if true duplicate-vs-error reporting is required by product.

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
