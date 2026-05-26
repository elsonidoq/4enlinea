// CompletionStrategy interface and implementations for sequence-mode puzzles.
// All validation is bitboard-only — no solver calls.

import { checkWin, countWinningThreats } from './classifier.js';

const ROWS = 6;
const COLS = 7;

export function parseBoardState(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const colHeights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    board[colHeights[col]][col] = (i % 2 === 0) ? 1 : 2;
    colHeights[col]++;
  }
  return { board, colHeights };
}

export class ForcedWinStrategy {
  // Returns { valid: true } or { valid: false, reason: string }.
  // position: 1-indexed move string before the learner's move.
  // col: 0-indexed column the learner plays.
  validateMove(position, col) {
    const { board, colHeights } = parseBoardState(position);
    const learner = position.length % 2 === 0 ? 1 : 2;

    // (a) No immediate threat for learner before the move (FR-006a).
    const boardCopy = board.map(r => [...r]);
    const heightsCopy = [...colHeights];
    if (countWinningThreats(boardCopy, heightsCopy, learner) > 0) {
      return {
        valid: false,
        reason: 'You had an immediate win available — play through the forcing sequence instead.',
      };
    }

    // Apply the learner's move.
    const row = colHeights[col];
    const boardAfter = board.map(r => [...r]);
    const heightsAfter = [...colHeights];
    boardAfter[row][col] = learner;
    heightsAfter[col]++;

    // (b) At least one immediate threat after the move.
    if (countWinningThreats(boardAfter, heightsAfter, learner) === 0) {
      return {
        valid: false,
        reason: 'Move was not forcing: no new immediate threat created.',
      };
    }

    return { valid: true };
  }
}

// Returns the 0-indexed column where the learner has an immediate threat.
// positionAfterLearnerMove: 1-indexed move string including the learner's latest move.
export function getAiResponseCol(positionAfterLearnerMove) {
  const { board, colHeights } = parseBoardState(positionAfterLearnerMove);
  // The learner played last: they are player ((len-1) % 2 === 0 ? 1 : 2).
  const learner = positionAfterLearnerMove.length % 2 === 1 ? 1 : 2;
  for (let col = 0; col < COLS; col++) {
    const row = colHeights[col];
    if (row >= ROWS) continue;
    board[row][col] = learner;
    const wins = checkWin(board, row, col, learner);
    board[row][col] = 0;
    if (wins) return col;
  }
  return -1;
}

// Returns the number of immediate threats for the learner after playing col in position.
export function countThreatsAfterMove(position, col) {
  const { board, colHeights } = parseBoardState(position);
  const learner = position.length % 2 === 0 ? 1 : 2;
  const row = colHeights[col];
  const boardAfter = board.map(r => [...r]);
  const heightsAfter = [...colHeights];
  boardAfter[row][col] = learner;
  heightsAfter[col]++;
  return countWinningThreats(boardAfter, heightsAfter, learner);
}
