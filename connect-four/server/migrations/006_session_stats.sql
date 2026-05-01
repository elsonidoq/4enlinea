-- Migration 006: Session stats table for per-user per-date accuracy tracking

CREATE TABLE IF NOT EXISTS public.session_stats (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date    DATE NOT NULL,
  stats   JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.session_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session stats"
  ON public.session_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
