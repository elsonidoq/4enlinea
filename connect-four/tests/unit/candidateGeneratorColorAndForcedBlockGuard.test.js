// Spec 044 (Epic 4) US1 + US2 — candidate-generator.js color-cast and
// stray-forced-block-distraction guards on checkPredicate().
//
// All boards below were sourced via server/gameSampling.js's playGame (never
// hand-constructed), confirmed with ./visualize_board.sh, and require no solver
// call to re-verify here (immediate_threat/forced_block ignore `scores`; z_threat/
// odd_even_threat only need the already-captured solver scores, not a live solver).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkPredicate } from '../../server/candidate-generator.js';

describe('checkPredicate() — US1 color-cast guard (FR-001-003)', () => {
  test('immediate_threat: learner correctly cast as P1/green -> accepted', async () => {
    // 31-ply position, currentPlayer = 1 (Green); sole winning column is 6.
    const ms = '333334444112364412222555555206';
    const result = await checkPredicate('immediate_threat', ms, [], null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [6]);
  });

  test('immediate_threat: candidate would cast learner as P2/gray -> rejected outright, not corrected', async () => {
    // 25-ply position, currentPlayer = 2 (Gray); sole winning column is 1 for Gray.
    // The raw predicate would otherwise match (Gray does have exactly one winning column) —
    // the color-cast guard must reject it rather than silently accept a gray-cast
    // immediate_threat puzzle.
    const ms = '4444232232340221603355301';
    const result = await checkPredicate('immediate_threat', ms, [], null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });

  test('forced_block: learner correctly cast as P2/gray -> accepted', async () => {
    // 7-ply position, currentPlayer = 2 (Gray); Green has a sole gravity-top threat at col1
    // that Gray must block.
    const ms = '3345552';
    const result = await checkPredicate('forced_block', ms, [], null);
    assert.equal(result.passes, true);
  });

  test('forced_block: candidate would cast learner as P1/green -> rejected outright, not corrected', async () => {
    // 32-ply position, currentPlayer = 1 (Green); Gray has the sole gravity-top threat
    // (col4) that must be blocked — but it would be Green blocking, not Gray. Must be
    // rejected, not silently re-cast.
    const ms = '33455521333011061155166345220644';
    const result = await checkPredicate('forced_block', ms, [], null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });
});

describe('checkPredicate() — US2 stray forced-block distraction guard (FR-006-009)', () => {
  test('non-forced_block candidate with an unrelated live forced-block -> rejected', async () => {
    // 7-ply position: currentPlayer = 2 (Gray). The board's own j_shape predicate genuinely
    // matches with answer column 3 (raw checkJShapePredicate: passes:true, correctCols:[3]) —
    // this is not a case where the other category simply fails to match anyway. But Green
    // separately has a live gravity-top threat at col6 that Gray must block right now; playing
    // the j_shape answer (col3) would let Green win at col6 next move. The candidate must be
    // rejected because the j_shape answer does not address the live forced-block at col6.
    const ms = '3342225';
    const scores = [-17, -17, -17, -17, -17, -17, 2];
    const result = await checkPredicate('j_shape', ms, scores, null);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  });

  test('non-forced_block candidate whose answer move coincides with the forced-block -> accepted', async () => {
    // 16-ply position: currentPlayer = 1 (Green); the odd_even_threat answer column (4) is the
    // SAME column that blocks Gray's live gravity-top threat (also col4) — forced-block and the
    // puzzle's own answer move coincide, so the candidate must be accepted, not rejected.
    const ms = '3333311555134245';
    const scores = [-13, -13, -13, -1000, 4, -13, -13];
    const result = await checkPredicate('odd_even_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [4]);
  });

  test('non-forced_block candidate with only a non-gravity-top opponent threat -> not rejected', async () => {
    // 26-ply position: currentPlayer = 1 (Green). Gray has two STACKED (non-gravity-top) major
    // threats (col2 row4, col5 row5) and zero gravity-top threats. detectForcedBlock only ever
    // considers gravity-top-reachable threats (reused directly, no new gravity-top logic per
    // T009/FR-009), so this must NOT trigger the US2 rejection — z_threat's own predicate result
        // is unaffected by the presence of the stacked threat.
    const ms = '33333555543222060200251661';
    const scores = [5, -8, 5, -1000, 6, 5, 5];
    const result = await checkPredicate('z_threat', ms, scores, null);
    assert.equal(result.passes, true);
    assert.deepEqual(result.correctCols, [4]);
  });
});
