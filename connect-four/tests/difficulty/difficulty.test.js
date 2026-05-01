/**
 * Tests for sampleColumnFromScores.
 *
 * Validates that the softmax sampling procedure produces a distribution
 * matching the theoretical probabilities derived from the scores.
 *
 * Run: node --test tests/difficulty/difficulty.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleColumnFromScores } from '../../src/lib/aiDifficulty.js';

const INVALID = -1000;

// Compute expected softmax probabilities for a set of scores at a given temperature.
function softmaxProbs(scores, temperature) {
  const valid = scores.map((s, i) => ({ s, i })).filter(e => e.s > INVALID);
  const maxS = Math.max(...valid.map(e => e.s));
  const exps = valid.map(e => ({ i: e.i, w: Math.exp((e.s - maxS) / temperature) }));
  const total = exps.reduce((acc, e) => acc + e.w, 0);
  const probs = new Array(scores.length).fill(0);
  for (const e of exps) probs[e.i] = e.w / total;
  return probs;
}

// Draw N samples, return empirical frequency per column.
function empiricalFreqs(scores, temperature, n) {
  const counts = new Array(scores.length).fill(0);
  for (let i = 0; i < n; i++) counts[sampleColumnFromScores(scores, temperature)]++;
  return counts.map(c => c / n);
}

describe('sampleColumnFromScores', () => {
  const SCORES = [2, -1, 0, 3, 1, -2, 0]; // col 3 (index 3) is best

  it('temperature=0 always returns the best column', () => {
    for (let i = 0; i < 200; i++) {
      assert.equal(sampleColumnFromScores(SCORES, 0), 3);
    }
  });

  it('temperature=0 breaks ties uniformly among best columns', () => {
    const tied = [3, 3, 0, 3, 0, 0, 0]; // three columns tied at 3
    const counts = new Array(7).fill(0);
    const N = 3000;
    for (let i = 0; i < N; i++) counts[sampleColumnFromScores(tied, 0)]++;
    // Only columns 0, 1, 3 should ever be picked
    for (let i = 0; i < 7; i++) {
      if (![0, 1, 3].includes(i)) assert.equal(counts[i], 0, `col ${i} should not be picked`);
    }
    // Each tied column should be picked roughly 1/3 of the time (±10%)
    for (const i of [0, 1, 3]) {
      const freq = counts[i] / N;
      assert.ok(freq > 0.23 && freq < 0.43, `col ${i} freq ${freq.toFixed(3)} not near 1/3`);
    }
  });

  it('INVALID columns are never sampled', () => {
    const withInvalid = [INVALID, 5, INVALID, 3, INVALID, 1, INVALID];
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 2000; i++) counts[sampleColumnFromScores(withInvalid, 1.0)]++;
    assert.equal(counts[0], 0, 'col 0 is INVALID, must never be sampled');
    assert.equal(counts[2], 0, 'col 2 is INVALID, must never be sampled');
    assert.equal(counts[4], 0, 'col 4 is INVALID, must never be sampled');
    assert.equal(counts[6], 0, 'col 6 is INVALID, must never be sampled');
  });

  it('empirical distribution matches theoretical softmax at temperature=1.0', () => {
    const T = 1.0;
    const N = 10000;
    const expected = softmaxProbs(SCORES, T);
    const actual = empiricalFreqs(SCORES, T, N);

    for (let i = 0; i < SCORES.length; i++) {
      if (SCORES[i] <= INVALID) continue;
      const tol = 0.03; // ±3 percentage points at N=10000
      assert.ok(
        Math.abs(actual[i] - expected[i]) < tol,
        `col ${i}: expected ~${expected[i].toFixed(3)}, got ${actual[i].toFixed(3)} (tol ${tol})`
      );
    }
  });

  it('empirical distribution matches theoretical softmax at temperature=3.0 (easy)', () => {
    const T = 3.0;
    const N = 10000;
    const expected = softmaxProbs(SCORES, T);
    const actual = empiricalFreqs(SCORES, T, N);

    for (let i = 0; i < SCORES.length; i++) {
      if (SCORES[i] <= INVALID) continue;
      const tol = 0.03;
      assert.ok(
        Math.abs(actual[i] - expected[i]) < tol,
        `col ${i}: expected ~${expected[i].toFixed(3)}, got ${actual[i].toFixed(3)} (tol ${tol})`
      );
    }
  });

  it('empirical distribution matches theoretical softmax at temperature=0.3 (hard)', () => {
    const T = 0.3;
    const N = 10000;
    const expected = softmaxProbs(SCORES, T);
    const actual = empiricalFreqs(SCORES, T, N);

    for (let i = 0; i < SCORES.length; i++) {
      if (SCORES[i] <= INVALID) continue;
      const tol = 0.03;
      assert.ok(
        Math.abs(actual[i] - expected[i]) < tol,
        `col ${i}: expected ~${expected[i].toFixed(3)}, got ${actual[i].toFixed(3)} (tol ${tol})`
      );
    }
  });

  it('lower temperature selects the best column more often than higher temperature', () => {
    const N = 3000;
    const freqHard = empiricalFreqs(SCORES, 0.3, N);
    const freqEasy = empiricalFreqs(SCORES, 3.0, N);
    const bestCol = 3;
    assert.ok(
      freqHard[bestCol] > freqEasy[bestCol],
      `hard (T=0.3) should pick best col more often than easy (T=3.0): ${freqHard[bestCol].toFixed(3)} vs ${freqEasy[bestCol].toFixed(3)}`
    );
  });

  it('high temperature approaches uniform distribution', () => {
    const T = 20.0;
    const N = 7000;
    const actual = empiricalFreqs(SCORES, T, N);
    const uniformExpected = 1 / 7;
    for (let i = 0; i < SCORES.length; i++) {
      const tol = 0.05;
      assert.ok(
        Math.abs(actual[i] - uniformExpected) < tol,
        `col ${i}: expected ~${uniformExpected.toFixed(3)} at T=20, got ${actual[i].toFixed(3)}`
      );
    }
  });
});
