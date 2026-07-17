// Task 17 (finding 14): a red (blunder-colored) Review chip must never open a detail
// titled SUBOPTIMAL. Repro (QA): game 969be952, Review move-3 chip rendered red but its
// detail read "SUBOPTIMAL / MINOR THREAT" — the live badge quality (analysis.moves[].quality)
// disagreed with the stored row's quality (classifyStoredMistake, the durable truth
// MistakeDetailScreen shows). Fix: color the chip from the stored row's quality when one
// exists for the ply; fall back to the live badge only when no stored row exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveChipQuality, globalPlyIndexForMove } from '../../src/lib/reviewChipQuality.js';

test('globalPlyIndexForMove matches the ReviewScreen.jsx formula for both sides', () => {
  assert.equal(globalPlyIndexForMove('first', 1), 0);
  assert.equal(globalPlyIndexForMove('first', 3), 4);
  assert.equal(globalPlyIndexForMove('second', 1), 1);
  assert.equal(globalPlyIndexForMove('second', 3), 5);
});

test('stored suboptimal row wins over a live blunder badge (QA repro shape)', () => {
  // side 'first', moveIndex 3 -> globalPlyIndex 4 (matches the brief's move-3 repro).
  const move = { moveIndex: 3, quality: 'blunder' };
  const gameBlunderList = [{ moveIndex: 4, quality: 'suboptimal' }];
  assert.equal(resolveChipQuality(move, 'first', gameBlunderList), 'suboptimal');
});

test('stored blunder row is kept when the live badge already agrees', () => {
  const move = { moveIndex: 3, quality: 'blunder' };
  const gameBlunderList = [{ moveIndex: 4, quality: 'blunder' }];
  assert.equal(resolveChipQuality(move, 'first', gameBlunderList), 'blunder');
});

test('no stored row for the ply falls back to the live badge quality', () => {
  const move = { moveIndex: 5, quality: 'suboptimal' };
  const gameBlunderList = [{ moveIndex: 4, quality: 'blunder' }]; // different ply
  assert.equal(resolveChipQuality(move, 'first', gameBlunderList), 'suboptimal');
});

test('empty gameBlunderList always falls back to the live badge quality', () => {
  const move = { moveIndex: 2, quality: 'optimal' };
  assert.equal(resolveChipQuality(move, 'second', []), 'optimal');
});

// ── T17 remediation: selectStep's navigate-vs-preview gate must agree with the ──────────
// chip's rendered color. Both are derived from resolveChipQuality in
// src/screens/ReviewScreen.jsx#selectStep. Repro shape: the live badge says 'optimal'
// (no live mistake detected) but a stored row exists for the same ply with a non-optimal
// quality — resolveChipQuality colors the chip as a mistake, so clicking it must ALSO
// navigate to the detail, not fall through to the in-place board preview.
//
// `oldGate` mirrors the pre-fix selectStep (gated on the raw live `move.quality`);
// `newGate` mirrors the fixed selectStep (gated on `resolveChipQuality(...)`). This
// mirror-function approach matches tests/blunder/reviewStepperPreview.test.js, which
// notes this repo has no React component-render harness.
function oldGateWouldNavigate(move) {
  return move.quality !== 'optimal';
}
function newGateWouldNavigate(move, side, gameBlunderList) {
  return resolveChipQuality(move, side, gameBlunderList) !== 'optimal';
}

test('T17: live=optimal but stored=non-optimal — new gate navigates, old gate did not (the bug)', () => {
  const move = { moveIndex: 3, quality: 'optimal' };
  const gameBlunderList = [{ moveIndex: 4, quality: 'blunder' }]; // first-side ply for moveIndex 3

  assert.equal(oldGateWouldNavigate(move), false, 'pre-fix gate incorrectly skipped navigation');
  assert.equal(newGateWouldNavigate(move, 'first', gameBlunderList), true,
    'post-fix gate must navigate when the displayed (stored) quality is non-optimal');
});

test('T17: live=blunder, no stored row — both gates agree (navigate), unchanged behavior', () => {
  const move = { moveIndex: 5, quality: 'blunder' };
  const gameBlunderList = [];

  assert.equal(oldGateWouldNavigate(move), true);
  assert.equal(newGateWouldNavigate(move, 'first', gameBlunderList), true);
});

test('T17: live=optimal, no stored row — both gates agree (preview, no navigation), unchanged behavior', () => {
  const move = { moveIndex: 2, quality: 'optimal' };
  const gameBlunderList = [];

  assert.equal(oldGateWouldNavigate(move), false);
  assert.equal(newGateWouldNavigate(move, 'second', gameBlunderList), false);
});
