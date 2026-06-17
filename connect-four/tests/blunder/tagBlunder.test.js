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
// "05061332" — odd_even_threat positive fixture from classifier tests.
//   Red perspective: odd_even_threat, forced_block.
//   Yellow perspective: immediate_threat only (no odd_even_threat, no claimodd).
//   Source: tests/classifier/classifier.test.js
//
// "3233253335" — allis-claimeven KB worked example. Yellow's Claimeven strategy
//   position. Red perspective does not see claimeven (guard). Both perspectives
//   exercise all 13 detectors including FR-033 IIFE.
//   Source: docs/knowledge-base/allis-claimeven.md
//
// Fixtures for T-006: tests/classifier/fixtures/fixtures.json

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

  // missed_own: no tactical pattern detected — all scores equally bad, no forcing chain
  it('returns missed_own when blunderer loses a pattern', async () => {
    const solver = await createSolverProcess();
    try {
      // '3233333556': all solver scores are -2, no tactical forcing chain exists.
      // Old score-based forced_win incorrectly fired here; correct result is suboptimal_move.
      const result = await tagBlunder('3233333556', 0, 2, solver);
      assert.equal(result.tag, 'suboptimal_move');
      assert.equal(result.direction, 'missed_own');
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });

  // enabled_opponent: wrong move gives opponent immediate_threat (Step 2 fires)
  it('returns enabled_opponent when opponent gains immediate threat', async () => {
    const solver = await createSolverProcess();
    try {
      const result = await tagBlunder('010263', 5, 3, solver);
      assert.equal(result.tag, 'immediate_threat');
      assert.equal(result.direction, 'enabled_opponent');
      assert.ok(result.reason.startsWith('matched enabled_opponent:'));
    } finally {
      solver.destroy();
    }
  }, { timeout: 60_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-002 / T028 — missed_own takes priority over Step 4 enabled_opponent
// ─────────────────────────────────────────────────────────────────────────────
describe('tagBlunder - priority', () => {
  // Step 3 (missed_own) fires before Step 4 (enabled_opponent).
  // "021353342445" pre-move: Red has z_threat (among others).
  // Wrong col 0 loses z_threat. Step 2 does not fire (opponent not immediately
  // threatening). Step 3 fires before Step 4.
  it('missed_own takes priority over enabled_opponent', async () => {
    const solver = await createSolverProcess();
    try {
      // correctCol = argmax of solver scores for this position
      const scores = await solver.query('021353342445');
      const correctCol = scores.indexOf(Math.max(...scores)); // col 4

      const result = await tagBlunder('021353342445', 0, correctCol, solver);
      assert.equal(result.direction, 'missed_own');
      assert.equal(result.tag, 'z_threat');
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
      // "05061332": Red perspective has odd_even_threat and forced_block;
      // Yellow perspective has immediate_threat but NOT odd_even_threat
      const tags = await classifyPattern('05061332', 2, solver);
      assert.ok(!tags.has('odd_even_threat'),
        'odd_even_threat is Red-only, must not appear from Yellow perspective');

      // Sanity check: Red perspective does see odd_even_threat (proves detection works)
      const redTags = await classifyPattern('05061332', 1, solver);
      assert.ok(redTags.has('odd_even_threat'),
        'odd_even_threat should be detected from Red perspective');
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
