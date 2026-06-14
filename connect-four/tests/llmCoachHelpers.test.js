// Tests for LLM coaching helpers.
// Uses node:test + node:assert/strict (project convention — no Jest).
//
// Covers T04 (checkAllMovesEqual, getGapAndFraming).
// T06/T08/T09/T09b/T10/T11/T12/T13 were removed in Epic 3 Batch 3 (T013) —
// those type-dispatch helpers no longer exist.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../server/classifier.js';
import {
  checkAllMovesEqual,
  getGapAndFraming,
  findMajorThreatWindows,
} from '../server/llmCoachHelpers.js';

// ===========================================================================
// T04 — checkAllMovesEqual
// ===========================================================================

describe('checkAllMovesEqual', () => {
  test('all zeros on empty board → settled', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([0, 0, 0, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, true);
  });

  test('all equal non-zero → not settled', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([1, 1, 1, 1, 1, 1, 1], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, false);
  });

  test('mixed scores → not equal', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([0, 0, 1, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, false);
    assert.equal(result.isSettled, false);
  });

  test('full column excluded from legal cols', () => {
    // "000000" fills col 0 completely (6 moves in same column)
    const board = new Board('000000');
    // After 6 moves in col 0, it's full. Other cols still empty.
    const result = checkAllMovesEqual([0, 0, 0, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, true);
  });

  // T05 regression: headline Type 4 fixture must NOT hit settled
  test('T05 regression: "34" (2-disc board) does NOT hit settled', () => {
    const board = new Board('34');
    // Non-zero preScores (represents a live position, not a settled draw)
    const preScores = [0, 0, 1, 2, 1, 0, 0];
    const result = checkAllMovesEqual(preScores, board);
    assert.equal(result.isSettled, false, 'Type 4 position "34" must not be classified as settled');
    assert.equal(result.allMovesEqual, false, 'Type 4 position "34" must not have all moves equal');
  });
});

// ===========================================================================
// T04 — getGapAndFraming
// ===========================================================================

describe('getGapAndFraming', () => {
  test('standard gap: B is better (positive gap)', () => {
    // preScores from current-player (opponent) perspective
    // score_coached = -preScores
    // A at col 0, B at col 3: preScores[0]=5 (opponent wins), preScores[3]=-5 (coach wins)
    const preScores = [5, 0, 0, -5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = -5, scoreB = 5, gap = 5 - (-5) = 10
    assert.equal(result.gap, 10);
    assert.equal(result.inverted, false);
    assert.equal(result.gapBucket, 'large');
  });

  test('inverted: A is optimal', () => {
    // coach wins after A (-3), loses after B (5)
    const preScores = [-3, 0, 0, 5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = 3, scoreB = -5, gap = -5 - 3 = -8, scoreA >= scoreB → inverted
    assert.equal(result.inverted, true);
    assert.equal(result.gap, -8);
    // Sign change: both non-zero and different → forceBucket = 'large'
    assert.equal(result.gapBucket, 'large');
  });

  test('inverted=true test for FR-008/FR-016 mutual exclusion', () => {
    // Position where A is the optimal move (highest score_coached)
    // preScores: lower = better for coached player
    // A at col 0: score -10 (coach wins strongly)
    // B at col 3: score -5 (coach wins but less)
    const preScores = [-10, 0, 0, -5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = 10, scoreB = 5, gap = 5 - 10 = -5, scoreA >= scoreB → inverted=true
    assert.equal(result.inverted, true);
    assert.equal(result.gap, -5);
    // gap = -5, abs = 5, gapBucket = 'moderate'
    assert.equal(result.gapBucket, 'moderate');
  });

  test('sign-change override: win→loss → large', () => {
    // A: coach wins (preScore -8), B: opponent wins (preScore 9)
    const preScores = [-8, 0, 0, 9, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    assert.equal(result.forceBucket, 'large');
    assert.equal(result.gapBucket, 'large');
  });

  test('sign-change override: win→draw → moderate', () => {
    // A: coach wins (-6), B: draw (0)
    const preScores = [-6, 0, 0, 0, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    assert.equal(result.forceBucket, 'moderate');
    assert.equal(result.gapBucket, 'moderate');
  });

  test('small gap → small bucket', () => {
    const preScores = [2, 0, 0, 4, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = -2, scoreB = -4, gap = -4 - (-2) = -2, abs = 2
    assert.equal(result.gapBucket, 'small');
  });

  test('getGapAndFraming inverted for optimal-A position (FR-008)', () => {
    // A's score_coached (=-preScore) >= B's → inverted=true
    const preScores = [-10, 0, 0, -3, 0, 0, 0]; // A=col0, B=col3
    const result = getGapAndFraming(preScores, 0, 3);
    // score_coached(A) = 10, score_coached(B) = 3
    // 10 >= 3 → inverted=true
    assert.equal(result.inverted, true);
    // gap = 3 - 10 = -7
    assert.equal(result.gap, -7);
  });
});

// ===========================================================================
// findMajorThreatWindows — smoke test
// ===========================================================================

describe('findMajorThreatWindows', () => {
  test('returns empty array for empty board', () => {
    const board = new Board('');
    const result = findMajorThreatWindows(board, 1);
    assert.deepEqual(result, []);
  });

  test('returns player threats for position with horizontal 3-in-a-row', () => {
    // "001122": Red at (col0,r0),(col0,r1),(col1,r0),(col1,r1),(col2,r0),(col2,r1)
    // Actually: 0=col0 disc, 1=col1 disc, etc; move 0 → Red plays col0
    // After "001122": Red has col0r0, col1r0, col2r0 → horizontal major threat at col3r0
    const board = new Board('001122');
    const result = findMajorThreatWindows(board, 1);
    assert.ok(result.length > 0, 'should find at least one threat window');
    const hasPlayer = result.some(w => w.owner === 'player');
    assert.ok(hasPlayer, 'should have player-owned threat window');
  });
});
