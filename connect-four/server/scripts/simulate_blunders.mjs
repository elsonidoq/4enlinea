// Simulate games across a temperature grid and collect blunder records.
// Run from project root:
//   node connect-four/server/scripts/simulate_blunders.mjs [output.jsonl]
//
// Output: one JSON object per line with {move, ms, severity, best_score, score, t1, t2}

import { createWriteStream } from 'fs';
import { parseBoardState, checkWin } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove } from '../moveQualityScorer.js';

const INVALID_MOVE = -1000;
const COLS = 7;
const ROWS = 6;

const outPath = process.argv[2] || 'blunders_sim.jsonl';

function linspace(start, end, steps) {
  if (steps === 1) return [start];
  return Array.from({ length: steps }, (_, i) => start + (end - start) * i / (steps - 1));
}

function sampleCol(scores, temperature) {
  const valid = scores.map((s, i) => ({ s, i })).filter(e => e.s > INVALID_MOVE);
  if (!valid.length) return 0;
  if (temperature === 0) {
    const best = valid.reduce((a, b) => b.s > a.s ? b : a);
    const tied = valid.filter(e => e.s === best.s);
    return tied[Math.floor(Math.random() * tied.length)].i;
  }
  const max = Math.max(...valid.map(e => e.s));
  const exps = valid.map(e => ({ i: e.i, w: Math.exp((e.s - max) / temperature) }));
  const total = exps.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of exps) { r -= e.w; if (r <= 0) return e.i; }
  return exps[exps.length - 1].i;
}

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

async function simulate(solver, t1, t2) {
  // Returns { movestring, scoresCache }
  // scoresCache[i] = solver scores before move i was played
  let ms = '';
  const scoresCache = [];
  const temperatures = [t1, t2]; // player 0 = t1, player 1 = t2

  while (ms.length < COLS * ROWS) {
    const scores = await solver.query(ms);
    const legal = scores.filter(s => s > INVALID_MOVE);
    if (!legal.length) break; // board full

    scoresCache.push(scores);
    const playerIdx = ms.length % 2;
    const col = sampleCol(scores, temperatures[playerIdx]);
    ms += String(col);

    // Check for win after the move
    const { board, colHeights } = parseBoardState(ms);
    const lastRow = colHeights[col] - 1;
    const lastPlayer = ms.length % 2 === 0 ? 2 : 1; // ms.length already incremented
    if (checkWin(board, lastRow, col, lastPlayer)) break;
  }

  return { ms, scoresCache };
}

async function main() {
  const STEPS = 10;
  const ROUNDS = 50;
  const temps = linspace(0, 20, STEPS);

  const solver = createSolverProcess();
  const out = createWriteStream(outPath, { flags: 'w' });

  let totalGames = 0;
  let totalBlunders = 0;
  const total = STEPS * STEPS * ROUNDS;

  for (const t1 of temps) {
    for (const t2 of temps) {
      for (let round = 0; round < ROUNDS; round++) {
        const { ms, scoresCache } = await simulate(solver, t1, t2);
        totalGames++;

        if (totalGames % 100 === 0) {
          process.stderr.write(`\r${totalGames}/${total} games  ${totalBlunders} blunders`);
        }

        for (let i = 0; i < ms.length; i++) {
          const scores = scoresCache[i];
          if (!scores) continue;
          const move = parseInt(ms[i], 10);
          const { quality, bestCol } = scoreMove(scores, move);
          if (quality !== 'blunder') continue;

          const score = scores[move];
          const bestScore = scores[bestCol];
          const severity = computeSeverity(bestScore, score);

          const record = {
            move,
            ms: ms.slice(0, i),
            severity,
            best_score: bestScore,
            score,
            t1: Math.round(t1 * 1000) / 1000,
            t2: Math.round(t2 * 1000) / 1000,
          };
          out.write(JSON.stringify(record) + '\n');
          totalBlunders++;
        }
      }
    }
  }

  solver.destroy();
  out.end();
  process.stderr.write(`\nDone: ${totalGames} games, ${totalBlunders} blunders → ${outPath}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
