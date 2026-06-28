/**
 * toFeatureVector projection tests — Story B (Epic 040).
 *
 * Deterministic, solver-free: a synthetic `promptData.lookahead` is fed through
 * `toFeatureVector` and the projected `lookahead` block is asserted. Covers the
 * Story B shape changes:
 *   - symmetric `categoryExamples` (bestNovel / playedNovel, each pruned when empty)
 *   - `reachability` projected through (pruned when absent)
 *   - `edgeType` always present when lookahead ran
 *   - `perCategory` REMOVED from the feature vector (must never appear)
 *
 * Tests B-T2 / B-T3 / B-T4 (projection direction handling) per data-model §5.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toFeatureVector } from '../explainContext.js';

// Minimal promptData carrying only what toFeatureVector's lookahead block needs.
function makePromptData(lookahead) {
  return {
    movestring: '4453', // arbitrary valid movestring (only used for threatStats colHeights guard)
    perspective: 1,
    lookahead,
  };
}

describe('toFeatureVector — Story B symmetric categoryExamples projection', () => {
  it('B-T2: both directions present → bestNovel and playedNovel both projected with realizedOnPly', () => {
    const la = {
      case: 2,
      bestOutcome: 'win_with_best_play',
      postBlunderOutcome: 'draw_with_best_play',
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 5 }, played: { outcome: 'draw', pliesToEnd: null } },
      edgeType: 'tactical',
      categoryExamples: [
        {
          tag: 'minor_threat',
          bestNovel: [{ cells: ['c2r4'], realizedOnPly: 1 }],
          playedNovel: [{ cells: ['c5r2'], realizedOnPly: 3 }],
          novelInstances: 2,
        },
      ],
      oppCategoryExamples: [],
    };
    const fv = toFeatureVector(makePromptData(la), { prune: false });
    const entry = fv.lookahead.categoryExamples[0];
    assert.equal(entry.tag, 'minor_threat');
    assert.equal(entry.owner, 'player');
    assert.deepEqual(entry.bestNovel, [{ cells: ['c2r4'], realizedOnPly: 1 }]);
    assert.deepEqual(entry.playedNovel, [{ cells: ['c5r2'], realizedOnPly: 3 }]);
    assert.equal(entry.novelInstances, 2);
  });

  it('B-T3: only best direction → playedNovel projected as undefined (pruned away when prune:true)', () => {
    const la = {
      case: 2,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 5 }, played: { outcome: 'win', pliesToEnd: 7 } },
      edgeType: 'marginal',
      categoryExamples: [
        { tag: 'double_threat', bestNovel: [{ cells: ['c4r2'], realizedOnPly: 1 }], playedNovel: [], novelInstances: 1 },
      ],
      oppCategoryExamples: [],
    };
    const raw = toFeatureVector(makePromptData(la), { prune: false });
    assert.equal(raw.lookahead.categoryExamples[0].playedNovel, undefined);
    assert.deepEqual(raw.lookahead.categoryExamples[0].bestNovel, [{ cells: ['c4r2'], realizedOnPly: 1 }]);

    const pruned = toFeatureVector(makePromptData(la), { prune: true });
    assert.ok(!('playedNovel' in pruned.lookahead.categoryExamples[0]), 'empty playedNovel pruned away');
    assert.ok('bestNovel' in pruned.lookahead.categoryExamples[0], 'bestNovel survives');
  });

  it('B-T4: only played direction → bestNovel projected as undefined (pruned away when prune:true)', () => {
    const la = {
      case: 2,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 5 }, played: { outcome: 'win', pliesToEnd: 7 } },
      edgeType: 'marginal',
      categoryExamples: [
        { tag: 'undercut', bestNovel: [], playedNovel: [{ cells: ['c3r1'], realizedOnPly: 2 }], novelInstances: 1 },
      ],
      oppCategoryExamples: [],
    };
    const raw = toFeatureVector(makePromptData(la), { prune: false });
    assert.equal(raw.lookahead.categoryExamples[0].bestNovel, undefined);
    assert.deepEqual(raw.lookahead.categoryExamples[0].playedNovel, [{ cells: ['c3r1'], realizedOnPly: 2 }]);

    const pruned = toFeatureVector(makePromptData(la), { prune: true });
    assert.ok(!('bestNovel' in pruned.lookahead.categoryExamples[0]), 'empty bestNovel pruned away');
    assert.ok('playedNovel' in pruned.lookahead.categoryExamples[0], 'playedNovel survives');
  });
});

describe('toFeatureVector — Story B edgeType / reachability / perCategory removal', () => {
  it('edgeType is always projected when lookahead ran (truthy enum string)', () => {
    const la = {
      case: 1,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 2 }, played: { outcome: 'loss', pliesToEnd: 18 } },
      edgeType: 'tactical',
      categoryExamples: [],
      oppCategoryExamples: [],
    };
    const fv = toFeatureVector(makePromptData(la), { prune: true });
    assert.equal(fv.lookahead.edgeType, 'tactical');
  });

  it('reachability projected through when present on la', () => {
    const la = {
      case: 1,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 2 }, played: { outcome: 'loss', pliesToEnd: 18 } },
      edgeType: 'tactical',
      reachability: { best: { floor: 'win', ceiling: 'win' }, played: { floor: 'loss', ceiling: 'draw' } },
      categoryExamples: [],
      oppCategoryExamples: [],
    };
    const fv = toFeatureVector(makePromptData(la), { prune: true });
    assert.deepEqual(fv.lookahead.reachability, {
      best: { floor: 'win', ceiling: 'win' },
      played: { floor: 'loss', ceiling: 'draw' },
    });
  });

  it('reachability absent from projection when absent on la (pruned)', () => {
    const la = {
      case: 2,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 5 }, played: { outcome: 'win', pliesToEnd: 7 } },
      edgeType: 'marginal',
      categoryExamples: [],
      oppCategoryExamples: [],
    };
    const fv = toFeatureVector(makePromptData(la), { prune: true });
    assert.ok(!('reachability' in fv.lookahead), 'reachability must be absent when not on la');
  });

  it('perCategory is REMOVED — never appears in the projected lookahead block (even with tallyComparison present)', () => {
    const la = {
      case: 2,
      outcomeTiming: { best: { outcome: 'win', pliesToEnd: 5 }, played: { outcome: 'win', pliesToEnd: 7 } },
      edgeType: 'marginal',
      categoryExamples: [],
      oppCategoryExamples: [],
      // tallyComparison still rides on la (for rawLookahead/prompt_data), but must NOT be projected
      tallyComparison: [{ pattern: 'minor_threat', bestInstances: 2, playedInstances: 1 }],
    };
    const rawFv = toFeatureVector(makePromptData(la), { prune: false });
    assert.ok(!('perCategory' in rawFv.lookahead), 'perCategory must not be projected (prune:false)');
    const prunedFv = toFeatureVector(makePromptData(la), { prune: true });
    assert.ok(!('perCategory' in prunedFv.lookahead), 'perCategory must not be projected (prune:true)');
  });
});

// ---------------------------------------------------------------------------
// Story C tests — threatStats totals + playedCol (T029)
// ---------------------------------------------------------------------------

describe('toFeatureVector — Story C threatStats totals + playedCol', () => {
  // Helper: build a minimal promptData with a synthetic threatStats.pre snapshot.
  function makePromptDataWithThreats(threatSnapPre, playedCol = null) {
    return {
      movestring: '4453',
      perspective: 1,
      ...(playedCol != null ? { playedCol } : {}),
      bestCol: 3,
      threatStats: { pre: threatSnapPre, best: null, played: null },
    };
  }

  it('C-T1: 2 parity-aligned + 1 non-parity major → playerMajorTotal = 3', () => {
    const snap = {
      playerMajorParityAligned: { count: 2, cells: ['c3r3', 'c4r3'] },
      playerMajorNonParity:     { count: 1, cells: ['c5r4'] },
    };
    const fv = toFeatureVector(makePromptDataWithThreats(snap), { prune: false });
    assert.equal(fv.threatStats.pre.playerMajorTotal, 3);
  });

  it('C-T2: 0 major threats → playerMajorTotal absent (even with prune:false)', () => {
    const snap = {
      playerMajorParityAligned: { count: 0, cells: [] },
      playerMajorNonParity:     { count: 0, cells: [] },
    };
    const fv = toFeatureVector(makePromptDataWithThreats(snap), { prune: false });
    assert.ok(!('playerMajorTotal' in fv.threatStats.pre),
      'playerMajorTotal must be absent when total is 0, even with prune:false');
  });

  it('C-T3: playerMajorParityAligned absent + playerMajorNonParity.count=1 → playerMajorTotal=1', () => {
    // "Zero parity-aligned majors ≠ zero majors" — non-parity bucket alone keeps total > 0
    const snap = {
      playerMajorNonParity: { count: 1, cells: ['c2r2'] },
      // playerMajorParityAligned deliberately absent
    };
    const fv = toFeatureVector(makePromptDataWithThreats(snap), { prune: false });
    assert.equal(fv.threatStats.pre.playerMajorTotal, 1,
      'playerMajorNonParity alone should give playerMajorTotal=1');
  });

  it('C-T4: featureVector.playedCol matches the input playedCol', () => {
    const snap = {};
    const fv = toFeatureVector(makePromptDataWithThreats(snap, 2), { prune: false });
    assert.equal(fv.playedCol, 2, 'playedCol must pass through to the feature vector');
  });
});
