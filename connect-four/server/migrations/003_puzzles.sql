-- Migration 003: Puzzles and puzzle attempts
-- HUMAN REVIEW REQUIRED before applying.

CREATE TABLE IF NOT EXISTS public.puzzles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category              integer NOT NULL CHECK (category BETWEEN 1 AND 6),
  move_string           text NOT NULL,
  goal_prompt           text NOT NULL,
  goal_predicate_type   text NOT NULL
                        CHECK (goal_predicate_type IN (
                          'immediate_threat','forced_block','double_threat',
                          'fork_setup','zugzwang','parity_control'
                        )),
  goal_predicate_params jsonb NOT NULL DEFAULT '{}',
  cooperative_ai_moves  integer[] NOT NULL DEFAULT '{}',
  difficulty            integer NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puzzles_category ON public.puzzles(category) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.puzzle_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id             uuid NOT NULL REFERENCES public.puzzles(id),
  user_id               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  device_uuid           text NOT NULL,
  moves_tried           integer[] NOT NULL DEFAULT '{}',
  outcome               text NOT NULL
                        CHECK (outcome IN ('correct_first','correct_retry','revealed','tied','abandoned')),
  first_attempt_correct boolean NOT NULL,
  time_ms               integer,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user   ON public.puzzle_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_device ON public.puzzle_attempts(device_uuid, created_at);

CREATE TABLE IF NOT EXISTS public.blunders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  puzzle_id         uuid REFERENCES public.puzzles(id),
  board_state       text NOT NULL,
  move_played       integer NOT NULL,
  correct_move      integer NOT NULL,
  pattern_category  integer NOT NULL CHECK (pattern_category BETWEEN 1 AND 6),
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blunders_user_unresolved
  ON public.blunders(user_id, created_at)
  WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE public.puzzle_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own attempts"
  ON public.puzzle_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can read own attempts"
  ON public.puzzle_attempts FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE public.blunders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own blunders"
  ON public.blunders FOR SELECT
  USING (auth.uid() = user_id);
