-- 036_past_games_schema.sql
-- Add game_id FK to blunders and accuracy column to games
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE blunders ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL;

ALTER TABLE games ADD COLUMN IF NOT EXISTS accuracy real;
