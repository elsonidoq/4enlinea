import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluatePredicate } from '../../server/predicates.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(__dir, 'fixtures/fixtures.json'), 'utf8')
);

describe('evaluatePredicate()', () => {
  for (const fix of fixtures) {
    test(fix.description, () => {
      const result = evaluatePredicate(fix.puzzle, fix.candidateCol, fix.scores);
      assert.equal(
        result.result,
        fix.expectedResult,
        `Expected result "${fix.expectedResult}" but got "${result.result}" (correctCol: ${result.correctCol})`
      );
    });
  }
});

describe('evaluatePredicate() edge cases', () => {
  test('returns wrong for unknown category', () => {
    const puzzle = { id: 99, category: 99, moveString: '44', goalPredicateType: 'unknown' };
    const result = evaluatePredicate(puzzle, 3, [0, 0, 0, 5, 0, 0, 0]);
    assert.equal(result.result, 'wrong');
  });

  test('cat 1 returns correctCol when result is wrong', () => {
    const puzzle = { id: 1, category: 'immediate_threat', moveString: '112233', goalPredicateType: 'immediate_win' };
    const result = evaluatePredicate(puzzle, 0, [-2, -1, -1, 18, -2, -2, -3]);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 3);
  });

  test('cat 5 handles all-equal negative scores as tied', () => {
    const puzzle = { id: 5, category: 'zugzwang', moveString: '44444', goalPredicateType: 'zugzwang' };
    const scores = [-1, -1, -1, -1, -1, -1, -1];
    const result = evaluatePredicate(puzzle, 0, scores);
    // All equal: any move is "correct" (tied)
    assert.ok(result.result === 'correct' || result.result === 'tied');
  });
});
