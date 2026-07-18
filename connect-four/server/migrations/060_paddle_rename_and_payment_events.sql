-- Migration 060: Rename Stripe-era identifiers to Paddle-era identifiers.
-- Additive rename only — no data migration needed (zero live rows, per
-- specs/050-paddle-checkout-migration/spec.md Assumptions).
--
--   users.stripe_customer_id -> users.paddle_customer_id
--   stripe_events            -> payment_events
--   payment_events.stripe_event_id -> payment_events.event_id
--   payment_events.type            -> payment_events.event_type
--
-- RLS and service_role grants on stripe_events (migrations/010_rls_backend_tables.sql,
-- 055_stripe_events_tracks_grants.sql) are preserved automatically by RENAME TABLE/COLUMN
-- (same physical OID) — no re-GRANT or re-ENABLE ROW LEVEL SECURITY needed here. Verified
-- post-apply via `SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_events';`
-- and `\dp payment_events`.

ALTER TABLE public.users RENAME COLUMN stripe_customer_id TO paddle_customer_id;

ALTER TABLE public.stripe_events RENAME TO payment_events;
ALTER TABLE public.payment_events RENAME COLUMN stripe_event_id TO event_id;
ALTER TABLE public.payment_events RENAME COLUMN type TO event_type;
