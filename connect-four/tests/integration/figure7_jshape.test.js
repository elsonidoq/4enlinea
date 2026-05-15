// T019 — Figure-7 and J-Shape integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectFigure7, detectJShape } from '../../server/classifier.js';
import { checkFigure7Predicate, checkJShapePredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectJShape — structural and solver validation', () => {
  // Position '344332' (6 moves, P1 to move):
  // P1 (player 1) pieces: col2 r0 (move '3'), col2 r2 (move '3' again), col3 r1 (move '4')
  //   Move sequence: 3=col2, 4=col3, 4=col3, 3=col2, 3=col2, 2=col1
  // After '344332': heights = [0,1,3,2,0,0,0]  (0-indexed cols)
  //   P1 at: col2 r0 (move0), col3 r1 (move2), col2 r2 (move4)
  //   P2 at: col3 r0 (move1), col2 r1 (move3... wait, col2 height is already 1), col1 r0 (move5)
  // Canonical j_shape: placed={col:c,row:r},{col:c,row:r+2},{col:c+1,row:r+1} completing=(c+1,r+2)
  // With c=2,r=0: placed={(2,0),(2,2),(3,1)}, completing=(3,2)
  // At '344332': col2 heights = 3 (moves at r0,r1,r2), so col2 has r2 occupied
  // Let's test a cleaner position: P1 needs (2,0),(2,2),(3,1) with (3,2) playable at height

  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectJShape(ms, scores);
    assert.equal(result.matched, false, 'empty board has no j_shape');
  }, { timeout: 10_000 });

  test('when detectJShape fires, highlightMetadata is structurally valid', async () => {
    // Try several mid-game positions to find one where j_shape fires
    const positions = ['344332', '12345677654321', '441133'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectJShape(ms, scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 3, 'j_shape has 3 placed cells');
        for (const cell of hm.cells) {
          assert.ok(typeof cell.column === 'number' && cell.column >= 0 && cell.column <= 6);
          assert.ok(typeof cell.row === 'number' && cell.row >= 0 && cell.row <= 5);
          assert.equal(cell.role, 'pattern_piece');
        }
        assert.ok(typeof result.correctCol === 'number' && result.correctCol >= 0 && result.correctCol <= 6);
        assert.ok(scores[result.correctCol] > 0, 'correctCol must have positive solver score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('detectFigure7 — structural and solver validation', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectFigure7(ms, scores);
    assert.equal(result.matched, false, 'empty board has no figure_7');
  }, { timeout: 10_000 });

  test('when detectFigure7 fires, highlightMetadata is structurally valid', async () => {
    const positions = ['12345677654321', '765432176543', '441133'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectFigure7(ms, scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 4, 'figure_7 has 4 placed cells');
        for (const cell of hm.cells) {
          assert.ok(typeof cell.column === 'number' && cell.column >= 0 && cell.column <= 6);
          assert.ok(typeof cell.row === 'number' && cell.row >= 0 && cell.row <= 5);
          assert.equal(cell.role, 'pattern_piece');
        }
        assert.ok(typeof result.correctCol === 'number' && result.correctCol >= 0 && result.correctCol <= 6);
        assert.ok(scores[result.correctCol] > 0, 'correctCol must have positive solver score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkFigure7Predicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkFigure7Predicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const positions = ['12345677654321', '765432176543', '441133'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = checkFigure7Predicate(ms, scores);
      if (result.passes) {
        assert.ok(typeof result.correct_col === 'number');
        assert.ok(result.correctCols.includes(result.correct_col));
        assert.equal(result.highlight_metadata.type, 'cells');
        assert.equal(result.highlight_metadata.cells.length, 4);
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkJShapePredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkJShapePredicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });
});

describe('evalFigure7 — from correctCol', () => {
  test('correct col returns correct', () => {
    const puzzle = {
      id: 99, category: 'figure_7', moveString: '12345677654321',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 2, row: 0, role: 'pattern_piece' },
          { column: 3, row: 1, role: 'pattern_piece' },
          { column: 4, row: 2, role: 'pattern_piece' },
          { column: 5, row: 2, role: 'pattern_piece' },
        ],
      },
      correctCol: 6,
    };
    const result = evaluatePredicate(puzzle, 6, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 6);
  });

  test('wrong col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'figure_7', moveString: '12345677654321',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 2, row: 0, role: 'pattern_piece' },
          { column: 3, row: 1, role: 'pattern_piece' },
          { column: 4, row: 2, role: 'pattern_piece' },
          { column: 5, row: 2, role: 'pattern_piece' },
        ],
      },
      correctCol: 6,
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 6);
  });

  test('missing correctCol returns wrong', () => {
    const puzzle = {
      id: 99, category: 'figure_7', moveString: '12345677654321',
      highlightMetadata: null,
    };
    const result = evaluatePredicate(puzzle, 6, []);
    assert.equal(result.result, 'wrong');
  });
});

describe('evalJShape — from correctCol', () => {
  test('correct col returns correct', () => {
    const puzzle = {
      id: 99, category: 'j_shape', moveString: '4433441133',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 0, role: 'pattern_piece' },
          { column: 3, row: 2, role: 'pattern_piece' },
          { column: 4, row: 1, role: 'pattern_piece' },
        ],
      },
      correctCol: 4,
    };
    const result = evaluatePredicate(puzzle, 4, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 4);
  });

  test('wrong col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'j_shape', moveString: '4433441133',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 0, role: 'pattern_piece' },
          { column: 3, row: 2, role: 'pattern_piece' },
          { column: 4, row: 1, role: 'pattern_piece' },
        ],
      },
      correctCol: 4,
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 4);
  });
});
