import { parseBoardState, getWinningWindows } from '../../classifier.js';

/**
 * Given a finished (or unfinished) game movestring, return the winner and the
 * union of cells of every completed 4-window. Games stop at the first win, so
 * every winning window necessarily passes through the final move — checking
 * windows through the last disc is exhaustive.
 * @param {string} ms  0-indexed column digits, one per move
 * @returns {{ winner: 1|2|null, cells: Array<{row:number,col:number}>, windows: Array<Array<{row:number,col:number}>> }}
 */
export function extractOutcome(ms) {
  if (!ms.length) return { winner: null, cells: [], windows: [] };
  const { board, colHeights } = parseBoardState(ms);
  const lastCol = parseInt(ms[ms.length - 1], 10);
  const lastRow = colHeights[lastCol] - 1;
  const lastPlayer = (ms.length - 1) % 2 === 0 ? 1 : 2;
  const windows = getWinningWindows(board, lastRow, lastCol, lastPlayer);
  if (!windows.length) return { winner: null, cells: [], windows: [] };
  const seen = new Set();
  const cells = [];
  for (const w of windows) {
    for (const cell of w) {
      const k = `${cell.col},${cell.row}`;
      if (!seen.has(k)) { seen.add(k); cells.push(cell); }
    }
  }
  return { winner: lastPlayer, cells, windows };
}
