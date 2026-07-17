// Spec 042 (Mistake Review Unification), US6 / T051.
// Automated regression guard for the SplitReveal board-zoom stability bug
// (FR-022, SC-009, contracts/split-reveal-zoom-contract.md). No simulated
// pointermove events needed — computeFrozenBoardWidth is a pure function of
// (containerH, initialSplitPct[, isDragging]); it never consumes the live
// splitPct/topPx that changes continuously during a drag, so it is invariant
// to drag position by construction. This test asserts that invariant, plus
// that it genuinely responds to a real container-height change (so the guard
// can't be satisfied by a function that just always returns a constant).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeFrozenBoardWidth } from '../../src/lib/useDragSplit.js';

const CONTAINER_H = 800;
const INITIAL_SPLIT_PCT = 40;
const MIN_TOP_PCT = 30;
const MAX_TOP_PCT = 80;

describe('computeFrozenBoardWidth (spec 042 US6, FR-022, SC-009)', () => {
  it('is invariant across the full simulated drag range (minTopPct..maxTopPct) while isDragging is true', () => {
    const baseline = computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true);

    // Simulate a drag sweeping splitPct across the whole configured band —
    // computeFrozenBoardWidth never takes splitPct as an argument at all, so
    // this loop asserts the "frozen" contract directly: no matter where the
    // (simulated) live drag position is, the function's inputs
    // (containerH, initialSplitPct) never change mid-drag, so its output must
    // not change either.
    for (let simulatedSplitPct = MIN_TOP_PCT; simulatedSplitPct <= MAX_TOP_PCT; simulatedSplitPct += 5) {
      void simulatedSplitPct; // not a valid input to the frozen function — that's the point
      const sample = computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true);
      assert.equal(sample, baseline, `boardW changed while isDragging at simulated splitPct=${simulatedSplitPct}`);
    }
  });

  it('is invariant regardless of the isDragging flag, for the same containerH/initialSplitPct', () => {
    const whileDragging = computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true);
    const notDragging = computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, false);
    assert.equal(whileDragging, notDragging);
  });

  it('DOES change for a genuinely different containerH (real resize)', () => {
    const before = computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true);
    const afterResize = computeFrozenBoardWidth(CONTAINER_H * 1.5, INITIAL_SPLIT_PCT, true);
    assert.notEqual(before, afterResize);
  });

  it('DOES change for a genuinely different initialSplitPct (different pane opened at a different split)', () => {
    const at40 = computeFrozenBoardWidth(CONTAINER_H, 40, true);
    const at70 = computeFrozenBoardWidth(CONTAINER_H, 70, true);
    assert.notEqual(at40, at70);
  });

  it('returns 0 for a zero/unset containerH (pre-measurement state)', () => {
    assert.equal(computeFrozenBoardWidth(0, INITIAL_SPLIT_PCT, true), 0);
    assert.equal(computeFrozenBoardWidth(null, INITIAL_SPLIT_PCT, true), 0);
  });

  it('returns 0 when the implied pane height is too short to fit a board (targetH <= 57)', () => {
    assert.equal(computeFrozenBoardWidth(50, 10, true), 0);
  });
});
