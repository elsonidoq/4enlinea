-- Migration 042: Add odd_even_threat and claimodd to category CHECK constraints
-- on candidates, puzzles, and false_positive_records.
-- (blunders were already fixed in migration 032.)

-- ── candidates ───────────────────────────────────────────────────────────────

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_category_check;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'odd_even_threat',
    'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

-- ── puzzles ──────────────────────────────────────────────────────────────────

ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_category_check;

ALTER TABLE public.puzzles
  ADD CONSTRAINT puzzles_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'odd_even_threat',
    'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));

-- ── false_positive_records ───────────────────────────────────────────────────

ALTER TABLE public.false_positive_records
  DROP CONSTRAINT IF EXISTS false_positive_records_category_check;

ALTER TABLE public.false_positive_records
  ADD CONSTRAINT false_positive_records_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'odd_even_threat',
    'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));
