// T036 — Undercut and Overcut integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectUndercut, detectOvercut } from '../../server/classifier.js';
import { checkUndercutPredicate, checkOvercutPredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectUndercut — structure and eval', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectUndercut(ms, scores);
    assert.equal(result.matched, false, 'empty board has no undercut');
  }, { timeout: 10_000 });

  test('when detectUndercut fires, highlightMetadata is structurally valid', async () => {
    const positions = ['765432176543', '12345671234567', '44554433'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectUndercut(ms, scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 2, 'undercut has exactly 2 highlight cells');

        const killing = hm.cells.find(c => c.role === 'killing_threat');
        const dead = hm.cells.find(c => c.role === 'dead_threat');
        assert.ok(killing, 'must have killing_threat cell');
        assert.ok(dead, 'must have dead_threat cell');
        assert.equal(killing.column, dead.column, 'both cells must be in same column');
        assert.ok(killing.row < dead.row, 'killing_threat row must be below dead_threat row');

        // undercut column must have negative solver score (playing there is losing)
        assert.ok(scores[killing.column] < 0, 'undercut column must have negative score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('detectOvercut — structure and eval', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectOvercut(ms, scores);
    assert.equal(result.matched, false, 'empty board has no overcut');
  }, { timeout: 10_000 });

  test('when detectOvercut fires, highlightMetadata is structurally valid', async () => {
    const positions = ['765432176543', '12345671234567', '44554433'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectOvercut(ms, scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 2, 'overcut has exactly 2 highlight cells');

        const neutralised = hm.cells.find(c => c.role === 'neutralised_threat');
        const major = hm.cells.find(c => c.role === 'major_threat');
        assert.ok(neutralised, 'must have neutralised_threat cell');
        assert.ok(major, 'must have major_threat cell');
        assert.equal(neutralised.column, major.column, 'both cells must be in same column');
        assert.ok(neutralised.row < major.row, 'neutralised_threat row must be below major_threat row');

        // overcut column must have positive solver score (playing there is winning)
        assert.ok(scores[major.column] > 0, 'overcut column must have positive score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkUndercutPredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkUndercutPredicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const positions = ['765432176543', '12345671234567', '44554433'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = checkUndercutPredicate(ms, scores);
      if (result.passes) {
        assert.ok(result.correctCols.length >= 1, 'must have at least one correct col');
        assert.equal(result.correct_col, null, 'correct_col must be null for undercut');
        assert.equal(result.highlight_metadata.type, 'cells');
        const killing = result.highlight_metadata.cells.find(c => c.role === 'killing_threat');
        assert.ok(killing, 'must have killing_threat in highlight_metadata');
        assert.ok(!result.correctCols.includes(killing.column), 'killing_threat col must not be in correctCols');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkOvercutPredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkOvercutPredicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const positions = ['765432176543', '12345671234567', '44554433'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = checkOvercutPredicate(ms, scores);
      if (result.passes) {
        assert.ok(result.correctCols.length >= 1);
        assert.equal(result.correct_col, null, 'correct_col must be null for overcut');
        assert.equal(result.highlight_metadata.type, 'cells');
        const major = result.highlight_metadata.cells.find(c => c.role === 'major_threat');
        assert.ok(major, 'must have major_threat in highlight_metadata');
        assert.ok(result.correctCols.includes(major.column), 'major_threat col must be in correctCols');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('evalUndercut — from highlightMetadata', () => {
  test('non-killing col returns correct', () => {
    const puzzle = {
      id: 99, category: 'undercut', moveString: '445566332211',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 2, role: 'killing_threat' },
          { column: 3, row: 4, role: 'dead_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'correct');
  });

  test('killing col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'undercut', moveString: '445566332211',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 2, role: 'killing_threat' },
          { column: 3, row: 4, role: 'dead_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'wrong');
  });

  test('missing highlightMetadata returns wrong', () => {
    const puzzle = { id: 99, category: 'undercut', moveString: '445566332211', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
  });
});

describe('evalOvercut — from highlightMetadata', () => {
  test('major_threat col returns correct', () => {
    const puzzle = {
      id: 99, category: 'overcut', moveString: '44556633221144',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 4, row: 1, role: 'neutralised_threat' },
          { column: 4, row: 3, role: 'major_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 4, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 4);
  });

  test('non-major col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'overcut', moveString: '44556633221144',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 4, row: 1, role: 'neutralised_threat' },
          { column: 4, row: 3, role: 'major_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 4);
  });

  test('missing highlightMetadata returns wrong', () => {
    const puzzle = { id: 99, category: 'overcut', moveString: '44556633221144', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 4, []);
    assert.equal(result.result, 'wrong');
  });
});
