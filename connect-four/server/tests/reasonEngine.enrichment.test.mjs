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

test('anchorCells: win_to_draw 214444115623 fork = fork-window cells', async () => {
  // Retargeted from 3325 (2026-07-01): 3325 now diverts to the realized/denied route (double_threat
  // is in REALIZED_DENIED_TAGS), so it no longer exercises the sign-engine's forkAnchorCells path.
  // 214444115623 played 4 is a win_to_draw double_threat fork that STAYS on the sign engine
  // (see 'D16 Case A' in reasonEngine.test.mjs), so it still exercises this invariant.
  const r = await computeReason('214444115623', 4, { solver });
  // D16: the best move creates a Case-A fork (forkCells c4r3,c6r4). anchorCells are the cells of the
  // fork windows (every window cell), so the tie can match a constituent the opponent occupies.
  assert.equal(r.lostResource.terminal, 'fork');
  assert.deepEqual([...r.lostResource.anchorCells].sort(), [
    'c3r1', 'c3r3', 'c4r2', 'c4r3', 'c5r3', 'c6r1', 'c6r2', 'c6r3', 'c6r4',
  ]);
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

test('gated naming: 214444115623 keeps double_threat', async () => {
  // Retargeted from 3325 (2026-07-01): 3325 now diverts to the realized/denied route, so its tag
  // comes from tagBlunder directly (not nameFork's gated classifyPattern naming). 214444115623
  // played 4 stays on the sign engine and still exercises D13's gated tacticTag naming.
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.lostResource.tacticTag, 'double_threat');
});

test('tie: 3325 win_to_draw is tied at the winning square', async () => {
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.ok(r.opponentPunishment.tie.sharedCells.includes('c2r1'));
});

test('tie: lose_to_faster_lose is temporal', async () => {
  // Uses a board that stays on the sign-engine ltfl swindle path (temporal tie). NB: the former
  // board 3333325662555225 now reclassifies to the realized_denied router (figure_7/enabled_opponent,
  // tied) after the enabled-fork router fix (D23), so this exercises the sign-engine temporal tie.
  const r = await computeReason('3333311115555', 0, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'temporal');
  assert.equal(typeof r.opponentPunishment.tie.playedPlies, 'number');
  assert.equal(typeof r.opponentPunishment.tie.swindlePlies, 'number');
});

test('tie: temporal tied compares ABSOLUTE terminal disc counts, not cross-root plies (F2)', async () => {
  // 332123 played 4 (d19-witness fixture row): sign-engine ltfl. The two halves are walked from
  // DIFFERENT roots (playedRoot vs the deeper swindleRoot), so raw pliesToEnd are not comparable —
  // the OLD rule (playedPlies < swindlePlies) returned tied:false (29 vs 25) even though the played
  // loss terminates SOONER in absolute plies (36 vs 37). tied must reflect the common-frame comparison.
  const r = await computeReason('332123', 4, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'temporal');
  const playedEnd = r.opponentPunishment.finalMovestring.length;
  const swindleEnd = r.lostResource.finalMovestring.length;
  assert.equal(r.opponentPunishment.tie.tied, playedEnd < swindleEnd,
    'tied must equal absolute-terminal-count comparison');
  assert.equal(r.opponentPunishment.tie.tied, true, '332123 played 4: played loss (36) is faster than swindle (37)');
});

test('tie: present with a valid kind on every blunder fixture row', async () => {
  for (const f of fixtureRows) {
    const r = await computeReason(f.movestring, f.playedCol, { solver });
    if (r.notABlunder || !r.opponentPunishment) continue;
    assert.ok(['tied', 'independent', 'temporal'].includes(r.opponentPunishment.tie.kind),
      `${f.movestring}: tie.kind valid`);
  }
});
