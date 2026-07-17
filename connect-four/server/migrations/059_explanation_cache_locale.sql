-- Migration 059: Add locale to explanation_cache so English and Spanish explanations coexist per position.
-- Verified against server/migrations/002_explanation_cache.sql: position_hash was declared
-- `text PRIMARY KEY` inline in the CREATE TABLE, so Postgres auto-named the constraint
-- `explanation_cache_pkey` (confirmed by docs/architecture/db-schema.md, "PK: position_hash").
-- No later migration (035/050) touched the PK, so this name is still current.

ALTER TABLE explanation_cache
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Replace the single-column position_hash uniqueness with a composite (position_hash, locale).
-- Existing rows already have locale='en' via the default, so this is safe.
ALTER TABLE explanation_cache
  DROP CONSTRAINT IF EXISTS explanation_cache_pkey CASCADE;

ALTER TABLE explanation_cache
  ADD PRIMARY KEY (position_hash, locale);
