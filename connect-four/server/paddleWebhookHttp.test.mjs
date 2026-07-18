// server/paddleWebhookHttp.test.mjs
//
// OI-56 (spec 050 review follow-up, docs/open_issues.md): the deleted
// server/stripeRoutes.substitutability.test.mjs built a real Express app +
// http.createServer and sent real HTTP requests, exercising the webhook
// route's own raw-body middleware ordering end-to-end. paddleProcessor.test.mjs
// only calls handleWebhook(...) as a plain function, so a future accidental
// reordering of express.raw() ahead of the global express.json() in
// server/index.js would go undetected. This test closes that gap: it mounts
// the SAME two middleware lines index.js uses (verbatim order — see
// server/index.js's Paddle wiring block / docs/architecture/server-conventions.md
// "Webhook raw-body middleware ordering"), sends a REAL Paddle-Signature-style
// HMAC-signed payload over real HTTP, and asserts the signature verifies
// end-to-end. A second app instance mounts the two middlewares in the WRONG
// order to prove this test is not vacuous — it fails when the ordering breaks
// (the exact regression this test guards against).
//
// The signing algorithm mirrors the real Paddle Node SDK's
// `webhooks.unmarshal` (confirmed against the paddle-docs MCP,
// developer.paddle.com/webhooks/about/signature-verification, 2026-07-18):
// header format `ts=<unix>;h1=<hex>`, signed payload `${ts}:${rawBody}`,
// HMAC-SHA256 with the endpoint secret, timing-safe hex compare. The mocked
// paddleClient.webhooks.unmarshal below performs this exact check — so the
// test only passes if the raw bytes Paddle originally signed reach it
// unmodified, which is precisely what the middleware ordering guarantees.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { registerPaddleRoutes } from './paddleRoutes.js';
import { createPaddleProcessor } from './paddleProcessor.js';

const WEBHOOK_SECRET = 'pdl_ntfset_test_secret';

function sign(rawBodyStr, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}:${rawBodyStr}`;
  const h1 = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `ts=${ts};h1=${h1}`;
}

// Mock Paddle Node SDK whose `webhooks.unmarshal` performs the REAL Paddle
// verification algorithm (not a stub) against whatever raw body actually
// reaches it — this is what gives the test teeth against a middleware-order
// regression, rather than just asserting a canned mock return value.
function makeMockPaddleClient() {
  return {
    webhooks: {
      unmarshal: async (rawBodyStr, secret, signatureHeader) => {
        if (typeof rawBodyStr !== 'string') {
          throw new Error('rawBody must be a string — got ' + typeof rawBodyStr);
        }
        if (!signatureHeader) throw new Error('missing Paddle-Signature header');
        const parts = Object.fromEntries(
          signatureHeader.split(';').map((p) => p.split('='))
        );
        const { ts, h1 } = parts;
        if (!ts || !h1) throw new Error('malformed Paddle-Signature header');
        const expected = createHmac('sha256', secret).update(`${ts}:${rawBodyStr}`, 'utf8').digest('hex');
        const a = Buffer.from(expected, 'hex');
        const b = Buffer.from(h1, 'hex');
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          throw new Error('invalid signature');
        }
        // Real Paddle wire payloads are snake_case (event_id/event_type); the
        // real SDK's unmarshal maps these onto the camelCase EventEntity
        // (eventId/eventType) handleWebhook actually reads — see
        // paddleProcessor.js's header comment. Mirror that mapping here so
        // this mock's return shape matches production, not just its wire
        // format.
        const parsed = JSON.parse(rawBodyStr);
        return { eventId: parsed.event_id, eventType: parsed.event_type, data: parsed.data };
      },
    },
  };
}

/**
 * Builds an Express app with the webhook's raw-body parser mounted either
 * BEFORE the global JSON parser (the correct, production ordering — see
 * server/index.js) or AFTER it (the regression this test must catch).
 */
function buildApp(paymentProcessor, { correctOrdering }) {
  const app = express();
  if (correctOrdering) {
    // Mirrors server/index.js: route-scoped express.raw() registered BEFORE
    // the global express.json().
    app.use('/api/paddle/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());
  } else {
    // The regression: global JSON parser first consumes+reparses the body,
    // so by the time the route-scoped raw() runs there is nothing left to
    // read, and the exact bytes Paddle originally signed are lost.
    app.use(express.json());
    app.use('/api/paddle/webhook', express.raw({ type: 'application/json' }));
  }
  registerPaddleRoutes(app, paymentProcessor);
  return app;
}

/** Send a real HTTP POST to the app and return { status, body }. */
function post(app, path, { rawBody, headers = {} }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const req = http.request(
        { method: 'POST', hostname: 'localhost', port, path, headers: { 'Content-Type': 'application/json', ...headers } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            server.close();
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { /* no-op */ }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );
      req.on('error', reject);
      req.write(rawBody);
      req.end();
    });
  });
}

describe('Paddle webhook — raw-body middleware ordering (OI-56, HTTP-level)', () => {
  it('POSTing a signed payload over real HTTP verifies correctly with the production ordering', async () => {
    const processor = createPaddleProcessor({
      paddleClient: makeMockPaddleClient(),
      supabase: null, // supabase-less path: handleWebhook returns early with { handled: true }
      monthlyPriceId: 'pri_monthly_test',
      annualPriceId: 'pri_annual_test',
      webhookSecret: WEBHOOK_SECRET,
    });
    const app = buildApp(processor, { correctOrdering: true });

    const eventPayload = { event_id: 'evt_http_test_1', event_type: 'transaction.completed', data: {} };
    const rawBody = JSON.stringify(eventPayload);
    const signature = sign(rawBody, WEBHOOK_SECRET);

    const res = await post(app, '/api/paddle/webhook', {
      rawBody,
      headers: { 'Paddle-Signature': signature },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.received, true);
    assert.equal(res.body.eventType, 'transaction.completed');
  });

  it('the same signed payload FAILS verification when the middlewares are reordered (proves the test is not vacuous)', async () => {
    const processor = createPaddleProcessor({
      paddleClient: makeMockPaddleClient(),
      supabase: null,
      monthlyPriceId: 'pri_monthly_test',
      annualPriceId: 'pri_annual_test',
      webhookSecret: WEBHOOK_SECRET,
    });
    const app = buildApp(processor, { correctOrdering: false });

    const eventPayload = { event_id: 'evt_http_test_2', event_type: 'transaction.completed', data: {} };
    const rawBody = JSON.stringify(eventPayload);
    const signature = sign(rawBody, WEBHOOK_SECRET);

    const res = await post(app, '/api/paddle/webhook', {
      rawBody,
      headers: { 'Paddle-Signature': signature },
    });

    // With the global JSON parser running first, express.raw() sees an
    // already-drained stream — req.body is `{}` (Buffer.from({}) coerces to
    // an empty buffer), so `rawBody.toString()` no longer matches what was
    // signed and verification fails -> handleWebhook throws -> the route
    // returns a non-2xx status (400), never 200.
    assert.notEqual(res.status, 200);
  });

  it('missing paymentProcessor (null): the webhook route 503s regardless of ordering', async () => {
    const app = buildApp(null, { correctOrdering: true });
    const res = await post(app, '/api/paddle/webhook', { rawBody: '{}' });
    assert.equal(res.status, 503);
  });
});
