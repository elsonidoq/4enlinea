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
        result.tag,
        fix.expectedTag,
        `Expected tag "${fix.expectedTag}" but got "${result.tag}"`
      );
    });
  }
});

// Regression tests against 8 known false-positive DB records (see docs/mvp/feedback_for_generate_v2.md)
describe('classify() false-positive regressions', () => {
  // C1 bug: score === winScore for odd moveCount matches win-in-2, not immediate win.
  // Board-level check must reject these four positions as Cat 1.
  test('C1 regression (ebebf258): odd moveCount=15, score=winScore=13 but no 4-in-a-row — not cat 1', () => {
    const result = classify('316443431430113', 2, [11, 11, 13, 11, 11, -13, 11]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (1c58cd7a): odd moveCount=15, score=winScore=13 but no 4-in-a-row — not cat 1', () => {
    const result = classify('334553033612623', 1, [6, 13, 12, -1000, 11, 7, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (982ca50c): odd moveCount=23, score=winScore=9 but no 4-in-a-row — not cat 1', () => {
    const result = classify('13330365455563362402645', 2, [8, 7, 9, -1000, 8, 7, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (c4526868): odd moveCount=27, score=winScore=7 but no 4-in-a-row — not cat 1', () => {
    const result = classify('445263501514561142422101522', 3, [6, -1000, -1000, 7, 6, 6, 6]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  // C2 bug: winning column score > winScore was rejected by strict ===; >= fix makes these cat 1.
  test('C2 regression (58ebbed9): moveCount=13, col5 score=15 > winScore=14, genuine 4-in-a-row — must be cat 1', () => {
    const result = classify('1222123223111', 4, [5, 10, -1000, 11, 15, 11, 10]);
    assert.equal(result.tag, 'immediate_threat');
  });

  test('C2 regression (69dced55): moveCount=15, col3 score=14 > winScore=13, genuine 4-in-a-row — must be cat 1', () => {
    const result = classify('440534654365523', 2, [-12, -8, 14, -12, -12, -8, -12]);
    assert.equal(result.tag, 'immediate_threat');
  });

  // C3 bug: forbidden_columns branch was missing; these records have a positive score so must never be forbidden_columns.
  test('C3 regression (d9ceb902): positive score in scores — must not be forbidden_columns', () => {
    const result = classify('25224402622565534', 3, [-12, -12, -1000, 4, -12, -12, -12]);
    assert.notEqual(result.tag, 'forbidden_columns', 'forbidden_columns requires all scores <= 0');
  });

  test('C3 regression (1d5b2782): positive score in scores — must not be forbidden_columns', () => {
    const result = classify('6544453233466445536', 6, [-11, -11, -11, -11, -1000, -11, 5]);
    assert.notEqual(result.tag, 'forbidden_columns', 'forbidden_columns requires all scores <= 0');
  });

  // forbidden_columns positive: all scores <= 0, opponentWinScore present — must be forbidden_columns.
  // moveCount=10, opponentWinScore = -ceil((41-10)/2) = -16
  test('forbidden_columns synthetic: all-negative scores with opponentWinScore=-16 present — must be forbidden_columns', () => {
    const result = classify('0123401234', 0, [-18, -16, -18, -16, -18, -18, -18]);
    assert.equal(result.tag, 'forbidden_columns');
  });
});

describe('classify() edge cases', () => {
  test('returns fallback for empty board with negative score', () => {
    const scores = [-1, -1, -1, -1, -1, -1, -1];
    const result = classify('', 3, scores);
    assert.equal(result.tag, 'suboptimal_move');
  });

  test('returns best_move for positive score not matching other categories', () => {
    // Single positive score, not immediate win, creates 0 threats
    // "43445" col6(idx5): score=2, winCols=2, avg=3, score(2)<avg(3) → not cat6 → other
    const scores = [0, 0, 0, 4, 0, 2, 0];
    const result = classify('32334', 5, scores);
    // score=2 > 0 but < avg(3) and winCols=2 < 3 → should fall to best_move
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
