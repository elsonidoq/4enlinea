// Tests for server/mistakeStorageRule.js — the single storage gate for game
// mistakes (all three write paths: /api/games/analyze, papergamesImporter,
// POST /api/blunders).
//
// Movestring fixtures are REAL positions sampled via gameSampling.playGame
// (never hand-constructed) and verified with visualize_board.sh:
//   '332434101112336'                  — the production slower-win case (blunder
//                                        84a72068…): mover P2, scores best 5 (col 4) / played 4 (col 6)
//   '45231314'                         — mover P1 alive, both-negative (best -3, played -5)
//   '25522253665554660011'             — mover P1 alive, both-negative (best -2, played -11)
//   '3553535536303016622654014121144'  — mover P2 DEAD: every 4-window containing
//                                        an O disc or reachable by O is blocked by X
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStoredMistake, playerHasPotentialWin } from '../../server/mistakeStorageRule.js';
import { parseBoardState } from '../../server/classifier.js';

// ── playerHasPotentialWin ────────────────────────────────────────────────────

test('empty board: both players have potential wins', () => {
  const { board } = parseBoardState('');
  assert.equal(playerHasPotentialWin(board, 1), true);
  assert.equal(playerHasPotentialWin(board, 2), true);
});

test('sampled dead position: mover (P2) has no potential win, opponent does', () => {
  const { board } = parseBoardState('3553535536303016622654014121144');
  assert.equal(playerHasPotentialWin(board, 2), false);
  assert.equal(playerHasPotentialWin(board, 1), true);
});

test('sampled alive losing position: mover still has potential wins', () => {
  const { board } = parseBoardState('45231314');
  assert.equal(playerHasPotentialWin(board, 1), true);
});

// ── classifyStoredMistake ────────────────────────────────────────────────────

test('slower win is not stored (production case 84a72068…)', () => {
  assert.equal(classifyStoredMistake(5, 4, '332434101112336'), null);
});

test('optimal / equal-score move is not stored', () => {
  assert.equal(classifyStoredMistake(3, 3, '332434101112336'), null);
  assert.equal(classifyStoredMistake(-5, -5, '45231314'), null);
});

test('non-numeric scores are not stored', () => {
  assert.equal(classifyStoredMistake(undefined, 2, ''), null);
  assert.equal(classifyStoredMistake(2, null, ''), null);
});

test('outcome-class drops are stored, graded by score drop > 4', () => {
  // win → draw, small drop
  assert.deepEqual(classifyStoredMistake(2, 0, ''), { quality: 'suboptimal' });
  // win → loss, large drop
  assert.deepEqual(classifyStoredMistake(10, -3, ''), { quality: 'blunder' });
  // draw → loss
  assert.deepEqual(classifyStoredMistake(0, -3, ''), { quality: 'suboptimal' });
  assert.deepEqual(classifyStoredMistake(0, -8, ''), { quality: 'blunder' });
});

test('faster loss while ALIVE is stored, graded by score drop', () => {
  // drop 2 → suboptimal
  assert.deepEqual(classifyStoredMistake(-3, -5, '45231314'), { quality: 'suboptimal' });
  // drop 9 → blunder
  assert.deepEqual(classifyStoredMistake(-2, -11, '25522253665554660011'), { quality: 'blunder' });
});

test('faster loss while DEAD is not stored, regardless of drop size', () => {
  const deadMs = '3553535536303016622654014121144';
  assert.equal(classifyStoredMistake(-5, -9, deadMs), null);
  assert.equal(classifyStoredMistake(-5, -18, deadMs), null);
});

test('class drop is stored even from the dead fixture board (deadness only gates both-negative)', () => {
  // Hypothetical scores on the dead board: if best were a draw the mover is by
  // definition not dead in the solver's eyes — the guard must not run there.
  assert.deepEqual(classifyStoredMistake(0, -6, '3553535536303016622654014121144'),
    { quality: 'blunder' });
});
