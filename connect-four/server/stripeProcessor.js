// server/stripeProcessor.js
//
// Stripe-backed implementation of the PaymentProcessor interface
// (server/paymentProcessor.js). Wraps the three former inline Stripe call sites
// in server/index.js.
//
// handleWebhook (US4, R2/R2a):
//   - The stripe_events insert result IS checked (not fire-and-forget). A 23505
//     unique-violation on stripe_event_id means this event was already processed —
//     the tier write and the upgrade_completed tracks insert are both skipped, and
//     { handled: false, eventType: 'duplicate' } is returned immediately. Mirrors
//     the insertGameBlunder 23505-as-success dedup pattern (server-conventions.md).
//   - tier writes are status-based (FR-025): 'active'/'trialing' -> 'paid';
//     'past_due' -> no write (Stripe's automatic retry window; a single transient
//     decline must not downgrade a paying user); 'canceled'/'unpaid' -> 'free'.
//     customer.subscription.deleted always writes 'free' (terminal cancellation).
//     This logic sits INSIDE the idempotency guard above, so a re-delivered event
//     never re-triggers the write.

import { getSubscriptionStatus, PaymentConfigError } from './paymentProcessor.js';

/**
 * Builds a Stripe-backed PaymentProcessor.
 *
 * `stripeClient` is constructor-injected (rather than constructed internally)
 * so tests can pass a mocked Stripe SDK object without hitting the network.
 * Production wiring (server/index.js) constructs the real `Stripe` instance
 * via `await import('stripe')` and passes it in here — see index.js for the
 * exact construction, preserved unchanged from the pre-extraction code.
 *
 * @param {{
 *   stripeClient: { checkout: {sessions: {create: Function}}, webhooks: {constructEvent: Function}, billingPortal: {sessions: {create: Function}} },
 *   supabase: object|null,
 *   monthlyPriceId: string|undefined,
 *   annualPriceId: string|undefined,
 *   webhookSecret: string|undefined,
 *   frontendUrl?: string,
 * }} deps
 * @returns {import('./paymentProcessor.js').PaymentProcessor & { createPortalSession: Function }}
 */
export function createStripeProcessor({
  stripeClient,
  supabase,
  monthlyPriceId,
  annualPriceId,
  webhookSecret,
  frontendUrl,
}) {
  // Resolved per-call (not captured at construction) to match the original
  // inline-route behavior, which read process.env.FRONTEND_URL live per request.
  function resolveBaseUrl() {
    return frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // ── createCheckout — mirrors old POST /api/stripe/create-checkout body ─────
  // `returnPath` (optional) is the app screen the user launched checkout from;
  // Stripe returns them there instead of the home page. Sanitized to a
  // same-origin relative path — anything else (absolute URL, protocol-relative
  // '//evil', missing leading slash) falls back to '/' to prevent open redirects.
  async function createCheckout({ userId, email, plan, returnPath }) {
    const priceId = plan === 'monthly' ? monthlyPriceId : annualPriceId;
    if (!priceId) throw new PaymentConfigError('Price not configured', 503);

    const baseUrl = resolveBaseUrl();
    const safePath = (typeof returnPath === 'string' && /^\/(?!\/)/.test(returnPath))
      ? returnPath : '/';
    const buildUrl = (outcome) => {
      const url = new URL(safePath, `${baseUrl}/`);
      url.searchParams.set('checkout', outcome);
      return url.toString();
    };
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { user_id: userId },
      success_url: buildUrl('success'),
      cancel_url: buildUrl('cancelled'),
    });
    return { checkoutUrl: session.url };
  }

  // ── getPrices — live display amounts for the two configured prices ─────────
  // Reads the actual Stripe price objects so the upgrade UI never drifts from
  // what we charge. Returns null for a plan whose price id is unset. Amounts are
  // in the currency's minor unit (cents); the client formats them.
  async function getPrices() {
    async function describe(priceId) {
      if (!priceId) return null;
      const price = await stripeClient.prices.retrieve(priceId);
      return {
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
      };
    }
    const [monthly, annual] = await Promise.all([
      describe(monthlyPriceId),
      describe(annualPriceId),
    ]);
    return { monthly, annual };
  }

  // ── handleWebhook ────────────────────────────────────────────────────────
  async function handleWebhook(rawBody, signatureHeader) {
    // constructEvent throws on bad signature; the route maps that to 400.
    const event = stripeClient.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);

    if (!supabase) {
      return { handled: true, eventType: event.type };
    }

    // Idempotency guard (R2): stripe_events.stripe_event_id is UNIQUE. A 23505
    // means this event was already processed — skip the tier write and the
    // tracks/upgrade_completed insert entirely, mirroring insertGameBlunder's
    // 23505-as-success dedup pattern (server-conventions.md).
    const { error: eventInsertErr } = await supabase.from('stripe_events').insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event,
    });
    if (eventInsertErr) {
      if (eventInsertErr.code === '23505') {
        return { handled: false, eventType: 'duplicate' };
      }
      console.error('[stripe_event]', eventInsertErr.message);
      // Non-dedup insert failure: fall through and still process the event
      // (matches prior fire-and-forget behavior for non-duplicate errors).
    }

    const session = event.data.object;

    if (event.type === 'checkout.session.completed') {
      // A completed checkout session implies an active subscription (FR-025).
      const userId = session.metadata?.user_id;
      if (userId) {
        const { error: tierErr } = await supabase.from('users').update({
          tier: 'paid',
          stripe_customer_id: session.customer,
        }).eq('id', userId);
        if (!tierErr) {
          supabase.from('tracks').insert({
            uid: userId,
            user_id: userId,
            path: '/stripe/webhook',
            event: 'upgrade_completed',
            event_data: { plan: session.metadata?.plan ?? 'unknown' },
          }).then(() => {}).catch(err => console.error('[track upgrade]', err.message));
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Explicit cancellation reaching its terminal state — always downgrade.
      const customerId = session.customer;
      await supabase.from('users').update({ tier: 'free' })
        .eq('stripe_customer_id', customerId);
    } else if (event.type === 'customer.subscription.updated') {
      // FR-025: tier is a live mirror of the subscription's actual status.
      const status = session.status;
      const customerId = session.customer;
      if (status === 'active' || status === 'trialing') {
        await supabase.from('users').update({ tier: 'paid' })
          .eq('stripe_customer_id', customerId);
      } else if (status === 'canceled' || status === 'unpaid') {
        await supabase.from('users').update({ tier: 'free' })
          .eq('stripe_customer_id', customerId);
      }
      // status === 'past_due' (or any other transient status): no write —
      // Stripe's automatic retry window; a single transient decline must not
      // downgrade a paying user.
    }

    return { handled: true, eventType: event.type };
  }

  // ── createPortalSession — mirrors old POST /api/stripe/portal body ─────────
  // Not part of the 3-method PaymentProcessor interface (contract explicitly
  // excludes portal from it), but kept on this object so stripeRoutes.js can
  // reach the same Stripe client without index.js exposing it separately.
  async function createPortalSession({ stripeCustomerId }) {
    const session = await stripeClient.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: resolveBaseUrl(),
    });
    return { portalUrl: session.url };
  }

  return {
    createCheckout,
    handleWebhook,
    getSubscriptionStatus,
    createPortalSession,
    getPrices,
  };
}
