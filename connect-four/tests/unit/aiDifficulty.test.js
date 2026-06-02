import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secondBestColumn, MISTAKE_RATES, INVALID_MOVE } from '../../src/lib/aiDifficulty.js';

test('secondBestColumn: normal case — returns column with second-highest score', () => {
  // Scores: [0, 5, 10, 8, -1000, 3, 7]
  // Legal: cols 0:0, 1:5, 2:10, 3:8, 5:3, 6:7  (col 4: -1000 filtered out)
  // Max = 10 (col 2), second-highest = 8 (col 3)
  const result = secondBestColumn([0, 5, 10, 8, INVALID_MOVE, 3, 7]);
  assert.equal(result, 3, 'expected col 3 (score 8) as second-best');
});

test('secondBestColumn: all legal columns tie the max — returns null', () => {
  const result = secondBestColumn([5, 5, 5, 5, 5, INVALID_MOVE, 5]);
  assert.equal(result, null, 'expected null when all legal scores tie');
});

test('secondBestColumn: sentinel values are filtered from consideration', () => {
  // Legal: col 0:10, col 4:8  (cols 1,2,3,5,6 are sentinel)
  // Max = 10 (col 0), second-highest = 8 (col 4)
  const result = secondBestColumn([10, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, 8, INVALID_MOVE, INVALID_MOVE]);
  assert.equal(result, 4, 'expected col 4 (score 8) as second-best with sentinel columns');
});

test('secondBestColumn: single legal column — returns null', () => {
  const result = secondBestColumn([10, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE]);
  assert.equal(result, null, 'expected null with only one legal column');
});

test('secondBestColumn: only one legal column among duplicates — returns null', () => {
  // Single legal column (col 0), all others sentinel
  const result = secondBestColumn([5, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE]);
  assert.equal(result, null, 'expected null with single legal column among sentinels');
});

test('secondBestColumn: all columns are legal and tied — returns null', () => {
  // All 7 columns have score 3, all legal
  const result = secondBestColumn([3, 3, 3, 3, 3, 3, 3]);
  assert.equal(result, null, 'expected null when all columns tie');
});

test('secondBestColumn: two legal columns but one is max — returns the other', () => {
  // Legal: col 2:10, col 5:7  (cols 0,1,3,4,6 are sentinel)
  // Max = 10 (col 2), second-best = 7 (col 5)
  const result = secondBestColumn([INVALID_MOVE, INVALID_MOVE, 10, INVALID_MOVE, INVALID_MOVE, 7, INVALID_MOVE]);
  assert.equal(result, 5, 'expected col 5 as second-best with exactly two legal columns');
});

test('secondBestColumn: all sentinel values — returns null', () => {
  const result = secondBestColumn([INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE, INVALID_MOVE]);
  assert.equal(result, null, 'expected null when all columns are sentinel');
});

test('MISTAKE_RATES: perfect difficulty rate is 0', () => {
  assert.equal(MISTAKE_RATES.perfect, 0, 'perfect difficulty must have zero mistake rate');
});

test('MISTAKE_RATES: all difficulties have non-zero except perfect', () => {
  assert.ok(MISTAKE_RATES.easy > 0, 'easy rate must be > 0');
  assert.ok(MISTAKE_RATES.medium > 0, 'medium rate must be > 0');
  assert.ok(MISTAKE_RATES.hard > 0, 'hard rate must be > 0');
  assert.equal(MISTAKE_RATES.perfect, 0, 'perfect rate must be 0');
});
