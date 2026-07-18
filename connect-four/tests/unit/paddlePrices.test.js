// spec 050 US1 (T008) — GET /api/paddle/config: live prices from a mocked
// Paddle client, and a clean 503 degrade when Paddle isn't configured.
// Registers routes against a minimal fake Express `app` (no supertest
// dependency — call the route handler directly).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { registerPaddleRoutes } from '../../server/paddleRoutes.js';
import { createPaddleProcessor } from '../../server/paddleProcessor.js';

// Minimal fake Express app: captures the handler registered for a given
// method+path and lets the test invoke it directly with fake req/res.
function makeFakeApp() {
  const routes = {};
  return {
    get(path, handler) { routes[`GET ${path}`] = handler; },
    post(path, ...handlers) { routes[`POST ${path}`] = handlers[handlers.length - 1]; },
    _invoke(method, path, req) {
      const handler = routes[`${method} ${path}`];
      if (!handler) throw new Error(`no handler registered for ${method} ${path}`);
      let statusCode = 200;
      let jsonBody;
      const res = {
        status(code) { statusCode = code; return this; },
        json(body) { jsonBody = body; return this; },
        end() { return this; },
      };
      return Promise.resolve(handler(req, res)).then(() => ({ statusCode, jsonBody }));
    },
  };
}

function makeMockPaddleClient({ monthly, annual }) {
  return {
    prices: {
      async get(priceId) {
        if (priceId === 'pri_monthly_test') return monthly;
        if (priceId === 'pri_annual_test') return annual;
        throw new Error(`unexpected priceId: ${priceId}`);
      },
    },
  };
}

test('GET /api/paddle/config returns live monthly/annual prices from the Paddle client', async () => {
  const paddleClient = makeMockPaddleClient({
    monthly: {
      id: 'pri_monthly_test',
      unitPrice: { amount: '299', currencyCode: 'USD' },
      billingCycle: { interval: 'month', frequency: 1 },
    },
    annual: {
      id: 'pri_annual_test',
      unitPrice: { amount: '2199', currencyCode: 'USD' },
      billingCycle: { interval: 'year', frequency: 1 },
    },
  });
  const paymentProcessor = createPaddleProcessor({
    paddleClient,
    supabase: null,
    monthlyPriceId: 'pri_monthly_test',
    annualPriceId: 'pri_annual_test',
    webhookSecret: undefined,
  });

  const app = makeFakeApp();
  registerPaddleRoutes(app, paymentProcessor);

  const { statusCode, jsonBody } = await app._invoke('GET', '/api/paddle/config', {});

  assert.equal(statusCode, 200);
  assert.deepEqual(jsonBody, {
    prices: {
      monthly: { amount: 299, currency: 'usd', interval: 'month' },
      annual: { amount: 2199, currency: 'usd', interval: 'year' },
    },
  });
});

test('GET /api/paddle/config returns 503 "Payments not configured" when the processor is null', async () => {
  const app = makeFakeApp();
  registerPaddleRoutes(app, null);

  const { statusCode, jsonBody } = await app._invoke('GET', '/api/paddle/config', {});

  assert.equal(statusCode, 503);
  assert.deepEqual(jsonBody, { error: 'Payments not configured' });
});

test('GET /api/paddle/config returns a price of null for an unset price id (no hardcoding, FR-001)', async () => {
  const paddleClient = makeMockPaddleClient({
    annual: {
      id: 'pri_annual_test',
      unitPrice: { amount: '2199', currencyCode: 'USD' },
      billingCycle: { interval: 'year', frequency: 1 },
    },
  });
  const paymentProcessor = createPaddleProcessor({
    paddleClient,
    supabase: null,
    monthlyPriceId: undefined,
    annualPriceId: 'pri_annual_test',
    webhookSecret: undefined,
  });

  const app = makeFakeApp();
  registerPaddleRoutes(app, paymentProcessor);

  const { statusCode, jsonBody } = await app._invoke('GET', '/api/paddle/config', {});

  assert.equal(statusCode, 200);
  assert.deepEqual(jsonBody.prices.monthly, null);
  assert.deepEqual(jsonBody.prices.annual, { amount: 2199, currency: 'usd', interval: 'year' });
});
