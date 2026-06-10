import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colsToBoard } from '../src/lib/board.js';

test('valid 2-ply: col0=g, col1=d places red and yellow at row 0', () => {
  const board = colsToBoard(['g', 'd', '', '', '', '', '']);
  assert.equal(board[0][0], 'red');
  assert.equal(board[0][1], 'yellow');
  assert.equal(board[0][2], 'empty');
});

test('multi-column stacking: gg in col0 puts red at row0 and row1', () => {
  const board = colsToBoard(['gg', 'dd', 'g', '', '', '', '']);
  assert.equal(board[0][0], 'red');
  assert.equal(board[1][0], 'red');
  assert.equal(board[0][1], 'yellow');
  assert.equal(board[1][1], 'yellow');
  assert.equal(board[0][2], 'red');
  assert.equal(board[1][2], 'empty');
});

test('empty cols: all cells are empty', () => {
  const board = colsToBoard(['', '', '', '', '', '', '']);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      assert.equal(board[r][c], 'empty');
    }
  }
});

test('null input: returns empty board without throwing', () => {
  const board = colsToBoard(null);
  assert.equal(board.length, 6);
  assert.equal(board[0][0], 'empty');
});

test('wrong length: returns empty board without throwing', () => {
  const board = colsToBoard(['g']);
  assert.equal(board.length, 6);
  assert.equal(board[0][0], 'empty');
});

test('malformed chars: returns fallback board without throwing', () => {
  // boardSpecToBoard throws on unknown chars; colsToBoard should catch and return empty
  let board;
  assert.doesNotThrow(() => {
    board = colsToBoard(['x', '', '', '', '', '', '']);
  });
  assert.equal(board.length, 6);
});
