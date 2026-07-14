// Shared board utility — used by ChallengeScreen and other screens.
// Row 0 = bottom, row 5 = top. Cell values: 'empty', 'red', 'yellow'.
// NOTE: 'red'/'yellow' are kept for historical reasons — they are internal
// player-1/player-2 identity tokens, NOT display colors. The Board renders
// 'red' as a GREEN disc and 'yellow' as a GRAY disc. Do not rename without
// the holistic Epic 12 migration. See docs/architecture/frontend-conventions.md.

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

/**
 * Find all cells that are part of a major (3-in-a-row) or minor (2-in-a-row)
 * threat for either player. Used by zone annotation "tg" resolution.
 *
 * O(ROWS × COLS × 4 directions × 4 offsets) = O(672) — sub-millisecond.
 *
 * @param {string[][]} board  2D board (row 0 = bottom), values: 'empty','red','yellow'
 * @returns {Object<string, {rm: boolean, rn: boolean, ym: boolean, yn: boolean}>}
 *   Keys are "row,col" strings. rm/rn = red major/minor, ym/yn = yellow major/minor.
 */
export function getMajorThreatCells(board) {
  const map = {};
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 'empty') continue;

      let rm = false, rn = false, ym = false, yn = false;

      for (const [dr, dc] of dirs) {
        for (let off = 0; off <= 3; off++) {
          const sr = r - dr * off, sc = c - dc * off;
          let red = 0, yel = 0, valid = true;

          for (let i = 0; i < 4; i++) {
            const nr = sr + dr * i, nc = sc + dc * i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
            if (board[nr][nc] === 'red') red++;
            else if (board[nr][nc] === 'yellow') yel++;
          }

          if (!valid || (red > 0 && yel > 0)) continue;

          const empty = 4 - red - yel;
          if (red === 3 && empty === 1) rm = true;
          else if (red === 2 && empty === 2) rn = true;
          if (yel === 3 && empty === 1) ym = true;
          else if (yel === 2 && empty === 2) yn = true;
        }
      }

      if (rm || rn || ym || yn) map[`${r},${c}`] = { rm, rn, ym, yn };
    }
  }

  return map;
}

/**
 * Convert a boardSpec (compact column-string encoding) to a 6×7 board array.
 *
 * boardSpec: Array[7] of strings; char index = row (0=bottom);
 *   'g' → 'red' (renders as green disc in UI)
 *   'd' → 'yellow' (renders as gray disc in UI)
 *
 * NOTE: 'red' renders GREEN and 'yellow' renders GRAY in the production Board
 * component. This is intentional — do NOT change the mapping.
 *
 * @param {string[]} boardSpec  7-element array of column strings
 * @returns {string[][]}  board[row][col] 6×7 array with 'empty'/'red'/'yellow' values
 */
export function boardSpecToBoard(boardSpec) {
  const result = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  boardSpec.forEach((colStr, c) => {
    for (let r = 0; r < colStr.length; r++) {
      result[r][c] = colStr[r] === 'g' ? 'red' : 'yellow';
    }
  });
  return result;
}

/**
 * Derive a stable, value-based signature string for a 6×7 board array.
 *
 * Spec 046 US5 (FR-022/FR-024): used to gate `Board` re-rendering on VALUE
 * equality rather than array-reference equality. Callers like ConceptScreen
 * (`boardSpecToBoard(...)` inline in JSX) and SocraticScreen
 * (`board.map(r => [...r])`) rebuild a brand-new `board` array on every
 * render even when the underlying disc placements haven't changed; comparing
 * signatures instead of references lets `Board` bail out of re-rendering
 * (and touching already-placed-disc DOM nodes) in that case.
 *
 * Keyed by `(row, col, value)` for every cell, in row-major order — two
 * boards with identical placements (regardless of array identity) produce
 * the identical string.
 *
 * @param {string[][]} board  6×7 board array (row 0 = bottom); tolerates a
 *   ragged/undefined board defensively (missing cells read as 'empty').
 * @returns {string}
 */
export function deriveBoardSignature(board) {
  const rows = Array.isArray(board) ? board.length : 0;
  let sig = '';
  for (let r = 0; r < rows; r++) {
    const row = board[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const value = row[c] ?? 'empty';
      if (value !== 'empty') sig += `${r},${c},${value}|`;
    }
  }
  return sig;
}

/**
 * Custom React.memo comparator for the `Board` component (spec 046 US5,
 * FR-022/FR-024/SC-007).
 *
 * Root-cause context: `Board` is a fairly expensive render (42 cells, each
 * rebuilding style objects, overlay/shim lookups, and a threat-zone SVG) and
 * — before this fix — was a plain, non-memoized function component: React
 * had no bail-out and fully re-executed it on every parent render. Its
 * parents (`ConceptScreen.jsx`, `SocraticScreen.jsx`, and others) frequently
 * hand it a brand-new `board` array on every render even when the disc
 * placements are unchanged (e.g. `boardSpecToBoard(...)` called inline in
 * JSX, or `board.map(r => [...r])` on every tap) — plain reference equality
 * would defeat memoization for the one prop that matters most for the
 * reported flicker. `board` is therefore compared by VALUE via
 * `deriveBoardSignature`; every other prop falls back to `Object.is`
 * (React.memo's default shallow-compare semantics), so a genuinely new
 * overlay/lastDrop/etc. still triggers a re-render as before.
 *
 * Lives in this plain `.js` file (not `Board.jsx`) specifically so it is
 * importable from a `node:test` unit test (`node --test` cannot import
 * `.jsx`) — see `tests/unit/boardMemoStability.test.js`.
 *
 * @param {object} prevProps
 * @param {object} nextProps
 * @returns {boolean} true when React should SKIP re-rendering (props "equal")
 */
export function boardPropsAreEqual(prevProps, nextProps) {
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
  for (const key of keys) {
    if (key === 'board') {
      if (deriveBoardSignature(prevProps.board) !== deriveBoardSignature(nextProps.board)) {
        return false;
      }
      continue;
    }
    if (!Object.is(prevProps[key], nextProps[key])) return false;
  }
  return true;
}

/**
 * Convert a cols array (7 strings in g/d encoding, bottom-to-top per column)
 * to a 6x7 board array suitable for the Board component.
 *
 * g -> 'red', d -> 'yellow'. Input validation returns empty board on failure.
 *
 * @param {string[]} cols — 7 strings in g/d encoding, bottom-to-top per column
 * @returns {string[][]} board[row][col] with 'empty'|'red'|'yellow' values
 */
export function colsToBoard(cols) {
  if (!Array.isArray(cols) || cols.length !== 7) {
    return Array.from({ length: 6 }, () => Array(7).fill('empty'));
  }
  try {
    return boardSpecToBoard(cols);
  } catch (_e) {
    return Array.from({ length: 6 }, () => Array(7).fill('empty'));
  }
}
