// Spec 051 (Epic 1) US3 — guards the fix for OI-84.
//
// ChallengeScreen sends `puzzleId` on POST /api/evaluate-move only for ids that can resolve to a
// real `puzzles` row. Before this guard existed it sent every id, including the two synthetic
// shapes it mints itself, and the server's stored-set lookup failed the whole request — which
// silently removed grading feedback from every lesson confirmation challenge and every
// DEV-injected board (the phase change commits before the response lands, so nothing was shown).
//
// The prefixes asserted here are load-bearing: they must stay in step with the id shapes minted in
// ChallengeScreen.jsx (`inline-${ch.moveString}`) and devFixtures.js#buildDevPuzzle (`dev-...`).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { isSyntheticPuzzleId } from '../../src/lib/syntheticPuzzleId.js';

describe('isSyntheticPuzzleId (Spec 051 US3 / OI-84)', () => {
  test('DEV-injector ids are synthetic', () => {
    assert.equal(isSyntheticPuzzleId('dev-3333355553000111101040'), true);
    assert.equal(isSyntheticPuzzleId('dev-'), true);
  });

  test('lesson inline-challenge ids with no authored puzzleId are synthetic', () => {
    assert.equal(isSyntheticPuzzleId('inline-33330256555322322'), true);
    assert.equal(isSyntheticPuzzleId('inline-'), true);
  });

  test('a missing id counts as synthetic — there is nothing to look up', () => {
    assert.equal(isSyntheticPuzzleId(null), true);
    assert.equal(isSyntheticPuzzleId(undefined), true);
  });

  test('a real DB uuid is NOT synthetic, so it is still sent and still uses the stored set', () => {
    // Shape taken from a real local `puzzles` row id.
    assert.equal(isSyntheticPuzzleId('40c71be4-1d9e-4c0f-9a3b-2f5c8e7d1a06'), false);
  });

  test('a prefix appearing mid-string does not make an id synthetic', () => {
    // Only a genuine prefix disqualifies an id — a substring match would wrongly suppress
    // puzzleId for legitimate rows.
    assert.equal(isSyntheticPuzzleId('a-dev-board'), false);
    assert.equal(isSyntheticPuzzleId('lesson-inline-7'), false);
  });

  test('a numeric id is handled without throwing (ids are not guaranteed strings)', () => {
    assert.equal(isSyntheticPuzzleId(42), false);
  });
});
