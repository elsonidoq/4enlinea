// reasonNarratorVector.test.mjs — the LLM-facing projection of the reason vector.
// Pure functions, no solver. Run: node --test server/tests/reasonNarratorVector.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toNarratorVector, pruneVector, pruneValue, isNarratorHidden,
} from '../scripts/reasonNarratorVector.mjs';

// Recursively collect every key present anywhere in an object/array tree.
function allKeys(o, acc = new Set()) {
  if (Array.isArray(o)) o.forEach((v) => allKeys(v, acc));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); allKeys(v, acc); }
  return acc;
}

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

// A row that exercises EVERY solver-score surface: top-level `scores`, decision `bestScore`/
// `playedScore`, and a per-move `score` nested inside a shown `line`. None may reach the narrator.
const RAW_WITH_SCORES = {
  movestring: '3325', playedCol: 5, bestCol: 1,
  scores: [-3, 18, 2, 3, -3, 0, -3],
  bestScore: 18, playedScore: 0, case: 'win_to_draw',
  lostResource: {
    kind: 'winning_line', register: 'forced_sequence',
    line: [{ ply: 5, mover: 1, col: 1, cell: 'c2r1', score: 6 }],
  },
  opponentPunishment: {
    kind: 'winning_line',
    line: [{ ply: 6, mover: 2, col: 4, cell: 'c5r1', score: -3 }],
  },
};

test('isNarratorHidden matches the whole solver-score family + win-sample diagnostics, not pliesToEnd', () => {
  for (const k of ['scores', 'score', 'bestScore', 'playedScore', 'optimalWinSamples', 'winSamples']) {
    assert.equal(isNarratorHidden(k), true, `${k} must be hidden`);
  }
  for (const k of ['pliesToEnd', 'case', 'bestCol', 'window', 'cell']) {
    assert.equal(isNarratorHidden(k), false, `${k} must be kept`);
  }
});

test('toNarratorVector removes NO solver score at ANY depth (scores, bestScore, playedScore, line[].score)', () => {
  const fv = toNarratorVector(RAW_WITH_SCORES);
  const keys = allKeys(fv);
  for (const forbidden of ['scores', 'score', 'bestScore', 'playedScore']) {
    assert.equal(keys.has(forbidden), false, `${forbidden} must not survive anywhere`);
  }
  // the line still teaches the sequence — ply/mover/col/cell survive, only score is gone
  assert.deepEqual(fv.lostResource.line[0], { ply: 5, mover: 1, col: 1, cell: 'c2r1' });
  assert.equal(fv.opponentPunishment.line[0].score, undefined);
});

test('toNarratorVector keeps the engineered reason fields (case/cells/tie), drops the scores', () => {
  const fv = toNarratorVector(RAW);
  assert.equal(fv.case, 'win_to_draw');
  assert.equal(fv.bestCol, 1);          // a column, not a score — kept
  assert.equal('playedScore' in fv, false);
  assert.equal('bestScore' in fv, false);
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

test('D7: namedRule (incl. zcount, lockInPly) survives toNarratorVector at depth', () => {
  // Guardrail: the deep scrub drops /^scores?$|Score$/. The parity-naming payload must NOT be caught
  // — the count field is `zcount` (lowercase, not *Score). A future rename to `...Score` would
  // silently strip it; this test fails loudly if that happens.
  const raw = {
    movestring: '', playedCol: 4, bestCol: 3, case: 'win_to_draw',
    lostResource: {
      kind: 'winning_line', register: 'parity', terminal: 'win',
      parityAttribution: {
        nameable: true, controllingGroup: ['c2r5', 'c3r5', 'c4r5', 'c5r5'],
        completingCell: 'c5r5', parityNamingDeferred: false,
        namedRule: {
          rule: 'allen-v3', basis: 'z_threat',
          lockInPly: 38, completingCell: 'c5r5', zcount: 5, parity: 'odd',
        },
      },
    },
  };
  const fv = toNarratorVector(raw);
  const nr = fv.lostResource.parityAttribution.namedRule;
  assert.ok(nr, 'namedRule object survives');
  assert.equal(nr.rule, 'allen-v3');
  assert.equal(nr.basis, 'z_threat');
  assert.equal(nr.zcount, 5, 'zcount must NOT be scrubbed');
  assert.equal(nr.lockInPly, 38, 'lockInPly must survive');
  assert.equal(nr.parity, 'odd');
  assert.equal(fv.lostResource.parityAttribution.parityNamingDeferred, false);
  assert.equal(allKeys(fv).has('zcount'), true, 'zcount key present at depth');
});

test('pruneValue keeps a non-empty nested structure intact', () => {
  // pruneValue only drops empties; score-stripping is toNarratorVector's job and runs first, so a
  // narrator `line` reaching pruneValue has no `score`.
  const v = pruneValue({ line: [{ ply: 1, mover: 1, cell: 'c3r3' }], window: ['c1r1'] });
  assert.deepEqual(v, { line: [{ ply: 1, mover: 1, cell: 'c3r3' }], window: ['c1r1'] });
});
