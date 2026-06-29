#!/usr/bin/env node
// wtl_selector.mjs — harvest fresh win_to_lose plies and characterize the forward-distance
// of BOTH halves: (a) the player's missed win (bestCol), (b) the opponent's refutation
// (play the losing playedCol, then opponent-optimal vs best defense to terminal).
//
// Usage: node wtl_selector.mjs [maxGames] [seed]
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import { playGame } from '../../../gameSampling.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const ROWS = 6, COLS = 7;
function buildBoard(ms) {
  const heights = Array(COLS).fill(0);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [...ms].forEach((ch, i) => { const c = Number(ch); const r = heights[c]++; grid[r][c] = (i % 2 === 0) ? 1 : 2; });
  return { grid, heights };
}
const dirs = [[0,1],[1,0],[1,1],[1,-1]];
function winsFor(grid, p) {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) for (const [dr,dc] of dirs) {
    const cells=[]; let ok=true;
    for (let k=0;k<4;k++){const rr=r+dr*k,cc=c+dc*k; if(rr<0||rr>=ROWS||cc<0||cc>=COLS){ok=false;break;} cells.push([rr,cc]);}
    if (ok && cells.every(([rr,cc])=>grid[rr][cc]===p)) return cells;
  }
  return null;
}
const cellStr = (r,c)=>`c${c+1}r${r+1}`;

// play optimal both sides from ms to terminal; return {plies, winner, completing, nWindows}
function lastMoveWon(ms) {
  if (!ms.length) return null;
  const { grid } = buildBoard(ms);
  const mover = (ms.length % 2 === 1) ? 1 : 2; // who placed the last disc
  const w = winsFor(grid, mover);
  return w ? { mover, completing: null } : null;
}
async function optimalToTerminal(solver, ms) {
  const start = ms.length;
  // guard: passed position may already be won by the last mover
  const pre = lastMoveWon(ms);
  if (pre) {
    const { grid, heights } = buildBoard(ms);
    const lastCol = Number(ms[ms.length-1]);
    const r = heights[lastCol]-1;
    return { terminal:'win', winner: pre.mover, plies: 0, completing: cellStr(r,lastCol), nWindows: 1 };
  }
  for (let step=0; step<60; step++) {
    const scores = await solver.query(ms);
    const mover = (ms.length%2===0)?1:2;
    let bestCol=-1,best=-Infinity;
    for (let c=0;c<COLS;c++){ if(scores[c]===-1000) continue; if(scores[c]>best){best=scores[c];bestCol=c;} }
    if (bestCol===-1) return {terminal:'draw', plies: ms.length-start};
    ms += String(bestCol);
    const {grid,heights}=buildBoard(ms);
    const w = winsFor(grid, mover);
    if (w) {
      const prev = buildBoard(ms.slice(0,-1));
      // count winning windows through the completing move
      let n=0; const r=prev.heights[bestCol];
      for (let rr=0;rr<ROWS;rr++) for (let cc=0;cc<COLS;cc++) for (const [dr,dc] of dirs){
        const cells=[];let ok=true;
        for(let k=0;k<4;k++){const a=rr+dr*k,b=cc+dc*k;if(a<0||a>=ROWS||b<0||b>=COLS){ok=false;break;}cells.push([a,b]);}
        if(ok&&cells.every(([a,b])=>grid[a][b]===mover)&&cells.some(([a,b])=>a===r&&b===bestCol)) n++;
      }
      return {terminal:'win', winner:mover, plies: ms.length-start, completing: cellStr(r,bestCol), nWindows:n};
    }
    if (ms.length===42) return {terminal:'draw', plies: ms.length-start};
  }
  return {terminal:'unknown'};
}

const maxGames = Number(process.argv[2] ?? 40);
let seed = Number(process.argv[3] ?? 12345);
function rng(){ seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }

const solver = createSolverProcess();
const found = [];
try {
  let games=0;
  while (games < maxGames) {
    games++;
    let perGame = 0;
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores, player } = pos;
      if (ms.length < 10) continue;            // skip opening (trivial wtl)
      if (perGame >= 2) break;                 // diversify across games
      // best
      let bestCol=-1,best=-Infinity;
      for (let c=0;c<COLS;c++){ if(scores[c]===-1000) continue; if(scores[c]>best){best=scores[c];bestCol=c;} }
      if (best<=0) continue; // need a win available
      // is there a losing legal column?
      const losing = [];
      for (let c=0;c<COLS;c++){ if(scores[c]!==-1000 && scores[c]<0) losing.push(c); }
      if (!losing.length) continue;
      // pick the MOST punishing played col among losers? use the one with largest |score| (fastest loss) and also a slow one
      const playedCol = losing.reduce((a,b)=> scores[b] < scores[a] ? b : a); // most negative
      const discs = ms.length;
      const winFwd = 43 - 2*Math.abs(best) - (discs+1);
      const loseFwd = 43 - 2*Math.abs(scores[playedCol]) - (discs+1);
      // resolve actual terminal plies for both halves
      const winLine = await optimalToTerminal(solver, ms+String(bestCol));
      const loseLine = await optimalToTerminal(solver, ms+String(playedCol));
      found.push({ ms, discs, player, bestCol, bestScore:best, playedCol, playedScore:scores[playedCol],
        winFwd, loseFwd, winPlies: winLine.plies, winCell: winLine.completing, winNW: winLine.nWindows,
        losePlies: loseLine.plies, loseCell: loseLine.completing, loseNW: loseLine.nWindows });
      perGame++;
    }
    if (found.length >= 30) break;
  }
  // characterize
  console.log(JSON.stringify(found, null, 1));
  const wp = found.map(f=>f.winPlies).sort((a,b)=>a-b);
  const lp = found.map(f=>f.losePlies).sort((a,b)=>a-b);
  console.log('\n=== SUMMARY n=', found.length, '===');
  console.log('missed-win plies-to-complete: min',wp[0],'median',wp[Math.floor(wp.length/2)],'max',wp[wp.length-1]);
  console.log('opp-refutation plies-to-complete: min',lp[0],'median',lp[Math.floor(lp.length/2)],'max',lp[lp.length-1]);
  console.log('missed-win <=4 plies:', found.filter(f=>f.winPlies<=4).length, '/', found.length);
  console.log('opp-refutation <=4 plies:', found.filter(f=>f.losePlies<=4).length, '/', found.length);
  console.log('BOTH halves <=6 plies (ideal showable):', found.filter(f=>f.winPlies<=6&&f.losePlies<=6).length);
} finally {
  solver.destroy();
}
