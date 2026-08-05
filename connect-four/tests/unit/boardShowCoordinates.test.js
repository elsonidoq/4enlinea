// Spec 058 US4 (T032, FR-014/FR-015/SC-007) — showCoordinates prop on Board.jsx.
//
// Board.jsx contains JSX, which `node --test` cannot parse without the tests/dom loader (see
// boardA11y.test.js's header comment for the same constraint). So this fast (non-DOM) test
// covers two things without rendering Board:
//
//   (a) the pure label arrays Board.jsx actually imports and renders from
//       boardCoordinateLabels.js — real production values, not a re-typed belief;
//   (b) a source scan of Board.jsx's BoardImpl destructure signature, which is a regression
//       guard against the ~17 other callers (FR-015/SC-007): every existing prop's name and
//       default must be byte-identical to before this change, and the new `showCoordinates`
//       prop must default to `false` and be the ONLY addition.
//
// Full DOM-rendered assertions (labels actually appear on screen, cell size unaffected) are a
// visual/product concern verified manually per the task instructions; this file is the
// mechanical guard that catches an accidental prop rename/retype/default change or a change to
// boardEl's own style object.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { getColumnLabels, getRowLabels } from '../../src/components/boardCoordinateLabels.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOARD_PATH = resolve(__dirname, '../../src/components/Board.jsx');
const boardSrc = readFileSync(BOARD_PATH, 'utf8');

test('getColumnLabels(): 1-indexed columns 1..7, left to right', () => {
  assert.deepEqual(getColumnLabels(), [1, 2, 3, 4, 5, 6, 7]);
});

test('getRowLabels(): 1-indexed rows, top(6)->bottom(1), matching Board internal row 5..0 render order', () => {
  assert.deepEqual(getRowLabels(), [6, 5, 4, 3, 2, 1]);
});

// Extract the BoardImpl({ ... }) destructure block verbatim.
function extractSignature(src) {
  const start = src.indexOf('function BoardImpl({');
  assert.ok(start >= 0, 'BoardImpl signature not found in Board.jsx');
  const end = src.indexOf('\n}) {', start);
  assert.ok(end >= 0, 'end of BoardImpl signature not found');
  return src.slice(start, end);
}

const EXPECTED_PROP_DEFAULTS = [
  ['board', '= EMPTY_BOARD'],
  ['onColumnClick', null],
  ['onCellClick', null],
  ['canPlay', '= false'],
  ['overlays', '= []'],
  ['badge', null],
  ['lastDrop', null],
  ['compact', '= false'],
  ['fullCols', '= []'],
  ['selectedCols', '= []'],
  ['onColToggle', null],
  ['highlightedCells', '= []'],
  ['stepLabels', '= {}'],
  ['zhCells', '= []'],
  ['windowCounts', '= null'],
  ['showCoordinates', '= false'],
];

test('BoardImpl signature: every existing prop name/default is unchanged, showCoordinates is the only addition', () => {
  const sig = extractSignature(boardSrc);

  for (const [name, defaultExpr] of EXPECTED_PROP_DEFAULTS) {
    // Match "name," / "name\n" / "name = <default>," within the destructure block.
    const re = defaultExpr
      ? new RegExp(`\\b${name}\\s*${defaultExpr.replace(/[[\](){}]/g, '\\$&')}\\s*,`)
      : new RegExp(`\\b${name}\\s*,`);
    assert.ok(re.test(sig), `expected prop "${name}"${defaultExpr ? ` with default "${defaultExpr}"` : ''} in BoardImpl signature`);
  }

  // Count actual top-level prop identifiers (lines that declare a prop, ignoring pure comment
  // lines) to make sure nothing extra snuck in beyond the 16 expected props.
  const propLines = sig
    .split('\n')
    .slice(1) // drop "function BoardImpl({"
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));
  assert.equal(propLines.length, EXPECTED_PROP_DEFAULTS.length, `expected exactly ${EXPECTED_PROP_DEFAULTS.length} prop declaration lines, got ${propLines.length}:\n${propLines.join('\n')}`);
});

test('showCoordinates defaults to false', () => {
  const sig = extractSignature(boardSrc);
  assert.ok(/\bshowCoordinates\s*=\s*false\s*,?\s*$/m.test(sig), 'showCoordinates must default to false');
});

test('boardEl (the pre-existing board markup) does not reference showCoordinates or rowLabelWidth — additive-only, cell size/grid dimensions unchanged', () => {
  const boardElStart = boardSrc.indexOf('const boardEl = (');
  assert.ok(boardElStart >= 0, 'boardEl declaration not found');
  // boardEl's JSX ends at the matching top-level ");" that closes the assignment, immediately
  // followed by the "if (!showCoordinates) return boardEl;" early-return line.
  const earlyReturnIdx = boardSrc.indexOf('if (!showCoordinates) return boardEl;', boardElStart);
  assert.ok(earlyReturnIdx >= 0, 'early-return guard not found after boardEl');
  const boardElChunk = boardSrc.slice(boardElStart, earlyReturnIdx);

  assert.ok(!boardElChunk.includes('showCoordinates'), 'boardEl must not read showCoordinates — coordinate labels are rendered as siblings, not inside the existing board markup');
  assert.ok(!boardElChunk.includes('rowLabelWidth'), 'boardEl must not reference the new label-width constant — its own padding/gap must stay untouched');
  // The two style knobs that determine cell size/grid dimensions must still be exactly the
  // pre-existing compact-derived values.
  assert.ok(boardElChunk.includes('padding: pad,'), 'boardEl must still use the unchanged `pad` padding');
  assert.ok(boardElChunk.includes('gap,'), 'boardEl must still use the unchanged `gap` value');
});

test('showCoordinates is opt-in: Board.jsx early-returns the unmodified boardEl when showCoordinates is false', () => {
  assert.ok(
    boardSrc.includes('if (!showCoordinates) return boardEl;'),
    'expected an explicit early return of the untouched boardEl when showCoordinates is false',
  );
});
