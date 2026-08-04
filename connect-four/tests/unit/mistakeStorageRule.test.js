// Tests for server/mistakeStorageRule.js — the single storage-ELIGIBILITY gate
// for game mistakes (write paths: /api/games/analyze, papergamesImporter).
// Grading (the 'blunder'/'suboptimal' label) is no longer this module's job —
// see server/moveQualityScorer.js (FR-019a, spec 057).
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
  assert.equal(classifyStoredMistake(5, 4, '332434101112336'), false);
});

test('optimal / equal-score move is not stored', () => {
  assert.equal(classifyStoredMistake(3, 3, '332434101112336'), false);
  assert.equal(classifyStoredMistake(-5, -5, '45231314'), false);
});

test('non-numeric scores are not stored', () => {
  assert.equal(classifyStoredMistake(undefined, 2, ''), false);
  assert.equal(classifyStoredMistake(2, null, ''), false);
});

test('outcome-class drops are eligible for storage regardless of drop size', () => {
  // win → draw, small drop
  assert.equal(classifyStoredMistake(2, 0, ''), true);
  // win → loss, large drop
  assert.equal(classifyStoredMistake(10, -3, ''), true);
  // draw → loss
  assert.equal(classifyStoredMistake(0, -3, ''), true);
  assert.equal(classifyStoredMistake(0, -8, ''), true);
});

test('faster loss while ALIVE is eligible for storage', () => {
  // drop 2
  assert.equal(classifyStoredMistake(-3, -5, '45231314'), true);
  // drop 9
  assert.equal(classifyStoredMistake(-2, -11, '25522253665554660011'), true);
});

test('faster loss while DEAD is not stored, regardless of drop size', () => {
  const deadMs = '3553535536303016622654014121144';
  assert.equal(classifyStoredMistake(-5, -9, deadMs), false);
  assert.equal(classifyStoredMistake(-5, -18, deadMs), false);
});

test('class drop is stored even from the dead fixture board (deadness only gates both-negative)', () => {
  // Hypothetical scores on the dead board: if best were a draw the mover is by
  // definition not dead in the solver's eyes — the guard must not run there.
  assert.equal(classifyStoredMistake(0, -6, '3553535536303016622654014121144'), true);
});
