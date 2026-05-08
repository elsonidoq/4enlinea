-- Migration 010: Enable RLS on all backend-only tables
-- These tables are accessed exclusively via the service role key (Express backend).
-- Enabling RLS with no policies blocks anon/authenticated direct access while
-- the service role key continues to bypass RLS automatically.

ALTER TABLE public.tracks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blunders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.false_positive_records ENABLE ROW LEVEL SECURITY;
