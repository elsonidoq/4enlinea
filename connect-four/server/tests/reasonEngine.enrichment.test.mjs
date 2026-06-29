import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('anchorCells: win_to_draw 3325 = winning-move cells', async () => {
  const r = await computeReason('3325', 5, { solver });
  // scores [-3,18,2,3,-3,0,-3]: winning cols 1,2,3 -> landing cells c2r1,c3r2,c4r3
  assert.deepEqual([...r.lostResource.anchorCells].sort(), ['c2r1', 'c3r2', 'c4r3']);
});

test('anchorCells present for every blunder case', async () => {
  for (const [ms, pc] of [['3325', 5], ['214444115623', 4]]) {
    const r = await computeReason(ms, pc, { solver });
    assert.ok(Array.isArray(r.lostResource.anchorCells), `${ms}: anchorCells is array`);
  }
});

test('gated naming: 214444115623 rejects the immediate_threat decoy', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  // register is 'parity'; immediate_threat{c3r4} is the blocked decoy and must be rejected.
  assert.notEqual(r.lostResource.tacticTag, 'immediate_threat');
  // contextual fallback names the actual row-2 group -> minor_threat with a cell in the group.
  assert.equal(r.lostResource.tacticTag, 'minor_threat');
  const group = new Set(r.lostResource.parityAttribution.controllingGroup);
  assert.ok(r.lostResource.tacticCells.some((c) => group.has(c)), 'named cells touch the controlling group');
});

test('gated naming: 3325 keeps double_threat', async () => {
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.lostResource.tacticTag, 'double_threat');
});
