// Pure(ish)-extraction of POST /api/admin/tts/cleanup's update logic (spec 051 US3
// Fix 2, OI-26, FR-016), per testing-conventions.md's Pure Function Extraction
// Pattern — server/index.js has no HTTP-level test harness, so the DB-touching
// logic is factored out here and unit-tested against a plain Supabase stub.
//
// Bug this fixes: the pre-fix cleanup queried `explanation_cache` rows with an
// expired `audio_generated_at`, then nulled out `audio_path`/`audio_generated_at`
// for every row whose `position_hash` matched — WITHOUT also scoping by `locale`.
// `position_hash` is NOT unique per row: the same board position has one cached
// row per locale (`en`, `es`), each with its own independently-generated audio.
// So expiring a stale `en` row could null out a perfectly fresh `es` row (or vice
// versa) for the same position, since both share the same `position_hash`.

/**
 * Expire (null out audio_path/audio_generated_at) every explanation_cache row
 * whose audio predates `cutoffISO`, scoping each DB update to the specific
 * locale of the rows being expired so a different locale's cached row for the
 * same position_hash is never touched.
 *
 * @param {object} supabase - Supabase client (or a stub with the same shape).
 * @param {object} [opts]
 * @param {string} [opts.cutoffISO] - ISO timestamp; rows with audio_generated_at
 *   older than this are expired. Defaults to 30 days ago.
 * @returns {Promise<{cleaned: number}>}
 */
export async function cleanupExpiredExplanationAudio(supabase, { cutoffISO } = {}) {
  const cutoff = cutoffISO || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: queryErr } = await supabase
    .from('explanation_cache')
    .select('position_hash, audio_path, locale')
    .lt('audio_generated_at', cutoff)
    .not('audio_path', 'is', null);

  if (queryErr) {
    throw new Error(`query failed: ${queryErr.message}`);
  }

  if (!expired || expired.length === 0) {
    return { cleaned: 0 };
  }

  // Delete Storage objects (batch — one call per path since Supabase Storage
  // doesn't support bulk deletes). Storage delete failures are logged and
  // otherwise ignored — orphaned storage objects are harmless.
  const paths = expired.map(e => e.audio_path).filter(Boolean);
  for (const path of paths) {
    const { error: delErr } = await supabase.storage.from('coach-tts').remove([path]);
    if (delErr) {
      console.error(`[tts/cleanup] storage delete error for ${path}:`, delErr.message);
    }
  }

  // Group expired rows by locale — FR-016's fix. Never issue one ungrouped
  // `.in('position_hash', hashes)` update across every locale at once.
  const hashesByLocale = new Map();
  for (const row of expired) {
    const loc = row.locale ?? 'en';
    if (!hashesByLocale.has(loc)) hashesByLocale.set(loc, []);
    hashesByLocale.get(loc).push(row.position_hash);
  }

  for (const [loc, hashes] of hashesByLocale) {
    const { error: updateErr } = await supabase
      .from('explanation_cache')
      .update({ audio_path: null, audio_generated_at: null })
      .eq('locale', loc)
      .in('position_hash', hashes);
    if (updateErr) {
      throw new Error(`update failed: ${updateErr.message}`);
    }
  }

  return { cleaned: expired.length };
}
