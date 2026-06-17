-- Migration 046: Grant papergames_games to anon/authenticated.
-- Migration 040 granted to service_role only, but the local Supabase
-- service_role role may not exist or may not have inherited the grants.
-- Matching the pattern from 026_games.sql for the games table.
-- HUMAN REVIEW REQUIRED before applying to production.

GRANT SELECT ON public.papergames_games TO anon, authenticated;
