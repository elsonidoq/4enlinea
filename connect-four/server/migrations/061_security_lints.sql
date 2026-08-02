-- Migration 061: Address Supabase database-linter security findings.
--
-- Covers three lints:
--   0013 rls_disabled_in_public                        (ERROR) — public.schema_migrations
--   0011 function_search_path_mutable                  (WARN)  — public.handle_new_user
--   0028/0029 *_security_definer_function_executable   (WARN)  — public.handle_new_user
--
-- NOT covered (deliberately):
--   0012 auth_allow_anonymous_sign_ins — fires because the flagged policies apply to
--     the `authenticated` role, which Supabase anonymous sign-ins also grant. Every
--     flagged policy is already scoped by `auth.uid() = user_id`, so a guest only sees
--     its own rows. Adding an `is_anonymous is false` guard would break guest play.
--   auth_leaked_password_protection — a dashboard Auth setting, not schema.

-- ── 1. Lock down the migration ledger ────────────────────────────────────────
-- Created by migrate.js (CREATE TABLE IF NOT EXISTS, before any migration runs), so
-- it never got the RLS/grant treatment the other tables received in 010/012/040.
--
-- Verified on production 2026-07-29: RLS is off and `anon` holds SELECT, INSERT,
-- UPDATE, DELETE and TRUNCATE. `GET /rest/v1/schema_migrations` with the public
-- publishable key returns HTTP 200 and the ledger contents. Anyone with that key
-- can therefore DELETE ledger rows, which makes the next deploy re-run migrations
-- that are not idempotent. Staging already had RLS enabled; production had not.
--
-- Nothing legitimate reads this over PostgREST: migrate.js connects as the table
-- owner via DATABASE_URL, and owners bypass RLS.
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- The REVOKE is not redundant with RLS: TRUNCATE is not subject to row level
-- security, so enabling RLS alone would leave the TRUNCATE grant exploitable.
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;

-- ── 2. Pin the search_path of the SECURITY DEFINER signup trigger ────────────
-- public.handle_new_user() runs as its owner; a mutable search_path lets a caller
-- who can create objects in an earlier schema shadow `public.users`.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- ── 3. Stop anon/authenticated from reaching the function over /rest/v1/rpc ──
-- EXECUTE on a trigger function is checked when the trigger is CREATED, not when it
-- fires, so on_auth_user_created keeps working after this revoke. The explicit grant
-- to supabase_auth_admin is belt-and-braces for any future re-CREATE of the trigger;
-- it is guarded because that role does not exist on every environment.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;
