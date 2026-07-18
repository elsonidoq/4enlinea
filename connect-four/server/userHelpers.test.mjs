import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  writeSessionStats,
  writeLessonProgress,
  writePuzzleAttempts,
  writeSparringRecord,
  writeStreak,
  USER_PROFILE_SELECT_COLUMNS,
  defaultUserProfile,
  isValidOnboardingStatus,
} from './userHelpers.js';

// --- Stub factory helpers ---

function makeSupabase(withMethod) {
  return { from: () => withMethod };
}

function makeUpsertStub(capturedRef) {
  return {
    upsert: async (row, opts) => {
      capturedRef.row = row;
      capturedRef.opts = opts;
      return { error: null };
    },
  };
}

function makeInsertStub(capturedRef) {
  return {
    insert: async (rows) => {
      capturedRef.rows = rows;
      return { error: null };
    },
  };
}

function makeUpdateStub(capturedRef) {
  return {
    update: (data) => ({
      eq: async (col, val) => {
        capturedRef.data = data;
        capturedRef.col = col;
        capturedRef.val = val;
        return { error: null };
      },
    }),
  };
}

// --- writeSessionStats ---

describe('writeSessionStats', () => {
  it('upserts with correct args and returns undefined on success', async () => {
    const captured = {};
    const supabase = makeSupabase(makeUpsertStub(captured));
    const result = await writeSessionStats(supabase, 'uuid-1', '2026-06-12', { foo: 1 });
    assert.equal(result, undefined);
    assert.deepEqual(captured.row, { user_id: 'uuid-1', date: '2026-06-12', stats: { foo: 1 } });
    assert.deepEqual(captured.opts, { onConflict: 'user_id,date' });
  });

  it('returns { error } on failure', async () => {
    const supabase = makeSupabase({
      upsert: async () => ({ error: { message: 'DB down' } }),
    });
    const result = await writeSessionStats(supabase, 'u', '2026-06-12', {});
    assert.deepEqual(result, { error: 'DB down' });
  });
});

// --- writeLessonProgress ---

describe('writeLessonProgress', () => {
  it('upserts rows with status "complete" and returns undefined', async () => {
    const captured = [];
    const supabase = makeSupabase({
      upsert: async (row, opts) => {
        captured.push({ row, opts });
        return { error: null };
      },
    });
    const result = await writeLessonProgress(supabase, 'uuid-1', [
      { lessonId: 'L1', status: 'complete' },
      { lessonId: 'L2', status: 'in_progress' },
      { lessonId: 'L3', status: 'complete' },
    ]);
    assert.equal(result, undefined);
    assert.equal(captured.length, 2);
    assert.equal(captured[0].row.lesson_id, 'L1');
    assert.equal(captured[0].row.user_id, 'uuid-1');
    assert.ok(captured[0].row.completed_at != null);
    assert.deepEqual(captured[0].opts, { onConflict: 'user_id,lesson_id' });
    assert.equal(captured[1].row.lesson_id, 'L3');
  });

  it('skips rows where status is not "complete"', async () => {
    const captured = [];
    const supabase = makeSupabase({
      upsert: async (row, opts) => {
        captured.push({ row, opts });
        return { error: null };
      },
    });
    await writeLessonProgress(supabase, 'uuid-1', [
      { lessonId: 'A', status: 'in_progress' },
      { lessonId: 'B', status: 'not_started' },
    ]);
    assert.equal(captured.length, 0);
  });

  it('handles empty array', async () => {
    const captured = [];
    const supabase = makeSupabase({
      upsert: async (row, opts) => {
        captured.push({ row, opts });
        return { error: null };
      },
    });
    const result = await writeLessonProgress(supabase, 'uuid-1', []);
    assert.equal(result, undefined);
    assert.equal(captured.length, 0);
  });

  it('returns { error } on first failure', async () => {
    let calls = 0;
    const supabase = makeSupabase({
      upsert: async () => {
        calls++;
        if (calls === 2) return { error: { message: 'fail' } };
        return { error: null };
      },
    });
    const result = await writeLessonProgress(supabase, 'u', [
      { lessonId: 'A', status: 'complete' },
      { lessonId: 'B', status: 'complete' },
      { lessonId: 'C', status: 'complete' },
    ]);
    assert.deepEqual(result, { error: 'fail' });
    assert.equal(calls, 2);
  });
});

// --- writePuzzleAttempts ---

describe('writePuzzleAttempts', () => {
  it('inserts rows with userId, deviceUuid, created_at set and returns undefined', async () => {
    const captured = {};
    const supabase = makeSupabase(makeInsertStub(captured));
    const result = await writePuzzleAttempts(supabase, 'uuid-1', 'dev-abc', [
      {
        puzzle_id: 'p1',
        moves_tried: [0, 1],
        outcome: 'correct',
        first_attempt_correct: true,
        time_ms: 5000,
      },
    ]);
    assert.equal(result, undefined);
    assert.equal(captured.rows.length, 1);
    const row = captured.rows[0];
    assert.equal(row.user_id, 'uuid-1');
    assert.equal(row.device_uuid, 'dev-abc');
    assert.equal(row.puzzle_id, 'p1');
    assert.ok(row.created_at != null);
  });

  it('preserves existing created_at if present on row', async () => {
    const captured = {};
    const supabase = makeSupabase(makeInsertStub(captured));
    await writePuzzleAttempts(supabase, 'u', 'd', [
      { puzzle_id: 'p2', created_at: '2025-01-01T00:00:00Z' },
    ]);
    assert.equal(captured.rows[0].created_at, '2025-01-01T00:00:00Z');
  });

  it('no-op on empty array', async () => {
    let called = false;
    const supabase = makeSupabase({
      insert: async () => {
        called = true;
        return { error: null };
      },
    });
    const result = await writePuzzleAttempts(supabase, 'u', 'd', []);
    assert.equal(result, undefined);
    assert.equal(called, false);
  });

  it('no-op on null/undefined attempts', async () => {
    let called = false;
    const supabase = makeSupabase({
      insert: async () => {
        called = true;
        return { error: null };
      },
    });
    const r1 = await writePuzzleAttempts(supabase, 'u', 'd', null);
    const r2 = await writePuzzleAttempts(supabase, 'u', 'd', undefined);
    assert.equal(r1, undefined);
    assert.equal(r2, undefined);
    assert.equal(called, false);
  });

  it('treats 23505 error code as success', async () => {
    const supabase = makeSupabase({
      insert: async () => ({ error: { code: '23505', message: 'duplicate' } }),
    });
    const result = await writePuzzleAttempts(supabase, 'u', 'd', [
      { puzzle_id: 'p1' },
    ]);
    assert.equal(result, undefined);
  });

  it('returns { error } on non-23505 failure', async () => {
    const supabase = makeSupabase({
      insert: async () => ({ error: { code: '42P01', message: 'no table' } }),
    });
    const result = await writePuzzleAttempts(supabase, 'u', 'd', [
      { puzzle_id: 'p1' },
    ]);
    assert.deepEqual(result, { error: 'no table' });
  });

  it('catches thrown 23505 as success', async () => {
    const supabase = makeSupabase({
      insert: async () => {
        const err = new Error('duplicate');
        err.code = '23505';
        throw err;
      },
    });
    const result = await writePuzzleAttempts(supabase, 'u', 'd', [
      { puzzle_id: 'p1' },
    ]);
    assert.equal(result, undefined);
  });

  it('catches thrown non-23505 and returns { error }', async () => {
    const supabase = makeSupabase({
      insert: async () => {
        throw new Error('boom');
      },
    });
    const result = await writePuzzleAttempts(supabase, 'u', 'd', [
      { puzzle_id: 'p1' },
    ]);
    assert.deepEqual(result, { error: 'boom' });
  });
});

// --- writeSparringRecord ---

describe('writeSparringRecord', () => {
  it('updates users table and returns undefined', async () => {
    const captured = {};
    const supabase = makeSupabase(makeUpdateStub(captured));
    const result = await writeSparringRecord(supabase, 'uuid-1', { W: 3, L: 1, D: 0 });
    assert.equal(result, undefined);
    assert.deepEqual(captured.data, { sparring_record: { W: 3, L: 1, D: 0 } });
    assert.equal(captured.col, 'id');
    assert.equal(captured.val, 'uuid-1');
  });

  it('returns { error } on failure', async () => {
    const supabase = makeSupabase({
      update: () => ({
        eq: async () => ({ error: { message: 'fail' } }),
      }),
    });
    const result = await writeSparringRecord(supabase, 'u', {});
    assert.deepEqual(result, { error: 'fail' });
  });
});

// --- writeStreak ---

describe('writeStreak', () => {
  it('updates streak fields and returns undefined', async () => {
    const captured = {};
    const supabase = makeSupabase(makeUpdateStub(captured));
    const result = await writeStreak(supabase, 'uuid-1', {
      streak_count: 5,
      last_active_date: '2026-06-12',
    });
    assert.equal(result, undefined);
    assert.deepEqual(captured.data, {
      streak_count: 5,
      last_active_date: '2026-06-12',
    });
    assert.equal(captured.col, 'id');
    assert.equal(captured.val, 'uuid-1');
  });

  it('returns { error } on failure', async () => {
    const supabase = makeSupabase({
      update: () => ({
        eq: async () => ({ error: { message: 'fail' } }),
      }),
    });
    const result = await writeStreak(supabase, 'u', {
      streak_count: 0,
      last_active_date: '',
    });
    assert.deepEqual(result, { error: 'fail' });
  });
});

// --- USER_PROFILE_SELECT_COLUMNS / defaultUserProfile (spec 045 R3 regression) ---
//
// index.js's loadUser middleware selects USER_PROFILE_SELECT_COLUMNS on both its
// initial-fetch and just-created-row code paths, and falls back to
// defaultUserProfile() when no `users` row exists yet at all. These tests pin
// paddle_customer_id's presence on all three paths so POST /api/paddle/portal
// and getSubscriptionStatus never regress to reading an always-undefined field.
// (Renamed to this name by migration 060, spec 050 T007.)

describe('USER_PROFILE_SELECT_COLUMNS (loadUser initial-fetch and just-created-row paths)', () => {
  it('includes paddle_customer_id alongside the other loadUser profile fields', () => {
    const columns = USER_PROFILE_SELECT_COLUMNS.split(',').map((c) => c.trim());
    assert.ok(columns.includes('paddle_customer_id'), 'paddle_customer_id must be selected');
    assert.ok(columns.includes('tier'));
    assert.ok(columns.includes('deep_reveal_count'));
    assert.ok(columns.includes('deep_reveal_reset_at'));
    assert.ok(columns.includes('device_uuid'));
    assert.ok(columns.includes('papergames_id'));
    assert.ok(columns.includes('last_import_at'));
    assert.ok(columns.includes('onboarding_status'), 'onboarding_status must be selected');
  });
});

describe('defaultUserProfile (loadUser no-row-found fallback path)', () => {
  it('includes paddle_customer_id: null alongside the other anonymous-fallback fields', () => {
    const profile = defaultUserProfile();
    assert.equal(profile.paddle_customer_id, null);
    assert.equal(profile.tier, 'free');
    assert.equal(profile.deep_reveal_count, 0);
    assert.equal(profile.papergames_id, null);
    assert.equal(profile.last_import_at, null);
    assert.equal(typeof profile.deep_reveal_reset_at, 'string');
    assert.equal(profile.onboarding_status, 'not_encountered');
  });
});

// --- isValidOnboardingStatus (Epic 8 — Onboarding Experience) ---

describe('isValidOnboardingStatus', () => {
  it('accepts the three valid enum values', () => {
    assert.equal(isValidOnboardingStatus('not_encountered'), true);
    assert.equal(isValidOnboardingStatus('seen'), true);
    assert.equal(isValidOnboardingStatus('skipped'), true);
  });

  it('rejects invalid values', () => {
    assert.equal(isValidOnboardingStatus('bogus'), false);
    assert.equal(isValidOnboardingStatus(''), false);
    assert.equal(isValidOnboardingStatus(null), false);
    assert.equal(isValidOnboardingStatus(undefined), false);
    assert.equal(isValidOnboardingStatus(1), false);
  });
});
