// Integration tests for forced_win predicate and highlight — uses real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { checkForcedWinPredicate, computeForcedWinHighlight } from '../../server/candidate-generator.js';

// Case 1: confirmed false-positive from the annotated rejection set.
// Sequence: initiator col3 → forced col3 → initiator col3 → forced col2 → wins col2.
const MOVE_STRING = '653633533056604004450651043';

// Case 2: starts well but misses the end.
// Expected sequence (0-indexed): 2, 3, 3, 4, 4
const MOVE_STRING_2 = '66324523054556263562645';

let solver;

before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('forced_win predicate — case 2: correct 5-step sequence [2,3,3,4,4]', () => {
  test('checkForcedWinPredicate passes and identifies col 2 (0-indexed) as the sole initiating move', async () => {
    const result = await checkForcedWinPredicate(MOVE_STRING_2, solver);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [2]); // 0-indexed col 2 = 1-indexed col 3
  }, { timeout: 30_000 });

  test('computeForcedWinHighlight returns the correct 5-step forced sequence [3,4,4,5,5]', async () => {
    const { correctCols } = await checkForcedWinPredicate(MOVE_STRING_2, solver);
    const cells = await computeForcedWinHighlight(solver, MOVE_STRING_2, correctCols);

    // Expected (0-indexed): 2(hint) → 3(loser) → 3(hint) → 4(loser) → 4(winner)
    assert.equal(cells.length, 5);
    assert.equal(cells[0].column, 2); assert.equal(cells[0].role, 'hint');   // col 3
    assert.equal(cells[1].column, 3); assert.equal(cells[1].role, 'loser');  // col 4 forced
    assert.equal(cells[2].column, 3); assert.equal(cells[2].role, 'hint');   // col 4
    assert.equal(cells[3].column, 4); assert.equal(cells[3].role, 'loser');  // col 5 forced
    assert.equal(cells[4].column, 4); assert.equal(cells[4].role, 'winner'); // col 5 wins
  }, { timeout: 30_000 });
});

describe('forced_win predicate — trace fix (>= oiw1 threshold)', () => {
  test('checkForcedWinPredicate passes and identifies col 2 (0-indexed) as the sole initiating move', async () => {
    const result = await checkForcedWinPredicate(MOVE_STRING, solver);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [2]);
  }, { timeout: 30_000 });

  test('computeForcedWinHighlight returns the correct 5-step forced sequence', async () => {
    const { correctCols } = await checkForcedWinPredicate(MOVE_STRING, solver);
    const cells = await computeForcedWinHighlight(solver, MOVE_STRING, correctCols);

    // Expected: Red col3 (hint) → Yellow col3 (loser) → Red col3 (hint) → Yellow col2 (loser) → Red col2 (winner)
    assert.equal(cells.length, 5);
    assert.deepEqual(cells[0], { column: 2, row: 0, role: 'hint' });   // Red plays col 3
    assert.deepEqual(cells[1], { column: 2, row: 1, role: 'loser' });  // Yellow forced col 3
    assert.deepEqual(cells[2], { column: 2, row: 2, role: 'hint' });   // Red plays col 3 again
    assert.deepEqual(cells[3], { column: 1, row: 1, role: 'loser' });  // Yellow forced col 2
    assert.deepEqual(cells[4], { column: 1, row: 2, role: 'winner' }); // Red wins col 2
  }, { timeout: 30_000 });
});
