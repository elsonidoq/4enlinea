// Server-mediated write helpers for user data.
// Each function takes a supabase client (service-role key) plus domain args,
// performs a single DB operation, and returns { error } on failure or undefined on success.

/**
 * Upsert a session_stats row. Full-replace — no || merge.
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId
 * @param {string} date - 'YYYY-MM-DD'
 * @param {object} stats - arbitrary JSON-serializable object
 * @returns {Promise<{error: string}|undefined>}
 */
export async function writeSessionStats(supabase, userId, date, stats) {
  const { error } = await supabase
    .from('session_stats')
    .upsert({ user_id: userId, date, stats }, { onConflict: 'user_id,date' });
  if (error) return { error: error.message };
}

/**
 * Upsert lesson_progress rows. Only processes rows with status === 'complete'.
 * Silently skips rows where status is not 'complete'.
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId
 * @param {Array<{lessonId: string, status: string}>} lessonRows
 * @returns {Promise<{error: string}|undefined>}
 */
export async function writeLessonProgress(supabase, userId, lessonRows) {
  for (const row of lessonRows) {
    if (row.status !== 'complete') continue;
    const { error } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: row.lessonId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' },
      );
    if (error) return { error: error.message };
  }
}

/**
 * Bulk-insert puzzle_attempts rows. Sets user_id and device_uuid from parameters
 * (never from row data). Sets created_at if absent. Treats 23505 unique-violation
 * as success. No-op if attempts is empty.
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId
 * @param {string} deviceUuid
 * @param {Array<object>} attempts
 * @returns {Promise<{error: string}|undefined>}
 */
export async function writePuzzleAttempts(supabase, userId, deviceUuid, attempts) {
  if (!attempts || attempts.length === 0) return;

  const rows = attempts.map((a) => ({
    user_id: userId,
    device_uuid: deviceUuid,
    puzzle_id: a.puzzle_id,
    moves_tried: a.moves_tried,
    outcome: a.outcome,
    first_attempt_correct: a.first_attempt_correct,
    time_ms: a.time_ms,
    created_at: a.created_at || new Date().toISOString(),
  }));

  try {
    const { error } = await supabase.from('puzzle_attempts').insert(rows);
    if (error) {
      // 23505 = unique_violation — treat as success (duplicate retry)
      if (error.code === '23505') return;
      return { error: error.message };
    }
  } catch (err) {
    // Some Supabase client versions throw on 23505 instead of returning error
    if (err?.code === '23505') return;
    return { error: err.message };
  }
}

/**
 * Update the user's sparring_record jsonb column.
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId
 * @param {object} record - e.g. { W: 3, L: 1, D: 0 }
 * @returns {Promise<{error: string}|undefined>}
 */
export async function writeSparringRecord(supabase, userId, record) {
  const { error } = await supabase
    .from('users')
    .update({ sparring_record: record })
    .eq('id', userId);
  if (error) return { error: error.message };
}

/**
 * Update the user's streak_count and last_active_date.
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId
 * @param {{streak_count: number, last_active_date: string}} streak
 * @returns {Promise<{error: string}|undefined>}
 */
export async function writeStreak(supabase, userId, streak) {
  const { error } = await supabase
    .from('users')
    .update({
      streak_count: streak.streak_count,
      last_active_date: streak.last_active_date,
    })
    .eq('id', userId);
  if (error) return { error: error.message };
}
