-- Migration 005: Coach ordering placeholder
-- The blunders table and its index are already defined in 003_puzzles.sql.
-- This file exists to preserve migration runner ordering (no gap between 003 and 006).

SELECT 1;

-- Confirming: idx_blunders_user_unresolved is present in 003_puzzles.sql
-- on columns (user_id, created_at) WHERE resolved_at IS NULL.
