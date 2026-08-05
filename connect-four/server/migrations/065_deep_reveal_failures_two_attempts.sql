-- Migration 065: Two-attempt logging columns on deep_reveal_failures (spec 058, US2).
--
-- Additive only, all six new columns nullable. The existing terminal-failure insert
-- (server/index.js, the callError/parseError/'empty mechanism' branch) keeps writing only the
-- original NOT NULL columns (position_hash, movestring, col, endpoint, llm_prompt,
-- raw_llm_output, failure_reason) and is completely unaffected by this migration.
--
-- A new insert site (server/index.js, in its own region away from the TTS handler) writes these
-- six columns for the "coach's retry still omitted a required square" case
-- (failure_reason = 'missing_required_squares', a new free-text value on the existing
-- failure_reason column -- no CHECK constraint exists on it, so no separate migration is needed
-- for that value).
--
-- No backfill: pre-launch disposability rule (CLAUDE.md) -- existing deep_reveal_failures rows
-- keep NULL in these new columns; no historical-row repair is planned.

ALTER TABLE public.deep_reveal_failures
  ADD COLUMN IF NOT EXISTS attempt1_raw_llm_output text,
  ADD COLUMN IF NOT EXISTS attempt1_mechanism text,
  ADD COLUMN IF NOT EXISTS attempt2_raw_llm_output text,
  ADD COLUMN IF NOT EXISTS attempt2_mechanism text,
  ADD COLUMN IF NOT EXISTS missing_handles jsonb,
  ADD COLUMN IF NOT EXISTS served_attempt smallint;
