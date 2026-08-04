import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { evaluatePredicate } from '../../server/predicates.js';
import { checkPredicate } from '../../server/candidate-generator.js';

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
    const puzzle = { id: 99, category: 99, moveString: '33', goalPredicateType: 'unknown' };
    const result = evaluatePredicate(puzzle, 3, [0, 0, 0, 5, 0, 0, 0]);
    assert.equal(result.result, 'wrong');
  });

  test('cat 1 returns correctCol when result is wrong', () => {
    const puzzle = { id: 1, category: 'immediate_threat', moveString: '001122', goalPredicateType: 'immediate_win' };
    const result = evaluatePredicate(puzzle, 0, [-2, -1, -1, 18, -2, -2, -3]);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 3);
  });

  test('forced_win returns wrong when no column initiates a forced win', () => {
    // Position "33333" has no forced-win chain for any column.
    const puzzle = { id: 5, category: 'forced_win', moveString: '33333', goalPredicateType: 'forced_win' };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
  });

  // Regression: evalForcedBlock false positive — all non-blocking cols scored opponentImmediateWin
  // due to floor/ceil mismatch, but Yellow has no immediately playable winning threat (wins in 4 plies
  // via a double-threat setup, not in 2). Board check correctly rejects this as forced_block.
  test('forced_block false-positive: no immediately playable Yellow threat — must be wrong', () => {
    const puzzle = { id: 99, category: 'forced_block', moveString: '3251333421640522' };
    const scores = [-12, 0, -12, -12, -12, -12, -12];
    const result = evaluatePredicate(puzzle, 1, scores);
    assert.notEqual(result.result, 'correct', 'col1 should not be a forced block — Yellow has no immediate win');
  });

  // Regression: odd moveCount=19, score=11=floor((42-19)/2) but no gravity-top 4-in-a-row.
  // evalImmediateThreat must use board checkWin, not score comparison.
  test('cat 1 false-positive: odd moveCount=19, score=11, no gravity-top 4-in-a-row — must be wrong', () => {
    const puzzle = { id: 99, category: 'immediate_threat', moveString: '0116034064222505306' };
    const scores = [-9, -11, -9, -11, 8, 11, 8];
    const result = evaluatePredicate(puzzle, 5, scores);
    assert.notEqual(result.result, 'correct', 'col5 has score=winScore but no immediate 4-in-a-row');
  });
});

// ── HTTP regression: single-move categories unaffected by interaction_mode guard ──────
// Verifies that /check still evaluates single_move puzzles correctly and does NOT
// return any interaction_mode-related error.

const singleMoveFixtures = [
  {
    id: 'reg-imm-1',
    category: 'immediate_threat',
    interaction_mode: 'single_move',
    move_string: '001122',
    scores: [-2, -1, -1, 18, -2, -2, -3],
    candidateCol: 3,
    expectedResult: 'correct',
  },
  {
    id: 'reg-fb-1',
    category: 'forced_block',
    interaction_mode: 'single_move',
    move_string: '00113',
    scores: [-18, -18, 0, -18, -18, -18, -18],
    candidateCol: 2,
    expectedResult: 'correct',
  },
  {
    id: 'reg-dt-1',
    category: 'double_threat',
    interaction_mode: 'single_move',
    move_string: '3344',
    scores: [-4, -3, 18, 2, 2, 18, -3],
    candidateCol: 2,
    expectedResult: 'tied',
  },
];

function buildCheckApp() {
  const app = express();
  app.use(express.json());

  const puzzleStore = Object.fromEntries(singleMoveFixtures.map(f => [f.id, f]));

  app.post('/api/puzzles/:id/check', (req, res) => {
    const puzzle = puzzleStore[req.params.id];
    if (!puzzle) return res.status(404).json({ error: 'puzzle not found' });

    if (puzzle.interaction_mode === 'sequence') {
      return res.status(400).json({ error: 'Use /sequence/move for sequence-mode puzzles' });
    }

    const { candidateCol } = req.body;
    if (typeof candidateCol !== 'number' || candidateCol < 0 || candidateCol > 6) {
      return res.status(400).json({ error: 'candidateCol must be integer 0-6' });
    }

    const puzzleObj = {
      id: puzzle.id,
      category: puzzle.category,
      moveString: puzzle.move_string,
      goalPredicateType: puzzle.category,
    };
    const evaluation = evaluatePredicate(puzzleObj, candidateCol, puzzle.scores);
    res.json({ result: evaluation.result, correctCol: evaluation.correctCol ?? null });
  });

  return app;
}

let checkServer;
let checkBaseUrl;

before(() => new Promise(resolve => {
  checkServer = createServer(buildCheckApp());
  checkServer.listen(0, () => {
    checkBaseUrl = `http://localhost:${checkServer.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => checkServer.close(resolve)));

// Spec 051 (Epic 1) T010 — odd_even_threat's generation-time floor rejection. Harvested via
// gameSampling.js#playGame (never hand-constructed), confirmed with ./visualize_board.sh: move 21,
// scores [2,10,11,--,2,2,2] — col 2 (0-indexed) is the sole solver optimum (score 11), but
// detectOddEvenThreat's own pattern-matching only requires scores[col] > 0, so it reports
// correctCols: [5] (score 2, positive but not optimal) — a column that concedes strictly more than
// the board's own optimum. checkPredicate (candidate-generator.js), which gates every category's
// answer set through answerSetHolds/isSolverSafe (FR-001), must reject this board outright.
describe('odd_even_threat: generation-time solver-safety floor (FR-001/FR-006)', () => {
  const floorViolatingMoveString = '241130333355310055626';
  const floorViolatingScores = [2, 10, 11, -1000, 2, 2, 2];

  test('a board whose only pattern-matching column concedes worse than the optimum is rejected', async () => {
    const result = await checkPredicate('odd_even_threat', floorViolatingMoveString, floorViolatingScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

// Spec 051 (Epic 1) T013 — figure_7/j_shape generation-time solver-safety floor. Harvested via
// gameSampling.js#playGame (never hand-constructed), confirmed with ./visualize_board.sh.
describe('figure_7/j_shape: generation-time solver-safety floor (FR-001/FR-009)', () => {
  // Move 29, scores [-6,6,7,--,--,5,6]: col 5 (0-indexed) is the sole figure_7 match, but its own
  // score (5) is strictly worse than the board's optimum (col 2, score 7) — checkFigure7Predicate
  // reports correctCols: [5] with no regard for whether playing it is best; checkPredicate (which
  // gates every category's answer set through answerSetHolds/isSolverSafe, FR-001) must reject it.
  const f7FloorMoveString = '341333441420636534456662255';
  const f7FloorScores = [-6, 6, 7, -1000, -1000, 5, 6];

  test('figure_7: a board whose only pattern-matching column concedes worse than the optimum is rejected', async () => {
    const result = await checkPredicate('figure_7', f7FloorMoveString, f7FloorScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });

  // Move 8, scores [-4,-4,2,-3,4,4,2]: col 4 (0-indexed) is the sole j_shape match (score 4), but
  // col 5 (also score 4) is an equally-good, untaught solver-optimal alternative — the answer set
  // does not contain every solver-optimal column, so the invariant's AMBIGUOUS branch fires.
  const jsFloorMoveString = '33423243';
  const jsFloorScores = [-4, -4, 2, -3, 4, 4, 2];

  test('j_shape: a board with an untaught, equally-good solver-optimal alternative is rejected', async () => {
    const result = await checkPredicate('j_shape', jsFloorMoveString, jsFloorScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

// Spec 051 (Epic 1) T017 — z_threat/overcut. Harvested via gameSampling.js#playGame (never
// hand-constructed), confirmed with ./visualize_board.sh.
describe('z_threat: singleton cardinality unchanged (FR-010, no relaxation)', () => {
  // Move 28, scores [-7,6,7,--,-7,7,--]: TWO structural Z-threat candidates exist (cols 2 and 5,
  // both score-positive with an odd-count threat window) — detectZThreat's existing
  // candidates.length !== 1 rejection still fires, unchanged by T014's additive correctCols field.
  const twoCandidateMoveString = '3334306611334640066062242151';
  const twoCandidateScores = [-7, 6, 7, -1000, -7, 7, -1000];

  test('a 2-candidate z_threat board is still rejected at generation time', async () => {
    const result = await checkPredicate('z_threat', twoCandidateMoveString, twoCandidateScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

describe('z_threat/overcut: generation-time solver-safety floor (FR-001/FR-010)', () => {
  // Move 20, scores [9,8,8,--,3,4,3]: col 2 (0-indexed) is the sole Z-threat match (score 8), but
  // col 0 (score 9) is the board's own solver optimum — col 2 concedes strictly worse.
  const zFloorMoveString = '33333115156553660206';
  const zFloorScores = [9, 8, 8, -1000, 3, 4, 3];

  test('z_threat: a board whose only pattern-matching column concedes worse than the optimum is rejected', async () => {
    const result = await checkPredicate('z_threat', zFloorMoveString, zFloorScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });

  // Move 20, scores [3,3,3,--,11,-2,3]: col 1 (0-indexed) is the sole overcut match (score 3), but
  // col 4 (score 11) is the board's own solver optimum — col 1 concedes strictly worse.
  const overcutFloorMoveString = '33322232332414566545';
  const overcutFloorScores = [3, 3, 3, -1000, 11, -2, 3];

  test('overcut: a board whose only pattern-matching column concedes worse than the optimum is rejected', async () => {
    const result = await checkPredicate('overcut', overcutFloorMoveString, overcutFloorScores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

describe('/check endpoint — regression: single-move categories unaffected', () => {
  for (const fix of singleMoveFixtures) {
    test(`${fix.category} (${fix.move_string}): /check returns ${fix.expectedResult}, no interaction_mode error`, async () => {
      const res = await fetch(`${checkBaseUrl}/api/puzzles/${fix.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateCol: fix.candidateCol }),
      });
      assert.equal(res.status, 200, 'should return 200 not a mode-related error');
      const body = await res.json();
      assert.ok(!body.error, `should not have error field; got: ${body.error}`);
      assert.equal(body.result, fix.expectedResult);
    });
  }
});

// ── T004 (spec 057, FR-006/OI-92) — a correct answer must survive stale highlightMetadata ──────
//
// evalOvercut/evalUndercut/evalZThreat historically graded purely off `puzzle.highlightMetadata`,
// which is stored at generation time and never re-derived. If the detector logic later changes (or
// a row simply drifts), a mathematically correct answer — one that IS present in the solver-gated
// `puzzle.correctCols` — could still be graded 'wrong' because the stale metadata points somewhere
// else. This test constructs exactly that shape: a real, solver-harvested board + correctCols, paired
// with a deliberately stale highlightMetadata (a plausible pre-widening shape pointing at a WRONG
// column). Per T005/FR-006, the grader must accept the correctCols-listed answer regardless of what
// the stale metadata says.
//
// All movestrings/columns below were harvested live against the real c4solver (never hand-built),
// via `detectOvercutBeneficiary`/`detectUndercutVictim`/`detectZThreat` and
// `checkUndercutPredicate`/`checkZThreatPredicate` (server/candidate-generator.js), see the T004
// harvesting commands in this batch's report. No repair/backfill (T009) can make this test pass —
// the row's stored highlightMetadata is deliberately never repaired in this scenario; only a grader
// change (T005) can.
describe('T004 — stale highlightMetadata must not shadow a solver-gated correctCols answer', () => {
  test('evalZThreat: correctCols-listed column wins over a stale highlightMetadata.column', () => {
    // Harvested: ms="001122" — detectZThreat fires with real column=3, correctCols=[3].
    // highlightMetadata.column is deliberately corrupted to 0 (a real, but WRONG, column on this
    // board) to simulate a stale/mis-derived stored row.
    const puzzle = {
      id: 9004, category: 'z_threat', moveString: '001122',
      highlightMetadata: { type: 'capsule', column: 0, fromRow: 0, toRow: 0, badgeCount: 1 },
      correctCols: [3],
    };
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'correct', 'the correctCols-listed column must grade correct despite stale metadata');
  });

  test('evalOvercut: correctCols-listed column wins over a stale highlightMetadata major_threat', () => {
    // Harvested: ms="26533454144531123345224155" — detectOvercutBeneficiary fires with real
    // major_threat column=6, correctCols=[6]. highlightMetadata is corrupted to point major_threat
    // at column 1 (a real column on the board, but not the answer) to simulate staleness.
    const puzzle = {
      id: 9005, category: 'overcut', moveString: '26533454144531123345224155',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 1, row: 2, role: 'neutralised_threat' },
          { column: 1, row: 3, role: 'major_threat' },
        ],
      },
      correctCols: [6],
    };
    const result = evaluatePredicate(puzzle, 6, []);
    assert.equal(result.result, 'correct', 'the correctCols-listed column must grade correct despite stale metadata');
  });

  test('evalUndercut: correctCols-listed column wins over a stale highlightMetadata killing_threat', () => {
    // Harvested: ms="33211553350634544", scores=[-10,-7,-12,-10,2,-10,-10] — detectUndercutVictim
    // fires with real killing_threat column=2; checkUndercutPredicate's solver-safety floor yields
    // correctCols=[4] (the only non-killing column with a non-negative score). highlightMetadata is
    // corrupted so column 4 itself is flagged as the killing_threat column — under the OLD grader
    // this makes submitting col 4 (the actually-correct answer) grade 'wrong'.
    const puzzle = {
      id: 9006, category: 'undercut', moveString: '33211553350634544',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 4, row: 0, role: 'killing_threat' },
          { column: 4, row: 1, role: 'dead_threat' },
        ],
      },
      correctCols: [4],
    };
    const scores = [-10, -7, -12, -10, 2, -10, -10];
    const result = evaluatePredicate(puzzle, 4, scores);
    assert.equal(result.result, 'correct', 'the correctCols-listed column must grade correct despite stale metadata');
  });
});
