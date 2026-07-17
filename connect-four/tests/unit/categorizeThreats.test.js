// Unit tests for categorizeThreats (classifier.js) — the canonical parity-aware threat
// categorizer. Geometry-only, no solver. Covers: parity split, immediate-cell exclusion,
// shadow-minor exclusion, and player-vs-opponent symmetry.
//
// Movestring sources (all solver-verified via ./visualize_board.sh, never hand-built):
//   '3342652334' — Gray (P=2) holds a LATENT major threat at c3r4 (0-idx col2,row3).
//                  row3 is odd → parity-aligned for Gray. Sourced via gameSampling.playGame.
//   '542344233'  — Green (P=1) holds a LATENT major threat at c3r4. row3 is odd → OFF-parity
//                  for Green. Same board used by tests/unit/minorThreatWindows.test.js, whose
//                  shadow window [c5r2,c4r3,c3r4,c2r5] must be excluded → c2r5 is not a minor.
//   '33442'      — Red (P=1) has only GRAVITY-TOP major threats (c2r1,c6r1) → excluded from
//                  the major buckets (those are immediate_threats, not latent threats).

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Board, categorizeThreats, getMinorThreatWindows, emptyCellsFromWindows } from '../../server/classifier.js';

describe('categorizeThreats', () => {
  test('parity split: a Gray major on an odd row is parity-aligned', () => {
    const cat = categorizeThreats(new Board('3342652334'), 2);
    assert.deepEqual(cat.player.majorParityAligned.cells, ['c3r4']);
    assert.equal(cat.player.majorParityAligned.count, 1);
    assert.deepEqual(cat.player.majorNonParity.cells, []);
  });

  test('parity split: the SAME Green major (odd row) is OFF-parity for Green', () => {
    const cat = categorizeThreats(new Board('542344233'), 1);
    assert.deepEqual(cat.player.majorNonParity.cells, ['c3r4']);
    assert.equal(cat.player.majorNonParity.count, 1);
    assert.deepEqual(cat.player.majorParityAligned.cells, []);
  });

  test('player vs opponent symmetry: flipping perspective moves the threat to the opponent bucket', () => {
    // Gray's parity-aligned threat becomes the opponent's parity-aligned threat from Green's view.
    const fromGray = categorizeThreats(new Board('3342652334'), 2);
    const fromGreen = categorizeThreats(new Board('3342652334'), 1);
    assert.deepEqual(fromGray.player.majorParityAligned.cells, ['c3r4']);
    assert.deepEqual(fromGreen.opponent.majorParityAligned.cells, ['c3r4']);
    assert.deepEqual(fromGreen.player.majorParityAligned.cells, []);
  });

  test('immediately-playable (gravity-top) majors are excluded from the major buckets', () => {
    const cat = categorizeThreats(new Board('33442'), 1);
    // Red's c2r1 / c6r1 are gravity-top wins (immediate_threat), not latent threats.
    const allMajors = [
      ...cat.player.majorParityAligned.cells,
      ...cat.player.majorNonParity.cells,
    ];
    assert.ok(!allMajors.includes('c2r1'), 'gravity-top major excluded');
    assert.ok(!allMajors.includes('c6r1'), 'gravity-top major excluded');
    assert.deepEqual(allMajors, []);
  });

  test('minors use the app-canonical windows: shadow window cell c2r5 is excluded', () => {
    const cat = categorizeThreats(new Board('542344233'), 1);
    // c2r5 only arises from the shadow window of Green's major anti-diagonal — must be excluded.
    assert.ok(!cat.player.minor.cells.includes('c2r5'), 'shadow minor cell excluded');
    // And the minor bucket equals the canonical windows→empty-cells projection.
    const expected = emptyCellsFromWindows(new Board('542344233').board, getMinorThreatWindows(new Board('542344233').board, 1));
    assert.deepEqual(cat.player.minor.cells, expected);
    assert.equal(cat.player.minor.count, expected.length);
  });

  test('cells are sorted "cNrM" 1-indexed strings', () => {
    const cat = categorizeThreats(new Board('542344233'), 1);
    for (const cell of cat.player.minor.cells) {
      assert.match(cell, /^c\d+r\d+$/);
    }
    const sorted = [...cat.player.minor.cells].sort();
    assert.deepEqual(cat.player.minor.cells, sorted);
  });
});
