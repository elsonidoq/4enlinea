-- 038_papergames_games.sql
-- Add papergames_games table for imported games and link blunders to it.
-- HUMAN REVIEW REQUIRED before applying to production.

CREATE TABLE IF NOT EXISTS papergames_games (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  papergames_room_uid   text NOT NULL UNIQUE,
  papergames_account_id text NOT NULL,
  moves                 text NOT NULL,
  side                  text NOT NULL CHECK (side IN ('first', 'second')),
  result                text NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  opponent_name         text NOT NULL,
  opponent_account_id   text NOT NULL,
  opponent_avatar       text,
  opponent_country_code text,
  opponent_elo          integer,
  finish_reason         text,
  duration_ms           integer,
  tournament_uid        text,
  played_at             timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_papergames_games_user_id ON papergames_games(user_id, played_at DESC);

ALTER TABLE blunders ADD COLUMN IF NOT EXISTS papergames_game_id uuid REFERENCES papergames_games(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blunders_papergames_game_id ON blunders(papergames_game_id) WHERE papergames_game_id IS NOT NULL;
