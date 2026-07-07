-- Migration 052: widen blunders_pattern_category_check for parity-aware threat tags
--
-- The classifier began emitting three parity-aware threat tags on 2026-06-25
-- (major_threat_parity, major_threat_nonparity, minor_threat) and added them to
-- VALID_BLUNDER_TAGS in blunderTags.js, but the DB check constraint was never
-- widened. insertGameBlunder passed the tags through the code guard unchanged,
-- and every such row was rejected with error 23514 (blunder analysis silently
-- lost on papergames import / sparring games).
--
-- Existing allowed values (odd_even_threat, claimodd) are retained so historical
-- rows stay valid.
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE public.blunders
  DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;

ALTER TABLE public.blunders
  ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'major_threat_parity', 'major_threat_nonparity', 'minor_threat',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ));
