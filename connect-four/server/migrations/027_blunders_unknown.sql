ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat','forced_block','double_threat','forced_win','forbidden_columns',
    'z_threat','claimeven','undercut','overcut','figure_7','j_shape','unknown'
  ));
