#!/usr/bin/env node
// select_win_to_draw.mjs — stream self-play games and emit positions where the
// side-to-move has a WIN (best score > 0) but at least one legal column DRAWS
// (score == 0). That legal draw column is a valid "played" win_to_draw blunder.
//
// Usage (from connect-four/):
//   node server/scripts/reason_audit/TOOLS/select_win_to_draw.mjs [nGames] [seed]
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

// deterministic RNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nGames = Number(process.argv[2] ?? 60);
const seed = Number(process.argv[3] ?? 12345);
const rng = mulberry32(seed);

const solver = createSolverProcess();
const found = [];
try {
  for (let g = 0; g < nGames; g++) {
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores, player } = pos;
      let best = -Infinity, bestCol = -1;
      const drawCols = [];
      for (let c = 0; c < 7; c++) {
        const s = scores[c];
        if (s === -1000) continue;
        if (s > best) { best = s; bestCol = c; }
        if (s === 0) drawCols.push(c);
      }
      if (best > 0 && drawCols.length > 0) {
        found.push({
          ms, len: ms.length, player, bestCol, bestScore: best,
          drawCols, scores: scores.map(s => s === -1000 ? null : s),
        });
      }
    }
  }
  // sort by board length (variety: opening->closing) and dedup by ms
  const seen = new Set();
  const uniq = found.filter(f => { if (seen.has(f.ms)) return false; seen.add(f.ms); return true; });
  uniq.sort((a, b) => a.len - b.len);
  console.log(`found ${uniq.length} unique win_to_draw positions (from ${nGames} games, seed ${seed})`);
  for (const f of uniq) {
    console.log(JSON.stringify(f));
  }
} finally {
  solver.destroy();
}
