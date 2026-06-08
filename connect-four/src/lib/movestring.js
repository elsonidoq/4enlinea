/**
 * Movestring utilities for the lesson editor.
 * Movestrings use 0-indexed columns (0–6). Only c4solver-wrapper.js
 * ever translates to 1-indexed; nothing here should.
 *
 * Player assignment: odd move index (0-based) = 'yellow'; even = 'red'.
 * i.e. move 0 (first move) is red, move 1 is yellow, etc.
 */

/** Parse a movestring into a 6×7 board array ('empty' | 'red' | 'yellow'). */
export function parseMovestring(movestring) {
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  const heights = Array(7).fill(0);
  for (let i = 0; i < movestring.length; i++) {
    const col = parseInt(movestring[i], 10);
    if (isNaN(col) || col < 0 || col > 6) continue;
    const row = heights[col];
    if (row >= 6) continue;
    board[row][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return board;
}

/**
 * Convert a board array to a boardSpec (7-element string array).
 * 'red' -> 'g', 'yellow' -> 'd'. Stops at the first empty cell per column.
 */
export function boardToSpec(board) {
  const spec = Array(7).fill('');
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 6; r++) {
      if (board[r][c] === 'empty') break;
      spec[c] += board[r][c] === 'red' ? 'g' : 'd';
    }
  }
  return spec;
}

export function appendMove(movestring, col) {
  return movestring + String(col);
}

export function undoMove(movestring) {
  return movestring.slice(0, -1);
}

export function getColHeights(movestring) {
  const h = Array(7).fill(0);
  for (const ch of movestring) {
    const col = parseInt(ch, 10);
    if (!isNaN(col) && col >= 0 && col <= 6) h[col]++;
  }
  return h;
}

export function isColFull(movestring, col) {
  return getColHeights(movestring)[col] >= 6;
}

export function nextPlayer(movestring) {
  return movestring.length % 2 === 0 ? 'red' : 'yellow';
}
