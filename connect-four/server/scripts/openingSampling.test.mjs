import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, shuffle, evenAndOddPrefixLengths } from './openingSampling.mjs';

test('mulberry32 is deterministic for a fixed seed', () => {
  const a = mulberry32(1337), b = mulberry32(1337);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('shuffle is a permutation and deterministic for a fixed rng', () => {
  const arr = [0,1,2,3,4,5,6];
  const s1 = shuffle(arr.slice(), mulberry32(42));
  const s2 = shuffle(arr.slice(), mulberry32(42));
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort((x,y)=>x-y), arr);   // permutation, no loss/dup
});

test('evenAndOddPrefixLengths: 1..L-1 capped at opening phase, both parities', () => {
  const lens = evenAndOddPrefixLengths({ moves: [3,3,3,3,3,4,4] }, 15);
  assert.deepEqual(lens, [1,2,3,4,5,6]);            // L=7 → 1..6
  assert.ok(lens.some(k => k % 2 === 0) && lens.some(k => k % 2 === 1));
  const capped = evenAndOddPrefixLengths({ moves: new Array(20).fill(3) }, 15);
  assert.equal(Math.max(...capped), 14);           // capped at openingMaxDiscs-1
});
