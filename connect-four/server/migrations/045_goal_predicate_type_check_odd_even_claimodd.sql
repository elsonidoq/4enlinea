-- Migration 045: Add odd_even_threat and claimodd to puzzles_goal_predicate_type_check.
-- Migration 042 fixed puzzles_category_check but left goal_predicate_type_check at the
-- old 015 definition, which excluded both slugs and caused insert failures on approve.

ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_goal_predicate_type_check;

ALTER TABLE public.puzzles
  ADD CONSTRAINT puzzles_goal_predicate_type_check
  CHECK (goal_predicate_type IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'odd_even_threat',
    'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));
