import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePolicy, POLICY_NAMES } from '../scripts/win_distribution/policies.mjs';
import { parseBoardState } from '../classifier.js';

function ctx(ms, { scores = null, rng = Math.random } = {}) {
  const { board, colHeights } = parseBoardState(ms);
  const legal = [];
  for (let c = 0; c < 7; c++) if (colHeights[c] < 6) legal.push(c);
  const player = ms.length % 2 === 0 ? 1 : 2;
  let fetched = false;
  return {
    ms, board, heights: colHeights, player, legal, rng,
    getScores: async () => { fetched = true; return scores; },
    wasFetched: () => fetched,
  };
}

test('POLICY_NAMES lists the 4 policies', () => {
  assert.deepEqual(POLICY_NAMES, ['optimal', 'mp10', 'mp25', 'blocker']);
});

test('makePolicy throws on unknown name', () => {
  assert.throws(() => makePolicy('nope'));
});

test('optimal picks uniformly among argmax columns', async () => {
  const p = makePolicy('optimal');
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const c = ctx('', { scores: [5, -1, 5, 2, 5, -1000, 0] });
    seen.add(await p(c));
  }
  assert.deepEqual([...seen].sort(), [0, 2, 4]);
});

test('mp policies: mistake branch is uniform over legal and skips the solver', async () => {
  const p = makePolicy('mp25');
  // rng sequence: first draw 0.1 (< 0.25 → mistake), second draw 0.99 → last legal col
  const draws = [0.1, 0.99];
  const c = ctx('', { rng: () => draws.shift() });
  const col = await p(c);
  assert.equal(col, 6);
  assert.equal(c.wasFetched(), false);
});

test('mp policies: non-mistake branch plays optimal', async () => {
  const p = makePolicy('mp10');
  const draws = [0.5, 0.0]; // 0.5 >= 0.10 → optimal branch; 0.0 → first of the tied best
  const c = ctx('', { scores: [0, 0, 1, 2, 1, 0, 0], rng: () => draws.shift() });
  assert.equal(await p(c), 3);
  assert.equal(c.wasFetched(), true);
});

test('blocker takes its own win-in-1', async () => {
  // "010101" — verified via ./visualize_board.sh: P1 (Green) to move, col 0 has 3
  // stacked P1 discs (rows 0-2), gravity-top major threat at col0 row3 (0-indexed).
  // Playing col0 completes the vertical win.
  const p = makePolicy('blocker');
  assert.equal(await p(ctx('010101')), 0);
});

test('blocker blocks the opponent win-in-1', async () => {
  // "01010" — verified via ./visualize_board.sh: P2 (Gray) to move; P1 (Green) has
  // 3 stacked in col 0 (rows 0-2) — a gravity-top major threat; P2 has no win-in-1
  // (only a minor threat at col1), so P2 must block col 0.
  const p = makePolicy('blocker');
  assert.equal(await p(ctx('01010')), 0);
});

test('blocker avoids forbidden columns (opponent wins on top)', async () => {
  // movestring "01205162" verified with ./visualize_board.sh:
  //   row1 (0-indexed) cols 0,1,2 = P2 (Gray), forming a non-gravity major threat
  //   for Gray at col3 row1 (display: "Major threats: col4 row2 (Gy)", 1-indexed).
  //   col3 is currently empty (height 0): playing it does not win/lose for either
  //   player, but hands P2 the completion one row up. No other column creates a
  //   threat, and neither player has a win-in-1 (no gravity-top major threats).
  const p = makePolicy('blocker');
  for (let i = 0; i < 100; i++) {
    const col = await p(ctx('01205162'));
    assert.notEqual(col, 3);
  }
});
