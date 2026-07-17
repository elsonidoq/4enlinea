-- Migration 047: Add Papergames user columns + blunders.move_index + partial unique index.
-- Adds papergames_id and last_import_at to users;
-- adds move_index to blunders for papergames dedup;
-- creates a partial unique index on (papergames_game_id, move_index).
-- Column (3) must appear before index (4) — index depends on the column.
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE users ADD COLUMN IF NOT EXISTS papergames_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_import_at timestamptz;
ALTER TABLE blunders ADD COLUMN IF NOT EXISTS move_index integer;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_papergames_unique ON blunders (papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL;
