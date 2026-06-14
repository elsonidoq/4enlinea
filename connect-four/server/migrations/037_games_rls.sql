-- 037_games_rls.sql
-- Enable RLS on games to prevent device_uuid exposure via direct PostgREST access.
-- Server uses service_role and bypasses RLS; policies only affect direct API callers.

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own games.
CREATE POLICY "games_select_own"
  ON public.games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users may insert their own games.
CREATE POLICY "games_insert_own"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
