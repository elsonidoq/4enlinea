// connect-four/server/tests/winDistribution.aggregate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRows } from '../scripts/win_distribution/aggregate.mjs';

test('aggregateRows computes conditional heatmaps and parity mass', () => {
  const rows = [
    { g: 0, ms: 'x', winner: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], plies: 7 },
    { g: 1, ms: 'x', winner: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], plies: 9 },
    { g: 2, ms: 'x', winner: null, cells: [], plies: 42 },
  ];
  const a = aggregateRows(rows);
  assert.equal(a.games, 3);
  assert.equal(a.p1Wins, 2);
  assert.equal(a.p2Wins, 0);
  assert.equal(a.draws, 1);
  assert.equal(a.heatmaps[2], null);
  assert.equal(a.heatmaps[1][0][0], 1);    // cell (col0,row0) in both wins → 2/2
  assert.equal(a.heatmaps[1][1][0], 0.5);  // (col0,row1) in 1 of 2 wins
  assert.equal(a.heatmaps[1][0][3], 0.5);  // (col3,row0) in 1 of 2 wins
  // parity: winning-cell mass on odd rows (1-indexed rows 1,3,5 = row indices 0,2,4)
  // game0 cells rows {0,1,2,3} → odd-mass 2/4; game1 rows all 0 → 4/4; mean over games = 0.75
  assert.equal(a.parity[1].oddRowMass, 0.75);
});
