CREATE TABLE public.llm_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  movestring   text        NOT NULL,
  llm_prompt   text        NOT NULL,
  llm_response text        NOT NULL,
  human_note   text        NOT NULL,
  feature      text        NOT NULL
);

-- Explicit GRANTs required (migration 012 pattern — PostgREST returns 42501 without these)
GRANT SELECT, INSERT ON public.llm_feedback TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
