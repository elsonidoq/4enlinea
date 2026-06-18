-- Migration 048: Grant permissions on papergames_games to authenticated and service_role.
-- Migration 038 created the table without GRANT statements; PostgREST returns
-- 42501 "permission denied" without explicit grants (same pattern as migration 012).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.papergames_games TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papergames_games TO service_role;
