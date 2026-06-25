import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../server/classifier.js';
import { selectOpponentMistakeCols, classifyPatternWithTimeout, extractTier1Structures } from '../server/sparseLookahead.js';

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

test('selectOpponentMistakeCols keeps a whole tie tier even if it exceeds OPPONENT_CAP', () => {
  // Never-split-overrides-cap: if the first middle tier is a large tie, return all of it.
  const board = new Board('');
  const scores = [10, 5, 5, 5, 5, 5, 1]; // best col0(10); tie tier cols1-5(5); worst col6(1)
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Exclude best(col0) and worst(col6); first middle tier is the five 5s -> whole tier included,
  // even though 5 columns exceeds OPPONENT_CAP(4).
  assert.deepEqual(got, [1, 2, 3, 4, 5]);
});

test('classifyPatternWithTimeout returns empty Map when classify hangs', async () => {
  const hang = () => new Promise(() => {}); // never resolves
  const got = await classifyPatternWithTimeout(hang, '01', 1, null, 50);
  assert.ok(got instanceof Map);
  assert.equal(got.size, 0);
});

test('classifyPatternWithTimeout returns empty Map when classify throws', async () => {
  const boom = async () => { throw new Error('solver error on won position'); };
  const got = await classifyPatternWithTimeout(boom, '01', 1, null, 1000);
  assert.equal(got.size, 0);
});

test('classifyPatternWithTimeout passes through the Map on success', async () => {
  const ok = async () => new Map([['double_threat', { cells: ['c4r3'] }]]);
  const got = await classifyPatternWithTimeout(ok, '01', 1, null, 1000);
  assert.deepEqual(got.get('double_threat'), { cells: ['c4r3'] });
});

test('extractTier1Structures keeps Tier-1 tags with cells, drops others', () => {
  const map = new Map([
    ['double_threat', { cells: ['c4r3', 'c5r3'] }],
    ['odd_even_threat', { cells: [] }],   // Tier-3 -> dropped
    ['j_shape', { cells: [] }],           // Tier-1 but empty -> dropped
    ['figure_7', { cells: ['c2r2'] }],
  ]);
  const got = extractTier1Structures(map);
  assert.deepEqual(got, [
    { tag: 'double_threat', cells: ['c4r3', 'c5r3'] },
    { tag: 'figure_7', cells: ['c2r2'] },
  ]);
});
