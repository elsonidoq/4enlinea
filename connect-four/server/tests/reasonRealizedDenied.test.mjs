import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { realizedPattern, realizedDeniedReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

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

function baseOut(movestring, playedCol, bestCol, scores) {
  const discs = movestring.length;
  const player = (discs % 2 === 0) ? 1 : 2;
  return {
    movestring, playedCol, bestCol, scores, discs, boardState: 'opening',
    player, opponent: player === 1 ? 2 : 1,
    bestScore: scores[bestCol], playedScore: scores[playedCol],
    case: null, notABlunder: false, lostResource: null, opponentPunishment: null,
    replyHistogram: null, gate: null,
  };
}

test('realizedDeniedReason: 3321234543 defensive_miss -> block c4r5 is lostResource, opp completes c4r5', async () => {
  const scores = [-16,-16,-16,-4,-16,-16,-16];
  const out = baseOut('3321234543', 0, 3, scores);
  const r = await realizedDeniedReason(out, 'forced_block', 'defensive_miss', { solver });
  assert.equal(r.route, 'realized_denied');
  // opponent owns the threat -> realized half is the opponentPunishment (the threat handed over)
  assert.equal(r.opponentPunishment.kind, 'realized_pattern');
  assert.equal(r.opponentPunishment.completingCell, 'c4r5');
  // the defense you had -> lostResource is the denial (you occupy/block c4r5 on the correct line)
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.completingCell, 'c4r5');
  assert.equal(r.lostResource.verdict, 'occupation');
});
