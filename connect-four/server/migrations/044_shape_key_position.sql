-- 044_shape_key_position.sql
-- Add shape_key, position, and highlight_cells columns to puzzles table
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS shape_key TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS highlight_cells JSONB;

-- Frontend anon/authenticated roles need SELECT on new columns
GRANT SELECT (shape_key, position, highlight_cells) ON public.puzzles TO anon, authenticated;

-- Service role needs full access
GRANT SELECT, INSERT, UPDATE ON public.puzzles TO service_role;
