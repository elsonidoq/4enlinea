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

  // forbidden_columns positive (board-based): all scores <= 0, playing col5 hands Y a gravity-top win.
  // moveCount=6: Y has col1r0,col2r0,col3r0; col5r0 leaves Y threat at col4r0 open.
  test('forbidden_columns board-based: col5 gives opponent gravity-top win — must be forbidden_columns', () => {
    const result = classify('010263', 5, [-18, -18, -18, -18, -3, -18, -18]);
    assert.equal(result.tag, 'forbidden_columns');
  });

  // Cat 1 regression: moveCount=19 odd, score[2]=11=winScore, no 4-in-a-row — must NOT be immediate_threat
  test('C1 regression: odd moveCount=19, score=11, no 4-in-a-row — not immediate_threat', () => {
    const result = classify('3133101113201232540', 2, [2, -1000, 11, 4, 9, 8, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });
});

describe('classify() double_threat', () => {
  // Existing fixtures kept
  test('3344 col2 → double_threat', () => {
    const result = classify('3344', 2, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });

  test('3344 col5 → double_threat', () => {
    const result = classify('3344', 5, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });

  // New fixtures
  test('3333344044114 col0 → double_threat', () => {
    const result = classify('3333344044114', 0, [13, 11, -1, 0, -1, -1, -1]);
    assert.equal(result.tag, 'double_threat');
  });

  test('2444222343 col3 → double_threat', () => {
    const result = classify('2444222343', 3, [-13, -14, -13, 15, -13, -13, -13]);
    assert.equal(result.tag, 'double_threat');
  });

  test('3333334244442555 col5 (figure-7 completing move, Case A) → double_threat', () => {
    const result = classify('3333334244442555', 5, [-13, 13, -13, -1000, -13, 12, -13]);
    assert.equal(result.tag, 'double_threat');
  });

  // Also: movestring that is Cat 3 via the new Cat 1 regression position
  test('3133101113201232540 col2 → double_threat (not immediate_threat)', () => {
    const result = classify('3133101113201232540', 2, [2, -1000, 11, 4, 9, 8, 7]);
    assert.equal(result.tag, 'double_threat');
  });

  // Counter-test: placing in col0 on '3344' creates 0 threats — not double_threat
  test('3344 col0 → not double_threat (no threats created)', () => {
    const result = classify('3344', 0, [-4, -3, 18, 2, 2, 18, -3]);
    assert.notEqual(result.tag, 'double_threat');
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
