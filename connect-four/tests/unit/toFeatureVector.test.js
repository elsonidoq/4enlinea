// toFeatureVector — parity-threat dedup projection.
//
// The three geometry-only parity-aware threat tags emitted by classifyPattern —
// major_threat_parity, major_threat_nonparity, minor_threat — are a strict, exact
// duplicate of threatStats' player-side buckets (both come from categorizeThreats().player.*,
// see classifier.js detectMajorThreatParity/NonParity/MinorThreat). threatStats is the richer
// representation (parity split + opponent side + count), so toFeatureVector drops those three
// tags from the patterns* maps and keeps threatStats as the single source for parity threats.
//
// pruneEmpty (default) then collapses a patterns* map that becomes empty after stripping.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toFeatureVector } from '../../server/explainContext.js';

const DEDUP_TAGS = ['major_threat_parity', 'major_threat_nonparity', 'minor_threat'];

// Minimal synthetic promptData: patterns* maps carrying both a dedup tag and a
// distinct pattern, plus a threatStats with the same minor-threat cells.
function makePromptData() {
  return {
    movestring: '4455',
    perspective: 1,
    playedCol: 0,
    bestCol: 3,
    tag: 'minor_threat',
    direction: 'missed_own',
    patternsBest: {
      minor_threat: { cells: ['c2r1', 'c3r1'] },     // dup of threatStats.best.playerMinor
      figure_7: { cells: ['c4r2', 'c4r3'] },          // distinct — must survive
    },
    patternsPreMove: {
      major_threat_parity: { cells: ['c5r3'] },       // dup — map becomes empty after strip
    },
    patternsPostBlunder: {
      major_threat_nonparity: { cells: ['c6r2'] },    // dup
      double_threat: { cells: ['c1r1', 'c7r1'] },     // distinct — must survive
    },
    threatStats: {
      pre: { playerMinor: 0, playerMinorCells: [] },
      best: { playerMinor: 2, playerMinorCells: ['c2r1', 'c3r1'] },
      played: { playerMinor: 0, playerMinorCells: [] },
    },
  };
}

describe('toFeatureVector — parity-threat dedup', () => {
  it('strips the three parity-threat tags from every patterns* map', () => {
    const fv = toFeatureVector(makePromptData(), { prune: false });
    for (const key of ['patternsBest', 'patternsPreMove', 'patternsPostBlunder', 'patternsOpponent']) {
      const map = fv[key] || {};
      for (const tag of DEDUP_TAGS) {
        assert.ok(!(tag in map), `${key} must not contain dedup tag ${tag}`);
      }
    }
  });

  it('keeps distinct (non-threat) pattern tags untouched (now with owner/severity labels)', () => {
    const fv = toFeatureVector(makePromptData(), { prune: false });
    // figure_7 is a structural tag → owner added, no severity
    assert.deepEqual(fv.patternsBest.figure_7, { cells: ['c4r2', 'c4r3'], owner: 'player' });
    // double_threat is immediate → owner + severity: 'immediate'
    assert.deepEqual(fv.patternsPostBlunder.double_threat, { cells: ['c1r1', 'c7r1'], owner: 'player', severity: 'immediate' });
  });

  it('retains the deduped cells in threatStats (now with owner/severity labels)', () => {
    const fv = toFeatureVector(makePromptData(), { prune: false });
    assert.deepEqual(fv.threatStats.best.playerMinor, { count: 2, cells: ['c2r1', 'c3r1'], owner: 'player', severity: 'minor' });
  });

  it('prune collapses a patterns* map left empty after stripping', () => {
    const fv = toFeatureVector(makePromptData(), { prune: true });
    // patternsPreMove had only major_threat_parity → empty after strip → pruned away.
    assert.ok(!('patternsPreMove' in fv), 'empty patternsPreMove should be pruned');
    // patternsBest still has figure_7 → survives.
    assert.ok(fv.patternsBest && 'figure_7' in fv.patternsBest);
  });

  it('handles null / absent patterns* maps without throwing', () => {
    const fv = toFeatureVector({ movestring: '1', perspective: 1 }, { prune: false });
    assert.equal(fv.patternsBest, undefined);
    assert.equal(fv.patternsPreMove, undefined);
  });
});

describe('toFeatureVector — raw scores dropped, gapBucket surfaced', () => {
  it('omits preScores and raw gap, keeps the binned gapBucket', () => {
    const fv = toFeatureVector({
      movestring: '44', perspective: 1,
      preScores: [-3, -2, -3, 0, -1, 0, -4],
      gap: 1,
      gapBucket: 'moderate',
    }, { prune: false });
    assert.ok(!('preScores' in fv), 'preScores must not be surfaced');
    assert.ok(!('gap' in fv), 'raw gap must not be surfaced');
    assert.equal(fv.gapBucket, 'moderate');
  });
});

describe('toFeatureVector — owner labels (Task 2)', () => {
  it('patternsOpponent groups labeled opponent, patternsBest labeled player', () => {
    const pd = {
      movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
      playedCell: 'c2r1', bestCell: 'c5r1',
      patternsBest: { immediate_threat: { cells: ['c4r3'] } },
      patternsOpponent: { j_shape: { cells: ['c3r3', 'c4r4'] } },
      threatStats: { pre: {}, best: {}, played: {} },
    };
    const fv = toFeatureVector(pd, { prune: true });
    assert.equal(fv.patternsBest.immediate_threat.owner, 'player');
    assert.equal(fv.patternsOpponent.j_shape.owner, 'opponent');
  });

  it('empty pattern groups are pruned, not labeled', () => {
    const pd = {
      movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
      playedCell: 'c2r1', bestCell: 'c5r1',
      patternsBest: { immediate_threat: { cells: [] } },
      threatStats: { pre: {}, best: {}, played: {} },
    };
    const fv = toFeatureVector(pd, { prune: true });
    assert.equal(fv.patternsBest, undefined, 'all-empty patternsBest pruned away');
  });
});

describe('toFeatureVector — severity labels (Task 3)', () => {
  it('immediate_threat pattern is immediate, minor bucket is minor', () => {
    const pd = {
      movestring: '3434', perspective: 1, playedCol: 1, bestCol: 4,
      playedCell: 'c2r1', bestCell: 'c5r1',
      patternsBest: { immediate_threat: { cells: ['c5r2'] } },
      threatStats: {
        pre: {},
        best: { playerMinor: 2, playerMinorCells: ['c1r1', 'c7r1'] },
        played: {},
      },
    };
    const fv = toFeatureVector(pd, { prune: true });
    assert.equal(fv.patternsBest.immediate_threat.severity, 'immediate');
    assert.equal(fv.threatStats.best.playerMinor.severity, 'minor');
    assert.equal(fv.threatStats.best.playerMinor.owner, 'player');
  });

  it('structural tags (j_shape) carry owner but no severity', () => {
    const pd = {
      movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
      playedCell: 'c2r1', bestCell: 'c5r1',
      patternsOpponent: { j_shape: { cells: ['c3r3', 'c4r4'] } },
      threatStats: { pre: {}, best: {}, played: {} },
    };
    const fv = toFeatureVector(pd, { prune: true });
    assert.equal(fv.patternsOpponent.j_shape.owner, 'opponent');
    assert.equal(fv.patternsOpponent.j_shape.severity, undefined);
  });

  it('lookahead major_threat example labeled major, minor labeled minor', () => {
    const pd = {
      movestring: '3434', perspective: 1, playedCol: 1, bestCol: 4,
      playedCell: 'c2r1', bestCell: 'c5r1',
      threatStats: { pre: {}, best: {}, played: {} },
      lookahead: {
        case: 3,
        categoryExamples: [
          { tag: 'major_threat_parity', ways: [['c4r3']], novelInstances: 1 },
          { tag: 'minor_threat', ways: [['c1r1']], novelInstances: 1 },
        ],
        oppCategoryExamples: [],
        tallyComparison: [],
      },
    };
    const fv = toFeatureVector(pd, { prune: true });
    const byTag = Object.fromEntries(fv.lookahead.categoryExamples.map((e) => [e.tag, e]));
    assert.equal(byTag.major_threat_parity.severity, 'major');
    assert.equal(byTag.major_threat_parity.owner, 'player');
    assert.equal(byTag.minor_threat.severity, 'minor');
  });
});
