-- Migration: 021
-- Description: Create lesson_progress table with RLS policies for per-user lesson tracking
-- HUMAN REVIEW REQUIRED before applying to production.

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_progress_select ON lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY lesson_progress_insert ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY lesson_progress_update ON lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY lesson_progress_delete ON lesson_progress
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO authenticated;
