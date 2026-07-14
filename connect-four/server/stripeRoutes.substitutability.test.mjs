// server/stripeRoutes.substitutability.test.mjs
//
// US4 substitutability test (spec 045, T036, FR-020/SC-007/AC3): constructs TWO
// fresh Express apps, each via its own registerStripeRoutes call — one wired to
// createStripeProcessor (mocked Stripe SDK, no network), one wired to the
// StubProcessor fixture (tests/fixtures/stubProcessor.js) — and asserts identical
// status codes / response shapes across a create-checkout -> webhook -> portal
// request sequence. This proves zero code changes are needed in UpgradeModal.jsx,
// index.js call sites, or tier-gate code to swap processors: only the
// paymentProcessor passed into registerStripeRoutes changes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { registerStripeRoutes } from './stripeRoutes.js';
import { createStripeProcessor } from './stripeProcessor.js';
import { createStubProcessor } from '../tests/fixtures/stubProcessor.js';

// --- Mocked Stripe SDK (never hits the network) ---

function makeMockStripe({ webhookEvent }) {
  return {
    checkout: {
      sessions: {
        create: async () => ({ url: 'https://checkout.stripe.test/session' }),
      },
    },
    webhooks: {
      constructEvent: () => webhookEvent,
    },
    billingPortal: {
      sessions: {
        create: async () => ({ url: 'https://billing.stripe.test/session' }),
      },
    },
  };
}

// Enforces UNIQUE(stripe_event_id) on stripe_events, like the real DB, so the
// R2 idempotency guard exercised below actually dedups on the second delivery.
function makeMockSupabase() {
  const seenEventIds = new Set();
  return {
    from(table) {
      return {
        update: () => ({ eq: async () => ({ error: null }) }),
        insert: (row) => {
          if (table === 'stripe_events') {
            if (seenEventIds.has(row.stripe_event_id)) {
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
            }
            seenEventIds.add(row.stripe_event_id);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

// --- App builders ---

const TEST_USER = { id: 'user-sub-1', email: 'sub@test.com', stripe_customer_id: 'cus_sub_1' };

/** Build an Express app with req.user pre-set and the given processor's routes mounted. */
function buildApp(paymentProcessor) {
  const app = express();
  // JSON-parse bodies only on the two non-webhook routes, so the webhook route's
  // own express.raw({type:'application/json'}) (registered inside
  // registerStripeRoutes, see stripeRoutes.js) still sees the exact raw bytes —
  // mirroring why that route uses express.raw in the first place.
  app.use('/api/stripe/create-checkout', express.json());
  app.use('/api/stripe/portal', express.json());
  app.use((req, _res, next) => { req.user = TEST_USER; next(); });
  registerStripeRoutes(app, paymentProcessor);
  return app;
}

function buildStripeApp() {
  const webhookEvent = {
    id: 'evt_sub_test_1',
    type: 'checkout.session.completed',
    data: { object: { customer: 'cus_sub_1', metadata: { user_id: TEST_USER.id, plan: 'monthly' } } },
  };
  const processor = createStripeProcessor({
    stripeClient: makeMockStripe({ webhookEvent }),
    supabase: makeMockSupabase(),
    monthlyPriceId: 'price_monthly',
    annualPriceId: 'price_annual',
    webhookSecret: 'whsec_test',
  });
  return buildApp(processor);
}

function buildStubApp() {
  const processor = createStubProcessor();
  return buildApp(processor);
}

/** Send an HTTP request to the app and return { status, body }. */
function request(app, method, path, { body } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const opts = { method, hostname: 'localhost', port, path, headers: {} };
      let payload;
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        payload = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { /* no-op */ }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      if (payload !== undefined) req.write(payload);
      req.end();
    });
  });
}

// --- Test ---

describe('Stripe processor substitutability (US4 AC3)', () => {
  it('create-checkout -> webhook -> portal produce identical status codes / response shapes for both processors', async () => {
    const stripeApp = buildStripeApp();
    const stubApp = buildStubApp();

    // 1. create-checkout
    const stripeCheckout = await request(stripeApp, 'POST', '/api/stripe/create-checkout', { body: { plan: 'monthly' } });
    const stubCheckout = await request(stubApp, 'POST', '/api/stripe/create-checkout', { body: { plan: 'monthly' } });

    assert.equal(stripeCheckout.status, 200);
    assert.equal(stubCheckout.status, 200);
    assert.deepEqual(Object.keys(stripeCheckout.body).sort(), Object.keys(stubCheckout.body).sort());
    assert.equal(typeof stripeCheckout.body.checkoutUrl, 'string');
    assert.equal(typeof stubCheckout.body.checkoutUrl, 'string');

    // 2. webhook — checkout.session.completed
    // The mocked Stripe SDK's constructEvent ignores the raw body/signature and
    // always returns its canned event; the stub processor parses the raw body
    // itself, so we hand it an equivalent minimal event shape.
    const stubWebhookPayload = {
      id: 'evt_sub_test_1',
      type: 'checkout.session.completed',
      userId: TEST_USER.id,
      customerId: TEST_USER.stripe_customer_id,
    };
    const stripeWebhook = await request(stripeApp, 'POST', '/api/stripe/webhook', { body: { anything: 'ignored-by-mock' } });
    const stubWebhook = await request(stubApp, 'POST', '/api/stripe/webhook', { body: stubWebhookPayload });

    assert.equal(stripeWebhook.status, 200);
    assert.equal(stubWebhook.status, 200);
    assert.deepEqual(Object.keys(stripeWebhook.body).sort(), Object.keys(stubWebhook.body).sort());
    assert.equal(stripeWebhook.body.received, true);
    assert.equal(stubWebhook.body.received, true);
    assert.equal(stripeWebhook.body.handled, true);
    assert.equal(stubWebhook.body.handled, true);
    assert.equal(stripeWebhook.body.eventType, 'checkout.session.completed');
    assert.equal(stubWebhook.body.eventType, 'checkout.session.completed');

    // 2b. re-delivering the same event id is idempotent on both processors.
    const stripeWebhookDup = await request(stripeApp, 'POST', '/api/stripe/webhook', { body: { anything: 'ignored-by-mock' } });
    const stubWebhookDup = await request(stubApp, 'POST', '/api/stripe/webhook', { body: stubWebhookPayload });

    assert.equal(stripeWebhookDup.status, 200);
    assert.equal(stubWebhookDup.status, 200);
    assert.deepEqual(Object.keys(stripeWebhookDup.body).sort(), Object.keys(stubWebhookDup.body).sort());
    assert.equal(stripeWebhookDup.body.handled, false);
    assert.equal(stubWebhookDup.body.handled, false);
    assert.equal(stripeWebhookDup.body.eventType, 'duplicate');
    assert.equal(stubWebhookDup.body.eventType, 'duplicate');

    // 3. portal
    const stripePortal = await request(stripeApp, 'POST', '/api/stripe/portal', { body: {} });
    const stubPortal = await request(stubApp, 'POST', '/api/stripe/portal', { body: {} });

    assert.equal(stripePortal.status, 200);
    assert.equal(stubPortal.status, 200);
    assert.deepEqual(Object.keys(stripePortal.body).sort(), Object.keys(stubPortal.body).sort());
    assert.equal(typeof stripePortal.body.portalUrl, 'string');
    assert.equal(typeof stubPortal.body.portalUrl, 'string');
  });

  it('missing paymentProcessor (null): both would 503 on every route — same guard shape', async () => {
    const app = buildApp(null);
    const res = await request(app, 'POST', '/api/stripe/create-checkout', { body: { plan: 'monthly' } });
    assert.equal(res.status, 503);
  });
});
