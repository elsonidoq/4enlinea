-- Epic 1 (patterns-blunders): discard old unknown-tagged rows and tighten
-- the pattern_category constraint to exclude 'unknown'. Rows will be
-- regenerated with correct tags in Epic 2 (reprocess-all-games step).

TRUNCATE public.blunders;

ALTER TABLE public.blunders
  DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;

ALTER TABLE public.blunders
  ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ));
