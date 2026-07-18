# Quickstart: verifying the Paddle checkout migration locally

This is a manual verification walkthrough for a developer picking up this feature after
`tasks.md` is implemented — it is not automated, and complements (does not replace)
`npm run test:fast`.

## Prerequisites

1. `connect-four/server/.env` has: `PADDLE_API_KEY` (sandbox `pdl_sdbx_...`),
   `PADDLE_MONTHLY_PRICE_ID`, `PADDLE_ANNUAL_PRICE_ID` (both `pri_...`, from US10.1's
   `paddle:catalog-setup` provisioning), `PADDLE_NOTIFICATION_WEBHOOK_SECRET` (`pdl_ntfset_...`,
   from US10.3.1's notification-destination registration).
2. `connect-four/.env` (frontend, Vite) has a `VITE_PADDLE_CLIENT_TOKEN` prefixed `test_`
   (sandbox client-side token — CLAUDE.md § "Paddle integration": sandbox client tokens are
   `test_`-prefixed, live tokens have no prefix).
3. `eval "$(./worktree-ports.sh)"` has been run from the repo root (per CLAUDE.md's standing
   worktree-ports rule) before starting the server.

## 1. Prices endpoint (US10.1)

```bash
curl -s "http://localhost:$API_PORT/api/paddle/config" | jq
```
Expect live `monthly`/`annual` price/currency data matching the Paddle sandbox catalog
($2.99/mo, $21.99/yr) — not a hardcoded fixture. Temporarily unset `PADDLE_API_KEY` and restart
to confirm the `503 { error: 'Payments not configured' }` degrade path.

## 2. Checkout (US10.2)

1. Sign in as a free-tier test user in the app.
2. Open the upgrade modal from any entry point (Settings, a lesson gate, deep-reveal gate, set
   picker).
3. Confirm the Paddle overlay shows a **sandbox** banner (not production) before entering test
   card details — this is the concrete evidence that `Paddle.Environment.set('sandbox')` +
   the `test_`-prefixed token actually took effect (Research §9's footgun).
4. Complete checkout with test card `4242 4242 4242 4242` (via `paddle:sandbox-testing`) on
   both the monthly and annual plan (two separate runs).
5. Confirm no full-page navigation occurred at any point (watch the URL bar — it never changes
   host/path outside the SPA's own client-side routing).
6. Confirm the resulting transaction appears under **Transactions** in the Paddle sandbox
   dashboard, not the live dashboard.

## 3. Webhook tier flip (US10.3)

Use the `paddle:sandbox-testing` webhook simulator (or the dashboard's "Send test event")
against the registered notification destination:

```text
transaction.completed  -> confirm users.tier flips to 'paid' for the test user
(redeliver same event)  -> confirm no duplicate tracks row, tier unchanged (idempotency)
subscription.updated {status: 'past_due'} -> confirm tier NOT downgraded
subscription.updated {status: 'paused'}   -> confirm tier flips to 'free'
subscription.canceled                     -> confirm tier flips to 'free' unconditionally
tampered Paddle-Signature header          -> confirm non-2xx response, zero DB writes
```

Query the DB directly to confirm (see memory `reference_supabase_connection.md` for connection
details — read it before writing any inline script, per CLAUDE.md):
```js
// cd connect-four && node -e '...'
// SELECT tier, paddle_customer_id FROM users WHERE id = '<test-user-id>';
// SELECT count(*) FROM payment_events WHERE event_id = '<redelivered-event-id>';  -- expect 1
// SELECT count(*) FROM tracks WHERE event = 'upgrade_completed' AND ...;          -- expect 1, not 2
```

## 4. Customer portal (US10.3.9 / US10.5.4)

As the now-paid test user, open account settings and trigger "Manage subscription" — confirm
it navigates to the Paddle-hosted customer-billing experience for that account (sandbox), not
a 400/503.

## 5. Zero-Stripe verification (US10.4)

```bash
rg -i stripe connect-four/server connect-four/src connect-four/tests connect-four/server/migrations connect-four/package.json
```
Expect zero matches. Then:
```bash
cd connect-four && npm run test:fast
```
Expect a clean pass with no dangling `node --test` filename errors.

## 6. Staging checks (not locally verifiable — record, don't fake)

The five items enumerated in the epic's "Staging checks" section (real deployed webhook
delivery, domain review approval, a real payout landing as USD in AR, live catalog
provisioning, the AR tax/retención stack) belong in `staging_checks.md` under a new `## Epic
10 —` heading, per that file's convention — do not mark them done from this quickstart.
