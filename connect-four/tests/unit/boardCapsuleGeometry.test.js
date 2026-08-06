// isContiguousLine() — the collinearity guard behind Board.jsx's `windows:` capsule overlay.
//
// Why this exists: the renderer used to assume every `windows:` group was a genuine
// four-in-a-row window and drew one thick capsule from the group's first cell to its last.
// The deep-reveal generator also uses `windows:` to bundle the two DISJOINT endpoints of a
// fork, so that assumption drew a bar across squares that were never part of any line — and
// in the motivating case (`future:windows:c2r6,c5r5`) straight through an opponent disc.
// Board.jsx now only draws the first→last capsule when this predicate holds.
//
// Fixtures are real spec strings lifted from src/pages/groundingDiffCases.js and parsed by
// the production parser (zoneToWindowGroups), so the 0-indexed cells under test are the exact
// objects Board.jsx receives — no hand-typed coordinates that could drift by an off-by-one.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isContiguousLine } from '../../src/components/boardCapsuleGeometry.js';
import { zoneToWindowGroups } from '../../src/lib/annotatedText.js';

/** Parse a single-group `windows:` spec the way Board.jsx's caller does. */
function group(spec) {
  const groups = zoneToWindowGroups(spec);
  assert.equal(groups.length, 1, `expected exactly one window group in ${spec}`);
  return groups[0];
}

test('fork endpoints are NOT a line (the bug: future:windows:c2r6,c5r5)', () => {
  // 3 columns and 1 row apart — the bar used to cross c3r6, c3r5 and c4r5.
  assert.equal(isContiguousLine(group('future:windows:c2r6,c5r5')), false);
});

test('horizontal four-in-a-row IS a line', () => {
  assert.equal(isContiguousLine(group('windows:c1r3,c2r3,c3r3,c4r3')), true);
});

test('ascending diagonal (dc=-1, dr=+1) IS a line', () => {
  assert.equal(isContiguousLine(group('windows:c7r3,c6r4,c5r5,c4r6')), true);
});

test('descending diagonal (dc=-1, dr=-1) IS a line', () => {
  assert.equal(isContiguousLine(group('windows:c6r4,c5r3,c4r2,c3r1')), true);
});

test('vertical stack (dc=0, dr=+1) IS a line', () => {
  assert.equal(isContiguousLine(group('windows:c4r1,c4r2,c4r3,c4r4')), true);
});

test('a genuine line stated in descending order IS still a line', () => {
  // The predicate must not assume the producer emits cells left-to-right.
  assert.equal(isContiguousLine(group('windows:c4r3,c3r3,c2r3,c1r3')), true);
});

test('collinear but NON-contiguous (same row, gap of 2) is NOT a line', () => {
  // Distinct failure mode from the fork case: dr === 0, so only the |dc| > 1 guard rejects it.
  // Drawing a capsule here would falsely claim the skipped square c2r3 belongs to the window.
  assert.equal(isContiguousLine(group('windows:c1r3,c3r3')), false);
});

test('consistent direction but a gap mid-run is NOT a line', () => {
  // First step is a legal unit vector, so only the per-step equality check rejects this.
  assert.equal(isContiguousLine(group('windows:c1r3,c2r3,c4r3')), false);
});

test('every `windows:` group shipped in groundingDiffCases is classified correctly', () => {
  // Full corpus of real production specs (grep of src/pages/groundingDiffCases.js), so a
  // regression cannot hide in a spec shape these unit cases happen not to cover.
  const CORPUS = [
    ['windows:c1r3,c2r3,c3r3,c4r3', [true]],
    ['windows:c1r3,c7r6', [false]],
    ['windows:c1r4,c2r4,c3r4,c4r4', [true]],
    ['windows:c2r5,c3r5,c4r5,c5r5', [true]],
    ['windows:c2r6,c5r5', [false]],
    ['windows:c3r4,c4r4,c5r4,c6r4', [true]],
    ['windows:c3r5,c7r1', [false]],
    ['windows:c4r3,c5r3,c6r3,c7r3', [true]],
    ['windows:c4r3,c5r4,c6r5,c7r6', [true]],
    ['windows:c5r3,c4r4,c3r5,c2r6', [true]],
    ['windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5', [true, true]],
    ['windows:c6r1,c5r2,c4r3,c3r4', [true]],
    ['windows:c6r2,c5r3,c4r4,c3r5', [true]],
    ['windows:c6r2,c5r3,c4r4,c3r5|c7r1,c6r2,c5r3,c4r4', [true, true]],
    ['windows:c7r3,c6r4,c5r5,c4r6', [true]],
  ];
  for (const [spec, expected] of CORPUS) {
    assert.deepEqual(zoneToWindowGroups(spec).map(isContiguousLine), expected, spec);
  }
});
