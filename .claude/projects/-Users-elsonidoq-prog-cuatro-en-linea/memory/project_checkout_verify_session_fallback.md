---
name: project_checkout_verify_session_fallback
description: "Account stays free after paying = webhook never activated tier; local dev needs `stripe listen`, + now a /verify-session synchronous fallback backstops dropped webhooks"
metadata: 
  node_type: memory
  type: project
  originSessionId: fd6ab163-8dc2-4417-8f87-24add68dbc76
---

**Trigger: a paid checkout completes but the account stays `free` / banner stuck on "Pago recibido — todavía activando" (upgrade.timeout).**

Activation is **webhook-driven**: `CheckoutReturnBanner.jsx` on `?checkout=success` only polls `getProfile().tier==='paid'`. The tier flip to `paid` happens in `stripeProcessor.handleWebhook` (`checkout.session.completed`). If no webhook is delivered, the poll exhausts → "still activating" forever, even though Stripe charged the card.

**Root cause of the 2026-07-15 report:** on localhost the ONLY bridge Stripe→`/api/stripe/webhook` is the `stripe listen --forward-to localhost:3001/api/stripe/webhook` CLI. It was NOT running, so `checkout.session.completed` never arrived → no `stripe_events` row, no tier flip. Diagnosis signature: recent Stripe charge exists (MCP `GetCharges`) but `SELECT ... FROM stripe_events WHERE created_at::date=today` returns 0 rows and the user's `users.tier` is still `free`. See [[project_stripe_webhook_live_testing]] (webhook secret is per-endpoint).

**Fix shipped (synchronous fallback, webhook stays primary):**
- `createCheckout` success_url now appends raw `&session_id={CHECKOUT_SESSION_ID}` (append raw — URLSearchParams would percent-encode the braces and break Stripe's template substitution).
- New `stripeProcessor.syncCheckoutSession({sessionId, userId})` — retrieves the session from Stripe, checks `session.metadata.user_id === userId` (security) + `payment_status==='paid'`, then does the SAME idempotent `tier='paid' + stripe_customer_id` flip as the webhook. Returns `{activated:bool, reason?}`.
- Route `POST /api/stripe/verify-session` (auth required) wraps it.
- `CheckoutReturnBanner.jsx` reads `session_id` from the URL, POSTs `/verify-session` (credentials:'include', best-effort/swallow errors), THEN starts the poll (`verifyCheckoutSession(sessionId).finally(startPoll)`), and `stripCheckoutParam` also deletes `session_id`. Idempotent with the webhook — both converge on `paid`.

**How it was verified (E2E, no webhook):** with `stripe listen` OFF, drove a real 4242 checkout in-browser for a signed-in free user → landed back → `POST /api/stripe/verify-session [200]` flipped tier to `paid` with 0 `stripe_events` rows that day. To reproduce the paywall CTA quickly, temporarily set the free-tier deep-reveal cap (`index.js` `checkAndDecrementQuota`/`peekQuota`, both `count >= 5`) to `>= 0`, then roll back to `5`. Related: [[project_auth_payments_state]], [[reference_tier_source]], [[project_app_qa_setup_gotchas]].
