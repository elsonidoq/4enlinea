import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellToRC, rcToCell, horizonForRegister, statusOf, reachableInPlies, groundCell }
  from '../scripts/reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';

test('cell <-> rc round trip (0-indexed rc, 1-indexed cNrM)', () => {
  assert.deepEqual(cellToRC('c1r4'), [3, 0]);
  assert.equal(rcToCell(3, 0), 'c1r4');
});

test('horizonForRegister maps register to horizon', () => {
  assert.equal(horizonForRegister('immediate'), 'immediate');
  assert.equal(horizonForRegister('forced_sequence'), 'deep-forced-line');
  assert.equal(horizonForRegister('parity'), 'deep-parity');
});

test('statusOf classifies occupancy + gravity-top', () => {
  // "01020": col0 = player1 at r0,r1,r2 (heights[0]=3); c1r4 (=[3,0]) is empty and playable now.
  const { board, colHeights } = parseBoardState('01020');
  assert.equal(statusOf('c1r4', board, colHeights, 1), 'empty-playable-now'); // r==height
  assert.equal(statusOf('c1r1', board, colHeights, 1), 'occupied-you');       // [0,0] = player1 = you
  assert.equal(statusOf('c2r1', board, colHeights, 1), 'occupied-opp');       // [0,1] = player2
  assert.equal(statusOf('c1r5', board, colHeights, 1), 'empty');              // [4,0] empty, not playable yet
});

test('reachableInPlies finds the fill ply along the final line', () => {
  // In "01020", col0's 3rd disc (c1r3 = [2,0]) is placed at move index 4.
  assert.equal(reachableInPlies('c1r3', '01020'), 4);
  assert.equal(reachableInPlies('c1r4', '01020'), null); // never filled in this string
});

test('groundCell composes the grounded object', () => {
  const { board, colHeights } = parseBoardState('01020');
  const g = groundCell('c1r4', { board, colHeights, finalMovestring: '010200', register: 'immediate',
                                 role: 'completes the winning line', perspectivePlayer: 1 });
  assert.deepEqual(g, { cell: 'c1r4', status: 'empty-playable-now', horizon: 'immediate',
                        reachableInPlies: 5, role: 'completes the winning line' });
});
