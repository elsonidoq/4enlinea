-- Migration 066: Retry telemetry columns on explanation_cache (D61 follow-up, OI-181 adjacent).
--
-- Today `computeMechanism` (server/mechanismExplainer.mjs) computes whether a content retry fired,
-- why, and which attempt was ultimately served, but the deep-reveal cache insert
-- (server/index.js, ~line 1449) discards all of it. This migration adds three additive, nullable/
-- defaulted columns so retry behaviour is observable as production feedback.
--
-- `served_attempt` uses smallint 1/2 deliberately, matching the convention migration 065 already
-- established on `deep_reveal_failures.served_attempt` for the same concept -- two tables
-- describing the same event must not use two conventions. The in-memory 'attempt1'/'retry' string
-- (mechanismExplainer.mjs's `servedAttempt`) is mapped to 1/2 at the DB boundary in index.js.
--
-- `retry_fired`/`retry_reason` describe ONLY the content-triggered retry (a required-square/line
-- miss and/or an unnamed better column -- decideRetry in server/retryDecision.mjs). The
-- pre-existing LLM-error retry (a same-prompt resend on a call/parse failure, `isLlmError` branch
-- of computeMechanism) is a different trigger with no content "reason" to log and is NOT
-- represented by `retry_fired`/`retry_reason` -- see db-schema.md for the full caveat.
--
-- No backfill: pre-launch disposability rule (CLAUDE.md) -- existing explanation_cache rows keep
-- the defaults/NULL in these new columns; no historical-row repair is planned.

ALTER TABLE public.explanation_cache
  ADD COLUMN IF NOT EXISTS retry_fired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_reason jsonb,
  ADD COLUMN IF NOT EXISTS served_attempt smallint;
