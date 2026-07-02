// harvest_realized_denied.mjs — harvest one sourced board each for the MISSING (tag,direction)
// realized/denied pairs: double_threat/enabled_opponent, figure_7/missed_own, figure_7/enabled_opponent.
// Streams playGame self-play, calls tagBlunder on every blunder, and for matches confirms the FULL
// round trip through computeReason (route === 'realized_denied', tag, direction match).
// Run from connect-four/:
//   node ../scratchpad/harvest_realized_denied.mjs [nGames] [seed]
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../connect-four/server/c4solver-wrapper.js';
import { playGame } from '../connect-four/server/gameSampling.js';
import { computeReason } from '../connect-four/server/scripts/reason_engine/reasonEngine.mjs';
import { tagBlunder, NotABlunderError } from '../connect-four/server/classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
readFileSync(join(__dirname, '../connect-four/server/.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nGames = Number(process.argv[2] ?? 3000);
const seed = Number(process.argv[3] ?? 42);
const rng = mulberry32(seed);

const NEEDED = new Set(['double_threat:enabled_opponent', 'figure_7:missed_own', 'figure_7:enabled_opponent']);
const found = {};

const solver = createSolverProcess();
let checked = 0;
try {
  outer:
  for (let g = 0; g < nGames; g++) {
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores } = pos;
      let best = -Infinity, bestCol = -1;
      for (let c = 0; c < 7; c++) { if (scores[c] === -1000) continue; if (scores[c] > best) { best = scores[c]; bestCol = c; } }
      for (let playedCol = 0; playedCol < 7; playedCol++) {
        if (playedCol === bestCol) continue;
        if (scores[playedCol] === -1000) continue;
        if (scores[playedCol] >= best) continue; // not a blunder (or ties don't count)
        checked++;
        let tagged;
        try {
          tagged = await tagBlunder(ms, playedCol, bestCol, solver);
        } catch (err) {
          if (err instanceof NotABlunderError) continue;
          throw err;
        }
        const key = `${tagged.tag}:${tagged.direction}`;
        if (!NEEDED.has(key) || found[key]) continue;
        const r = await computeReason(ms, playedCol, { solver });
        if (r.route !== 'realized_denied' || r.tag !== tagged.tag || r.direction !== tagged.direction) continue;
        found[key] = { ms, playedCol, bestCol, scores, tag: tagged.tag, direction: tagged.direction, case: r.case };
        console.log('FOUND', JSON.stringify(found[key]));
        if (Object.keys(found).length === NEEDED.size) break outer;
      }
      if (checked % 500 === 0) console.error(`checked ${checked} candidates, games ${g}, found so far: ${Object.keys(found)}`);
    }
  }
} finally {
  solver.destroy();
}
console.error(`DONE. checked ${checked} candidates.`);
for (const key of NEEDED) {
  console.log(key, found[key] ? 'FOUND' : 'NOT FOUND');
}
