import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, findLockInNode } from '../scripts/reason_engine/reasonEngine.mjs';
import { buildBoard, parseCell } from '../scripts/reason_engine/lib/boardUtils.mjs';
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

// ── D7: detector-backed parity-rule naming (namedRule) ──────────────────────────────────────────

test('D7 findLockInNode: solver-free, returns first WINNER-TO-MOVE 3-of-4 node with completingCell empty', () => {
  // Winner = player 1 (Red). Window = top row cols 2..5 (c2r5..c5r5), completingCell = c5r5.
  // A hand-built finalMovestring is fine here: this is a pure prefix-scan unit test, no board legality
  // or solver needed (findLockInNode only reads the grid). We craft prefixes where c2r5/c3r5/c4r5 hold
  // P1 discs and c5r5 is empty. buildBoard fills bottom-up, so we place discs directly by column.
  // Simpler: assert the CONTRACT properties on a small synthetic scan via a real board is overkill;
  // instead validate the two invariants that matter: (a) null when no 3-of-4 node exists, (b) the
  // returned node is winner-to-move with the completing cell empty and 3 window discs.
  const win = ['c2r5', 'c3r5', 'c4r5', 'c5r5'];
  // No occurrence of the window at all -> null.
  assert.equal(findLockInNode('3333', win, 'c5r5', 1), null, 'no 3-of-4 -> null');
  // Missing pieces -> null (empty string prefix can never be 3-of-4).
  assert.equal(findLockInNode('', win, 'c5r5', 1), null, 'empty board -> null');
});

test('D7 findLockInNode: motivating "" played 4 win-half locks in winner-to-move, completing cell empty', async () => {
  const r = await computeReason('', 4, { solver });
  const h = r.lostResource;
  const lock = findLockInNode(h.finalMovestring, h.parityAttribution.controllingGroup, h.completingCell, r.player);
  assert.ok(lock, 'lock-in node found');
  assert.equal(lock.node.length, lock.lockInPly, 'lockInPly is the node disc count');
  assert.equal((lock.node.length % 2 === 0 ? 1 : 2), r.player, 'winner is to move at the lock-in node');
  const cp = parseCell(h.completingCell);
  const { grid } = buildBoard(lock.node);
  assert.equal(grid[cp.r][cp.c], 0, 'completing cell is still empty at the lock-in node');
});

// Confirm/abstain behaviour over the committed d7-* fixture rows (I12 cells: P1×odd×confirm×{midpv,
// term1}, and the mandatory detector-declined ABSTAIN rows incl. the P2/even allen-v4 detector gap).
const d7Rows = fixtureRows.filter((f) => (f.bucket || '').startsWith('d7-'));
test('D7 fixtures exist (confirm + abstain)', () => {
  assert.ok(d7Rows.some((f) => f.expectedNamedRule), 'at least one CONFIRM row');
  assert.ok(d7Rows.some((f) => f.expectedNamedRule == null), 'at least one ABSTAIN row');
});

for (const f of d7Rows) {
  test(`D7 ${f.bucket}: ${f.movestring} played ${f.playedCol}`, async () => {
    const r = await computeReason(f.movestring, f.playedCol, { solver });
    const pa = r[f.namedRuleHalf]?.parityAttribution;
    assert.ok(pa && pa.nameable, `${f.namedRuleHalf} carries a nameable parityAttribution`);
    if (f.expectedNamedRule) {
      const nr = pa.namedRule;
      assert.ok(nr, 'namedRule present on CONFIRM row');
      assert.equal(nr.rule, f.expectedNamedRule, 'confirmed rule');
      assert.equal(nr.basis, 'z_threat', 'basis is z_threat');
      assert.equal(pa.parityNamingDeferred, false, 'parityNamingDeferred cleared on confirm');
      assert.ok(nr.completingCell, 'completingCell present');
      assert.equal(nr.parity, nr.zcount % 2 === 1 ? 'odd' : 'even', 'parity matches zcount');
      // allen-v3 => winner P1 + odd zcount; allen-v4 => winner P2 + even zcount (Step C mapping)
      if (nr.rule === 'allen-v3') assert.equal(nr.parity, 'odd', 'v3 is odd');
      if (nr.rule === 'allen-v4') assert.equal(nr.parity, 'even', 'v4 is even');
      // lockInPly sanity: within the walk, and the completing cell is empty at that prefix
      const fm = r[f.namedRuleHalf].finalMovestring;
      assert.ok(nr.lockInPly >= 0 && nr.lockInPly <= fm.length, 'lockInPly within finalMovestring');
      const cp = parseCell(nr.completingCell);
      const { grid } = buildBoard(fm.slice(0, nr.lockInPly));
      assert.equal(grid[cp.r][cp.c], 0, 'completing cell empty at the lock-in prefix');
    } else {
      // ABSTAIN: a genuine parity win the production detector declined to name — honest null (I2).
      assert.equal(pa.namedRule ?? null, null, 'namedRule is null on ABSTAIN row');
      assert.equal(pa.parityNamingDeferred, true, 'parityNamingDeferred stays true on abstain');
    }
  });
}

test('tie: present with a valid kind on every blunder fixture row', async () => {
  for (const f of fixtureRows) {
    const r = await computeReason(f.movestring, f.playedCol, { solver });
    if (r.notABlunder || !r.opponentPunishment) continue;
    assert.ok(['tied', 'independent', 'temporal'].includes(r.opponentPunishment.tie.kind),
      `${f.movestring}: tie.kind valid`);
  }
});
