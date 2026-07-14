-- Migration 056: LLM usage ledger (spec 047 US5 — cost observability)
-- Append-only ledger of every OpenAI chat-completion call made through the
-- unified server/llmChat.js helper (FR-021). One row per call attempt that
-- COMPLETED SUCCESSFULLY — failed calls are logged (FR-022) but never produce
-- a row here (no partial/fabricated records). See
-- specs/047-platform-hardening-cost-observability/data-model.md for the full
-- column spec and lifecycle notes.
--
-- Lifecycle: append-only, NEVER truncated or purged by deploy (FR-021, US5
-- AC5) — this is the defining difference from explanation_cache, which the
-- deploy pipeline TRUNCATEs. This migration file, and any future one, MUST
-- NOT add a TRUNCATE/DELETE against llm_usage.

CREATE TABLE IF NOT EXISTS public.llm_usage (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint           text NOT NULL,
  purpose            text NOT NULL,
  user_id            uuid,
  model              text NOT NULL,
  prompt_tokens      integer NOT NULL,
  completion_tokens  integer NOT NULL,
  total_tokens       integer NOT NULL,
  cost_usd           numeric,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS: enabled, deny-by-default, no policies — matches explanation_cache /
-- stripe_events precedent (migrations 010/037/055, F10 positive control).
-- All access is server-side via the service-role Supabase client.
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_usage TO service_role;
