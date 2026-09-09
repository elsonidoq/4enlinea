# Contracts: dev-only QA endpoints

All three endpoints are registered in `connect-four/server/index.js`, in the existing
"Admin endpoints (localhost-only)" block (near `index.js:2905` onward — see research.md D1),
gated by the existing in-file `requireLocalhost` (`index.js:2916`), following the exact
registration style already used there:
`app.post('/api/admin/generate', requireLocalhost, async (req, res) => { ... })` (`index.js:2924`).

All three endpoints back `createQaAccountTools({ paddleClient, supabase })` from
`connect-four/server/qaAccountTools.js` (research.md D2) — the Paddle client is hoisted to a
module-level `let paddleClient = null` in `index.js` (research.md D1a), assigned inside the
existing `if (process.env.PADDLE_API_KEY) { ... }` block alongside `paddlePaymentProcessor`'s
construction, and reused here, not re-derived — sandbox-vs-live still comes from the key prefix
(no new environment logic, no second `new Paddle(...)` call site).

**503 scoping (amended 2026-09-08, tasks_critique D2)**: the 503 `payments not configured`
pre-check — returned when `paddleClient` is `null` (no `PADDLE_API_KEY`) — applies **only to
`POST /api/admin/qa-rollback`**, because `resetQaAccount` is the only one of the three operations
that actually calls `paddleClient` (to list/cancel subscriptions). The original version of this
contract required `qa-set-email` to share the same 503 check "to mirror the existing
`/api/paddle/*` 503 pattern so this endpoint fails the same way as every other Paddle-backed
route" — that rationale does not apply: `qa-set-email` is not a Paddle-backed route, it talks only
to Supabase auth via `authClient.auth.admin.updateUserById`. Coupling it to `paddleClient`'s
presence told a QA agent without `PADDLE_API_KEY` configured "payments not configured" when it
tried to set an email — a misleading dead end inside the very harness this feature builds for
truthfulness. `qa-set-paid-state` (added by tasks_critique B2, below) never touches `paddleClient`
either, for the same reason: it only re-establishes DB state a real checkout would have produced.
Both `qa-set-email` and `qa-set-paid-state` therefore call `createQaAccountTools({ paddleClient,
supabase })` and invoke their operation directly, with no `paddleClient`-null pre-check.

## `POST /api/admin/qa-rollback`

**Gate**: `requireLocalhost` only (not `requireAdmin` — Settled decision 7 is explicit that
`requireAdmin` is a no-op outside `NODE_ENV=production` and must not be relied on).

**Request body**: `{ "userId": "<uuid>" }` — the target `public.users.id` / Supabase auth user id.
No default/implicit "current session" target: an explicit `userId` keeps the endpoint's blast
radius auditable and matches the CLI wrapper's explicit-argument shape.

**Response** (200):
```json
{ "reset": true, "canceledSubscriptions": ["<paddle-subscription-id>", ...] }
```
`canceledSubscriptions` is empty when there was nothing to cancel (FR-008 idempotence — this is
success, not a partial failure).

**Errors**:
- 400 `{ "error": "userId is required" }` — missing body field.
- 503 `{ "error": "payments not configured" }` — mirrors the existing `/api/paddle/*` 503 pattern
  (`paddleRoutes.js:24-26`) when `PADDLE_API_KEY` is unset, so this endpoint fails the same way as
  every other Paddle-backed route rather than inventing a new "unconfigured" shape.
- 500 on any unexpected Supabase/Paddle SDK error, logged via the existing `logError` helper
  (`server/logger.js`, used throughout `paddleProcessor.js`/`paddleRoutes.js`).

**Non-localhost caller**: 403 `{ "error": "Admin endpoints are localhost-only" }` — the existing
`requireLocalhost` response body verbatim (`index.js:2919`), not a bespoke message.

## `POST /api/admin/qa-set-email`

**Gate**: `requireLocalhost` only (same rationale as above — Settled decision 9's "the same gating
seam as decision 7's rollback endpoint").

**Request body**: `{ "userId": "<uuid>", "email": "<string>" }`.

**Effect**: `authClient.auth.admin.updateUserById(userId, { email, email_confirm: true })` — the
service-role auth client already constructed for `server/index.js`'s `loadUser` middleware
(`authClient.auth.getUser(token)`, `index.js:531`) is the same client instance reused here, not a
second client construction.

**Response** (200): `{ "emailSet": true }`.

**Errors**: 400 missing `userId`/`email`; 500 on an `auth.admin.updateUserById` failure (surfaced
verbatim via `logError` + the error message, matching every other route's error shape in this
file).

**Why no confirmation round-trip**: unlike `supabase.auth.updateUser({email})` called from the
browser (which requires the user to click a confirmation link before the email takes effect —
Settled decision 9's stated reason for rejecting that approach), the service-role admin API with
`email_confirm: true` sets the email immediately, matching the synchronous "set then re-open
checkout" flow AC3/US2 needs.

## `POST /api/admin/qa-set-paid-state`

Added by tasks_critique B2 (2026-09-08): a way to re-establish `tier='paid'` + a matching
`paddle_customer_id` on a QA account, addressed by user id. Without this, the downgrade-transition
assertions in US2 (`subscription-updated-paused`, `subscription-canceled`,
`subscription-updated-past-due`) are vacuous after the first one — the row is already `free` by
the time the second and third fixtures are sent, and neither the free/pro toggle at `set-tier.js`
(which writes only `tier`, never `paddle_customer_id` — `connect-four/server/scripts/set-tier.js:27-28`)
nor a rollback can restore that state. It is also the mechanism US1's coverage tasks use to reach
the billing-portal 400 path (a `paddle_customer_id: null` call) and to re-link an account for a
post-reset replay of a synthetic webhook fixture (US1 Acceptance Scenario 5).

**Gate**: `requireLocalhost` only (same rationale as the other two routes above).

**Request body**: `{ "userId": "<uuid>", "paddleCustomerId": "<paddle-customer-id>" | null }` — a
`null` `paddleCustomerId` is a valid, intentional input (used to reach the portal's no-customer-id
400 path while keeping `tier='paid'`).

**Effect**: `createQaAccountTools({ paddleClient, supabase }).setQaAccountPaidState({ userId,
paddleCustomerId })` — a single `supabase.from('users').update({ tier: 'paid', paddle_customer_id:
paddleCustomerId }).eq('id', userId)`, writing both fields together in one call (mirroring the
same NF1 pairing discipline `resetQaAccount` already uses, in the opposite direction). This
function never calls `paddleClient` — it does not perform any real Paddle-side action, it only
re-creates the DB state a real checkout would have left behind.

**Response** (200): `{ "paidStateSet": true }`.

**Errors**: 400 `{ "error": "userId is required" }` — missing body field (`paddleCustomerId` may
legitimately be absent/`null`); 500 on a Supabase update error (surfaced verbatim via `logError`,
matching every other route's error shape in this file).

**Non-localhost caller**: 403 `{ "error": "Admin endpoints are localhost-only" }`, same as the
other two routes.

**Why this is a DB-only write, not a real Paddle action**: this endpoint exists to give the QA
harness a way to *rehearse* downgrade transitions and portal-error states repeatably, not to
simulate a real purchase — a real purchase is what US2's checkout sweep (T018) already drives.
Using it to fabricate a `paddle_customer_id` that does not correspond to any real Paddle sandbox
customer is fine for the downgrade-fixture and portal-400 use cases above (both only need the
`users` row to be in a particular shape), but it must never be used to *skip* driving a real
checkout where FR-012's "at least one completed sandbox transaction" is the thing under test.
