// Spec 042 (Mistake Review Unification), US2 / T010.
// Exercises the GET /api/blunders/:id extension (FR-008/FR-009, SC-002) end to end
// through the handler's own composition pipeline — fetchBlunderDetailContext (the
// two additional Supabase reads) feeding buildBlunderDetailResponse (the shape
// builder) — using a mock-stubbed Supabase client, no real DB. `index.js` is a
// monolith with no exportable Express app builder (see
// tests/integration/challenge-progress.test.js's own "mock supabase stubs, no real
// DB" header for the repo-wide convention this follows), so this test drives the
// same two functions the handler calls, in the same order, rather than booting a
// full HTTP server.
//
// Fixture values are the SC-002 row (research.md §3), verified against production
// Supabase and hardcoded here as inline stubs, per research.md §3's explicit
// direction that automated tests must be hermetic — the real game/blunder ids are
// used ONLY in the manual quickstart walkthrough (T022), never in npm run test:fast.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildBlunderDetailResponse, fetchBlunderDetailContext } from '../../server/blunderDetailResponse.js';

const PAPERGAMES_GAME_ID = '40fe793a-aa39-429d-8ef4-4e43192cc4db';
const REQUESTED_BLUNDER_ID = '52a28158-8603-4ccf-89f4-b9a73b2910f3';

// The parent game's movestring — only its length matters (totalMoves = moves.length).
const PARENT_GAME_MOVES = '1'.repeat(41);

// Sibling blunders for this game, already in DB storage order (not necessarily
// move_index order) — the mock's `.order()` step is expected to sort them, mirroring
// what a real Supabase `.order('move_index', { ascending: true })` call returns.
const SIBLING_ROWS_SORTED_BY_MOVE_INDEX = [
  { id: '29ec665b-0787-416f-9cb8-690ec127a346', move_index: 16, quality: 'suboptimal', resolved_at: null },
  { id: REQUESTED_BLUNDER_ID, move_index: 18, quality: 'blunder', resolved_at: null },
  { id: '33f1e7b8-7922-4cfb-a7de-61a44a261a6d', move_index: 28, quality: 'suboptimal', resolved_at: '2026-06-01T00:00:00.000Z' },
  { id: '2963acad-45e7-4deb-bbb0-2de3726eb8c0', move_index: 32, quality: 'suboptimal', resolved_at: null },
];

const REQUESTED_BLUNDER_ROW = {
  id: REQUESTED_BLUNDER_ID,
  board_state: '1'.repeat(18),
  move_played: 3,
  correct_move: 4,
  pattern_category: 'immediate_threat',
  quality: 'blunder',
  created_at: '2026-05-01T12:00:00.000Z',
  resolved_at: null,
  severity: 12,
  blunder_severity: 0.28,
  game_id: null,
  papergames_game_id: PAPERGAMES_GAME_ID,
  user_id: 'some-owner-id',
};

/**
 * Mock Supabase client matching the exact chain shapes
 * `fetchBlunderDetailContext` calls:
 *   - `.from('papergames_games').select('moves').eq('id', id).single()`
 *   - `.from('blunders').select('id, move_index, quality, resolved_at').eq('papergames_game_id', id).order('move_index', {ascending: true})`
 */
function createMockSupabase() {
  return {
    from(table) {
      return {
        select() {
          return {
            eq(col, val) {
              return {
                // parent-game lookup (step 2 of contracts/api-blunders-id.md)
                single: async () => {
                  if (table === 'papergames_games' && val === PAPERGAMES_GAME_ID) {
                    return { data: { moves: PARENT_GAME_MOVES }, error: null };
                  }
                  return { data: null, error: { code: 'PGRST116', message: 'not found' } };
                },
                // sibling-mistakes lookup (step 3 of contracts/api-blunders-id.md)
                order: (orderCol, opts) => {
                  assert.equal(table, 'blunders');
                  assert.equal(col, 'papergames_game_id');
                  assert.equal(val, PAPERGAMES_GAME_ID);
                  assert.equal(orderCol, 'move_index');
                  assert.equal(opts?.ascending, true);
                  return Promise.resolve({ data: SIBLING_ROWS_SORTED_BY_MOVE_INDEX, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('GET /api/blunders/:id — permalink context (spec 042 US2, FR-008/FR-009, SC-002)', () => {
  it('returns papergames_game_id, totalMoves, and an ordered siblingMistakes list', async () => {
    const supabase = createMockSupabase();
    const context = await fetchBlunderDetailContext(supabase, REQUESTED_BLUNDER_ROW);
    const response = buildBlunderDetailResponse(REQUESTED_BLUNDER_ROW, null, context);

    assert.equal(response.papergames_game_id, PAPERGAMES_GAME_ID);
    assert.equal(response.totalMoves, 41);

    assert.equal(response.siblingMistakes.length, 4);
    assert.deepEqual(
      response.siblingMistakes.map(s => s.moveIndex),
      [16, 18, 28, 32],
      'siblingMistakes must be ordered by moveIndex ascending'
    );

    // The requested blunder sits at position 2 (1-indexed) of its sibling list.
    const requestedPosition1Indexed = response.siblingMistakes.findIndex(s => s.id === REQUESTED_BLUNDER_ID) + 1;
    assert.equal(requestedPosition1Indexed, 2);

    // Full shape check on the sibling entry for the requested row itself.
    const requestedSibling = response.siblingMistakes[requestedPosition1Indexed - 1];
    assert.deepEqual(requestedSibling, {
      id: REQUESTED_BLUNDER_ID,
      moveIndex: 18,
      quality: 'blunder',
      resolved_at: null,
    });

    // "Move 19 / 41" (1-indexed display) per quickstart.md.
    assert.equal(response.moveIndex + 1, 19);
  });
});
