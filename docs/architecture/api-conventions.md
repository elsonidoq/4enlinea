# API Conventions

## Route Naming

**MUST**: Public puzzle/game routes use `/api/<resource>` (e.g., `/api/puzzles`, `/api/scores`).
**MUST**: Curation and admin routes use `/api/admin/<resource>` (e.g., `/api/admin/candidates`).
**MUST**: Paddle payment routes use `/api/paddle/<action>` (e.g., `/api/paddle/create-checkout`).
**MUST**: Coach routes use `/api/coach/<resource>` (e.g., `/api/coach/weakness-map`).
**MUST**: Authenticated user-data routes use `/api/user/<resource>` (e.g., `/api/user/profile`, `/api/user/streak`). Established in spec 030; full endpoint contracts at `specs/030-server-mediated-data-access/contracts/api-user-endpoints.md`.

**Stable core routes — keep the contract stable, don't rename/remove.** `GET /api/ping` (health check, `server/index.js`), `POST /api/scores`, and `POST /api/explain` are long-lived primitives depended on across the app (sparring calls `/api/scores?difficulty`, the column-score overlay calls `/api/explain`, uptime checks hit `/api/ping`). Extend them additively if needed, but do not change their paths, methods, or existing response shapes.

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

**`req.user` shape** (once signed in): `{ id, email, tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, paddle_customer_id, onboarding_status }`. Every field except `id` and `email` comes from `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` (`server/userHelpers.js`). `email` is `data.user.email` — the raw Supabase auth user object already returned by `authClient.auth.getUser(token)` (spec 054 FR-006) — **not** a `public.users` column; no schema change was needed to add it. `req.user` is `null` for anonymous/invalid-token requests, unchanged. **Degrades-to-`undefined` case**: if the Supabase auth record itself has no email set, `data.user.email` is `undefined`, so `req.user.email` is `undefined` and silently absent from any JSON response that spreads it in (e.g. it simply would not appear in the body) — this must degrade gracefully, not error.

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

## Public Config/Limits: `GET /api/limits` (spec 053 US4)

Registered directly in `server/index.js`, near the other public resource routes (not inside
`registerPaddleRoutes`/`paddleRoutes.js`). **Public / unauthenticated, always `200`** — not gated behind
`PADDLE_API_KEY` the way `GET /api/paddle/config` (below) is, and deliberately not folded into that
endpoint's response: this value has nothing to do with Paddle configuration and must stay available even
when Paddle itself is unconfigured (`research.md` Decision 7,
`specs/053-entitlement-payments-consolidation/`).

**Response**: `200 { freeDeepRevealWeeklyLimit: number }`, sourced live from
`server/quotaLimits.js`'s `FREE_DEEP_REVEAL_WEEKLY_LIMIT` export (currently `20`) — never a duplicated
literal at the call site, so the route and the constant cannot drift apart.

**Client caller**: `src/screens/PricingScreen.jsx` (T040) — the only free-tier quota figure shown on the
redesigned `/pricing` page is sourced from this endpoint, never hand-typed (FR-020/SC-004). On fetch
failure, `PricingScreen` falls back to the generic non-numeric `pricing.quotaFallback` i18n phrase rather
than a hardcoded number — a distinct, independent degraded state from a `GET /api/paddle/config` failure
(see `GET /pricing` vs `/pricing-legal` in `server-conventions.md` and FR-022's "never conflate the two
failure modes").

## Paddle Checkout Config: `GET /api/paddle/config`

Registered by `registerPaddleRoutes` (`server/paddleRoutes.js`). **Public / unauthenticated** — the upgrade modal renders it before the user is necessarily signed in. Returns the live display prices read off the actual Paddle price objects (`paddleProcessor.getPrices()`, `paddleClient.prices.get(priceId)`), so the UI never drifts from what is charged.

**Response**: `200 { prices: { monthly: PriceInfo|null, annual: PriceInfo|null } }` where `PriceInfo = { amount: <minor units, e.g. 299 = $2.99>, currency: 'usd', interval: 'month'|'year'|null }`. Returns `503 { error: 'Payments not configured' }` when `paddlePaymentProcessor` is null (no `PADDLE_API_KEY`); the client degrades to plain plan labels with no price.

### Changing a price: create-and-archive, never edit

**Paddle price objects are immutable** — an amount cannot be edited in place. To change a price: create a **new** price on the same product, archive the old one, then update the corresponding env var (`PADDLE_MONTHLY_PRICE_ID` / `PADDLE_ANNUAL_PRICE_ID`, read in `index.js` and passed to `createPaddleProcessor` as `monthlyPriceId`/`annualPriceId`). Forgetting the env-var update leaves checkout silently billing the archived price. Current prices are $2.99/mo, $21.99/yr on product `DecodeC4 Pro` (see `paddle:catalog-setup` skill for provisioning).

**Quantity is fixed at 1 per subscription.** Both prices have `quantity: { minimum: 1, maximum: 1 }` set (via `client.prices.update`, not a Paddle.js checkout setting — the overlay checkout has no client-side option to hide/disable the quantity stepper for a variable-quantity price, per Paddle's own docs). Any future price recreated to change the amount must set the same `quantity` limits, or the checkout will show a nonsensical +/- stepper for what is a single-seat subscription.

**All development uses the Paddle SANDBOX environment.** Sandbox API keys contain `_sdbx`; sandbox client-side Paddle.js tokens are `test_`-prefixed. Taking real payments requires the account's live catalog to be provisioned separately (own live product/prices, non-`test_` client token) — none of it derivable from the sandbox — plus production domain review approval (see `staging_checks.md`'s Epic 10 section for what's still pending). Production is `quaddojo.com`; staging is `staging.decodec4.xyz`.

## Paddle Checkout: `POST /api/paddle/create-checkout` (returnPath)

**Auth required.** **Body**: `{ plan: 'monthly'|'annual', returnPath?: string }`. `returnPath` is the relative app path the user launched checkout from. **Open-redirect guard**: `returnPath` is accepted only if it matches `^/(?!/)` (same-origin relative path, via `sanitizeReturnPath` exported from `paddleProcessor.js`); anything else (absolute URL, `//host`, missing leading slash) falls back to `/`.

**Response `200`** (no server-built redirect URL, unlike a hosted-checkout model):
```json
{ "priceId": "pri_...", "customerEmail": "user@example.com", "successUrl": "/settings" }
```
There is no server-built hosted-checkout URL — the client opens the Paddle.js overlay itself via `Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customer: { email: customerEmail }, customData: { app_user_id } })`. **`successUrl` is returned in the response but deliberately NOT passed to `Paddle.Checkout.open()`** — passing it there makes Paddle.js navigate the *parent window* to that URL once checkout completes (documented Paddle behavior, confirmed live 2026-07-18: a real full-page reload, not an SPA transition), which both violates the "no full-page redirect" requirement and can race with the `verify-transaction` call in flight, silently losing the tier grant. Instead, `useUpgradeCheckout.js`'s `checkout.completed` handler calls `paddle.Checkout.close()` once `verify-transaction` resolves, so the app never leaves the current page. `successUrl` stays in the contract for the open-redirect guard it still enforces server-side, and in case a future consumer needs it.

**Response `503`**: `{ error: 'Payments not configured' }`. **Response `401`**: `{ error: 'Authentication required' }`.

## Paddle Activation Fallback: `POST /api/paddle/verify-transaction`

**Auth required.** **Body**: `{ transactionId: string }` — read off the Paddle.js `checkout.completed` event's `transaction_id` field client-side (`useUpgradeCheckout.js`'s event handler is the sole caller anywhere in the frontend). There is no return-URL round-trip to read a query param from — the Paddle.js overlay model never navigates away from the app.

This is the **synchronous activation fallback** — the webhook (below) remains the primary tier-mirror, but a webhook that is dropped, delayed, or (in local dev) never forwarded would otherwise strand a paying user on the "still activating" banner forever. `verifyTransaction` retrieves the transaction straight from Paddle (`paddle.transactions.get(transactionId)`); **if its `status` isn't yet `'completed'`, it waits ~1.2s and re-fetches once** before giving up — Paddle's own docs (`build/checkout/upsell-checkout`) note the transaction moves `paid` → `completed` asynchronously server-side just after the client-side `checkout.completed` event fires ("typically less than a second"), and calling `transactions.get()` with zero delay reproducibly saw a not-yet-`completed` transaction in testing (2026-07-18). This one bounded retry is not an open-ended poll — consistent with this fallback's single-check design — but covers Paddle's documented settle window. After that, it verifies `transaction.customData?.app_user_id === req.user.id` (security — the client's transaction id is never trusted to belong to the caller) and `transaction.status === 'completed'`, then applies the **same idempotent** `tier: 'paid'` + `paddle_customer_id` write the webhook applies — with no `tracks` insert (that analytics record is exclusively the webhook's to write).

**Response**: `200 { activated: boolean, reason?: string }` — `{ activated: true }` on success; `{ activated: false, reason }` with `reason ∈ { 'no_transaction', 'user_mismatch', 'not_completed' }` otherwise. `503` when Paddle is not configured. Idempotent with the webhook: both converge on `tier='paid'` for the same user, so whichever lands first wins and the other is a no-op write. See server-conventions.md "PaymentProcessor Seam".

## Paddle Webhook Endpoint: `POST /api/paddle/webhook` (spec 050, FR-006/FR-007/FR-008/FR-009)

Registered by `registerPaddleRoutes` (`server/paddleRoutes.js`) — see server-conventions.md "PaymentProcessor Seam" for the module layout. Mounted behind a route-scoped `express.raw({ type: 'application/json' })` parser registered **before** the global `express.json()` (required for Paddle signature verification — see server-conventions.md).

**Request**: raw Paddle event body + a **`Paddle-Signature`** header (not `stripe-signature`). No auth (Paddle-signed, not user-authenticated).

**Verification**: `paddle.webhooks.unmarshal(rawBody, PADDLE_NOTIFICATION_WEBHOOK_SECRET, signatureHeader)` inside a single try/catch. Any failure (signature mismatch, malformed event, or a downstream processing failure after successful unmarshal — DB write, tier write, `tracks` insert) returns one non-2xx status; per the `paddle:webhooks` skill, this deliberately does not try to distinguish signature failures from processing failures via different status codes — Paddle's retry behavior doesn't branch on it.

**Response**: `200 { received: true, handled: boolean, eventType: string }` on any recognized/processed event, including duplicates (`eventType: 'duplicate'`, `handled: false`) and passthrough event types the processor doesn't act on (`handled: false`). Non-2xx (no fixed status code) on any verification or processing failure.

**Tier-mirror contract** — `users.tier` is written as a **live derivation of the Paddle subscription's current status**, not set once at purchase:

| Paddle event | `status` (subscription events only) | Write |
|---|---|---|
| `transaction.completed` | — | `tier: 'paid'`, `paddle_customer_id` set, `tracks` insert (`upgrade_completed`) |
| `subscription.created` | — | **no-op, documented** — `payment_events` ledger insert only. First-payment tier grant belongs exclusively to `transaction.completed`; granting tier here would race with, or duplicate, that write. |
| `subscription.updated` | `active` / `trialing` (no scheduled cancel) | `tier: 'paid'` |
| `subscription.updated` | `past_due` | no write (Paddle's automatic retry window; does not downgrade) |
| `subscription.updated` | `paused` | `tier: 'free'` |
| `subscription.updated` | `active` **with** non-null `scheduled_change.action: 'cancel'` | no write (service continues until the effective date — not yet terminal) |
| `subscription.canceled` (or `subscription.updated` with `status: 'canceled'`) | — | `tier: 'free'` unconditionally (terminal) |

**Idempotency**: every event is first inserted into `payment_events` (`event_id` UNIQUE, `event_type`, `payload`) BEFORE any tier/tracks write; a `23505` conflict short-circuits before any tier write or `tracks` insert, returning `{ handled: false, eventType: 'duplicate' }`. Webhook redelivery of the same event is therefore safe to re-send with no double side effects. Unlike a log-and-proceed policy, a NON-`23505` ledger-insert failure or any downstream tier/`tracks` write failure THROWS — surfaced as non-2xx so Paddle retries, never a silent partial write.

## Paddle Customer Portal: `POST /api/paddle/portal`

**Auth required.** **Precondition**: `req.user.paddle_customer_id` must be set (else `400 { error: 'No active subscription' }`). **Body**: `{ returnPath?: string }` — passed through `sanitizeReturnPath()` for parity with `create-checkout`'s guard, but note Paddle's `customerPortalSessions.create` has no return-URL parameter at all, so the sanitized value is validated only and never forwarded to Paddle.

**Response `200`**: `{ portalUrl: string }` — a minted Paddle customer-portal session URL for `req.user.paddle_customer_id`, via `paddleClient.customerPortalSessions.create(paddleCustomerId, [])` → `session.urls.general.overview` (see `paddle:customer-portal` skill). **Response `503`** / **`401`**: same gates as the other Paddle routes above.

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

### `session_stats` write asymmetry — do NOT unify

`POST /api/user/session-stats` and `POST /api/user/challenge-session` both call the **same** `writeSessionStats(supabase, userId, date, …)` helper, but they pass **deliberately different** shapes as the final argument:

- `/api/user/session-stats` passes **`req.body.stats`** — the *inner* object. Its caller sends `{ date, stats: next }`; storing the whole body here would double-nest and silently break two consumers.
- `/api/user/challenge-session` passes **`req.body`** — the *entire* body. Its caller sends the session object directly.

Both are correct. **Never "harmonize" them, and never merge the two shapes with a `||` jsonb merge** — the shapes are incompatible and a merge produces a corrupt hybrid blob. Both endpoints write the same `(user_id, date)` row of `session_stats` (exactly 3 columns: `user_id uuid`, `date date`, `stats jsonb` — no flat stats columns), via a full-replace upsert: last writer wins.

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
- `/api/paddle/create-checkout`: 10 req/min
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

Returns the caller's blunders with server-computed threat cell locations. Authenticated callers are scoped by `user_id`. **Anonymous callers** (anon free deep reveal) are served their device-scoped blunders when a valid `device_uuid` UUID query param is present (scoped `device_uuid = <param> AND user_id IS NULL`); an anon request without a valid `device_uuid` gets `401`. Response shape is identical for both. Scoping decision: `server/anonBlunderAccess.js#resolveQueueOwner`.

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

**Auth**: authenticated OR anonymous. Anonymous is allowed (anon free deep reveal) and bounded only by the per-IP `5 req/min` limiter — it never touches `users.deep_reveal_count` (anon has no users row). Authenticated free-tier still decrements the weekly quota (429 when exceeded); paid unlimited. Quota decision: `server/anonBlunderAccess.js#resolveExplainQuota`. The client enforces the "one free anon reveal" separately in `localStorage` (`anon_deep_reveal_v1`); the server does not track anon usage.

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

**Auth**: authenticated OR anonymous (anon free deep reveal — the anon "aha" reveal gets a coach voice too). The endpoint is keyed purely by the position hash (`moveString:col`), reads no user data, and `404`s when no explanation is cached, so anon access exposes nothing; it never dereferences `req.user`. (Note: an empty `moveString` — the opening move — `400`s for all callers, a pre-existing validation quirk.)

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

**TTS config**: Uses the same voice, speed, model, and instructions as the existing admin TTS system, read via `readTtsConfig(lang)` (from `server/tts-prompt.<lang>.json` — one file per supported locale, since the prompt is written *in* the target language and describes a language-specific persona; every caller must pass its `lang`/`locale` or it silently reads the English config. It also carries a `model` field, default `'gpt-4o-mini-tts'` — the only OpenAI TTS model that honors the `instructions` field; `tts-1`/`tts-1-hd` ignore it and always speak with an American-English accent). Per-language instructions are built via `buildTtsInstructions(basePrompt, lang)` (`server/ttsInstructions.mjs`), which appends a Spanish-accent directive for `lang === 'es'` so Spanish text isn't read with an English accent. `ttsProvider.js`'s own default `model` was also flipped to `gpt-4o-mini-tts`, so callers that don't read `tts-prompt.<lang>.json` (notably **lesson audio** via `lessonAudio.js`) get the steerable model too; nothing relies on `tts-1` anymore (it remains selectable in the admin model dropdown). Note: all TTS audio is cached by a hash of the *text*, not the model/voice — changing the model/voice/prompt does NOT regenerate existing clips (see memory `project_tts_audio_cached_by_text`).

**Rate limit**: 120 req/min (default `/api/` bucket). No additional rate limiting.

## Scores Endpoint

`POST /api/scores` (**not** GET) — `server/index.js`.
- **Request body**: `{ moves: string, depth?: number, difficulty?: 'easy'|'medium'|'hard'|'perfect' }` (the movestring so far, 0-indexed).
- **Response**: `{ scores: number[7] }` — per-column solver scores from the current player's perspective. Invalid/full columns are masked with the sentinel `INVALID_MOVE = -1000` (exported from `src/lib/constants.js`).
- **Filtering rule**: always filter `score > INVALID_MOVE` (strictly greater) before ranking columns — never treat a masked column as a candidate. Score semantics: see `reference_c4solver` memory.
- **Sparring-move mode (`difficulty` present)**: the response is `{ scores, col }`, where `col` is the AI's chosen 0-indexed move computed **server-side** by `chooseSparringMove(board, difficulty, scores)` (`server/classifier.js`). An unknown `difficulty` value → 400. This is the single move-selection path for the sparring AI (`src/lib/useGameBoard.js` `makeAiMove` POSTs `{ moves, difficulty }` and plays `col`; on any error it falls back to a random legal column). The Hint overlay calls the same endpoint **without** `difficulty` and consumes `scores` only.
- **Move selection is NOT softmax anymore**: the old client-side softmax/temperature + `secondBestColumn` mechanic (`src/lib/aiDifficulty.js`) was **deleted**. `chooseSparringMove` = own-win-first → `SPARRING_MISTAKE_RATES[difficulty]` roll → optimal (argmax) on no-mistake, else block an opponent win-in-1 / sample uniformly from strictly-worse-and-non-forbidden columns.
- **Design consequence — difficulties differ only by mistake rate**: `SPARRING_MISTAKE_RATES` (`server/classifier.js`) is `{ easy: 1/2, medium: 1/4, hard: 1/8, perfect: 0 }`. Every "mistake" the roll produces is still a tactically sound, non-forbidden move (see roll logic above) — so even `easy` never falls for a one-move trap; `medium`/`hard`/`perfect` differ from `easy` only in how often the mistake roll fires, not in move quality. Deliberate design goal: never let the user win by just stacking discs.
- **Full-board terminal signal (spec 054, FR-008)**: with `difficulty` present and a board that has **no playable column**, the endpoint returns `400 { error: 'no legal move: board is full' }` rather than a response with `col` silently `undefined`. The guard runs **before** `solver.query()` on purpose — c4solver returns an empty line for a full board, which `c4solver-wrapper.js` turns into a generic `"Invalid position"` throw, so a check placed after the query would be unreachable and the endpoint would return a generic 500 instead. `chooseSparringMove` also throws `NoLegalMoveError` (`server/classifier.js`) for the same case, translated by the handler; the ordering is asserted by `tests/unit/scoresValidation.test.js`. Success-path shapes are unchanged.
- **Do NOT revive depth-limited difficulty**: depth-limited negamax (`-d N`) produces all-zero early-game scores and was abandoned. Tech debt: the endpoint still accepts an optional `depth` body field and `queryDepth` infrastructure remains — both unused.

## Migrate Endpoint (POST /api/user/migrate)

Three invariants: (1) the DB helpers return `{ error }` rather than throwing — the handler must check `results.find(r => r?.error)`; (2) `on_auth_user_created` gives new users `device_uuid = null` — the endpoint must generate one server-side **before** writing `puzzle_attempts`; (3) the bulk insert falls back to row-by-row on FK violations, skipping error codes `23503`/`23505`.

**`onboarding_status` carry-over (Epic 8 — Onboarding Experience, spec 048, T021, FR-012)**: the request body accepts an optional sixth key, `onboarding_status`, alongside `puzzle_attempts`/`session_stats`/`lesson_progress`/`sparring_record`/`streak`. Handling:
- Validated via the single shared `isValidOnboardingStatus()` (`server/userHelpers.js`) — no inline enum re-check.
- Applied with a **conditional** update, never a blind overwrite:
  `supabase.from('users').update({ onboarding_status }).eq('id', req.user.id).eq('onboarding_status', 'not_encountered')`
  — this is a `WHERE id = $1 AND onboarding_status = 'not_encountered'` write, so an account that already has a real prior `seen`/`skipped` status (e.g. from a different device's earlier migration) is never clobbered by a fresh device's migrating value.
- Absent or invalid `onboarding_status` is a **silent no-op** — it does not add an entry to `operations` and MUST NOT fail the rest of the migration (the other five data categories migrate independently of this one optional field, matching the endpoint's existing per-category tolerance).
- Client side: `IndexedDBStore.migrateToSupabase` (`connect-four/src/store/IndexedDBStore.js`) reads a fresh `getProfile()` and includes `profile?.onboarding_status` in the POST body as one more key — the `profile` object store is not cleared by this method (only the other 5 stores are).

**`device_uuid` games re-association (Feature 3 — onboarding follow-ups, spec 048 follow-up, 2026-07-13)**: the request body accepts an optional seventh key, `device_uuid` (the client's own uuid, sent from the same `getProfile()` read). Handling:
- Anonymous sparring games are written directly to the `games` table by `POST /api/games` with `user_id: null`, keyed by `device_uuid` — they are **not** in IndexedDB. This step claims them for the account with one more entry in `operations`:
  `supabase.from('games').update({ user_id: req.user.id }).eq('device_uuid', body.device_uuid).is('user_id', null)`
- **Key on the client's `body.device_uuid`, NOT the endpoint's locally-derived `deviceUuid`** (invariant 2 above generates a fresh `device_uuid` for new users — that value would never match the anon game rows). This is the whole point of sending it in the body.
- `WHERE user_id IS NULL` is `.is('user_id', null)` (not `.eq`), so only unclaimed rows are taken and the op is idempotent on client retry.
- Absent or empty-string `device_uuid` is a **silent no-op** (guard: `typeof body.device_uuid === 'string' && body.device_uuid.length > 0`) — must not add an entry to `operations` or fail the rest of the migration.
- Trust model: `device_uuid` is client-supplied, same as every other migrate payload field; the `user_id IS NULL` guard caps the blast radius to unclaimed orphan rows. `papergames_games` is intentionally NOT re-associated (no anon path creates those rows).
- **Anon blunders re-associate the same way (anon free deep reveal, 2026-07-13)**: keyed on the same `body.device_uuid`, one more `operations` entry mirrors the games block exactly, only the table differs:
  `supabase.from('blunders').update({ user_id: req.user.id }).eq('device_uuid', body.device_uuid).is('user_id', null)`
  Anon blunders are written by `POST /api/games/analyze` (see below) with `user_id NULL` + `device_uuid`; this claims them so Past Games mistake-counts and stats (both `user_id`-scoped) light up post-signup with no further change.

## Move Evaluation Endpoint

`POST /api/evaluate-move` — scores a move and returns i18n keys for the Coach dialog and Tier-1 strip. Supports two paths: **user-move** (default, for puzzle attempts and sparring user clicks) and **AI-move** (for sparring AI move commentary).

### User-Move Path (default, `aiMove` absent or false)

**Request body**: `{ movestring: string, col: number, category?: string, aiMove?: false, puzzleId?: string }`
- `movestring`: position **before** the move (0-indexed, 0–42 chars).
- `col`: 0-indexed column played.
- `category`: optional override for the phrase pool key (e.g. `"forced_block"`). When omitted, the classifier derives the pattern tag from the position via `classify()` (synchronous, pre-move board).
- `aiMove`: absent or `false`.
- `puzzleId` (spec 051, Epic 1, FR-024/FR-027): optional puzzle row UUID. When present, selects the
  **stored-set grading branch** — see "Grading branches (`puzzleId` vs. row-less)" below. Sent by
  `ChallengeScreen.jsx` (`current.id`) alongside `correctCols`/`highlightMetadata`, which remain in
  the body unconditionally (FR-017 — not removed by this feature).

### Grading branches (`puzzleId` vs. row-less) — spec 051, Epic 1, FR-024/FR-024a/FR-025/FR-026/FR-028

Exactly two branches, selected once, in this order — there is no third "malformed request" case:

```
if (req.body.puzzleId) {
  // Stored-set branch.
  // 1. Look up the row (is_active = true), same query shape as POST /api/puzzles/:id/check:
  //      .select('id, category, move_string, highlight_metadata, correct_cols')
  //      .eq('id', puzzleId).eq('is_active', true).single()
  // 2. If no row resolves: log a warning and fall through to the Row-less branch below, using
  //    req.body's own fields as inputs. It does NOT 404 (see Errors, below).
  // 3. If puzzle.correct_cols is NULL (not yet backfilled — FR-024a): fall through to the
  //    Row-less branch below, using the ROW's own category/move_string/
  //    highlight_metadata as inputs (fail-open, not an error — a live drill must never grade
  //    every column wrong just because a row hasn't been backfilled yet).
  //    Else: accepted = puzzle.correct_cols.includes(colInt) — computed DIRECTLY.
  //    evaluatePredicate/buildPredicatePuzzle and the seven pattern evaluators (evalZThreat,
  //    evalClaimeven, evalUndercut, evalOvercut, evalFigure7, evalJShape, evalOddEvenThreat) are
  //    NOT called on this path at all. req.body's category/correctCols/highlightMetadata are
  //    ignored once puzzleId resolves to a row with a non-null correct_cols.
} else {
  // Row-less branch (unchanged, pre-existing behavior) — builds the predicate object from
  // req.body's movestring/category/correctCols/highlightMetadata and grades via evaluatePredicate
  // (whose evaluators are set-membership per FR-003). Serves lesson inline challenges and any
  // request that omits puzzleId (Decision D2/FR-028 — absence of puzzleId always routes here;
  // there is no separate malformed-request rejection for "neither shape").
}
```

**Safety floor (FR-026)**: both branches are safe under the same `isSolverSafe`/`optimalCols`
definition in `server/answerSetInvariant.js`, invoked from different points. The row-less branch
calls it directly, at grading time (via `evaluatePredicate`/`acceptedCols`, unchanged). The
stored-set branch does **not** call it at grading time — it is safe by construction because the
`correct_cols` value it reads was produced by a writer (generation or the backfill script) that
already called `isSolverSafe` when building the set. No branch, and no writer, restates the rule
independently.

**Response**: unchanged shape on both branches — see "Response Shape" below. **`correct_cols` is
never added to the response**, on either branch (Decision D2b) — client-side grading was
considered and explicitly rejected; the server continues to grade every request.

**Errors**: no new error shape. Existing `400`/`500` shapes apply identically to both branches.

An unresolvable `puzzleId` **does not fail the request** — it logs a warning and falls through to
the row-less branch. This is deliberate, and it is a revision of the original spec-051 design
(which specified `404 { error: 'puzzle not found' }`): the 404 silently removed grading feedback
from every lesson confirmation challenge and every DEV-injected board, because `ChallengeScreen`
commits its phase change before the response lands, so the learner saw no error — just no
feedback at all (`docs/open_issues.md` OI-84). Falling through costs nothing, since the request
body still carries everything the row-less branch needs, and it follows the same fail-open
philosophy FR-024a already applies to a NULL `correct_cols`: a live drill must never be broken by
a row the server cannot find. Two things keep this from hiding real bugs — the `console.warn`
on every miss, and `src/lib/syntheticPuzzleId.js`, which stops the client sending ids that could
never resolve (`dev-…`, `inline-…`) in the first place.

**`correctCols` / `highlightMetadata` (spec 049 Epic 9, retired to the sole array shape by spec 056)**:
optional request fields, sent by the client when `category` is one of `SINGLE_ANSWER_CATEGORIES`
(`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape`) — `{ correctCols: number[],
highlightMetadata: object | null }`. These are camelCase wire names matching what
`evaluatePredicate`/`buildPredicatePuzzle` read (`puzzle.correctCols`, `puzzle.highlightMetadata`).
**The client is responsible for remapping from its locally-held snake_case puzzle object** before
sending: `correctCols: current.correct_cols`, `highlightMetadata: current.highlight_metadata` —
this is a top-level rename only, the inner `highlight_metadata` JSON shape (`.column`,
`.cells[].role`) is unchanged. The singular `correctCol` scalar wire field is retired entirely —
there is no deprecated alias, on this endpoint or anywhere else in the API. Ignored (harmless if
sent) for every other category. Absence of these fields for a single-answer category is **not** a
400 — it flows through to `evaluatePredicate`'s existing fail-closed `{ result: 'wrong' }` path, so
a missed client-side remap silently yields `accepted: false` rather than an error; this is why
`tests/integration/singleAnswerCategoriesAccepted.test.js` asserts a positive `accepted: true` case
per category, not only negatives. See
`specs/049-puzzle-scoring-spanish-localization/contracts/api-evaluate-move.md` for the historical
contract delta (superseded on the scalar-vs-array shape by spec 056).

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
- `accepted` (spec 044 US3 FR-015a, widened by spec 049 Epic 9 FR-001–FR-012, membership updated by spec 051 Epic 1 T005/T006/T007): additive field, computed via `evaluatePredicate` on the row-less branch (see above for the stored-set branch's direct `correct_cols.includes(...)` computation), present (non-null) for **ten categories total**: the three multi-solution categories (`immediate_threat`, `forced_block`, `double_threat` — correctness allows more than one valid answer column) plus the seven single-answer categories via `SINGLE_ANSWER_CATEGORIES` (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape`, `odd_even_threat` — spec 051 closed OI-75 by adding `odd_even_threat` to this set; despite the "single-answer" name, this set now gates only which categories expose `accepted`, not answer-set cardinality — `claimeven` in particular has no upper bound on qualifying columns). `true` when the played column independently satisfies the category's condition (`evaluatePredicate` result `'correct'` or `'tied'`), `false` otherwise, `null` for every other category (`forced_win`, `forbidden_columns`). One shared gate expression covers both sets (`server/categories.js`'s `SINGLE_ANSWER_CATEGORIES` is a separate, explicit list — never derived as "not multi-solution"). Recomputed at solve time on the row-less branch; not persisted. For the seven single-answer categories on that branch, computed from the request's `correctCols`/`highlightMetadata` fields (see above) via the shared `buildPredicatePuzzle` helper. See server-conventions.md's "Multi-solution acceptance" note.
- `correct_cols` is never included in this response, on either grading branch (spec 051 Epic 1 Decision D2b) — client-side grading was considered and explicitly rejected.
- No auth required; anonymous calls are accepted.

**Errors**: 400 for invalid `movestring` or `col`, 500 for solver errors. A `puzzleId` that does not resolve to an active row is **not** an error — it warns and falls through to the row-less branch (see "Grading branches" above).

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
  "forbiddenCols": number[] | null,
  "deviceUuid": string
}
```

**`deviceUuid` (spec 054, FR-001)** is the stable identifier the server resolved for this caller, echoed back so an anonymous client can reproduce it on a later read (e.g. `GET /api/coach/queue?device_uuid=`). It comes from `resolveDeviceUuid(req, res, bodyValue)` (`server/deviceIdentity.js`): request body → existing `dc4_device_uuid` cookie → a freshly minted `crypto.randomUUID()` that is then set as that cookie. It is **never** the literal `'anonymous'` and never a fresh value per request; the endpoint never 400s for a missing identifier. Callers need send nothing — every client fetch already uses `credentials: 'include'`, so the cookie carries it.

Note the stored `outcome` is **not** this `result` value: the writer maps `evaluatePredicate`'s `'correct'|'wrong'|'tied'` through `toStoredOutcome()` (`server/outcomeVocabulary.js`) into the `puzzle_attempts` enum before insert.

- `threatCells`: populated for `double_threat` puzzles when `result` is `correct` or `tied`. Contains the two (or more) major threat cells created by the correct move. Frontend uses these to render `major_threat` highlights after reveal.
- `forbiddenCols`: populated for `forbidden_columns` puzzles on every response. Contains the full set of 0-indexed columns that are forbidden in the position. Frontend uses this to reveal missed forbidden columns after multi-select submit.
- `correctCol`: the canonical correct column for categories that have a single answer; `null` for categories where any non-forbidden column is correct (e.g. `forbidden_columns`). **This is `evaluatePredicate`'s computed result-shape field, not the retired DB scalar** — it keeps its singular name permanently (spec 056 FR-026). It is unrelated to the `correctCol` wire field spec 056 retired from `GET /api/puzzles/:id` and `POST /api/evaluate-move`, which carried `puzzles.correct_col` and is now `correctCols` (array). Same name, different thing — do not "migrate" this one.

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
- `blunder_count`: count of `blunders` rows linked to this game via `game_id`. **This is a *mistake* count, not a blunder count** — the query applies no `quality` filter, so it sums both `'blunder'`- and `'suboptimal'`-quality rows. The wire name is frozen for compatibility (spec 042 FR-007); see the "Mistake-count vocabulary" note in `data-model.md` before adding any consumer or a `quality` filter.
- `cols`: 7-element array of per-column move encoding (`g` = current player, `d` = opponent), produced by `movesToCols`.
- Games with `blunder_count === 0` are excluded when `has_blunder=true` — i.e. `has_blunder` means "has any mistake", matching its "With mistakes" UI label. `sort=worst_blunders` likewise orders by total mistakes.

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

**Casing mismatch with `/draw`**: `GET /api/puzzles/draw` returns **raw DB rows in snake_case** (`move_string`, `correct_cols`, `interaction_mode`, `highlight_metadata`, `user_player`, …) — it does NOT camelCase-transform, while `GET /api/puzzles/:id` returns camelCase (`moveString`, `goalPrompt`, `correctCols`, …). `correct_cols`/`correctCols` (`integer[]`) is the sole wire shape for a puzzle's accepted-answer field on both endpoints — there is no scalar `correct_col`/`correctCol` variant anywhere in this response. Any component that passes a `/draw` row to a sub-component expecting camelCase needs a callsite adapter; read the consumer's field accesses first to catch every field.

## Sequence-Mode Puzzle Endpoint

`POST /api/puzzles/:id/sequence/move` handles per-move validation for `interaction_mode = 'sequence'` puzzles.
Accepts `{ position, col }` where `position` is the current move string (before the learner's move) and `col` is 0-indexed.
Returns `{ outcome: 'success' | 'fail' | 'continue', aiCol?, reason? }`.
All validation is bitboard-only — no solver calls.
`POST /api/puzzles/:id/check` returns 400 for sequence-mode puzzles; callers must use the `/sequence/move` endpoint instead.

## Game Analysis Endpoints

### `POST /api/games/analyze`

Scores every user ply in a completed game and returns a quality summary.

**Auth / blunder writes**: no-auth (anonymous callers may analyze). It is also a **write** vector — it INSERTs `blunders` rows. Authenticated callers write rows under `user_id` (unchanged). **Anonymous callers on a device-scoped game** (anon free deep reveal) write rows with `user_id NULL` + `device_uuid` stamped from the fetched game row — decided by `server/anonBlunderAccess.js#resolveGameBlunderOwner`. Never compare `device_uuid` to `req.user.id` (different id namespaces — see `db-schema.md`). The ownership gate still 404s a signed-in caller passing another *user's* (non-null `user_id`) game.

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

### `POST /api/blunders` — **RETIRED** (spec 057 T035 item 2 option (b))

This endpoint no longer exists. It is documented here (rather than deleted outright) so a reader
following an old link or a stale mental model learns what happened, not just a 404.

Retirement rationale (`server/index.js`, comment at the former route location): the endpoint had
no client caller — `insertGameBlunder.js` notes the client no longer writes blunders via this
route, and `grep -rn "api/blunders" src` finds only `GET /api/blunders/:id` fetches — and it
required a score-pair grading path that `classifyStoredMistake` no longer provides now that
grading is `scoreMove`-only (FR-019a; see `server-conventions.md` "Storage gate"). Retired rather
than rewired.

The two live write paths, `POST /api/games/analyze` and `papergamesImporter.extractBlunders`,
cover blunder recording; `classifyStoredMistake` now returns only a storage-eligibility boolean,
not a `{ quality }` grade, so this endpoint's old "quality derived server-side by the storage
rule" contract (below, for historical reference) is no longer something any live code path does.

<details>
<summary>Historical request/response contract (pre-retirement, for archival reference only)</summary>

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
- The server computed `severity = best_score − score` and stored it.
- `quality` was derived server-side by the storage rule, not sent by the client — this is the part `classifyStoredMistake` no longer does; grading now belongs solely to `scoreMove`.
- Auth: Required (401 if `req.user` is null).

**Response** (`201 Created`): `{ "id": "<uuid>" }` — the inserted blunder's primary key. **Or** (`200 OK`) `{ "stored": false, ... }` when the storage rule declined the move, or `{ "deduplicated": true }` on a unique-index conflict.

**Errors**: 400 (missing or invalid fields), 401 (not authenticated), 500 (DB error), 503 (Supabase not configured).

</details>

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

Back the `admin/fv-suff` page (`src/pages/AdminFvSuffPage.jsx`), a desktop, localhost+admin tool with **two modes** (route still named `fv-suff` for historical reasons). Both read JSONL from `server/scripts/`. Guarded by `requireLocalhost + requireAdmin`. Responses are **not field-whitelisted** — records are returned whole.

**Evidence mode** — browses **blunder-reason evidence** (the `computeReason` output precomputed by `server/scripts/compute.mjs`). Evidence rows have shape `{id, evidence, groundTruth}`.

- `GET /api/admin/reason/files` → `{ files }` — evidence-file names matching `reason_evidence_*.jsonl`, sorted.
- `GET /api/admin/reason?file=<name>` → `{ rows }` — the full parsed evidence file (default `reason_evidence_all.jsonl`). `file` is validated against `/^reason_evidence_[\w.-]*\.jsonl$/`; a missing file is a 404.

**Eval-answers mode** — joins, by `id`, the LLM **answers** and the **grades** (the eval set is derived from the answers file itself via `deriveSetFromAnswers`), so each board+vector shows its LLM answer + A1–A4 grade:

- `GET /api/admin/fv-suff/files` → `{ answers }` — `answers` = `fv_suff_answers_*.jsonl` (excluding `*_grades.jsonl` sidecars).
- `GET /api/admin/fv-suff?answers=<name>` → `{ set, answers, grades }`. `set` is DERIVED from the answers file via `deriveSetFromAnswers` (no separate eval-set file or `set` query param); `answers` (default `fv_suff_answers_all.jsonl`, validated `isFvSuffAnswersFile`) = `compute.mjs --llm` rows, each embedding its `feature_vector`; `grades` = the `gradesFilenameFor(answers)` sidecar (`<stem>_grades.jsonl` from `grade-fv-sufficiency`), `[]` if absent. Missing answers file is a 404; missing grades are non-fatal (empty). Validators live in `evalResultsHelpers.js` (unit-tested).

## `POST /api/admin/audio/preview` — TTS sandbox (2026-07-16)

`requireLocalhost`. The only TTS endpoint that synthesizes **arbitrary text** with **experimental**
voice params, for auditioning a prompt/voice before committing to it.

Body: `{ text, prompt, speed, voice, model, lang }`. Validation lives in
`server/ttsPreviewValidation.mjs` (`validatePreviewRequest(body) → {ok, value} | {ok, error}` — pure,
unit-tested): `text` must be a non-empty string; `voice` ∈ `VALID_TTS_VOICES`; `model` ∈
`VALID_TTS_MODELS`; `speed` ∈ [0.25, 4.0] (bounds shared with `POST /api/admin/audio/prompt`). 400 on
any violation. Responds with raw mp3 bytes (`res.type('audio/mpeg').send(audio)`), not JSON.

Three properties are load-bearing — preserve them:
- **It writes nothing.** No mp3 on disk, no registry entry, no manifest change, no config write. The
  registry/manifest/file trio already drifts (see `coach-audio-conventions.md`); a sandbox that wrote
  would be a fourth source of drift. The browser holds the bytes via a blob URL.
- **Instructions route through `buildTtsInstructions(prompt, lang)`**, never the raw `prompt` — for
  `es` that appends `SPANISH_ACCENT_DIRECTIVE`. Skipping it would tune against a different
  instruction string than production uses, defeating the endpoint's purpose.
- **Uncached by design** — one real API call per invocation. You cannot hear a change you did not
  synthesize. Do not add caching.

Client: a `<details>` sandbox in `src/pages/AdminAudioPage.jsx`, whose params are **separate state**
(`sb*`) from the saved-config editor; promotion is explicit via "Load from saved config" / "Save to
config" (the latter reuses `handleSavePrompt(cfg)`). The blob URL is revoked on regenerate and on
unmount.

## Lessons Endpoints

### `GET /api/lessons/:id` — server-side entitlement gate (spec 053, Epic — Entitlement & Payments Consolidation, US1)

Locale-scoped (see "Locale-scoped endpoints" above — merges `_es` sibling fields, `title` excluded). As of
spec 053, the handler also computes entitlement via `entitlementForRequest(req)` (`server/entitlement.js`)
and builds the response through `buildLessonResponse(lesson, entitlement)` (`server/lessonEntitlement.js`)
before sending it:

- `lesson.free === true`, or the caller is entitled (`entitlement.entitled === true`, i.e. a signed-in
  paid-tier user) → the full lesson object, unchanged.
- Otherwise (a free-tier or signed-out caller requesting a **paid** lesson) → a redacted stub, exactly:
  ```json
  { "id": "undercut", "title": "The Undercut", "order": 11, "free": false, "locked": true }
  ```
  No `authenticated` field on this endpoint — `authenticated` is exposed only by
  `GET /api/user/entitlement` (spec 053 US2), which is the one place that distinction is actually consumed.

**Field-presence conventions (both directions of this endpoint, not just the locked stub):**
- `slides` (and `socratic`, `confirmationCategory`, `confirmationChallenges`, etc.) is **absent**, never
  `null` or `[]`, on the locked response — no lesson content leaves the server for an unentitled caller.
- `locked` is **present and `true`** only on the redacted response. It is **absent**, never `locked: false`,
  on every full-content response (free lesson, or a paid lesson served to an entitled caller). No consumer
  should ever branch on `locked === false`; the correct check is `locked === true` vs. its absence.

`404 { error: 'not_found' }` for a nonexistent id is unchanged and unaffected by entitlement.

**Client consumers** (all three read this endpoint and MUST handle `locked === true` before indexing any
now-absent field): `src/screens/ConceptScreen.jsx`, `src/screens/SocraticScreen.jsx`, and
`src/screens/CLChallengeScreen.jsx`'s cold-boot fetch (see "`clchallenge` cold-boot fetch pattern" in
`frontend-conventions.md`). Each redirects through the same affordance the client-side
`useLessonLockGuard` already uses on a locked direct-URL access — `goReplace('saga', { lockAction:
'upgrade' })`, which opens `SagaScreen`'s `UpgradeModal` — rather than inventing a second locked-lesson UI.

### `GET /api/user/entitlement` — the one authoritative "is this account paid" answer (spec 053 US2)

**Deliberate, documented exception to the `/api/user/*` ownership invariant.** The "MUST check `req.user`
and return `401` if null" rule stated at the top of this doc (`### /api/user/* ownership invariants`) does
**NOT** apply to this endpoint — it always answers `200`, even for a fully anonymous caller. Do not "fix"
this into a `401`; an anonymous or session-lapsed caller answering `{ entitled: false, authenticated: false
}` is exactly the intended, load-bearing behavior (see below and `research.md` Decision 4 in
`specs/053-entitlement-payments-consolidation/`).

**Auth**: runs through the global `loadUser` middleware like every route, but is exempt from the inline
`401`-if-null guard.

**Request**: no params, no body.

**Response `200`** (always — this endpoint has no error branch of its own), body `{ entitled: boolean,
authenticated: boolean }`, for all three caller states:

| Caller state | Response |
|---|---|
| Anonymous (no session) | `{ "entitled": false, "authenticated": false }` |
| Signed in, free tier | `{ "entitled": false, "authenticated": true }` |
| Signed in, paid tier | `{ "entitled": true, "authenticated": true }` |

`authenticated` exists only to let the client (`src/lib/entitlement.js`'s `getEntitlement()`) distinguish "a
session that just lapsed" from "a genuine free-tier account" when deciding whether to attempt a session
refresh before downgrading a previously-cached `entitled: true` answer — it is not a general-purpose
auth-status field, and callers with no cached prior answer can ignore it.

**Implementation — `entitlementForRequest(req)` is the sole production entry point.** `server/entitlement.js`
exposes two functions:
- **`entitlementForRequest(req)`** — the only function outside `entitlement.js` (and its own tests) that
  should ever be called from production code. Reads `req.user` (already populated by `loadUser`) and
  returns `computeEntitlement(req.user)`. This route handler is a thin wrapper around it:
  ```js
  router.get('/api/user/entitlement', (req, res) => {
    res.json(entitlementForRequest(req));
  });
  ```
- **`computeEntitlement(user)`** — the pure, synchronous, never-throwing core (`entitled === true` iff
  `user != null && user.tier === 'paid'`; `authenticated === true` iff `user != null`). **Test-only** —
  exported solely for unit tests; production route handlers and other server-side decision points must call
  `entitlementForRequest(req)`, never `computeEntitlement(user)` directly, and must not re-derive tier logic
  locally.

**Registered in**: `server/userRoutes.js`, alongside the other `/api/user/*` endpoints.

**Client caller**: `src/lib/entitlement.js`'s `getEntitlement()` — a TTL-cached (5 min), fail-open wrapper
that is now the single source every screen/component reads to decide paid-vs-free, superseding five
independent `store.getProfile().tier` reads (see `docs/architecture/frontend-conventions.md` "Reading the
user's tier"). Production callers invoke it with no arguments — `getEntitlement()`.

## Lesson Audio Generation & Pruning Endpoints (spec 046 US3/US4)

Additive routes under the existing `/api/admin/lessons/*` family. Both guarded by `requireLocalhost,
requireAdmin` (same double-gate pattern as spec 039's `/api/admin/audio/generate*`). Full contract:
`specs/046-lessons-progression-audio-polish/contracts/lesson-audio-generation.md`.

### `POST /api/admin/lessons/:id/generate-audio`

**Path param**: `id` — lesson id; `404 { error: 'not_found' }` if it doesn't exist.

**Request body**: `{ lang }` — optional, `'en'` (default) or `'es'`; anything else → `400`. The server
loads the lesson from disk (`getLessonsAll().find(...)` — **raw**, not `getLesson()`, which would strip
`_es` fields before the save-back and destroy Spanish content), not from the client, so a stale
client-held copy can't overwrite a concurrent edit. The admin editor's "Generate audios" button
sends `{ lang }` from its en/es toggle (`buildGenerateAudioRequest` in `AdminLessonEditorScreen.jsx`) —
before that wiring existed the button sent no body, so toggling to Spanish silently produced English clips.

**Behavior**: walks `collectMessages(lesson)` — concept-slide `coachMessages[]`, each slide's
**`infoProse`**, and `socratic.messages[phase][]` — and for every entry whose text field for the target
language is non-empty, calls `synthesize(text, lang)` (spec 051 FR-026/FR-027: `server/ttsProvider.js`'s
shared entry point resolves voice/model/speed/instructions internally from `lang` via
`resolveSynthesisConfig` — `readTtsConfig(lang)` reads the per-language `server/tts-prompt.<lang>.json`,
`es` carries the Argentinian-persona prompt, and `buildTtsInstructions` appends the Spanish accent
directive for `es`; this endpoint no longer resolves that config itself). Writes
`public/audio/lessons/<hash>.mp3` and sets the
matching audio field. Spanish text hashes to a **different** filename than English, so the two coexist in
one flat dir. Per-message failures are caught individually — one bad synth does not abort the batch.
Persists via `saveLessonFile` + `reloadLessons()`. **`prune-audio` must stay `_es`-aware**
(`collectReferencedAudio` collects both the English and Spanish sibling of each entry's `audioKey`), or it
deletes every Spanish clip as an orphan.

**Field names come from the walker entry, not from this endpoint.** `collectMessages` yields
`textKey`/`audioKey` per entry (`text`/`audio` for coach + socratic messages, `infoProse`/`infoProseAudio`
for slide prose) and the handler derives the Spanish sibling as `` `${key}_es` ``. Adding a new narratable
location means adding it to that walker — see `server-conventions.md` §`collectMessages`.

**Regeneration is unconditional.** The text hash keys the *filename*, but voice/prompt/speed/model live in
`tts-prompt.<lang>.json` and are not in that hash, so a hash match proves nothing about whether the clip
still sounds right (and never touches the filesystem, so a missing mp3 stayed missing). Same text → same
hash → same path, so a re-run overwrites in place and orphans nothing; the cost is one TTS call per
message per click. Empty/whitespace text is still skipped — that is "nothing to say", not a cache hit.

**Bulk loops must pace themselves.** This route falls under the default `/api/` limiter at **120 req/min
per IP**, shared with every other API call from the same machine — including a browser QA sweep running
in parallel. `express-rate-limit` rejects with a **plain-text** body, not JSON, so a shell loop piping the
response into a JSON parser dies with an opaque decode error while the server log shows the `[req] POST`
line and no handler output at all. Space bulk regeneration requests and keep browser traffic off the box
while it runs.

**Response** (`200 OK`): `{ lesson, generated: [<locator>, ...], failed: [{ locator, error }, ...] }` —
`generated` lists every message synthesized this run (locators such as
`slides[0].coachMessages[0]`, `slides[0].infoProse`, `socratic.messages.ask[0]`,
`confirmationChallenges[0].goalPrompt`); `failed` lists messages whose synthesis failed this run.

> **Two operational traps, measured 2026-07-31.**
> 1. **Omitting `locator` re-synthesizes the entire lesson** (15–17 clips), not just the missing ones.
>    Identical text hashes to the same filename so it overwrites in place — but TTS is not
>    byte-deterministic, so every previously-committed mp3 comes back byte-different. Ten lessons
>    produced 142 modified binaries against 30 genuinely-new clips. Prefer the targeted `locator` form
>    for anything but a deliberate full re-voice.
> 2. **`saveLessonFile` is read-modify-write with no locking**, so two calls against the same lesson in
>    quick succession (e.g. `lang:'en'` immediately followed by `lang:'es'`) can lose the second write
>    while still returning `200 {generated:[...], failed:[]}`. Do not parallelise per-lesson calls, and
>    verify the field landed by re-reading the lesson JSON rather than trusting the response.

**Errors**: `403` (non-localhost or non-admin), `404` (lesson not found), `500` (unexpected write error
— per-message TTS errors are non-fatal, see above).

**`locator` field (spec 051 US2, optional)**: `{ lang, locator }` — when present, only the single
`collectMessages(lesson)` entry whose `locator` matches exactly is (re)synthesized; every other message's
`audio`/`audio_es` is left untouched. Absent (the default) is unchanged full-lesson behavior — this is
what `AdminLessonEditorScreen`'s existing "Generate audios" button still sends. A `locator` that matches
no entry (e.g. the lesson JSON was edited between the admin page's last load and the click) is a
**settled no-op**: `200 { generated: [], failed: [] }`, never a `404` — matching this endpoint's existing
philosophy of never erroring on a stale-state mismatch. `connect-four/src/pages/AdminAudioPage.jsx`'s new
Lesson Audio Manager section (see `lesson-editor.md`) is the only caller that sets this field today; it
sends the locator of whichever single message's Generate/Regenerate button was clicked.

### `GET /api/admin/lessons/:id/audio-status` (spec 051 US2)

Read-only companion to `generate-audio` — powers the Lesson Audio Manager section of `/admin/audio`
(`src/pages/AdminAudioPage.jsx`; see `lesson-editor.md` for the client-side shape). Same double-gate
(`requireLocalhost, requireAdmin`, in that order) as every sibling `/api/admin/lessons/*` route.

**Path param**: `id` — lesson id; `404 { error: 'not_found' }` if it doesn't exist.

**Query param**: `lang` — `'en'` (default) or `'es'`; anything else → `400 { error: 'lang must be en or
es' }`.

**Behavior**: calls `reloadLessons()` **before** reading, so the response reflects the current on-disk
lesson JSON even if it was hand-edited after the server booted and no write route has run since (FR-009,
closes OI-43 for this read path — the in-memory lesson array is otherwise refreshed only by the write
routes, none of which run on a `GET`). Then walks `collectMessages(lesson)` on the **raw** lesson (same
reasoning as `generate-audio` above — `getLesson()` would strip `_es`), resolves each entry's localized
`text`/`audioPath` the same way `generateLessonAudio` does, and checks `hasAudio` via `existsSync` against
`LESSON_AUDIO_DIR` (not just "the field is non-empty" — a field pointing at a deleted file correctly
reports `hasAudio: false`). Entries with empty/whitespace text for the requested language are **excluded
entirely** — that is "nothing to say," not "missing audio," and must not render as a false-positive
missing row. Two entries with identical text sharing one `audioPath` both appear as separate rows; this is
correct, not a bug — do not deduplicate.

**Response** (`200 OK`):
```json
{
  "lessonId": "threat-vocabulary",
  "lang": "en",
  "groups": [
    {
      "label": "Slide 1",
      "messages": [
        { "locator": "slides[0].coachMessages[0]", "text": "...", "audioPath": "/audio/lessons/abc123.mp3", "hasAudio": true },
        { "locator": "slides[0].infoProse", "text": "...", "audioPath": null, "hasAudio": false }
      ]
    },
    {
      "label": "Socratic",
      "messages": [
        { "locator": "socratic.messages.ask[0]", "text": "...", "audioPath": "/audio/lessons/def456.mp3", "hasAudio": true }
      ]
    }
  ]
}
```
Groups are labeled `"Slide N"` (1-indexed, derived from the locator's `slides[N-1]` prefix) or
`"Socratic"`; a lesson with no Socratic board (`socratic: null`) simply has no `"Socratic"` group — not an
error.

**Errors**: `400` (invalid `lang`), `403` (non-localhost or non-admin), `404` (lesson not found).

### `POST /api/admin/lessons/prune-audio`

**Request body**: none.

**Behavior**: scans `public/audio/lessons/*.mp3`, computes the set of audio paths referenced across
all lessons (`getLessonsAll()`) — every entry `collectMessages` yields, in both languages, read off that
entry's `audioKey` — and deletes any file not referenced.

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
- `papergames_id`: non-empty string, max 64 characters, when present — **and it must resolve to a real Papergames profile.** The handler calls `verifyPapergamesAccount()` (`server/papergamesImporter.js`), which probes `GET https://papergames.io/api/profile/<id>`. This is the only endpoint in the app that makes an outbound third-party call as part of input validation, so note its two deliberate properties: it **fails open** (only a definite upstream 404 rejects; a 5xx, timeout, or offline network saves anyway, so a Papergames outage can never trap a valid ID), and it **only runs when `papergames_id` is present in the body** — an `onboarding_status`-only update never touches the network.
- `onboarding_status` (Epic 8 — Onboarding Experience, spec 048): one of the fixed 3-value enum, when present. Validated via the single shared `isValidOnboardingStatus()` (`server/userHelpers.js`) — the ONE place this enum is checked; no other call site (including `POST /api/user/migrate`) may duplicate the check inline.

**Response**: `204 No Content` on success.

**Errors**:
- 400 `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }` when `papergames_id` is present but invalid.
- 400 `{ "error": "No Papergames account found with ID <id> — check your Papergames account ID" }` when the ID is well-formed but 404s upstream. Added 2026-08-25 after a production incident in which a non-existent account ID was stored silently and only failed minutes later, inside a background import job, as the misleading `Papergames API unreachable: fetchRooms HTTP 404`.
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

---

## Language / locale (i18n)

The client's selected UI language reaches the server two ways — never assume one covers both:

- **`Accept-Language` header → `req.locale`.** `localeMiddleware` (`server/locale.mjs`) resolves every request's `req.locale` to one of `SUPPORTED_LOCALES = ['en','es']` (default `'en'`, q-weighted parse, base-language match). The client sets `Accept-Language` from its i18next language via `langHeaders()` (`src/lib/apiLang.js`). **`langHeaders()` must be attached to EVERY fetch whose response is locale-dependent** — a common trap is a correct server seam with a client that never sends the header (a bare `fetch(url)` sends the *browser's* `Accept-Language`, not the app's). Current call sites: the deep-reveal `POST /api/explain-move-llm` fetch, and the lesson fetches in `ConceptScreen.jsx`/`SocraticScreen.jsx`/`CLChallengeScreen.jsx` **and the list fetches in `SagaScreen.jsx`/`StatsScreen.jsx`**. Locale-scoped endpoints: `/api/explain-move-llm`, `/api/explain-move`, `/api/user/tts/deep-reveal`, `GET /api/lessons/:id`, and — **since spec 052 (US2)** — `GET /api/lessons` (the list), which now takes `req.locale` because it carries the lesson `title`.

> **Changed 2026-07-30 (spec 052 US2).** `title` **IS** localized now, via a `title_es` sibling in the lesson JSON merged by `lessonLoader.js#localizeLesson`. Previously this doc said `title` was deliberately NOT localized because "the `lesson.<id>.title` i18n key owns it" — that key was deleted by spec 052, which made `title_es` the sole Spanish source. Shipping the migration without it silently regressed 14 of 15 lesson titles to English for Spanish learners (nothing threw; the graceful-fallback trap). Both the detail route and the list route must pass `req.locale`, and every client fetch of either must send `langHeaders()`.
- **Explicit `?lang=` query param on the TTS audio GET.** `GET /api/user/tts/deep-reveal` is fetched via `new Audio(url)`, which **cannot set a custom header**, so its language is passed as `&lang=<en|es>` on the URL (`DeepRevealPane.jsx`). The endpoint resolves locale via `resolveTtsLocale` = whitelisted `?lang=` **preferred over** `req.locale`. This keeps the audio row aligned with the text row regardless of the browser's own `Accept-Language`.

Because the client i18n language is constrained to exactly `en`/`es` (no regional tags, no browser detector), the header's base-language match and the param's exact match never disagree.

### Deep-reveal i18n contract ("English prompt → Spanish output")

The deep-reveal LLM prompt scaffold stays **entirely English**; for `locale==='es'` a single `SPANISH_OUTPUT_DIRECTIVE` (`server/scripts/compute.mjs`) is appended instructing the model to write **only the player-facing `mechanism` field** in Argentinian voseo (discs = verde/gris), copying the `[zone:…]`/`[term:…]` tags and `cNrM` cells verbatim. The grounding/render validation is language-independent (matches only tag grammar + ids), so it is untouched. Consequences for anyone iterating on deep reveal:

- **Content/grounding improvements transfer to Spanish for free** (same pipeline, one directive).
- **New player-facing surfaces do NOT** — a new hardcoded string, a new `[term:…]` without a `short_summary_es`, or a newly player-facing LLM field ships English in Spanish builds unless explicitly covered. Fails *silently* (graceful English fallback).
- **Cache invalidation is per-locale** — busting must cover every locale row.
- **Spanish prose quality has no eval signal** — `judge-deep-reveals` / `grade-fv-sufficiency` run on English only.

Server-side user-facing strings NOT produced by the LLM go through `serverT(locale, key)` (`server/locale.mjs`); localized KB term pop-up summaries use a `short_summary_es` frontmatter field with English fallback (`loadKBShortSummary(id, locale)`).
