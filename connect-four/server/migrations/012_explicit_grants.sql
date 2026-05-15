-- Migration 012: Explicit grants for tables accessed by the frontend (anon key).
-- Required before October 30, 2026 when Supabase enforces explicit grants on all
-- existing projects. RLS policies already enforce row-level access; these grants
-- allow PostgREST to reach the tables at all.

GRANT SELECT, UPDATE ON public.users TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.session_stats TO authenticated;

GRANT INSERT, SELECT ON public.puzzle_attempts TO authenticated;
