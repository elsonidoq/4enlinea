-- Migration 015: Add highlight_metadata and category_evidence columns; extend category CHECK
-- constraints to include the six new tactical pattern slugs.

-- ── New columns ───────────────────────────────────────────────────────────────

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS category_evidence jsonb DEFAULT NULL;

-- ── Updated category constraints ──────────────────────────────────────────────

ALTER TABLE public.puzzles DROP CONSTRAINT IF EXISTS puzzles_category_check;
ALTER TABLE public.puzzles ADD CONSTRAINT puzzles_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

ALTER TABLE public.puzzles DROP CONSTRAINT IF EXISTS puzzles_goal_predicate_type_check;
ALTER TABLE public.puzzles ADD CONSTRAINT puzzles_goal_predicate_type_check
  CHECK (goal_predicate_type IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_category_check;
ALTER TABLE public.candidates ADD CONSTRAINT candidates_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

ALTER TABLE public.false_positive_records DROP CONSTRAINT IF EXISTS false_positive_records_category_check;
ALTER TABLE public.false_positive_records ADD CONSTRAINT false_positive_records_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

-- ── Explicit grants (migration 012 pattern) ───────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.false_positive_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blunders TO anon, authenticated;
