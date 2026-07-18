# Contract: `/api/paddle/*` (replaces `/api/stripe/*`)

Each contract below is written as a line-for-line replacement of the corresponding section in
`docs/architecture/api-conventions.md` (Stripe Checkout Config / Stripe Checkout / Stripe
Activation Fallback / Stripe Webhook Endpoint, `:59-103`) — US10.4.8 rewrites those sections in
place using this content as source. Cited old shapes come from `stripeRoutes.js` /
`stripeProcessor.js` (read directly, not from the doc, per "read the signature not the doc
comment").

## `GET /api/paddle/config`

**Auth**: none (public — the upgrade modal renders before sign-in is guaranteed, matching
`stripeRoutes.js:25`'s existing gate).

**Response `200`**: `{ prices: { monthly: {...}|null, annual: {...}|null } }` — same shape
`stripeProcessor.js`'s `getPrices()` returns today, sourced live from
`paddle.prices.get(priceId)` calls (or `paddle.prices.list()` filtered by id) instead of
`stripeClient.prices.retrieve`. A plan whose price id env var is unset returns `null` for that
plan (unchanged behavior).

**Response `503`**: `{ error: 'Payments not configured' }` when `paddlePaymentProcessor` is
`null` (i.e. `PADDLE_API_KEY` unset), matching `stripeRoutes.js:26-28`'s existing gate.

## `POST /api/paddle/create-checkout`

**Auth**: required. **Body**: `{ plan: 'monthly'|'annual', returnPath?: string }` — same body
shape as today (`stripeRoutes.js:39-46`); `plan` validation (`['monthly','annual'].includes`)
unchanged.

**Response `200`** (CHANGED SHAPE from Stripe's `{ checkoutUrl }`):
```json
{ "priceId": "pri_...", "customerEmail": "user@example.com", "successUrl": "/settings" }
```
`successUrl` is computed **server-side** by passing the request body's `returnPath` through
`sanitizeReturnPath()` (exported from `paddleProcessor.js`, §6/Research §6) — the same
same-origin-relative guard (`^/(?!/)`, else fall back to `/`) applied exactly as
`stripeProcessor.js:30` does today, just to `successUrl` instead of `success_url`/`cancel_url`.
This preserves FR-013's open-redirect guard as a server-side check; the client never computes
`successUrl` from the raw `returnPath` itself.

The client uses this response to call `Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }],
customer: { email: customerEmail }, customData: { app_user_id: <req.user.id, already known
client-side> }, settings: { successUrl } })`, passing the server-returned `successUrl` value
through verbatim — no server-built redirect URL is returned, but the sanitized destination is
(Research §3).

**Response `503`**: `{ error: 'Payments not configured' }` (paddleProcessor null).
**Response `401`**: `{ error: 'Authentication required' }` (no `req.user`).

## `POST /api/paddle/webhook`

**Auth**: none — Paddle-signed, not user-authenticated. Mounted behind a route-scoped
`express.raw({ type: 'application/json' })` parser, registered before the global
`express.json()` (`index.js:142`'s existing ordering, re-pointed at the new path — load-bearing,
per `server-conventions.md`'s "Stripe webhook signature verification stays on the raw body").

**Request**: raw Paddle event body + `Paddle-Signature` header (not `stripe-signature`).

**Verification**: `paddle.webhooks.unmarshal(rawBody, PADDLE_NOTIFICATION_WEBHOOK_SECRET,
signatureHeader)` inside a single try/catch. Any failure (signature mismatch, malformed event,
or a downstream processing failure after successful unmarshal — DB write, tier write, `tracks`
insert) returns one non-2xx status; per the `paddle:webhooks` skill, do not attempt to
distinguish signature failures from processing failures via different status codes — Paddle's
retry behavior doesn't branch on it (Research §5).

**Tier-mirror contract** (mirrors `api-conventions.md:93-103`'s existing table, Paddle events
substituted per `polish_epic.md:1698-1718`):

| Paddle event | `status` (subscription events only) | Write |
|---|---|---|
| `transaction.completed` | — | `tier: 'paid'`, `paddle_customer_id` set, `tracks` insert (`upgrade_completed`) |
| `subscription.created` | — | **no-op, documented** — `payment_events` ledger insert only (for idempotency/audit), no tier write. First-payment tier grant is owned exclusively by `transaction.completed`; `subscription.created` typically fires alongside/before the transaction and granting tier here would risk a race with, or a duplicate of, that write. |
| `subscription.updated` | `active` / `trialing` | `tier: 'paid'` |
| `subscription.updated` | `past_due` | no write (Paddle's automatic retry window — mirrors Stripe's existing "does not downgrade" rule) |
| `subscription.updated` | `paused` | `tier: 'free'` |
| `subscription.updated` | `active` **with** non-null `scheduled_change.action: 'cancel'` | no write (service continues until the effective date — not yet terminal) |
| `subscription.canceled` (or `subscription.updated` with `status: 'canceled'`) | — | `tier: 'free'` unconditionally (terminal) |

**Idempotency**: every event is first inserted into `payment_events` (`event_id` UNIQUE); a
`23505` conflict short-circuits before any tier write or `tracks` insert, returning
`{ handled: false, eventType: 'duplicate' }` — same pattern as today's `stripe_events`
(`api-conventions.md:103`), renamed per Research §2/§8.

**Response `200`**: `{ received: true, handled: boolean, eventType: string }`.
**Response non-2xx**: any verification or processing failure (see above) — no fixed status
code required, matching `paddle:webhooks` skill guidance.

## `POST /api/paddle/verify-transaction`

Replaces `POST /api/stripe/verify-session` (`stripeRoutes.js:76-92`) — this is the synchronous
activation fallback, not the primary tier-mirror (the webhook remains primary).

**Auth**: required. **Body**: `{ transactionId: string }` — read from the Paddle.js
`checkout.completed` event's `transaction_id` field client-side (Research §4), not a URL query
param (the overlay model has no return-URL round-trip). Per Research §4/§11, `useUpgradeCheckout.js`'s
`checkout.completed` handler is the **sole caller** of this endpoint — it owns `transactionId` and
dispatches the resulting `confirming`/`activated`/`failed` state into `checkoutReturnFlow.js`'s
shared store; `CheckoutReturnBanner.jsx` only renders that state and never calls this endpoint itself.

**Behavior**: `paddle.transactions.get(transactionId)`, then reject (no tier grant, no
analytics record — FR-008/FR-010) unless `transaction.customData?.app_user_id === req.user.id`
(Research §7) **and** `transaction.status === 'completed'`. On success, applies the **same
idempotent** `tier: 'paid'` + `paddle_customer_id` write the webhook applies — no `tracks`
insert (the webhook owns that analytics record exclusively, per FR-008's explicit
non-duplication requirement).

**Response `200`**: `{ activated: boolean, reason?: string }` — `reason ∈ { 'no_transaction',
'user_mismatch', 'not_completed' }` on `activated: false`, mirroring
`api-conventions.md:83`'s existing `reason` vocabulary (`'no_session'` → `'no_transaction'`,
`'not_paid'` → `'not_completed'`).
**Response `503`**: payments not configured. **Response `401`**: no `req.user`.

## `POST /api/paddle/portal`

Replaces `POST /api/stripe/portal` (`stripeRoutes.js:95-110`), grounded against the
`paddle:customer-portal` skill.

**Auth**: required. **Precondition**: `req.user.paddle_customer_id` must be set (else `400
{ error: 'No active subscription' }`, unchanged from today's `stripe_customer_id` check).

**Body**: `{ returnPath?: string }` (unchanged). When present, `returnPath` is passed through
`sanitizeReturnPath()` before use — the same open-redirect guard applied to
`create-checkout`'s `successUrl`, not a separate sanitizer.

**Response `200`**: `{ portalUrl: string }` — a minted Paddle customer-portal session URL for
`req.user.paddle_customer_id`, via the Paddle Node SDK's portal-session-equivalent call (see
`paddle:customer-portal` skill for the exact SDK method and auth/ownership pattern; grounding
at implementation time, not guessed here).
**Response `503`** / **`401`**: same gates as today.
