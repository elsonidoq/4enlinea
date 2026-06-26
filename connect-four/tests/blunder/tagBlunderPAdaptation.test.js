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

  it('defensive_miss / pre-existing threat still resolves after P() adaptation', async () => {
    const solver = createSolverProcess();
    try {
      // Yellow already threatens an immediate win at col4 before Red moves; Red plays
      // col5 and fails to block. The threat pre-existed → defensive_miss, not enabled.
      const result = await tagBlunder('010263', 5, 3, solver);
      assert.equal(result.tag, 'forced_block',
        'tag must be forced_block: Red faced a pre-existing immediate threat to block');
      assert.equal(result.direction, 'defensive_miss',
        'direction must be defensive_miss: the threat pre-existed the blunder');
      assert.ok(result.reason.startsWith('matched defensive_miss:'),
        `reason must start with "matched defensive_miss:" got: ${result.reason}`);
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  it('missed_own / parity-aware threat resolves after P() adaptation', async () => {
    const solver = createSolverProcess();
    try {
      // '3233333556' (10 moves, Red's turn): no forcing chain, but playing correctCol=2
      // BUILDS a latent off-parity major threat for Red at c5r2 that playedCol=0 does not.
      // Parity-aware threats are now first-class blunder tags (replacing the old
      // score-only suboptimal_move fallback here). missed_own = correctCol builds the pattern.
      const result = await tagBlunder('3233333556', 0, 2, solver);
      assert.equal(result.tag, 'major_threat_nonparity',
        'tag must be major_threat_nonparity: correctCol builds a latent off-parity major');
      assert.equal(result.direction, 'missed_own',
        'direction must be missed_own: correctCol builds the threat, playedCol does not');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});
