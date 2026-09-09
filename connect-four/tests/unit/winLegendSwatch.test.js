// OI-168, legend half — the ConceptScreen legend swatch for the `win` overlay type.
//
// Board.jsx already rings a `win` overlay in the colour of the disc it rings (gray for
// a 'yellow' disc, green otherwise). The LEGEND swatch was keyed by overlay TYPE alone,
// so four slides that mark GRAY's discs drew a gray ring on the board next to a GREEN
// swatch in the legend.
//
// The rule lives in src/lib/overlayColors.js as a pure function so it can be tested
// here (test:fast, plain node — no JSX) and so ConceptScreen does not re-derive it.
//
// Fixtures are HARVESTED, not invented: every board/overlay pair below was read out of
// the shipped lesson JSON and decoded through the production `boardSpecToBoard`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { boardSpecToBoard } from '../../src/lib/board.js';
import {
  WIN_OVERLAY_GREEN,
  WIN_OVERLAY_GRAY,
  winOverlayColor,
  winLegendColor,
} from '../../src/lib/overlayColors.js';

const lessonsDir = fileURLToPath(new URL('../../lessons/', import.meta.url));
const lesson = (file) => JSON.parse(readFileSync(lessonsDir + file, 'utf8'));

/** The real slide, straight out of the shipped content. */
function slideOf(file, index) {
  const s = lesson(file).slides[index];
  return { board: boardSpecToBoard(s.boardSpec), overlays: s.overlays ?? [] };
}

test('winOverlayColor mirrors Board.jsx: gray iff the ringed cell holds a P2 disc', () => {
  assert.equal(winOverlayColor('yellow'), WIN_OVERLAY_GRAY);
  assert.equal(winOverlayColor('red'), WIN_OVERLAY_GREEN);
  assert.equal(winOverlayColor('empty'), WIN_OVERLAY_GREEN);
  assert.equal(winOverlayColor(undefined), WIN_OVERLAY_GREEN);
});

// --- Case 1: a gray-disc `win` legend (the four defective slides) -------------------
for (const [file, index, label] of [
  ['lesson-02-block-before-build.json', 0, "Gray's three in a row"],
  ['lesson-02-block-before-build.json', 1, 'Gray winning four-in-a-row'],
  ['lesson-02-block-before-build.json', 3, "Gray's connected discs"],
  ['lesson-06-the-fork.json', 0, "Gray's connected discs"],
]) {
  test(`${file} slide ${index} ("${label}") gets a GRAY win swatch`, () => {
    const { board, overlays } = slideOf(file, index);
    // Guard the fixture itself: the legend row really is the one the QA pass named.
    const legend = (lesson(file).slides[index].legendItems ?? []).find(i => i.type === 'win');
    assert.equal(legend.label, label);
    assert.equal(winLegendColor(board, overlays), WIN_OVERLAY_GRAY);
  });
}

// --- Case 2: a green-disc `win` legend (must not regress) ---------------------------
for (const [file, index] of [
  ['lesson-01-immediate-threat.json', 0],
  ['lesson-01-immediate-threat.json', 1],
  ['lesson-08-claimeven.json', 1],
  ['lesson-13-figure-7.json', 0],
  ['lesson-14-j-shape.json', 0],
]) {
  test(`${file} slide ${index} keeps a GREEN win swatch`, () => {
    const { board, overlays } = slideOf(file, index);
    assert.equal(winLegendColor(board, overlays), WIN_OVERLAY_GREEN);
  });
}

// --- Case 3: the EMPTY-cell `win` legend must stay green ----------------------------
// lesson-06 slide 3 puts `win` on (c0,r0), an empty cell — a "play here" target marker,
// not a disc annotation. Board.jsx rings it green; the legend must agree.
test('lesson-06-the-fork.json slide 3 ("Real immediate threat") stays GREEN — empty cell', () => {
  const { board, overlays } = slideOf('lesson-06-the-fork.json', 3);
  assert.equal(board[0][0], 'empty', 'fixture guard: the win overlay cell must be empty');
  assert.deepEqual(overlays.filter(o => o.type === 'win'), [{ c: 0, r: 0, type: 'win' }]);
  assert.equal(winLegendColor(board, overlays), WIN_OVERLAY_GREEN);
});

// --- Edge cases ---------------------------------------------------------------------
test('a slide whose win overlays are MIXED falls back to green', () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  board[0][0] = 'yellow';
  board[0][1] = 'red';
  const overlays = [{ c: 0, r: 0, type: 'win' }, { c: 1, r: 0, type: 'win' }];
  assert.equal(winLegendColor(board, overlays), WIN_OVERLAY_GREEN);
});

test('a win legend row with no win overlay on the slide is green', () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  assert.equal(winLegendColor(board, []), WIN_OVERLAY_GREEN);
  assert.equal(winLegendColor(board, [{ c: 0, r: 0, type: 'td' }]), WIN_OVERLAY_GREEN);
});

// --- Divergence guard ---------------------------------------------------------------
// Board.jsx is out of this change's scope, so it cannot import the helper; instead this
// pins the two colour tokens it actually paints. If someone re-colours the board ring,
// this fails and points at the legend that would silently keep the old colour.
test('Board.jsx win ring paints exactly the two tokens this helper returns', () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/components/Board.jsx', import.meta.url)), 'utf8');
  const branch = src.slice(src.indexOf("ovType === 'win'"));
  const ring = branch.slice(0, branch.indexOf('})'));
  assert.match(ring, /value === 'yellow'/);
  assert.ok(ring.includes(`0 0 0 3px ${WIN_OVERLAY_GRAY}`), `Board.jsx gray ring token drifted from ${WIN_OVERLAY_GRAY}`);
  assert.ok(ring.includes(`0 0 0 3px ${WIN_OVERLAY_GREEN}`), `Board.jsx green ring token drifted from ${WIN_OVERLAY_GREEN}`);
});
