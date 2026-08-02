// server/paddleProcessor.js
//
// Paddle-backed implementation of the PaymentProcessor interface
// (server/paymentProcessor.js) — spec 050 US1/US2/US3.
//
// getPrices (US1):
//   - Reads the two configured Paddle prices live via the Paddle Node SDK
//     (`paddleClient.prices.get(priceId)`), producing the
//     `{ prices: { monthly, annual } }` response contract
//     (contracts/paddle-api.md). Returns null for a plan whose price
//     id is unset — never hardcoded, per FR-001.
//   - The Paddle Node SDK returns camelCase fields (`unitPrice: { amount,
//     currencyCode }`, `billingCycle: { interval, frequency }`) — verified
//     against the live paddle-docs MCP / SDK README (2026-07-17), NOT assumed
//     from training data, per CLAUDE.md § "Paddle integration". `amount` is a
//     STRING in the Paddle API/SDK (e.g. "299") — converted to a Number here
//     so PriceInfo's `amount` field keeps a numeric-minor-units shape the
//     client already expects.
//
// createCheckout (US2, contracts/paddle-api.md):
//   - Returns `{ priceId, customerEmail, successUrl }`. There is no
//     server-built hosted-checkout URL in the Paddle.js overlay model — the
//     client opens the overlay itself via `Paddle.Checkout.open(...)`, passing
//     these three values through verbatim (never client-recomputed).
//   - `successUrl` is computed server-side via `sanitizeReturnPath` — an
//     open-redirect guard producing a bare sanitized path (Paddle's
//     `settings.successUrl` is a plain destination, not a template).
//
// verifyTransaction (US2, contracts/paddle-api.md):
//   - The synchronous single-check activation fallback (FR-010). Confirms
//     `paddle.transactions.get(transactionId)` belongs to the requesting user
//     (`transaction.customData?.app_user_id === userId`) and is
//     `status === 'completed'` before granting `tier: 'paid'`. On success,
//     applies the SAME idempotent write the webhook (T034) applies —
//     `tier: 'paid'` + `paddle_customer_id`. The Paddle Node SDK's transaction
//     object is camelCase (`customerId`, `customData`, `status`) — verified
//     against the paddle-docs MCP (2026-07-17), not assumed from training data.
//   - OI-34 (spec 053 US3, FR-018/FR-019, 2026-08-01): also writes the same
//     `tracks`/`upgrade_completed` analytics record the webhook writes —
//     historically this fallback skipped it entirely, undercounting analytics
//     whenever the webhook was permanently undelivered. Deduped per-transaction
//     via `recordUpgradeCompletedTrack` (reuses `payment_events`' UNIQUE
//     `event_id`, no new table) so it never double-writes against a matching
//     webhook delivery, in either arrival order. A write failure here is
//     caught and logged, never rethrown — never blocks/breaks the client's
//     activation result (Constitution Principle V).
//
// handleWebhook (US3, contracts/paddle-api.md, FR-006/FR-007/FR-008/FR-009):
//   - `paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)` verifies
//     the `Paddle-Signature` header HMAC and returns a typed `EventEntity`
//     (`event.eventId`, `event.eventType`, `event.data`) — confirmed against
//     the installed `@paddle/paddle-node-sdk@3.8.0` `.d.ts` files (Webhooks
//     class), not assumed from training data. `unmarshal` takes the raw body
//     as a STRING (`requestBody: string`) — the route converts the raw Buffer
//     via `.toString()`.
//   - Every event is inserted into `payment_events` (`event_id`, `event_type`,
//     `payload`) BEFORE any tier/tracks write; a `23505` unique-violation on
//     `event_id` means this event was already processed, short-circuiting to
//     `{ handled: false, eventType: 'duplicate' }`.
//   - Required behavior (FR-009): a NON-`23505` ledger-insert failure, or any
//     downstream tier/`tracks` write failure, THROWS (surfaced by the route as
//     non-2xx so Paddle retries) — never fire-and-forget.
//   - Tier-mapping table (contracts/paddle-api.md, verbatim):
//       transaction.completed            -> tier:'paid' + paddle_customer_id + tracks insert (once)
//       subscription.created             -> no-op (ledger insert only; first-payment grant is transaction.completed's alone)
//       subscription.updated status active/trialing (no scheduled cancel) -> tier:'paid'
//       subscription.updated status past_due                              -> no write (retry window)
//       subscription.updated status paused                                -> tier:'free'
//       subscription.updated status active WITH scheduled_change.action=cancel -> no write (not yet terminal)
//       subscription.updated status canceled / subscription.canceled      -> tier:'free' unconditionally (terminal)
//   - Subscription-event tier writes are keyed by `paddle_customer_id` (no
//     `userId` is present on subscription events — only on the originating
//     transaction).
//   - OI-55 hardening (docs/open_issues.md, resolved 2026-07-18): `customData`
//     is plain client-supplied checkout metadata Paddle echoes back verbatim
//     with no re-validation, so a user could forge `customData.app_user_id`
//     via devtools before opening the overlay. For `transaction.completed`,
//     the FIRST payment for a userId (no `users.paddle_customer_id` on file
//     yet) is trusted as before — there is nothing to cross-check against.
//     Every SUBSEQUENT `transaction.completed` claiming that same userId is
//     cross-checked: `data.customerId` must match the already-established
//     `users.paddle_customer_id`, or the tier/`tracks` write is skipped
//     entirely (`{ handled: true, eventType, securityRejected: true }`,
//     logged via `logError`) even though the ledger insert still lands (so
//     Paddle isn't retried forever). This is a narrowing, not a full close —
//     see the "If picked up" note on OI-55 for the residual first-payment
//     forgery window this does NOT close.

import { PaymentConfigError } from './paymentProcessor.js';
import { logError } from './logger.js';

// Shared open-redirect guard for any `returnPath` sent by the client — stays
// exported from paddleProcessor.js, no separate shared module (research.md
// §6). Only a same-origin relative path (starting with exactly one
// leading slash, never `//...` which the browser treats as protocol-relative)
// is trusted; anything else falls back to the app root.
export function sanitizeReturnPath(returnPath) {
  return (typeof returnPath === 'string' && /^\/(?!\/)/.test(returnPath))
    ? returnPath : '/';
}

/**
 * Builds a Paddle-backed PaymentProcessor.
 *
 * `paddleClient` is constructor-injected (rather than constructed internally)
 * so tests can pass a mocked Paddle SDK object without hitting the network.
 * Production wiring (server/index.js) constructs the real `Paddle` instance
 * via `await import('@paddle/paddle-node-sdk')` and passes it in here.
 *
 * @param {{
 *   paddleClient: { prices: { get: Function }, transactions: { get: Function }, webhooks: { unmarshal: Function }, customerPortalSessions: { create: Function } },
 *   supabase: object|null,
 *   monthlyPriceId: string|undefined,
 *   annualPriceId: string|undefined,
 *   webhookSecret: string|undefined,
 * }} deps
 * @returns {{ getPrices: Function, createCheckout: Function, verifyTransaction: Function, handleWebhook: Function, createPortalSession: Function }}
 */
export function createPaddleProcessor({
  paddleClient,
  supabase,
  monthlyPriceId,
  annualPriceId,
  webhookSecret,
}) {
  // ── getPrices — live display amounts for the two configured prices ─────────
  // Reads the actual Paddle price objects so the upgrade UI never drifts from
  // what we charge (FR-001: never hardcoded). Returns null for a plan whose
  // price id is unset. Amounts are in the currency's minor unit (cents); the
  // client formats them.
  async function getPrices() {
    async function describe(priceId) {
      if (!priceId) return null;
      const price = await paddleClient.prices.get(priceId);
      return {
        amount: Number(price.unitPrice?.amount),
        currency: price.unitPrice?.currencyCode?.toLowerCase() ?? null,
        interval: price.billingCycle?.interval ?? null,
      };
    }
    const [monthly, annual] = await Promise.all([
      describe(monthlyPriceId),
      describe(annualPriceId),
    ]);
    return { monthly, annual };
  }

  // ── createCheckout — resolves plan -> priceId, sanitizes returnPath ────────
  // No hosted-checkout URL is built here — the Paddle.js overlay is opened
  // client-side (T023) with these three values passed through verbatim.
  async function createCheckout({ email, plan, returnPath }) {
    const priceId = plan === 'monthly' ? monthlyPriceId : annualPriceId;
    if (!priceId) throw new PaymentConfigError('Price not configured', 503);

    return {
      priceId,
      customerEmail: email,
      successUrl: sanitizeReturnPath(returnPath),
    };
  }

  // ── writeTier — the single shared users.tier write path ───────────────────
  // Both verifyTransaction (the sync fallback) and every handleWebhook branch
  // funnel through this one function so the two independent activation paths
  // can never drift out of sync (a fix applied to one no longer risks being
  // missed in the other five call sites).
  async function writeTier({ userId, customerId, tier, setPaddleCustomerId }) {
    const patch = { tier };
    if (setPaddleCustomerId !== undefined) patch.paddle_customer_id = setPaddleCustomerId;
    const query = supabase.from('users').update(patch);
    const { error } = userId
      ? await query.eq('id', userId)
      : await query.eq('paddle_customer_id', customerId);
    if (error) throw new Error(error.message);
  }

  // ── recordUpgradeCompletedTrack — per-transaction dedup for the
  // `upgrade_completed` analytics write (OI-34, spec 053 US3, FR-018/FR-019)
  // ──────────────────────────────────────────────────────────────────────
  // Either verifyTransaction (the sync fallback) or handleWebhook's
  // transaction.completed branch can be the FIRST path to observe a given
  // payment — whichever runs first must own the one `tracks`/upgrade_completed
  // row, and the other must skip it, regardless of which order they arrive in.
  // Reuses `payment_events`' existing UNIQUE(event_id) constraint as the dedup
  // key rather than a new table: a synthetic, transaction-id-derived event_id
  // (`upgrade_completed_track:<transactionId>`) is inserted as a claim BEFORE
  // the `tracks` row itself. A `23505` on that claim insert means the other
  // path already claimed (and wrote) the analytics row for this transaction,
  // so this call is a no-op — returns `false`. A genuine (non-23505) DB error
  // on either the claim or the `tracks` insert throws, matching how
  // handleWebhook already treats a `tracks` write failure (FR-009); the two
  // call sites decide separately whether to propagate or swallow that throw.
  async function recordUpgradeCompletedTrack({ transactionId, userId, priceId, path }) {
    const claimEventId = `upgrade_completed_track:${transactionId}`;
    const { error: claimErr } = await supabase.from('payment_events').insert({
      event_id: claimEventId,
      event_type: 'upgrade_completed_track',
      payload: { transactionId, userId },
    });
    if (claimErr) {
      if (claimErr.code === '23505') return false;
      throw new Error(`upgrade_completed_track claim failed: ${claimErr.message}`);
    }

    const { error: trackErr } = await supabase.from('tracks').insert({
      uid: userId,
      user_id: userId,
      path,
      event: 'upgrade_completed',
      event_data: { priceId, transactionId },
    });
    if (trackErr) throw new Error(trackErr.message);
    return true;
  }

  // ── verifyTransaction — synchronous single-check activation fallback ──────
  // FR-010: only a transaction confirmed to belong to THIS user, and already
  // `completed`, may flip tier -> paid. Safe to run alongside the (later-batch)
  // webhook: both converge on the same idempotent write, so whichever lands
  // first wins and the other is a no-op.
  //
  // Found in QA (2026-07-18): Paddle's own docs (build/checkout/upsell-checkout)
  // document that a transaction moves `paid` -> `completed` asynchronously
  // server-side AFTER the client-side `checkout.completed` event already fired
  // — "this typically takes less than a second." Calling transactions.get()
  // immediately (no delay) reproducibly returned a transaction still short of
  // `completed`, silently defeating this entire fallback for every real
  // checkout (confirmed live: same transaction re-queried a few seconds later
  // was `completed`). One bounded retry after a short delay — not an
  // open-ended poll, consistent with this feature's single-check design —
  // covers Paddle's documented settle time without reintroducing the
  // bounded-wait poll model spec 050 deliberately collapsed away.
  async function verifyTransaction({ transactionId, userId }) {
    if (!transactionId) return { activated: false, reason: 'no_transaction' };

    let transaction = await paddleClient.transactions.get(transactionId);
    if (!transaction) return { activated: false, reason: 'no_transaction' };

    if (transaction.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      transaction = await paddleClient.transactions.get(transactionId);
      if (!transaction) return { activated: false, reason: 'no_transaction' };
    }

    // Security: only the user who started this checkout may activate from
    // it — never trust the client's transaction id to belong to the caller.
    if (transaction.customData?.app_user_id !== userId) {
      return { activated: false, reason: 'user_mismatch' };
    }
    if (transaction.status !== 'completed') {
      return { activated: false, reason: 'not_completed' };
    }

    if (!supabase) return { activated: true };
    await writeTier({ userId, tier: 'paid', setPaddleCustomerId: transaction.customerId });

    // OI-34 (spec 053 US3, FR-018/FR-019): historically no `tracks`/
    // `upgrade_completed` insert happened here at all — that analytics record
    // was written exclusively by the webhook (FR-008 as originally shipped).
    // That left the fallback-only-activation edge case (webhook never
    // delivered) analytics-undercounted, so this fallback now writes the same
    // record — deduped per-transaction via recordUpgradeCompletedTrack so it
    // never double-writes if the matching webhook also lands (either before
    // or after this call). A write failure here must never affect the
    // client's activation result (Constitution Principle V — analytics writes
    // must not block/break the response), so it's caught and logged, not
    // rethrown.
    try {
      await recordUpgradeCompletedTrack({
        transactionId,
        userId,
        priceId: transaction.items?.[0]?.price?.id ?? 'unknown',
        path: '/paddle/verify-transaction',
      });
    } catch (err) {
      logError('[paddle/verify-transaction]', err, { transactionId, userId });
    }

    return { activated: true };
  }

  // ── handleWebhook — primary tier-mirror (US3, FR-006/FR-007/FR-008/FR-009) ─
  async function handleWebhook(rawBody, signatureHeader) {
    // unmarshal throws indistinguishably for a tampered signature, a
    // wrong/rotated secret, an expired timestamp, or a malformed event body
    // (paddle:webhooks skill) — one catch, one non-2xx outcome for the whole
    // batch; the route never tries to tell these apart via status code.
    const event = await paddleClient.webhooks.unmarshal(
      rawBody.toString(), webhookSecret, signatureHeader
    );

    if (!supabase) {
      return { handled: true, eventType: event.eventType };
    }

    // Idempotency ledger (FR-008): payment_events.event_id is UNIQUE. Must
    // land BEFORE any tier/tracks write — a 23505 means this event was
    // already durably processed, so tier/tracks are never touched again.
    const { error: eventInsertErr } = await supabase.from('payment_events').insert({
      event_id: event.eventId,
      event_type: event.eventType,
      payload: event,
    });
    if (eventInsertErr) {
      if (eventInsertErr.code === '23505') {
        return { handled: false, eventType: 'duplicate' };
      }
      // FR-009: a non-dedup insert error THROWS rather than log-and-proceed —
      // any downstream DB failure must surface
      // as a processing failure so Paddle retries, never a silent partial
      // write. Do not weaken this to fire-and-forget.
      throw new Error(`payment_events insert failed: ${eventInsertErr.message}`);
    }

    const data = event.data;

    // All downstream effects run inside one try/catch: if any write fails
    // after the ledger claim above already committed, the claim is rolled
    // back before rethrowing — otherwise a retry would hit the 23505 dedup
    // check and short-circuit forever, permanently stranding whatever effect
    // failed (a lost tier flip or a lost `tracks` analytics row) even though
    // Paddle believes the redelivery still needs to happen (FR-009).
    try {
      if (event.eventType === 'transaction.completed') {
        // First-payment tier grant — exclusively this event's job (FR-008).
        const userId = data.customData?.app_user_id;
        if (userId) {
          // OI-55 hardening (docs/open_issues.md): customData is plain
          // client-supplied checkout metadata that Paddle echoes back
          // verbatim on the webhook with NO re-validation — a user could
          // edit customData.app_user_id via devtools before opening the
          // overlay. This cannot be closed for a user's very FIRST payment
          // (there is nothing on file yet to cross-check against — trusted
          // as before), but once a user has an established
          // `paddle_customer_id` from a prior payment, any LATER
          // transaction.completed claiming that same userId must actually
          // belong to that SAME Paddle customer. A mismatch means this event
          // is either a forged customData targeting an already-paying
          // account, or a genuinely unusual account-merge scenario Paddle
          // hasn't told us about either way — both cases skip the tier/tracks
          // write rather than trust it blindly. See server-conventions.md's
          // "PaymentProcessor Seam" for the documented trust model.
          const { data: existingUser, error: userLookupErr } = await supabase
            .from('users')
            .select('paddle_customer_id')
            .eq('id', userId)
            .maybeSingle();
          if (userLookupErr) throw new Error(`users lookup failed: ${userLookupErr.message}`);

          const establishedCustomerId = existingUser?.paddle_customer_id;
          const isMismatch = establishedCustomerId && establishedCustomerId !== data.customerId;

          if (isMismatch) {
            logError(
              '[paddle/webhook]',
              new Error('transaction.completed rejected: customData.app_user_id already has an established paddle_customer_id that does not match this transaction\'s customerId'),
              { userId, establishedCustomerId, claimedCustomerId: data.customerId, eventId: event.eventId }
            );
            return { handled: true, eventType: event.eventType, securityRejected: true };
          }

          await writeTier({ userId, tier: 'paid', setPaddleCustomerId: data.customerId });

          // This is the primary path's analytics record (FR-008). As of OI-34
          // (spec 053 US3), verifyTransaction's fallback can also write this
          // same record when it runs first (webhook delayed/undelivered) —
          // recordUpgradeCompletedTrack's per-transaction claim means whichever
          // path gets here first wins and this call is a no-op for the other,
          // so exactly one `tracks` row is written per transaction regardless
          // of arrival order. A genuine write failure here still throws,
          // preserving this branch's existing FR-009 durability behavior
          // (rolls back the just-inserted `payment_events` ledger row, below).
          await recordUpgradeCompletedTrack({
            transactionId: data.id,
            userId,
            priceId: data.items?.[0]?.price?.id ?? 'unknown',
            path: '/paddle/webhook',
          });
        }
      } else if (event.eventType === 'subscription.created') {
        // Documented no-op (contracts/paddle-api.md): ledger insert only. The
        // first-payment tier grant belongs exclusively to transaction.completed
        // — granting tier here would race with, or duplicate, that write.
      } else if (event.eventType === 'subscription.updated') {
        const status = data.status;
        const customerId = data.customerId;
        const scheduledCancelPending = data.scheduledChange?.action === 'cancel';

        if (status === 'canceled' || status === 'paused') {
          // 'canceled' is terminal even via .updated — unconditional downgrade.
          await writeTier({ customerId, tier: 'free' });
        } else if ((status === 'active' || status === 'trialing') && !scheduledCancelPending) {
          await writeTier({ customerId, tier: 'paid' });
        }
        // status === 'past_due', or 'active' with a pending scheduled cancel:
        // no write — Paddle's retry window / not yet terminal.
      } else if (event.eventType === 'subscription.canceled') {
        // Terminal cancellation — always downgrade, unconditionally.
        await writeTier({ customerId: data.customerId, tier: 'free' });
      }
    } catch (err) {
      await supabase.from('payment_events').delete().eq('event_id', event.eventId);
      throw err;
    }

    return { handled: true, eventType: event.eventType };
  }

  // ── createPortalSession (FR-012), grounded against the paddle:customer-portal
  // skill and the installed @paddle/paddle-node-sdk@3.8.0 .d.ts
  // (CustomerPortalSessionsResource
  // .create(customerId, subscriptionIds) -> { urls: { general: { overview } } }).
  async function createPortalSession({ paddleCustomerId, returnPath }) {
    // sanitizeReturnPath is applied for parity with createCheckout's
    // open-redirect guard (contracts/paddle-api.md), but — verified against
    // the SDK's create-customer-portal-session request object and the
    // paddle-sandbox MCP method search (2026-07-17) — Paddle's
    // customerPortalSessions.create has no return-URL parameter at all, so the
    // sanitized value is validated only; it is never forwarded to Paddle.
    sanitizeReturnPath(returnPath);
    const session = await paddleClient.customerPortalSessions.create(paddleCustomerId, []);
    return { portalUrl: session.urls.general.overview };
  }

  return {
    getPrices,
    createCheckout,
    verifyTransaction,
    handleWebhook,
    createPortalSession,
  };
}
