import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardSpecToBoard } from '../../src/lib/board.js';

const EMPTY_SPEC = ['', '', '', '', '', '', ''];

test("boardSpecToBoard: 'g' maps to 'red'", () => {
  const spec = ['g', '', '', '', '', '', ''];
  const board = boardSpecToBoard(spec);
  assert.equal(board[0][0], 'red', "char 'g' should map to 'red'");
});

test("boardSpecToBoard: 'd' maps to 'yellow'", () => {
  const spec = ['d', '', '', '', '', '', ''];
  const board = boardSpecToBoard(spec);
  assert.equal(board[0][0], 'yellow', "char 'd' should map to 'yellow'");
});

test('boardSpecToBoard: empty column string → all empty in that column', () => {
  const board = boardSpecToBoard(EMPTY_SPEC);
  for (let r = 0; r < 6; r++) {
    assert.equal(board[r][0], 'empty', `row ${r} col 0 should be 'empty'`);
  }
});

test("boardSpecToBoard: mixed column string 'gd' fills row 0 with 'red' and row 1 with 'yellow'", () => {
  const spec = ['gd', '', '', '', '', '', ''];
  const board = boardSpecToBoard(spec);
  assert.equal(board[0][0], 'red',   'row 0 col 0 should be red (g)');
  assert.equal(board[1][0], 'yellow', 'row 1 col 0 should be yellow (d)');
  assert.equal(board[2][0], 'empty', 'row 2 col 0 should be empty (not in spec)');
});

test('boardSpecToBoard: 7-element boardSpec produces a 6×7 result array', () => {
  const board = boardSpecToBoard(EMPTY_SPEC);
  assert.equal(board.length, 6, 'board should have 6 rows');
  for (let r = 0; r < 6; r++) {
    assert.equal(board[r].length, 7, `row ${r} should have 7 columns`);
  }
});
