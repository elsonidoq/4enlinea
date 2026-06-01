CREATE TABLE challenge_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL,
  puzzle_ids      UUID[]      NOT NULL,
  completed_count INT         NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce at most one open session per user+category
CREATE UNIQUE INDEX uq_challenge_sessions_open
  ON challenge_sessions(user_id, category)
  WHERE completed_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON challenge_sessions TO authenticated;
GRANT ALL ON challenge_sessions TO service_role;
