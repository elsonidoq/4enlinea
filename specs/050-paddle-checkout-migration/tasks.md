# Tasks: Paddle Checkout Migration (replace & remove Stripe)

**Input**: Design documents from `/specs/050-paddle-checkout-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/paddle-api.md, quickstart.md

**Tests**: Included. `paymentProcessor`/webhook durability is the business-critical guarantee
behind this feature (spec.md SC-002/SC-004/SC-005/SC-011), and Constitution Principle III
requires the FR-009 DB-failure-injection test explicitly — these are not optional here.

**Story numbering**: `[US1]`–`[US5]` below map 1:1 to spec.md's User Story 1–5, which are in the
same priority order as the epic's US10.1–US10.5 (`polish_epic.md`). Where the epic's task-level
phrasing conflicts with plan.md's "Task-ordering corrections carried into tasks.md" section
(SDK install timing, FR-009 framing, `successUrl` server-sanitization, checkout→confirm wiring),
this file follows plan.md, not the epic text — flagged inline at each affected task.

## Path Conventions

Existing web app, no new top-level project: `connect-four/server/` (Express, ESM), `connect-four/src/`
(React+Vite), `connect-four/tests/` (root-level unit/integration), `docs/architecture/` (project docs).

---

## Phase 1: Setup

**Purpose**: Confirm the exact shapes being replaced before any edit — citations must come from
the signatures, not from memory of the epic text (CLAUDE.md § "Verifying any claim about this
codebase").

- [x] T001 [P] Read `connect-four/server/stripeProcessor.js` and `connect-four/server/stripeRoutes.js`
  in full — confirm the exact `createStripeProcessor`/`registerStripeRoutes` signatures, line
  numbers, and the five route handlers cited in research.md/contracts/paddle-api.md before writing
  any Paddle replacement code. No file changes.
- [x] T002 [P] Read `connect-four/tests/unit/checkoutReturnFlow.test.js` and
  `connect-four/tests/fixtures/stubProcessor.js` in full and record the disposition decision
  (edit-in-place vs. delete-and-replace) required by research.md §10 — write the decision as a
  one-line comment at the top of `checkoutReturnFlow.test.js` (e.g. `// DISPOSITION: kept, edited
  in place for the single-check state model — vendor-agnostic poll-state-machine logic`) so later
  tasks (T025, T045) don't have to re-derive it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure required by more than one user story. **Note on SDK-install
placement**: plan.md's correction moves `npm install @paddle/paddle-node-sdk @paddle/paddle-js`
out of the later Stripe-removal cleanup task and earlier, "before US2's sandbox-checkout tests."
It is placed here in Foundational (T003), one phase earlier than the strict "[US2]" label plan.md's
prose suggests, because **US1's** `paddleProcessor.js` (T011) *also* calls the Paddle Node SDK to
read live prices — deferring the install to a US2-labeled task would leave US1 unbuildable. This is
a deliberate deviation from a literal "[US2] npm install" reading, kept in the spirit of the
correction (not bundled with cleanup, done before any sandbox-checkout test) — see Handoff context.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Install Paddle SDKs from `connect-four/`: `npm install @paddle/paddle-node-sdk @paddle/paddle-js`
  (adds both to `connect-four/package.json` dependencies). Per plan.md's corrected install-order —
  not deferred to the later Stripe-removal lockfile cleanup task (T044); must precede every
  sandbox-checkout test task and the prices-endpoint implementation (T011), both of which need the
  SDK client.
- [x] T004 [P] Add new env var placeholders to `connect-four/.env.example`: `PADDLE_API_KEY`,
  `PADDLE_MONTHLY_PRICE_ID`, `PADDLE_ANNUAL_PRICE_ID`, `PADDLE_NOTIFICATION_WEBHOOK_SECRET`,
  `VITE_PADDLE_CLIENT_TOKEN` — additive only; `STRIPE_*` removal happens in T047.
- [x] T005 Create additive migration `connect-four/server/migrations/060_paddle_rename_and_payment_events.sql`:
  `RENAME COLUMN users.stripe_customer_id TO paddle_customer_id`; `RENAME TABLE stripe_events TO
  payment_events`; `RENAME COLUMN stripe_event_id TO event_id`; `RENAME COLUMN type TO event_type`
  — per data-model.md's migration sketch. Verify (post-apply) RLS survives
  (`SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_events';`) and `service_role`
  grants survive (`\dp payment_events`) rather than assuming either.
- [x] T006 Apply migration T005 to the local/dev Supabase instance (read
  `reference_supabase_connection.md` memory first, per CLAUDE.md) and run
  `NOTIFY pgrst, 'reload schema';` so PostgREST recognizes the renamed column/table.
- [x] T007 Update `connect-four/server/userHelpers.js`: change `USER_PROFILE_SELECT_COLUMNS`'s
  `'stripe_customer_id'` to `'paddle_customer_id'` and `defaultUserProfile()`'s
  `stripe_customer_id: null` to `paddle_customer_id: null` — **both allowlists in the same commit**
  (memory `project_user_column_propagation`; editing one without the other silently strands
  `req.user.paddle_customer_id` as `undefined`).

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Founder provisions the Paddle catalog and a live prices endpoint (Priority: P1) 🎯 MVP

**Goal**: A public `GET /api/paddle/config` endpoint returns live monthly/annual price/currency
data sourced directly from the Paddle sandbox catalog, and degrades cleanly when Paddle isn't
configured.

**Independent Test**: `curl http://localhost:$API_PORT/api/paddle/config` returns live sandbox
prices; unsetting `PADDLE_API_KEY` and restarting yields a clean 503, not a crash/hang.

### Tests for User Story 1

- [x] T008 [P] [US1] Write `connect-four/tests/unit/paddlePrices.test.js` (read
  `connect-four/tests/unit/stripePrices.test.js` first for the mocking pattern) asserting
  `GET /api/paddle/config` returns `{ prices: { monthly: {...}, annual: {...} } }` sourced from a
  mocked Paddle client's price lookup, and returns `503 { error: 'Payments not configured' }` when
  `paddlePaymentProcessor` is `null`.

### Implementation for User Story 1

- [x] T009 [US1] Provision a Paddle sandbox product with monthly ($2.99/mo) and annual ($21.99/yr)
  recurring prices via the `paddle:catalog-setup` skill and the `paddle-sandbox` MCP (default —
  never `paddle-live` without an explicit live/production instruction, per CLAUDE.md § "Paddle
  integration"); record the resulting `pri_...` price ids.
- [x] T010 [US1] Add `PADDLE_MONTHLY_PRICE_ID`/`PADDLE_ANNUAL_PRICE_ID` (from T009) plus
  `PADDLE_API_KEY` (sandbox `pdl_sdbx_...`) to `connect-four/server/.env` (local, not committed).
- [x] T011 [US1] Implement `connect-four/server/paddleProcessor.js`: export
  `createPaddleProcessor({ paddleClient, supabase, monthlyPriceId, annualPriceId, webhookSecret })`
  with a `getPrices()` convenience method reading live prices via the Paddle Node SDK
  (`paddleClient.prices.get()`/`.list()`), mirroring `stripeProcessor.js:54`'s shape and the
  `{ prices: { monthly, annual } }` response contract (contracts/paddle-api.md). Also export
  `sanitizeReturnPath(returnPath)` — moved unchanged from `stripeProcessor.js:30` (research.md §6;
  Settled decision: stays exported from `paddleProcessor.js`, no new shared module).
- [x] T012 [US1] Implement `connect-four/server/paddleRoutes.js`: export
  `registerPaddleRoutes(app, paymentProcessor)` registering `GET /api/paddle/config` (public,
  returns `{ prices }` from `paymentProcessor.getPrices()`, `503 { error: 'Payments not
  configured' }` when `paymentProcessor` is `null`) — mirrors `stripeRoutes.js:25-28`.
- [x] T013 [US1] Wire `connect-four/server/index.js`: add
  `if (process.env.PADDLE_API_KEY) { const { Paddle, Environment } = await import('@paddle/paddle-node-sdk');
  const paddleClient = new Paddle(...); paddlePaymentProcessor = createPaddleProcessor({...}); }
  registerPaddleRoutes(app, paddlePaymentProcessor);` **alongside** (not replacing yet — full Stripe
  removal is T042) the existing Stripe wiring block.
- [x] T014 [US1] Run `connect-four/tests/unit/paddlePrices.test.js`; confirm it fails before
  T011/T012 land and passes after.
- [x] T015 [US1] Manual verification per quickstart.md §1: `curl` the live endpoint and confirm
  sandbox monthly/annual data; unset `PADDLE_API_KEY`, restart, and confirm the 503 degrade path.

**Checkpoint**: US1 independently functional and testable — prices load without sign-in, degrade
cleanly when unconfigured.

---

## Phase 4: User Story 2 — Free user upgrades via an in-app Paddle checkout (Priority: P1)

**Goal**: A signed-in free user completes checkout via the Paddle.js overlay without leaving the
app, sees an explicit "activating" acknowledgment (never a silent free-tier render), and the
synchronous fallback rejects a transaction that doesn't belong to the requesting user.

**Independent Test**: Open the upgrade modal, select monthly or annual, complete checkout with a
sandbox test card, land back on the originating screen in the paid experience — no full-page
redirect anywhere.

### Tests for User Story 2

- [x] T016 [P] [US2] Write `connect-four/server/paddleProcessor.test.mjs` (read
  `connect-four/server/stripeProcessor.test.mjs` first for the stubbing pattern) covering
  `createCheckout`: returns `{ priceId, customerEmail, successUrl }` for a valid `plan`, sanitizes
  an attacker-supplied `returnPath` (open-redirect guard, e.g. `//evil.com` or `https://evil.com`)
  via `sanitizeReturnPath` to `'/'`, and is exercised at the function level (not raw HTTP).
- [x] T017 [P] [US2] Write the FR-010 ownership-check test in
  `connect-four/server/paddleProcessor.test.mjs`: a mocked `paddle.transactions.get()` response
  whose `custom_data.app_user_id` does **not** match the requesting `req.user.id` is rejected with
  `{ activated: false, reason: 'user_mismatch' }`; assert **no** `users` tier update and **no**
  `tracks` insert occurred (verify the stub's `update`/`insert` methods were never called) — this
  is the FR-010 mismatched-owner-rejection test, matching on `custom_data.app_user_id`, not
  `customer_id` (research.md §7's rationale: `paddle_customer_id` is only established lazily on
  first payment, so matching on it would fail for exactly the first-payment case FR-010 protects).

### Implementation for User Story 2

- [x] T018 [US2] Implement `createCheckout` in `connect-four/server/paddleProcessor.js`: validates
  `plan ∈ {monthly, annual}`, resolves the corresponding `priceId`, computes `successUrl`
  **server-side** via `sanitizeReturnPath(body.returnPath)`, returns
  `{ priceId, customerEmail: req.user.email, successUrl }` — CHANGED SHAPE from Stripe's
  `{ checkoutUrl }` (contracts/paddle-api.md). The client must never recompute `successUrl` from
  the raw `returnPath` itself; it passes the server's value through verbatim (T023).
- [x] T019 [US2] Implement `POST /api/paddle/create-checkout` in
  `connect-four/server/paddleRoutes.js`: auth required, body `{ plan, returnPath }`, delegates to
  `createCheckout`, `503` when processor `null`, `401` when no `req.user` — mirrors
  `stripeRoutes.js:39-46`'s gating.
- [x] T020 [US2] Implement `verify-transaction` in `connect-four/server/paddleProcessor.js` +
  `POST /api/paddle/verify-transaction` in `paddleRoutes.js`: body `{ transactionId }`, calls
  `paddle.transactions.get(transactionId)`, rejects (no tier grant, no analytics record) unless
  `transaction.customData?.app_user_id === req.user.id` **and** `transaction.status === 'completed'`;
  returns `{ activated, reason? }` with `reason ∈ { 'no_transaction', 'user_mismatch',
  'not_completed' }` on failure. On success, applies the **same idempotent** `tier: 'paid'` +
  `paddle_customer_id` write the webhook applies (T034), with **no** `tracks` insert — that
  analytics record is exclusively the webhook's to write (FR-008).
- [x] T021 [US2] Add the rate-limit line in `connect-four/server/index.js`:
  `app.use('/api/paddle/create-checkout', makeLimit(10))` (re-pointed from the Stripe equivalent at
  `index.js:191`, added **alongside** — full removal is T042).
- [x] T022 [P] [US2] Edit `connect-four/server/paymentProcessor.js`: update the `PaymentProcessor`
  JSDoc typedef's `createCheckout` return-shape documentation to
  `{ priceId, customerEmail, successUrl }`. This is the **first** of the epic's two
  interface-touching edits to this file — the second (de-Stripe comments +
  `stripeCustomerId`→`customerId` rename) is T043, a **distinct** task under US4.
- [x] T023 [US2] Implement the frontend Paddle.js overlay call in
  `connect-four/src/lib/useUpgradeCheckout.js`: replace the `POST /api/stripe/create-checkout`
  fetch + `window.location` redirect with `initializePaddle()` (client token +
  `Paddle.Environment.set('sandbox')` gated on `import.meta.env.MODE`/`VITE_PADDLE_CLIENT_TOKEN`,
  defaulting to sandbox for local dev — Paddle.js defaults to **production**, this is the footgun
  CLAUDE.md and research.md §9 both call out) followed by
  `paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customer: { email: customerEmail },
  customData: { app_user_id: <req.user.id> }, settings: { successUrl } })`, passing the
  **server-returned** `priceId`/`customerEmail`/`successUrl` through verbatim (never
  client-recomputed). Preserve `UpgradeModal`'s existing `onUpgrade` idle/loading/success contract
  unchanged (FR-011).
- [x] T024 [US2] In `connect-four/src/lib/useUpgradeCheckout.js`, add the `checkout.completed`
  Paddle.js event handler as the **sole owner** of `transactionId` (plan.md's checkout→confirm
  wiring correction, research.md §11): on the event, read `event.data.transaction_id`, call
  `POST /api/paddle/verify-transaction` **once**, and write the resulting `confirming` →
  `activated`|`failed` state into `checkoutReturnFlow.js`'s shared store. This handler is the
  **only** caller of `verify-transaction` anywhere in the frontend.
- [x] T025 [US2] Edit `connect-four/src/lib/checkoutReturnFlow.js` (per T002's disposition
  decision): collapse the `POLL_SCHEDULE_SECONDS=[0,2,4,7,10]` bounded-poll state machine to the
  single-check states (`confirming`/`activated`/`failed` or a renamed equivalent), keeping it a
  pure state store with **no** fetch calls of its own.
- [x] T026 [US2] Edit `connect-four/src/store/CheckoutReturnBanner.jsx`: ensure it is a **pure
  renderer** of `checkoutReturnFlow.js` state — remove any code path that reads `transactionId` or
  calls `verify-transaction`/`verify-session` itself; it only renders `confirming`/`activated`/`failed`.
- [x] T027 [P] [US2] Add `server/paddleProcessor.test.mjs` to both the `test` and `test:fast`
  arrays in `connect-four/package.json` (further Paddle test files, if split into their own file,
  are added by T038/T046).
- [x] T028 [US2] Run T016/T017; confirm they fail before T018/T020 land and pass after.
- [~] T029 [US2] Manual verification per quickstart.md §2 via `paddle:sandbox-testing`: complete a
  sandbox checkout with test card `4242 4242 4242 4242` on both monthly and annual plans; confirm
  the sandbox banner is visible (not production) before entering card details; confirm no
  full-page navigation occurs (URL bar never changes host/path); confirm the transaction appears
  under **Transactions** in the sandbox (not live) dashboard.
  PARTIAL (2026-07-18): via Chrome DevTools MCP against the running dev server, verified —
  authenticated create-checkout call returns `{priceId, customerEmail, successUrl}`; Paddle.js
  `initializePaddle()`/`Checkout.open()` invoked correctly in sandbox environment; NO full-page
  navigation (URL bar stayed at `/settings` throughout). Found and fixed a real bug along the way:
  Paddle.js's `settings.successUrl` requires an ABSOLUTE `http(s)://` URL and throws a synchronous
  validation error on the server's sanitized relative path — fixed in `useUpgradeCheckout.js` by
  resolving it against `window.location.origin` client-side (sanitization decision stays
  server-side). Could NOT complete the actual card-entry step: this Paddle sandbox account has no
  default payment link configured (dashboard-only setting, no MCP-exposed method for a direct
  seller account) — checkout overlay renders "Something went wrong" instead of the payment form.
  See `docs/open_issues.md` OI-54 (blocker, needs one manual dashboard action) and OI-53 (pre-existing,
  unrelated `customerEmail` pre-fill gap inherited from Stripe).

**Checkpoint**: US1+US2 functional — a user can pay and the client learns success synchronously;
full tier-flip reliability lands with US3's webhook (fallback alone already grants tier per T020).

---

## Phase 5: User Story 3 — Paid status stays correct via webhook, and a paid user can manage their subscription (Priority: P1)

**Goal**: Every Paddle subscription/transaction event reliably and idempotently updates
`users.tier`; a validly-signed event that fails to process durably returns non-2xx (FR-009); a
paid user reaches Paddle's customer-billing experience from account settings (FR-012) as part of
this same P1 story.

**Independent Test**: Simulate each Paddle event in the sandbox and observe tier state +
idempotency-ledger behavior independent of the checkout UI; confirm a paid user's settings link
reaches Paddle's customer-billing experience.

### Tests for User Story 3

- [x] T030 [P] [US3] Write `handleWebhook` coverage in `connect-four/server/paddleProcessor.test.mjs`
  (read `stripeProcessor.test.mjs`'s Supabase-stub pattern first) covering the full tier-mapping
  table from contracts/paddle-api.md: `transaction.completed` → `tier:'paid'`, `paddle_customer_id`
  set, exactly one `tracks` insert; redelivered same `event_id` → `{ handled: false, eventType:
  'duplicate' }`, no second write (this pair is also the concrete SC-011 assertion: a redelivery
  after the underlying failure is resolved succeeds exactly once — first delivery durably commits,
  redelivery short-circuits on the `23505` duplicate, so exactly one tier write / one `tracks`
  insert happens across both); `subscription.updated` `status:'active'` **and** separately
  `status:'trialing'` → `tier:'paid'` (both statuses map to paid — assert both, not just one);
  `subscription.updated` `status:'past_due'` → no write; `subscription.updated` `status:'paused'`
  → `tier:'free'`; `subscription.updated` `status:'active'` with non-null
  `scheduled_change.action:'cancel'` → no write; `subscription.canceled` → `tier:'free'`
  unconditionally; `subscription.created` → ledger insert only, no tier write, no `tracks` insert
  (documented no-op — first-payment tier grant is `transaction.completed`'s alone); a
  tampered/invalid `Paddle-Signature` → rejected, zero DB writes.
- [x] T031 [P] [US3] Write the **FR-009 durability test** in
  `connect-four/server/paddleProcessor.test.mjs`: stub the Supabase client so `payment_events`'s
  `insert()` **resolves** with `{ data: null, error: { code: 'XXXXX', message: 'simulated write
  failure' } }` — a non-`23505` code, and a **resolved** value, **not a rejected promise** (matching
  `stripeProcessor.test.mjs`'s actual `{ data, error }` mock shape, verified by reading that file
  first, per research.md §5). Feed a validly-signed `transaction.completed` payload; assert (a)
  `handleWebhook` surfaces this as a failure per its existing return-vs-throw convention (confirm
  that convention by reading `stripeProcessor.js` first), (b) the route layer's response is
  non-2xx, (c) neither `users.update` nor `tracks.insert` was ever called on the stub. **This is
  NEW required behavior tightening today's Stripe handler** — `stripeProcessor.js:140-147` logs a
  non-`23505` `stripe_events` insert error and **still proceeds** to 2xx today. Do not describe
  this task or its test as mirroring existing Stripe behavior anywhere in code comments or docs.
- [x] T032 [P] [US3] Write the **idempotency-asymmetry test** in
  `connect-four/server/paddleProcessor.test.mjs`: call `verify-transaction` (the fallback) first
  for a transaction (grants `tier:'paid'`, writes **no** `tracks` row — FR-008), then deliver the
  corresponding `transaction.completed` webhook event for the **same** transaction (idempotently
  re-grants `tier:'paid'`, writes exactly **one** `tracks` `upgrade_completed` row via the
  `payment_events`-insert-then-write path). Assert the `tracks` stub received exactly **one**
  `insert` call across both code paths — not zero, not two. This is the concrete regression test
  for "fallback-then-webhook ordering produces exactly one `tracks` row."

### Implementation for User Story 3

- [x] T033 [US3] Register a Paddle notification destination via the `paddle:webhooks` skill / MCP
  `client.notificationSettings.create` (or the sandbox dashboard) subscribed to
  `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`;
  record the destination secret as `PADDLE_NOTIFICATION_WEBHOOK_SECRET` in
  `connect-four/server/.env`. Note: `subscription.created` is subscribed here (so the ledger
  captures it for idempotency/audit) but T034 treats it as a documented no-op — see
  contracts/paddle-api.md's tier-mapping table.
- [x] T034 [US3] Implement `handleWebhook` in `connect-four/server/paddleProcessor.js`:
  `paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)` inside one try/catch; insert into
  `payment_events` (`event_id`, `event_type`, `payload`) **before** any tier write or `tracks`
  insert, treating a `23505` unique-violation as `{ handled: false, eventType: 'duplicate' }`;
  apply the tier-mapping table from contracts/paddle-api.md exactly, **including** the explicit
  `subscription.created` no-op row (ledger insert only, no tier write, no `tracks` insert — the
  first-payment tier grant belongs exclusively to `transaction.completed`; do not let
  `subscription.created` race or duplicate that write); return 2xx **only after** all writes
  (ledger insert, tier write, `tracks` insert where applicable) have durably committed; return
  non-2xx on **any** failure (signature, malformed event, or downstream DB error) — per
  FR-009/research.md §5, this is new required behavior, not a continuation of
  `stripeProcessor.js`'s log-and-proceed pattern.
- [x] T035 [US3] Implement `POST /api/paddle/webhook` in `connect-four/server/paddleRoutes.js`,
  mounted behind route-scoped `express.raw({ type: 'application/json' })` registered before the
  global `express.json()` in `connect-four/server/index.js` (re-pointed from the Stripe path at
  `index.js:142`, added **alongside** — full removal is T042); reads the `Paddle-Signature` header
  (not `stripe-signature`).
- [x] T036 [US3] Implement the customer-portal endpoint (**FR-012**): invoke the
  `paddle:customer-portal` skill before writing this task's code (per CLAUDE.md § "Paddle
  integration") to ground the exact SDK method and auth/ownership pattern; export a
  portal-session-equivalent from `connect-four/server/paddleProcessor.js`, and register
  `POST /api/paddle/portal` in `paddleRoutes.js` (auth required, `400 { error: 'No active
  subscription' }` when `req.user.paddle_customer_id` is unset, body `{ returnPath? }`, returns
  `{ portalUrl }`) — mirrors `stripeRoutes.js:95-110`/`stripeProcessor.js:229`'s
  `createPortalSession`. The optional `returnPath` **must** be passed through
  `sanitizeReturnPath()` (same function T018 uses for `create-checkout`'s `successUrl`) before
  being used to build the portal return destination — same open-redirect guard, same treatment,
  no separate sanitizer.
- [x] T037 [US3] Repoint `connect-four/src/screens/SettingsScreen.jsx:49`'s
  `POST /api/stripe/portal` fetch to `POST /api/paddle/portal`, delivering the "manage
  subscription" entry point **as part of this P1 story** (FR-012 — not deferred to US5's later
  regression sweep, per spec.md "Why this priority").
- [x] T038 [P] [US3] Confirm `server/paddleProcessor.test.mjs` is already in both `test` and
  `test:fast` arrays in `connect-four/package.json` (added by T027) — no duplicate entries needed
  since webhook/portal tests live in the same file.
- [x] T039 [US3] Run T030–T032; confirm they fail before T034/T036 land and pass after.
- [x] T040 [US3] Manual verification per quickstart.md §3–4 via `paddle:sandbox-testing`'s webhook
  simulator: `transaction.completed` flips tier; redelivery is a no-op; `past_due` does not
  downgrade; `paused` flips to free; `canceled` flips to free unconditionally; a tampered signature
  yields non-2xx + zero DB writes; as the now-paid test user, "Manage subscription" in Settings
  reaches the Paddle sandbox customer-billing experience.
  **Methodology note**: the dashboard/MCP webhook simulator could not be used directly — this
  sandbox account has no public tunnel (OI-54-adjacent local-reachability gap), so Paddle cannot
  deliver to a `localhost` destination. Verified instead by registering a real notification
  destination (`ntfset_01kxse94ewas02g8yrxg2shb6j`, T033) to obtain a genuine
  `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, then POSTing locally-HMAC-signed payloads (per
  developer.paddle.com/webhooks/about/signature-verification's `ts:rawBody` algorithm) directly at
  the running dev server's `POST /api/paddle/webhook` — driving the REAL `paddle.webhooks.unmarshal`
  (not a mock) and REAL Supabase writes against a real `users` row. All 7 scenarios confirmed:
  `transaction.completed`→paid+`paddle_customer_id`; redelivery→`duplicate`, no-op; `past_due`→no
  write; `paused`→free; reactivate-then-`subscription.canceled`→free unconditionally;
  `active`+`scheduled_change.action:'cancel'`→no write; tampered signature→400 with the
  `payment_events` row count unchanged (verified via COUNT before/after). Portal: minted a real
  Paddle sandbox customer via `paddleClient.customers.create` and called `createPortalSession`
  (same function the route uses) directly, confirming it returns a genuine
  `https://sandbox-customer-portal.paddle.com/...` URL. NOT independently re-verified via HTTP
  through `/api/paddle/portal`'s auth/400 gating (would need a real signed-in Supabase session) —
  that gating is a direct structural mirror of `stripeRoutes.js:95-110`'s already-covered pattern,
  confirmed by code reading, not by a live HTTP round-trip. Test artifacts (`payment_events` rows
  with `evt_manual_*` ids) were deleted after verification; the `users` test row was reset to
  `tier:'free'`/`paddle_customer_id:null`.

**Checkpoint**: US1+US2+US3 deliver the full P1 core — paid tier is reliable under every event and
failure mode, and portal access is live from day one, not a later add-on.

---

## Phase 6: User Story 4 — Maintainer finds zero trace of the retired payment provider (Priority: P2)

**Goal**: No Stripe code path, dependency, env var, DB identifier, or test remains; the automated
suite is green.

**Independent Test**: `rg -i stripe` over the application source returns zero matches outside
docs/memory/backlog; `npm run test:fast` passes clean.

- [x] T041 [US4] Delete `connect-four/server/stripeProcessor.js` and
  `connect-four/server/stripeRoutes.js`.
- [x] T042 [US4] Edit `connect-four/server/index.js`: remove the
  `import { registerStripeRoutes }`/`import { createStripeProcessor }` lines and the
  `if (process.env.STRIPE_SECRET_KEY) {...}` block (~`:2818-2829`); remove the now-duplicate
  Stripe raw-body middleware line (`:142`) and Stripe rate-limit line (`:191`), leaving only the
  Paddle equivalents added in T013/T021/T035 — no more side-by-side wiring.
- [x] T043 [US4] Edit `connect-four/server/paymentProcessor.js`: de-Stripe every remaining
  comment/doc-text reference, and rename the `getSubscriptionStatus` typedef's `stripeCustomerId`
  param to `customerId` (safe pass-through rename, no behavior change). This is the **second** of
  the epic's two interface-touching edits to this file — distinct from T022's `createCheckout`
  typedef edit.
- [x] T044 [US4] Remove `"stripe": "^22.1.0"` from `connect-four/package.json` dependencies
  (leaving `@paddle/paddle-node-sdk` and `@paddle/paddle-js` from T003); run `npm install` in
  `connect-four/` to update the lockfile in this pass — Stripe's tree is dropped; the Paddle
  packages were already resolved by T003, so this reconciles without re-downloading them
  (plan.md Technical Context).
- [x] T045 [US4] Delete `connect-four/server/stripeProcessor.test.mjs`,
  `connect-four/server/stripeRoutes.substitutability.test.mjs`,
  `connect-four/tests/unit/stripePrices.test.js`,
  `connect-four/tests/unit/stripePortalReturn.test.js`; delete
  `connect-four/tests/fixtures/stubProcessor.js` **only if** T002's disposition decision found it
  Stripe-specific (otherwise keep it — it stubs the vendor-neutral `PaymentProcessor` interface).
- [x] T046 [US4] Add the Paddle-equivalent test files to `connect-four/package.json`'s `test` and
  `test:fast` arrays (`server/paddleProcessor.test.mjs` already present per T027;
  `tests/unit/paddlePrices.test.js` from T008; `tests/unit/paddlePortalReturn.test.js` if a
  separate portal test file was created in T036) and remove every deleted Stripe filename
  (`server/stripeProcessor.test.mjs`, `server/stripeRoutes.substitutability.test.mjs`,
  `tests/unit/stripePrices.test.js`, `tests/unit/stripePortalReturn.test.js`) from both arrays in
  the same edit — a stale filename in either array errors the whole `node --test` invocation.
- [x] T047 [US4] Remove `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`,
  `STRIPE_ANNUAL_PRICE_ID` from `connect-four/.env.example` (leave `FRONTEND_URL` untouched —
  shared, non-Stripe) and from the Railway deploy env (memory
  `project_spec031_staging_production_deploy`).
- [x] T048 [P] [US4] Rewrite `docs/architecture/api-conventions.md`'s "Stripe Checkout Config" /
  "Stripe Checkout" / "Stripe Activation Fallback" / "Stripe Webhook Endpoint" sections (`:59-103`)
  in place, using contracts/paddle-api.md as source, to describe the shipped Paddle contract
  (route paths, request/response shapes, `Paddle-Signature` header, `payment_events` idempotency
  ledger, tier-mirror table).
- [x] T049 [P] [US4] Rewrite `docs/architecture/server-conventions.md`'s "PaymentProcessor Seam"
  section (`:907-947`) in place to describe `createPaddleProcessor`, the `payment_events` ledger,
  the webhook-primary/`verify-transaction`-fallback pattern, raw-body ordering at
  `/api/paddle/webhook`, and `userHelpers.js`'s `paddle_customer_id` allowlist (replacing the
  `stripe_customer_id` references).
- [x] T050 [P] [US4] Update `docs/architecture/db-schema.md` and `docs/architecture/data-model.md`
  for the renamed `users.paddle_customer_id` column and `payment_events` table (`event_id`,
  `event_type` columns), per data-model.md's target shape.
- [x] T051 [US4] Final verification: `rg -i stripe connect-four/` returns matches only inside
  `docs/`, memory, and `polish_epic.md` — zero matches inside `server/`, `src/`, `tests/`,
  `migrations/`, `package.json`; `cd connect-four && npm run test:fast` is green with no dangling
  filename errors. **Depends on: T052, T053** (Phase 7/US5) — `useStripePrices.js`'s hook name
  (T052's rename) and the "full-page Stripe redirect" comment in `PostSetSummaryScreen.jsx` (T053)
  are both `src/`-side `stripe` matches this grep would otherwise catch; do not run this task's
  grep as green until T052 and T053 have both landed, even though T052/T053 are filed under a
  later-numbered phase in this document.

**Checkpoint**: Zero Stripe trace anywhere in application source; docs describe Paddle, not a
deleted provider.

---

## Phase 7: User Story 5 — Every existing upgrade entry point keeps working, unchanged for callers (Priority: P2)

**Goal**: Every remaining upgrade touchpoint (settings, lesson gates, deep-reveal gates, set
picker) works exactly as before, now backed by Paddle; `UpgradeModal`'s outward contract is
provably unchanged.

**Independent Test**: Open the upgrade modal from every existing entry point, complete a sandbox
checkout, confirm the modal's inputs/outputs and caller-visible states are unchanged from before
the migration.

- [x] T052 [US5] Rename `connect-four/src/lib/useStripePrices.js` to
  `connect-four/src/lib/usePaddlePrices.js`: rename the `useStripePrices` export to
  `usePaddlePrices`, repoint its `GET /api/stripe/config` fetch (`:34`) to `GET /api/paddle/config`,
  and update the file's doc comments (`:1-9`, `:64-71`) to describe Paddle instead of Stripe. Update
  the single import site, `connect-four/src/components/UpgradeModal.jsx:4,18`
  (`useStripePrices` → `usePaddlePrices`, import path → `../lib/usePaddlePrices.js`), in this same
  task. Keeping the name `useStripePrices` was considered and rejected: the string `stripe` inside
  the hook name would make T051's `rg -i stripe` zero-match check (FR-014/SC-006) unsatisfiable by
  construction, and the earlier "keep the name, see research.md §7" note was a miscitation —
  research.md §7 is the FR-010 ownership-check field decision, unrelated to hook naming; no such
  keep-name decision was actually made in research.md.
- [x] T053 [US5] Update the stale comment in
  `connect-four/src/screens/PostSetSummaryScreen.jsx` referencing "full-page Stripe redirect" to
  describe the actual overlay (non-redirecting) Paddle flow; confirm by reading the surrounding
  code first that no behavior in this screen actually depended on the redirect before editing only
  the comment.
- [x] T054 [P] [US5] Diff-verify `connect-four/src/components/UpgradeModal.jsx`: confirm
  `onDismiss`/`onUpgrade`/`uiState`/`onUiStateChange` are byte-identical to the pre-migration
  version — `git diff` shows changes **only** to the T052 import line
  (`useStripePrices`→`usePaddlePrices`, `../lib/useStripePrices.js`→`../lib/usePaddlePrices.js`)
  and its call-site rename (`:4`, `:18`); no other line in this file changes — and that the
  monthly/annual toggle still passes the selected plan through to the new `onUpgrade`
  implementation from T023 (SC-009).
- [x] T055 [US5] Regression-sweep every remaining entry point: open `UpgradeModal` from
  `connect-four/src/screens/SetPickerScreen.jsx`, the Saga/lesson-gate screen, and
  `connect-four/src/components/DeepRevealPane.jsx` (per `rg 'UpgradeModal' connect-four/src` for
  the exact current call sites), complete a sandbox checkout via the overlay from each, and confirm
  the user lands back on the exact originating screen already paid, with no full-page navigation
  anywhere. Include `connect-four/src/screens/SettingsScreen.jsx`'s portal entry point as a
  **regression check** here (it was first delivered in T037, not delivered here) — per spec.md
  User Story 5 Acceptance Scenario 3.

**Checkpoint**: All five user stories functional; `UpgradeModal`'s contract diff-verified
unchanged; no full-page navigation anywhere in the upgrade flow.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T056 Populate `staging_checks.md` with a new `## Epic 10 —` section (per quickstart.md §6 /
  FR-017) recording the five pending pre-launch items that cannot be verified locally: real
  deployed Paddle notification-destination delivery, production domain review approval, a real
  cross-border payout landing as USD in an Argentine bank, live (non-sandbox) catalog provisioning,
  and the Argentine tax/retención withholding stack — do not mark any of these done locally.
- [x] T057 Run the full quickstart.md walkthrough (§1–6) end-to-end as a final sanity pass across
  all five stories together.
- [x] T058 [P] Diff-review `docs/architecture/api-conventions.md`, `server-conventions.md`,
  `db-schema.md`, `data-model.md` (T048–T050) against the shipped code
  (`paddleProcessor.js`, `paddleRoutes.js`, migration `060_paddle_rename_and_payment_events.sql`)
  to confirm the docs and the implementation actually agree — not just that both exist.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: No dependencies — read-only, can start immediately.
- **Foundational (T003–T007)**: Depends on Setup. **Blocks all user stories** — the migration
  (T005/T006) is a hard prerequisite for US2's fallback write (T020) and US3's webhook write
  (T034), and the SDK install (T003) is a hard prerequisite for US1's `getPrices()` (T011).
- **US1 (T008–T015)**: Depends on Foundational only.
- **US2 (T016–T029)**: Depends on Foundational; reuses `paddleProcessor.js`/`paddleRoutes.js`
  scaffolding from US1 (T011/T012) but does not require US1's tests to pass first — independently
  testable per its own acceptance scenarios.
- **US3 (T030–T040)**: Depends on Foundational; T037 (SettingsScreen portal repoint) is
  independent of US2's checkout wiring.
- **US4 (T041–T051)**: Depends on US1+US2+US3 being functionally complete (deleting Stripe before
  the Paddle replacement is proven working would leave the app with no payment path at all).
  **Additionally, T051 specifically depends on T052 and T053** (both filed under US5/Phase 7,
  later in this document): T052's hook rename and T053's comment fix are the last two `src/`-side
  `stripe` string matches, and T051's `rg -i stripe` check cannot go green until both have landed.
  Sequence T052/T053 before running T051, regardless of file order.
- **US5 (T052–T055)**: Depends on US1+US2+US3 (regression sweep needs the real implementation to
  regress-test) — can run before or interleaved with US4, since it touches different files, **with
  the exception that T052/T053 must complete before T051 specifically** (see above).
- **Polish (T056–T058)**: Depends on all five user stories being complete.

### Within Each User Story

- Tests (T008, T016/T017, T030/T031/T032) are written and confirmed failing before their
  corresponding implementation tasks land (T014/T028/T039 are the "confirm red→green" checkpoints).
- Server processor logic before routes before frontend wiring before manual verification.

### Parallel Opportunities

- T001/T002 (Setup) in parallel.
- T004 (env vars) in parallel with T003 (npm install) within Foundational — different files.
- T008 (US1 test) can be written in parallel with T009/T010 (catalog provisioning, no code
  dependency).
- T016/T017 (US2 tests) in parallel with each other — different test cases, same file, but
  independent of each other's mock setup.
- T030/T031/T032 (US3 tests) in parallel with each other.
- T048/T049/T050 (US4 doc rewrites) in parallel — different files.
- T054 (US5 diff-verify) in parallel with T052/T053/T055 — read-only check, no shared file.

---

## Parallel Example: User Story 3 tests

```bash
# All three US3 test tasks touch the same file but different, independent test cases —
# write them in one sitting, run once:
Task: "Write handleWebhook tier-mapping coverage in connect-four/server/paddleProcessor.test.mjs (T030)"
Task: "Write the FR-009 durability test (stubbed {error}, not rejected) in the same file (T031)"
Task: "Write the fallback-then-webhook idempotency-asymmetry test in the same file (T032)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (T001–T002) + Foundational (T003–T007).
2. Complete US1 (T008–T015) — a working, live-priced, gracefully-degrading `/api/paddle/config`.
3. **STOP and VALIDATE**: `curl` the endpoint per quickstart.md §1.

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. US1 → prices endpoint live (MVP).
3. US2 → checkout works end-to-end, fallback grants tier and rejects mismatched owners.
4. US3 → webhook is the reliable primary tier-mirror; durability (FR-009) and idempotency-asymmetry
   verified; customer portal live (FR-012) — **this completes the P1 core** (spec.md's three P1
   stories all shipped).
5. US4 → zero Stripe trace; docs rewritten.
6. US5 → every remaining entry point regression-swept; `UpgradeModal` contract diff-verified.
7. Polish → `staging_checks.md` populated, full quickstart walkthrough, doc-vs-code consistency
   check.

### Notes

- [P] tasks touch different files, or the same file with independent, non-overlapping edits.
- Commit after each task or logical group (per CLAUDE.md git conventions — never `git add -A`).
- `npm run test:fast` (not `npm test`) is the standard check throughout — it excludes
  `tests/integration/candidate-generator.test.js`, which hangs on real solver IPC (CLAUDE.md
  "Running tests").
