-- Migration 061: Add correct_cols column to puzzles and candidates tables.
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- Spec 051 (Epic 1, Pattern Acceptance): the full solver-gated answer SET for a puzzle's taught
-- pattern, computed once at generation time and stored — replacing per-request re-derivation of
-- "which columns count as correct." Sits alongside the existing correct_col scalar (016_correct_col.sql),
-- which is kept and synced as correct_cols[0] for this feature (see docs/open_issues.md OI-81 for
-- the deferred full retirement of correct_col). Always stored in ascending column-index order
-- (no ranking meaning — see docs/architecture/data-model.md "Correct Column Storage").

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS correct_cols integer[] DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS correct_cols integer[] DEFAULT NULL;
