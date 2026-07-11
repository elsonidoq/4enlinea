# Contract: `PaymentProcessor` interface + Stripe endpoint changes

## Interface (new file: `server/paymentProcessor.js`)

```js
/**
 * @typedef {Object} PaymentProcessor
 * @property {(args: {userId: string, email: string, plan: 'monthly'|'annual'}) => Promise<{checkoutUrl: string}>} createCheckout
 * @property {(rawBody: Buffer, signatureHeader: string) => Promise<{handled: boolean, eventType: string}>} handleWebhook
 * @property {(args: {tier: string, stripeCustomerId: string|null}) => {status: 'free'|'paid'}} getSubscriptionStatus
 */
```

- `createCheckout`: throws on misconfiguration (missing price id) — caller (route handler) maps to
  `503`, same as today.
- `handleWebhook`: takes the **raw** request body (Express `express.raw()` middleware, unchanged) and
  the `stripe-signature` header; internally verifies signature, checks `stripe_events` idempotency
  (R2), and performs the tier-flip / analytics-track side effects. Returns `{ handled: false }` for
  event types the processor doesn't act on (unchanged passthrough behavior) and `{ handled: false,
  eventType: 'duplicate' }` when the event was already processed (idempotent no-op).
  - **Tier write is status-derived, not unconditional (FR-025, `research.md` R2a)**: on
    `checkout.session.completed` and `customer.subscription.updated`, the handler reads the
    subscription's `status` field and writes `tier` accordingly instead of always writing `'paid'`:
    `active`/`trialing` → `tier: 'paid'`; `past_due` → no write (tier unchanged — Stripe's automatic
    retry window); `canceled`/`unpaid` → `tier: 'free'`. On `customer.subscription.deleted` → `tier:
    'free'` unconditionally (explicit termination). This makes `users.tier` a live mirror of Stripe's
    subscription status rather than a set-once-at-purchase value — see spec.md FR-025. The downgrade
    write goes through the same R2 idempotency guard, so redelivery of the same event does not
    re-trigger the write or any downstream side effect twice.
- `getSubscriptionStatus`: pure, synchronous, no I/O — callers already have `tier` and
  `stripeCustomerId` on `req.user` (post-R3 fix).

## `StripeProcessor` (new file: `server/stripeProcessor.js`)

Wraps the three existing Stripe call sites verbatim (no behavior change to the underlying Stripe API
calls) plus the fixes from `research.md`:
- R2 (webhook idempotency: skip processing on duplicate `stripe_event_id`)
- R2a (FR-025: status-derived tier write — see `handleWebhook` above — instead of always writing `'paid'`)
- R3 is NOT part of this file — it's a `loadUser` fix in `index.js` (upstream of this interface).

## Route extraction (new file: `server/stripeRoutes.js`) — the US4 injection seam

The Stripe routes move **out of `index.js`** into a register-function, mirroring the existing
`registerUserRoutes(app, supabase)` pattern (`server/userRoutes.js`) — this is what makes US4's
substitutability claim testable: the routes are no longer bound to a module-scope singleton `stripe`
object at `index.js` load time.

```js
// server/stripeRoutes.js
export function registerStripeRoutes(app, paymentProcessor) {
  app.post('/api/stripe/create-checkout', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const { plan } = req.body;
    if (!['monthly', 'annual'].includes(plan)) return res.status(400).json({ error: 'plan must be monthly or annual' });
    try {
      const { checkoutUrl } = await paymentProcessor.createCheckout({ userId: req.user.id, email: req.user.email, plan });
      res.json({ checkoutUrl });
    } catch (err) {
      logError('[stripe/create-checkout]', err);
      res.status(err.status === 503 ? 503 : 500).json({ error: err.message });
    }
  });

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const result = await paymentProcessor.handleWebhook(req.body, req.headers['stripe-signature']);
      res.json({ received: true, ...result });
    } catch (err) {
      logError('[stripe/webhook]', err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/stripe/portal', async (req, res) => { /* unchanged handler body, moved here */ });
}
```

(Exact error-status mapping preserved from current behavior: 503 for "not configured"/"price not
configured", 500 for genuine Stripe API errors — `createCheckout` throws a typed error carrying a
`.status` so the route doesn't need to know Stripe-specific details, per FR-016b.)

`server/index.js` calls `registerStripeRoutes(app, paymentProcessor)` once at boot, exactly as it already
calls `registerUserRoutes(app, supabase)` — **no call-site changes** to any consumer of these routes.

`POST /api/stripe/portal` is **not** part of the 3-method interface (per `research.md` R5 — out of
FR-016's scope) but is fixed as a side effect of R3 (`req.user.stripe_customer_id` now populated), and
moves into `stripeRoutes.js` alongside the other two for consistency (single register-function, not a
split). No signature change.

## US4 substitutability test (satisfies AC3 — the untestable gap this contract closes)

The test constructs **two separate Express apps**, each via a fresh call to `registerStripeRoutes`:

```js
const appReal = express();
registerStripeRoutes(appReal, createStripeProcessor({ /* mocked Stripe SDK */ }));

const appStub = express();
registerStripeRoutes(appStub, createStubProcessor());

// Assert both apps produce identical status codes / response shapes for the same
// request sequence (create-checkout → webhook → portal), proving the route layer
// is processor-agnostic. No production code (UpgradeModal.jsx, tier-gate logic,
// index.js call sites) is touched or duplicated to run this test.
```

This is the seam blocking issue 3 identified as missing: previously the routes were defined inline in
`index.js` against a module-scope `let stripe` singleton, so there was no way to construct the app twice
with different processors without either monkey-patching the module-scope variable or duplicating route
definitions in a test file. Extracting to `registerStripeRoutes(app, paymentProcessor)` removes that
dependency entirely — `paymentProcessor` is a plain constructor argument, not a module import.

## `StubProcessor` (new file, test-only: `tests/fixtures/stubProcessor.js` or similar)

Implements the same 3-method shape with no network calls — e.g. `createCheckout` returns a canned
`{ checkoutUrl: 'https://stub.test/checkout' }`, `handleWebhook` flips an in-memory map, and
`getSubscriptionStatus` reflects that map. Used exclusively to demonstrate US4 AC3 (config-swap
substitutability) — never wired into a running server outside of that test.

## Config wiring (new)

`server/index.js` construction site (replaces the current module-level `let stripe = null; if
(process.env.STRIPE_SECRET_KEY) {...}` block):

```js
const paymentProcessor = process.env.STRIPE_SECRET_KEY
  ? createStripeProcessor({ secretKey: process.env.STRIPE_SECRET_KEY, supabase, ...priceIds, webhookSecret })
  : null; // routes 503 when null, same as today's `!stripe` guard
```

No env var is needed to select "stub" in production — the stub only exists in test code, satisfying
US4 AC3 without adding a production-facing `PAYMENT_PROCESSOR` toggle that isn't otherwise needed.
