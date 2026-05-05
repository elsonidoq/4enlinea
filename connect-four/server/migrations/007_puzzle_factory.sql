-- Migration 007: Puzzle Factory — candidates, false positive records, category 7

-- Extend puzzles table for category 7 (Forbidden Columns)
ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_category_check,
  ADD CONSTRAINT puzzles_category_check CHECK (category BETWEEN 1 AND 7);

ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_goal_predicate_type_check,
  ADD CONSTRAINT puzzles_goal_predicate_type_check
    CHECK (goal_predicate_type IN (
      'immediate_threat','forced_block','double_threat',
      'fork_setup','zugzwang','parity_control','forbidden_columns'
    ));

-- Candidate queue
CREATE TABLE IF NOT EXISTS public.candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category         integer NOT NULL CHECK (category BETWEEN 1 AND 7),
  move_string      text NOT NULL,
  solver_scores    jsonb NOT NULL,
  classifier_tags  jsonb NOT NULL DEFAULT '[]',
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  generation_run_id text NOT NULL,
  seed              bigint NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_candidates_category_status
  ON public.candidates(category, status);
CREATE INDEX IF NOT EXISTS idx_candidates_run
  ON public.candidates(generation_run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_move_string
  ON public.candidates(move_string);

-- False positive log (append-only)
CREATE TABLE IF NOT EXISTS public.false_positive_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES public.candidates(id),
  category       integer NOT NULL CHECK (category BETWEEN 1 AND 7),
  move_string    text NOT NULL,
  solver_scores  jsonb NOT NULL,
  annotator_note text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_false_positives_category
  ON public.false_positive_records(category);
CREATE INDEX IF NOT EXISTS idx_false_positives_created_at
  ON public.false_positive_records(created_at);
