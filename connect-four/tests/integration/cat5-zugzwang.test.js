// Integration tests for Cat 5 (Zugzwang) predicate and highlight — uses real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { checkCat5Predicate, computeCat5Highlight } from '../../server/candidate-generator.js';

// Case 1: confirmed false-positive from the annotated rejection set.
// Sequence: initiator col3 → forced col3 → initiator col3 → forced col2 → wins col2.
const MOVE_STRING = '764744644167715115561762154';

// Case 2: starts well but misses the end.
// Expected sequence (1-indexed): 3, 4, 4, 5, 5
const MOVE_STRING_2 = '77435634165667374673756';

let solver;

before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('Cat 5 predicate — case 2: correct 5-step sequence [3,4,4,5,5]', () => {
  test('checkCat5Predicate passes and identifies col 3 (1-indexed) as the sole initiating move', async () => {
    const result = await checkCat5Predicate(MOVE_STRING_2, solver);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [2]); // 0-indexed col 2 = 1-indexed col 3
  }, { timeout: 30_000 });

  test('computeCat5Highlight returns the correct 5-step forced sequence [3,4,4,5,5]', async () => {
    const { correctCols } = await checkCat5Predicate(MOVE_STRING_2, solver);
    const cells = await computeCat5Highlight(solver, MOVE_STRING_2, correctCols);

    // Expected (1-indexed): 3(hint) → 4(loser) → 4(hint) → 5(loser) → 5(winner)
    assert.equal(cells.length, 5);
    assert.equal(cells[0].col, 2); assert.equal(cells[0].role, 'hint');   // col 3
    assert.equal(cells[1].col, 3); assert.equal(cells[1].role, 'loser');  // col 4 forced
    assert.equal(cells[2].col, 3); assert.equal(cells[2].role, 'hint');   // col 4
    assert.equal(cells[3].col, 4); assert.equal(cells[3].role, 'loser');  // col 5 forced
    assert.equal(cells[4].col, 4); assert.equal(cells[4].role, 'winner'); // col 5 wins
  }, { timeout: 30_000 });
});

describe('Cat 5 predicate — zugzwang trace fix (>= oiw1 threshold)', () => {
  test('checkCat5Predicate passes and identifies col 3 (1-indexed) as the sole initiating move', async () => {
    const result = await checkCat5Predicate(MOVE_STRING, solver);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [2]); // 0-indexed col 2 = 1-indexed col 3
  }, { timeout: 30_000 });

  test('computeCat5Highlight returns the correct 5-step forced sequence', async () => {
    const { correctCols } = await checkCat5Predicate(MOVE_STRING, solver);
    const cells = await computeCat5Highlight(solver, MOVE_STRING, correctCols);

    // Expected: Red col3 (hint) → Yellow col3 (loser) → Red col3 (hint) → Yellow col2 (loser) → Red col2 (winner)
    assert.equal(cells.length, 5);
    assert.deepEqual(cells[0], { col: 2, row: 0, role: 'hint' });   // Red plays col 3
    assert.deepEqual(cells[1], { col: 2, row: 1, role: 'loser' });  // Yellow forced col 3
    assert.deepEqual(cells[2], { col: 2, row: 2, role: 'hint' });   // Red plays col 3 again
    assert.deepEqual(cells[3], { col: 1, row: 1, role: 'loser' });  // Yellow forced col 2
    assert.deepEqual(cells[4], { col: 1, row: 2, role: 'winner' }); // Red wins col 2
  }, { timeout: 30_000 });
});
