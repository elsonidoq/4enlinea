#!/usr/bin/env node
// decisive_check.mjs — Re-solve-confirm whether a candidate completingCell is GENUINELY
// decisive (the win completes through it under OPTIMAL defense) or merely a blockable
// intermediate threat surfaced by pickEarliestWay.
//
// Method: from the given board, play solver-optimal moves for BOTH sides (winner maximizes
// score, defender plays its own max = least-bad = optimal defense) to terminal. Then:
//   - report the terminal winner, the completing cell, and the completed window(s);
//   - DECISIVE  iff the opponent wins AND the candidate cell lies in a completed window
//     (or IS the completing cell);
//   - BLOCKABLE iff optimal defense avoids the opponent win, OR the win completes through a
//     DIFFERENT window not containing the candidate (the earliest-surfaced cell was not the
//     real resolution).
// Also reports, at the first node where the candidate cell becomes gravity-top with the
// DEFENDER to move, whether the defender could occupy it (a crude single-line blockability probe).
//
// Usage: node decisive_check.mjs <movestring> <candidateCell cNrM>
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const ROWS = 6, COLS = 7;
const cellStr = (r, c) => `c${c + 1}r${r + 1}`;
function parseCell(s) { const m = /^c(\d)r(\d)$/.exec(s); return { c: Number(m[1]) - 1, r: Number(m[2]) - 1 }; }
function buildBoard(ms) {
  const heights = Array(COLS).fill(0);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [...ms].forEach((ch, i) => { const c = Number(ch); const r = heights[c]++; grid[r][c] = (i % 2 === 0) ? 1 : 2; });
  return { grid, heights };
}
function winningWindows(grid, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]; const wins = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of dirs) {
    const cells = [];
    for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { cells.length = 0; break; } cells.push([rr, cc]); }
    if (cells.length === 4 && cells.every(([rr, cc]) => grid[rr][cc] === player)) wins.push(cells);
  }
  return wins;
}

const movestring = process.argv[2];
const candidate = parseCell(process.argv[3]);
const candStr = process.argv[3];

const solver = await createSolverProcess();
try {
  let ms = movestring;
  const moves = [];
  let defenderCouldOccupy = null;
  const startMover = (ms.length % 2 === 0) ? 1 : 2;
  const winnerSide = startMover; // opponent-to-move is the punisher in our usage
  let result = null;
  for (let step = 0; step < 50; step++) {
    const scores = await solver.query(ms);
    const mover = (ms.length % 2 === 0) ? 1 : 2;
    // blockability probe: if candidate cell is gravity-top now AND defender (non-winner) to move
    const { heights } = buildBoard(ms);
    if (defenderCouldOccupy === null && heights[candidate.c] === candidate.r && mover !== winnerSide) {
      defenderCouldOccupy = scores[candidate.c] !== -1000; // defender can legally drop into that column now
    }
    let bestCol = -1, bestScore = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === -1000) continue; if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; } }
    if (bestCol === -1) break;
    ms += String(bestCol);
    moves.push(`p${ms.length}:${mover === 1 ? 'G' : 'g'}col${bestCol}(s${bestScore})`);
    const { grid } = buildBoard(ms);
    const wins = winningWindows(grid, mover);
    if (wins.length) {
      const { heights: hPrev } = buildBoard(ms.slice(0, -1));
      const r = hPrev[bestCol];
      const winWindows = wins.map(w => w.map(([rr, cc]) => cellStr(rr, cc)));
      const candInWindow = winWindows.some(w => w.includes(candStr));
      const completing = cellStr(r, bestCol);
      result = {
        terminal: 'win',
        winner: mover === 1 ? 'first(Green/P1)' : 'second(Gray/P2)',
        winnerIsPunisher: mover === winnerSide,
        completingCell: completing,
        completingCellIsCandidate: completing === candStr,
        candidate: candStr,
        candidateInCompletedWindow: candInWindow,
        winningWindows: winWindows,
        verdict: (mover === winnerSide && candInWindow)
          ? 'DECISIVE (win completes through candidate under optimal defense)'
          : (mover === winnerSide)
            ? 'NOT-THIS-CELL (opponent wins but through a different window)'
            : 'BLOCKABLE (defender escapes / candidate not decisive)',
        defenderCouldOccupyCandidateWhenGravityTop: defenderCouldOccupy,
        line: moves.join(' '),
      };
      break;
    }
    if (ms.length === 42) { result = { terminal: 'draw', verdict: 'BLOCKABLE (drawn under optimal defense)', line: moves.join(' ') }; break; }
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  solver.destroy();
}
