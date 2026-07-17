-- 053_papergames_ownership_and_blunder_index.sql
-- Per-user ownership for imported papergames games + per-user blunder dedup index.
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- Fixes a cross-user ownership collision (spec 041, User Story 4): today
-- papergames_games has a single global UNIQUE(papergames_room_uid), so when a
-- second user imports a room a first user already imported, the upsert
-- (onConflict: 'papergames_room_uid') silently reassigns the existing row's
-- user_id, transferring the game (and blunder linkage) away from the first
-- user. This migration scopes ownership to (user_id, papergames_room_uid) and
-- re-scopes the blunder dedup index to per-user as well — both changes ship
-- together (the blunder-index change alone is "necessary but not sufficient").
--
-- No data UPDATE step: per spec 041 Out of Scope ("Historical-data repair"),
-- the production database has no real users yet, so pre-existing rows may be
-- reset/recreated cleanly rather than repaired in place.

-- 1. DROP old constraints (order matters: drop before add, per data-model.md
--    Migration Naming convention). Names verified against a live reachable DB
--    2026-07-07 (see specs/041-past-games-data-integrity/data-model.md
--    § Constraint-name verification) — re-verify against production
--    immediately before applying there (T025).
ALTER TABLE papergames_games DROP CONSTRAINT IF EXISTS papergames_games_papergames_room_uid_key;
DROP INDEX IF EXISTS idx_blunders_papergames_unique;

-- 1a. Post-drop guard: fail loudly, not silently, if a global (single-column)
--     UNIQUE on papergames_room_uid is still active under any other name
--     (e.g. because the DROP above was a no-op due to a name mismatch not
--     caught by the pre-flight verification). IF EXISTS alone would let a
--     wrong name pass through as a silent no-op that leaves the QA-blocker
--     (User Story 4) unfixed while this migration still reports success.
DO $$
DECLARE
  stray_name text;
BEGIN
  SELECT tc.constraint_name INTO stray_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'papergames_games'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.constraint_name
  HAVING count(*) = 1 AND string_agg(kcu.column_name, ',') = 'papergames_room_uid';

  IF stray_name IS NOT NULL THEN
    RAISE EXCEPTION 'papergames_games still has a global UNIQUE(papergames_room_uid) constraint (name: %) after the DROP step — migration aborted; the DROP CONSTRAINT name above is stale, re-verify against information_schema.table_constraints and fix before retrying', stray_name;
  END IF;
END $$;

-- 2. No data UPDATE step. Per spec 041 Out of Scope ("Historical-data repair"):
--    the production database has no real users yet; existing rows may be
--    reset/recreated cleanly rather than remapped. No UPDATE is required or
--    performed here.

-- 3. ADD new composite unique constraints.
ALTER TABLE papergames_games
  ADD CONSTRAINT papergames_games_user_room_unique UNIQUE (user_id, papergames_room_uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_papergames_unique
  ON blunders (user_id, papergames_game_id, move_index)
  WHERE papergames_game_id IS NOT NULL;
