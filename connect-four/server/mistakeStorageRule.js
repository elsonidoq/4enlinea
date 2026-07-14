// Storage rule for game mistakes (2026-07 product decision, supersedes the
// "store every non-optimal ply" behavior of migration 051):
//
// A non-optimal move is stored in `blunders` only when it is a mistake the
// player could meaningfully have avoided:
//   1. Slower win (bestScore > 0 && playedScore > 0): NOT stored. The reason
//      engine's case taxonomy treats win_to_slower_win as notABlunder, so a
//      stored row would serve the contradictory "no better alternative"
//      explanation.
//   2. Outcome-class drop (sign(played) < sign(best): win→draw, win→loss,
//      draw→loss): stored.
//   3. Faster loss (both scores < 0): stored ONLY while the player is still
//      alive — i.e. he retains at least one potential four-in-a-row window.
//      Once every 4-window containing his discs-or-empties is blocked by an
//      opponent disc, he cannot connect four no matter what either side
//      plays, and accelerating the loss is not a reviewable mistake.
//
// Case 3's aliveness gate is deliberately NOT the old `bestScore < 0` skip
// that data-model.md (migration 029 note) warns about: solver-lost positions
// are the norm for the second player (Connect Four is a first-player win),
// but a solver-lost player almost always still has live windows, so his
// mistakes keep being stored. Only truly dead positions are exempt.
//
// Stored mistakes are graded on the solver score drop, mirroring the
// threshold precedent in scoreMove's losing branch:
//   bestScore - playedScore > 4  → 'blunder'
//   otherwise                    → 'suboptimal'

import { parseBoardState } from './classifier.js';

const ROWS = 6;
const COLS = 7;

/**
 * True if `player` can still, in principle, complete four-in-a-row: at least
 * one horizontal/vertical/diagonal 4-cell window contains no opponent disc.
 * Static scan of all 69 windows — no solver, no gravity/parity reasoning
 * (a window of empties is counted as live even if filling it is unlikely).
 *
 * @param {number[][]} board  6x7 grid from parseBoardState (0 empty, 1/2 discs; row 0 = bottom)
 * @param {number} player     1 or 2
 * @returns {boolean}
 */
export function playerHasPotentialWin(board, player) {
  const opponent = 3 - player;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + 3 * dr;
        const endCol = col + 3 * dc;
        if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;
        let blocked = false;
        for (let k = 0; k < 4; k++) {
          if (board[row + k * dr][col + k * dc] === opponent) { blocked = true; break; }
        }
        if (!blocked) return true;
      }
    }
  }
  return false;
}

function sign(v) {
  if (v > 0) return 1;
  if (v === 0) return 0;
  return -1;
}

/**
 * Decide whether a non-optimal played move is stored as a mistake, and with
 * which quality. Single source of truth for all three write paths
 * (POST /api/games/analyze, papergamesImporter.extractBlunders,
 * POST /api/blunders).
 *
 * @param {number} bestScore    solver score of the best column (mover's POV)
 * @param {number} playedScore  solver score of the column actually played
 * @param {string} movestring   PRE-move movestring (the position the move was made in)
 * @returns {null | { quality: 'suboptimal'|'blunder' }}  null = do not store
 */
export function classifyStoredMistake(bestScore, playedScore, movestring) {
  if (typeof bestScore !== 'number' || typeof playedScore !== 'number') return null;
  if (playedScore >= bestScore) return null; // optimal (best is the max)

  // Case 1: slower win — still winning, nothing outcome-changing to punish.
  if (bestScore > 0 && playedScore > 0) return null;

  // Case 3: faster loss — store only while the mover is still alive.
  if (bestScore < 0) {
    if (typeof movestring !== 'string') return null;
    const mover = movestring.length % 2 === 0 ? 1 : 2;
    const { board } = parseBoardState(movestring);
    if (!playerHasPotentialWin(board, mover)) return null;
  } else if (sign(playedScore) >= sign(bestScore)) {
    // Defensive: unreachable given the guards above (bestScore >= 0 and
    // playedScore < bestScore always drops a class unless both > 0).
    return null;
  }

  // Case 2/3 stored: grade by score drop (same >4 threshold as scoreMove's
  // losing branch).
  return { quality: bestScore - playedScore > 4 ? 'blunder' : 'suboptimal' };
}
