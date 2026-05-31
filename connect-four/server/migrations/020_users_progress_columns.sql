-- Migration: 020
-- Description: Add streak_count, last_active_date, and sparring_record columns to users table
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sparring_record JSONB NOT NULL DEFAULT '{"W":0,"L":0,"D":0}';
