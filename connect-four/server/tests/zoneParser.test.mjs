// Spec 058 (Deep-Reveal Grounding), US1 / T005.
// Server-side zone spec parser (server/zoneParser.js) had no dedicated test file before this batch
// (verified: grepping server/tests/ and tests/ for expandSpec/isValidSpec only turns up
// reasonRenderGuard.test.mjs, which mentions them in comments/test names but never imports
// server/zoneParser.js). This file covers the pre-existing grammar plus the new `future:` prefix
// (US1/FR-001/FR-002; data-model.md §1) added in this batch.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isValidSpec, expandSpec, parseZoneSpecs } from '../zoneParser.js';

describe('isValidSpec — pre-existing grammar (unchanged)', () => {
  it('accepts colN', () => assert.equal(isValidSpec('col4'), true));
  it('accepts cNrM', () => assert.equal(isValidSpec('c3r2'), true));
  it('accepts cells:', () => assert.equal(isValidSpec('cells:c1r1,c2r2'), true));
  it('accepts windows:', () => assert.equal(isValidSpec('windows:c1r1,c2r2'), true));
  it('accepts rowN', () => assert.equal(isValidSpec('row5'), true));
  it('accepts tg', () => assert.equal(isValidSpec('tg'), true));
  it('rejects an unknown shape', () => assert.equal(isValidSpec('diagonal3'), false));
});

describe('isValidSpec — future: prefix (US1)', () => {
  it('future:c2r6 is valid (single cell)', () => assert.equal(isValidSpec('future:c2r6'), true));
  it('future:windows:c2r6,c5r5 is valid (window list)', () =>
    assert.equal(isValidSpec('future:windows:c2r6,c5r5'), true));
  it('future:col4 is valid (column)', () => assert.equal(isValidSpec('future:col4'), true));
  it('a future: wrapper around an invalid shape is still invalid', () =>
    assert.equal(isValidSpec('future:diagonal3'), false));
});

describe('expandSpec — future: prefix resolves identically to the unprefixed form (US1)', () => {
  it('future:c2r6 expands to the same cell as c2r6', () => {
    assert.deepEqual(expandSpec('future:c2r6'), expandSpec('c2r6'));
    assert.deepEqual(expandSpec('future:c2r6'), [{ col: 1, row: 5 }]);
  });

  it('future:windows:c2r6,c5r5 expands to the same cells as windows:c2r6,c5r5', () => {
    assert.deepEqual(expandSpec('future:windows:c2r6,c5r5'), expandSpec('windows:c2r6,c5r5'));
    assert.deepEqual(expandSpec('future:windows:c2r6,c5r5'), [{ col: 1, row: 5 }, { col: 4, row: 4 }]);
  });

  it('future:col4 expands to the same 6 cells as col4', () => {
    assert.deepEqual(expandSpec('future:col4'), expandSpec('col4'));
  });

  it('an out-of-bounds future: cell still resolves to empty, matching the unprefixed form', () => {
    assert.deepEqual(expandSpec('future:c9r9'), expandSpec('c9r9'));
    assert.deepEqual(expandSpec('future:c9r9'), []);
  });
});

// Sanity check that parseZoneSpecs (used upstream of expandSpec/isValidSpec) captures a future:
// spec's tag pair like any other spec — it does no validation itself (isValidSpec handles that).
describe('parseZoneSpecs — future: spec tags are captured like any other', () => {
  it('captures a [zone:future:c2r6]...[/zone:future:c2r6] pair', () => {
    const results = parseZoneSpecs('This [zone:future:c2r6]square[/zone:future:c2r6] matters later.');
    assert.equal(results.length, 1);
    assert.equal(results[0].spec, 'future:c2r6');
    assert.equal(results[0].innerText, 'square');
  });
});
