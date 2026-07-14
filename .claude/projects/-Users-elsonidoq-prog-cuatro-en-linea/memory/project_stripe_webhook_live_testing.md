---
name: project_stripe_webhook_live_testing
description: "Mocked Stripe webhook tests pass while real DB-write bugs (wrong column, missing grants) ship — smoke-test live before trusting green"
metadata: 
  node_type: memory
  type: project
  originSessionId: eb04b04c-5c28-44e5-99df-8eda3cff3c07
---

**Trigger: before trusting `stripeProcessor.test.mjs` green after changing the Stripe webhook's DB writes.**

The `stripeProcessor.test.mjs` mock enforces `UNIQUE(stripe_event_id)` (returns `23505` on repeat) but does **NOT** enforce the real `stripe_events` column set or Postgres grants. So webhook DB-write bugs pass every unit test and only fail against a real DB. Two such bugs shipped through the mocked suite in spec 045 and were caught only by a live `stripe trigger`:
1. The `stripe_events` insert used column `event_type` — the real column is `type` (see `db-schema.md`). Insert failed on every event ("Could not find the 'event_type' column"), silently defeating the idempotency ledger.
2. `stripe_events` and `tracks` were missing `service_role` grants locally (42501 permission denied) — `040_service_role_grants.sql` never listed them; fixed by migration `055`. The webhook writes to BOTH tables (`stripe_events` ledger + `tracks` `upgrade_completed`), and `tracks` is easy to forget.

**How to apply:** After any change to `handleWebhook`'s DB writes, run a live smoke test, don't trust the mock:
```
cd connect-four
stripe listen --forward-to localhost:3001/api/stripe/webhook   # prints whsec_ (cached per account — usually unchanged across restarts); put in server/.env; server reads it at BOOT so restart after
stripe trigger checkout.session.completed                       # synthetic event → carries NO real user_id, so no tier flip; validates signature-verify + ledger insert only
```
Then check the server log for `permission denied` / `Could not find … column`, and `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT stripe_event_id,type FROM stripe_events ORDER BY created_at DESC LIMIT 3;"`. For a REAL tier flip you must drive an actual browser checkout (createCheckout stamps `metadata.user_id`, which `handleWebhook` reads) OR `stripe trigger checkout.session.completed --add checkout_session:metadata.user_id=<realUserId>`. Raw-body middleware ordering + idempotency + FR-025 tier-mirror are all in `server-conventions.md`. Related: [[project_local_supabase_setup]], [[project_auth_payments_state]].
