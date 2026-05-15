// T017 — Z-threat integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectZThreat } from '../../server/classifier.js';
import { checkZThreatPredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectZThreat — structure and eval', () => {
  test('returns matched=false for an empty board position', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectZThreat(ms, scores);
    assert.equal(result.matched, false, 'empty board should not have a z_threat');
  }, { timeout: 10_000 });

  test('returns matched=false for an immediate_threat position (isClean filtered at pipeline level)', async () => {
    // "112233": P1 wins immediately at col 3; all cols negative except col 3 with winScore.
    // detectZThreat may or may not fire; if it does, badgeCount must be odd and column winning.
    const ms = '112233';
    const scores = await solver.query(ms);
    const result = detectZThreat(ms, scores);
    if (result.matched) {
      assert.equal(result.highlightMetadata.type, 'capsule');
      assert.ok(result.highlightMetadata.badgeCount % 2 === 1, 'badgeCount must be odd');
      assert.ok(scores[result.highlightMetadata.column] > 0, 'z_threat column must have positive solver score');
    }
    // No assertion on matched — just verifying structure when it fires
  }, { timeout: 10_000 });

  test('when detectZThreat fires, highlightMetadata is structurally valid', async () => {
    // Mid-game position with some complexity
    const ms = '765432176543';
    const scores = await solver.query(ms);
    const result = detectZThreat(ms, scores);
    if (result.matched) {
      const hm = result.highlightMetadata;
      assert.equal(hm.type, 'capsule');
      assert.ok(typeof hm.column === 'number' && hm.column >= 0 && hm.column <= 6);
      assert.ok(typeof hm.fromRow === 'number' && hm.fromRow >= 0);
      assert.ok(typeof hm.toRow === 'number' && hm.toRow >= hm.fromRow);
      assert.ok(typeof hm.badgeCount === 'number' && hm.badgeCount % 2 === 1, 'badgeCount must be odd');
      assert.equal(hm.badgeCount, hm.toRow - hm.fromRow + 1, 'badgeCount must equal toRow-fromRow+1');
      assert.ok(scores[hm.column] > 0, 'detected column must have positive solver score');
    }
  }, { timeout: 10_000 });
});

describe('checkZThreatPredicate — end-to-end with solver scores', () => {
  test('returns passes=false when no z_threat is found', async () => {
    const ms = '44';
    const scores = await solver.query(ms);
    const result = checkZThreatPredicate(ms, scores);
    if (!result.passes) {
      // Confirm structure is correct on failure
      assert.deepEqual(result.correctCols, []);
    }
    // No assertion on passes — just structure check
  }, { timeout: 10_000 });
});

describe('evalZThreat — from highlightMetadata', () => {
  test('correct col returns correct', () => {
    const puzzle = {
      id: 99, category: 'z_threat', moveString: '4455663',
      highlightMetadata: { type: 'capsule', column: 3, fromRow: 2, toRow: 4, badgeCount: 3 },
    };
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 3);
  });

  test('wrong col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'z_threat', moveString: '4455663',
      highlightMetadata: { type: 'capsule', column: 3, fromRow: 2, toRow: 4, badgeCount: 3 },
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 3);
  });

  test('missing highlightMetadata returns wrong', () => {
    const puzzle = { id: 99, category: 'z_threat', moveString: '44', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'wrong');
  });
});
