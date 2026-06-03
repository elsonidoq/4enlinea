-- Migration 030: add unique constraint on game blunders to prevent duplicates
-- Game blunders (puzzle_id IS NULL) are unique per (user_id, board_state, move_played).
-- Puzzle blunders are scoped by puzzle_id and not affected by this partial index.

CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_game_unique
  ON public.blunders (user_id, board_state, move_played)
  WHERE puzzle_id IS NULL;
