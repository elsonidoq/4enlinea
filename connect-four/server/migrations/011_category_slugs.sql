-- Migration 011: Replace integer category columns with text slug columns.
-- Strategy: drop and recreate the 4 affected tables. Existing rows are discarded
-- (see pre-migration dump at server/data/pre-migration-dump.json).
--
-- Drop order with CASCADE handles FK dependencies from puzzle_attempts and blunders.
-- puzzle_attempts.puzzle_id (NOT NULL) references puzzles — CASCADE drops that FK constraint.
-- blunders.puzzle_id references puzzles — CASCADE drops that FK constraint too.
-- After recreating puzzles, both FKs are re-added as NOT VALID so existing orphaned
-- puzzle_attempts rows are not rejected (they predate the migration).

-- ── Drop dependent tables first (respect false_positive_records → candidates FK) ──

DROP TABLE IF EXISTS public.false_positive_records;
DROP TABLE IF EXISTS public.candidates;
DROP TABLE IF EXISTS public.blunders;

-- CASCADE drops FK constraints from puzzle_attempts and blunders that reference puzzles.
DROP TABLE IF EXISTS public.puzzles CASCADE;

-- ── Recreate puzzles ──────────────────────────────────────────────────────────

CREATE TABLE public.puzzles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category              text NOT NULL CHECK (category IN (
                          'immediate_threat','forced_block','double_threat',
                          'fork_setup','zugzwang','parity_control','forbidden_columns'
                        )),
  move_string           text NOT NULL,
  goal_prompt           text NOT NULL,
  goal_predicate_type   text NOT NULL
                        CHECK (goal_predicate_type IN (
                          'immediate_threat','forced_block','double_threat',
                          'fork_setup','zugzwang','parity_control','forbidden_columns'
                        )),
  goal_predicate_params jsonb NOT NULL DEFAULT '{}',
  cooperative_ai_moves  integer[] NOT NULL DEFAULT '{}',
  difficulty            integer NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active             boolean NOT NULL DEFAULT true,
  user_player           smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1, 2)),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzles_category ON public.puzzles(category) WHERE is_active = true;

ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

-- Re-add FK on puzzle_attempts. NOT VALID skips checking existing rows (orphaned by migration).
ALTER TABLE public.puzzle_attempts
  ADD CONSTRAINT puzzle_attempts_puzzle_id_fkey
  FOREIGN KEY (puzzle_id) REFERENCES public.puzzles(id)
  NOT VALID;

-- ── Recreate candidates ───────────────────────────────────────────────────────

CREATE TABLE public.candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category          text NOT NULL CHECK (category IN (
                      'immediate_threat','forced_block','double_threat',
                      'fork_setup','zugzwang','parity_control','forbidden_columns'
                    )),
  move_string       text NOT NULL,
  solver_scores     jsonb NOT NULL,
  classifier_tags   jsonb NOT NULL DEFAULT '[]',
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason  text,
  generation_run_id text NOT NULL,
  seed              bigint NOT NULL,
  user_player       smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1, 2)),
  highlight_cells   jsonb,
  debug_trace       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);

CREATE INDEX idx_candidates_category_status ON public.candidates(category, status);
CREATE INDEX idx_candidates_run             ON public.candidates(generation_run_id);
CREATE INDEX idx_candidates_move_string     ON public.candidates(move_string);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- ── Recreate false_positive_records ──────────────────────────────────────────

CREATE TABLE public.false_positive_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES public.candidates(id),
  category       text NOT NULL CHECK (category IN (
                   'immediate_threat','forced_block','double_threat',
                   'fork_setup','zugzwang','parity_control','forbidden_columns'
                 )),
  move_string    text NOT NULL,
  solver_scores  jsonb NOT NULL,
  annotator_note text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_false_positives_category   ON public.false_positive_records(category);
CREATE INDEX idx_false_positives_created_at ON public.false_positive_records(created_at);

ALTER TABLE public.false_positive_records ENABLE ROW LEVEL SECURITY;

-- ── Recreate blunders ─────────────────────────────────────────────────────────

CREATE TABLE public.blunders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  puzzle_id         uuid,
  board_state       text NOT NULL,
  move_played       integer NOT NULL,
  correct_move      integer NOT NULL,
  pattern_category  text NOT NULL CHECK (pattern_category IN (
                      'immediate_threat','forced_block','double_threat',
                      'fork_setup','zugzwang','parity_control','forbidden_columns'
                    )),
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blunders_user_unresolved
  ON public.blunders(user_id, created_at)
  WHERE resolved_at IS NULL;

ALTER TABLE public.blunders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own blunders"
  ON public.blunders FOR SELECT
  USING (auth.uid() = user_id);

-- Re-add FK on blunders (NOT VALID for same reason as puzzle_attempts above).
ALTER TABLE public.blunders
  ADD CONSTRAINT blunders_puzzle_id_fkey
  FOREIGN KEY (puzzle_id) REFERENCES public.puzzles(id)
  NOT VALID;
