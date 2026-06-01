-- Migration 023: Make llm_prompt nullable in llm_feedback.
-- The new Deep Reveal flow calls the LLM server-side; the prompt is not
-- returned to the client, so flagging cannot include it.
ALTER TABLE public.llm_feedback ALTER COLUMN llm_prompt DROP NOT NULL;
