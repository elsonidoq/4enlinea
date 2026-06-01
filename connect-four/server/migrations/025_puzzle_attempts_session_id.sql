ALTER TABLE puzzle_attempts
  ADD COLUMN session_id UUID REFERENCES challenge_sessions(id) ON DELETE SET NULL;
