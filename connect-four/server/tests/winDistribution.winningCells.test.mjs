import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOutcome } from '../scripts/win_distribution/winningCells.mjs';

const key = ({ row, col }) => `${col},${row}`;

test('vertical P1 win', () => {
  const o = extractOutcome('0101010');
  assert.equal(o.winner, 1);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '0,1', '0,2', '0,3']);
  assert.equal(o.windows.length, 1);
});

test('horizontal P1 win', () => {
  const o = extractOutcome('0011223'); // P1: cols 0,1,2,3 on row 0
  assert.equal(o.winner, 1);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '1,0', '2,0', '3,0']);
});

test('P2 vertical win has winner 2', () => {
  // Verified with ./visualize_board.sh 60504060 on 2026-07-02: P1 plays c6,c5,c4,c6;
  // P2 stacks col 0 and wins vertically (rows 0-3) at move 8. P1 never wins first.
  const o = extractOutcome('60504060');
  assert.equal(o.winner, 2);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '0,1', '0,2', '0,3']);
});

test('draw / unfinished returns null winner', () => {
  assert.deepEqual(extractOutcome('001122'), { winner: null, cells: [], windows: [] });
  assert.deepEqual(extractOutcome(''), { winner: null, cells: [], windows: [] });
});

test('double win counts the union of windows', () => {
  // Verified with ./visualize_board.sh 0112322434353 on 2026-07-02: move 13 (P1,
  // green) is a simultaneous vertical win (0-indexed col3, rows0-3) AND a
  // diagonal win (rows0-3 / cols0-3, dr=1,dc=1), sharing the final cell
  // (row3,col3). Board shows "GAME OVER" at move 13 with Gn discs stacked
  // col4(displayed) rows1-4 and Gn diagonal at displayed (col1,row1),
  // (col2,row2), (col3,row3), (col4,row4).
  const o = extractOutcome('0112322434353');
  assert.equal(o.winner, 1);
  assert.equal(o.windows.length, 2);
  assert.equal(o.cells.length, new Set(o.cells.map(key)).size);
  assert.equal(o.cells.length, 7);
  assert.ok(o.cells.length > 4);
  assert.deepEqual(
    o.cells.map(key).sort(),
    ['0,0', '1,1', '2,2', '3,0', '3,1', '3,2', '3,3'].sort()
  );
});
