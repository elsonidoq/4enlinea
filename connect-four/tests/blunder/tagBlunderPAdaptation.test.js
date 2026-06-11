// T008 / FR-T03 — tagBlunder cascade regression guard after P() adapter change.
//
// The P() helper inside tagBlunder was changed in Batch 1 to wrap classifyPattern
// (which now returns Map) and produce a Set. This test verifies the cascade still
// resolves correctly end-to-end after that adaptation.
//
// Movestring sources:
//   '00113' — forced_block fixture.
//     Moves: R:col0, Y:col0, R:col1, Y:col1, R:col3.
//     After 5 moves (Yellow to move): Red has threat at col2r0 (3-in-a-row 0,1,_,3).
//     Wait: R:col0r0, R:col1r0, R:col3r0 — not 3-in-a-row (gap at col2).
//     Yellow must block col2 to prevent Red winning at col2.
//     Playing wrongCol=0 (fills col0 row2) fails to block.
//     Source: tests/classifier/classifier.test.js + tests/blunder/tagBlunder.test.js.
//
//   '010263' — enabled_opponent fixture.
//     After 6 moves (Red to move): Yellow has cols 1,2,3 at row0.
//     Yellow wins at col4 (0-indexed). Red playing col5 is a blunder.
//     correctCol=3 (blocks a different threat chain per solver).
//     Source: tests/blunder/tagBlunder.test.js.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tagBlunder } from '../../server/classifier.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

describe('tagBlunder P() adapter regression (FR-T03)', () => {
  it('forced_block / defensive_miss still resolves after P() adaptation', async () => {
    const solver = createSolverProcess();
    try {
      const result = await tagBlunder('00113', 0, 2, solver);
      assert.equal(result.tag, 'forced_block',
        'tag must be forced_block: Red had a forced_block before Yellow played col0');
      assert.equal(result.direction, 'defensive_miss',
        'direction must be defensive_miss: Yellow missed the block');
      assert.ok(typeof result.reason === 'string',
        'reason must be a string');
      assert.ok(result.reason.startsWith('matched defensive_miss:'),
        `reason must start with "matched defensive_miss:" got: ${result.reason}`);
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  it('enabled_opponent / immediate_threat still resolves after P() adaptation', async () => {
    const solver = createSolverProcess();
    try {
      const result = await tagBlunder('010263', 5, 3, solver);
      assert.equal(result.tag, 'immediate_threat',
        'tag must be immediate_threat: playing col5 gives opponent immediate win');
      assert.equal(result.direction, 'enabled_opponent',
        'direction must be enabled_opponent: opponent gains immediate threat');
      assert.ok(result.reason.startsWith('matched enabled_opponent:'),
        `reason must start with "matched enabled_opponent:" got: ${result.reason}`);
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  it('missed_own / no tactical pattern resolves after P() adaptation', async () => {
    const solver = createSolverProcess();
    try {
      // '3233333556' (10 moves, Red's turn): all scores are -2, no tactical forcing chain.
      // Old score-based forced_win incorrectly fired here; correct result is suboptimal_move.
      const result = await tagBlunder('3233333556', 0, 2, solver);
      assert.equal(result.tag, 'suboptimal_move',
        'tag must be suboptimal_move: no real forcing chain exists in this position');
      assert.equal(result.direction, 'missed_own',
        'direction must be missed_own: no pattern was detected');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});
