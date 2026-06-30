#!/usr/bin/env node
// Selector + GATE prototype for lose_to_faster_lose.
// Finds positions where bestScore<0 AND playedScore<0 AND playedScore<bestScore,
// then runs the swindle GATE on the BEST move and reports.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/c4solver-wrapper.js';
import { playGame } from '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/gameSampling.js';

const root = '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server';
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const INVALID = -1000;
const COLS = 7;

// Mulberry32 deterministic rng
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// GATE: from opponent-to-move position `node`, search (player-optimal, opponent-winning)
// for an opponent node where the opponent has a non-winning legal reply (min oppScore <= 0).
// Returns { found, prefix, devCol, devVal, depthReached } or { found:false }.
async function swindleGate(solver, node, maxOppPlies = 6, branchCap = 3) {
  // stack of { ms, oppPlies }
  const stack = [{ ms: node, oppPlies: 0 }];
  const seen = new Set();
  let nodesVisited = 0;
  while (stack.length) {
    const { ms, oppPlies } = stack.pop();
    if (oppPlies > maxOppPlies) continue;
    if (seen.has(ms)) continue;
    seen.add(ms);
    nodesVisited++;
    // opponent to move at ms
    let oppScores;
    try { oppScores = await solver.query(ms); } catch { continue; }
    const legal = [];
    for (let c = 0; c < COLS; c++) if (oppScores[c] !== INVALID) legal.push(c);
    if (!legal.length) continue;
    const maxOpp = Math.max(...legal.map(c => oppScores[c]));
    // non-winning legal replies for opponent (value <= 0 to opponent => >=0 to player)
    const nonWin = legal.filter(c => oppScores[c] <= 0);
    if (maxOpp > 0 && nonWin.length) {
      // SWINDLE: opponent has a winning move but also a non-winning option -> mistake possible
      // pick the deviation that is best for the player (lowest oppScore)
      let dev = nonWin[0];
      for (const c of nonWin) if (oppScores[c] < oppScores[dev]) dev = c;
      return { found: true, prefix: ms, devCol: dev, devVal: oppScores[dev], oppPlies, nodesVisited, oppScoresAtNode: oppScores };
    }
    if (maxOpp <= 0) {
      // opponent itself is not winning here (player already >=0) — that means earlier
      // play reached a player-good node; this counts as a swindle too (shouldn't normally
      // happen on first node since player is lost, but possible deeper). Treat as found.
      return { found: true, prefix: ms, devCol: null, devVal: maxOpp, oppPlies, nodesVisited, oppScoresAtNode: oppScores, note: 'node already >=0 for player' };
    }
    // all opponent moves win: opponent on-rails. Branch over winning moves (cap), then player optimal.
    const winning = legal.filter(c => oppScores[c] > 0).sort((a, b) => oppScores[a] - oppScores[b]); // least-winning first (most fragile)
    let branches = 0;
    for (const oc of winning) {
      if (branches >= branchCap) break;
      branches++;
      const afterOpp = ms + String(oc);
      // player to move; pick optimal (max), allow tied-best up to small cap
      let pScores;
      try { pScores = await solver.query(afterOpp); } catch { continue; }
      const pLegal = [];
      for (let c = 0; c < COLS; c++) if (pScores[c] !== INVALID) pLegal.push(c);
      if (!pLegal.length) continue;
      const maxP = Math.max(...pLegal.map(c => pScores[c]));
      const best = pLegal.filter(c => pScores[c] === maxP).slice(0, 2);
      for (const pc of best) {
        stack.push({ ms: afterOpp + String(pc), oppPlies: oppPlies + 1 });
      }
    }
  }
  return { found: false, nodesVisited };
}

const solver = createSolverProcess();
const found = [];
try {
  const nGames = Number(process.argv[2] ?? 40);
  let seed = Number(process.argv[3] ?? 12345);
  for (let g = 0; g < nGames; g++) {
    const rng = mulberry32(seed + g * 7919);
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores, movePlayed } = pos;
      const legal = [];
      for (let c = 0; c < COLS; c++) if (scores[c] !== INVALID) legal.push(c);
      if (legal.length < 2) continue;
      const bestScore = Math.max(...legal.map(c => scores[c]));
      const bestCol = legal.find(c => scores[c] === bestScore);
      const playedScore = scores[movePlayed];
      // lose_to_faster_lose blunder: both <0 and played strictly worse (faster loss)
      if (bestScore < 0 && playedScore < 0 && playedScore < bestScore) {
        const node = ms + String(bestCol); // opponent to move after best
        const gate = await swindleGate(solver, node);
        const rec = {
          ms, bestCol, bestScore, movePlayed, playedScore,
          gate: gate.found, devCol: gate.devCol, devVal: gate.devVal,
          oppPlies: gate.oppPlies, prefix: gate.prefix, nodesVisited: gate.nodesVisited,
          len: ms.length, game: g,
        };
        if (process.argv[4] === 'falseonly') { if (!gate.found) found.push(rec); }
        else found.push(rec);
      }
    }
    if (found.length >= 12) break;
  }
  console.log(JSON.stringify(found, null, 2));
} finally {
  solver.destroy();
}
