#!/usr/bin/env node
// forward_projection.mjs — walk the solver-optimal line (BOTH sides optimal) from a movestring
// to terminal, and at every ply report the set of MAJOR threats (3 discs + 1 empty in a 4-window)
// for each player, the empty completing cell, and whether that cell is currently gravity-reachable.
// Then summarize: the terminal winning window(s)/cell, and the EARLIEST ply at which the eventual
// winning window first became a 3/1 major threat (i.e. when the deciding threat "appeared").
//
// Purpose (design audit, Residue B): decide whether a bounded FORWARD parity projection could surface
// a COMPACT, STABLE "eventual controlling threat" (single column + completing cell) to attribute a
// deep-zugzwang FLIP, or whether the win is a diffuse board-fill with no single nameable cell.
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/TOOLS/forward_projection.mjs <movestring> [maxPlies]
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
function buildBoard(ms) {
  const heights = Array(COLS).fill(0);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [...ms].forEach((ch, i) => { const c = Number(ch); const r = heights[c]++; grid[r][c] = (i % 2 === 0) ? 1 : 2; });
  return { grid, heights };
}
const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
function allWindows() {
  const w = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of dirs) {
    const cells = [];
    for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { cells.length = 0; break; } cells.push([rr, cc]); }
    if (cells.length === 4) w.push(cells);
  }
  return w;
}
const WINDOWS = allWindows();
// major threats: 3 of player + 1 empty. Returns {player, emptyCell, reachable, windowKey}
function majorThreats(grid, heights) {
  const out = [];
  for (const win of WINDOWS) {
    for (const player of [1, 2]) {
      let cnt = 0, empties = [];
      for (const [r, c] of win) { if (grid[r][c] === player) cnt++; else if (grid[r][c] === 0) empties.push([r, c]); else { cnt = -99; break; } }
      if (cnt === 3 && empties.length === 1) {
        const [er, ec] = empties[0];
        out.push({ player, emptyCell: cellStr(er, ec), col: ec, row: er, reachable: heights[ec] === er, windowKey: win.map(([r, c]) => `${r},${c}`).join('|') });
      }
    }
  }
  return out;
}
function winningWindowsFor(grid, player) {
  const wins = [];
  for (const win of WINDOWS) if (win.every(([r, c]) => grid[r][c] === player)) wins.push(win);
  return wins;
}

const solver = createSolverProcess();
try {
  let ms = process.argv[2];
  const maxPlies = Number(process.argv[3] ?? 50);
  const startDiscs = ms.length;
  const trace = [];
  let terminal = null;
  // earliest appearance of each major-threat window key, per player
  const firstSeen = new Map(); // key -> {ply, player, emptyCell}
  for (let step = 0; step < maxPlies; step++) {
    const scores = await solver.query(ms);
    const mover = (ms.length % 2 === 0) ? 1 : 2;
    let bestCol = -1, bestScore = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === -1000) continue; if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; } }
    if (bestCol === -1) break;
    ms += String(bestCol);
    const { grid, heights } = buildBoard(ms);
    const mts = majorThreats(grid, heights);
    for (const t of mts) {
      const key = `${t.player}:${t.windowKey}`;
      if (!firstSeen.has(key)) firstSeen.set(key, { ply: ms.length, player: t.player, emptyCell: t.emptyCell, col: t.col, reachable: t.reachable });
    }
    const p1mt = mts.filter(t => t.player === 1).map(t => `${t.emptyCell}${t.reachable ? '*' : ''}`);
    const p2mt = mts.filter(t => t.player === 2).map(t => `${t.emptyCell}${t.reachable ? '*' : ''}`);
    trace.push(`p${ms.length} ${mover === 1 ? 'G' : 'g'}col${bestCol}(s${bestScore})  P1mj:[${[...new Set(p1mt)].join(',')}] P2mj:[${[...new Set(p2mt)].join(',')}]`);
    const wins = winningWindowsFor(grid, mover);
    if (wins.length) {
      const { heights: hPrev } = buildBoard(ms.slice(0, -1));
      const r = hPrev[bestCol];
      const winKeys = wins.map(w => w.map(([rr, cc]) => `${rr},${cc}`).join('|'));
      terminal = {
        terminal: 'win', winner: mover === 1 ? 'P1(Green)' : 'P2(Gray)', completingCell: cellStr(r, bestCol),
        completingPly: ms.length, nWinningWindows: wins.length,
        winningWindows: wins.map(w => w.map(([rr, cc]) => cellStr(rr, cc))),
        winKeys,
      };
      break;
    }
    if (ms.length === 42) { terminal = { terminal: 'draw', completingPly: 42 }; break; }
  }
  console.log('=== optimal line trace (major threats; * = gravity-reachable now) ===');
  console.log(trace.join('\n'));
  console.log('\n=== terminal ===');
  console.log(JSON.stringify(terminal, null, 2));
  if (terminal && terminal.terminal === 'win') {
    console.log('\n=== earliest appearance of the terminal winning window(s) as a 3/1 major threat ===');
    for (const wk of terminal.winKeys) {
      const key = `${terminal.winner.startsWith('P1') ? 1 : 2}:${wk}`;
      const fs = firstSeen.get(key);
      console.log(`win window ${wk}: ${fs ? `first major-threat at ply ${fs.ply}, emptyCell ${fs.emptyCell}, reachableThen=${fs.reachable}` : 'NEVER appeared as 3/1 before completion (filled directly)'}`);
    }
  }
  console.log(`\nstartDiscs=${startDiscs}`);
} finally {
  solver.destroy();
}
