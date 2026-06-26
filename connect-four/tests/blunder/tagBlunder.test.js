// tagBlunder tests — T-001 through T-006 from spec 023
//
// Movestring sources:
//
// "00113" — classifier fixture #4 (forced_block). Blunderer=Yellow, wrongCol=0
//   (fills column that doesn't block Red's threat at col 2).
//   Source: tests/classifier/fixtures/fixtures.json
//   Expected: { tag: 'forced_block', direction: 'defensive_miss' }
//
// "3233333556" — claimeven integration test fixture + KB allis-claimeven entry.
//   Red's turn (10 moves), all solver scores ≤ 0 → forced_win. Wrong col 0
//   gives the opponent an even-height column, changing the parity landscape:
//   pre-move has forced_win, post-move (col 0) does not.
//   Source: tests/integration/claimeven.test.js + solver verification
//   Expected: { tag: 'forced_win', direction: 'missed_own' }
//
// "010263" — classifier fixture #12 (forbidden_columns). Blunderer=Red,
//   wrongCol=5 gives Yellow an immediate_threat at col 4. Step 2 fires before
//   Step 3 (forced_win also pre-present but Step 2 wins).
//   Source: tests/classifier/classifier.test.js + solver verification
//   Expected: { tag: 'immediate_threat', direction: 'enabled_opponent' }
//
// "021353342445" — figure-7 integration test fixture. Pre-move Red has
//   immediate_threat, z_threat, odd_even_threat. Wrong col 0 loses z_threat.
//   Source: tests/classifier/classifier.test.js (classifyAll figure-7 fixture)
//   Expected: { tag: 'z_threat', direction: 'missed_own' }
//
// "33333444446630664021" — odd_even_threat structural fixture (Red's turn, 20 moves).
//   Minor Red threats exist at both parities with at least one even-row minor
//   promotable (wrong choice). Col2 promotes only the odd-row minor at (r4,c5)
//   without touching the even-row alternative. Used here only to verify the
//   Yellow-only guard; Red positive detection is covered by classifier.test.js.
//
// "3233253335" — allis-claimeven KB worked example. Yellow's Claimeven strategy
//   position. Red perspective does not see claimeven (guard). Both perspectives
//   exercise all 13 detectors including FR-033 IIFE.
//   Source: docs/knowledge-base/allis-claimeven.md
//
// Fixtures for T-006: tests/classifier/fixtures/fixtures.json
//
// "051526" — immediate_threat:missed_own fixture. Red's turn (6 moves).
//   Red has 3-in-a-row at row 0, cols 0–2; immediate win at col 3 (score 18).
//   Red plays col 4 instead. Pre-blunder tags include immediate_threat.
//   correctCol=3 verified by solver (argmax of scores).
//   Expected: { tag: 'immediate_threat', direction: 'missed_own' }
//
// "33333344" — double_threat:missed_own fixture. Red's turn (8 moves).
//   Col 3 is full; col 4 has 2 discs. Pre-blunder tags: empty (no prior pattern).
//   Playing col 2 (correctCol, score 16) creates double_threat at cols [1,5].
//   Playing col 5 also creates double_threat at cols [2,6]. wrongCol=0 (score 2).
//   Expected: { tag: 'double_threat', direction: 'missed_own' }
//
// "01121002" — figure_7:missed_own fixture. Red's turn (8 moves).
//   Red has 4 of 5 figure_7 pieces (r0c0, r1c1, r2c0, r2c1); pre-blunder tags: j_shape.
//   Playing col 2 (correctCol, score 14) places Red at r2c2, completing the figure_7.
//   Threat cells: (r2,c3) and (r3,c3); opponent has no reachable threat in col 3 at
//   row ≤ 2 (no undercut). wrongCol=3 (score -3).
//   Expected: { tag: 'figure_7', direction: 'missed_own' }

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  classify,
  classifyPattern,
  tagBlunder,
} from '../../server/classifier.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// T-001 / T027 — tagBlunder pattern detection
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - pattern detection', () => {
  // defensive_miss: pre-move has forced_block, blunderer plays elsewhere
  it('returns defensive_miss when blunderer had forced_block', async () => {
    const solver = await createSolverProcess();
    try {
      const result = await tagBlunder('00113', 0, 2, solver);
      assert.equal(result.tag, 'forced_block');
      assert.equal(result.direction, 'defensive_miss');
      assert.ok(result.reason.startsWith('matched defensive_miss:'));
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  // missed_own: no forcing chain, but correctCol builds a first-class parity-aware threat.
  it('returns major_threat_nonparity:missed_own when correctCol builds a latent major', async () => {
    const solver = await createSolverProcess();
    try {
      // '3233333556': no forcing chain, but playing correctCol=2 builds a latent off-parity
      // major threat for the blunderer at c5r2 that playedCol=0 does not. Parity-aware threats
      // are now first-class blunder tags (they rank just above the score-only fallbacks).
      const result = await tagBlunder('3233333556', 0, 2, solver);
      assert.equal(result.tag, 'major_threat_nonparity');
      assert.equal(result.direction, 'missed_own');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  // defensive_miss: Yellow ALREADY threatens an immediate win at col 4 before Red
  // moves (it is the forbidden_columns fixture). Red plays col 5 and fails to block.
  // Because the threat pre-existed the move, this is a defensive miss, NOT an
  // "enabled_opponent" threat. (Pre-rewrite this fixture asserted enabled_opponent,
  // which mislabeled a pre-existing threat as one the blunder created.)
  it('returns defensive_miss when blunderer fails to block a pre-existing threat', async () => {
    const solver = await createSolverProcess();
    try {
      const result = await tagBlunder('010263', 5, 3, solver);
      assert.equal(result.tag, 'forced_block');
      assert.equal(result.direction, 'defensive_miss');
      assert.ok(result.reason.startsWith('matched defensive_miss:'));
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-002 / T028 — missed_own takes priority over Step 4 enabled_opponent
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - priority', () => {
  // Step 1.5 (immediate_threat:missed_own) fires before Step 4 (enabled_opponent).
  // "021353342445" pre-move: Red has immediate_threat (among z_threat, odd_even_threat).
  // Step 1.5 fires because pMovesBlunderer.has('immediate_threat') — Red had a winning
  // move and didn't take it. This also demonstrates missed_own > enabled_opponent priority.
  it('missed_own takes priority over enabled_opponent', async () => {
    const solver = await createSolverProcess();
    try {
      // correctCol = argmax of solver scores for this position
      const scores = await solver.query('021353342445');
      const correctCol = scores.indexOf(Math.max(...scores)); // col 4

      const result = await tagBlunder('021353342445', 0, correctCol, solver);
      assert.equal(result.direction, 'missed_own');
      assert.equal(result.tag, 'immediate_threat');
      assert.ok(result.reason.startsWith('matched missed_own:'));
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-003 / T029 — solver error fallback
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - solver error', () => {
  it('resolves with solver error fallback on solver failure', async () => {
    const mockSolver = {
      query: () => Promise.reject(new Error('mock solver failure')),
    };
    const result = await tagBlunder('111222', '3', '4', mockSolver);
    assert.equal(result.tag, 'suboptimal_move');
    assert.equal(result.direction, 'missed_own');
    assert.ok(result.reason.startsWith('solver error:'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-004 / T030 — Red-only patterns not in Yellow perspective
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyPattern - player-only guards', () => {
  it('odd_even_threat is not in Yellow perspective results', async () => {
    const solver = await createSolverProcess();
    try {
      // Use the structural fixture '33333444446630664021' with player=2 (Yellow).
      // From Yellow's perspective the Red-only guard must suppress detection.
      const tags = await classifyPattern('33333444446630664021', 2, solver);
      assert.ok(!tags.has('odd_even_threat'),
        'odd_even_threat is Red-only, must not appear from Yellow perspective');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  // ───────────────────────────────────────────────────────────────────────────
  // T-005 / T031 — Yellow-only pattern not in Red perspective
  // ───────────────────────────────────────────────────────────────────────────
  it('claimeven is not in Red perspective results', async () => {
    const solver = await createSolverProcess();
    try {
      // "3233253335": allis-claimeven KB worked example; Yellow wins via
      // Claimeven strategy. detectClaimeven explicitly guards perspective !== 2.
      const tags = await classifyPattern('3233253335', 1, solver);
      assert.ok(!tags.has('claimeven'),
        'claimeven is Yellow-only, must not appear from Red perspective');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-007 — immediate_threat:missed_own
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - immediate_threat:missed_own', () => {
  it('returns missed_own when blunderer had immediate_threat and did not take it', async () => {
    const solver = await createSolverProcess();
    try {
      // Red has 3-in-a-row at row 0 cols 0–2; immediate win at col 3 (score 18).
      // Red plays col 4 instead. Step 1.5 fires on pMovesBlunderer.has('immediate_threat').
      const result = await tagBlunder('051526', 4, 3, solver);
      assert.equal(result.tag, 'immediate_threat');
      assert.equal(result.direction, 'missed_own');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-008 — double_threat:missed_own
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - double_threat:missed_own', () => {
  it('returns missed_own when correct move would have built an un-undercut double threat', async () => {
    const solver = await createSolverProcess();
    try {
      // Col 3 full, col 4 has 2 discs. Pre-blunder tags: empty.
      // correctCol=2 (score 16) creates double_threat at cols [1,5].
      // wrongCol=0 (score 2) does not.
      const result = await tagBlunder('33333344', 0, 2, solver);
      assert.equal(result.tag, 'double_threat');
      assert.equal(result.direction, 'missed_own');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-009 — figure_7:missed_own
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - figure_7:missed_own', () => {
  it('returns missed_own when correct move would have completed an un-undercut figure_7', async () => {
    const solver = await createSolverProcess();
    try {
      // Red has 4 of 5 figure_7 pieces (r0c0, r1c1, r2c0, r2c1). Pre-blunder tags: j_shape.
      // correctCol=2 (score 14) places Red at r2c2, completing the figure_7.
      // Threat cells (r2c3, r3c3); opponent has no reachable threat in col 3 at row ≤ 2.
      // wrongCol=3 (score -3).
      const result = await tagBlunder('01121002', 3, 2, solver);
      assert.equal(result.tag, 'figure_7');
      assert.equal(result.direction, 'missed_own');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-006 / T032 — classify() output unchanged after perspective retrofit
// ─────────────────────────────────────────────────────────────────────────────
describe('classify() regression', () => {
  it('classify() output is unchanged after perspective retrofit', () => {
    const fixtures = JSON.parse(
      readFileSync(join(__dir, '../classifier/fixtures/fixtures.json'), 'utf8')
    );
    for (const f of fixtures) {
      const result = classify(f.moves, f.candidateCol, f.scores);
      assert.equal(
        result.tag,
        f.expectedTag,
        `Fixture "${f.description}": expected "${f.expectedTag}" got "${result.tag}"`
      );
    }
  });
});
