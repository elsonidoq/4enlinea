// tests/fixtures/stubProcessor.js
//
// Test-only PaymentProcessor stand-in (spec 045 US4 T035,
// contracts/payment-processor-interface.md). Implements the same 3-method
// interface as server/stripeProcessor.js's createStripeProcessor — plus
// createPortalSession, kept alongside it the same way stripeProcessor.js does —
// with NO network calls, to prove the interface is substitutable via
// config/wiring alone (US4 AC3: swap the processor with zero edits to
// UpgradeModal or any paid-feature gate).
//
// Never wired into a running server outside tests.

/**
 * @param {{ tiers?: Map<string, string> }} [opts] - optional pre-seeded
 *   in-memory tier map (userId -> 'free'|'paid'), so tests can assert on a
 *   shared map across calls.
 * @returns {import('../../connect-four/server/paymentProcessor.js').PaymentProcessor & { createPortalSession: Function, _tiers: Map }}
 */
export function createStubProcessor({ tiers = new Map() } = {}) {
  const seenEventIds = new Set();

  // ── createCheckout — canned URL, no network call ────────────────────────
  async function createCheckout({ userId, plan }) {
    return { checkoutUrl: `https://stub.test/checkout?user=${encodeURIComponent(userId)}&plan=${encodeURIComponent(plan)}` };
  }

  // ── handleWebhook — in-memory tier map, idempotent on event id ──────────
  // Expects rawBody to be a JSON buffer/string of shape:
  //   { id, type, userId, customerId, status }
  // (a minimal stand-in for a Stripe event; the stub never talks to Stripe).
  async function handleWebhook(rawBody) {
    let payload;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch {
      throw new Error('invalid payload');
    }
    if (!payload?.type) throw new Error('invalid payload: missing type');

    if (payload.id) {
      if (seenEventIds.has(payload.id)) {
        return { handled: false, eventType: 'duplicate' };
      }
      seenEventIds.add(payload.id);
    }

    if (payload.type === 'checkout.session.completed') {
      if (payload.userId) tiers.set(payload.userId, 'paid');
    } else if (payload.type === 'customer.subscription.deleted') {
      if (payload.userId) tiers.set(payload.userId, 'free');
    } else if (payload.type === 'customer.subscription.updated') {
      if (payload.userId) {
        if (payload.status === 'active' || payload.status === 'trialing') tiers.set(payload.userId, 'paid');
        else if (payload.status === 'canceled' || payload.status === 'unpaid') tiers.set(payload.userId, 'free');
        // past_due (or unknown status): no write, mirrors stripeProcessor.js.
      }
    }

    return { handled: true, eventType: payload.type };
  }

  // ── getSubscriptionStatus — pure, sync, identical contract to production ─
  function getSubscriptionStatus({ tier }) {
    return { status: tier === 'paid' ? 'paid' : 'free' };
  }

  // ── createPortalSession — canned URL, no network call ───────────────────
  async function createPortalSession({ stripeCustomerId }) {
    return { portalUrl: `https://stub.test/portal?customer=${encodeURIComponent(stripeCustomerId)}` };
  }

  return {
    createCheckout,
    handleWebhook,
    getSubscriptionStatus,
    createPortalSession,
    _tiers: tiers,
  };
}
