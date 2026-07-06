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
import { toFeatureVector, buildOpeningReason } from '../explainContext.js';
import { detectCenterDominance } from '../centerDominance.js';

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

// ── B5: buildOpeningReason — the pure opening-provenance section seam (opening-theory PART B) ──
// Solver-free: it takes the scores the caller already has. All boards are real KB opening lines
// verified with ./visualize_board.sh (see task-B5-report.md); scores are 0-indexed columns.
describe('buildOpeningReason — opening-provenance prompt section', () => {
  // `333331` (Green to move): unique winning best at col1 (+1); a single-id candlesticks prefix.
  const CANDLESTICKS_SCORES = [-2, 1, -2, -3, 0, 0, -3];
  // `3333` (Green to move): unique winning best at col3 (+1); a SHARED central-column prefix.
  const CENTRAL_FAMILY_SCORES = [-2, -2, -2, 1, -2, -2, -2];

  it('B5-T1: namedOpening with a unique id → names the specific opening + book/played columns', () => {
    const r = buildOpeningReason({
      movestring: '333331', playedCol: 0, bestCol: 1,
      bestScore: 1, scores: CANDLESTICKS_SCORES, player: 1,
    });
    assert.ok(r?.namedOpening, 'expected a namedOpening');
    assert.equal(r.namedOpening.id, 'allen-candlesticks-opening');
    assert.equal(r.namedOpening.bookNextCol, 1);
    assert.match(r.section, /candlesticks opening/);       // specific name, grounded in the id
    assert.match(r.section, /column 2/);                    // bookNextCol + 1
    assert.match(r.section, /column 1/);                    // playedCol + 1
  });

  it('B5-T2: namedOpening with id:null → family label only, NEVER a fabricated specific name', () => {
    const r = buildOpeningReason({
      movestring: '3333', playedCol: 0, bestCol: 3,
      bestScore: 1, scores: CENTRAL_FAMILY_SCORES, player: 1,
    });
    assert.ok(r?.namedOpening, 'expected a namedOpening');
    assert.equal(r.namedOpening.id, null, 'shared prefix keeps id null');
    assert.match(r.section, /a central-column opening/);
    assert.doesNotMatch(r.section, /candlesticks|5 4|third row/i, 'must not invent a specific opening name');
    assert.match(r.section, /column 4/);                    // bookNextCol + 1
  });

  it('B5-T3: off-book but more-central better move → centrality (reuses detectCenterDominance text)', () => {
    const args = { movestring: '30', playedCol: 1, bestCol: 3 };
    const r = buildOpeningReason({ ...args, bestScore: 4, scores: [-2, -2, -2, 4, 0, 0, 0], player: 1 });
    assert.ok(r?.centrality, 'expected a centrality reason');
    assert.ok(!r.namedOpening, 'off-book must not be a namedOpening');
    assert.ok(!r.section, 'centrality carries no bespoke section (the existing centerDominance one renders it)');
    assert.equal(r.centrality.betterHasMoreLines, true);
    assert.equal(r.centrality.text, detectCenterDominance(args).reason, 'must reuse the shared centerDominance text');
  });

  it('B5-T4: guard 2 (mover is not the beneficiary, player 2) → no namedOpening', () => {
    const r = buildOpeningReason({
      movestring: '333331', playedCol: 0, bestCol: 1,
      bestScore: 1, scores: CANDLESTICKS_SCORES, player: 2,
    });
    assert.ok(!r?.namedOpening, 'player-2 mover on a P1 book line must not claim a named opening');
  });

  it('B5-T5: guard 3 (book move is not the solver-best) → no namedOpening', () => {
    // bookNextCol is col1 (+1) but the true best is col3 (+4): the book move no longer keeps the win.
    const r = buildOpeningReason({
      movestring: '333331', playedCol: 0, bestCol: 3,
      bestScore: 4, scores: [-2, 1, -2, 4, 0, 0, -3], player: 1,
    });
    assert.ok(!r?.namedOpening, 'book move below the max must not be claimed as best');
  });

  it('B5-T6: no opening match and not more-central → null (no opening section at all)', () => {
    // Mid-board off-book position; better move is LESS central than the played move.
    const r = buildOpeningReason({
      movestring: '0123456', playedCol: 3, bestCol: 0,
      bestScore: 2, scores: [2, 0, 0, 1, 0, 0, 0], player: 1,
    });
    assert.equal(r, null);
  });

  it('buildOpeningReason: defense section names the line, resist-and-wait, 1-indexed hold', () => {
    const r = buildOpeningReason({
      movestring: '3333344', playedCol: 2, bestCol: 4, bestScore: -1,
      scores: [-4, -3, -3, -3, -1, -3, -4], player: 2,
    });
    assert.ok(r.defense, 'defense branch');
    assert.match(r.section, /## Opening theory/);
    assert.match(r.section, /second side of the 5-4 opening/i);
    assert.match(r.section, /theoretically lost/i);
    assert.match(r.section, /column 5/);                 // bestDefenseCol 4 → 1-indexed 5
    assert.match(r.section, /resist|wait|slip|hold/i);
    assert.doesNotMatch(r.section, /more central/i);     // equidistant → no centrality clause
  });

  it('buildOpeningReason: defense section adds centrality/even-row clause when grounded (333/col4)', () => {
    const r = buildOpeningReason({
      movestring: '333', playedCol: 4, bestCol: 3, bestScore: -1,
      scores: [-4, -4, -3, -1, -3, -4, -4], player: 2,
    });
    assert.ok(r.defense, 'defense branch');
    assert.match(r.section, /central-column opening/i); // family-only label (id null)
    assert.match(r.section, /column 4/);                 // bestDefenseCol 3 → 1-indexed 4
    assert.match(r.section, /more central/i);
    assert.match(r.section, /even row/i);                // parity canon (rows 2 & 4)
  });
});
