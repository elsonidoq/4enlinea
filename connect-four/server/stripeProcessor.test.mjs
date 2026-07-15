// Unit tests for server/stripeProcessor.js — createCheckout / handleWebhook /
// getSubscriptionStatus against a constructor-injected MOCKED Stripe SDK (never
// hits real Stripe). Spec 045 US3 (T022).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStripeProcessor } from './stripeProcessor.js';
import { PaymentConfigError } from './paymentProcessor.js';

// --- Mock Stripe SDK factory ---

function makeMockStripe({ checkoutUrl = 'https://checkout.stripe.test/session', portalUrl = 'https://billing.stripe.test/session', event, constructEventThrows, retrieveSession } = {}) {
  const calls = { checkoutCreate: [], constructEvent: [], portalCreate: [], sessionRetrieve: [] };
  return {
    calls,
    checkout: {
      sessions: {
        create: async (args) => {
          calls.checkoutCreate.push(args);
          return { url: checkoutUrl };
        },
        retrieve: async (id) => {
          calls.sessionRetrieve.push(id);
          return typeof retrieveSession === 'function' ? retrieveSession(id) : retrieveSession;
        },
      },
    },
    webhooks: {
      constructEvent: (rawBody, sig, secret) => {
        calls.constructEvent.push({ rawBody, sig, secret });
        if (constructEventThrows) throw new Error('invalid signature');
        return event;
      },
    },
    billingPortal: {
      sessions: {
        create: async (args) => {
          calls.portalCreate.push(args);
          return { url: portalUrl };
        },
      },
    },
  };
}

// --- Mock supabase factory (chainable .from().update().eq() / .insert()) ---

// Also enforces UNIQUE(stripe_event_id) on stripe_events, like the real DB
// (db-schema.md), so tests can exercise the R2 idempotency guard: inserting
// the same stripe_event_id twice returns a 23505 error on the second call.
function makeMockSupabase() {
  const calls = { updates: [], inserts: [] };
  const seenEventIds = new Set();
  return {
    calls,
    from(table) {
      return {
        update: (patch) => ({
          eq: async (col, val) => {
            calls.updates.push({ table, patch, col, val });
            return { error: null };
          },
        }),
        insert: (row) => {
          calls.inserts.push({ table, row });
          if (table === 'stripe_events') {
            if (seenEventIds.has(row.stripe_event_id)) {
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key value violates unique constraint "stripe_events_stripe_event_id_key"' } });
            }
            seenEventIds.add(row.stripe_event_id);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

// --- createCheckout ---

describe('createStripeProcessor.createCheckout', () => {
  it('creates a subscription checkout session and returns checkoutUrl', async () => {
    const stripeClient = makeMockStripe({ checkoutUrl: 'https://checkout.stripe.test/abc' });
    const processor = createStripeProcessor({
      stripeClient,
      supabase: null,
      monthlyPriceId: 'price_monthly_123',
      annualPriceId: 'price_annual_456',
      webhookSecret: 'whsec_test',
      frontendUrl: 'https://app.test',
    });

    const result = await processor.createCheckout({ userId: 'user-1', email: 'a@b.com', plan: 'monthly' });

    assert.deepEqual(result, { checkoutUrl: 'https://checkout.stripe.test/abc' });
    assert.equal(stripeClient.calls.checkoutCreate.length, 1);
    const args = stripeClient.calls.checkoutCreate[0];
    assert.equal(args.mode, 'subscription');
    assert.deepEqual(args.line_items, [{ price: 'price_monthly_123', quantity: 1 }]);
    assert.equal(args.customer_email, 'a@b.com');
    assert.deepEqual(args.metadata, { user_id: 'user-1' });
    // success_url carries the raw {CHECKOUT_SESSION_ID} template so the client can
    // call /verify-session on return (synchronous activation fallback).
    assert.equal(args.success_url, 'https://app.test/?checkout=success&session_id={CHECKOUT_SESSION_ID}');
    assert.equal(args.cancel_url, 'https://app.test/?checkout=cancelled');
  });

  it('uses the annual price id for plan=annual', async () => {
    const stripeClient = makeMockStripe();
    const processor = createStripeProcessor({
      stripeClient,
      supabase: null,
      monthlyPriceId: 'price_monthly_123',
      annualPriceId: 'price_annual_456',
      webhookSecret: 'whsec_test',
    });

    await processor.createCheckout({ userId: 'user-1', email: 'a@b.com', plan: 'annual' });
    assert.equal(stripeClient.calls.checkoutCreate[0].line_items[0].price, 'price_annual_456');
  });

  it('throws a PaymentConfigError with status 503 when the price id is missing', async () => {
    const stripeClient = makeMockStripe();
    const processor = createStripeProcessor({
      stripeClient,
      supabase: null,
      monthlyPriceId: undefined,
      annualPriceId: 'price_annual_456',
      webhookSecret: 'whsec_test',
    });

    await assert.rejects(
      () => processor.createCheckout({ userId: 'user-1', email: 'a@b.com', plan: 'monthly' }),
      (err) => {
        assert.ok(err instanceof PaymentConfigError);
        assert.equal(err.status, 503);
        return true;
      }
    );
    assert.equal(stripeClient.calls.checkoutCreate.length, 0);
  });
});

// --- handleWebhook ---

describe('createStripeProcessor.handleWebhook', () => {
  it('throws when the signature is invalid (route maps this to 400)', async () => {
    const stripeClient = makeMockStripe({ constructEventThrows: true });
    const processor = createStripeProcessor({
      stripeClient,
      supabase: makeMockSupabase(),
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await assert.rejects(() => processor.handleWebhook(Buffer.from('{}'), 'bad-sig'));
  });

  it('checkout.session.completed: writes tier=paid + stripe_customer_id, records stripe_events + tracks', async () => {
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_123', metadata: { user_id: 'user-1', plan: 'monthly' } } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_1');

    assert.deepEqual(result, { handled: true, eventType: 'checkout.session.completed' });
    // stripe_events insert (fire-and-forget, but awaited in this impl before continuing)
    assert.equal(supabase.calls.inserts.some(i => i.table === 'stripe_events' && i.row.stripe_event_id === 'evt_1'), true);
    // tier write
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.ok(tierUpdate);
    assert.deepEqual(tierUpdate.patch, { tier: 'paid', stripe_customer_id: 'cus_123' });
    assert.equal(tierUpdate.col, 'id');
    assert.equal(tierUpdate.val, 'user-1');
  });

  it('customer.subscription.deleted: writes tier=free keyed by stripe_customer_id', async () => {
    const event = {
      id: 'evt_2',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_456' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_2');

    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
    assert.equal(tierUpdate.col, 'stripe_customer_id');
    assert.equal(tierUpdate.val, 'cus_456');
  });

  it('customer.subscription.updated with status=active: writes tier=paid', async () => {
    const event = {
      id: 'evt_3',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_789', status: 'active' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_3');

    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid' });
  });

  it('customer.subscription.updated with a non-active status: does not write tier', async () => {
    const event = {
      id: 'evt_4',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_789', status: 'past_due' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_4');

    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
  });

  it('works with supabase=null (no DB configured) and still returns handled result', async () => {
    const event = {
      id: 'evt_5',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', metadata: { user_id: 'user-1' } } },
    };
    const stripeClient = makeMockStripe({ event });
    const processor = createStripeProcessor({
      stripeClient,
      supabase: null,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_5');
    assert.deepEqual(result, { handled: true, eventType: 'checkout.session.completed' });
  });

  // --- T037: R2 idempotency regression ---

  it('duplicate stripe_event_id: tier set exactly once and upgrade_completed tracks insert fires exactly once', async () => {
    const event = {
      id: 'evt_dup_1',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_dup', metadata: { user_id: 'user-dup', plan: 'monthly' } } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const first = await processor.handleWebhook(Buffer.from('{}'), 'sig_dup_1');
    const second = await processor.handleWebhook(Buffer.from('{}'), 'sig_dup_1');

    assert.deepEqual(first, { handled: true, eventType: 'checkout.session.completed' });
    assert.deepEqual(second, { handled: false, eventType: 'duplicate' });

    const tierUpdates = supabase.calls.updates.filter(u => u.table === 'users');
    assert.equal(tierUpdates.length, 1);
    assert.deepEqual(tierUpdates[0].patch, { tier: 'paid', stripe_customer_id: 'cus_dup' });

    const upgradeTracks = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(upgradeTracks.length, 1);

    // stripe_events insert was attempted twice (once dedup-rejected) but only recorded once.
    const eventInserts = supabase.calls.inserts.filter(i => i.table === 'stripe_events' && i.row.stripe_event_id === 'evt_dup_1');
    assert.equal(eventInserts.length, 2);
  });

  // --- T037a: FR-025 status-based tier mirror regression ---

  it('customer.subscription.updated status=past_due leaves an already-paid tier unchanged (no write)', async () => {
    const event = {
      id: 'evt_pd_1',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_pd', status: 'past_due' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_pd_1');
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
  });

  it('customer.subscription.updated status=canceled writes tier=free', async () => {
    const event = {
      id: 'evt_cancel_1',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_cancel', status: 'canceled' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_cancel_1');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
    assert.equal(tierUpdate.col, 'stripe_customer_id');
    assert.equal(tierUpdate.val, 'cus_cancel');
  });

  it('customer.subscription.updated status=unpaid writes tier=free', async () => {
    const event = {
      id: 'evt_unpaid_1',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_unpaid', status: 'unpaid' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_unpaid_1');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
  });

  it('customer.subscription.updated status=trialing writes tier=paid', async () => {
    const event = {
      id: 'evt_trial_1',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_trial', status: 'trialing' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_trial_1');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid' });
  });

  it('customer.subscription.deleted writes tier=free regardless of prior status', async () => {
    const event = {
      id: 'evt_del_1',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_del', status: 'active' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_del_1');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
    assert.equal(tierUpdate.col, 'stripe_customer_id');
    assert.equal(tierUpdate.val, 'cus_del');
  });

  it('duplicate delivery of a customer.subscription.updated canceled event writes tier=free exactly once', async () => {
    const event = {
      id: 'evt_cancel_dup',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_cancel_dup', status: 'canceled' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const first = await processor.handleWebhook(Buffer.from('{}'), 'sig_cancel_dup_1');
    const second = await processor.handleWebhook(Buffer.from('{}'), 'sig_cancel_dup_2');

    assert.deepEqual(first, { handled: true, eventType: 'customer.subscription.updated' });
    assert.deepEqual(second, { handled: false, eventType: 'duplicate' });

    const tierUpdates = supabase.calls.updates.filter(u => u.table === 'users');
    assert.equal(tierUpdates.length, 1);
  });

  it('duplicate delivery of a customer.subscription.deleted event writes tier=free exactly once', async () => {
    const event = {
      id: 'evt_del_dup',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_del_dup' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const first = await processor.handleWebhook(Buffer.from('{}'), 'sig_del_dup_1');
    const second = await processor.handleWebhook(Buffer.from('{}'), 'sig_del_dup_2');

    assert.deepEqual(first, { handled: true, eventType: 'customer.subscription.deleted' });
    assert.deepEqual(second, { handled: false, eventType: 'duplicate' });

    const tierUpdates = supabase.calls.updates.filter(u => u.table === 'users');
    assert.equal(tierUpdates.length, 1);
  });

  it('duplicate delivery of a customer.subscription.updated past_due event triggers no write, both times', async () => {
    const event = {
      id: 'evt_pd_dup',
      type: 'customer.subscription.updated',
      data: { object: { customer: 'cus_pd_dup', status: 'past_due' } },
    };
    const stripeClient = makeMockStripe({ event });
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient,
      supabase,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });

    const first = await processor.handleWebhook(Buffer.from('{}'), 'sig_pd_dup_1');
    const second = await processor.handleWebhook(Buffer.from('{}'), 'sig_pd_dup_2');

    assert.deepEqual(first, { handled: true, eventType: 'customer.subscription.updated' });
    assert.deepEqual(second, { handled: false, eventType: 'duplicate' });
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
  });
});

// --- getSubscriptionStatus ---

describe('createStripeProcessor.getSubscriptionStatus', () => {
  it('is a pure sync function: tier=paid -> status=paid', () => {
    const processor = createStripeProcessor({
      stripeClient: makeMockStripe(),
      supabase: null,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });
    assert.deepEqual(processor.getSubscriptionStatus({ tier: 'paid', stripeCustomerId: 'cus_1' }), { status: 'paid' });
  });

  it('tier=free (or anything else) -> status=free, regardless of stripeCustomerId', () => {
    const processor = createStripeProcessor({
      stripeClient: makeMockStripe(),
      supabase: null,
      monthlyPriceId: 'p1',
      annualPriceId: 'p2',
      webhookSecret: 'whsec_test',
    });
    assert.deepEqual(processor.getSubscriptionStatus({ tier: 'free', stripeCustomerId: null }), { status: 'free' });
    assert.deepEqual(processor.getSubscriptionStatus({ tier: 'free', stripeCustomerId: 'cus_1' }), { status: 'free' });
  });
});

// --- syncCheckoutSession (synchronous activation fallback) ---

describe('createStripeProcessor.syncCheckoutSession', () => {
  const base = { monthlyPriceId: 'p1', annualPriceId: 'p2', webhookSecret: 'whsec_test' };

  it('flips tier -> paid + stores customer id when the session is paid and owned by the user', async () => {
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient: makeMockStripe({
        retrieveSession: { payment_status: 'paid', customer: 'cus_9', metadata: { user_id: 'u1' } },
      }),
      supabase, ...base,
    });
    const result = await processor.syncCheckoutSession({ sessionId: 'cs_1', userId: 'u1' });
    assert.deepEqual(result, { activated: true });
    assert.equal(supabase.calls.updates.length, 1);
    assert.deepEqual(supabase.calls.updates[0], {
      table: 'users', patch: { tier: 'paid', stripe_customer_id: 'cus_9' }, col: 'id', val: 'u1',
    });
  });

  it('refuses to activate a session belonging to a different user (no DB write)', async () => {
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient: makeMockStripe({
        retrieveSession: { payment_status: 'paid', customer: 'cus_9', metadata: { user_id: 'someone_else' } },
      }),
      supabase, ...base,
    });
    const result = await processor.syncCheckoutSession({ sessionId: 'cs_1', userId: 'u1' });
    assert.deepEqual(result, { activated: false, reason: 'user_mismatch' });
    assert.equal(supabase.calls.updates.length, 0);
  });

  it('does not activate an unpaid session (no DB write)', async () => {
    const supabase = makeMockSupabase();
    const processor = createStripeProcessor({
      stripeClient: makeMockStripe({
        retrieveSession: { payment_status: 'unpaid', customer: 'cus_9', metadata: { user_id: 'u1' } },
      }),
      supabase, ...base,
    });
    const result = await processor.syncCheckoutSession({ sessionId: 'cs_1', userId: 'u1' });
    assert.deepEqual(result, { activated: false, reason: 'not_paid' });
    assert.equal(supabase.calls.updates.length, 0);
  });

  it('returns no_session when sessionId is missing (never calls Stripe)', async () => {
    const stripeClient = makeMockStripe();
    const processor = createStripeProcessor({ stripeClient, supabase: makeMockSupabase(), ...base });
    const result = await processor.syncCheckoutSession({ sessionId: undefined, userId: 'u1' });
    assert.deepEqual(result, { activated: false, reason: 'no_session' });
    assert.equal(stripeClient.calls.sessionRetrieve.length, 0);
  });
});
