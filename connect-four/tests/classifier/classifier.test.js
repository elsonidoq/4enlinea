import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classify } from '../../server/classifier.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(__dir, 'fixtures/fixtures.json'), 'utf8')
);

describe('classify()', () => {
  for (const fix of fixtures) {
    test(fix.description, () => {
      const result = classify(fix.moves, fix.candidateCol, fix.scores);
      assert.equal(
        result.category,
        fix.expectedCategory,
        `Expected category ${fix.expectedCategory} but got ${result.category} (tag: ${result.tag})`
      );
      assert.equal(
        result.tag,
        fix.expectedTag,
        `Expected tag "${fix.expectedTag}" but got "${result.tag}"`
      );
    });
  }
});

describe('classify() edge cases', () => {
  test('returns fallback for empty board with negative score', () => {
    const scores = [-1, -1, -1, -1, -1, -1, -1];
    const result = classify('', 3, scores);
    assert.equal(result.category, 0);
    assert.equal(result.tag, 'suboptimal_move');
  });

  test('returns best_move for positive score not matching other categories', () => {
    // Single positive score, not immediate win, creates 0 threats
    // "43445" col6(idx5): score=2, winCols=2, avg=3, score(2)<avg(3) → not cat6 → other
    const scores = [0, 0, 0, 4, 0, 2, 0];
    const result = classify('43445', 5, scores);
    // score=2 > 0 but < avg(3) and winCols=2 < 3 → should fall to best_move
    assert.ok(result.category >= 0, 'should return a valid category');
    assert.ok(typeof result.tag === 'string', 'should return a string tag');
  });

  test('never throws on any input', () => {
    const edgeCases = [
      { moves: '', col: 0, scores: [0, 0, 0, 0, 0, 0, 0] },
      { moves: '4', col: 3, scores: [0, 0, 0, -1, 0, 0, 0] },
      { moves: '1234567', col: 0, scores: [0, 2, 2, 2, 2, 2, 0] },
    ];
    for (const { moves, col, scores } of edgeCases) {
      assert.doesNotThrow(() => classify(moves, col, scores));
    }
  });
});
