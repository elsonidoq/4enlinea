-- Migration 002: Explanation cache
-- HUMAN REVIEW REQUIRED before applying.

CREATE TABLE IF NOT EXISTS public.explanation_cache (
  position_hash     text PRIMARY KEY,
  one_liner         text NOT NULL,
  deep_reveal_json  jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
