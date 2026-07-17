// Spec 043 US1 (FR-001..FR-006, contracts/board-a11y-contract.md, data-model.md ColumnA11yProps)
//
// getColumnA11yProps({ col, canPlay, colFull }) is a pure derivation consumed by Board.jsx's
// per-column wrapper render. It lives in boardA11y.js (a plain .js module, NOT Board.jsx itself)
// because Board.jsx contains JSX syntax that `node --test` cannot parse directly (no JSX
// loader/transform is configured for this repo's test runner — confirmed empirically: importing
// Board.jsx from plain Node throws "Unknown file extension .jsx"). Board.jsx imports and uses
// this same function so there is exactly one implementation, per research.md R6's pure-function-
// extraction pattern (see also useDragSplit.js -> splitRevealZoom.test.js for existing precedent
// of this exact split).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getColumnA11yProps } from '../../src/components/boardA11y.js';

test('getColumnA11yProps: canPlay=true, colFull=false — role/aria-label/tabIndex for all 7 columns', () => {
  for (let col = 0; col < 7; col++) {
    const props = getColumnA11yProps({ col, canPlay: true, colFull: false });
    assert.equal(props.role, 'button');
    assert.equal(props.ariaLabel, `column ${col + 1}`);
    assert.equal(props.tabIndex, 0);
    assert.equal(props.ariaDisabled, undefined);
  }
});

test('getColumnA11yProps: canPlay=true, colFull=true — disabled, unfocusable button', () => {
  const props = getColumnA11yProps({ col: 3, canPlay: true, colFull: true });
  assert.equal(props.role, 'button');
  assert.equal(props.ariaLabel, 'column 4');
  assert.equal(props.tabIndex, -1);
  assert.equal(props.ariaDisabled, true);
});

test('getColumnA11yProps: canPlay=false, colFull=false — no attributes (read-only board)', () => {
  const props = getColumnA11yProps({ col: 0, canPlay: false, colFull: false });
  assert.equal(props.role, undefined);
  assert.equal(props.ariaLabel, undefined);
  assert.equal(props.tabIndex, undefined);
  assert.equal(props.ariaDisabled, undefined);
});

test('getColumnA11yProps: canPlay=false, colFull=true — still no attributes (colFull irrelevant when read-only)', () => {
  const props = getColumnA11yProps({ col: 5, canPlay: false, colFull: true });
  assert.equal(props.role, undefined);
  assert.equal(props.ariaLabel, undefined);
  assert.equal(props.tabIndex, undefined);
  assert.equal(props.ariaDisabled, undefined);
});

test('getColumnA11yProps: canPlay=false for every column — all four fields undefined regardless of col/colFull', () => {
  for (let col = 0; col < 7; col++) {
    for (const colFull of [true, false]) {
      const props = getColumnA11yProps({ col, canPlay: false, colFull });
      assert.deepEqual(props, {
        role: undefined,
        ariaLabel: undefined,
        tabIndex: undefined,
        ariaDisabled: undefined,
      });
    }
  }
});
