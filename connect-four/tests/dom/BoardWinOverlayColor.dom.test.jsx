// OI-168 — the `win` overlay ring must take its colour from the disc it rings.
//
// Four lesson slides (lesson-02 slides 0/1/3, lesson-06 slide 0) mark GRAY's discs
// with `type: "win"`. The ring was a hardcoded `var(--eval-good)` green, so the
// lesson that teaches green-vs-gray disc identity drew green rings on gray discs.
//
// Asserted against the RENDERED style, not the source: the defect is a rendering
// one, and only the mounted component proves which colour reaches the DOM.
//
// jsdom has no ResizeObserver; Board constructs one unconditionally in an effect,
// so it must be stubbed before any render (same as BoardWindowCounts.dom.test.jsx).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const { render, cleanup } = await import('@testing-library/react');
const { Board } = await import('../../src/components/Board.jsx');

const emptyBoard = () => Array.from({ length: 6 }, () => Array(7).fill('empty'));

/**
 * The win ring is an unlabelled <span>; it is the only element whose boxShadow is a
 * 3px spread ring. Returns its boxShadow string (never the node itself — comparing a
 * mounted jsdom node in an assertion triggers util.inspect over the React Fiber graph
 * and reads as a hang; see OI-71 and BoardWindowCounts.dom.test.jsx).
 */
function winRingShadows(container) {
  return [...container.querySelectorAll('span')]
    .map(el => el.style.boxShadow)
    .filter(s => s.startsWith('0 0 0 3px'));
}

test('win overlay on a GREEN disc rings it in the green eval colour', () => {
  cleanup();
  const board = emptyBoard();
  board[0][3] = 'red';                       // 'red' === player 1 === GREEN disc
  const { container } = render(<Board board={board} overlays={[{ c: 3, r: 0, type: 'win' }]} />);
  assert.deepEqual(winRingShadows(container), ['0 0 0 3px var(--eval-good)']);
});

test('win overlay on a GRAY disc must NOT ring it in green', () => {
  cleanup();
  const board = emptyBoard();
  board[0][3] = 'yellow';                    // 'yellow' === player 2 === GRAY disc
  const { container } = render(<Board board={board} overlays={[{ c: 3, r: 0, type: 'win' }]} />);
  const rings = winRingShadows(container);
  assert.equal(rings.length, 1, 'exactly one win ring must render');
  assert.equal(
    rings[0].includes('--eval-good'), false,
    `a win ring on a GRAY disc must not use the green eval token, got: ${rings[0]}`,
  );
  assert.equal(rings[0], '0 0 0 3px var(--disc-gray-hi)');
});

// lesson-06-the-fork.json slide 3 puts a `win` overlay on the EMPTY cell (c0,r0) —
// a "play here" target marker, not a disc annotation. It has no occupant to take a
// colour from and must keep ringing in green. This is the regression guard for the
// case the colour-aware branch must NOT capture.
test('win overlay on an EMPTY cell still rings in green', () => {
  cleanup();
  const { container } = render(<Board board={emptyBoard()} overlays={[{ c: 0, r: 0, type: 'win' }]} />);
  assert.deepEqual(winRingShadows(container), ['0 0 0 3px var(--eval-good)']);
});
