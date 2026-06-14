-- Migration: 022
-- Description: Ensure deep_reveal_reset_at column exists and is nullable with no default
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deep_reveal_reset_at TIMESTAMPTZ;

ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP NOT NULL;

ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP DEFAULT;
