// Unit tests for server/paddleProcessor.js — createCheckout / verify-transaction /
// handleWebhook / createPortalSession against a constructor-injected MOCKED
// Paddle Node SDK (never hits real Paddle). Spec 050 US2 (T016/T017) + US3
// (T030-T032, T036).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPaddleProcessor } from './paddleProcessor.js';
import { PaymentConfigError } from './paymentProcessor.js';

// --- Mock Paddle Node SDK factory ---

function makeMockPaddle({ getTransaction, webhookEvent, unmarshalThrows, portalSession } = {}) {
  const calls = { transactionsGet: [], unmarshal: [], portalCreate: [] };
  return {
    calls,
    transactions: {
      get: async (id) => {
        calls.transactionsGet.push(id);
        return typeof getTransaction === 'function' ? getTransaction(id) : getTransaction;
      },
    },
    webhooks: {
      unmarshal: async (rawBody, secret, signature) => {
        calls.unmarshal.push({ rawBody, secret, signature });
        if (unmarshalThrows) throw new Error('invalid signature');
        return webhookEvent;
      },
    },
    customerPortalSessions: {
      create: async (customerId, subscriptionIds) => {
        calls.portalCreate.push({ customerId, subscriptionIds });
        return portalSession ?? { urls: { general: { overview: 'https://portal.paddle.test/session' } } };
      },
    },
  };
}

// --- Mock supabase factory (chainable .from().update().eq() / .insert()) ---

// Also enforces UNIQUE(event_id) on payment_events, like the real DB
// (db-schema.md/migrations/060), so tests can exercise the FR-008 idempotency
// guard: inserting the same event_id twice returns a 23505 error on the
// second call. `insertOverrides` lets a test force a specific table's insert
// to resolve with an arbitrary { data, error } shape (T031's FR-009 durability
// test) — a RESOLVED value, never a rejected promise, matching the real
// Supabase client's convention.
//
// `existingUsers` (OI-55) seeds a `userId -> paddle_customer_id` map so tests
// can simulate a user who ALREADY has an established Paddle customer id on
// file (from a prior payment) — the case handleWebhook's transaction.completed
// branch cross-checks data.customerId against, per docs/open_issues.md OI-55.
// `selectErrors` lets a test force the `users` select to resolve with a
// non-null error (simulating a DB read failure during that cross-check).
function makeMockSupabase({ insertOverrides = {}, existingUsers = {}, selectErrors = {} } = {}) {
  const calls = { updates: [], inserts: [], selects: [] };
  const seenEventIds = new Set();
  return {
    calls,
    from(table) {
      return {
        select: (columns) => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              calls.selects.push({ table, columns, col, val });
              if (table === 'users' && selectErrors[val]) {
                return { data: null, error: selectErrors[val] };
              }
              if (table === 'users') {
                const paddleCustomerId = existingUsers[val];
                return { data: paddleCustomerId !== undefined ? { paddle_customer_id: paddleCustomerId } : null, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        update: (patch) => ({
          eq: async (col, val) => {
            calls.updates.push({ table, patch, col, val });
            return { error: null };
          },
        }),
        insert: (row) => {
          calls.inserts.push({ table, row });
          if (insertOverrides[table]) {
            return Promise.resolve(insertOverrides[table](row));
          }
          if (table === 'payment_events') {
            if (seenEventIds.has(row.event_id)) {
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key value violates unique constraint "payment_events_event_id_key"' } });
            }
            seenEventIds.add(row.event_id);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

const base = { monthlyPriceId: 'pri_monthly_123', annualPriceId: 'pri_annual_456', webhookSecret: 'ntfset_test' };

// --- createCheckout ---

describe('createPaddleProcessor.createCheckout', () => {
  it('returns { priceId, customerEmail, successUrl } for a valid monthly plan', async () => {
    const processor = createPaddleProcessor({ paddleClient: makeMockPaddle(), supabase: null, ...base });

    const result = await processor.createCheckout({
      userId: 'user-1', email: 'a@b.com', plan: 'monthly', returnPath: '/settings',
    });

    assert.deepEqual(result, {
      priceId: 'pri_monthly_123',
      customerEmail: 'a@b.com',
      successUrl: '/settings',
    });
  });

  it('resolves the annual price id for plan=annual', async () => {
    const processor = createPaddleProcessor({ paddleClient: makeMockPaddle(), supabase: null, ...base });

    const result = await processor.createCheckout({
      userId: 'user-1', email: 'a@b.com', plan: 'annual', returnPath: '/setpicker',
    });

    assert.equal(result.priceId, 'pri_annual_456');
    assert.equal(result.successUrl, '/setpicker');
  });

  it('sanitizes an attacker-supplied returnPath to "/" (open-redirect guard)', async () => {
    const processor = createPaddleProcessor({ paddleClient: makeMockPaddle(), supabase: null, ...base });

    const viaProtocolRelative = await processor.createCheckout({
      userId: 'user-1', email: 'a@b.com', plan: 'monthly', returnPath: '//evil.com',
    });
    assert.equal(viaProtocolRelative.successUrl, '/');

    const viaAbsoluteUrl = await processor.createCheckout({
      userId: 'user-1', email: 'a@b.com', plan: 'monthly', returnPath: 'https://evil.com',
    });
    assert.equal(viaAbsoluteUrl.successUrl, '/');
  });

  it('defaults successUrl to "/" when returnPath is missing', async () => {
    const processor = createPaddleProcessor({ paddleClient: makeMockPaddle(), supabase: null, ...base });
    const result = await processor.createCheckout({ userId: 'user-1', email: 'a@b.com', plan: 'monthly' });
    assert.equal(result.successUrl, '/');
  });

  it('throws a PaymentConfigError with status 503 when the price id is missing', async () => {
    const processor = createPaddleProcessor({
      paddleClient: makeMockPaddle(), supabase: null,
      monthlyPriceId: undefined, annualPriceId: 'pri_annual_456', webhookSecret: 'ntfset_test',
    });

    await assert.rejects(
      () => processor.createCheckout({ userId: 'user-1', email: 'a@b.com', plan: 'monthly' }),
      (err) => {
        assert.ok(err instanceof PaymentConfigError);
        assert.equal(err.status, 503);
        return true;
      }
    );
  });
});

// --- verify-transaction (FR-010 ownership check + success path) ---

describe('createPaddleProcessor.verifyTransaction', () => {
  it('activates: writes tier=paid + paddle_customer_id when the transaction belongs to the user and is completed', async () => {
    const supabase = makeMockSupabase();
    const paddleClient = makeMockPaddle({
      getTransaction: {
        status: 'completed',
        customerId: 'ctm_9',
        customData: { app_user_id: 'user-1' },
      },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.verifyTransaction({ transactionId: 'txn_1', userId: 'user-1' });

    assert.deepEqual(result, { activated: true });
    assert.equal(supabase.calls.updates.length, 1);
    assert.deepEqual(supabase.calls.updates[0], {
      table: 'users', patch: { tier: 'paid', paddle_customer_id: 'ctm_9' }, col: 'id', val: 'user-1',
    });
    // OI-34 (spec 053 US3, FR-018/FR-019, 2026-08-01): verify-transaction now
    // also writes the upgrade_completed analytics record — previously it was
    // documented as exclusively the webhook's job, which undercounted
    // analytics whenever the webhook was never delivered at all.
    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(trackInserts.length, 1);
    assert.deepEqual(trackInserts[0].row, {
      uid: 'user-1', user_id: 'user-1', path: '/paddle/verify-transaction',
      event: 'upgrade_completed', event_data: { priceId: 'unknown', transactionId: 'txn_1' },
    });
  });

  it('FR-010: rejects a transaction whose custom_data.app_user_id does not match the requesting user — no tier grant, no analytics record', async () => {
    const supabase = makeMockSupabase();
    const paddleClient = makeMockPaddle({
      getTransaction: {
        status: 'completed',
        customerId: 'ctm_9',
        customData: { app_user_id: 'someone-else' },
      },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.verifyTransaction({ transactionId: 'txn_1', userId: 'user-1' });

    assert.deepEqual(result, { activated: false, reason: 'user_mismatch' });
    assert.equal(supabase.calls.updates.length, 0);
    assert.equal(supabase.calls.inserts.length, 0);
  });

  it('rejects a transaction that is not yet completed (no tier grant)', async () => {
    const supabase = makeMockSupabase();
    const paddleClient = makeMockPaddle({
      getTransaction: {
        status: 'ready',
        customerId: 'ctm_9',
        customData: { app_user_id: 'user-1' },
      },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.verifyTransaction({ transactionId: 'txn_1', userId: 'user-1' });

    assert.deepEqual(result, { activated: false, reason: 'not_completed' });
    assert.equal(supabase.calls.updates.length, 0);
  });

  it('returns no_transaction when transactionId is missing (never calls Paddle)', async () => {
    const paddleClient = makeMockPaddle();
    const processor = createPaddleProcessor({ paddleClient, supabase: makeMockSupabase(), ...base });

    const result = await processor.verifyTransaction({ transactionId: undefined, userId: 'user-1' });

    assert.deepEqual(result, { activated: false, reason: 'no_transaction' });
    assert.equal(paddleClient.calls.transactionsGet.length, 0);
  });

  it('returns no_transaction when Paddle has no matching transaction (get() resolves null/undefined)', async () => {
    const paddleClient = makeMockPaddle({ getTransaction: null });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.verifyTransaction({ transactionId: 'txn_missing', userId: 'user-1' });

    assert.deepEqual(result, { activated: false, reason: 'no_transaction' });
    assert.equal(supabase.calls.updates.length, 0);
  });
});

// --- handleWebhook (T030: full tier-mapping table) ---

describe('createPaddleProcessor.handleWebhook', () => {
  it('rejects a tampered/invalid Paddle-Signature: no DB writes, throws (route maps to non-2xx)', async () => {
    const paddleClient = makeMockPaddle({ unmarshalThrows: true });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await assert.rejects(() => processor.handleWebhook(Buffer.from('{}'), 'bad-sig'));
    assert.equal(supabase.calls.inserts.length, 0);
    assert.equal(supabase.calls.updates.length, 0);
  });

  it('transaction.completed: tier=paid + paddle_customer_id set, exactly one tracks insert', async () => {
    const webhookEvent = {
      eventId: 'evt_txn_1',
      eventType: 'transaction.completed',
      data: {
        id: 'txn_1',
        customerId: 'ctm_1',
        customData: { app_user_id: 'user-1' },
        items: [{ price: { id: 'pri_monthly_123' } }],
      },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_1');

    assert.deepEqual(result, { handled: true, eventType: 'transaction.completed' });
    assert.equal(supabase.calls.inserts.some(i => i.table === 'payment_events' && i.row.event_id === 'evt_txn_1'), true);
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid', paddle_customer_id: 'ctm_1' });
    assert.equal(tierUpdate.col, 'id');
    assert.equal(tierUpdate.val, 'user-1');
    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(trackInserts.length, 1);
  });

  it('redelivered transaction.completed (same event_id): { handled: false, eventType: duplicate }, no second write', async () => {
    const webhookEvent = {
      eventId: 'evt_txn_dup',
      eventType: 'transaction.completed',
      data: { id: 'txn_dup', customerId: 'ctm_dup', customData: { app_user_id: 'user-dup' } },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const first = await processor.handleWebhook(Buffer.from('{}'), 'sig_dup_1');
    const second = await processor.handleWebhook(Buffer.from('{}'), 'sig_dup_2');

    assert.deepEqual(first, { handled: true, eventType: 'transaction.completed' });
    assert.deepEqual(second, { handled: false, eventType: 'duplicate' });

    const tierUpdates = supabase.calls.updates.filter(u => u.table === 'users');
    assert.equal(tierUpdates.length, 1);
    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(trackInserts.length, 1);
  });

  it('subscription.updated status=active: tier=paid', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_active',
      eventType: 'subscription.updated',
      data: { id: 'sub_1', customerId: 'ctm_active', status: 'active', scheduledChange: null },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_active');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid' });
    assert.equal(tierUpdate.col, 'paddle_customer_id');
    assert.equal(tierUpdate.val, 'ctm_active');
  });

  it('subscription.updated status=trialing: tier=paid', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_trialing',
      eventType: 'subscription.updated',
      data: { id: 'sub_2', customerId: 'ctm_trialing', status: 'trialing', scheduledChange: null },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_trialing');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid' });
  });

  it('subscription.updated status=past_due: no write', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_pd',
      eventType: 'subscription.updated',
      data: { id: 'sub_3', customerId: 'ctm_pd', status: 'past_due', scheduledChange: null },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_pd');
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
  });

  it('subscription.updated status=paused: tier=free', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_paused',
      eventType: 'subscription.updated',
      data: { id: 'sub_4', customerId: 'ctm_paused', status: 'paused', scheduledChange: null },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_paused');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
  });

  it('subscription.updated status=active with scheduled_change.action=cancel: no write (not yet terminal)', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_sched_cancel',
      eventType: 'subscription.updated',
      data: {
        id: 'sub_5', customerId: 'ctm_sched', status: 'active',
        scheduledChange: { action: 'cancel', effectiveAt: '2026-08-17T00:00:00Z' },
      },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_sched_cancel');
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
  });

  it('subscription.canceled: tier=free unconditionally', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_canceled',
      eventType: 'subscription.canceled',
      data: { id: 'sub_6', customerId: 'ctm_canceled', status: 'canceled' },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await processor.handleWebhook(Buffer.from('{}'), 'sig_canceled');
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'free' });
    assert.equal(tierUpdate.col, 'paddle_customer_id');
    assert.equal(tierUpdate.val, 'ctm_canceled');
  });

  // --- OI-55 hardening (docs/open_issues.md): cross-check data.customerId
  // against an already-established users.paddle_customer_id for every
  // transaction.completed AFTER a user's first payment. ---

  it('OI-55: a user with NO established paddle_customer_id yet (first payment) is trusted as before', async () => {
    const webhookEvent = {
      eventId: 'evt_oi55_first',
      eventType: 'transaction.completed',
      data: { id: 'txn_oi55_first', customerId: 'ctm_new', customData: { app_user_id: 'user-first-payment' } },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    // existingUsers omitted entirely for this userId -> select resolves data: null,
    // i.e. no row / no paddle_customer_id on file yet.
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_oi55_first');

    assert.deepEqual(result, { handled: true, eventType: 'transaction.completed' });
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid', paddle_customer_id: 'ctm_new' });
  });

  it('OI-55: a SUBSEQUENT transaction.completed whose customerId matches the established paddle_customer_id is trusted', async () => {
    const webhookEvent = {
      eventId: 'evt_oi55_match',
      eventType: 'transaction.completed',
      data: { id: 'txn_oi55_match', customerId: 'ctm_established', customData: { app_user_id: 'user-established' } },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase({ existingUsers: { 'user-established': 'ctm_established' } });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_oi55_match');

    assert.deepEqual(result, { handled: true, eventType: 'transaction.completed' });
    const tierUpdate = supabase.calls.updates.find(u => u.table === 'users');
    assert.deepEqual(tierUpdate.patch, { tier: 'paid', paddle_customer_id: 'ctm_established' });
    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks');
    assert.equal(trackInserts.length, 1);
  });

  it('OI-55: a forged customData.app_user_id targeting an already-established different customerId is REJECTED — no tier write, no tracks insert', async () => {
    const webhookEvent = {
      eventId: 'evt_oi55_mismatch',
      eventType: 'transaction.completed',
      data: {
        id: 'txn_oi55_mismatch',
        customerId: 'ctm_attacker_payment', // the customer id THIS transaction actually belongs to
        customData: { app_user_id: 'user-victim' }, // forged: claims a DIFFERENT, already-paying account
      },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    // user-victim already has a DIFFERENT established paddle_customer_id on file
    // from a real prior payment — this transaction's customerId does not match it.
    const supabase = makeMockSupabase({ existingUsers: { 'user-victim': 'ctm_victim_real' } });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_oi55_mismatch');

    assert.deepEqual(result, { handled: true, eventType: 'transaction.completed', securityRejected: true });
    // The ledger insert still lands (so Paddle is not endlessly retried), but
    // NEITHER the tier write NOR the analytics insert ever happens.
    assert.equal(supabase.calls.inserts.some(i => i.table === 'payment_events' && i.row.event_id === 'evt_oi55_mismatch'), true);
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
    assert.equal(supabase.calls.inserts.some(i => i.table === 'tracks'), false);
  });

  it('OI-55: a users-lookup failure during the cross-check surfaces as a processing failure (Paddle retries), no writes', async () => {
    const webhookEvent = {
      eventId: 'evt_oi55_lookup_fail',
      eventType: 'transaction.completed',
      data: { id: 'txn_oi55_lookup_fail', customerId: 'ctm_x', customData: { app_user_id: 'user-lookup-fail' } },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase({
      selectErrors: { 'user-lookup-fail': { code: 'XXXXX', message: 'simulated DB read failure' } },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await assert.rejects(() => processor.handleWebhook(Buffer.from('{}'), 'sig_oi55_lookup_fail'));
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
    assert.equal(supabase.calls.inserts.some(i => i.table === 'tracks'), false);
  });

  it('subscription.created: ledger insert only — no tier write, no tracks insert (documented no-op)', async () => {
    const webhookEvent = {
      eventId: 'evt_sub_created',
      eventType: 'subscription.created',
      data: { id: 'sub_7', customerId: 'ctm_created', status: 'active' },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    const result = await processor.handleWebhook(Buffer.from('{}'), 'sig_created');

    assert.deepEqual(result, { handled: true, eventType: 'subscription.created' });
    assert.equal(supabase.calls.inserts.some(i => i.table === 'payment_events' && i.row.event_id === 'evt_sub_created'), true);
    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
    assert.equal(supabase.calls.inserts.some(i => i.table === 'tracks'), false);
  });
});

// --- T031: FR-009 durability test ---

describe('createPaddleProcessor.handleWebhook — FR-009 durability', () => {
  it('a non-23505 payment_events insert failure surfaces as a processing failure; no tier/tracks write ever happens', async () => {
    const webhookEvent = {
      eventId: 'evt_durability_1',
      eventType: 'transaction.completed',
      data: { id: 'txn_durability', customerId: 'ctm_durability', customData: { app_user_id: 'user-durability' } },
    };
    const paddleClient = makeMockPaddle({ webhookEvent });
    // Stub the Supabase client so payment_events.insert() RESOLVES with a
    // non-23505 error — a { data, error } shape, never a rejected promise,
    // matching the real Supabase client's mock convention.
    const supabase = makeMockSupabase({
      insertOverrides: {
        payment_events: () => ({ data: null, error: { code: 'XXXXX', message: 'simulated write failure' } }),
      },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    await assert.rejects(() => processor.handleWebhook(Buffer.from('{}'), 'sig_durability'));

    assert.equal(supabase.calls.updates.some(u => u.table === 'users'), false);
    assert.equal(supabase.calls.inserts.some(i => i.table === 'tracks'), false);
  });
});

// --- T032/T055: idempotency-asymmetry tests (verifyTransaction fallback + webhook) ---
//
// OI-34 (spec 053 US3, FR-018/FR-019, 2026-08-01): verifyTransaction now also
// writes the upgrade_completed analytics record (previously it never did, at
// all — see the "activates" test above). Both orderings below prove exactly
// ONE tracks/upgrade_completed row is ever written per transaction, via
// recordUpgradeCompletedTrack's shared per-transaction claim on
// `payment_events` (event_id = `upgrade_completed_track:<transactionId>`).

describe('createPaddleProcessor — fallback + webhook upgrade_completed dedup (OI-34)', () => {
  it('fallback-then-webhook: verifyTransaction writes the ONE tracks row; the matching webhook re-grants tier but does not insert a second row', async () => {
    const transactionId = 'txn_asym_1';
    const userId = 'user-asym-1';
    const customerId = 'ctm_asym_1';

    const webhookEvent = {
      eventId: 'evt_asym_1',
      eventType: 'transaction.completed',
      data: { id: transactionId, customerId, customData: { app_user_id: userId } },
    };
    const paddleClient = makeMockPaddle({
      getTransaction: { status: 'completed', customerId, customData: { app_user_id: userId } },
      webhookEvent,
    });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    // 1. Fallback fires first (client-side verify-transaction call) — claims
    // and writes the upgrade_completed row itself, since nothing else has yet.
    const fallbackResult = await processor.verifyTransaction({ transactionId, userId });
    assert.deepEqual(fallbackResult, { activated: true });

    // 2. The corresponding transaction.completed webhook is delivered for the
    // SAME transaction afterward — idempotently re-grants tier, but its own
    // claim attempt hits the fallback's already-claimed event_id (23505), so
    // it skips its own tracks insert.
    const webhookResult = await processor.handleWebhook(Buffer.from('{}'), 'sig_asym_1');
    assert.deepEqual(webhookResult, { handled: true, eventType: 'transaction.completed' });

    const tierUpdates = supabase.calls.updates.filter(u => u.table === 'users');
    assert.equal(tierUpdates.length, 2); // fallback write + webhook write, both idempotent
    for (const u of tierUpdates) {
      assert.deepEqual(u.patch, { tier: 'paid', paddle_customer_id: customerId });
    }

    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(trackInserts.length, 1);
    assert.equal(trackInserts[0].row.path, '/paddle/verify-transaction');
  });

  it('webhook-then-fallback: handleWebhook writes the ONE tracks row; a later verifyTransaction call for the same transaction does not insert a second row', async () => {
    const transactionId = 'txn_asym_2';
    const userId = 'user-asym-2';
    const customerId = 'ctm_asym_2';

    const webhookEvent = {
      eventId: 'evt_asym_2',
      eventType: 'transaction.completed',
      data: { id: transactionId, customerId, customData: { app_user_id: userId } },
    };
    const paddleClient = makeMockPaddle({
      getTransaction: { status: 'completed', customerId, customData: { app_user_id: userId } },
      webhookEvent,
    });
    const supabase = makeMockSupabase();
    const processor = createPaddleProcessor({ paddleClient, supabase, ...base });

    // 1. Webhook lands first — claims and writes the upgrade_completed row.
    const webhookResult = await processor.handleWebhook(Buffer.from('{}'), 'sig_asym_2');
    assert.deepEqual(webhookResult, { handled: true, eventType: 'transaction.completed' });

    // 2. The client's fallback call for the same transaction arrives after —
    // idempotently re-grants tier, but its claim attempt hits the webhook's
    // already-claimed event_id (23505), so it skips its own tracks insert.
    const fallbackResult = await processor.verifyTransaction({ transactionId, userId });
    assert.deepEqual(fallbackResult, { activated: true });

    const trackInserts = supabase.calls.inserts.filter(i => i.table === 'tracks' && i.row.event === 'upgrade_completed');
    assert.equal(trackInserts.length, 1);
    assert.equal(trackInserts[0].row.path, '/paddle/webhook');
  });
});

// --- createPortalSession (T036, FR-012) ---

describe('createPaddleProcessor.createPortalSession', () => {
  it('mints a portal session for the given paddle_customer_id and returns { portalUrl }', async () => {
    const paddleClient = makeMockPaddle({
      portalSession: { urls: { general: { overview: 'https://sandbox-customer-portal.paddle.com/session_1' } } },
    });
    const processor = createPaddleProcessor({ paddleClient, supabase: null, ...base });

    const result = await processor.createPortalSession({ paddleCustomerId: 'ctm_1', returnPath: '/settings' });

    assert.deepEqual(result, { portalUrl: 'https://sandbox-customer-portal.paddle.com/session_1' });
    assert.equal(paddleClient.calls.portalCreate.length, 1);
    assert.equal(paddleClient.calls.portalCreate[0].customerId, 'ctm_1');
  });

  it('sanitizes an attacker-supplied returnPath without throwing (validated only — Paddle has no return-URL param)', async () => {
    const paddleClient = makeMockPaddle();
    const processor = createPaddleProcessor({ paddleClient, supabase: null, ...base });

    const result = await processor.createPortalSession({ paddleCustomerId: 'ctm_1', returnPath: 'https://evil.com' });
    assert.equal(typeof result.portalUrl, 'string');
  });
});
