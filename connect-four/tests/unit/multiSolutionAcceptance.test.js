// Spec 044 (Epic 4) US3 — multi-solution acceptance for immediate_threat/forced_block/
// double_threat (FR-010–FR-012), and regression coverage confirming undercut/z_threat/overcut/
// claimeven's single-answer / avoid-the-pattern models are byte-for-byte unchanged (FR-013/FR-014).
//
// All boards below were sourced via server/gameSampling.js's playGame (never hand-constructed)
// and their expected correctCols/results were derived by running them through the actual
// production `checkPredicate`/`evaluatePredicate` functions during sourcing (see
// server/scripts/t018_single_answer_search.mjs and t019_multi_solution_search.mjs) — not
// hand-computed — per CLAUDE.md's movestring rule and I12 (production detector, not the
// motivating example alone).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { checkPredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

// claimeven's checkClaimevenPredicate is simulation-based and requires a live solver
// (see memory reference_claimeven_detection.md) — the other categories exercised in this file
// do not touch the solver.
let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

// ── T019 — positive cases: multi-solution categories accept 2+ columns ─────────────────

describe('checkPredicate() — US3 multi-solution acceptance (FR-010, FR-011)', () => {
  test('immediate_threat: 3 legal winning columns -> accepted, all 3 recorded', async () => {
    const ms = '33343063631016044110624245';
    const scores = [-8, -8, 8, -1000, 8, 8, -8];
    const result = await checkPredicate('immediate_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [2, 4, 5]);
  });

  test('immediate_threat: 2 legal winning columns -> accepted, both recorded', async () => {
    const ms = '33323653552253441626626260101104';
    const scores = [5, -5, -1000, -1000, 5, -5, -1000];
    const result = await checkPredicate('immediate_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [0, 4]);
  });

  test('forced_block: 4 legal blocking columns -> accepted, all 4 recorded', async () => {
    const ms = '333332020011060444031';
    const scores = [-1000, 9, -10, -1000, 4, 8, 3];
    const result = await checkPredicate('forced_block', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [1, 4, 5, 6]);
  });

  // The two boards below replaced '333332' and '3333320200110' (2026-07-28). Those two contain
  // NO double threat on any column — they only passed because evalDoubleThreat had a "no fork ->
  // grade by highest positive solver score" fallback, since removed. Their names claimed "2 legal
  // fork columns" while asserting fallback behaviour. Both boards here are real, verified through
  // detectDoubleThreat, with solver-harvested scores.
  test('double_threat: 2 legal fork columns -> accepted, both recorded', async () => {
    const ms = '3344';
    const scores = [-4, -3, 18, 2, 2, 18, -3];
    const result = await checkPredicate('double_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [2, 5]);
  });

  test('double_threat: a board whose forks include stacked (Case B) columns -> all 3 recorded', async () => {
    // lesson-06 confirmation challenge 0. Cols 1 and 5 fork by the stacked/consecutive-row route
    // (block the lower threat, win the upper); col 2 forks by the two-distinct-columns route.
    const ms = '104300405142342531';
    const scores = [-10, 11, 11, 10, -10, 11, -10];
    const result = await checkPredicate('double_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [1, 2, 5]);
  });

  test('double_threat: a board with no fork on any column is NOT a double_threat puzzle', async () => {
    // '333332' — the board the two replaced tests used. No column creates a double threat.
    const ms = '333332';
    const scores = [-2, -3, 1, -3, -3, 1, -2];
    const result = await checkPredicate('double_threat', ms, scores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

describe('evaluatePredicate() — US3 solve-time: every valid multi-solution column scores accepted (Acceptance Scenarios 1-4)', () => {
  test('immediate_threat: each of the 3 winning columns independently scores correct/tied, non-winning column scores wrong', () => {
    const ms = '33343063631016044110624245';
    const scores = [-8, -8, 8, -1000, 8, 8, -8];
    const puzzle = { category: 'immediate_threat', moveString: ms };
    for (const col of [2, 4, 5]) {
      const r = evaluatePredicate(puzzle, col, scores);
      assert.ok(r.result === 'correct' || r.result === 'tied', `col ${col} should be correct/tied, got ${r.result}`);
    }
    const wrongCol = evaluatePredicate(puzzle, 0, scores);
    assert.equal(wrongCol.result, 'wrong');
  });

  test('forced_block: each of the 4 blocking columns independently scores correct/tied', () => {
    const ms = '333332020011060444031';
    const scores = [-1000, 9, -10, -1000, 4, 8, 3];
    const puzzle = { category: 'forced_block', moveString: ms };
    for (const col of [1, 4, 5, 6]) {
      const r = evaluatePredicate(puzzle, col, scores);
      assert.ok(r.result === 'correct' || r.result === 'tied', `col ${col} should be correct/tied, got ${r.result}`);
    }
  });

  test('double_threat: both fork columns score correct/tied; a non-fork column scores wrong (Acceptance Scenario 3)', () => {
    const ms = '3344';
    const scores = [-4, -3, 18, 2, 2, 18, -3];
    const puzzle = { category: 'double_threat', moveString: ms };
    for (const col of [2, 5]) {
      const r = evaluatePredicate(puzzle, col, scores);
      assert.ok(r.result === 'correct' || r.result === 'tied', `col ${col} should be correct/tied, got ${r.result}`);
    }
    // col 0 does not create a fork on this board.
    const nonFork = evaluatePredicate(puzzle, 0, scores);
    assert.equal(nonFork.result, 'wrong');
  });

  // Regression for the reported bug: lesson-06 confirmation challenge 0 accepted only col 2,
  // because evalDoubleThreat re-implemented the concept and saw only gravity-top threats in
  // distinct columns (Case A). Cols 1 and 5 are stacked/consecutive-row forks (Case B) —
  // classifier.js#detectDoubleThreat has always recognised them.
  test('double_threat: stacked (Case B) fork columns score correct/tied, not wrong', () => {
    const ms = '104300405142342531';
    const scores = [-10, 11, 11, 10, -10, 11, -10];
    const puzzle = { category: 'double_threat', moveString: ms };
    for (const col of [1, 2, 5]) {
      const r = evaluatePredicate(puzzle, col, scores);
      assert.ok(r.result === 'correct' || r.result === 'tied', `col ${col} should be correct/tied, got ${r.result}`);
    }
    for (const col of [0, 3, 4, 6]) {
      assert.equal(evaluatePredicate(puzzle, col, scores).result, 'wrong', `col ${col} should be wrong`);
    }
  });

  test('double_threat: with no fork on the board, every column scores wrong (no solver-score fallback)', () => {
    const ms = '333332';
    const scores = [-2, -3, 1, -3, -3, 1, -2];
    const puzzle = { category: 'double_threat', moveString: ms };
    for (let col = 0; col < 7; col++) {
      assert.equal(evaluatePredicate(puzzle, col, scores).result, 'wrong', `col ${col} should be wrong`);
    }
  });
});

// ── T018 — regression: single-answer / avoid-the-pattern categories unaffected ─────────

describe('checkPredicate() — FR-013/FR-014 regression: undercut avoid-the-pattern unchanged', () => {
  // UPDATE (spec 051 Epic 1, US2, T024/T025 — 2026-07-29): this fixture's expected values were
  // originally captured against the pre-floor `checkPredicate` (every non-killing column marked
  // "correct" with no score check at all — the exact OI-61 item 1 defect this batch closes).
  // Re-verified at source: on THIS board, the sole solver-optimal column (col 2, score -9) IS the
  // killing_threat column itself, so once the relative solver-safety floor (`isSolverSafe`) is
  // applied, every remaining non-killing column (1, 4, 5, 6 — all score -10, strictly worse than
  // the board's own optimum) is correctly excluded, leaving an EMPTY answer set. That is not a
  // regression — it is SC-002: a board with no safe non-killing column is not a valid undercut
  // puzzle candidate and must be rejected outright at generation time.
  test('undercut: a board whose only safe column is the killing column has an empty answer set (SC-002)', async () => {
    const ms = '3333320200110604440311';
    const scores = [-1000, -10, -9, -1000, -10, -10, -10];
    const result = await checkPredicate('undercut', ms, scores, null);
    assert.equal(result.passes, false, 'no non-killing column on this board is solver-safe');
    assert.deepEqual(result.correctCols, []);
  });

  // A fresh board (harvested via playGame, verified with visualize_board.sh) where the killing
  // column is NOT the board's sole optimum, so the positive "killing column excluded, other
  // SAFE legal columns included" case this describe block originally intended is still covered.
  test('undercut: killing column excluded from correctCols, safe non-killing columns included', async () => {
    const ms = '333330654544210414405513';
    const scores = [-6, -6, -6, -1000, -1000, -8, -9];
    const result = await checkPredicate('undercut', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols.slice().sort(), [0, 1, 2]);
    assert.equal(result.correct_col, null, 'undercut has no single correct_col');
  });

  test('undercut counterexample: the killing column itself must score wrong via evaluatePredicate', async () => {
    const ms = '3333320200110604440311';
    const scores = [-1000, -10, -9, -1000, -10, -10, -10];
    const result = await checkPredicate('undercut', ms, scores, null);
    // Any legal column NOT in correctCols is the killing column (or full) — confirm it scores wrong.
    const legalCols = [0, 1, 2, 3, 4, 5, 6].filter(c => scores[c] > -1000);
    const killingCols = legalCols.filter(c => !result.correctCols.includes(c));
    assert.ok(killingCols.length >= 1, 'expected a killing column to exist');
    const puzzle = { category: 'undercut', moveString: ms, highlightMetadata: result.highlight_metadata };
    for (const col of killingCols) {
      const r = evaluatePredicate(puzzle, col, scores);
      assert.equal(r.result, 'wrong', `killing col ${col} must score wrong`);
    }
  });
});

describe('checkPredicate() — FR-014 regression: z_threat/overcut/claimeven single-answer unchanged', () => {
  test('z_threat: exactly one correctCol, all other columns wrong via evaluatePredicate', async () => {
    const ms = '333302566255532062661';
    const scores = [10, 11, 10, 10, 10, 10, 10];
    const result = await checkPredicate('z_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [1]);
    assert.equal(result.correct_col, 1);

    const puzzle = { category: 'z_threat', moveString: ms, highlightMetadata: result.highlight_metadata };
    const wrongCol = evaluatePredicate(puzzle, 0, scores);
    assert.equal(wrongCol.result, 'wrong', 'counterexample: non-answer column must remain wrong');
  });

  // Board replaced 2026-07-28. The previous fixture '33343063631016044110624245'
  // (scores [-8,-8,8,-1000,8,8,-8]) had THREE winning columns at +8 — 2, 4 and 5 — while
  // accepting only col 5, so it asserted that two winning moves are graded wrong. That is the
  // same defect as the reported fork bug, now rejected by checkPredicate's answer-set invariant.
  test('overcut: exactly one correctCol (the major_threat column), all other columns wrong', async () => {
    const ms = '355230660352552323326664210500114';
    const scores = [-4, -4, -1000, -1000, 4, -1000, -4];
    const result = await checkPredicate('overcut', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [4]);

    const puzzle = { category: 'overcut', moveString: ms, highlightMetadata: result.highlight_metadata };
    const wrongCol = evaluatePredicate(puzzle, 0, scores);
    assert.equal(wrongCol.result, 'wrong', 'counterexample: non-answer column must remain wrong');
  });

  // Board replaced 2026-07-28. The previous fixture '433334115316311455651'
  // (scores [10,-1000,10,-1000,10,10,11]) taught col 4 at +10 while col 6 won faster at +11 —
  // i.e. the drill's answer was not a best move. Rejected by the answer-set invariant.
  test('claimeven: exactly one correctCol, all other columns wrong', async () => {
    const ms = '333310012441135316555651622222005';
    const scores = [2, -1000, -1000, -1000, 2, -1000, 3];
    const result = await checkPredicate('claimeven', ms, scores, solver);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [6]);
    assert.equal(result.correct_col, 6);

    const puzzle = { category: 'claimeven', moveString: ms, correctCols: result.correctCols };
    const wrongCol = evaluatePredicate(puzzle, 0, scores);
    assert.equal(wrongCol.result, 'wrong', 'counterexample: non-answer column must remain wrong');
  });
});
