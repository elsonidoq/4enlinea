// Unit tests for getMinorThreatWindows.
//
// Regression: a window whose disc pair is a strict subset of a major threat window's
// disc triplet must not be counted as a minor threat ("shadow window" bug).
//
// Board: movestring "542344233" (9 moves, Gray to play next).
//   Green has a major threat on the anti-diagonal:
//     c6r1 (r=0,c=5) → c5r2 (r=1,c=4) → c4r3 (r=2,c=3) → c3r4 (r=3,c=2) [empty]
//   The window [c5r2, c4r3, c3r4, c2r5] slides one step further along the same
//   diagonal (2 Green discs + 2 empty) and must be excluded as a shadow window.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Board, getMinorThreatWindows } from '../../server/classifier.js';

// Movestring "542344233": 9-move position where Green has a major anti-diagonal threat.
// Board (display coords, 1-indexed):
//   c3r1,c3r2 = Gn   c4r1,c4r2 = Gy   c4r3 = Gn   c5r1=Gy,c5r2=Gn,c5r3=Gy   c6r1=Gn
const MOVESTRING = '542344233';
const GREEN = 1;

describe('getMinorThreatWindows — shadow window exclusion', () => {
  test('shadow window sharing both discs with a major threat is excluded', () => {
    const board = new Board(MOVESTRING);

    // 0-indexed positions of the two Green discs in the shadow window:
    //   c5r2 (display) = r=1, c=4
    //   c4r3 (display) = r=2, c=3
    const SHADOW_DISC_A = [1, 4]; // r, c
    const SHADOW_DISC_B = [2, 3];

    const windows = getMinorThreatWindows(board.board, GREEN);

    const hasShadowWindow = windows.some(window => {
      const discCells = window.filter(([r, c]) => board.board[r][c] === GREEN);
      return (
        discCells.length === 2 &&
        discCells.some(([r, c]) => r === SHADOW_DISC_A[0] && c === SHADOW_DISC_A[1]) &&
        discCells.some(([r, c]) => r === SHADOW_DISC_B[0] && c === SHADOW_DISC_B[1])
      );
    });

    assert.equal(
      hasShadowWindow,
      false,
      'window whose disc pair is a subset of the major threat triplet (c5r2+c4r3) must not appear as a minor threat'
    );
  });

  test('Green still has minor threats on this board (fix did not wipe all windows)', () => {
    const board = new Board(MOVESTRING);
    const windows = getMinorThreatWindows(board.board, GREEN);
    assert.ok(windows.length > 0, 'Green should still have at least one minor threat window');
  });
});
