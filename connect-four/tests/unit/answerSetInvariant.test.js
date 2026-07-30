// Spec 051 (Epic 1) T002 — unit tests for isSolverSafe(col, scores), the single shared relative
// solver-safety floor added to server/answerSetInvariant.js (FR-001).
//
// Both fixture boards below were harvested via server/gameSampling.js#playGame against the real
// c4solver (never hand-constructed, per CLAUDE.md/Constitution III) and confirmed with
// ./visualize_board.sh before being hardcoded here — pure data, no live solver needed at test time:
//   - won board:  moveString "" (empty board), scores [-2,-1,0,1,0,-1,-2] — col 3 is the sole
//     positive-and-best column.
//   - fully-lost board: moveString "3", scores [-4,-2,-2,-1,-2,-2,-4] — every legal column is
//     negative (a LOST-POSITION board), and col 3 is the slowest loss (max = -1).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isSolverSafe, optimalCols } from '../../server/answerSetInvariant.js';

describe('isSolverSafe(col, scores)', () => {
  describe('won board (harvested via playGame, moveString "")', () => {
    const scores = [-2, -1, 0, 1, 0, -1, -2];

    test('the sole solver-optimal column is safe', () => {
      assert.equal(isSolverSafe(3, scores), true);
      assert.deepEqual(optimalCols(scores), [3]);
    });

    test('every non-optimal column is unsafe', () => {
      for (const col of [0, 1, 2, 4, 5, 6]) {
        assert.equal(isSolverSafe(col, scores), false, `col ${col} should not be safe`);
      }
    });
  });

  describe('fully-lost board (harvested via playGame, moveString "3", LOST-POSITION)', () => {
    const scores = [-4, -2, -2, -1, -2, -2, -4];

    test('the slowest-loss column is safe under the relative floor, despite a negative score', () => {
      assert.deepEqual(optimalCols(scores), [3]);
      assert.equal(isSolverSafe(3, scores), true);
    });

    test('a faster-losing column is unsafe', () => {
      for (const col of [0, 1, 2, 4, 5, 6]) {
        assert.equal(isSolverSafe(col, scores), false, `col ${col} should not be safe`);
      }
    });
  });
});
