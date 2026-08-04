// Unit tests for insertGameBlunder — T001/T007 from spec 024 batch 1
//
// Run with: node --test connect-four/tests/blunder/insertGameBlunder.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { insertGameBlunder } from '../../server/insertGameBlunder.js';

/**
 * Create a stub supabase client that captures the inserted row.
 * @param {object|null} errorToReturn - if non-null, the insert resolves to { error: errorToReturn }
 * @returns {object} stub with .from().insert() chain and .captured() accessor
 */
function makeStubSupabase(errorToReturn = null) {
  let capturedRow = null;
  return {
    captured: () => capturedRow,
    from: () => ({
      insert: async (row) => {
        capturedRow = row;
        return { error: errorToReturn };
      },
    }),
  };
}

describe('insertGameBlunder', () => {
  it('skips insert when user_id is null (auth gate)', async () => {
    const supabase = makeStubSupabase();
    await insertGameBlunder(supabase, {
      user_id: null,
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'forced_win',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    assert.equal(supabase.captured(), null, 'insert should not have been called');
  });

  it('substitutes unknown tags with suboptimal_move (tag guard)', async () => {
    const supabase = makeStubSupabase();
    await insertGameBlunder(supabase, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'totally_invalid_tag',
      quality: 'blunder',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    const captured = supabase.captured();
    assert.notEqual(captured, null, 'insert should have been called');
    assert.equal(captured.pattern_category, 'suboptimal_move');
  });

  it('handles 23505 as silent success (dedup)', async () => {
    const supabase = makeStubSupabase({ code: '23505' });
    // Should not throw
    await insertGameBlunder(supabase, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'forced_win',
      quality: 'blunder',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    // If we reach here without throwing, the 23505 was handled
    assert.ok(true, '23505 did not throw');
  });
});

// FR-019a (spec 057): the write-seam coercion `row.quality === 'suboptimal' ? 'suboptimal'
// : 'blunder'` was a third, silent grading criterion — it invented 'blunder' whenever the
// real grader (scoreMove) produced nothing. It is now removed: missing/invalid quality
// must fail loudly (console.error + no insert), never default.
describe('insertGameBlunder — quality validation (FR-019a)', () => {
  it('fails loudly and does not insert when quality is missing', async () => {
    const supabase = makeStubSupabase();
    const result = await insertGameBlunder(supabase, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'forced_win',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    assert.equal(result, false);
    assert.equal(supabase.captured(), null, 'insert should not have been called');
  });

  it('fails loudly and does not insert when quality is an invalid value (e.g. "optimal" or a typo)', async () => {
    const supabase = makeStubSupabase();
    const result = await insertGameBlunder(supabase, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'forced_win',
      quality: 'optimal',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    assert.equal(result, false);
    assert.equal(supabase.captured(), null, 'insert should not have been called');
  });

  it('accepts an explicit "blunder" or "suboptimal" quality verbatim (no coercion)', async () => {
    const supabase = makeStubSupabase();
    await insertGameBlunder(supabase, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      board_state: '012345',
      move_played: 3,
      correct_move: 4,
      pattern_category: 'forced_win',
      quality: 'suboptimal',
      reason: 'test reason',
      direction: 'missed_own',
      severity: 5,
      blunder_severity: 0.5,
    });
    assert.equal(supabase.captured().quality, 'suboptimal');
  });
});

describe('insertGameBlunder — anon device path', () => {
  it('writes a device-keyed row when user_id is absent but device_uuid is present', async () => {
    let captured = null;
    const supabase = { from: () => ({ insert: async (row) => { captured = row; return { error: null }; } }) };
    await insertGameBlunder(supabase, {
      device_uuid: 'dev-123',
      board_state: '3344',
      move_played: 2,
      correct_move: 3,
      pattern_category: 'suboptimal_move',
      quality: 'blunder',
      severity: 5,
      game_id: 'game-abc',
    });
    assert.ok(captured, 'insert was called');
    assert.equal(captured.device_uuid, 'dev-123');
    assert.equal(captured.user_id ?? null, null);
    assert.equal(captured.game_id, 'game-abc');
  });

  it('still no-ops when BOTH user_id and device_uuid are absent', async () => {
    let called = false;
    const supabase = { from: () => ({ insert: async () => { called = true; return { error: null }; } }) };
    await insertGameBlunder(supabase, { board_state: '3344', move_played: 2, correct_move: 3, quality: 'blunder' });
    assert.equal(called, false);
  });

  it('preserves authenticated row with device_uuid === null when user_id is present alone', async () => {
    let captured = null;
    const supabase = { from: () => ({ insert: async (row) => { captured = row; return { error: null }; } }) };
    await insertGameBlunder(supabase, {
      user_id: 'user-1',
      board_state: '3344',
      move_played: 2,
      correct_move: 3,
      quality: 'blunder',
      game_id: 'g1',
    });
    assert.ok(captured, 'insert was called');
    assert.equal(captured.user_id, 'user-1');
    assert.equal(captured.device_uuid, null);
  });
});
