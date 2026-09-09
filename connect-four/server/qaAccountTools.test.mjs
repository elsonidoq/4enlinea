// Unit tests for server/qaAccountTools.js — resetQaAccount / setQaAccountEmail
// / setQaAccountPaidState against constructor-injected MOCKED Paddle Node SDK
// and Supabase clients (never hits the network). Spec 058 (e2e-qa-enablement)
// T004/T037, mirroring paddleProcessor.test.mjs's mock-factory style.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createQaAccountTools } from './qaAccountTools.js';

// --- Mock Paddle Node SDK factory ---
//
// `subscriptions.list` MUST return a fake SubscriptionCollection exposing
// `Symbol.asyncIterator` (and `next()`), NOT a plain array — a plain-array
// mock would make both the correct `for await (const sub of list(...))` code
// AND the buggy `const subs = await list(); for (const sub of subs)` pass,
// so it could never fail for the right reason (research.md D2, blocking
// issue 1). This fake also asserts `list()` itself is called synchronously
// (no `await`) by never returning a Promise from `list()`.
function makeFakeSubscriptionCollection(rows) {
  return {
    // Real SubscriptionCollection.next() populates `.data` and returns it;
    // not exercised directly by resetQaAccount (which uses `for await`), but
    // included so a fake-collection consumer that calls `.next()` instead of
    // async-iterating also works.
    data: [],
    async next() {
      this.data = rows;
      return rows;
    },
    async *[Symbol.asyncIterator]() {
      for (const row of rows) yield row;
    },
  };
}

function makeMockPaddle({ subscriptionsByCustomer = {} } = {}) {
  const calls = { list: [], cancel: [] };
  return {
    calls,
    subscriptions: {
      // Synchronous, per the real SDK — must NOT be `async`/return a Promise.
      list(queryParams) {
        calls.list.push(queryParams);
        const customerId = queryParams.customerId?.[0];
        return makeFakeSubscriptionCollection(subscriptionsByCustomer[customerId] ?? []);
      },
      async cancel(subscriptionId, body) {
        calls.cancel.push({ subscriptionId, body });
        return { id: subscriptionId, status: 'canceled' };
      },
    },
  };
}

// A mock whose `list()` returns a plain array instead of a fake collection —
// used only to prove the fake-collection mock above is doing real work: code
// that (incorrectly) treats `list()`'s return value as an array would still
// "work" against this one, which is exactly the failure mode research.md D2
// warns cannot be distinguished by a plain-array mock. Not used to test
// qaAccountTools itself (see the "confirm the fake-collection mock is
// load-bearing" test below, which reasons about this via construction rather
// than by writing a second implementation to compare against).

// --- Mock supabase factory (chainable .from().select().eq().maybeSingle() /
// .update().eq()) ---

function makeMockSupabase({ users = {} } = {}) {
  const calls = { selects: [], updates: [] };
  return {
    calls,
    from(table) {
      return {
        select: (columns) => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              calls.selects.push({ table, columns, col, val });
              if (table === 'users' && Object.prototype.hasOwnProperty.call(users, val)) {
                return { data: { paddle_customer_id: users[val] }, error: null };
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
      };
    },
  };
}

function makeMockAuthClient({ updateUserByIdImpl } = {}) {
  const calls = { updateUserById: [] };
  return {
    calls,
    auth: {
      admin: {
        updateUserById: async (userId, patch) => {
          calls.updateUserById.push({ userId, patch });
          if (updateUserByIdImpl) return updateUserByIdImpl(userId, patch);
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  };
}

// --- resetQaAccount ---

describe('createQaAccountTools.resetQaAccount', () => {
  it('drains a multi-item fake collection and cancels only non-canceled subscriptions, with effectiveFrom: immediately', async () => {
    const paddleClient = makeMockPaddle({
      subscriptionsByCustomer: {
        ctm_1: [
          { id: 'sub_active', status: 'active' },
          { id: 'sub_trialing', status: 'trialing' },
          { id: 'sub_already_canceled', status: 'canceled' },
        ],
      },
    });
    const supabase = makeMockSupabase({ users: { 'user-1': 'ctm_1' } });
    const authClient = makeMockAuthClient();

    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });
    const result = await resetQaAccount({ userId: 'user-1' });

    assert.deepEqual(result.canceledSubscriptions.sort(), ['sub_active', 'sub_trialing']);
    assert.equal(paddleClient.calls.cancel.length, 2);
    for (const call of paddleClient.calls.cancel) {
      assert.deepEqual(call.body, { effectiveFrom: 'immediately' });
    }
    // Never asked to cancel the already-canceled subscription.
    assert.ok(!paddleClient.calls.cancel.some((c) => c.subscriptionId === 'sub_already_canceled'));
  });

  it('completes without calling subscriptions.list when paddle_customer_id is null (US1.4)', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase({ users: { 'user-2': null } });
    const authClient = makeMockAuthClient();

    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });
    const result = await resetQaAccount({ userId: 'user-2' });

    assert.deepEqual(result, { reset: true, canceledSubscriptions: [] });
    assert.equal(paddleClient.calls.list.length, 0);
  });

  it('run twice back-to-back does not throw (US1.3, FR-008 idempotence)', async () => {
    const paddleClient = makeMockPaddle({
      subscriptionsByCustomer: { ctm_2: [{ id: 'sub_x', status: 'active' }] },
    });
    const supabase = makeMockSupabase({ users: { 'user-3': 'ctm_2' } });
    const authClient = makeMockAuthClient();

    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });

    const first = await resetQaAccount({ userId: 'user-3' });
    assert.deepEqual(first.canceledSubscriptions, ['sub_x']);

    // Second run: the mock supabase doesn't actually mutate its `users` seed
    // between calls, but the second run's paddle mock now has zero
    // subscriptions left for the (already-nulled, in reality) customer id —
    // simulate that directly by re-querying with no rows.
    const paddleClientSecondRun = makeMockPaddle({ subscriptionsByCustomer: {} });
    const { resetQaAccount: resetAgain } = createQaAccountTools({
      paddleClient: paddleClientSecondRun,
      supabase,
      authClient,
    });
    await assert.doesNotReject(() => resetAgain({ userId: 'user-3' }));
  });

  it('calls subscriptions.cancel before supabase users update (NF14 ordering)', async () => {
    const order = [];
    const paddleClient = makeMockPaddle({
      subscriptionsByCustomer: { ctm_3: [{ id: 'sub_y', status: 'active' }] },
    });
    const realCancel = paddleClient.subscriptions.cancel;
    paddleClient.subscriptions.cancel = async (...cancelArgs) => {
      order.push('cancel');
      return realCancel(...cancelArgs);
    };

    const supabase = makeMockSupabase({ users: { 'user-4': 'ctm_3' } });
    const realUpdate = supabase.from;
    supabase.from = (table) => {
      const original = realUpdate(table);
      if (table === 'users') {
        const originalUpdate = original.update;
        original.update = (patch) => {
          const chain = originalUpdate(patch);
          const originalEq = chain.eq;
          chain.eq = async (...eqArgs) => {
            order.push('update');
            return originalEq(...eqArgs);
          };
          return chain;
        };
      }
      return original;
    };

    const authClient = makeMockAuthClient();
    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });
    await resetQaAccount({ userId: 'user-4' });

    assert.deepEqual(order, ['cancel', 'update']);
  });

  it('writes tier: free and paddle_customer_id: null together in one update (NF1)', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase({ users: { 'user-5': null } });
    const authClient = makeMockAuthClient();

    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });
    await resetQaAccount({ userId: 'user-5' });

    assert.equal(supabase.calls.updates.length, 1);
    assert.deepEqual(supabase.calls.updates[0].patch, { tier: 'free', paddle_customer_id: null });
    assert.equal(supabase.calls.updates[0].val, 'user-5');
  });

  it('the fake-collection mock is load-bearing: a naive `await list()`-as-array implementation would silently see zero subscriptions', async () => {
    // This does not re-implement resetQaAccount — it demonstrates, against
    // the SAME fake collection used above, why the fake must expose
    // Symbol.asyncIterator rather than being a plain array: a synchronous
    // `list()` return value has no `.length`/index access the way a plain
    // array would, so naive array-shaped code
    // (`const subs = await list(); for (const s of subs)`) would iterate a
    // Collection object with no enumerable numeric keys and see nothing.
    const paddleClient = makeMockPaddle({
      subscriptionsByCustomer: { ctm_9: [{ id: 'sub_z', status: 'active' }] },
    });
    const collection = paddleClient.subscriptions.list({ customerId: ['ctm_9'] });
    // The correct pattern (async iteration) sees the row:
    const viaAsyncIteration = [];
    for await (const sub of paddleClient.subscriptions.list({ customerId: ['ctm_9'] })) {
      viaAsyncIteration.push(sub);
    }
    assert.equal(viaAsyncIteration.length, 1);
    // The buggy pattern (treating the resolved collection as an array) sees
    // nothing — `collection` is not a promise, so `await collection` resolves
    // to the collection object itself, whose plain `for...of` over it (no
    // Symbol.iterator, only Symbol.asyncIterator) throws rather than
    // silently iterating — either way, never the fixture row via a bare
    // `for (const s of subs)`.
    const resolved = await collection;
    assert.equal(typeof resolved[Symbol.iterator], 'undefined');
  });
});

// --- setQaAccountEmail ---

describe('createQaAccountTools.resetQaAccount — missing row', () => {
  it('throws USER_NOT_FOUND for a userId with no users row, rather than reporting success', async () => {
    // Regression guard (code review, 2026-09-08): .maybeSingle() returns
    // {data:null,error:null} for a missing row, and .update().eq() matches zero
    // rows without erroring — so this used to return {reset:true} and the CLI
    // printed a checkmark. A QA agent that pasted a ctm_ id or a stale uuid
    // would then debug a "reset didn't take" symptom that is really a bad
    // argument. This is distinct from FR-008's genuine idempotent no-op, which
    // is a row that EXISTS with nothing left to cancel (covered above).
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase({ users: {} });
    const authClient = makeMockAuthClient();

    const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });
    await assert.rejects(
      () => resetQaAccount({ userId: 'nope-not-a-user' }),
      (err) => err.code === 'USER_NOT_FOUND'
    );
  });
});

describe('createQaAccountTools.setQaAccountEmail', () => {
  it('calls authClient.auth.admin.updateUserById(userId, { email, email_confirm: true }) exactly', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase();
    const authClient = makeMockAuthClient();

    const { setQaAccountEmail } = createQaAccountTools({ paddleClient, supabase, authClient });
    const result = await setQaAccountEmail({ userId: 'user-6', email: 'qa+1@example.com' });

    assert.deepEqual(result, { emailSet: true });
    assert.equal(authClient.calls.updateUserById.length, 1);
    assert.deepEqual(authClient.calls.updateUserById[0], {
      userId: 'user-6',
      patch: { email: 'qa+1@example.com', email_confirm: true },
    });
  });

  it('throws on an auth.admin.updateUserById error', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase();
    const authClient = makeMockAuthClient({
      updateUserByIdImpl: async () => ({ data: null, error: { message: 'user not found' } }),
    });

    const { setQaAccountEmail } = createQaAccountTools({ paddleClient, supabase, authClient });
    await assert.rejects(
      () => setQaAccountEmail({ userId: 'nope', email: 'x@example.com' }),
      /user not found/
    );
  });
});

// --- setQaAccountPaidState (T037) ---

describe('createQaAccountTools.setQaAccountPaidState', () => {
  it('writes tier and paddle_customer_id in one update() call', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase();
    const authClient = makeMockAuthClient();

    const { setQaAccountPaidState } = createQaAccountTools({ paddleClient, supabase, authClient });
    const result = await setQaAccountPaidState({ userId: 'user-7', paddleCustomerId: 'ctm_7' });

    assert.deepEqual(result, { paidStateSet: true });
    assert.equal(supabase.calls.updates.length, 1);
    assert.deepEqual(supabase.calls.updates[0].patch, { tier: 'paid', paddle_customer_id: 'ctm_7' });
    assert.equal(supabase.calls.updates[0].val, 'user-7');
    // Never calls the Paddle SDK.
    assert.equal(paddleClient.calls.list.length, 0);
    assert.equal(paddleClient.calls.cancel.length, 0);
  });

  it('a null paddleCustomerId writes paddle_customer_id: null (portal-400 reachability recipe)', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase();
    const authClient = makeMockAuthClient();

    const { setQaAccountPaidState } = createQaAccountTools({ paddleClient, supabase, authClient });
    await setQaAccountPaidState({ userId: 'user-8', paddleCustomerId: null });

    assert.deepEqual(supabase.calls.updates[0].patch, { tier: 'paid', paddle_customer_id: null });
  });

  it('throws on a supabase update error', async () => {
    const paddleClient = makeMockPaddle();
    const supabase = {
      from: () => ({
        update: () => ({
          eq: async () => ({ error: { message: 'update failed' } }),
        }),
      }),
    };
    const authClient = makeMockAuthClient();

    const { setQaAccountPaidState } = createQaAccountTools({ paddleClient, supabase, authClient });
    await assert.rejects(
      () => setQaAccountPaidState({ userId: 'user-9', paddleCustomerId: 'ctm_9' }),
      /update failed/
    );
  });

  it('an OMITTED paddleCustomerId still writes paddle_customer_id: null, never a half-write', async () => {
    // Regression guard (code review, 2026-09-08): postgrest-js serializes the
    // patch with JSON.stringify, which DROPS an `undefined` value — so an
    // omitted paddleCustomerId used to PATCH `tier` alone and leave a stale
    // customer id behind, producing exactly the unpaired paid state this
    // function's NF1 pairing discipline exists to prevent, while still
    // answering 200 {paidStateSet:true}.
    const paddleClient = makeMockPaddle();
    const supabase = makeMockSupabase({ users: { 'user-10': 'ctm_stale' } });
    const authClient = makeMockAuthClient();

    const { setQaAccountPaidState } = createQaAccountTools({ paddleClient, supabase, authClient });
    await setQaAccountPaidState({ userId: 'user-10' });

    assert.equal(supabase.calls.updates.length, 1);
    assert.deepEqual(supabase.calls.updates[0].patch, { tier: 'paid', paddle_customer_id: null });
    assert.ok(!Object.values(supabase.calls.updates[0].patch).includes(undefined));
  });
});
