-- Migration 014: Add interaction_mode column; purge stored-sequence forced_win rows.

ALTER TABLE public.puzzles
  ADD COLUMN interaction_mode TEXT NOT NULL DEFAULT 'single_move'
  CHECK (interaction_mode IN ('single_move', 'sequence'));

-- Retained for partial-rollback safety: if the DELETE below is skipped, forced_win rows
-- remain with the correct mode rather than the default 'single_move'.
UPDATE public.puzzles SET interaction_mode = 'sequence' WHERE category = 'forced_win';

-- Drop stored-sequence forced_win puzzles; they rely on cooperative_ai_moves which
-- is replaced by stateless per-move validation in this feature.
DELETE FROM public.puzzles WHERE category = 'forced_win';

-- Explicit grants required for PostgREST access (pattern from migration 012).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated;
