// Server-mediated write helpers for user data.
// Each function takes a supabase client (service-role key) plus domain args,
// performs a single DB operation, and returns { error } on failure or undefined on success.

/**
 * Columns `loadUser` (server/index.js) selects from `users` for the profile object
 * attached to `req.user`, and that it re-selects after inserting a just-created row.
 * `stripe_customer_id` (spec 045 R3) is included so `getSubscriptionStatus` and
 * POST /api/stripe/portal have a real value instead of always-`undefined`.
 * Single source of truth shared with `defaultUserProfile` below so the two paths
 * (row found / row just created) and the anonymous-fallback shape never drift apart.
 */
export const USER_PROFILE_SELECT_COLUMNS =
  'tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, stripe_customer_id, onboarding_status';

/**
 * Default profile fields `loadUser` attaches to `req.user` when no `users` row
 * exists yet (e.g. the auth.users insert trigger hasn't fired). Field set mirrors
 * `USER_PROFILE_SELECT_COLUMNS`.
 * @returns {object}
 */
export function defaultUserProfile() {
  return {
    tier: 'free',
    deep_reveal_count: 0,
    deep_reveal_reset_at: new Date().toISOString(),
    papergames_id: null,
    last_import_at: null,
    stripe_customer_id: null,
    onboarding_status: 'not_encountered',
  };
}

/**
 * The single shared enum validator for onboarding_status (Epic 8 — Onboarding
 * Experience). This is the ONE place the 3-value enum is validated — both
 * `PUT /api/user/profile` and `POST /api/user/migrate` import and reuse this
 * rather than duplicating the check inline.
 * @param {*} value
 * @returns {boolean}
 */
export function isValidOnboardingStatus(value) {
  return value === 'not_encountered' || value === 'seen' || value === 'skipped';
}

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
      // 23503 = foreign_key_violation — one bad puzzle_id poisons the batch;
      // fall back to row-by-row so valid rows still land.
      if (error.code === '23503') {
        for (const row of rows) {
          const { error: rowErr } = await supabase.from('puzzle_attempts').insert(row);
          if (rowErr && rowErr.code !== '23505' && rowErr.code !== '23503') {
            return { error: rowErr.message };
          }
        }
        return;
      }
      return { error: error.message };
    }
  } catch (err) {
    if (err?.code === '23505' || err?.code === '23503') return;
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
