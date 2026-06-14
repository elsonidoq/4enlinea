import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMovestring,
  boardToSpec,
  appendMove,
  undoMove,
  isColFull,
  nextPlayer,
  getColHeights,
} from '../../src/lib/movestring.js';

test('parseMovestring: empty string → all-empty 6×7 board', () => {
  const board = parseMovestring('');
  assert.equal(board.length, 6);
  assert.equal(board[0].length, 7);
  assert.ok(board.every(row => row.every(v => v === 'empty')));
});

test('parseMovestring: "3" → red disc at row 0 col 3', () => {
  const board = parseMovestring('3');
  assert.equal(board[0][3], 'red');
  assert.equal(board[1][3], 'empty');
});

test('parseMovestring: "33" → red at row 0, yellow at row 1, same column', () => {
  const board = parseMovestring('33');
  assert.equal(board[0][3], 'red');
  assert.equal(board[1][3], 'yellow');
});

test('parseMovestring: "34" → red at col 3 row 0, yellow at col 4 row 0', () => {
  const board = parseMovestring('34');
  assert.equal(board[0][3], 'red');
  assert.equal(board[0][4], 'yellow');
});

test('boardToSpec: empty board → 7 empty strings', () => {
  const board = parseMovestring('');
  const spec = boardToSpec(board);
  assert.deepEqual(spec, ['', '', '', '', '', '', '']);
});

test('boardToSpec: red disc at col 3 row 0 → spec[3] === "g"', () => {
  const board = parseMovestring('3');
  const spec = boardToSpec(board);
  assert.equal(spec[3], 'g');
});

test('boardToSpec: red at row 0, yellow at row 1 → spec[col] === "gd"', () => {
  const board = parseMovestring('33');
  const spec = boardToSpec(board);
  assert.equal(spec[3], 'gd');
});

test('appendMove: appends column digit to movestring', () => {
  assert.equal(appendMove('33', 4), '334');
  assert.equal(appendMove('', 0), '0');
});

test('undoMove: removes last character', () => {
  assert.equal(undoMove('334'), '33');
  assert.equal(undoMove(''), '');
});

test('isColFull: returns true when column has 6 discs', () => {
  const ms = '000000'; // 6 discs in col 0
  assert.ok(isColFull(ms, 0));
  assert.ok(!isColFull(ms, 1));
});

test('nextPlayer: returns "red" for even-length movestring', () => {
  assert.equal(nextPlayer(''), 'red');
  assert.equal(nextPlayer('33'), 'red');
});

test('nextPlayer: returns "yellow" for odd-length movestring', () => {
  assert.equal(nextPlayer('3'), 'yellow');
  assert.equal(nextPlayer('334'), 'yellow');
});

test('getColHeights: counts discs per column', () => {
  const h = getColHeights('03301');
  assert.equal(h[0], 2);
  assert.equal(h[3], 2);
  assert.equal(h[1], 1);
  assert.equal(h[2], 0);
});
