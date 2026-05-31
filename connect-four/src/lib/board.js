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
