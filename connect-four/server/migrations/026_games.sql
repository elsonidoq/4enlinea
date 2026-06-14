-- 026_games.sql
-- Create the `games` table for sparring game records (Epic 3a).
-- HUMAN REVIEW REQUIRED before applying to production.

CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_uuid text NOT NULL,
  moves text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard','perfect')),
  side text NOT NULL CHECK (side IN ('first','second')),
  result text NOT NULL CHECK (result IN ('win','loss','draw')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_device_created ON public.games (device_uuid, created_at DESC);

GRANT SELECT, INSERT ON public.games TO anon, authenticated;
