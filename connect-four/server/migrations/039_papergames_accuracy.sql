-- 039_papergames_accuracy.sql
-- Add accuracy column to papergames_games, computed during import.
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE papergames_games ADD COLUMN IF NOT EXISTS accuracy real;
