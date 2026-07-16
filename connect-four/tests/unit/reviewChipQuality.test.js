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
