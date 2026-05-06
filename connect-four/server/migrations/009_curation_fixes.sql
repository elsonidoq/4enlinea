ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS highlight_cells jsonb,
  ADD COLUMN IF NOT EXISTS debug_trace     jsonb;
