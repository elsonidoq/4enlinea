// Spec 051 (Epic 1) T038 — regression test for checkPredicate()'s centralized sort + scalar sync
// (D6, FR-016a/FR-019, T036/T037). For every one of the twelve VALID_CATEGORIES — not a sample —
// asserts:
//   (a) result.correctCols is ascending-sorted (FR-016a)
//   (b) result.correct_col matches the FR-019 rule: correctCols[0], or NULL for undercut/overcut
//       regardless of what correctCols[0] would otherwise be (the carve-out — these two categories
//       deliberately store no single correct column, per checkUndercutPredicate/
//       checkOvercutPredicate's own `correct_col: null` return lines).
//
// A future category bypassing checkPredicate's centralized sort/sync point, or a future edit to
// the undercut/overcut carve-out list, must be caught here — it does not "fall out" of any other
// test in this feature.
//
// All boards below are real, passing (checkPredicate .passes === true) fixtures — harvested via
// gameSampling.js#playGame or reused verbatim from existing production fixtures already exercised
// through checkPredicate elsewhere in this suite (tests/unit/multiSolutionAcceptance.test.js,
// tests/unit/candidateGeneratorColorAndForcedBlockGuard.test.js, tests/integration/
// forced_win.test.js, tests/predicates/fixtures/fixtures.json's figure_7 T013 fixture) — never
// hand-constructed. The j_shape fixture below was freshly harvested via playGame for this task
// because the existing figure_7/j_shape fixtures.json entries intentionally violate the
// answer-set invariant (their own description records `optimal={0,2,4,6}` against a 2-column
// correctCols, i.e. AMBIGUOUS) — they exist to test evaluatePredicate's tri-state grading
// directly, not to pass checkPredicate's generation-time floor.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { checkPredicate } from '../../server/candidate-generator.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { VALID_CATEGORIES } from '../../server/categories.js';

// undercut/overcut deliberately keep correct_col === null regardless of correctCols[0]
// (FR-019 carve-out) — see checkUndercutPredicate/checkOvercutPredicate's own comments.
const NO_SCALAR_CATEGORIES = new Set(['undercut', 'overcut']);

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

// category -> { moveString, scores } for a real, checkPredicate-passing board.
const FIXTURES = {
  immediate_threat: {
    ms: '33343063631016044110624245',
    scores: [-8, -8, 8, -1000, 8, 8, -8],
  },
  forced_block: {
    ms: '333332020011060444031',
    scores: [-1000, 9, -10, -1000, 4, 8, 3],
  },
  double_threat: {
    ms: '3344',
    scores: [-4, -3, 18, 2, 2, 18, -3],
  },
  forced_win: {
    // forced_win/checkForcedWinPredicate is board-derived and legitimately checked with
    // scores = [] (see tests/integration/forced_win.test.js and
    // candidateGeneratorColorAndForcedBlockGuard.test.js's identical convention) — with no
    // usable scores, answerSetHolds classifies NO-SCORES, a passing verdict.
    ms: '653633533056604004450651043',
    scores: [],
  },
  forbidden_columns: {
    ms: '000000111111232232',
    scores: [],
  },
  odd_even_threat: {
    ms: '3333311555134245',
    scores: [-13, -13, -13, -1000, 4, -13, -13],
  },
  z_threat: {
    ms: '33333555543222060200251661',
    scores: [5, -8, 5, -1000, 6, 5, 5],
  },
  undercut: {
    ms: '333330654544210414405513',
    scores: [-6, -6, -6, -1000, -1000, -8, -9],
  },
  overcut: {
    ms: '355230660352552323326664210500114',
    scores: [-4, -4, -1000, -1000, 4, -1000, -4],
  },
  figure_7: {
    // tests/predicates/fixtures/fixtures.json's T013 fixture (id 14) — 2 independently
    // qualifying, solver-safe columns.
    ms: '325655363345242660221551',
    scores: [7, 8, 7, 7, 8, -1000, 7],
  },
  j_shape: {
    // Freshly harvested via gameSampling.js#playGame (never hand-constructed), verified with
    // ./visualize_board.sh: move 14, scores [-2,-2,-2,--,-2,-2,-2] — a LOST-POSITION board (every
    // legal column concedes a loss), so the answer-set invariant's AMBIGUOUS check is exempt
    // (classifyAnswerSet's LOST-POSITION branch) even though only col 4 of the 6 tied-worst legal
    // columns satisfies the j_shape pattern.
    ms: '24113033336443',
    scores: [-2, -2, -2, -1000, -2, -2, -2],
  },
  claimeven: {
    // requires the live solver (checkClaimevenPredicate runs runClaimevenSimulation).
    ms: '333310012441135316555651622222005',
    scores: [2, -1000, -1000, -1000, 2, -1000, 3],
  },
};

describe('checkPredicate() — T036/T038 centralized sort + scalar sync, all 12 categories', () => {
  // Sanity: every VALID_CATEGORIES entry has a fixture here, and vice versa — if a 13th category
  // is ever added, this test must be extended, not silently skip it.
  test('FIXTURES covers exactly VALID_CATEGORIES', () => {
    assert.deepEqual(
      Object.keys(FIXTURES).slice().sort(),
      [...VALID_CATEGORIES].slice().sort(),
    );
  });

  for (const category of VALID_CATEGORIES) {
    test(`${category}: correctCols is ascending-sorted and correct_col follows FR-019`, async () => {
      const { ms, scores } = FIXTURES[category];
      const result = await checkPredicate(category, ms, scores, solver);
      assert.equal(result.passes, true, `expected ${category} fixture to pass checkPredicate`);
      assert.ok(result.correctCols.length >= 1, `expected ${category} to have a non-empty correctCols`);

      // (a) FR-016a — ascending order.
      const sorted = [...result.correctCols].sort((a, b) => a - b);
      assert.deepEqual(result.correctCols, sorted, `${category}: correctCols must be ascending-sorted`);

      // (b) FR-019 — correct_col === correctCols[0], except the undercut/overcut carve-out.
      if (NO_SCALAR_CATEGORIES.has(category)) {
        assert.equal(result.correct_col, null, `${category}: correct_col must stay NULL regardless of correctCols[0]`);
      } else {
        assert.equal(result.correct_col, result.correctCols[0], `${category}: correct_col must equal correctCols[0]`);
      }
    });
  }
});
