// Renders Board for real and asserts the DIGITS on screen, per the CLAUDE.md rule that a
// green test on the producer alone is not evidence the app shows the right thing.
//
// jsdom has no ResizeObserver; Board's capsule-measuring effect constructs one
// unconditionally, so it must be stubbed before any render here.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const { render, screen, cleanup } = await import('@testing-library/react');
const { Board } = await import('../../src/components/Board.jsx');

// Empty board, green learner — the pure-geometry case (13 centre, 3 corner).
const EMPTY_COUNTS = [
  [3, 4, 5, 7, 5, 4, 3],
  [4, 6, 8, 10, 8, 6, 4],
  [5, 8, 11, 13, 11, 8, 5],
  [5, 8, 11, 13, 11, 8, 5],
  [4, 6, 8, 10, 8, 6, 4],
  [3, 4, 5, 7, 5, 4, 3],
];

test('Board renders a digit in every empty cell when windowCounts is supplied', () => {
  cleanup();
  render(<Board windowCounts={EMPTY_COUNTS} />);
  // Both middle centre cells carry 13 — the board's maximum.
  assert.equal(screen.getAllByText('13').length, 2);
  // The four corners all carry 3, as do four other cells (row 5 outer, row 0 outer).
  assert.ok(screen.getAllByText('3').length >= 4);
});

test('Board renders no digits at all when windowCounts is omitted', () => {
  cleanup();
  render(<Board />);
  // Compare a boolean, never the raw DOM node/null pair directly: on failure,
  // node:assert's error-message formatter would try to util.inspect() the
  // matched element, and a mounted React/jsdom node is a large, circular,
  // getter-laden object graph (React Fiber back-references, jsdom internals).
  // That formatting pass is unboundedly expensive — in practice it never
  // finishes in test-suite time, which reads as a hang rather than a failure.
  // See the `never renders a digit on an occupied cell` test below for the
  // proven repro (OI-71).
  assert.equal(screen.queryByText('13') === null, true);
});

test('Board skips cells marked null (occupied) and renders 0 without a tint', () => {
  cleanup();
  const counts = EMPTY_COUNTS.map(r => [...r]);
  counts[0][3] = null;  // pretend a disc sits at (c3,r0)
  counts[0][0] = 0;     // fully blocked corner
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  board[0][3] = 'red';
  render(<Board board={board} windowCounts={counts} />);
  const zero = screen.getByText('0');
  assert.ok(zero, 'a 0 count must still render its digit');
  assert.equal(zero.parentElement.style.background, 'transparent');
});

test('Board never renders a digit on an occupied cell, even when windowCounts supplies a non-null count for it', () => {
  cleanup();
  // Deliberately inconsistent with the production data contract (an occupied cell should
  // carry `null` in windowCounts): this isolates the `value === 'empty'` half of the guard.
  // 99 appears nowhere else in the grid, so a stray match can only come from this cell.
  const counts = EMPTY_COUNTS.map(r => [...r]);
  counts[0][3] = 99;
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  board[0][3] = 'red';
  render(<Board board={board} windowCounts={counts} />);
  // Root cause of OI-71's ~30s hang under the diagnostic mutation: this used to be
  // `assert.equal(screen.queryByText('99'), null, ...)`. When the assertion fails
  // (i.e. the mutant renders the digit), the *actual* value is a live DOM element
  // holding circular back-references into its React Fiber tree (which itself embeds
  // Error objects with full stack traces via `_debugStack`) plus jsdom's
  // getter-heavy prototype chain. node:assert's AssertionError builds its diff
  // message by util.inspect()-ing both operands, and inspecting that graph is
  // effectively unbounded — confirmed by direct repro: identical code with
  // `assert.equal(node, null)` never returns (CPU-bound, growing RSS) while
  // `assert.equal(node === null, true)` fails in <1s. Comparing a boolean instead
  // of the raw node sidesteps the DOM-node formatting entirely.
  assert.equal(screen.queryByText('99') === null, true, 'an occupied cell must never render its windowCounts digit');
});

test('Board suppresses the tint but still renders the digit when a per-cell overlay colours the same cell', () => {
  cleanup();
  // The real slide-4 case: a `claim` ring on top of a live-window count. The two must
  // never muddy — background stays transparent, digit renders on top.
  const counts = EMPTY_COUNTS.map(r => [...r]);
  render(<Board windowCounts={counts} overlays={[{ c: 3, r: 2, type: 'claim' }]} />);
  const digits = screen.getAllByText('13');
  assert.equal(digits.length, 2, 'the digit must still render under the overlay');
  const overlaidDigit = digits.find(el => el.parentElement.style.background === 'transparent');
  assert.ok(overlaidDigit, 'the overlaid cell\'s wrapper must have a transparent background');
});
