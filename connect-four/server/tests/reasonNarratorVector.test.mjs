// reasonNarratorVector.test.mjs — the LLM-facing projection of the reason vector.
// Pure functions, no solver. Run: node --test server/tests/reasonNarratorVector.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toNarratorVector, pruneVector, pruneValue, HIDDEN_FIELDS,
} from '../scripts/reasonNarratorVector.mjs';

// A raw evidence row whose lostResource carries the evidence-only optimalWinSamples diagnostic
// (attached by attachWinSamples). This must never reach the narrator projection, but a sibling
// real field (register/window) must survive — proving the strip is surgical, not half-deleting.
const RAW_WITH_WIN_SAMPLES = {
  movestring: '3325', playedCol: 5, bestCol: 1,
  scores: [-3, 18, 2, 3, -3, 0, -3],
  discs: 4, boardState: 'opening', player: 1, opponent: 2,
  bestScore: 18, playedScore: 0, case: 'win_to_draw', notABlunder: false,
  lostResource: {
    kind: 'winning_line',
    register: 'parity',
    window: ['c4r5', 'c5r5', 'c6r5', 'c7r5'],
    optimalWinSamples: {
      n: 8, distinct: 2, orientation: { horizontal: 6, vertical: 0, diagonal: 2 },
      oddCompletingFraction: 1, lines: [],
    },
  },
  gate: null,
};

// A representative win_to_draw evidence row — pure computeReason output, no research labels.
const RAW = {
  movestring: '3325', playedCol: 5, bestCol: 1,
  scores: [-3, 18, 2, 3, -3, 0, -3],
  discs: 4, boardState: 'opening', player: 1, opponent: 2,
  bestScore: 18, playedScore: 0, case: 'win_to_draw', notABlunder: false,
  lostResource: { kind: 'winning_line', tacticTag: 'double_threat', anchorCells: ['c1r1', 'c5r1'] },
  opponentPunishment: { kind: 'denial', verdict: 'occupation', tie: { kind: 'tied', sharedCells: ['c2r1'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
  gate: null,
};

test('toNarratorVector strips the raw per-column scores oracle', () => {
  const fv = toNarratorVector(RAW);
  assert.equal('scores' in fv, false);
  assert.deepEqual(HIDDEN_FIELDS, ['scores']);
});


test('toNarratorVector keeps the engineered reason fields verbatim', () => {
  const fv = toNarratorVector(RAW);
  assert.equal(fv.case, 'win_to_draw');
  assert.equal(fv.bestCol, 1);
  assert.equal(fv.playedScore, 0);
  assert.equal(fv.bestScore, 18);
  assert.deepEqual(fv.lostResource.anchorCells, ['c1r1', 'c5r1']);
  assert.equal(fv.opponentPunishment.tie.kind, 'tied');
});

test('toNarratorVector does not mutate its input', () => {
  const copy = JSON.parse(JSON.stringify(RAW));
  toNarratorVector(RAW);
  assert.deepEqual(RAW, copy);
});

test('pruneVector keeps numeric 0 and boolean false (load-bearing in this vector)', () => {
  const fv = pruneVector({
    movestring: '3325', playedCol: 0, playedScore: 0,
    opponentPunishment: { tie: { kind: 'temporal', tied: false } },
  });
  assert.equal(fv.playedCol, 0, 'playedCol 0 (= column 1) must survive');
  assert.equal(fv.playedScore, 0, 'playedScore 0 (= draw) must survive');
  assert.equal(fv.opponentPunishment.tie.tied, false, 'tie.tied false must survive');
});

test('pruneVector drops null, empty arrays, and empty objects (absence = not present)', () => {
  const fv = pruneVector({
    movestring: 'a', gate: null, lostResource: { line: [], tacticCells: [], tacticTag: null },
    replyHistogram: {},
  });
  assert.equal('gate' in fv, false);
  assert.equal('replyHistogram' in fv, false);
  assert.equal('lostResource' in fv, false, 'all-empty object collapses away');
});

test('pruneVector preserves an empty movestring (empty board is meaningful)', () => {
  const fv = pruneVector({ movestring: '', playedCol: 3 });
  assert.equal(fv.movestring, '');
  assert.equal(fv.playedCol, 3);
});

test('toNarratorVector strips optimalWinSamples nested in lostResource (evidence-only, must not reach LLM)', () => {
  const fv = toNarratorVector(RAW_WITH_WIN_SAMPLES);
  assert.equal(fv.lostResource.optimalWinSamples, undefined, 'optimalWinSamples must be stripped');
  assert.equal(fv.lostResource.register, 'parity', 'sibling field register must survive (surgical strip)');
  assert.deepEqual(fv.lostResource.window, ['c4r5', 'c5r5', 'c6r5', 'c7r5'], 'sibling field window must survive');

  const pruned = pruneVector(fv);
  assert.equal(JSON.stringify(pruned).includes('optimalWinSamples'), false, 'no trace of optimalWinSamples after pruning');
});

test('pruneValue keeps a non-empty nested structure intact', () => {
  const v = pruneValue({ line: [{ ply: 1, cell: 'c3r3', score: 9 }], window: ['c1r1'] });
  assert.deepEqual(v, { line: [{ ply: 1, cell: 'c3r3', score: 9 }], window: ['c1r1'] });
});
