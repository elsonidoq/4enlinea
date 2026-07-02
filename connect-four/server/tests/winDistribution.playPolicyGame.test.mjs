// connect-four/server/tests/winDistribution.playPolicyGame.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playPolicyGame } from '../gameSampling.js';

function fixedCol(col) {
  return async () => col;
}

test('playPolicyGame plays policies alternately and stops on a win', async () => {
  // P1 always col 0, P2 always col 1 → P1 wins vertically after 7 plies: "0101010"
  const solver = { query: async () => { throw new Error('solver must not be called'); } };
  const plies = [];
  let finalMs = '';
  for await (const p of playPolicyGame(solver, [fixedCol(0), fixedCol(1)])) {
    plies.push(p);
    finalMs = p.ms + String(p.movePlayed);
  }
  assert.equal(finalMs, '0101010');
  assert.equal(plies.length, 7);
  assert.deepEqual(plies.map(p => p.player), [1, 2, 1, 2, 1, 2, 1]);
  assert.equal(plies[3].ms, '010');   // ms is the position BEFORE the move
  assert.equal(plies[0].scores, null); // no policy asked for scores
});

test('playPolicyGame getScores is lazy, memoized, and uses EMPTY_BOARD_SCORES for the empty board', async () => {
  let queries = 0;
  const solver = { query: async (ms) => { queries++; return [0, 0, 0, 3, 0, 0, 0]; } };
  const greedy = async ({ getScores, legal }) => {
    const s1 = await getScores();
    const s2 = await getScores(); // memoized — must not re-query
    assert.deepEqual(s1, s2);
    return legal.reduce((b, c) => (s1[c] > s1[b] ? c : b), legal[0]);
  };
  const gen = playPolicyGame(solver, [greedy, greedy]);
  const first = (await gen.next()).value;
  assert.equal(first.movePlayed, 3);            // argmax of EMPTY_BOARD_SCORES
  assert.deepEqual(first.scores, [0, 0, 1, 2, 1, 0, 0]);
  assert.equal(queries, 0);                     // empty board never hits the solver
  const second = (await gen.next()).value;
  assert.equal(queries, 1);                     // one memoized query for ply 2
  await gen.return();
});
