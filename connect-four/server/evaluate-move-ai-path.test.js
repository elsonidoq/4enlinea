// Server unit test: evaluate-move AI path (classifyAiMove + PRIORITY)
//
// Run with: node --test connect-four/server/evaluate-move-ai-path.test.js
//
// Fixture movestrings:
//
// "3344" + col 2 = "33442" — from tests/classifier/fixtures/fixtures.json.
//   5 moves (Red just moved), classifyPattern from Red's perspective returns a Map
//   with {immediate_threat, double_threat}.  With PRIORITY, the expected pick is
//   "immediate_threat" (first in the list).  This is the double_threat fixture #5
//   from the classifier test suite.
//
// "00113" + col 2 = "001132" — forced_block fixture #4.
//   After Yellow blocks at col 2, no patterns remain on the board.
//   classifyPattern returns an empty Map → pickPriorityTag returns null.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAiMove, pickPriorityTag, AI_PATTERN_PRIORITY } from './classifyAiMove.js';
import { createSolverProcess } from './c4solver-wrapper.js';

// ── Pure-function tests (no solver) ──────────────────────────────────────────

describe('pickPriorityTag — priority ordering', () => {
  it('picks immediate_threat over all lower-priority tags', () => {
    const tags = new Set(['immediate_threat', 'double_threat', 'forced_win', 'forced_block',
      'forbidden_columns', 'z_threat', 'odd_even_threat', 'claimeven',
      'figure_7', 'j_shape', 'overcut', 'undercut']);
    assert.equal(pickPriorityTag(tags), 'immediate_threat');
  });

  it('picks double_threat when immediate_threat is absent', () => {
    const tags = new Set(['double_threat', 'forced_block', 'z_threat']);
    assert.equal(pickPriorityTag(tags), 'double_threat');
  });

  it('picks forced_win when higher-priority tags are absent', () => {
    const tags = new Set(['forced_win', 'claimeven']);
    assert.equal(pickPriorityTag(tags), 'forced_win');
  });

  it('picks forced_block when only it exists', () => {
    const tags = new Set(['forced_block']);
    assert.equal(pickPriorityTag(tags), 'forced_block');
  });

  it('returns null for empty tag set', () => {
    assert.equal(pickPriorityTag(new Set()), null);
  });

  it('handles single middle-priority tag', () => {
    const tags = new Set(['z_threat']);
    assert.equal(pickPriorityTag(tags), 'z_threat');
  });

  it('covers every tag in PRIORITY (the array is complete)', () => {
    const expected = [
      'immediate_threat', 'double_threat', 'forced_win', 'forced_block',
      'forbidden_columns', 'z_threat', 'odd_even_threat', 'claimeven',
      'figure_7', 'j_shape', 'overcut', 'undercut',
    ];
    assert.deepEqual(AI_PATTERN_PRIORITY, expected);
    assert.equal(AI_PATTERN_PRIORITY.length, 12);
  });
});

// ── Integration tests (real solver) ──────────────────────────────────────────

describe('classifyAiMove — solver integration', () => {
  let solver;

  before(async () => {
    solver = await createSolverProcess();
  });

  after(() => {
    if (solver && solver.process) {
      solver.process.kill();
    }
  });

  // Fixture: "3344" + col 2 = "33442"
  // Source: tests/classifier/fixtures/fixtures.json — double_threat fixture #5.
  // classifyPattern("33442", 1, solver) returns Map{immediate_threat, double_threat}.
  it('returns "immediate_threat" for double-threat fixture (priority pick)', async () => {
    const patternTag = await classifyAiMove('3344', 2, solver);
    // PRIORITY picks immediate_threat over double_threat when both match.
    assert.equal(patternTag, 'immediate_threat');
  });

  // Fixture: "00113" + col 2 = "001132"
  // Source: tests/classifier/fixtures/fixtures.json — forced_block fixture #4.
  // After Yellow blocks at col 2, no patterns remain. classifyPattern returns empty Map.
  it('returns null for forced-block post-move (no patterns remain after block)', async () => {
    const patternTag = await classifyAiMove('00113', 2, solver);
    assert.equal(patternTag, null);
  });

  // Fixture: "00113" + col 0 (wrong move — misses the block)
  // After Yellow plays col 0 instead of the forced block, Red's threat at col 2
  // is now a winning threat. classifyPattern from Yellow's perspective should
  // detect that the opponent (Red) has immediate_threat.
  // Actually, classifyPattern is called from the AI's perspective (Yellow=2),
  // and after col 0, the board has "001130" (6 moves). From Yellow's perspective,
  // Yellow just missed a block, so patterns will be different.
  // This is a secondary path — skip for now since the first two cover the
  // main AI-move scenarios.
});
