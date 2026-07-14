// DEV-only QA board fixtures + inline-puzzle builder. Imported only by the DEV board injector
// (src/components/DevBoardInjector.jsx) and ChallengeScreen's DEV branch, both of which are
// import.meta.env.DEV-gated, so this module is dead-code-eliminated from the production bundle.
//
// Every board + metadata below is copied VERBATIM from the cited passing integration test
// (never hand-constructed — CLAUDE.md/I12). The anti-drift guard in tests/unit/devFixtures.test.js
// asserts each single-answer fixture still carries the metadata its category requires.

// Builds the inline puzzle object ChallengeScreen consumes — identical shape to the
// `confirmationChallenges` mapping in ChallengeScreen.loadPuzzles().
export function buildDevPuzzle({ movestring, category, correctCol, highlightMetadata }) {
  return {
    id: `dev-${movestring}`,
    category,
    move_string: movestring,
    interaction_mode: 'single_move',
    highlight_metadata: highlightMetadata ?? null,
    correct_col: Number.isInteger(correctCol) ? correctCol : null,
    user_player: undefined,
  };
}

export const DEV_QA_FIXTURES = [
  // z_threat — OI-1 repro board 1. taughtCol 6; probe col 0 → WRONG (col 0 ties the top solver
  // score but is not the taught z-threat). Source: tests/integration/evaluateMoveMultiSolution.test.js
  // (T009) + singleAnswerCategoriesAccepted.test.js (T008), highlightMetadata from detectZThreat.
  {
    label: 'z_threat — OI-1 board 1 (probe col 0 → WRONG; taught col 6)',
    movestring: '3333302444422222060315555054',
    category: 'z_threat',
    highlightMetadata: { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 },
    taughtCol: 6,
  },
  // z_threat — OI-1 repro board 2. taughtCol 0; probe col 0 → CORRECT (not "Suboptimal", even
  // though col 2 wins faster). Source: same tests as board 1.
  {
    label: 'z_threat — OI-1 board 2 (probe col 0 → CORRECT, not Suboptimal; taught col 0)',
    movestring: '3333334512266550121166',
    category: 'z_threat',
    highlightMetadata: { column: 0, fromRow: 1, toRow: 3, badgeCount: 3 },
    taughtCol: 0,
  },
  // claimeven — taughtCol 2; probe any non-2 (e.g. col 0) → WRONG.
  // Source: tests/integration/claimeven.test.js ('3233333556', correctCol 2).
  {
    label: 'claimeven (probe col 2 → CORRECT; any other col → WRONG)',
    movestring: '3233333556',
    category: 'claimeven',
    correctCol: 2,
    taughtCol: 2,
  },
  // figure_7 — taughtCol 3. NOTE: tests/integration/figure7_jshape.test.js's F7_PRE
  // ('041015021326') is a hand-built board used ONLY to unit-test the static detectFigure7()
  // shape-matcher — it is not a solver-reachable position (its bottom row requires 5
  // consecutive Gray discs, i.e. Gray already won several moves earlier), so the real c4solver
  // rejects it with "Invalid position" the moment this DEV fixture drives it through the live
  // /api/evaluate-move endpoint (which calls solver.query, unlike the unit test). Replaced with
  // the solver-verified board from docs/knowledge-base/community-figure-7.md's worked example
  // ("43222430403", scores confirmed all-Yellow-loses) minus its last move — its correctCol=3 is
  // independently confirmed by checkFigure7Predicate() (server/candidate-generator.js), the same
  // production detector real puzzles are authored from.
  {
    label: 'figure_7 (probe col 3 → CORRECT; any other col → WRONG)',
    movestring: '4322243040',
    category: 'figure_7',
    correctCol: 3,
    taughtCol: 3,
  },
  // j_shape — taughtCol 1. Source: tests/integration/figure7_jshape.test.js:39 (J_PRE, correctCol 1).
  {
    label: 'j_shape (probe col 1 → CORRECT; any other col → WRONG)',
    movestring: '04101502',
    category: 'j_shape',
    correctCol: 1,
    taughtCol: 1,
  },
  // undercut — avoid-the-pattern. Killing col is 4; probe col 4 → WRONG, any non-killing col
  // (e.g. col 0) → CORRECT.
  // NOTE: the previously-cited source ('334455221100' from
  // tests/integration/undercut_overcut.test.js:135-168) is a hand-built board used ONLY to
  // unit-test evalUndercut() directly (which reads highlightMetadata and never touches the
  // solver) — it is not a solver-reachable position (bottom row is 6 discs of the same player
  // in a row, i.e. already won several moves earlier), so the real c4solver rejects it with
  // "Invalid position" the moment this DEV fixture drives it through the live
  // /api/evaluate-move endpoint (which always calls solver.query first, regardless of
  // category). Replaced with a solver-verified, actually-reachable board found via
  // self-play (gameSampling.js playGame) + checkUndercutPredicate (server/candidate-generator.js,
  // the same production detector real puzzles are authored from).
  {
    label: 'undercut (probe killing col 4 → WRONG; any other col → CORRECT)',
    movestring: '33333222220056056',
    category: 'undercut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 4, row: 1, role: 'killing_threat' },
        { column: 4, row: 2, role: 'dead_threat' },
      ],
    },
    taughtCol: 0,
  },
  // overcut — taughtCol 4 (major_threat col); probe col 4 → CORRECT, any non-major col
  // (e.g. col 0) → WRONG.
  // NOTE: the previously-cited source ('33445522110033') has the same defect as the undercut
  // fixture above (unit-tests evalOvercut() directly, which never touches the solver; the
  // board itself is solver-illegal — an accidental 6-in-a-row on the bottom row). Replaced with
  // a solver-verified, actually-reachable board found the same way (playGame +
  // checkOvercutPredicate).
  {
    label: 'overcut (probe major col 4 → CORRECT; any other col → WRONG)',
    movestring: '333332222200560560655351',
    category: 'overcut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 4, row: 2, role: 'neutralised_threat' },
        { column: 4, row: 3, role: 'major_threat' },
      ],
    },
    taughtCol: 4,
  },
];
