import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEATMAP, winProbability, playerFavorsRow } from '../scripts/reason_engine/winningCellHeatmap.mjs';

test('heatmap shape is 2 players x 6 rows x 7 cols', () => {
  for (const p of ['1', '2']) {
    assert.equal(HEATMAP.heatmaps[p].length, 6);
    for (const row of HEATMAP.heatmaps[p]) assert.equal(row.length, 7);
  }
});

test('parity sums match the embedded summary (orientation sanity)', () => {
  // player 1 mass concentrates on internal even rows {0,2,4}
  const mass = (p, rows) => rows.reduce((s, r) => s + HEATMAP.heatmaps[p][r].reduce((a, b) => a + b, 0), 0);
  const p1odd = mass('1', [0, 2, 4]);   // display-odd rows
  const p1even = mass('1', [1, 3, 5]);
  assert.ok(p1odd / (p1odd + p1even) > 0.7, 'player 1 winning cells concentrate on display-odd rows');
});

test('winProbability reads (player,row0,col0) and clamps out of range', () => {
  assert.equal(winProbability(2, 3, 3), 0.3873);   // player 2 peak, internal row 3, col 3 (display c4r4)
  assert.equal(winProbability(1, 4, 3), 0.36257861635220123);
  assert.equal(winProbability(1, 99, 0), 0);
  assert.equal(winProbability(1, 0, -1), 0);
});

test('playerFavorsRow encodes parity favor', () => {
  assert.equal(playerFavorsRow(1, 0), true);   // player 1 on internal even rows
  assert.equal(playerFavorsRow(1, 1), false);
  assert.equal(playerFavorsRow(2, 1), true);   // player 2 on internal odd rows
  assert.equal(playerFavorsRow(2, 0), false);
});
