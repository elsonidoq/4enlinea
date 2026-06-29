// reasonEngine.denial.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, denyOpponentPunishment } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

const DEPTH = 8;

test('no_occupation: 3333302111456114554542 played 2 draws without the opponent taking a fork cell', async () => {
  const ms = '3333302111456114554542', col = 2;  // sourced 2026-06-29, exhaustive:false (depthCap=8 not exhausted)
  const r = await computeReason(ms, col, { solver });
  const d = await denyOpponentPunishment(solver, ms + String(col), r.lostResource.forkWindows,
    { opponent: r.opponent, depthCap: 8 });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(typeof d.exhaustive, 'boolean');
});

test('occupation: 214444115623 played 4 -> opponent takes c3r3, killing the row-3 window', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  const d = await denyOpponentPunishment(solver, '214444115623' + '4', r.lostResource.forkWindows,
    { opponent: r.opponent, depthCap: DEPTH });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'), 'killed the row-3 fork window');
  assert.ok(d.line.length >= 1 && d.finalMovestring.startsWith('2144441156234'));
});
