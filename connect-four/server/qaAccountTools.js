// server/qaAccountTools.js
//
// QA-harness account tools (spec 058, e2e-qa-enablement) — a single place to
// reset a test account back to a known-free state between QA runs, and to
// re-establish states a real checkout/webhook would have produced, so a QA
// agent doesn't have to hand-drive Paddle sandbox checkout every time it
// needs a specific account shape.
//
// Constructor-injection pattern (mirrors server/paddleProcessor.js's
// `createPaddleProcessor({ paddleClient, supabase, ... })`, see that file's
// header comment): `paddleClient`/`supabase`/`authClient` are passed in
// rather than constructed internally, so tests can pass mocked SDK objects
// without hitting the network.
//
// Deviation from the literal `{ paddleClient, supabase }` two-key shape
// written in contracts/qa-endpoints.md and research.md D2: `setQaAccountEmail`
// (FR-013) must call `auth.admin.updateUserById`, which — per index.js's own
// "Supabase clients" comment (~index.js:315-320) — MUST run on `authClient`,
// never on `supabase`. That comment is explicit: `supabase` is "DB operations
// only ... never call auth.* on this" specifically because calling
// `auth.getUser`/`auth.admin.*` on a client also used for `.from()` DB writes
// taints its session and can flip subsequent DB writes from `service_role` to
// `authenticated`, tripping RLS. `authClient` is therefore threaded through as
// a third constructor dependency here; production wiring (server/index.js)
// passes its existing module-level `authClient` (already built for
// `loadUser`), never a second client construction.

const CANCELABLE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'paused']);

/**
 * @param {{
 *   paddleClient: { subscriptions: { list: Function, cancel: Function } } | null,
 *   supabase: object,
 *   authClient: { auth: { admin: { updateUserById: Function } } },
 * }} deps
 * @returns {{ resetQaAccount: Function, setQaAccountEmail: Function, setQaAccountPaidState: Function }}
 */
export function createQaAccountTools({ paddleClient, supabase, authClient }) {
  // ── resetQaAccount — FR-002/003/004/005/008/009, NF14 ordering ────────────
  // Cancels every cancelable Paddle sandbox subscription for the account's
  // paddle_customer_id FIRST, then nulls tier/paddle_customer_id together in
  // one write (NF1/NF14) — nulling first would make the customer id
  // unrecoverable and orphan any live subscription. Idempotent: a
  // paddle_customer_id already null, or zero cancelable subscriptions, is a
  // success no-op (FR-008), not an error.
  async function resetQaAccount({ userId }) {
    const { data: userRow, error: selectErr } = await supabase
      .from('users')
      .select('paddle_customer_id')
      .eq('id', userId)
      .maybeSingle();
    if (selectErr) throw new Error(selectErr.message);

    // A genuinely-absent row is a wrong-argument error (a pasted ctm_ id or a
    // stale uuid), NOT the idempotent no-op FR-008 is about — that one is a
    // row that exists with nothing left to cancel. Reporting success here
    // sends a QA agent debugging a "reset didn't take" symptom that is really
    // a bad argument.
    if (!userRow) {
      const err = new Error(`no users row for id ${userId}`);
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const paddleCustomerId = userRow.paddle_customer_id ?? null;
    const canceledSubscriptions = [];

    if (paddleCustomerId) {
      // `subscriptions.list()` is SYNCHRONOUS and returns a lazy
      // SubscriptionCollection, not a promise of rows — treating the return
      // value as an array (`const subs = await list(); for (const s of subs)`)
      // silently sees zero subscriptions every time. Must drain via async
      // iteration (research.md D2's iteration contract; confirmed against
      // the installed @paddle/paddle-node-sdk:
      // dist/cjs/resources/subscriptions/index.js `list(queryParams)` returns
      // `new SubscriptionCollection(...)` directly, no `async`/`await`; and
      // dist/cjs/internal/base/collection.js's `[Symbol.asyncIterator]` is
      // the drain mechanism).
      const collection = paddleClient.subscriptions.list({ customerId: [paddleCustomerId] });
      for await (const sub of collection) {
        if (!CANCELABLE_SUBSCRIPTION_STATUSES.has(sub.status)) continue;
        // `effectiveFrom: 'immediately'` must be explicit — the SDK's default
        // when omitted is `next_billing_period`, which leaves `status` reading
        // `active` with only a scheduled cancellation (confirmed against
        // dist/types/resources/subscriptions/operations/cancel-subscription-request-object.d.ts
        // and the paddle-sandbox MCP `client.subscriptions.cancel` schema:
        // `effective_from` enum `['next_billing_period', 'immediately']`,
        // default `next_billing_period`).
        await paddleClient.subscriptions.cancel(sub.id, { effectiveFrom: 'immediately' });
        canceledSubscriptions.push(sub.id);
      }
    }

    // NF14: cancellation above always happens BEFORE this write. NF1: tier
    // and paddle_customer_id are written together, in one update, so an
    // account is never left in the "free tier, still linked to a Paddle
    // customer" intermediate state.
    const { error: updateErr } = await supabase
      .from('users')
      .update({ tier: 'free', paddle_customer_id: null })
      .eq('id', userId);
    if (updateErr) throw new Error(updateErr.message);

    return { reset: true, canceledSubscriptions };
  }

  // ── setQaAccountEmail — FR-013 ──────────────────────────────────────────
  // Service-role admin update, immediate (email_confirm: true) — unlike the
  // browser-facing supabase.auth.updateUser({ email }) flow, which requires
  // the user to click a confirmation link before the change takes effect.
  async function setQaAccountEmail({ userId, email }) {
    const { error } = await authClient.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { emailSet: true };
  }

  // ── setQaAccountPaidState — FR-027 (tasks_critique B2) ─────────────────
  // DB-only re-establishment of tier='paid' + paddle_customer_id, in the
  // upward direction of the same NF1 pairing discipline resetQaAccount
  // follows downward. Never calls paddleClient — this does not perform any
  // real Paddle-side action, it only recreates the DB state a real checkout
  // would have left behind (e.g. to re-run a downgrade fixture, or reach the
  // portal's no-customer-id 400 path with `paddleCustomerId: null`).
  async function setQaAccountPaidState({ userId, paddleCustomerId }) {
    const { error } = await supabase
      .from('users')
      // `?? null` is load-bearing: postgrest-js serializes the patch with
      // JSON.stringify, which DROPS an `undefined` value entirely. A caller
      // that omits paddleCustomerId would otherwise PATCH only `tier`, leaving
      // a stale customer id behind — the exact unpaired paid state this
      // function's NF1 pairing discipline exists to make impossible.
      .update({ tier: 'paid', paddle_customer_id: paddleCustomerId ?? null })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { paidStateSet: true };
  }

  return { resetQaAccount, setQaAccountEmail, setQaAccountPaidState };
}
