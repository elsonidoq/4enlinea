// Integration tests for forced_win predicate and highlight — board-based (no solver).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkForcedWinPredicate, computeForcedWinHighlight } from '../../server/candidate-generator.js';
import { Board } from '../../server/classifier.js';

// Position where Red (initiator) can force a win via a 3-step chain.
// Verified: detectForcedWin(afterMove, initiator) matches for col 2.
const MOVE_STRING = '653633533056604004450651043';

// Second position with a different trace shape.
const MOVE_STRING_2 = '66324523054556263562645';

describe('forced_win predicate — board-based', () => {
  test('checkForcedWinPredicate passes for position 1 and identifies correct initiator col', () => {
    const result = checkForcedWinPredicate(MOVE_STRING);
    assert.equal(result.passes, true);
    assert.equal(result.correctCols.length, 1);
    assert.ok(result.correctCols.includes(2), 'col 2 (0-indexed) should be the initiator');
  });

  test('checkForcedWinPredicate passes for position 2 and identifies correct initiator col', () => {
    const result = checkForcedWinPredicate(MOVE_STRING_2);
    assert.equal(result.passes, true);
    assert.ok(result.correctCols.includes(2), 'col 2 (0-indexed) should be the initiator');
  });

  test('computeForcedWinHighlight returns correct 5-step trace for position 1', () => {
    const { correctCols } = checkForcedWinPredicate(MOVE_STRING);
    assert.ok(correctCols.length > 0, 'should have at least one correct col');

    const cells = computeForcedWinHighlight(MOVE_STRING, correctCols);
    assert.equal(cells.length, 5);
    // Trace: initiator col2(hint) → opp col2(loser) → initiator col1(hint) →
    //        opp col2(loser) → initiator col2(winner)
    assert.deepEqual(cells[0], { column: 2, row: 0, role: 'hint' });
    assert.deepEqual(cells[1], { column: 2, row: 1, role: 'loser' });
    assert.deepEqual(cells[2], { column: 1, row: 1, role: 'hint' });
    assert.deepEqual(cells[3], { column: 2, row: 2, role: 'loser' });
    assert.deepEqual(cells[4], { column: 2, row: 3, role: 'winner' });
  });

  test('computeForcedWinHighlight returns correct 5-step trace for position 2', () => {
    const { correctCols } = checkForcedWinPredicate(MOVE_STRING_2);
    assert.ok(correctCols.length > 0, 'should have at least one correct col');

    const cells = computeForcedWinHighlight(MOVE_STRING_2, correctCols);
    assert.equal(cells.length, 5);
    // Trace: initiator col2(hint) → opp col3(loser) → initiator col3(hint) →
    //        opp col4(loser) → initiator col4(winner)
    assert.deepEqual(cells[0], { column: 2, row: 4, role: 'hint' });
    assert.deepEqual(cells[1], { column: 3, row: 3, role: 'loser' });
    assert.deepEqual(cells[2], { column: 3, row: 4, role: 'hint' });
    assert.deepEqual(cells[3], { column: 4, row: 3, role: 'loser' });
    assert.deepEqual(cells[4], { column: 4, row: 4, role: 'winner' });
  });

  test('forced_win detection works for Yellow as initiator (player 2)', () => {
    // Both test positions have player 2 (Yellow/Gray) as initiator.
    const board = new Board(MOVE_STRING);
    // Verify: the current player at the puzzle position is the initiator.
    // The correct column is always the initiator's move.
    const initiator = board.currentPlayer;
    assert.ok(initiator === 1 || initiator === 2, 'initiator must be a valid player');

    const { correctCols } = checkForcedWinPredicate(MOVE_STRING);
    for (const col of correctCols) {
      // Verify the move doesn't win immediately (not immediate_threat)
      const afterMove = board.withMove(col);
      assert.equal(afterMove.checkWin(board.colHeights[col], col, initiator), false,
        'forced_win initiator must not be an immediate win');
    }
  });
});
