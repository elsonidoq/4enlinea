// Spec 042 US3 / T024 (FR-013, FR-014, SC-004): the ReviewScreen stepper's Prev/Next
// controls and mistake-quality chips must change the rendered position on EVERY
// activation — a navigation target for a non-optimal step, or a changed board render
// for an optimal step (in-place preview, contracts/review-stepper-contract.md).
//
// This repo has no React component-render harness, so — mirroring
// tests/navigation/backTrail.test.js's established pattern for this same batch — this
// test re-implements the exact per-step dispatch logic added to
// src/screens/ReviewScreen.jsx (T026-T028: `stepIndices`, `selectStep`,
// `moveIndexToPlyCount`, `handlePrev`/`handleNext`) as local mirror functions, using the
// REAL `buildBoard` from src/lib/board.js so the asserted board signatures are the actual
// rendered output. The `analysis` fixture is inline/hardcoded (no live Supabase/solver
// call), shaped like the SC-002 game (research.md §3): 41 plies, mistakes at
// (blunders-table) move_index 16/18/28/32. `analysis.moves[i].moveIndex` is the
// PER-PLAYER move ordinal (see server/index.js `userMoveOrdinal`, confirmed at
// server/index.js ~line 2115) — for `side: 'second'` the ply-count formula
// `2 * (moveIndex - 1) + 2` maps player-move-ordinals 8/9/14/16 onto exactly the
// board_state-length values 16/18/28/32 from research.md's blunders table, so this
// fixture is consistent with both the real DB rows and the moveIndex semantics
// `ReviewScreen.jsx` actually consumes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBoard } from '../../src/lib/board.js';

// --- Fixture: SC-002-shaped 41-ply game, side: 'second' ---------------------------------
// A valid (column-legal, not necessarily solver-verified) 41-char movestring: columns
// cycle 0..6 so no column ever exceeds 6 discs (41 plies / 7 cols = 5 full cycles + 6).
const FULL_MOVESTRING = Array.from({ length: 41 }, (_, i) => i % 7).join('');
assert.equal(FULL_MOVESTRING.length, 41);

const MISTAKE_MOVE_ORDINALS = new Map([
  [8, 'suboptimal'],  // board_state length 16
  [9, 'blunder'],     // board_state length 18
  [14, 'suboptimal'], // board_state length 28
  [16, 'suboptimal'], // board_state length 32
]);

function buildFixtureAnalysis({ side, movesCount, mistakeMap = MISTAKE_MOVE_ORDINALS }) {
  const moves = [];
  for (let k = 1; k <= movesCount; k++) {
    moves.push({ moveIndex: k, quality: mistakeMap.get(k) ?? 'optimal' });
  }
  return { side, fullMovestring: FULL_MOVESTRING, moves };
}

// side: 'second' user moves are plies 1,3,...,39 (0-indexed) => 20 moves total.
const analysis = buildFixtureAnalysis({ side: 'second', movesCount: 20 });

// --- Local mirror of src/screens/ReviewScreen.jsx's T026-T028 stepper logic -------------
function moveIndexToPlyCount(a, moveIndex) {
  const globalPlyIndex = a.side === 'first'
    ? 2 * (moveIndex - 1)
    : 2 * (moveIndex - 1) + 1;
  return globalPlyIndex + 1;
}

function boardSignature(a, moveIndex) {
  const plyCount = moveIndexToPlyCount(a, moveIndex);
  const { board } = buildBoard(a.fullMovestring.slice(0, plyCount));
  return `board:${board.map(row => row.join('')).join('|')}`;
}

// Mirrors ReviewScreen.selectStep: a non-optimal step navigates ONLY when a stored
// mistake row exists for its global ply index (gameBlunderList membership — the
// storage rule in server/mistakeStorageRule.js excludes slower wins and
// dead-position faster losses, so some non-optimal moves have no row); every other
// step -> board-preview signature (setPreviewMoveIndex + frozenBoard re-derive).
// `storedGlobalPlyIndices = null` (default) models "every non-optimal move stored".
function stepSignature(a, moveIndex, storedGlobalPlyIndices = null) {
  const move = a.moves.find(m => m.moveIndex === moveIndex);
  assert.ok(move, `no move found for moveIndex ${moveIndex}`);
  if (move.quality !== 'optimal') {
    const globalPlyIndex = a.side === 'first'
      ? 2 * (moveIndex - 1)
      : 2 * (moveIndex - 1) + 1;
    if (storedGlobalPlyIndices === null || storedGlobalPlyIndices.has(globalPlyIndex)) {
      return `nav:${moveIndex}`;
    }
  }
  return boardSignature(a, moveIndex);
}

function walkAllSteps(a) {
  const stepIndices = a.moves.map(m => m.moveIndex);
  return stepIndices.map(mi => stepSignature(a, mi));
}

test('stepper: every step (Prev/Next walk) produces a distinct rendered-state signature', () => {
  const signatures = walkAllSteps(analysis);

  assert.equal(signatures.length, 20);

  // Every consecutive pair differs (SC-004: "the board updates on every activation").
  for (let i = 1; i < signatures.length; i++) {
    assert.notEqual(signatures[i], signatures[i - 1],
      `step ${i - 1} -> ${i} produced an identical signature`);
  }

  // Full-array uniqueness (stronger than pairwise, and expected here: distinct
  // navigation targets never repeat, and each optimal preview's board is strictly
  // longer/different than the previous one).
  assert.equal(new Set(signatures).size, signatures.length);
});

test('stepper: non-optimal steps yield a navigation-target signature, optimal steps a board signature', () => {
  for (const [moveIndex, quality] of MISTAKE_MOVE_ORDINALS) {
    const sig = stepSignature(analysis, moveIndex);
    assert.equal(sig, `nav:${moveIndex}`,
      `moveIndex ${moveIndex} (${quality}) should navigate, not preview`);
  }

  const optimalMoveIndex = 1; // not in MISTAKE_MOVE_ORDINALS
  const sig = stepSignature(analysis, optimalMoveIndex);
  assert.ok(sig.startsWith('board:'), 'optimal step should produce a board-preview signature');
});

test('stepper: chip click for an optimal move updates the board preview, never a no-op', () => {
  // Before T027/T028, an optimal chip's onClick was `undefined` (a true no-op). The
  // fixed dispatch (selectStep) must always produce a signature — confirmed above — and,
  // specifically for a chip representing an optimal move, that signature must be a
  // board-preview (not simply "nothing happened").
  const optimalEntries = analysis.moves.filter(m => m.quality === 'optimal');
  assert.ok(optimalEntries.length > 0, 'fixture must contain at least one optimal move');
  for (const move of optimalEntries) {
    const sig = stepSignature(analysis, move.moveIndex);
    assert.ok(sig.startsWith('board:'), `optimal chip ${move.moveIndex} must update the board preview`);
  }
});

test('zero-mistake game: Prev/Next and every chip still step through the board (Edge Case)', () => {
  // A game where every move is optimal: FR-013/FR-014's Edge Case says Prev/Next and
  // chips must still function (never disabled/inert purely because there are zero
  // mistakes) — every step must be a board preview update.
  const zeroMistakeAnalysis = buildFixtureAnalysis({ side: 'first', movesCount: 10, mistakeMap: new Map() });
  // movesCount=10, side 'first' -> plies 0,2,...,18 => fullMovestring must cover at
  // least 19 plies; reuse the 41-ply fixture string (only the first 19 chars matter).
  const signatures = walkAllSteps(zeroMistakeAnalysis);

  assert.equal(signatures.length, 10);
  assert.ok(signatures.every(s => s.startsWith('board:')), 'every step in a zero-mistake game must be a board preview, never a navigation/no-op');

  for (let i = 1; i < signatures.length; i++) {
    assert.notEqual(signatures[i], signatures[i - 1], `zero-mistake step ${i - 1} -> ${i} did not change the board`);
  }
  assert.equal(new Set(signatures).size, signatures.length);
});

test('non-optimal step with NO stored mistake row falls back to a board preview (storage rule)', () => {
  // The 2026-07 storage rule (server/mistakeStorageRule.js) excludes slower wins and
  // dead-position faster losses, so a move can be quality!=='optimal' in the analyze
  // response yet have no `blunders` row. Its chip/step must update the board preview
  // (FR-013: never a silent no-op), while moves that DO have a row keep navigating.
  // Stored set: only ordinals 8 and 9 (global ply indices 15 and 17 for side 'second').
  const stored = new Set([15, 17]);

  assert.equal(stepSignature(analysis, 8, stored), 'nav:8');
  assert.equal(stepSignature(analysis, 9, stored), 'nav:9');
  // Ordinals 14/16 are non-optimal but unstored -> board preview, distinct per step.
  const sig14 = stepSignature(analysis, 14, stored);
  const sig16 = stepSignature(analysis, 16, stored);
  assert.ok(sig14.startsWith('board:'), 'unstored non-optimal step must preview');
  assert.ok(sig16.startsWith('board:'), 'unstored non-optimal step must preview');
  assert.notEqual(sig14, sig16);

  // With nothing stored at all, every step is still a distinct board change.
  const noneStored = new Set();
  const signatures = analysis.moves.map(m => stepSignature(analysis, m.moveIndex, noneStored));
  assert.ok(signatures.every(s => s.startsWith('board:')));
  assert.equal(new Set(signatures).size, signatures.length);
});
