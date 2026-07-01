import { test } from 'node:test';
import assert from 'node:assert';
import { INVALID_MOVE } from '../scripts/reason_engine/lib/boardUtils.mjs';
import { optimalCols, orientationOf } from '../scripts/reason_engine/sampleWins.mjs';

test('optimalCols: returns all columns tied at the max score, ascending', () => {
  //            c0  c1  c2  c3  c4  c5  c6
  const scores = [-2, 1, 0, 1, 1, -1, -2];
  assert.deepEqual(optimalCols(scores), [1, 3, 4]);
});

test('optimalCols: excludes INVALID_MOVE (full) columns even at the max', () => {
  const scores = [INVALID_MOVE, 2, 2, -1, -1, -1, -1];
  assert.deepEqual(optimalCols(scores), [1, 2]);
});

test('optimalCols: first element equals the strict-argmax walkOptimal would pick', () => {
  const scores = [0, 0, 5, 5, 1, 1, 1];
  assert.equal(optimalCols(scores)[0], 2);
});

test('orientationOf: classifies horizontal / vertical / diagonal windows', () => {
  assert.equal(orientationOf(['c2r5', 'c3r5', 'c4r5', 'c5r5']), 'horizontal');
  assert.equal(orientationOf(['c3r1', 'c3r2', 'c3r3', 'c3r4']), 'vertical');
  assert.equal(orientationOf(['c1r1', 'c2r2', 'c3r3', 'c4r4']), 'diagonal');
});

import { before, after, test as ntest } from 'node:test';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

ntest('walkOptimal refactor: lostResource window unchanged on a known parity win', async () => {
  // eval-14: win_to_draw parity win, best col 4, window c4r5..c7r5, completing c7r5.
  const r = await computeReason('333333451225', 2, { solver });
  assert.equal(r.case, 'win_to_draw');
  assert.equal(r.lostResource.register, 'parity');
  assert.deepEqual(r.lostResource.window, ['c4r5', 'c5r5', 'c6r5', 'c7r5']);
  assert.equal(r.lostResource.completingCell, 'c7r5');
});
