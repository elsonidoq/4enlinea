// Counts, per empty cell, the four-in-a-row windows through it that contain no opponent
// disc — from the LEARNER's perspective (lesson.userPerspective), not the side to move.
// Expected values were harvested by brute force over the 69 windows, not hand-derived.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindowCounts, ALL_WINDOWS } from '../../server/windowCounts.js';

test('windowCounts: the board has exactly 69 four-in-a-row windows', () => {
  assert.equal(ALL_WINDOWS.length, 69);
});

test('windowCounts: on an empty board the count is pure geometry (13 centre, 3 corner)', () => {
  // No opponent disc exists, so every window is live and the count degenerates to the
  // number of windows through each cell. Row 0 = bottom.
  const expected = [
    [3, 4, 5, 7, 5, 4, 3],
    [4, 6, 8, 10, 8, 6, 4],
    [5, 8, 11, 13, 11, 8, 5],
    [5, 8, 11, 13, 11, 8, 5],
    [4, 6, 8, 10, 8, 6, 4],
    [3, 4, 5, 7, 5, 4, 3],
  ];
  assert.deepEqual(computeWindowCounts('', 'red'), expected);
  // Symmetric: with no discs at all, perspective cannot matter.
  assert.deepEqual(computeWindowCounts('', 'yellow'), expected);
});

test('windowCounts: occupied cells are null', () => {
  // '333' drops three discs in column 3: (3,0)=green, (3,1)=gray, (3,2)=green.
  const g = computeWindowCounts('333', 'red');
  assert.equal(g[0][3], null);
  assert.equal(g[1][3], null);
  assert.equal(g[2][3], null);
  assert.notEqual(g[3][3], null, 'the cell above the stack is empty and must carry a count');
});

test('windowCounts: an opponent disc kills the windows it sits in', () => {
  // Green learner, board '333'. Cell (c3,r3): geometric 13. The three vertical windows
  // through it span rows 0-3, 1-4 and 2-5; the gray disc at (3,1) kills the first two.
  // Green's OWN discs at (3,0)/(3,2) kill nothing. 13 - 2 = 11.
  assert.equal(computeWindowCounts('333', 'red')[3][3], 11);
  // The corner keeps all 3: its horizontal window contains green's own disc at (3,0),
  // and its vertical window cannot be blocked while (0,0) itself is empty.
  assert.equal(computeWindowCounts('333', 'red')[0][0], 3);
});

test('windowCounts: perspective flips which discs block', () => {
  // Same board, gray learner. Now green's discs are the blockers: the gray corner count
  // drops to 2 (green at (3,0) kills the horizontal) and (3,3) drops to 10.
  assert.equal(computeWindowCounts('333', 'yellow')[3][3], 10);
  assert.equal(computeWindowCounts('333', 'yellow')[0][0], 2);
});

test('windowCounts: a fully blocked cell counts 0', () => {
  // Harvested by random search — 0 is reachable, but only high on the board: for any
  // empty cell at row <= 2 the vertical window above it is necessarily empty, hence live.
  const ms = '3466053256140200054046246152456232';
  assert.equal(computeWindowCounts(ms, 'yellow')[5][5], 0);
});

test('windowCounts: every cell is null or a non-negative integer, shape is 6x7', () => {
  const g = computeWindowCounts('3332223362', 'red');
  assert.equal(g.length, 6);
  for (const row of g) {
    assert.equal(row.length, 7);
    for (const v of row) {
      assert.ok(v === null || (Number.isInteger(v) && v >= 0), `bad cell value ${v}`);
    }
  }
});
