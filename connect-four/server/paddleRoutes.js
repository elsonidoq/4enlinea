// server/paddleRoutes.js
//
// /api/paddle/* route registration (spec 050 US1/US2/US3). Routes are thin
// HTTP adapters over a PaymentProcessor (server/paymentProcessor.js,
// server/paddleProcessor.js) — no Paddle-specific knowledge lives here. When
// `paymentProcessor` is null (PADDLE_API_KEY not configured), the route
// returns 503 (FR-002).

import { logError } from './logger.js';

/**
 * Register /api/paddle/config, /api/paddle/create-checkout,
 * /api/paddle/verify-transaction, /api/paddle/webhook, /api/paddle/portal
 * (US1/US2/US3).
 *
 * @param {import('express').Express} app
 * @param {{ getPrices: Function, createCheckout: Function, verifyTransaction: Function, handleWebhook: Function, createPortalSession: Function } | null} paymentProcessor
 */
export function registerPaddleRoutes(app, paymentProcessor) {
  // GET /api/paddle/config — public: live display prices for the upgrade UI.
  // Unauthenticated (the modal shows before checkout). Returns 503 when Paddle
  // is not configured; the client degrades to the plain plan labels.
  app.get('/api/paddle/config', async (req, res) => {
    if (!paymentProcessor || typeof paymentProcessor.getPrices !== 'function') {
      return res.status(503).json({ error: 'Payments not configured' });
    }
    try {
      const prices = await paymentProcessor.getPrices();
      res.json({ prices });
    } catch (err) {
      logError('[paddle/config]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/paddle/create-checkout — returns
  // { priceId, customerEmail, successUrl }, not a { checkoutUrl } redirect
  // target — the client opens the Paddle.js overlay itself
  // (contracts/paddle-api.md).
  app.post('/api/paddle/create-checkout', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor) return res.status(503).json({ error: 'Payments not configured' });

    const { plan, returnPath } = req.body;
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'plan must be monthly or annual' });
    }

    try {
      const result = await paymentProcessor.createCheckout({ userId: req.user.id, email: req.user.email, plan, returnPath });
      res.json(result);
    } catch (err) {
      logError('[paddle/create-checkout]', err);
      res.status(err.status === 503 ? 503 : 500).json({ error: err.message });
    }
  });

  // POST /api/paddle/verify-transaction — synchronous activation fallback.
  // Sole caller: useUpgradeCheckout.js's checkout.completed event handler
  // (Research §4/§11) — the overlay model has no return-URL round-trip to
  // mount a poll into. The webhook (later batch) remains the primary source
  // of truth; this is idempotent with it.
  app.post('/api/paddle/verify-transaction', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor || typeof paymentProcessor.verifyTransaction !== 'function') {
      return res.status(503).json({ error: 'Payments not configured' });
    }

    try {
      const result = await paymentProcessor.verifyTransaction({
        transactionId: req.body?.transactionId,
        userId: req.user.id,
      });
      res.json(result);
    } catch (err) {
      logError('[paddle/verify-transaction]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/paddle/webhook — the primary tier-mirror (US3). Mounted behind a
  // route-scoped express.raw() registered in index.js BEFORE the global
  // express.json() (see the comment there — same load-bearing ordering).
  // Reads the `Paddle-Signature` header. Per FR-009/the paddle:webhooks
  // skill: return ONE non-2xx status for every failure (signature, malformed
  // event, or a downstream DB error) — Paddle's retry behavior doesn't branch
  // on the code, so this never tries to distinguish them via different
  // statuses.
  app.post('/api/paddle/webhook', async (req, res) => {
    if (!paymentProcessor || typeof paymentProcessor.handleWebhook !== 'function') {
      return res.status(503).end();
    }

    try {
      const result = await paymentProcessor.handleWebhook(req.body, req.headers['paddle-signature']);
      res.json({ received: true, ...result });
    } catch (err) {
      logError('[paddle/webhook]', err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/paddle/portal — FR-012, gated identically to the other
  // authenticated routes above, keyed on paddle_customer_id.
  app.post('/api/paddle/portal', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor) return res.status(503).json({ error: 'Payments not configured' });
    if (!req.user.paddle_customer_id) return res.status(400).json({ error: 'No active subscription' });

    try {
      const { portalUrl } = await paymentProcessor.createPortalSession({
        paddleCustomerId: req.user.paddle_customer_id,
        returnPath: req.body?.returnPath,
      });
      res.json({ portalUrl });
    } catch (err) {
      logError('[paddle/portal]', err);
      res.status(500).json({ error: err.message });
    }
  });
}
