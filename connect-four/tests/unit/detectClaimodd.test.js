import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board, detectClaimodd } from '../../server/classifier.js';

test('detectClaimodd: positive — all-even parity, Red turn, center col winning', () => {
  // 8 moves in cols 3 and 4 (4 each): colHeights[3]=4, colHeights[4]=4, all others 0.
  // All colHeights are even. 8 moves (even) = currentPlayer=1 (Red to move).
  const movestring = '33334444';
  const board = new Board(movestring);
  const scores = [0, 0, 0, 3, 1, 0, 0]; // col 3 is positive and ties the max
  const result = detectClaimodd(board, scores);
  assert.equal(result.matched, true);
  assert.equal(result.correctCol, 3);
});

test('detectClaimodd: negative — odd colHeight present', () => {
  // 2 moves total (even → currentPlayer=1), but col 0 height=1 and col 3 height=1 (both odd).
  // detectClaimodd rejects because not all columns have even heights.
  const board = new Board('30');
  const scores = [0, 0, 0, 3, 0, 0, 0];
  const result = detectClaimodd(board, scores);
  assert.equal(result.matched, false);
});

test('detectClaimodd: negative — not Red turn', () => {
  // 1 move: col 3 height=1 (odd), currentPlayer=2 (Yellow to move).
  // detectClaimodd rejects at the currentPlayer check.
  const board = new Board('3');
  const scores = [0, 0, 0, 3, 0, 0, 0];
  const result = detectClaimodd(board, scores);
  assert.equal(result.matched, false);
});

test('detectClaimodd: negative — all even, Red turn, but scores[3] <= 0', () => {
  // 8 moves, cols 3 and 4 each height 4, currentPlayer=1.
  const movestring = '33334444';
  const board = new Board(movestring);
  const scores = [0, 0, 0, -1, 0, 0, 0]; // col 3 is losing
  const result = detectClaimodd(board, scores);
  assert.equal(result.matched, false);
});

test('detectClaimodd: negative — all even, Red turn, scores[3] > 0 but not max', () => {
  // 8 moves, cols 3 and 4 each height 4, currentPlayer=1.
  const movestring = '33334444';
  const board = new Board(movestring);
  const scores = [0, 0, 0, 1, 3, 0, 0]; // col 4 scores higher than col 3
  const result = detectClaimodd(board, scores);
  assert.equal(result.matched, false);
});
