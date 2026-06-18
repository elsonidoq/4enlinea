-- Migration 049: Allow service_role to insert blunders.
-- Migration 010 assumed service_role bypasses RLS automatically (BYPASSRLS),
-- but local Supabase does not guarantee this. An explicit policy is safer and
-- makes the intent visible in both local and production environments.

CREATE POLICY "Backend service role can insert blunders"
  ON public.blunders FOR INSERT
  TO service_role
  WITH CHECK (true);
