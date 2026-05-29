// T019 — Figure-7 and J-Shape integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectFigure7, detectJShape, Board } from '../../server/classifier.js';
import { checkFigure7Predicate, checkJShapePredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectJShape — structural and solver validation', () => {
  // Position '233221' (6 moves, P1 to move):
  // P1 (player 1) pieces: col2 r0 (move '2'), col2 r2 (move '2' again), col3 r1 (move '3')
  //   Move sequence: 3=col2, 4=col3, 4=col3, 3=col2, 3=col2, 2=col1
  // After '233221': heights = [0,1,3,2,0,0,0]  (0-indexed cols)
  //   P1 at: col2 r0 (move0), col3 r1 (move2), col2 r2 (move4)
  //   P2 at: col3 r0 (move1), col2 r1 (move3... wait, col2 height is already 1), col1 r0 (move5)
  // Canonical j_shape: placed={col:c,row:r},{col:c,row:r+2},{col:c+1,row:r+1} completing=(c+1,r+2)
  // With c=2,r=0: placed={(2,0),(2,2),(3,1)}, completing=(3,2)
  // At '233221': col2 heights = 3 (moves at r0,r1,r2), so col2 has r2 occupied
  // Let's test a cleaner position: P1 needs (2,0),(2,2),(3,1) with (3,2) playable at height

  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectJShape(new Board(ms), scores);
    assert.equal(result.matched, false, 'empty board has no j_shape');
  }, { timeout: 10_000 });

  test('when detectJShape fires, highlightMetadata is structurally valid', async () => {
    // Try several mid-game positions to find one where j_shape fires
    const positions = ['233221', '01234566543210', '330022'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectJShape(new Board(ms), scores);
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
    const result = detectFigure7(new Board(ms), scores);
    assert.equal(result.matched, false, 'empty board has no figure_7');
  }, { timeout: 10_000 });

  // Regression: ascending-diagonal + horizontal-right shape where the completing cell
  // is the far end of the horizontal arm (not the diagonal/horizontal junction).
  // The shape B1-C2-D3-E3-F3 (col2,col3,col4,col5,col6 in 1-indexed) creates a double
  // threat but is NOT a figure-7; the figure-7 requires the completing move to be the
  // junction cell, not an arm extension.
  //
  // Board for move string '021353342445' (Red to play):
  //      1   2   3   4   5   6   7
  //   3 |   |   |   | R | R |   |   |
  //   2 |   |   | R | Y | Y | Y |   |
  //   1 | R | R | Y | Y | Y | R |   |
  //
  // Red has B1(1,0), C2(2,1), D3(3,2), E3(4,2) placed; F3(5,2) is empty at height.
  // Incorrectly matched as figure_7 with completing cell = F3 (arm end, not junction).
  test('non-corner completing cell (arm extension) is not a figure_7', async () => {
    const ms = '021353342445';
    const scores = await solver.query(ms);
    const result = detectFigure7(new Board(ms), scores);
    assert.equal(result.matched, false, 'extending a horizontal arm is not a figure_7 completing move');
  }, { timeout: 10_000 });

  // Move string "41432254553" (11 moves): the four placed cells and junction cell
  // structurally resemble a figure-7, but this is NOT a genuine figure-7 trap because
  // the double threat is achievable for the current player regardless of this shape
  // (both post-placement threats land at gravity-top, so it's a generic double-threat,
  // not a figure-7 setup). detectFigure7 should not fire here.
  test('41432254553 does not match figure_7', async () => {
    const ms = '30321143442';
    const scores = await solver.query(ms);
    const result = detectFigure7(new Board(ms), scores);
    assert.equal(result.matched, false, '41432254553 is not a figure_7');
  }, { timeout: 10_000 });

  // Position after 14 moves '33333314654551' (Red to move):
  //
  //      1   2   3   4   5   6   7
  //   3 |   |   |   | R |   | R |   |
  //   2 |   | Y |   | Y | R | Y |   |
  //   1 |   | R |   | R | Y | Y | R |
  //
  // Red forms a figure-7 shape with placed: (col4,row1),(col5,row2),(col6,row3),(col4,row3)
  // completing: col5(1-indexed) = col4(0-indexed), gravity-accessible (colHeights[4]=2).
  // Solver score for col5(1-idx) is +12.
  //
  // After placing in col5(1-idx)=col4(0-idx): the two post-placement threats land at
  // rows above the current gravity-top — this exercises the fix that iterates all
  // reachable rows, not just gravity-top.
  test('detects figure-7 from movestring 44444425765662 (threats not immediately accessible)', async () => {
    const ms = '33333314654551';
    const scores = await solver.query(ms);
    const result = detectFigure7(new Board(ms), scores);
    assert.ok(result.matched, 'figure-7 must be detected even when post-placement threats are not gravity-accessible');
    assert.equal(result.correctCol, 4, 'completing cell is col4 (0-indexed)');
    assert.equal(result.highlightMetadata.cells.length, 4);
  }, { timeout: 10_000 });

  // FALSE POSITIVE — case 1: structural shape but threats land in different columns.
  // Board: 462324415632426356 (18 moves, Red to move).
  // Template placed={col1r0, col2r1, col3r2, col5r2} / comp=col4r2 is structurally
  // valid, but after placing comp the two template-backed threats land in col4 and
  // col6 (different columns). A genuine figure-7 zugzwang requires both threats in
  // the same column at consecutive rows so that blocking the lower one immediately
  // exposes the upper one (see training-material §E Q21).
  test('462324415632426356 does not match figure_7 (threats in different columns)', async () => {
    const ms = '351213304521315245';
    const scores = await solver.query(ms);
    const result = detectFigure7(new Board(ms), scores);
    assert.equal(result.matched, false,
      '462324415632426356: threats land in different columns — not a figure_7 zugzwang');
  }, { timeout: 10_000 });

  // FALSE POSITIVE — case 2: shape exists but its threats are in the same column
  // 3 rows apart, so the zugzwang mechanism does not hold.
  // Board: 444335255542677244273277571253 (30 moves, Red to move).
  // Template placed={col4r2, col3r3, col3r4, col4r4} / comp=col2r4 structurally
  // matches. After placing comp, both threats land in col5 at rows 1 and 4 (gap=3).
  // The figure-7 zugzwang requires consecutive-row threats: blocking the gravity-top
  // threat raises col height by 1, which must directly expose the second threat.
  // A gap of 3 breaks the mechanism — blocking row 1 does not expose row 4.
  test('444335255542677244273277571253 does not match figure_7 (threats not consecutive rows)', async () => {
    const ms = '333224144431566133162166460142';
    const scores = await solver.query(ms);
    const result = detectFigure7(new Board(ms), scores);
    assert.equal(result.matched, false,
      '444335255542677244273277571253: same-column threats 3 rows apart — not a figure_7 zugzwang');
  }, { timeout: 10_000 });

  test('when detectFigure7 fires, highlightMetadata is structurally valid', async () => {
    const positions = ['01234566543210', '654321065432', '330022'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectFigure7(new Board(ms), scores);
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
    const positions = ['01234566543210', '654321065432', '330022'];
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
      id: 99, category: 'figure_7', moveString: '01234566543210',
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
      id: 99, category: 'figure_7', moveString: '01234566543210',
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
      id: 99, category: 'figure_7', moveString: '01234566543210',
      highlightMetadata: null,
    };
    const result = evaluatePredicate(puzzle, 6, []);
    assert.equal(result.result, 'wrong');
  });
});

describe('evalJShape — from correctCol', () => {
  test('correct col returns correct', () => {
    const puzzle = {
      id: 99, category: 'j_shape', moveString: '3322330022',
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
      id: 99, category: 'j_shape', moveString: '3322330022',
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
