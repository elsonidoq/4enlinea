// reasonEngine.denial.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, denyOpponentPunishment } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

const DEPTH = 8;

test('occupation: 214444115623 played 4 -> opponent takes c3r3, killing the row-3 window', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  const d = await denyOpponentPunishment(solver, '214444115623' + '4', r.lostResource.forkWindows,
    { opponent: r.opponent, depthCap: DEPTH });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'), 'killed the row-3 fork window');
  assert.ok(d.line.length >= 1 && d.finalMovestring.startsWith('2144441156234'));
});
