// reasonEngine.denial.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, findOccupationWitness, swindleGate } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('occupation (cap-to-terminal): 3333302111456114554542 played 2 -> under full depth the theorem finds occupation', async () => {
  // Under cap-to-terminal the PV walk eventually reaches a full board where every fork window must hold
  // >=1 opponent disc (D18 theorem), so verdict is occupation — not a proof of "opponent took it early".
  const ms = '3333302111456114554542', col = 2;
  const r = await computeReason(ms, col, { solver });
  const d = await findOccupationWitness(solver, ms + String(col), {
    denier: r.opponent, windows: r.lostResource.forkWindows, depthCap: 42 - (ms.length + 1),
  });
  assert.equal(d.verdict, 'occupation');
});

test('no_occupation (depthCap:2): 3333302111456114554542 played 2 is no_occupation and non-exhaustive at cap 2', async () => {
  // A shallow cap hits the depth limit without finding occupation — exercises the cap-hit fallback
  // (exhaustive:false). NOT a proof of no_occupation (I7 asymmetry); just the cap-hit code-path.
  const ms = '3333302111456114554542', col = 2;
  const r = await computeReason(ms, col, { solver });
  const d = await findOccupationWitness(solver, ms + String(col), {
    denier: r.opponent, windows: r.lostResource.forkWindows, depthCap: 2,
  });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(d.exhaustive, false);
});

test('win_to_draw denial: 214444115623 opponentPunishment is occupation tied at c3r3', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.opponentPunishment.kind, 'denial');
  assert.equal(r.opponentPunishment.verdict, 'occupation');
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c3r3']);
});

test('occupation: 214444115623 played 4 -> opponent takes c3r3, killing the row-3 window', async () => {
  const ms = '214444115623';
  const r = await computeReason(ms, 4, { solver });
  const d = await findOccupationWitness(solver, ms + '4', {
    denier: r.opponent, windows: r.lostResource.forkWindows, depthCap: 42 - (ms.length + 1),
  });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'), 'killed the row-3 fork window');
  assert.ok(d.line.length >= 1 && d.finalMovestring.startsWith('2144441156234'));
});

// M3 (final-review follow-up): a solver throw is only "terminal" when the position genuinely is
// (won / full). A throw on a NON-terminal node is a real error and must NOT be reported as a
// full-tree proof (exhaustive). Injected throwing solver — no real solver needed (I2 honesty).
const throwingSolver = { query: async () => { throw new Error('simulated solver IPC error'); } };

test('M3: findOccupationWitness no_occupation is NOT exhaustive when a non-terminal node errors', async () => {
  // blunderRoot 2144441156234 is a non-terminal mid-game position; the solver throw is an error, not terminal.
  const d = await findOccupationWitness(throwingSolver, '2144441156234', {
    denier: 2, windows: [['c3r3', 'c4r3', 'c5r3', 'c6r3']], depthCap: 8,
  });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(d.exhaustive, false); // non-terminal error must NOT inflate to exhaustive:true
});

test('M3: swindleGate flags errored when a non-terminal node errors', async () => {
  // 3333325662555225 is a non-terminal ltfl board; the throw is a real error, not a terminal rejection.
  const g = await swindleGate(throwingSolver, '3333325662555225', { exhaustive: true });
  assert.equal(g.found, false);
  assert.equal(g.errored, true);
});
