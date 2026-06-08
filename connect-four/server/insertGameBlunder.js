import { VALID_BLUNDER_TAGS } from './blunderTags.js';

/**
 * Insert a game blunder row into the DB. Fire-and-forget — errors are caught
 * and logged, never propagated. This is the sole write path for game blunders;
 * the client no longer writes them via POST /api/blunders.
 *
 * @param {object} supabase - Supabase client
 * @param {object} row - { user_id, board_state, move_played, correct_move,
 *   pattern_category, reason, direction, severity, blunder_severity }
 * @returns {Promise<void>}
 */
export async function insertGameBlunder(supabase, row) {
  // Auth gate: anonymous users cannot write blunders
  if (!row.user_id) return;

  // Tag guard: substitute unrecognized tags before INSERT
  const safeTag = VALID_BLUNDER_TAGS.has(row.pattern_category)
    ? row.pattern_category
    : 'suboptimal_move';

  try {
    const { error } = await supabase.from('blunders').insert({
      user_id: row.user_id,
      board_state: row.board_state,
      move_played: row.move_played,
      correct_move: row.correct_move,
      pattern_category: safeTag,
      reason: row.reason,
      direction: row.direction,
      severity: row.severity,
      blunder_severity: row.blunder_severity ?? null,
      puzzle_id: null,
    });

    if (error) {
      if (error.code === '23505') {
        // Dedup — silent success
      } else {
        console.error('[insertGameBlunder]', error.message);
      }
    }
  } catch (e) {
    console.error('[insertGameBlunder]', e.message);
  }
}
