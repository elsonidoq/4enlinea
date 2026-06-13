-- Migration 040: Grant service_role full access to tables used by the server.
-- The server uses the service-role key to bypass RLS, but PostgREST still
-- requires explicit table-level grants. These were missing for most tables.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzle_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blunders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.explanation_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_feedback TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deep_reveal_failures TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.false_positive_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papergames_games TO service_role;
