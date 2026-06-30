// boardUtils.mjs — shared, solver-free board helpers for the reason-audit engine.
//
// Extracted to kill the copy-paste that was duplicated across every TOOLS/*.mjs script
// (buildBoard / winningWindows / cellStr / parseCell / env loader). One mechanism, one place.
//
// Coordinate convention (project-wide): 0-indexed internally — row 0 = bottom, col 0 = left.
// Display strings are 1-indexed (cNrM) only at this boundary, matching every other TOOL.
import { readFileSync } from 'fs';

export const ROWS = 6;
export const COLS = 7;
export const INVALID_MOVE = -1000;

/** Load connect-four/server/.env into process.env (dotenv is not reliable under `node -e`). */
export function loadEnv(envPath) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

/**
 * Build a grid[row][col] from a movestring. grid cell = 1 (first player) | 2 (second) | 0 (empty).
 * Also returns per-column heights (number of discs stacked).
 */
export function buildBoard(ms) {
  const heights = Array(COLS).fill(0);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [...ms].forEach((ch, i) => {
    const c = Number(ch);
    const r = heights[c]++;
    grid[r][c] = (i % 2 === 0) ? 1 : 2;
  });
  return { grid, heights };
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** All completed 4-windows owned by `player` on grid. Returns arrays of [row,col]. */
export function winningWindows(grid, player) {
  const wins = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of DIRS) {
    const cells = [];
    for (let k = 0; k < 4; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { cells.length = 0; break; }
      cells.push([rr, cc]);
    }
    if (cells.length === 4 && cells.every(([rr, cc]) => grid[rr][cc] === player)) wins.push(cells);
  }
  return wins;
}

/** 0-indexed (row,col) -> display string c{col+1}r{row+1}. */
export const cellStr = (r, c) => `c${c + 1}r${r + 1}`;

/** Parse a display string c{C}r{R} back to 0-indexed { c, r }. */
export function parseCell(s) {
  const m = /^c(\d)r(\d)$/.exec(s);
  if (!m) return null;
  return { c: Number(m[1]) - 1, r: Number(m[2]) - 1 };
}

/** Empty cells remaining on the board. */
export const emptyCellCount = (ms) => ROWS * COLS - ms.length;

/** Legal columns (not full) given a solver score vector. */
export function legalCols(scores) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (scores[c] !== INVALID_MOVE) out.push(c);
  return out;
}
