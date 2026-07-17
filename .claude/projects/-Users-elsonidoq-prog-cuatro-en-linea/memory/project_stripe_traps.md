---
name: project_stripe_traps
description: Stripe traps — mocked webhook tests hide real DB-write bugs; whsec is PER-ENDPOINT (stripe listen ≠ deploy); the account is a SANDBOX with no live mode; prices are immutable; an unset key 503s all of /api/stripe/*
metadata: 
  node_type: memory
  type: project
  originSessionId: b3651b10-6fef-44e8-8fb4-6381e4fda310
---

> **Provider migration (2026-07):** Stripe is **unavailable to Argentine sellers** without foreign incorporation, so the project is moving payments to **Paddle** (merchant of record). Before extending Stripe, check whether the work should target Paddle instead — see [[project_paddle_integration]] and `docs/payment_provider_research.md`. The Stripe mechanics below remain accurate for the current running integration.

Merged from `project_stripe_webhook_live_testing` + `project_checkout_verify_session_fallback` + the surviving lines of `project_auth_payments_state`. Mechanics (raw-body ordering, idempotency, FR-025 tier mirror, `PaymentProcessor` seam, `GET /api/stripe/config`) live in `docs/architecture/server-conventions.md` + `api-conventions.md` §Stripe — this file is only what those docs will not tell you.

## 1. A green `stripeProcessor.test.mjs` is not evidence

The mock enforces `UNIQUE(stripe_event_id)` (returns `23505` on repeat) but **not** the real `stripe_events` column set and **not** Postgres grants. Two webhook DB-write bugs shipped through the green suite in spec 045 and were caught only by a live `stripe trigger`:
1. The insert used column `event_type`; the real column is **`type`** → insert failed on every event, silently defeating the idempotency ledger.
2. `stripe_events` and `tracks` were missing `service_role` grants locally (42501) — `040_service_role_grants.sql` never listed them; fixed by migration `055`. The webhook writes to **both** tables (`stripe_events` ledger + `tracks` `upgrade_completed`); `tracks` is the easy one to forget.

**After any change to `handleWebhook`'s DB writes, smoke-test live:**
```
cd connect-four
stripe listen --forward-to localhost:3001/api/stripe/webhook   # prints whsec_; put in server/.env; the server reads it at BOOT → restart after
stripe trigger checkout.session.completed                       # synthetic → carries NO real user_id, so no tier flip; validates signature-verify + ledger insert only
```
Then grep the server log for `permission denied` / `Could not find … column`, and
`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT stripe_event_id,type FROM stripe_events ORDER BY created_at DESC LIMIT 3;"`.
For a REAL tier flip you must drive an actual browser checkout (`createCheckout` stamps `metadata.user_id`, which `handleWebhook` reads) or `stripe trigger checkout.session.completed --add checkout_session:metadata.user_id=<realUserId>`.

## 2. "Paid but still free" — the diagnosis signature

Activation is webhook-driven; `CheckoutReturnBanner.jsx` on `?checkout=success` only polls `getProfile().tier==='paid'`. No webhook ⇒ the poll exhausts ⇒ "Pago recibido — todavía activando" forever, **even though Stripe charged the card**.

**Signature:** a recent Stripe charge exists, **but** `SELECT … FROM stripe_events WHERE created_at::date = today` returns **0 rows** and `users.tier` is still `free` ⇒ no webhook arrived. On localhost the ONLY Stripe→`/api/stripe/webhook` bridge is the `stripe listen` CLI — if it isn't running, nothing arrives.

`POST /api/stripe/verify-session` now **backstops** dropped webhooks (webhook stays primary; both are idempotent and converge on `paid`). Verified E2E with `stripe listen` OFF: a real 4242 checkout flipped tier to `paid` with 0 `stripe_events` rows that day. Non-obvious: `createCheckout` appends **raw** `&session_id={CHECKOUT_SESSION_ID}` — `URLSearchParams` would percent-encode the braces and break Stripe's template substitution.

**Paywall CTA repro recipe:** to reproduce the paywall CTA quickly without burning quota, temporarily set the free-tier deep-reveal cap (`index.js` `checkAndDecrementQuota`/`peekQuota`, both `count >= 5`) to `>= 0`, then roll back to `5`.

## 3. The webhook secret is PER-ENDPOINT, not per-account

`STRIPE_WEBHOOK_SECRET` in `server/.env` came from `stripe listen` and validates ONLY events that CLI session forwards to localhost — **it will not work on a deployed staging/prod server**. Each deployed environment needs its own registered webhook *endpoint* (`https://<domain>/api/stripe/webhook`) and that endpoint's own `whsec_…`. By contrast `STRIPE_SECRET_KEY` (`sk_test_…`) IS account-level → same value everywhere. Symptom of a wrong/absent secret: webhook 400s, checkout "works", tier never flips.

**The Stripe MCP CANNOT create or list webhook endpoints** (only products/prices/core resources are exposed) — webhook setup is Dashboard or CLI only.

## 4. The connected account is a SANDBOX — there is no live mode to flip

`DecodeC4 sandbox` (`acct_1TrxCXET4Rc2BDFf`) is **test-mode only**; the in-session MCP is bound to it, so every write lands in test mode. Real payments need a **separate activated live account** with its own live product/prices and `sk_live_…` keys — not derivable from the sandbox. (Production is `quaddojo.com`; staging is `staging.decodec4.xyz`.)

## 5. Stripe prices are IMMUTABLE

Prices were lowered to $2.99/mo + $21.99/yr by **archiving** the old $7.99/$59.99 prices (`active:false`) and creating NEW price objects on the same `DecodeC4 Pro` product (`prod_Urk9OP7eFRvzFc`), then updating `.env`. To change a price: create new + archive old + update the env var. **Never edit in place** — you can't.

## 6. An unset `STRIPE_SECRET_KEY` 503s the whole surface

It makes `paymentProcessor` null, so the **entire** `/api/stripe/*` surface returns 503 "Payments not configured" — not just checkout. A deploy needs all five vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (per-endpoint — §3), `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `FRONTEND_URL`.

Related: [[reference_supabase_connection]] (local service-role key + grants trail); [[project_app_qa_setup_gotchas]]; `docs/open_issues.md`.
