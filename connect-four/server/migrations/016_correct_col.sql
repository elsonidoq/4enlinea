-- Migration 016: Add correct_col column to puzzles and candidates tables.
-- Required by the new tactical puzzle categories (claimeven, figure_7, j_shape)
-- where the correct column is computed at generation time and stored for play-time evaluation.

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS correct_col integer DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS correct_col integer DEFAULT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon, authenticated;
