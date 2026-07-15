// server/stripeRoutes.js
//
// /api/stripe/* route registration (spec 045 US3), extracted from index.js
// following the registerUserRoutes(app, supabase) pattern (see
// docs/architecture/server-conventions.md "Route Module Organization").
//
// Routes are thin HTTP adapters over a PaymentProcessor (server/paymentProcessor.js,
// server/stripeProcessor.js) — no Stripe-specific knowledge lives here. When
// `paymentProcessor` is null (STRIPE_SECRET_KEY not configured), every route
// returns 503, matching the pre-extraction `!stripe` guard behavior exactly.

import express from 'express';
import { logError } from './logger.js';

/**
 * Register /api/stripe/create-checkout, /api/stripe/webhook and /api/stripe/portal.
 *
 * @param {import('express').Express} app
 * @param {(import('./paymentProcessor.js').PaymentProcessor & { createPortalSession: Function }) | null} paymentProcessor
 */
export function registerStripeRoutes(app, paymentProcessor) {
  // GET /api/stripe/config — public: live display prices for the upgrade UI.
  // Unauthenticated (the modal shows before checkout). Returns 503 when Stripe
  // is not configured; the client degrades to the plain plan labels.
  app.get('/api/stripe/config', async (req, res) => {
    if (!paymentProcessor || typeof paymentProcessor.getPrices !== 'function') {
      return res.status(503).json({ error: 'Payments not configured' });
    }
    try {
      const prices = await paymentProcessor.getPrices();
      res.json({ prices });
    } catch (err) {
      logError('[stripe/config]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/stripe/create-checkout
  app.post('/api/stripe/create-checkout', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor) return res.status(503).json({ error: 'Payments not configured' });

    const { plan, returnPath } = req.body;
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'plan must be monthly or annual' });
    }

    try {
      const { checkoutUrl } = await paymentProcessor.createCheckout({ userId: req.user.id, email: req.user.email, plan, returnPath });
      res.json({ checkoutUrl });
    } catch (err) {
      logError('[stripe/create-checkout]', err);
      res.status(err.status === 503 ? 503 : 500).json({ error: err.message });
    }
  });

  // POST /api/stripe/webhook — express.raw preserved so Stripe's signature
  // verification sees the exact raw bytes, not a JSON-parsed/re-stringified body.
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!paymentProcessor) return res.status(503).end();

    try {
      const result = await paymentProcessor.handleWebhook(req.body, req.headers['stripe-signature']);
      res.json({ received: true, ...result });
    } catch (err) {
      logError('[stripe/webhook]', err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/stripe/verify-session — synchronous activation fallback.
  // The client posts the Checkout Session id it received on ?checkout=success
  // return. We confirm the session with Stripe and mirror tier -> paid, so a
  // dropped/delayed/never-forwarded webhook can't strand a paying user. The
  // webhook remains the primary source of truth; this is idempotent with it.
  app.post('/api/stripe/verify-session', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor || typeof paymentProcessor.syncCheckoutSession !== 'function') {
      return res.status(503).json({ error: 'Payments not configured' });
    }

    try {
      const result = await paymentProcessor.syncCheckoutSession({
        sessionId: req.body?.sessionId,
        userId: req.user.id,
      });
      res.json(result);
    } catch (err) {
      logError('[stripe/verify-session]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/stripe/portal
  app.post('/api/stripe/portal', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!paymentProcessor) return res.status(503).json({ error: 'Payments not configured' });
    if (!req.user.stripe_customer_id) return res.status(400).json({ error: 'No active subscription' });

    try {
      const { portalUrl } = await paymentProcessor.createPortalSession({ stripeCustomerId: req.user.stripe_customer_id });
      res.json({ portalUrl });
    } catch (err) {
      logError('[stripe/portal]', err);
      res.status(500).json({ error: err.message });
    }
  });
}
