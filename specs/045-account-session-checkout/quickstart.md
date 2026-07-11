# Quickstart: Verifying Epic 5 locally

## Prerequisites
- `connect-four/server/.env` populated per `docs/architecture/server-conventions.md` Environment
  Variables table, plus the new Stripe sandbox values from US5 (`STRIPE_SECRET_KEY`,
  `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`).
- Stripe CLI (`stripe listen --forward-to localhost:3001/api/stripe/webhook`) running locally for
  webhook delivery during manual testing — this is the "locally/test-reachable environment" FR-022
  refers to.

## US1/US2 — session persistence + silent refresh
1. Sign in (Google OAuth) locally.
2. In devtools, manually expire `sb_access_token` (delete the cookie) while keeping `sb_refresh_token`.
3. Reload the app → expect: still signed in, no sign-in prompt, `GET /api/auth/session` returns 200 with
   fresh cookies set (verify in Network tab: `Set-Cookie` present on the session request itself).
4. Delete both cookies → reload → expect: signed out, sign-in prompt shown.
5. Two-tab race check (FR-002a): open two tabs signed in as the same user, expire the access token cookie
   (shared across tabs — same-origin), reload both tabs within the same second → expect both tabs end up
   signed in (neither shows a spurious sign-out), and server logs show the de-dup path taken for the
   second concurrent `/api/auth/refresh` (or `attemptRefresh`) call.

## US3 — checkout with plan choice
1. As a signed-in free-tier user, open the upgrade prompt from any of the 4 call sites.
2. Toggle monthly/annual, click the CTA → redirected to Stripe Checkout.
3. Complete payment with `stripe:test-cards` test card (`4242 4242 4242 4242`).
4. Land back on `?checkout=success` → expect the "activating…" banner briefly, then the paid UI, with
   `users.tier` observed as `'paid'` in the DB.
5. Repeat, but cancel out of Stripe Checkout → land on `?checkout=cancelled` → expect: free tier, no
   error, upgrade retryable.

## US4 — substitutability
Run the `PaymentProcessor` test suite (`node --test <new test files>` or via `npm run test:fast`) which
calls `registerStripeRoutes(app, processor)` twice against two fresh Express apps — once with
`StripeProcessor` (mocked Stripe SDK), once with `StubProcessor` — asserting identical route-handler
behavior (status codes, response shapes) with zero changes to `UpgradeModal.jsx`, `index.js` call sites,
or any tier-gate code between the two runs. See `contracts/payment-processor-interface.md` "US4
substitutability test" for the exact construction pattern.

## US5 — sandbox provisioning
1. Confirm via Stripe MCP (`fetch_stripe_resources` / `stripe_api_read GetProducts`) that a product with
   two active recurring prices exists in the `acct_1TrxCXET4Rc2BDFf` sandbox.
2. Confirm a webhook endpoint is registered (Stripe MCP or dashboard) pointed at the local
   `stripe listen` forwarding target.
3. Run one full test-mode purchase (see US3 steps 1-4) and confirm `users.tier` flips.
4. Record in `specs/045-account-session-checkout/staging_checks.md` (new file) that deployed
   (non-local) webhook delivery is a separate, later verification step — not claimed done here (FR-024)
   — alongside the Supabase dashboard session-timeout check (FR-008).

## Regression gate
`npm run test:fast` (inside `connect-four/`) must pass before considering any user story complete, per
CLAUDE.md.
