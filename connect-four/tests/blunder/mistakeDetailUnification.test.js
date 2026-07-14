// Spec 042 (Mistake Review Unification), US1 / T003.
// Tests the pure response-shape builder behind GET /api/blunders/:id — no real DB, no
// Express boot; uses `node:test` (NOT Jest), same convention as insertGameBlunder.test.js
// and the mock-supabase-stub HTTP tests (see tests/integration/challenge-progress.test.js
// header). This asserts the data-shape contract that FR-001/FR-002/FR-003 depend on: a
// 'blunder'-quality row and a 'suboptimal'-quality row must produce the identical set of
// renderable-action fields, differing only in the `quality` value itself (which drives a
// label/color, never a missing field or a disabled action).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlunderDetailResponse } from '../../server/blunderDetailResponse.js';

// Fields the mistake detail screen needs to render all three actions:
//   - "Start new game from here"        → game_id / papergames_game_id
//   - "What should I have played?"      → board_state, correct_move (+ move_played
//                                          for the deep-reveal candidate column)
//   - "Mark as reviewed"                → is_owner
//   - severity indicator (FR-001)       → quality
const REQUIRED_FIELDS = [
  'quality',
  'is_owner',
  'board_state',
  'move_played',
  'correct_move',
  'game_id',
  'papergames_game_id',
  'moveIndex',
  'threat_cells',
];

// A real, solver-shaped movestring is not required here — buildBlunderDetailResponse is a
// pure field-shaping function; computeThreatCells tolerates any string and falls back to []
// on a malformed board (see its try/catch), so a short fixture movestring is sufficient to
// exercise the shape without needing a solver-verified board.
function makeFixtureRow(overrides) {
  return {
    id: 'fixture-id',
    board_state: '123456',
    move_played: 2,
    correct_move: 3,
    pattern_category: 'double_threat',
    quality: 'blunder',
    created_at: '2026-01-01T00:00:00.000Z',
    resolved_at: null,
    severity: 4,
    blunder_severity: 0.5,
    game_id: 'game-fixture-id',
    papergames_game_id: null,
    user_id: 'owner-user-id',
    ...overrides,
  };
}

describe('GET /api/blunders/:id response shape — severity-agnostic (spec 042 US1)', () => {
  it('blunder-quality fixture row carries every field a mistake detail screen needs', () => {
    const row = makeFixtureRow({ quality: 'blunder' });
    const response = buildBlunderDetailResponse(row, 'owner-user-id');

    for (const field of REQUIRED_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(response, field), `missing field: ${field}`);
    }
    assert.equal(response.quality, 'blunder');
    assert.equal(response.is_owner, true);
  });

  it('suboptimal-quality fixture row carries every field a mistake detail screen needs', () => {
    const row = makeFixtureRow({ quality: 'suboptimal', game_id: null, papergames_game_id: 'pg-fixture-id' });
    const response = buildBlunderDetailResponse(row, 'owner-user-id');

    for (const field of REQUIRED_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(response, field), `missing field: ${field}`);
    }
    assert.equal(response.quality, 'suboptimal');
    assert.equal(response.is_owner, true);
  });

  it('blunder and suboptimal responses expose the identical field set (neither is missing a field the other has)', () => {
    const blunderRow = makeFixtureRow({ quality: 'blunder' });
    const suboptimalRow = makeFixtureRow({ quality: 'suboptimal' });

    const blunderResponse = buildBlunderDetailResponse(blunderRow, 'owner-user-id');
    const suboptimalResponse = buildBlunderDetailResponse(suboptimalRow, 'owner-user-id');

    const blunderKeys = Object.keys(blunderResponse).sort();
    const suboptimalKeys = Object.keys(suboptimalResponse).sort();
    assert.deepEqual(blunderKeys, suboptimalKeys);
  });

  it('never exposes user_id regardless of quality', () => {
    const blunderResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'blunder' }), 'owner-user-id');
    const suboptimalResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'suboptimal' }), 'owner-user-id');
    assert.equal('user_id' in blunderResponse, false);
    assert.equal('user_id' in suboptimalResponse, false);
  });

  it('FR-003: is_owner is true for the owning user, regardless of quality', () => {
    const blunderResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'blunder' }), 'owner-user-id');
    const suboptimalResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'suboptimal' }), 'owner-user-id');
    assert.equal(blunderResponse.is_owner, true);
    assert.equal(suboptimalResponse.is_owner, true);
  });

  it('FR-003: is_owner is false for a non-owning authenticated user, regardless of quality', () => {
    const blunderResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'blunder' }), 'someone-else');
    const suboptimalResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'suboptimal' }), 'someone-else');
    assert.equal(blunderResponse.is_owner, false);
    assert.equal(suboptimalResponse.is_owner, false);
  });

  it('FR-003: is_owner is false for an anonymous (no reqUserId) viewer, regardless of quality', () => {
    const blunderResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'blunder' }), null);
    const suboptimalResponse = buildBlunderDetailResponse(makeFixtureRow({ quality: 'suboptimal' }), undefined);
    assert.equal(blunderResponse.is_owner, false);
    assert.equal(suboptimalResponse.is_owner, false);
  });
});
