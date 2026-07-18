# Phase 0 Research: Paddle Checkout Migration

All decisions below are grounded against `docs/payment_provider_research.md`, the epic's own
"Settled decisions"/"Non-obvious facts" (`polish_epic.md` § Epic 10, reflected verbatim where
cited), CLAUDE.md § "Paddle integration", and live queries against the `paddle-docs` MCP
server (`mcp__plugin_paddle_paddle-docs__search_paddle_knowledge_sources`) run during this
planning session. No item below is a training-data guess about the current Paddle API.

## 1. Route naming — `/api/paddle/*`

**Decision**: Rename every `/api/stripe/*` route to `/api/paddle/*`.

**Rationale**: Epic 10 Settled decisions (`polish_epic.md:1831-1836`) name this the
recommended default — keeping `/api/stripe/config` while serving Paddle prices would be
actively misleading, and there is no external integration depending on the current paths
(first-party SPA only). spec.md Open Questions §1 keeps this `/clarify`-eligible in principle,
but no clarify session overrode it, so this plan applies the recommended default as final.

**Alternatives considered**: Keep-and-alias `/api/stripe/*` pointed at the Paddle processor.
Rejected — same rationale as the epic: honesty over compatibility, zero external consumers to
protect.

**Concrete mapping** (old → new), cited against `stripeRoutes.js`:
- `GET /api/stripe/config` (`stripeRoutes.js:25`) → `GET /api/paddle/config`
- `POST /api/stripe/create-checkout` (`stripeRoutes.js:39`) → `POST /api/paddle/create-checkout`
- `POST /api/stripe/webhook` (`stripeRoutes.js:59`) → `POST /api/paddle/webhook`
- `POST /api/stripe/verify-session` (`stripeRoutes.js:76`) → `POST /api/paddle/verify-transaction` (renamed, not just re-pathed — see §4, the fallback's job changes from "verify a Checkout Session" to "verify a Transaction")
- `POST /api/stripe/portal` (`stripeRoutes.js:95`) → `POST /api/paddle/portal`

## 2. DB identifier naming — `paddle_customer_id` / `payment_events`

**Decision**: Additive migration renaming `users.stripe_customer_id` → `users.paddle_customer_id`
and `stripe_events` → `payment_events` (columns: `stripe_event_id` → `event_id`, `event_type`,
`payload jsonb`, `processed_at`).

**Rationale**: Epic 10 Settled decisions (`polish_epic.md:1837-1843`) — no live rows exist
(Non-obvious facts confirms zero real Stripe customers), so there is no data-preservation cost,
and keeping Stripe-named columns after Stripe is deleted is the exact stale-naming trap
CLAUDE.md warns about elsewhere in this codebase.

**Sites requiring the edit** (both allowlists, per memory `project_user_column_propagation`,
cited verbatim in the epic): `server/userHelpers.js`'s `USER_PROFILE_SELECT_COLUMNS`
(`server-conventions.md:946`, currently `'tier, deep_reveal_count, deep_reveal_reset_at,
device_uuid, papergames_id, last_import_at, stripe_customer_id'`) and `defaultUserProfile()`
(`:947`, currently sets `stripe_customer_id: null`). Missing either leaves
`req.user.paddle_customer_id` silently `undefined` — the exact OI-2-class trap the epic calls
out.

**Alternatives considered**: Keep Stripe-named columns. Rejected for the same reason as §1 —
`/clarify` override is available but was not exercised.

## 3. Checkout model — Paddle.js overlay (`Paddle.Checkout.open`)

**Decision (already CONFIRMED by the epic, not re-litigated)**: Client-side overlay checkout
replaces the server-built hosted-checkout-URL + full-page-redirect model.
`createCheckout({ userId, email, plan })` returns `{ priceId, customerEmail }` (the plan's
resolved Paddle price id + the user's email for pre-fill) instead of `{ checkoutUrl }`; the
frontend calls `paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customer: { email },
customData: { app_user_id: userId } })`.

**Grounding** (via `paddle-docs` MCP, this session):
`developer.paddle.com/partners/embed-billing/build-seller-integrations/integrate-checkout`
confirms the idiomatic pattern: `Paddle.Checkout.open({ items, customData, settings:
{ successUrl } })`, with `customData` explicitly documented as "echoed back on transaction and
subscription webhooks, so you can tie the purchase to your own records without storing PII in
Paddle" — this is the concrete mechanism for FR-010's ownership check (§7 below), not a
speculative design.

**`successUrl`**: pass the current `returnPath`-derived same-origin URL (reusing
`sanitizeReturnPath`'s existing guard, §6) so `checkout.completed` fires while the user is
still in-app and the return-to-target behavior (spec.md FR-013) is preserved without a
full-page navigation actually occurring.

## 4. Activation fallback — event-driven single check, not a bounded poll

**Decision**: `POST /api/paddle/verify-transaction` replaces `POST /api/stripe/verify-session`.
Body: `{ transactionId: string }` (read off the Paddle.js `checkout.completed` event's
`transaction_id`, not a URL query param — the overlay model has no return-URL round-trip to
carry it). The client fires this **once**, synchronously, from the `checkout.completed`
event handler — not from `checkoutReturnFlow.js`'s current `POLL_SCHEDULE_SECONDS =
[0,2,4,7,10]` bounded-poll loop, which is collapsed to whatever states a single check needs
(`confirming` → `activated` | `failed`).

**Rationale**: `stripeProcessor.js:205`'s `syncCheckoutSession` retrieves a Checkout Session by
id; Paddle's overlay model has no equivalent "session" object to poll — `checkout.completed`
already tells the client synchronously that payment succeeded (per the `paddle:checkout-web`
skill and the epic's Non-obvious facts). The remaining job is exactly "confirm server-side the
transaction is real and belongs to this user," which is a single `paddle.transactions.get(id)`
call, not a retry loop.

## 5. Webhook durability (FR-009) — 2xx only after durable write; DB-failure-injection test

**Decision**: `POST /api/paddle/webhook` verifies the signature via `paddle.webhooks.unmarshal()`
inside one try/catch; on **any** failure — signature mismatch, malformed event, or a downstream
processing failure (idempotency-ledger insert, tier write, or `tracks` insert throwing) —
return a single non-2xx status. Only after the idempotency-ledger insert (`payment_events`)
**and** the tier write (and `tracks` insert, where applicable) have all durably committed does
the handler return 2xx.

**Tension with Paddle's own guidance, resolved explicitly**: the `paddle-docs` MCP result for
"webhooks/about/respond-to-webhooks" recommends **acknowledge fast (2xx within 5s), then queue
the event for async processing** — the opposite ordering from FR-009's "2xx only after durable
recording." This plan deliberately keeps FR-009's ordering (synchronous durable-write-then-ack)
rather than Paddle's queue-then-process pattern, because: (a) the actual work per event is a
single Postgres upsert plus at most one more insert — well inside the 5-second budget, so the
async-queue pattern's main benefit (avoiding timeouts on slow work) doesn't apply here; (b)
FR-009 is an explicit, non-negotiable spec requirement, not a stylistic choice — "the system
MUST treat a webhook event as successfully handled — and only return a success response for it
— after that event's effects... are durably recorded."

**Corrected relationship to the existing Stripe handler — this is NEW required behavior, not a
mirror.** Verified directly against `stripeProcessor.js:140-147`: on a non-`23505`
`stripe_events` insert error, the **current** code logs the error and **still proceeds** to
process the event, returning 2xx — the exact opposite of FR-009's contract. `handleWebhook`'s
Paddle implementation must be built to FR-009's letter (non-2xx on any downstream write
failure, verified error), which is a deliberate **tightening** versus today's Stripe behavior,
not a continuation of it. Do not describe this as "no behavior regression" or "mirrors the
existing pattern" anywhere in tasks/docs derived from this research — the existing pattern is
the bug FR-009 fixes.

**Testability (flagged as Fragile in the epic's own handoff context)**: whether the Paddle
sandbox can simulate "a validly-signed event that fails downstream" (e.g. a live DB outage) is
**unverified** — the sandbox controls what Paddle sends, not what the server's own DB layer
does when asked to write. This plan resolves it with a **test-harness DB-failure injection**,
not a live-sandbox trick. Verified against `stripeProcessor.test.mjs`'s actual mock: it stubs
Supabase methods to **return `{ data, error }` objects**, never to reject a promise (Supabase's
JS client does not throw on write errors — it resolves with an `error` field). The Paddle test
harness must match that shape, not a promise-rejection design. Concretely,
`paddleProcessor.test.mjs` (replacing `stripeProcessor.test.mjs`) constructs `handleWebhook`
with a **stubbed Supabase client** whose `insert()` for the `payment_events` table **resolves**
with `{ data: null, error: { code: 'XXXXX', message: 'simulated write failure' } }` (a non-`23505`
code, so it is not mistaken for the idempotency short-circuit), feeds it a real (or
realistically-shaped) `transaction.completed` payload with a valid signature computed against a
test secret, and asserts: (a) `handleWebhook` surfaces this as a failure (throws, or returns a
result the route layer maps to non-2xx — match whatever `handleWebhook`'s existing return-vs-throw
convention is, confirmed by reading `stripeProcessor.js` first), (b) the route layer's response
is non-2xx, (c) no tier write or `tracks` insert happened (verify the stub's `update`/`insert` on
`users`/`tracks` was never called). This is unit-level, deterministic, and requires no live
Paddle sandbox round-trip — consistent with how `stripeProcessor.test.mjs` already stubs
Supabase's `{ error }`-returning shape for its existing signature-failure tests (read that file
first, per US10.4.5, to confirm the exact stubbing pattern before writing the Paddle
equivalent).

## 6. `sanitizeReturnPath` — preserved as vendor-neutral, stays in `paddleProcessor.js`

**Decision (resolved, not left open)**: The existing `^/(?!/)` same-origin-relative check
(`stripeProcessor.js:30`) moves into `paddleProcessor.js` unchanged and stays there —
**exported** from `paddleProcessor.js`, not extracted into a new shared module. Both call sites
that need it — `POST /api/paddle/create-checkout` (computing the response's `successUrl`, §3/§11)
and the Paddle customer-portal return-path code path (`POST /api/paddle/portal`) — `import
{ sanitizeReturnPath } from './paddleProcessor.js'` inside `paddleRoutes.js`. This mirrors
today's single-home pattern exactly: `stripeProcessor.js` is the one place `sanitizeReturnPath`
is defined today, and `stripeRoutes.js` imports it from there for both the checkout and portal
paths. No new file (`server/returnPathGuard.js` or similar) is introduced for this.

**Rationale**: Epic 10 Non-obvious facts calls this out explicitly as "not Stripe-specific and
must be preserved" (`polish_epic.md:1680-1681`); FR-013 requires it regardless of provider. Two
call sites within the same file that already owns the function is not enough duplication
pressure to justify a new module — Principle II (no speculative abstraction) favors keeping the
existing single-home shape.

## 7. Ownership-check field for the fallback (FR-010) — `custom_data.app_user_id`

**Decision**: `Checkout.open(...)` is called with `customData: { app_user_id: userId }`
(userId = the authenticated `req.user.id` from the `/api/paddle/create-checkout` call that
produced the `priceId`). `POST /api/paddle/verify-transaction` retrieves the transaction via
`paddle.transactions.get(transactionId)`, and rejects (no tier grant, no analytics record) unless
`transaction.customData?.app_user_id === req.user.id`.

**Rationale**: This is the most direct analogue to the existing, already-shipped Stripe pattern
— `stripeProcessor.js:205`'s `syncCheckoutSession` "verifies `session.metadata.user_id ===
req.user.id`" (`api-conventions.md:81`) — swapping Stripe's `session.metadata` for Paddle's
`custom_data`, which the `paddle-docs` MCP confirms is designed for exactly this purpose:
*"Echoed back on transaction and subscription webhooks, so you can tie the purchase to your own
records without storing PII in Paddle"* (`partners/embed-billing/.../integrate-checkout`,
fetched this session). FR-010's "customer identifier, user identifier, or account email as
appropriate" language is deliberately flexible; `custom_data.app_user_id` is chosen over
Paddle's own `customer_id` because a `paddle_customer_id` link is established only lazily (on
first successful payment, via the webhook) — the fallback runs at the moment the very first
payment may not yet have produced that link, so matching on it would fail for exactly the
first-payment case it's meant to protect. Matching on account email is rejected as strictly
weaker (case-sensitivity/normalization risk, and a user could change their email between
checkout and confirmation).

**Applies to the webhook path too**: `handleWebhook`'s `transaction.completed` handler uses the
same `custom_data.app_user_id` to resolve which `users` row to write `tier: 'paid'` +
`paddle_customer_id` to (mirroring the `paddle-docs` webhook-handler example's
`User.findOne({ where: { paddleCustomerId: data.customer_id } })` pattern, but keyed on
`custom_data.app_user_id` instead of a not-yet-established `customer_id`, for the same
first-payment reason).

## 8. Idempotency ledger mechanism — `event_id`-keyed insert, `23505`-as-processed

**Decision (already CONFIRMED by the epic)**: `payment_events` (renamed from `stripe_events`,
§2) with `UNIQUE (event_id)`. `handleWebhook` inserts `{ event_id: event.eventId, event_type,
payload }` **before** any tier write or `tracks` insert; a `23505` unique-violation means
"already processed" and the handler returns `{ handled: false, eventType: 'duplicate' }`,
mirroring `stripeProcessor.js`'s exact `stripe_events`-ledger shape
(`server-conventions.md:928`) and `insertGameBlunder`'s `23505`-as-success dedup pattern.

**Rationale for rejecting pure UPSERT-only convergence** (per the epic's own Settled decision,
`polish_epic.md:1859-1863`): the tier write also fires a **non-idempotent-by-nature** side
effect — the `tracks` `upgrade_completed` analytics insert (FR-007/FR-008) — which needs the
same "first delivery only" guard the insert-then-`23505` pattern gives today. A pure UPSERT
on `users.tier` would converge fine on its own, but would not prevent a second `tracks` insert
on retried delivery.

**Grounding**: the `paddle-docs` MCP confirms Paddle's own guidance is exactly "use `event_id`
as deduplication key when processing webhooks" (`partners/embed-billing/get-started/api-basics`)
— this plan's mechanism is Paddle's documented recommendation, not an invention.

## 9. Frontend env-var convention — `VITE_*`, `import.meta.env`

**Decision**: The sandbox/production checkout-model switch (US10.2.5's
`Paddle.Environment.set('sandbox')` + `test_`-prefixed client token) is gated on
`import.meta.env.MODE`/a `VITE_PADDLE_*` var, **not** a Next.js-style `NEXT_PUBLIC_*` var (the
epic's own US10.2.4 task explicitly flags this as unconfirmed and to check before use).

**Grounding**: `rg "import.meta.env" connect-four/src` shows the existing convention in every
comparable file — `src/lib/useStripePrices.js:22` `const API =
import.meta.env?.VITE_API_BASE_URL || ''`, `src/lib/useUpgradeCheckout.js:10` (same pattern),
`src/lib/devBoardParam.js:41` `import.meta.env?.DEV`. This app is Vite, not Next.js; `VITE_*` is
the only convention that exists in this codebase. New vars: `VITE_PADDLE_CLIENT_TOKEN_SANDBOX`
(or a single `VITE_PADDLE_CLIENT_TOKEN` read differently per `import.meta.env.MODE`) and no
`NEXT_PUBLIC_*` var is introduced anywhere.

## 10. Test-file disposition — confirm before deleting

**Decision**: Per US10.4.5, `tests/unit/checkoutReturnFlow.test.js` is **not** deleted outright
— `checkoutReturnFlow.js` itself is flagged in the epic's Non-obvious facts as "pure/
vendor-agnostic logic" (its only Stripe reference is a doc comment). This plan's task list
(next command) must read the file first and either (a) edit the test in place to match the
collapsed single-check states (§4), or (b) confirm it is genuinely reusable as-is if the poll
schedule survives as a degenerate one-step case. `tests/fixtures/stubProcessor.js` gets the same
read-first treatment (it stubs the vendor-neutral `PaymentProcessor` interface, so it likely
needs zero changes — but this must be confirmed, not assumed, per the "verify at the source
layer" project convention).

## 11. Checkout→confirm wiring — `useUpgradeCheckout.js`'s handler owns `transactionId`

**Decision**: `useUpgradeCheckout.js`'s `checkout.completed` Paddle.js event handler is the
**sole owner** of `transactionId` and the sole caller of `POST /api/paddle/verify-transaction`.
On receiving the event, the handler reads `event.data.transaction_id`, calls
`verify-transaction` directly, and writes the resulting `confirming` → `activated`|`failed`
state into `checkoutReturnFlow.js`'s shared store (the same store the collapsed single-check
state machine from §4 already describes). `CheckoutReturnBanner.jsx` is a **pure renderer** of
that shared state — it does not read `transactionId`, does not call `verify-transaction` itself,
and does not own any confirmation logic. This mirrors the general shape of the existing
redirect-based flow (where the return-URL round-trip used to carry the confirmation signal into
`CheckoutReturnBanner.jsx`'s mount effect) but relocates the trigger to the event handler since
the overlay model has no return-URL round-trip to mount into.

**Rationale**: Keeps `CheckoutReturnBanner.jsx` (a display component, per its existing name and
role) free of network/fetch responsibility, consistent with the codebase's existing
separation between hooks-that-call-the-server (`useUpgradeCheckout.js`) and
components-that-render-state (`CheckoutReturnBanner.jsx`). Avoids a race where both the handler
and the banner could independently call `verify-transaction` for the same transaction.

## Summary — all NEEDS CLARIFICATION resolved

No unresolved `NEEDS CLARIFICATION` markers remain in Technical Context. Both spec.md Open
Questions (route rename, DB-identifier rename) are resolved to the epic's recommended default
(§1, §2) since no `/clarify` session overrode them before this plan was written.
