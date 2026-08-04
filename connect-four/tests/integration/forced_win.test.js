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

// ---------------------------------------------------------------------------
// OI-83 follow-up (spec 057, 2026-08-04): a board where 2+ columns each independently
// initiate a forced win must PASS, not be rejected as ambiguous.
//
// `checkForcedWinPredicate` used to end with `passes: correctCols.length === 1`, discarding
// every multi-initiator position at generation time — the low match rate seen while refilling
// the category. The generic `checkPredicate` in the same file already had this fixed
// (`passes: correctCols.length >= 1`) with a comment explaining why; forced_win was the one
// path that never got it.
//
// Nothing downstream ever required uniqueness: `evalForcedWin` (server/predicates.js) already
// returns `{ result: 'tied', tiedWith }` for these boards, and `'tied'` is an acceptance at
// every consumer (answerSetInvariant.js:46, evaluateMoveHandler.js:252, index.js:2471/:3215).
//
// Fixture harvested by scanning playGame-style random legal games for a real multi-initiator
// position (never hand-constructed — CLAUDE.md's movestring rule), then verified with
// `./visualize_board.sh 42142140516015`: move 14, Green to play, `scr` row 10/2/13/14/12/12/11.
// Column 4 (1-indexed) carries a gravity-top immediate win and is correctly EXCLUDED as
// immediate_threat; 0-indexed columns 4 and 5 each initiate a genuine forced-win chain.
// ---------------------------------------------------------------------------
const MULTI_INITIATOR_MS = '42142140516015';

test('checkForcedWinPredicate accepts a board with MULTIPLE forced-win initiators (OI-83)', () => {
  const { passes, correctCols } = checkForcedWinPredicate(MULTI_INITIATOR_MS);
  assert.ok(correctCols.length > 1,
    `fixture must be genuinely multi-initiator, got ${JSON.stringify(correctCols)}`);
  assert.deepEqual(correctCols, [4, 5]);
  assert.equal(passes, true,
    'a multi-initiator forced-win board must NOT be rejected as ambiguous — this is the OI-83 regression');
});

test('checkForcedWinPredicate returns EVERY initiator, not just the first (OI-83)', () => {
  // The answer set served for the board must be complete: a player picking either valid
  // initiator has to grade correct, which requires both columns present in correct_cols.
  const { correctCols } = checkForcedWinPredicate(MULTI_INITIATOR_MS);
  assert.ok(correctCols.includes(4) && correctCols.includes(5),
    'both valid initiators must appear in the answer set, or one of them grades a correct answer wrong');
});
