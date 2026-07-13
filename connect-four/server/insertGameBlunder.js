import { VALID_BLUNDER_TAGS } from './blunderTags.js';

/**
 * Insert a game blunder row into the DB. Fire-and-forget — errors are caught
 * and logged, never propagated. This is the sole write path for game blunders;
 * the client no longer writes them via POST /api/blunders.
 *
 * @param {object} supabase - Supabase client
 * @param {object} row - { user_id, device_uuid, board_state, move_played, correct_move,
 *   pattern_category, reason, direction, severity, blunder_severity, game_id,
 *   papergames_game_id }
 *   Authenticated rows carry user_id; anonymous rows carry device_uuid.
 *   Pass game_id for AI sparring games, papergames_game_id for papergames imports.
 *   Both are nullable — omit or pass null for puzzle blunders.
 * @returns {Promise<void>}
 */
export async function insertGameBlunder(supabase, row) {
  // Owner gate: authenticated rows carry user_id; anonymous rows carry device_uuid
  // (device-keyed, re-associated to user_id on /api/user/migrate). Reject only
  // when NEITHER identity is present.
  if (!row.user_id && !row.device_uuid) return;

  // Tag guard: substitute unrecognized tags before INSERT
  const safeTag = VALID_BLUNDER_TAGS.has(row.pattern_category)
    ? row.pattern_category
    : 'suboptimal_move';

  const quality = row.quality === 'suboptimal' ? 'suboptimal' : 'blunder';

  const payload = {
    user_id: row.user_id ?? null,
    device_uuid: row.device_uuid ?? null,
    board_state: row.board_state,
    move_played: row.move_played,
    correct_move: row.correct_move,
    pattern_category: safeTag,
    quality,
    reason: row.reason,
    direction: row.direction,
    severity: row.severity,
    blunder_severity: row.blunder_severity ?? null,
    move_index: row.board_state?.length ?? null,
    puzzle_id: null,
    game_id: row.game_id ?? null,
    papergames_game_id: row.papergames_game_id ?? null,
  };
  try {
    const { error } = await supabase.from('blunders').insert(payload);

    if (error) {
      if (error.code === '23505') {
        // duplicate — already recorded for this game/move
        return true;
      }
      console.error('[insertGameBlunder] code:', error.code, 'msg:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[insertGameBlunder] caught:', e.message);
    return false;
  }
}
