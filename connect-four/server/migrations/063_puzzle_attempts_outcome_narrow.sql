-- Migration 063: Narrow puzzle_attempts.outcome's CHECK constraint to the four values
-- actually written today, plus the new 'incorrect' value (spec 054 US3).
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- Drops 'revealed' and 'correct_retry' (written by no current code path) and adds
-- 'incorrect' (a wrong submitted answer, distinct from 'abandoned' — reserved for the user
-- leaving without answering). 'tied' is KEPT — it is live, written by
-- POST /api/puzzles/:id/check via evaluatePredicate's 'tied' result.
--
-- Pre-migration live-DB check (FR-017), measured 2026-08-02 via a service-role Supabase
-- client querying `select outcome from puzzle_attempts where outcome not in
-- ('correct_first','tied','incorrect','abandoned')`, grouped by value, against all THREE
-- reachable environments (none were unreachable):
--   LOCAL      (server/.env,            127.0.0.1:54322):            0 non-conforming rows
--   STAGING    (server/.env.staging,    jkqilynpshutqcceopdn project): 0 non-conforming rows
--   PRODUCTION (server/.env.production, kxtqwsumojtexokrtlfp project): 2 non-conforming rows,
--     both outcome='correct_retry' (0 'revealed', 0 unforeseen values)
-- The remap below is exercised by production's 2 real 'correct_retry' rows and is a safe
-- no-op everywhere else.
--
-- The remap below is a lossless, mechanical value substitution for any stray non-conforming
-- row (not the forbidden incorrect/abandoned backfill, which stays historical and unrecoverable
-- — see FR-022 note further down). Safe no-op if zero such rows exist. The remap is SPLIT by
-- source value, not a single catch-all NOT IN(...) -> 'abandoned' (Decision 1, plan-critique
-- step): a pre-existing 'correct_retry' row recorded a SUCCESS (a correct answer, on retry), so
-- collapsing it into 'abandoned' would relabel a success as an abandonment — the opposite
-- semantic, and exactly what the epic's Settled decision #3 (remaps must carry no information
-- loss) forbids. The retry-vs-first distinction is already carried by the separate
-- `first_attempt_correct` boolean column, so mapping 'correct_retry' -> 'correct_first' loses
-- nothing that isn't already preserved elsewhere. 'revealed' (the user gave up and was shown the
-- answer) has no conforming value that preserves its meaning any better than 'abandoned', so it
-- remains the closest fit.
UPDATE public.puzzle_attempts
  SET outcome = 'correct_first'
  WHERE outcome = 'correct_retry';

UPDATE public.puzzle_attempts
  SET outcome = 'abandoned'
  WHERE outcome NOT IN ('correct_first', 'tied', 'incorrect', 'abandoned');
  -- At this point 'correct_retry' rows have already been remapped above, so this catch-all only
  -- catches 'revealed' (and, defensively, any other unforeseen non-conforming value).

-- FR-022 note (distinct from the FR-017 remap above): the remap is a LOSSLESS value
-- substitution for the small number of rows found by the pre-migration check. Separately and
-- unavoidably, this migration does NOT — and cannot — backfill the 'incorrect'-vs-'abandoned'
-- distinction for any HISTORICAL row that predates this migration: every pre-existing row that
-- was NOT already 'correct_first'/'correct_retry'/'tied' is indistinguishable, after the fact,
-- between "the player submitted a wrong answer" (should be 'incorrect') and "the player walked
-- away without answering" (should be 'abandoned') — that distinction was never recorded before
-- this migration (today's server writer only ever wrote 'correct_first'/'tied'/'abandoned';
-- nothing wrote 'incorrect' because the OLD constraint rejected it and the write was silently
-- dropped by a fire-and-forget .catch). This is an accepted, permanent historical gap, not a
-- defect in this migration's remap logic.

-- Two-step constraint swap (NOT VALID + VALIDATE) avoids a full-table lock during validation,
-- per docs/architecture/db-schema.md's general safe-migration guidance.
ALTER TABLE public.puzzle_attempts
  DROP CONSTRAINT IF EXISTS puzzle_attempts_outcome_check;

ALTER TABLE public.puzzle_attempts
  ADD CONSTRAINT puzzle_attempts_outcome_check
  CHECK (outcome IN ('correct_first', 'tied', 'incorrect', 'abandoned'))
  NOT VALID;

ALTER TABLE public.puzzle_attempts
  VALIDATE CONSTRAINT puzzle_attempts_outcome_check;

-- Constraint name confirmed against the LOCAL live schema on 2026-08-02 via
-- `psql "$DATABASE_URL" -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE
-- conrelid = 'public.puzzle_attempts'::regclass AND contype='c';"`. It IS
-- `puzzle_attempts_outcome_check` (the standard `<table>_<column>_check` auto-generated name for
-- an inline CHECK, as declared unnamed in 003_puzzles.sql) — matches the assumption above.
