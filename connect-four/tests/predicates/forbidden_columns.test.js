// Integration test for forbidden_columns predicate.
// A column is forbidden if: Red plays there (without winning), and Yellow plays
// in that same column one row above and wins.
//
// Positive fixture: "111111222222343343"
//   Cols 0 and 1 are fully stacked (R/Y alternating). Col 2 (0-indexed) has 4 discs.
//   Col 3 (0-indexed) has height 2 with Yellow at row 0, Red at row 1.
//   If Red plays col 4 (1-indexed / col 3 0-indexed) at row 2, Yellow plays row 3 and
//   completes a winning line through col 3. Cols 2,4,5,6 (0-indexed) are safe.
//
// Negative fixture: "44"
//   Early game — no forbidden columns exist.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePredicate } from '../../server/predicates.js';

const FORBIDDEN_COL = 3;   // 0-indexed (col 4 in 1-indexed notation)
const SAFE_COL = 4;         // 0-indexed (col 5 in 1-indexed notation)

describe('forbidden_columns — positive fixture ("111111222222343343")', () => {
  const MOVE_STRING = '111111222222343343';
  const puzzle = { id: 1, category: 'forbidden_columns', moveString: MOVE_STRING };

  test('playing the forbidden column returns wrong with forbiddenCols populated', () => {
    const result = evaluatePredicate(puzzle, FORBIDDEN_COL, []);
    assert.equal(result.result, 'wrong');
    assert.ok(result.forbiddenCols.length >= 1, 'at least one forbidden column must exist');
    assert.ok(result.forbiddenCols.includes(FORBIDDEN_COL), `col ${FORBIDDEN_COL} must be in forbiddenCols`);
  });

  test('playing a safe column returns correct', () => {
    const result = evaluatePredicate(puzzle, SAFE_COL, []);
    assert.equal(result.result, 'correct');
    assert.ok(!result.forbiddenCols.includes(SAFE_COL), `safe col ${SAFE_COL} must not be in forbiddenCols`);
  });

  test('forbiddenCols contains exactly col 3 (0-indexed)', () => {
    const result = evaluatePredicate(puzzle, SAFE_COL, []);
    assert.deepEqual(result.forbiddenCols, [FORBIDDEN_COL]);
  });
});

describe('forbidden_columns — negative fixture ("44")', () => {
  const MOVE_STRING = '44';
  const puzzle = { id: 2, category: 'forbidden_columns', moveString: MOVE_STRING };

  test('no forbidden columns exist — any play returns wrong', () => {
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'wrong');
    assert.deepEqual(result.forbiddenCols, []);
  });
});
