-- 041_drop_blunders_unique.sql
-- Remove the partial unique index on blunders(user_id, board_state, move_played).
-- The index caused bulk inserts to silently drop entire batches when any single row
-- was a duplicate (e.g. the same board state appeared across two papergames games).
-- Duplicate blunder rows are acceptable; the coach queue de-dupes at query time.

DROP INDEX IF EXISTS idx_blunders_game_unique;
