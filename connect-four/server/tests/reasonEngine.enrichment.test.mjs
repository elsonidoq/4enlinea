import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';
const __d = dirname(fileURLToPath(import.meta.url));
const fixtureRows = readFileSync(join(__d, '../scripts/reason_engine/reason_fixture.jsonl'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('anchorCells: win_to_draw 3325 fork = fork-window cells', async () => {
  const r = await computeReason('3325', 5, { solver });
  // D16: the best move creates a Case-A fork (forkCells c1r1,c5r1). anchorCells are the cells of the
  // fork windows (the row-1 group), so the tie can match a constituent the opponent occupies.
  assert.equal(r.lostResource.terminal, 'fork');
  assert.deepEqual([...r.lostResource.anchorCells].sort(), ['c1r1', 'c2r1', 'c3r1', 'c4r1', 'c5r1']);
});

test('anchorCells present for every blunder case', async () => {
  for (const [ms, pc] of [['3325', 5], ['214444115623', 4]]) {
    const r = await computeReason(ms, pc, { solver });
    assert.ok(Array.isArray(r.lostResource.anchorCells), `${ms}: anchorCells is array`);
  }
});

test('gated naming: 214444115623 names the double_threat fork, not the immediate_threat decoy', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  // D16: the win is a forced double-threat fork (forkCells c4r3,c6r4), NOT the single
  // immediate_threat{c3r4} tempo decoy and NOT the old parity-register minor_threat fallback.
  assert.equal(r.lostResource.terminal, 'fork');
  assert.notEqual(r.lostResource.tacticTag, 'immediate_threat');
  assert.equal(r.lostResource.tacticTag, 'double_threat');
  assert.ok(r.lostResource.forkCells.includes('c4r3') && r.lostResource.forkCells.includes('c6r4'),
    'fork completing cells c4r3 & c6r4');
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
