import { test } from 'node:test';
import assert from 'node:assert/strict';
import { softmaxSample } from '../../server/candidate-generator.js';

// Deterministic counter-based RNG that returns values in sequence
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('at T=0.01 always returns the column with the highest score', () => {
  const legalCols = [0, 1, 2, 3, 4, 5, 6];
  const scores = [1, 2, 5, 8, 3, 0, -1]; // col 3 has highest score
  const T = 0.01;
  // Use rng values in (0, 1) — skip 0.0 since at tiny T all non-max probs underflow
  // to denormal non-zero values, causing r=0 to match the very first column.
  for (let r = 1; r <= 19; r++) {
    const rng = seqRng([r / 20]);
    const col = softmaxSample(legalCols, scores, T, rng);
    assert.equal(col, 3, `expected col 3 but got ${col} for rng value ${r / 20}`);
  }
});

test('at T=1000 each legal column is returned with approximately equal frequency', () => {
  const legalCols = [0, 1, 2, 3];
  const scores = [10, 1, 5, 3];
  const T = 1000;
  const N = 10000;
  const counts = Array(7).fill(0);

  let seed = 1;
  function mulberry32() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  for (let i = 0; i < N; i++) {
    const col = softmaxSample(legalCols, scores, T, mulberry32);
    counts[col]++;
  }

  const expected = N / legalCols.length;
  const tolerance = 0.15; // allow 15% deviation
  for (const col of legalCols) {
    const ratio = counts[col] / expected;
    assert.ok(
      ratio >= 1 - tolerance && ratio <= 1 + tolerance,
      `col ${col}: count=${counts[col]}, expected ~${expected}, ratio=${ratio.toFixed(3)}`
    );
  }
});

test('with a single legal column always returns it regardless of T', () => {
  const legalCols = [4];
  const scores = [0, 0, 0, 0, 7, 0, 0];
  for (const T of [0.01, 1, 1000]) {
    for (const r of [0, 0.5, 0.99]) {
      const col = softmaxSample(legalCols, scores, T, () => r);
      assert.equal(col, 4, `expected col 4 for T=${T}, rng=${r}`);
    }
  }
});
