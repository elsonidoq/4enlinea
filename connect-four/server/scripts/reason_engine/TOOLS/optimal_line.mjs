#!/usr/bin/env node
// optimal_line.mjs — play solver-optimal moves (both sides) from a movestring to terminal,
// report the full line and the winning completion (last move + which player + winning 4-windows).
// Usage: node optimal_line.mjs <movestring>
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
const env = readFileSync(join(root, '.env'), 'utf8');
env.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const ROWS = 6, COLS = 7;
function buildBoard(ms) {
  // 0-indexed cols. returns grid[row][col] = 1 (first player) | 2 (second) | 0
  const heights = Array(COLS).fill(0);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [...ms].forEach((ch, i) => {
    const c = Number(ch);
    const r = heights[c]++;
    grid[r][c] = (i % 2 === 0) ? 1 : 2;
  });
  return { grid, heights };
}
function winningWindows(grid, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const wins = [];
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) for (const [dr,dc] of dirs) {
    const cells=[];
    for (let k=0;k<4;k++){const rr=r+dr*k,cc=c+dc*k; if(rr<0||rr>=ROWS||cc<0||cc>=COLS){cells.length=0;break;} cells.push([rr,cc]);}
    if (cells.length===4 && cells.every(([rr,cc])=>grid[rr][cc]===player)) wins.push(cells);
  }
  return wins;
}
const cellStr = (r,c) => `c${c+1}r${r+1}`;

const solver = createSolverProcess();
try {
  let ms = process.argv[2];
  const moves = [];
  for (let step=0; step<50; step++) {
    const scores = await solver.query(ms);
    const mover = (ms.length % 2 === 0) ? 1 : 2; // who moves next
    // pick optimal: maximize score for mover among legal (score != -1000)
    let bestCol=-1, bestScore=-Infinity;
    for (let c=0;c<COLS;c++){ if(scores[c]===-1000) continue; if(scores[c]>bestScore){bestScore=scores[c]; bestCol=c;} }
    if (bestCol===-1) break; // board full
    ms += String(bestCol);
    moves.push({ ply: ms.length, mover, col: bestCol, score: bestScore });
    // check win
    const { grid } = buildBoard(ms);
    const wins = winningWindows(grid, mover);
    if (wins.length) {
      // find the cell just placed
      const { heights } = buildBoard(ms.slice(0,-1));
      const r = heights[bestCol];
      console.log(JSON.stringify({
        terminal: 'win',
        winner: mover === 1 ? 'first(Green/P1)' : 'second(Gray/P2)',
        completingCell: cellStr(r, bestCol),
        completingPly: ms.length,
        winningWindows: wins.map(w => w.map(([rr,cc])=>cellStr(rr,cc))),
        line: moves.map(m=>`p${m.ply}:${m.mover===1?'G':'g'}col${m.col}(s${m.score})`).join(' '),
        finalMovestring: ms,
      }, null, 2));
      process.exit(0);
    }
    if (ms.length === 42) { console.log('board full, no win'); break; }
  }
} finally {
  solver.destroy();
}
