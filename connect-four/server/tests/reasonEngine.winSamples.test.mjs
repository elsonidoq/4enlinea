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
import { computeReason, REASON_CONFIG } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
// winSamples is globally disabled by default (not judged useful for explaining the blunder). The
// code path is intact; enable it here so the distribution tests still exercise it.
before(async () => { solver = await createSolverProcess(); REASON_CONFIG.enableWinSamples = true; });
after(() => { if (solver) solver.destroy(); });

ntest('walkOptimal refactor: lostResource window unchanged on a known parity win', async () => {
  // eval-14: win_to_draw parity win, best col 4, window c4r5..c7r5, completing c7r5.
  const r = await computeReason('333333451225', 2, { solver });
  assert.equal(r.case, 'win_to_draw');
  assert.equal(r.lostResource.register, 'parity');
  assert.deepEqual(r.lostResource.window, ['c4r5', 'c5r5', 'c6r5', 'c7r5']);
  assert.equal(r.lostResource.completingCell, 'c7r5');
});

// Keep sample counts small so the integration tests stay fast; deterministic regardless of n.
process.env.REASON_WIN_SAMPLES = '8';

ntest('optimalWinSamples: present + well-formed on a parity win (eval-14)', async () => {
  const r = await computeReason('333333451225', 2, { solver });
  const s = r.lostResource.optimalWinSamples;
  assert.ok(s, 'optimalWinSamples attached');
  assert.equal(s.n, 8);
  assert.ok(s.distinct >= 1 && s.distinct <= s.n, 'distinct within [1, n]');
  assert.equal(s.orientation.horizontal + s.orientation.vertical + s.orientation.diagonal, s.n,
    'orientation histogram sums to n');
  assert.ok(s.oddCompletingFraction >= 0 && s.oddCompletingFraction <= 1);
  for (const line of s.lines) {
    assert.equal(line.window.length, 4);
    assert.ok(['horizontal', 'vertical', 'diagonal'].includes(line.orientation));
    assert.ok(['odd', 'even'].includes(line.completingParity));
    assert.ok(line.count >= 1 && line.pliesToEnd > 0);
  }
  // lines are sorted most-frequent-first
  for (let i = 1; i < s.lines.length; i++) assert.ok(s.lines[i - 1].count >= s.lines[i].count);
});

ntest('optimalWinSamples: deterministic across runs (seeded RNG)', async () => {
  const a = await computeReason('333333451225', 2, { solver });
  const b = await computeReason('333333451225', 2, { solver });
  assert.deepEqual(a.lostResource.optimalWinSamples, b.lostResource.optimalWinSamples);
});

ntest('optimalWinSamples: NOT attached on a non-parity (fork) win', async () => {
  // 214444115623 played 4 is a win_to_draw fork (register forced_sequence/immediate, terminal fork).
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.lostResource.terminal, 'fork');
  assert.equal(r.lostResource.optimalWinSamples, undefined);
});

// ── top-level winSamples (opening/mid-game): best = player's win, played = opponent's win ──
ntest('winSamples: both distributions on a win_to_lose; already-won best root does not crash', async () => {
  // 463512252326 played 0 = win_to_lose (opening). Best (col2) is an IMMEDIATE vertical win, so its
  // root is already terminal — sampleOptimalWins must return the completing window without querying
  // the solver (a terminal position the solver rejects). Played (col0) hands the opponent a win.
  const r = await computeReason('463512252326', 0, { solver });
  assert.equal(r.case, 'win_to_lose');
  assert.equal(r.boardState, 'opening');
  assert.ok(r.winSamples, 'winSamples attached for opening board');
  assert.ok(r.winSamples.best.distinct >= 1, 'best distribution populated (player win)');
  assert.deepEqual(r.winSamples.best.lines[0].window, ['c3r2', 'c3r3', 'c3r4', 'c3r5']);
  assert.ok(r.winSamples.played.distinct >= 1, 'played distribution populated (opponent win)');
});

ntest('winSamples: best is EMPTY when the best root has no win for the player (lose_to_faster_lose)', async () => {
  // Both roots lose; the player has no forced win from either. best (winnerMark=player) must be
  // empty; played (winnerMark=opponent) shows the opponent's faster win.
  const r = await computeReason('3333325662555225', 1, { solver });
  assert.equal(r.case, 'lose_to_faster_lose');
  assert.ok(r.winSamples, 'winSamples attached');
  assert.equal(r.winSamples.best.distinct, 0, 'no player win from the best root');
  assert.equal(r.winSamples.best.n, 0);
  assert.ok(r.winSamples.played.distinct >= 1, 'opponent win from the played root');
});

ntest('winSamples: NOT computed for closing boards (discs >= 30)', async () => {
  // 33343022442233255525004414106106605511 played 6 = lose_to_faster_lose with 38 discs (closing).
  const r = await computeReason('33343022442233255525004414106106605511', 6, { solver });
  assert.equal(r.boardState, 'closing');
  assert.equal(r.winSamples, null);
});

ntest('winSamples: null when the global toggle is off (disabled default)', async () => {
  REASON_CONFIG.enableWinSamples = false;
  try {
    // Same opening win_to_lose that populates winSamples when enabled — now suppressed entirely.
    const r = await computeReason('463512252326', 0, { solver });
    assert.equal(r.boardState, 'opening');
    assert.equal(r.winSamples, null);
  } finally {
    REASON_CONFIG.enableWinSamples = true; // restore for any later tests in this file
  }
});
