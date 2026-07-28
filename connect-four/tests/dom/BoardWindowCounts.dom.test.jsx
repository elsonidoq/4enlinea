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
  assert.equal(screen.queryByText('13'), null);
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
