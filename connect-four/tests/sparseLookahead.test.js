import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../server/classifier.js';
import { selectOpponentMistakeCols } from '../server/sparseLookahead.js';

test('selectOpponentMistakeCols drops best tier and worst tier, keeps middle', () => {
  // 7 distinct tiers, all columns legal (empty board).
  const board = new Board('');
  const scores = [10, 9, 8, 7, 6, 5, 4]; // best=col0(10), worst=col6(4)
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Drop best tier (col0) and worst tier (col6); accumulate from 2nd-best until >=3, cap 4.
  // 2nd..: col1(9),col2(8),col3(7) -> 3 reached -> stop. worst tier already excluded.
  assert.deepEqual(got, [1, 2, 3]);
});

test('selectOpponentMistakeCols never splits a tie tier', () => {
  const board = new Board('');
  const scores = [10, 9, 9, 9, 9, 5, 4]; // best col0; tie tier (9) has 4 cols; worst col6.
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Exclude best(col0) and worst(col6); next tier is the four 9s -> whole tier included (>=3, cap 4 ok).
  assert.deepEqual(got, [1, 2, 3, 4]);
});

test('selectOpponentMistakeCols returns [] when <=1 legal column', () => {
  // Fill all but column 0 to height 6 by constructing a near-full board movestring is overkill;
  // instead assert the guard via a board with a single legal column.
  const board = new Board('111111'); // col1 filled to 6 -> still other cols legal; use colHeights directly
  // Simpler: monkeypatch colHeights to simulate one legal col.
  board.colHeights = [0, 6, 6, 6, 6, 6, 6];
  const scores = [3, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(selectOpponentMistakeCols(scores, board), []);
});
