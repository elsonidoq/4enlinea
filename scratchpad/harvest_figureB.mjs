// scratchpad_harvest_figureB.mjs — harvest a DEEP win_to_draw board whose lost-resource walk stops
// at a Case-B (stacked) fork named figure_7, while STAYING on the sign engine (tagBlunder does NOT
// tag it into REALIZED_DENIED_TAGS, i.e. the fork isn't a one-move pattern at the decision node).
// Sub-goal A of Task 5. Run from connect-four/:
//   node server/scripts/reason_engine/scratchpad_harvest_figureB.mjs [nGames] [seed]
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { playGame } from '../../gameSampling.js';
import { computeReason, REALIZED_DENIED_TAGS } from './reasonEngine.mjs';
import { tagBlunder, NotABlunderError } from '../../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
readFileSync(join(root, 'server/.env'), 'utf8').split('\n').forEach((line) => {
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

const nGames = Number(process.argv[2] ?? 400);
const seed = Number(process.argv[3] ?? 777);
const rng = mulberry32(seed);

const solver = createSolverProcess();
let checked = 0;
let found = null;
try {
  outer:
  for (let g = 0; g < nGames; g++) {
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores } = pos;
      let best = -Infinity, bestCol = -1;
      const drawCols = [];
      for (let c = 0; c < 7; c++) {
        const s = scores[c];
        if (s === -1000) continue;
        if (s > best) { best = s; bestCol = c; }
        if (s === 0) drawCols.push(c);
      }
      if (!(best > 0 && drawCols.length > 0)) continue;
      for (const playedCol of drawCols) {
        checked++;
        let tagged;
        try {
          tagged = await tagBlunder(ms, playedCol, bestCol, solver);
        } catch (err) {
          if (err instanceof NotABlunderError) continue;
          throw err;
        }
        if (REALIZED_DENIED_TAGS.has(tagged.tag)) continue; // would divert; we want sign-engine
        const r = await computeReason(ms, playedCol, { solver });
        if (r.route === 'realized_denied') continue;
        if (r.case !== 'win_to_draw') continue;
        if (r.lostResource?.terminal === 'fork' && r.lostResource?.tacticTag === 'figure_7' && r.lostResource?.forkCase === 'B') {
          found = { ms, playedCol, bestCol, best, tagged, r };
          console.log('FOUND', JSON.stringify({ ms, playedCol, bestCol, best, tagged, forkCells: r.lostResource.forkCells, register: r.lostResource.register }));
          break outer;
        }
      }
      if (checked % 200 === 0) console.error(`checked ${checked} candidates...`);
    }
  }
} finally {
  solver.destroy();
}
if (!found) console.log(`NOT FOUND after checking ${checked} candidates across ${nGames} games`);
