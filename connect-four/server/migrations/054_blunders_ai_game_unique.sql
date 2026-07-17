-- 054_blunders_ai_game_unique.sql
-- Add a per-user unique index on (user_id, game_id, move_index) for AI-sparring blunders,
-- mirroring migration 053's papergames-side idx_blunders_papergames_unique.
--
-- Found via spec-042 QA (2026-07-09): POST /api/games/analyze's per-mistake INSERT
-- (insertGameBlunder) has no uniqueness guard for AI sparring games (game_id-based rows) —
-- only papergames_game_id rows are protected (053). insertGameBlunder already has a
-- graceful `error.code === '23505'` duplicate handler, ready for exactly this constraint;
-- it was just never backed by a matching index for the game_id column. Without it, any
-- double-fire of /api/games/analyze for the same game (reproduced here via React StrictMode's
-- double effect invocation in dev, but also possible from network retries/double-tab races)
-- inserts literal duplicate blunder rows for the same move — inflating the Past Games
-- "N mistake(s)" count (computeBlunderCountsForGames, spec 041) and corrupting the
-- siblingMistakes "X of Y" position/count (GET /api/blunders/:id, spec 042 FR-009).
--
-- Note: migration 030's earlier attempt at a general unique index
-- (user_id, board_state, move_played) was dropped in 041 because it caused bulk-insert
-- batches to silently drop entirely when the SAME board_state appeared across two
-- DIFFERENT games. Scoping by (user_id, game_id, move_index) avoids that cross-game
-- collision entirely — move_index is unique per game by construction.

-- Pre-flight cleanup: the index below cannot be created while duplicate
-- (user_id, game_id, move_index) rows already exist. Keep the earliest-created row per
-- group (arbitrary but deterministic tiebreak) and delete the rest — this mirrors how a
-- unique constraint addition is normally staged behind existing data everywhere else in
-- this project's migration history (e.g. 053's own pre-flight notes).
DELETE FROM blunders b
USING blunders b2
WHERE b.game_id IS NOT NULL
  AND b.game_id = b2.game_id
  AND b.user_id = b2.user_id
  AND b.move_index = b2.move_index
  AND b.created_at > b2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_game_unique
  ON blunders (user_id, game_id, move_index)
  WHERE game_id IS NOT NULL;
