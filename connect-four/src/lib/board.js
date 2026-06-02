// Shared board utility — used by PuzzlesPage and ChallengeScreen.
// Row 0 = bottom, row 5 = top. Cell values: 'empty', 'red', 'yellow'.

const COLS = 7;
const ROWS = 6;

/**
 * Build a board state from a move string.
 * @param {string} moves  0-indexed move string (digits 0–6, no separator).
 * @returns {{ board: string[][], heights: number[] }}
 */
export function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return { board, heights };
}

/**
 * Check if a disc placement creates 4-in-a-row.
 * @param {string[][]} board  2D board array (row 0 = bottom).
 * @param {number} row  0-indexed row of the placed disc.
 * @param {number} col  0-indexed column of the placed disc.
 * @param {string} color  'red' or 'yellow'.
 * @returns {boolean}
 */
export function checkWin(board, row, col, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let d = 1; d <= 3; d++) {
      const r = row + dr*d, c = col + dc*d;
      if (r>=0&&r<ROWS&&c>=0&&c<COLS&&board[r][c]===color) cnt++; else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r = row - dr*d, c = col - dc*d;
      if (r>=0&&r<ROWS&&c>=0&&c<COLS&&board[r][c]===color) cnt++; else break;
    }
    if (cnt >= 4) return true;
  }
  return false;
}

// Dev-mode smoke check: verify checkWin indexing is consistent with buildBoard.
// buildBoard("0616263") produces a Red horizontal win at row 0 (cols 0,1,2,3).
const { board: _smokeBoard } = buildBoard("0616263");
console.assert(
  checkWin(_smokeBoard, 0, 3, 'red') === true,
  'checkWin: horizontal 4-in-a-row not detected at (0,3,red) in buildBoard("0616263")'
);
