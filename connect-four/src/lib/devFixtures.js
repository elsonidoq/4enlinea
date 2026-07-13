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
  // figure_7 — taughtCol 2. Source: tests/integration/figure7_jshape.test.js:27 (F7_PRE, correctCol 2).
  {
    label: 'figure_7 (probe col 2 → CORRECT; any other col → WRONG)',
    movestring: '041015021326',
    category: 'figure_7',
    correctCol: 2,
    taughtCol: 2,
  },
  // j_shape — taughtCol 1. Source: tests/integration/figure7_jshape.test.js:39 (J_PRE, correctCol 1).
  {
    label: 'j_shape (probe col 1 → CORRECT; any other col → WRONG)',
    movestring: '04101502',
    category: 'j_shape',
    correctCol: 1,
    taughtCol: 1,
  },
  // undercut — avoid-the-pattern. Killing col is 3; probe col 3 → WRONG, any non-killing col
  // (e.g. col 0) → CORRECT. Source: tests/integration/undercut_overcut.test.js:135-168.
  {
    label: 'undercut (probe killing col 3 → WRONG; any other col → CORRECT)',
    movestring: '334455221100',
    category: 'undercut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 3, row: 2, role: 'killing_threat' },
        { column: 3, row: 4, role: 'dead_threat' },
      ],
    },
    taughtCol: 0,
  },
  // overcut — taughtCol 4 (major_threat col); probe col 4 → CORRECT, any non-major col
  // (e.g. col 0) → WRONG. Source: tests/integration/undercut_overcut.test.js:174-210.
  {
    label: 'overcut (probe major col 4 → CORRECT; any other col → WRONG)',
    movestring: '33445522110033',
    category: 'overcut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 4, row: 1, role: 'neutralised_threat' },
        { column: 4, row: 3, role: 'major_threat' },
      ],
    },
    taughtCol: 4,
  },
];
