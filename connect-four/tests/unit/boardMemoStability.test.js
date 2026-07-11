import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveBoardSignature, boardPropsAreEqual } from '../../src/lib/board.js';

// Spec 046 US5 (FR-022/FR-024/SC-007): "no board flicker while the coach speaks".
//
// Root cause (identified from code evidence — no browser available in this
// environment; see ConceptScreen.jsx/SocraticScreen.jsx and Board.jsx):
// `Board` was a plain, non-memoized function component. Its parents rebuild
// the `board` array on every render (ConceptScreen calls
// `boardSpecToBoard(slide.boardSpec)` inline in JSX; SocraticScreen builds
// `board.map(r => [...r])` on every tap) even when the underlying disc
// placements are unchanged. Without a value-based bail-out, any unrelated
// parent re-render (e.g. a coach-speech state transition sharing the same
// render pass) forces Board to fully rebuild all 42 cells, which is the
// re-render churn that manifests as visible flicker of already-placed discs.
//
// This test asserts the pure signal (`deriveBoardSignature`) that the fix's
// `boardPropsAreEqual` memo comparator (used by `React.memo(BoardImpl, ...)`
// in Board.jsx) relies on: a board rebuilt with brand-new array/row
// references, but IDENTICAL disc placements, must be treated as unchanged
// across a simulated coach-speech state transition.

function buildBoard() {
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  board[0][3] = 'red';
  board[1][3] = 'yellow';
  board[0][4] = 'yellow';
  return board;
}

test('deriveBoardSignature: stable across a value-identical board rebuilt with new array references (simulated coach-speech re-render)', () => {
  const boardBeforeNarration = buildBoard();
  // Simulate the exact re-render pattern that triggers the bug: a parent
  // re-render (e.g. coach-speech state changing) rebuilds the board array
  // from scratch with new top-level and row array identities, but identical
  // disc placements — this is what ConceptScreen's inline
  // `boardSpecToBoard(...)` call and SocraticScreen's `board.map(r => [...r])`
  // both do on every render.
  const boardDuringNarration = boardBeforeNarration.map((row) => [...row]);

  assert.notEqual(
    boardBeforeNarration,
    boardDuringNarration,
    'sanity check: the simulated re-render must actually produce a new array reference',
  );
  assert.equal(
    deriveBoardSignature(boardBeforeNarration),
    deriveBoardSignature(boardDuringNarration),
    'board signature must be stable when disc placements are unchanged, even across new array references',
  );
});

test('deriveBoardSignature: changes when a disc is actually placed', () => {
  const before = buildBoard();
  const after = before.map((row) => [...row]);
  after[2][3] = 'red'; // new disc placed in col 3

  assert.notEqual(
    deriveBoardSignature(before),
    deriveBoardSignature(after),
    'board signature must change when a disc is actually placed',
  );
});

test('boardPropsAreEqual: treats a coach-speech-triggered re-render (new board reference, same discs; STABLE overlays/lastDrop references) as equal (React should bail out)', () => {
  const board = buildBoard();
  // `overlays`/`lastDrop` are non-board props compared by Object.is (plain
  // reference equality) — matching SocraticScreen.jsx's `useMemo`-stabilized
  // `overlays` (spec 046 US5 fix) and ConceptScreen's static `slide.overlays`.
  // Only `board` is expected to be rebuilt with a new reference on every
  // render (ConceptScreen's inline `boardSpecToBoard(...)`, SocraticScreen's
  // `board.map(r => [...r])`); that's the one prop this fix makes tolerant of
  // reference churn.
  const stableOverlays = [];
  const prevProps = {
    board,
    canPlay: true,
    overlays: stableOverlays,
    lastDrop: null,
  };
  // Simulated coach-speech state transition: SocraticScreen/ConceptScreen
  // re-render, rebuilding the `board` array from scratch (new reference,
  // same disc placements) — exactly what happens when an unrelated state
  // update (e.g. narration starting/ending) shares a render pass with the
  // board — while non-board props keep their stable references.
  const nextProps = {
    board: board.map((row) => [...row]),
    canPlay: true,
    overlays: stableOverlays,
    lastDrop: null,
  };

  assert.equal(
    boardPropsAreEqual(prevProps, nextProps),
    true,
    'boardPropsAreEqual must report "equal" (skip re-render) when the board is value-identical, even with a new board reference',
  );
});

test('boardPropsAreEqual: treats a genuine disc placement (the tap itself) as a real change (React must re-render)', () => {
  const board = buildBoard();
  const prevProps = { board, canPlay: true, overlays: [], lastDrop: null };

  const nextBoard = board.map((row) => [...row]);
  nextBoard[2][3] = 'red';
  const nextProps = {
    board: nextBoard,
    canPlay: true,
    overlays: [],
    lastDrop: { c: 3, r: 2 },
  };

  assert.equal(
    boardPropsAreEqual(prevProps, nextProps),
    false,
    'boardPropsAreEqual must report "changed" (re-render) when a disc is actually placed',
  );
});

test('boardPropsAreEqual: a genuinely new overlays array (different content) is still treated as a change', () => {
  const board = buildBoard();
  const prevProps = { board, canPlay: true, overlays: [], lastDrop: null };
  const nextProps = {
    board: board.map((row) => [...row]),
    canPlay: true,
    overlays: [{ c: 3, r: 0, type: 'win' }],
    lastDrop: null,
  };

  assert.equal(
    boardPropsAreEqual(prevProps, nextProps),
    false,
    'a non-board prop with a genuinely new reference must still be treated as changed (no false-negative bail-out)',
  );
});
