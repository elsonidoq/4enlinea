-- Migration 013: Remove fork_setup and parity_control categories; rename zugzwang → forced_win.
-- No puzzles or candidates exist for fork_setup or parity_control so only the constraints change.
-- Existing zugzwang rows (if any) are renamed in-place before constraints are updated.

-- ── puzzles ──────────────────────────────────────────────────────────────────

UPDATE public.puzzles SET category = 'forced_win' WHERE category = 'zugzwang';
UPDATE public.puzzles SET goal_predicate_type = 'forced_win' WHERE goal_predicate_type = 'zugzwang';

ALTER TABLE public.puzzles DROP CONSTRAINT IF EXISTS puzzles_category_check;
ALTER TABLE public.puzzles ADD CONSTRAINT puzzles_category_check
  CHECK (category IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'));

ALTER TABLE public.puzzles DROP CONSTRAINT IF EXISTS puzzles_goal_predicate_type_check;
ALTER TABLE public.puzzles ADD CONSTRAINT puzzles_goal_predicate_type_check
  CHECK (goal_predicate_type IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'));

-- ── candidates ───────────────────────────────────────────────────────────────

UPDATE public.candidates SET category = 'forced_win' WHERE category = 'zugzwang';

ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_category_check;
ALTER TABLE public.candidates ADD CONSTRAINT candidates_category_check
  CHECK (category IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'));

-- ── false_positive_records ───────────────────────────────────────────────────

UPDATE public.false_positive_records SET category = 'forced_win' WHERE category = 'zugzwang';

ALTER TABLE public.false_positive_records DROP CONSTRAINT IF EXISTS false_positive_records_category_check;
ALTER TABLE public.false_positive_records ADD CONSTRAINT false_positive_records_category_check
  CHECK (category IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'));

-- ── blunders ─────────────────────────────────────────────────────────────────

UPDATE public.blunders SET pattern_category = 'forced_win' WHERE pattern_category = 'zugzwang';

ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'));
