-- Migration 055: Grant service_role access to stripe_events and tracks.
-- Migration 040 (service_role catch-all) omitted both tables, but the Stripe
-- webhook handler (server/stripeProcessor.js handleWebhook) writes to BOTH:
--   - stripe_events   (idempotency ledger; insert result drives the 23505 dedup)
--   - tracks          (the upgrade_completed analytics event)
-- Without these grants, local Supabase returns 42501 "permission denied" on every
-- webhook, which silently defeats the idempotency guard (the ledger insert always
-- fails) and drops the upgrade analytics. Hosted Supabase auto-grants service_role,
-- so this only affects local/dev — same class as migrations 046/048.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO service_role;
