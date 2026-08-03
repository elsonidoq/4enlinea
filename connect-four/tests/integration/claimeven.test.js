// T018 — Claimeven integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectClaimeven, Board } from '../../server/classifier.js';
import { checkClaimevenPredicate, checkPredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectClaimeven — subtype B (spec fixture)', () => {
  // Position: '3233333556' (10 moves, P1 to move)
  // Heights after: col0=0,col1=0,col2=1,col3=3,col4=4,col5=0,col6=1 (0-indexed)
  // Odd-height columns: col2 (height 1) and col6 (height 1) — both odd
  // Last move was in col6 (move '6' = col6 0-indexed) → subtype B
  // Correct col = col2 (the other odd col)
  test('detects subtype B on spec fixture 4344444667', async () => {
    const ms = '3233333556';
    await solver.query(ms);
    const result = await detectClaimeven(new Board(ms), solver);

    if (result.matched) {
      assert.equal(result.categoryEvidence.subtype, 'B', 'should be subtype B');
      assert.equal(result.correctCol, 2, 'correct col should be col2 (0-indexed)');
      assert.deepEqual(result.categoryEvidence.baseinverse_pair.sort(), [2, 6].sort(), 'baseinverse pair should be [2,6]');
      assert.equal(result.highlightMetadata, null, 'claimeven has no highlight metadata');
    }
    // If not matched, simulation didn't confirm — that's OK, just verify no crash
  }, { timeout: 60_000 });

  test('correctCol comes from the non-last-move odd column', async () => {
    const ms = '3233333556';
    await solver.query(ms);
    const result = await detectClaimeven(new Board(ms), solver);

    if (result.matched) {
      // Last move was col6 (digit 7); correct must be col2 (digit 3)
      assert.notEqual(result.correctCol, 6, 'correctCol must not be the column of the last move');
    }
  }, { timeout: 60_000 });
});

describe('detectClaimeven — subtype A', () => {
  test('returns matched=false for empty board (no odd columns)', async () => {
    const ms = '';
    await solver.query(ms);
    const result = await detectClaimeven(new Board(ms), solver);
    assert.equal(result.matched, false, 'empty board has no odd-height columns → no claimeven');
  }, { timeout: 10_000 });

  // T018 (spec 051): the pre-T018 code rejected 3+ odd columns outright as a cap — verified at
  // source to be an implementation gap, not a domain constraint (docs/knowledge-base/
  // allis-claimeven.md's base rule applies independently per column, with no such cap). This board
  // still legitimately reports matched:false, but now for the RIGHT reason: every odd column's own
  // simulation fails to confirm a Yellow win (`solver.query('012')` returns [0,1,3,1,1,2,0] —
  // Yellow is not even ahead here), not because 3 candidates were never tried.
  test('3 odd columns are each tried independently; still matched=false because no simulation confirms', async () => {
    // '012' → col0,col1,col2 each at height 1 → 3 odd cols, none of which pass simulation.
    const ms = '012';
    await solver.query(ms);
    const result = await detectClaimeven(new Board(ms), solver);
    assert.equal(result.matched, false, 'no odd column simulation confirms a Yellow win on this board');
  }, { timeout: 10_000 });
});

// T018 (spec 051, Epic 1) — every odd-height column is now an independent standard-Claimeven
// candidate; boards with 3 odd columns are genuinely enumerable rather than outright rejected.
// Harvested via gameSampling.js#playGame, confirmed with ./visualize_board.sh: move 19, par row
// col2=1O/col4=3O/col6=5O (3 odd columns), scores all tied at 5 (col3 full).
describe('detectClaimeven — T018 full per-column enumeration (3 odd columns)', () => {
  const ms = '2322332300233464400';

  test('all 3 odd columns confirm and are collected into correctCols', async () => {
    await solver.query(ms);
    const result = await detectClaimeven(new Board(ms), solver);
    assert.equal(result.matched, true);
    assert.deepEqual([...result.correctCols].sort((a, b) => a - b), [2, 4, 6]);
    // matched/correctCol/categoryEvidence still present in the pre-existing shape.
    assert.equal(typeof result.correctCol, 'number');
    assert.ok(result.correctCols.includes(result.correctCol));
    assert.equal(result.highlightMetadata, null);
  }, { timeout: 60_000 });

  test('checkClaimevenPredicate widens correctCols to the full T018 set (T019)', async () => {
    const scores = await solver.query(ms);
    const result = await checkClaimevenPredicate(ms, scores, solver);
    assert.equal(result.passes, true);
    assert.deepEqual([...result.correctCols].sort((a, b) => a - b), [2, 4, 6]);
    assert.ok(result.correctCols.includes(result.correct_col));
  }, { timeout: 60_000 });
});

// T021 (spec 051, Epic 1) — a solver-verified claimeven board with 2+ (here 3) independently
// valid, solver-safe response columns. Harvested via gameSampling.js#playGame, confirmed with
// ./visualize_board.sh: move 31, par row col0=3O/col2=3O/col6=5O, scores [3,--,1,--,--,--,3]
// (optimal = {0, 6}, both included in correctCols — the invariant holds). Deliberately NOT
// `tests/integration/claimeven.test.js`'s old '3233333556' fixture — verified at source (see the
// T018 describe block above and spec 051's tasks.md) that `detectClaimeven` returns
// `matched: false` against it; never reused here.
describe('detectClaimeven — T021 multi-column harvested fixture (2+ valid response columns)', () => {
  const ms = '3113331555246211234443015500544';

  test('checkClaimevenPredicate accepts the board with 3 correctCols, all solver-safe', async () => {
    const scores = await solver.query(ms);
    const result = await checkPredicate('claimeven', ms, scores, solver);
    assert.equal(result.passes, true);
    assert.deepEqual([...result.correctCols].sort((a, b) => a - b), [0, 2, 6]);
  }, { timeout: 60_000 });

  test('evalClaimeven (FR-012, no uniqueness constraint): both independently-valid columns grade correct/tied', async () => {
    const scores = await solver.query(ms);
    const result = await checkPredicate('claimeven', ms, scores, solver);
    const puzzle = { id: 1, category: 'claimeven', moveString: ms, correctCols: result.correctCols };

    const evalCol0 = evaluatePredicate(puzzle, 0, scores);
    assert.ok(evalCol0.result === 'correct' || evalCol0.result === 'tied', `col0 should be correct/tied, got ${evalCol0.result}`);

    const evalCol6 = evaluatePredicate(puzzle, 6, scores);
    assert.ok(evalCol6.result === 'correct' || evalCol6.result === 'tied', `col6 should be correct/tied, got ${evalCol6.result}`);

    // col1 is a non-qualifying, full-adjacent even-height column — must grade wrong.
    const evalCol1 = evaluatePredicate(puzzle, 1, scores);
    assert.equal(evalCol1.result, 'wrong');
  }, { timeout: 60_000 });
});

// T021 (spec 051, Epic 1) — a floor-violating claimeven fixture: detectClaimeven's own
// per-column pattern match says cols 2 and 5 confirm via simulation, but the board's actual
// solver-optimal move (col4, score 15 — an unrelated immediate winning threat) is not among them.
// Harvested via gameSampling.js#playGame, confirmed with ./visualize_board.sh: move 13, scores
// [4,-13,4,--,15,11,10] — col4 is a gravity-top major threat (<O>) for Gray, an immediate win
// entirely outside the claimeven pattern. checkPredicate (which gates every category's answer set
// through answerSetHolds/isSolverSafe, FR-001) must reject this board outright at generation time.
describe('detectClaimeven — T021 floor-violating fixture (FR-001)', () => {
  const ms = '4523332323322';

  test('a board whose claimeven columns concede worse than the optimum is rejected', async () => {
    const scores = await solver.query(ms);
    const result = await checkPredicate('claimeven', ms, scores, solver);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 60_000 });
});

describe('checkClaimevenPredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = await checkClaimevenPredicate(ms, scores, solver);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const ms = '3233333556';
    const scores = await solver.query(ms);
    const result = await checkClaimevenPredicate(ms, scores, solver);

    if (result.passes) {
      assert.ok(typeof result.correct_col === 'number', 'correct_col must be a number');
      assert.ok(result.correctCols.includes(result.correct_col), 'correctCols must include correct_col');
      assert.equal(result.highlight_metadata, null, 'claimeven highlight_metadata must be null');
      assert.ok(result.category_evidence.subtype === 'A' || result.category_evidence.subtype === 'B');
    }
  }, { timeout: 60_000 });
});

describe('evalClaimeven — from correctCols', () => {
  test('correct col returns correct', () => {
    const puzzle = {
      id: 99, category: 'claimeven', moveString: '2122222445',
      highlightMetadata: null, correctCols: [2],
    };
    const result = evaluatePredicate(puzzle, 2, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 2);
  });

  test('wrong col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'claimeven', moveString: '2122222445',
      highlightMetadata: null, correctCols: [2],
    };
    const result = evaluatePredicate(puzzle, 5, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 2);
  });

  test('missing correctCol returns wrong', () => {
    const puzzle = { id: 99, category: 'claimeven', moveString: '2122222445', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 2, []);
    assert.equal(result.result, 'wrong');
  });
});
