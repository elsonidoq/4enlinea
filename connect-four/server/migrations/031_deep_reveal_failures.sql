-- Migration 031: Create deep_reveal_failures table for annotation validation failure logging.
-- Backend-only append-only log. No RLS, no GRANTs — server writes via service-role-key client.

CREATE TABLE IF NOT EXISTS public.deep_reveal_failures (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  position_hash    text        NOT NULL,
  movestring       text        NOT NULL,
  col              integer     NOT NULL,
  endpoint         text        NOT NULL DEFAULT '/api/explain-move-llm',
  llm_prompt       text        NOT NULL,
  raw_llm_output   text        NOT NULL,
  failure_reason   text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
