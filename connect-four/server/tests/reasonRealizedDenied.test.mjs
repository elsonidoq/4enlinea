import { test } from 'node:test';
import assert from 'node:assert';
import { realizedPattern } from '../scripts/reason_engine/reasonEngine.mjs';

// 3321234543: Gray (player 2) holds an immediate threat at c4r5 (vertical c4r2..c4r5).
// tagBlunder tags this forced_block/defensive_miss; the OWNER of the threat is the opponent (player 2).
test('realizedPattern: immediate_threat window for the threat owner', () => {
  const rp = realizedPattern('3321234543', 2, 'immediate_threat');
  assert.ok(rp, 'pattern present');
  assert.equal(rp.completingCell, 'c4r5');
  assert.ok(rp.windows.some((w) => w.includes('c4r5') && w.includes('c4r2')), 'vertical window present');
});

// The D16 Case-A double_threat fixture (reasonEngine.test.mjs "D16 Case A: 214444115623 played 4").
// The brief's naive root+playedCol string ("2144441156234") is NOT the fork board: solver best-move
// on '214444115623' is col 2 (score 9), not col 4 (score 0, the blunder), and the deciding fork only
// materializes 10 plies into the forced best-play line, not at ply+1. Sourced directly from
// computeReason('214444115623', 4, { solver }).lostResource.finalMovestring (verified against the
// production D16 test's expected forkCells c4r3/c6r4).
test('realizedPattern: double_threat fork windows via detectForkAt', () => {
  const rp = realizedPattern('21444411562322311656615', 1, 'double_threat');
  assert.ok(rp, 'fork present');
  assert.ok(rp.windows.length >= 1, 'at least one fork window');
  assert.ok(rp.cells.length >= 1, 'fork completing cells present');
  assert.ok(rp.cells.includes('c4r3') && rp.cells.includes('c6r4'),
    `fork completing cells include c4r3 & c6r4, got ${JSON.stringify(rp.cells)}`);
});
