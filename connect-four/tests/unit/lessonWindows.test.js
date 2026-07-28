// tests/unit/lessonWindows.test.js — the authored `windowHighlights` slide field.
//
// Concept slides may draw one translucent capsule per four-in-a-line window. The JSON
// contract is `slides[].windowHighlights: [{ type, cells, label?, label_es? }]` with
// `cells` ORDERED ALONG THE LINE (Board draws first cell → last cell, so an unordered
// array yields the wrong length or angle). This file covers the pure JSON → Board
// `zhCells` mapping and the geometry predicate the content gate uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  windowHighlightsToZhCells,
  isStraightLineWindow,
  WINDOW_HIGHLIGHT_COLOR,
  WINDOW_COUNT_MAX,
  windowCountTint,
} from '../../src/lib/lessonWindows.js';
import { computeWindowCounts } from '../../server/windowCounts.js';

const ROW0_2_TO_5 = [{ c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }];

test('lessonWindows: maps one authored window to one Board zhCells entry with a windows array', () => {
  const zh = windowHighlightsToZhCells([{ type: 'claim', cells: ROW0_2_TO_5 }]);
  assert.equal(zh.length, 1);
  assert.equal(zh[0].color, WINDOW_HIGHLIGHT_COLOR.claim);
  // Board's zhSvg takes the `windows` branch only when windows.length > 0; each window
  // draws exactly one capsule from w[0] to w[w.length - 1], with no run detection.
  assert.deepEqual(zh[0].windows, [ROW0_2_TO_5]);
});

test('lessonWindows: cell order is preserved verbatim (the capsule runs first → last)', () => {
  const descending = [{ c: 3, r: 3 }, { c: 4, r: 2 }, { c: 5, r: 1 }, { c: 6, r: 0 }];
  const [zh] = windowHighlightsToZhCells([{ type: 'td', cells: descending }]);
  assert.deepEqual(zh.windows[0], descending);
});

test('lessonWindows: each window becomes its own zhCells entry so overlapping windows keep their own colour', () => {
  const zh = windowHighlightsToZhCells([
    { type: 'tg', cells: ROW0_2_TO_5 },
    { type: 'td', cells: [{ c: 0, r: 0 }, { c: 1, r: 1 }, { c: 2, r: 2 }, { c: 3, r: 3 }] },
  ]);
  assert.equal(zh.length, 2);
  assert.equal(zh[0].color, WINDOW_HIGHLIGHT_COLOR.tg);
  assert.equal(zh[1].color, WINDOW_HIGHLIGHT_COLOR.td);
});

test('lessonWindows: overlay type tokens reuse the LOCKED OverlayType palette meaning', () => {
  // tg = current-player (green) threat, td = opponent (gray) threat, claim = amber.
  // Colours are opaque here on purpose: Board renders the capsule at opacity 0.4, so an
  // already-translucent rgba() would compound to ~0.16 and disappear against the board.
  for (const type of ['tg', 'td', 'claim', 'win']) {
    assert.match(WINDOW_HIGHLIGHT_COLOR[type], /^#[0-9a-f]{6}$/i, `${type} must be an opaque hex colour`);
  }
});

test('lessonWindows: unknown or missing type falls back to a colour rather than undefined', () => {
  const [zh] = windowHighlightsToZhCells([{ cells: ROW0_2_TO_5 }]);
  assert.equal(typeof zh.color, 'string');
  assert.ok(zh.color.length > 0);
});

test('lessonWindows: absent / non-array / degenerate input yields no capsules', () => {
  assert.deepEqual(windowHighlightsToZhCells(undefined), []);
  assert.deepEqual(windowHighlightsToZhCells(null), []);
  assert.deepEqual(windowHighlightsToZhCells('nope'), []);
  assert.deepEqual(windowHighlightsToZhCells([]), []);
  // A single cell has no line to draw; Board would render a zero-length capsule.
  assert.deepEqual(windowHighlightsToZhCells([{ type: 'tg', cells: [{ c: 0, r: 0 }] }]), []);
  assert.deepEqual(windowHighlightsToZhCells([{ type: 'tg' }]), []);
});

test('isStraightLineWindow: accepts the four real Connect Four directions, contiguous and ordered', () => {
  assert.equal(isStraightLineWindow(ROW0_2_TO_5), true, 'horizontal');
  assert.equal(isStraightLineWindow([{ c: 2, r: 0 }, { c: 2, r: 1 }, { c: 2, r: 2 }, { c: 2, r: 3 }]), true, 'vertical');
  assert.equal(isStraightLineWindow([{ c: 0, r: 0 }, { c: 1, r: 1 }, { c: 2, r: 2 }, { c: 3, r: 3 }]), true, 'rising diagonal');
  assert.equal(isStraightLineWindow([{ c: 3, r: 3 }, { c: 4, r: 2 }, { c: 5, r: 1 }, { c: 6, r: 0 }]), true, 'falling diagonal');
  // Right-to-left and top-to-bottom traversals are the same line, drawn backwards — legal.
  assert.equal(isStraightLineWindow([{ c: 4, r: 0 }, { c: 3, r: 0 }, { c: 2, r: 0 }, { c: 1, r: 0 }]), true, 'reversed horizontal');
});

test('isStraightLineWindow: rejects the mistakes a hand-authoring pass actually makes', () => {
  // Unordered — Board would draw from (1,0) to (3,0), silently the wrong capsule.
  assert.equal(isStraightLineWindow([{ c: 1, r: 0 }, { c: 4, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }]), false, 'unordered');
  // Non-contiguous: a gap in the middle is not a window.
  assert.equal(isStraightLineWindow([{ c: 1, r: 0 }, { c: 2, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 }]), false, 'gap');
  // Not collinear at all.
  assert.equal(isStraightLineWindow([{ c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 1 }, { c: 4, r: 1 }]), false, 'bent');
  // Knight-ish step: collinear-looking but not a unit step.
  assert.equal(isStraightLineWindow([{ c: 0, r: 0 }, { c: 2, r: 1 }, { c: 4, r: 2 }, { c: 6, r: 3 }]), false, 'non-unit step');
  assert.equal(isStraightLineWindow([{ c: 0, r: 0 }]), false, 'single cell');
  assert.equal(isStraightLineWindow([]), false, 'empty');
  assert.equal(isStraightLineWindow(undefined), false, 'undefined');
});

test('isStraightLineWindow: rejects off-board cells', () => {
  assert.equal(isStraightLineWindow([{ c: 4, r: 0 }, { c: 5, r: 0 }, { c: 6, r: 0 }, { c: 7, r: 0 }]), false, 'col 7');
  assert.equal(isStraightLineWindow([{ c: 0, r: 3 }, { c: 0, r: 4 }, { c: 0, r: 5 }, { c: 0, r: 6 }]), false, 'row 6');
  assert.equal(isStraightLineWindow([{ c: 0, r: 0 }, { c: -1, r: 0 }]), false, 'negative col');
});

test('isStraightLineWindow: accepts a 2- or 3-cell partial line (a highlight need not be a full window)', () => {
  assert.equal(isStraightLineWindow([{ c: 1, r: 0 }, { c: 2, r: 0 }]), true);
  assert.equal(isStraightLineWindow([{ c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }]), true);
  // But never longer than a window.
  assert.equal(isStraightLineWindow([
    { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 },
  ]), false, '5 cells is not a window');
});

test('windowCountTint: scales alpha against the fixed board maximum, not the board in hand', () => {
  // Fixed scale is the point: a mid-game board must read visibly dimmer than the opening,
  // because that decay IS the lesson. A per-board max would renormalise it away.
  assert.equal(WINDOW_COUNT_MAX, Math.max(...computeWindowCounts('', 'red').flat()));
  assert.equal(windowCountTint(13), 'rgba(139, 92, 246, 0.55)');
  assert.equal(windowCountTint(0), 'transparent');
  const mid = windowCountTint(7);
  assert.match(mid, /^rgba\(139, 92, 246, 0\.2\d+\)$/);
});

test('windowCountTint: a count above the maximum is clamped, never over-saturated', () => {
  assert.equal(windowCountTint(99), 'rgba(139, 92, 246, 0.55)');
});
