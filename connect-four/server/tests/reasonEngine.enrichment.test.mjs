import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_audit/reasonEngine.mjs';
const __d = dirname(fileURLToPath(import.meta.url));
const fixtureRows = readFileSync(join(__d, '../scripts/reason_audit/reason_fixture.jsonl'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

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

test('tie: 3325 win_to_draw is tied at the winning square', async () => {
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.ok(r.opponentPunishment.tie.sharedCells.includes('c2r1'));
});

test('tie: lose_to_faster_lose is temporal', async () => {
  const r = await computeReason('3333325662555225', 1, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'temporal');
  assert.equal(typeof r.opponentPunishment.tie.playedPlies, 'number');
  assert.equal(typeof r.opponentPunishment.tie.swindlePlies, 'number');
});

test('tie: present with a valid kind on every blunder fixture row', async () => {
  for (const f of fixtureRows) {
    const r = await computeReason(f.movestring, f.playedCol, { solver });
    if (r.notABlunder || !r.opponentPunishment) continue;
    assert.ok(['tied', 'independent', 'temporal'].includes(r.opponentPunishment.tie.kind),
      `${f.movestring}: tie.kind valid`);
  }
});
