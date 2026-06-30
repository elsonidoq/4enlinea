// reasonEngine.witness.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { findOccupationWitness } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

const remaining = (ms) => 42 - ms.length;

test('win_to_draw PV witness reproduces the BFS witness c3r3 (denier=opponent)', async () => {
  const root = '214444115623' + '4';                 // playedRoot; player=1 played, denier=opponent=2
  const W = ['c3r3', 'c4r3', 'c5r3', 'c6r3'];
  const d = await findOccupationWitness(solver, root, { denier: 2, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'));
  assert.ok(d.exhaustive === true);
});

test('draw_to_lose ZUGZWANG: from bestRoot the player occupies c4r6 of the conceded window', async () => {
  const root = '2444422235255630400333' + '1';        // bestRoot; player=1 to deny, denier=player=1
  const W = ['c4r6', 'c5r6', 'c6r6', 'c7r6'];
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c4r6');                        // first player occupation on the canonical PV
  assert.deepEqual(d.window, W);
  assert.ok(d.line.length >= 1, 'a multi-ply witness line to the deep occupation');
});

test('draw_to_lose TACTICAL: best move already occupies holdCell -> occupation at root (line empty)', async () => {
  const root = '3342652233354244431011' + '1';        // bestRoot; best move lands c2r4 in opp window
  const W = ['c2r4', 'c3r4', 'c4r4', 'c5r4'];
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c2r4');
  assert.deepEqual(d.line, []);                         // root pre-check: the deciding move IS root's last disc
  assert.equal(d.finalMovestring, root);
});

test('no_occupation fallback: a tiny depthCap forces exhaustive:false (cap hit, not a structural claim)', async () => {
  const root = '2444422235255630400333' + '1';
  const W = ['c4r6', 'c5r6', 'c6r6', 'c7r6'];          // first occupation is deep (~ply 33); cap 2 cannot reach it
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: 2 });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(d.exhaustive, false);
});
