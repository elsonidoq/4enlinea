// Order-capture and validity rules for the admin lesson editor's windowHighlights control
// (src/lib/windowDraft.js).
//
// The rule these tests exist to protect: Board draws a window's capsule from cells[0] to
// cells[last] and validates nothing in between, so an out-of-order array draws a
// plausible-looking capsule over the WRONG cells. The editor must therefore preserve click
// order as array order, and must never commit a draft that fails isStraightLineWindow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WINDOW_CELLS, toggleWindowCell, sortWindowCells, describeWindowDraft,
} from '../../src/lib/windowDraft.js';
import { isStraightLineWindow } from '../../src/lib/lessonWindows.js';

test('toggleWindowCell appends in click order — click order IS array order', () => {
  let cells = [];
  for (const cell of [{ c: 5, r: 0 }, { c: 4, r: 0 }, { c: 3, r: 0 }]) {
    ({ cells } = toggleWindowCell(cells, cell));
  }
  assert.deepEqual(cells, [{ c: 5, r: 0 }, { c: 4, r: 0 }, { c: 3, r: 0 }]);
});

test('toggleWindowCell removes an already-selected cell (misclick undo in place)', () => {
  const start = [{ c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }];
  const { cells, error } = toggleWindowCell(start, { c: 3, r: 0 });
  assert.equal(error, null);
  assert.deepEqual(cells, [{ c: 2, r: 0 }, { c: 4, r: 0 }]);
});

test('toggleWindowCell refuses a 5th cell with a reason and leaves the draft untouched', () => {
  const full = [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }];
  assert.equal(full.length, MAX_WINDOW_CELLS);
  const { cells, error } = toggleWindowCell(full, { c: 4, r: 0 });
  assert.equal(cells, full, 'draft must be returned unchanged, not truncated');
  assert.match(error, /at most 4 cells/);
});

test('sortWindowCells restores traversal order for all four directions', () => {
  const cases = {
    horizontal: [{ c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 }, { c: 5, r: 1 }],
    vertical:   [{ c: 3, r: 0 }, { c: 3, r: 1 }, { c: 3, r: 2 }, { c: 3, r: 3 }],
    diagUp:     [{ c: 1, r: 0 }, { c: 2, r: 1 }, { c: 3, r: 2 }, { c: 4, r: 3 }],
    diagDown:   [{ c: 1, r: 3 }, { c: 2, r: 2 }, { c: 3, r: 1 }, { c: 4, r: 0 }],
  };
  for (const [name, ordered] of Object.entries(cases)) {
    assert.ok(isStraightLineWindow(ordered), `${name}: fixture is not itself a valid window`);
    const scrambled = [ordered[2], ordered[0], ordered[3], ordered[1]];
    assert.ok(!isStraightLineWindow(scrambled), `${name}: scramble is accidentally still valid`);
    assert.ok(isStraightLineWindow(sortWindowCells(scrambled)), `${name}: sort did not restore a valid window`);
  }
});

test('describeWindowDraft gates on isStraightLineWindow, not on cell count alone', () => {
  assert.equal(describeWindowDraft([]).valid, false);
  assert.equal(describeWindowDraft([{ c: 3, r: 0 }]).valid, false);
  assert.equal(describeWindowDraft([{ c: 3, r: 0 }, { c: 4, r: 0 }]).valid, true);
  assert.equal(describeWindowDraft([{ c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 }]).valid, true);
});

test('describeWindowDraft flags an out-of-order line as fixable, a bent one as not', () => {
  // Same four cells as a valid horizontal window, clicked in the wrong order.
  const outOfOrder = [{ c: 2, r: 0 }, { c: 4, r: 0 }, { c: 3, r: 0 }, { c: 5, r: 0 }];
  const d1 = describeWindowDraft(outOfOrder);
  assert.equal(d1.valid, false);
  assert.equal(d1.canFixOrder, true);
  assert.ok(isStraightLineWindow(sortWindowCells(outOfOrder)), 'the offered fix must actually produce a valid window');

  // A bend: no ordering of these cells is a straight line.
  const bent = [{ c: 2, r: 0 }, { c: 3, r: 0 }, { c: 3, r: 1 }];
  const d2 = describeWindowDraft(bent);
  assert.equal(d2.valid, false);
  assert.equal(d2.canFixOrder, false);

  // A gap: collinear but not contiguous.
  const gapped = [{ c: 2, r: 0 }, { c: 4, r: 0 }];
  const d3 = describeWindowDraft(gapped);
  assert.equal(d3.valid, false);
  assert.equal(d3.canFixOrder, false);
});

test('describeWindowDraft rejects an off-board cell', () => {
  assert.equal(describeWindowDraft([{ c: 6, r: 5 }, { c: 7, r: 5 }]).valid, false);
});
