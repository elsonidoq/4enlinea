// Spec 042 (Mistake Review Unification), US6 / T050 + T052A.
// Verifies the generic pattern-agnostic `patternCells` field (Decision 3) computed
// by `computePatternCells` (server/blunderDetailResponse.js), and that BOTH
// independent blunder-response builders — the `GET /api/blunders/:id` handler
// (via `buildBlunderDetailResponse`) and the list/enriched-map builder at
// `index.js`'s `~line 2565` — carry the identical value for the same mistake
// (T052A: in-app navigation must not silently lose fork highlighting while the
// cold-boot permalink path works).
//
// The two `double_threat` boards below are the ONLY verified-expectation
// fixtures (T049, solver/detector-verified against production
// `detectDoubleThreat`) — see memory `reference_verified_tactical_movestrings`.
// Do not invent verified expectations for other pattern tags (T049A).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computePatternCells, buildBlunderDetailResponse } from '../../server/blunderDetailResponse.js';

// ── T049-verified double_threat fixtures ───────────────────────────────────
const P1_FORK_FULL = '41442625312235115445550126400';
const P2_FORK_FULL = '3333364101252113121524';

function splitBoardAndCorrectMove(full) {
  return { board_state: full.slice(0, -1), correct_move: Number(full.slice(-1)) };
}

const P1_FORK = splitBoardAndCorrectMove(P1_FORK_FULL);
const P2_FORK = splitBoardAndCorrectMove(P2_FORK_FULL);

describe('computePatternCells (spec 042 US6, Decision 3, FR-020/SC-008)', () => {
  it('double_threat: P1 fork board matches T049-verified cells c1r4/c4r3 -> {0,3}/{3,2}', () => {
    const row = { ...P1_FORK, pattern_category: 'double_threat' };
    const cells = computePatternCells(row);
    assert.deepEqual(
      cells.sort((a, b) => a.col - b.col),
      [{ col: 0, row: 3 }, { col: 3, row: 2 }]
    );
  });

  it('double_threat: P2 fork board matches T049-verified cells c5r3/c7r2 -> {4,2}/{6,1}', () => {
    const row = { ...P2_FORK, pattern_category: 'double_threat' };
    const cells = computePatternCells(row);
    assert.deepEqual(
      cells.sort((a, b) => a.col - b.col),
      [{ col: 4, row: 2 }, { col: 6, row: 1 }]
    );
  });

  it('unmapped pattern_category yields an empty array', () => {
    const row = { ...P1_FORK, pattern_category: 'not_a_real_tag' };
    assert.deepEqual(computePatternCells(row), []);
  });

  it('null/undefined pattern_category yields an empty array', () => {
    assert.deepEqual(computePatternCells({ ...P1_FORK, pattern_category: null }), []);
    assert.deepEqual(computePatternCells({ ...P1_FORK, pattern_category: undefined }), []);
  });

  it('a mapped tag whose detector does not match (no fork present) yields an empty array', () => {
    // P1_FORK's own board_state (pre-correct-move) does not itself carry a
    // double_threat for the pattern's own perspective at every column — use a
    // trivially early, empty-ish board where no detector could possibly match.
    const row = { board_state: '3', correct_move: 3, pattern_category: 'double_threat' };
    assert.deepEqual(computePatternCells(row), []);
  });

  // Score-consuming / structurally cells:[] detectors (T049A) — recorded
  // empty/absent by design, no special-casing.
  for (const tag of ['forced_block', 'forbidden_columns', 'z_threat', 'odd_even_threat', 'claimeven', 'forced_win', 'undercut', 'overcut']) {
    it(`${tag} (empty/absent by design per T049A) yields an empty array`, () => {
      const row = { ...P1_FORK, pattern_category: tag };
      assert.deepEqual(computePatternCells(row), []);
    });
  }
});

describe('T052A — list/enriched-map builder and :id builder carry the same patternCells', () => {
  it('for the same double_threat mistake row', () => {
    const rawRow = {
      id: 'fixture-id',
      board_state: P1_FORK.board_state,
      move_played: 5, // deliberately wrong/irrelevant move for threat_cells — patternCells doesn't use it
      correct_move: P1_FORK.correct_move,
      pattern_category: 'double_threat',
      quality: 'blunder',
      created_at: '2026-05-01T12:00:00.000Z',
      resolved_at: null,
      severity: 12,
      blunder_severity: 0.28,
      game_id: null,
      papergames_game_id: 'some-game-id',
      user_id: 'owner-id',
    };

    // :id path — buildBlunderDetailResponse (server/blunderDetailResponse.js).
    const idPathResponse = buildBlunderDetailResponse(rawRow, null, {});

    // list/enriched-map path — index.js's `~2565` builder calls computePatternCells(b)
    // directly on the raw row (mirrored here since index.js has no exportable app).
    const listPathPatternCells = computePatternCells(rawRow);

    assert.deepEqual(idPathResponse.patternCells, listPathPatternCells);
    assert.deepEqual(idPathResponse.patternCells.sort((a, b) => a.col - b.col), [
      { col: 0, row: 3 },
      { col: 3, row: 2 },
    ]);
  });
});
