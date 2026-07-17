#!/usr/bin/env node
// Selector for draw_to_lose: positions where best legal column scores exactly 0
// and at least one legal column scores < 0 (the "played" blunder).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/c4solver-wrapper.js';
import { playGame } from '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/gameSampling.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server';
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

// simple seeded rng (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(process.argv[2] ?? 42);
const nGames = Number(process.argv[3] ?? 200);
const minDiscs = Number(process.argv[4] ?? 16);
const seen = new Set();
const rng = mulberry32(seed);
const solver = createSolverProcess();
const found = [];
try {
  for (let g = 0; g < nGames; g++) {
    for await (const { ms, scores } of playGame(solver, rng)) {
      const legal = scores.map((s, c) => ({ s, c })).filter(x => x.s !== -1000);
      if (!legal.length) continue;
      const best = Math.max(...legal.map(x => x.s));
      if (best !== 0) continue;                 // best must be a draw
      const losing = legal.filter(x => x.s < 0); // at least one losing played col
      if (!losing.length) continue;
      if (ms.length < minDiscs) continue;        // require midgame/closing depth
      if (seen.has(ms)) continue;
      seen.add(ms);
      // prefer positions with some "depth" (not too early), and record
      found.push({
        ms, discs: ms.length, scores,
        drawCols: legal.filter(x => x.s === 0).map(x => x.c),
        loseCols: losing.map(x => ({ col: x.c, score: x.s })),
      });
    }
    if (found.length >= 40) break;
  }
} finally {
  solver.destroy();
}
// sort by midgame-ish depth for instructive boards
found.sort((a, b) => a.discs - b.discs);
console.log(JSON.stringify(found, null, 2));
console.error(`found ${found.length} draw_to_lose positions`);
