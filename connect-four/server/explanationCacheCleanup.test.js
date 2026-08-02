// Regression test for OI-26 / FR-016 (spec 051 US3 Fix 2): expiring cached
// explanation audio must scope its DB update to the specific locale of the
// rows being expired — the same board position has one explanation_cache row
// PER LOCALE (en/es), and both share the same position_hash. An ungrouped
// `.in('position_hash', hashes)` update (the pre-fix behavior) would null out
// a fresh other-locale row for the same position just because a stale
// same-position row in a different locale happened to expire.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupExpiredExplanationAudio } from './explanationCacheCleanup.js';

/**
 * Stub Supabase client covering exactly the chain
 * cleanupExpiredExplanationAudio uses: .from().select().lt().not() for the
 * query, .storage.from().remove() for storage deletes, and
 * .from().update().eq().in() for the scoped update. Records every update
 * call's locale + hashes so the test can assert scoping.
 */
function makeStubSupabase(expiredRows) {
  const updateCalls = [];
  return {
    updateCalls,
    from: (table) => {
      assert.equal(table, 'explanation_cache');
      return {
        select: () => ({
          lt: () => ({
            not: async () => ({ data: expiredRows, error: null }),
          }),
        }),
        update: (payload) => ({
          eq: (col, val) => {
            assert.equal(col, 'locale', 'the update must be scoped by locale');
            return {
              in: (col2, hashes) => {
                assert.equal(col2, 'position_hash');
                updateCalls.push({ payload, locale: val, hashes: [...hashes] });
                return Promise.resolve({ error: null });
              },
            };
          },
        }),
      };
    },
    storage: {
      from: () => ({
        remove: async () => ({ error: null }),
      }),
    },
  };
}

describe('cleanupExpiredExplanationAudio', () => {
  it('never nulls a different-locale row for the same position_hash', async () => {
    // Same position_hash, two locales — both stale enough to be selected as
    // "expired" by the query stub (the cutoff filtering itself is the DB's
    // job; this stub simulates its result set).
    const expired = [
      { position_hash: 'pos-shared', audio_path: 'tts/deep-reveal/en-hash.mp3', locale: 'en' },
      { position_hash: 'pos-shared', audio_path: 'tts/deep-reveal/es-hash.mp3', locale: 'es' },
    ];
    const supabase = makeStubSupabase(expired);

    const result = await cleanupExpiredExplanationAudio(supabase, { cutoffISO: new Date().toISOString() });

    assert.equal(result.cleaned, 2);

    // Exactly one update per locale present in the batch.
    assert.equal(supabase.updateCalls.length, 2, `expected one update call per locale; got ${supabase.updateCalls.length}`);

    const enCall = supabase.updateCalls.find(c => c.locale === 'en');
    const esCall = supabase.updateCalls.find(c => c.locale === 'es');
    assert.ok(enCall, 'expected an update scoped to locale "en"');
    assert.ok(esCall, 'expected an update scoped to locale "es"');

    // The en-scoped update must touch ONLY the en row's position_hash set —
    // never bundle the es row's hash into the same call (or vice versa).
    assert.deepEqual(enCall.hashes, ['pos-shared']);
    assert.deepEqual(esCall.hashes, ['pos-shared']);
  });

  it('a single-locale batch issues exactly one scoped update', async () => {
    const expired = [
      { position_hash: 'pos-a', audio_path: 'tts/deep-reveal/a.mp3', locale: 'en' },
      { position_hash: 'pos-b', audio_path: 'tts/deep-reveal/b.mp3', locale: 'en' },
    ];
    const supabase = makeStubSupabase(expired);

    const result = await cleanupExpiredExplanationAudio(supabase, { cutoffISO: new Date().toISOString() });

    assert.equal(result.cleaned, 2);
    assert.equal(supabase.updateCalls.length, 1);
    assert.equal(supabase.updateCalls[0].locale, 'en');
    assert.deepEqual(supabase.updateCalls[0].hashes.sort(), ['pos-a', 'pos-b']);
  });

  it('returns cleaned: 0 and issues no update when nothing is expired', async () => {
    const supabase = makeStubSupabase([]);
    const result = await cleanupExpiredExplanationAudio(supabase, { cutoffISO: new Date().toISOString() });
    assert.equal(result.cleaned, 0);
    assert.equal(supabase.updateCalls.length, 0);
  });
});
