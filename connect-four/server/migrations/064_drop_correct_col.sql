-- Migration 064: Drop the legacy correct_col scalar column from puzzles and candidates.
-- HUMAN REVIEW REQUIRED before applying to production. NOT REVERSIBLE — back up the affected
-- tables/columns before running against staging or production (see docs/deployment_steps.md
-- "## Spec 056").
--
-- Spec 056 (correct-col-retirement), User Story 3: closes docs/open_issues.md OI-81. The
-- `correct_cols integer[]` column (migration 061_correct_cols.sql, spec 051 Epic 1) has been the
-- sole storage contract for a puzzle's/candidate's accepted answer set since User Story 2 of this
-- spec landed — every sync-writer (`server/candidate-generator.js`'s `checkPredicate`,
-- `server/scripts/backfill-correct-cols.mjs`, `server/promotePuzzleRow.js`) stopped producing the
-- `correct_col` scalar, and every reader (`server/predicates.js`, `server/evaluateMoveHandler.js`,
-- `server/index.js`, `server/shapeDescriptor.js`, `server/scripts/audit_answer_ambiguity.mjs`, the
-- frontend wire contract) was migrated to read `correct_cols` exclusively. A fresh repo-wide
-- `/usr/bin/grep -rn "correct_col\b" server src scripts tests` (run 2026-08-03, this migration's
-- authoring session) confirms zero remaining consumer references — matches exist only in
-- 016_correct_col.sql, 061_correct_cols.sql (both historical), and this file.
--
-- This migration was applied against the LOCAL database only in this session (Decision B); staging
-- and production application is the owner's call — see docs/deployment_steps.md "## Spec 056" for
-- the runbook.

ALTER TABLE public.puzzles
  DROP COLUMN IF EXISTS correct_col;

ALTER TABLE public.candidates
  DROP COLUMN IF EXISTS correct_col;
