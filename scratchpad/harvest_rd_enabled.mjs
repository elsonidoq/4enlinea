// scratchpad/harvest_rd_enabled.mjs — targeted search for the two unsourced rd/enabled_opponent forks.
// Sourced from gameSampling self-play; probes ALL suboptimal cols per position (not just the played
// move). NEVER hand-rolls boards. Scratch — not committed. Task 9 of the board-selection plan.
//   node scratchpad/harvest_rd_enabled.mjs [maxGames]
import { createSolverProcess } from '../connect-four/server/c4solver-wrapper.js';
import { playGame } from '../connect-four/server/gameSampling.js';
import { tagBlunder } from '../connect-four/server/classifier.js';
import { computeReason } from '../connect-four/server/scripts/reason_engine/reasonEngine.mjs';
import { legalCols } from '../connect-four/server/scripts/reason_engine/lib/boardUtils.mjs';

const MAX_GAMES = parseInt(process.argv[2] ?? '500', 10);
const WANT = new Set(['double_threat:enabled_opponent', 'figure_7:enabled_opponent']);
function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

const solver = await createSolverProcess();
const rng = mulberry32(0xBEEF);
const hits = [];
let games = 0, positions = 0, probes = 0, enabledSeen = 0;
const t0 = Date.now();
try {
  for (let g = 0; g < MAX_GAMES && hits.length < 4; g++) {
    games = g + 1;
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores } = pos;
      const legal = legalCols(scores);
      if (legal.length < 2) continue;
      positions++;
      let bestCol = legal[0]; for (const c of legal) if (scores[c] > scores[bestCol]) bestCol = c;
      for (const c of legal) {
        if (c === bestCol || scores[c] >= scores[bestCol]) continue; // suboptimal only
        probes++;
        let tagged; try { tagged = await tagBlunder(ms, c, bestCol, solver); } catch { continue; }
        if (tagged.direction !== 'enabled_opponent') continue;
        enabledSeen++;
        let r; try { r = await computeReason(ms, c, { solver }); } catch { continue; }
        const key = `${r.tag}:${r.direction}`;
        if (r.route === 'realized_denied' && WANT.has(key)) {
          hits.push({ movestring: ms, playedCol: c, bestCol, scores, discs: ms.length, expectedCase: r.case, route: 'realized_denied', expectedTag: r.tag, expectedDirection: r.direction, bucket: `rd-${r.tag}-${r.direction}` });
          process.stderr.write(`HIT ${key}: ${ms} played ${c}\n`);
        }
      }
    }
    if (g % 25 === 24) process.stderr.write(`[${((Date.now()-t0)/1000).toFixed(0)}s] games ${games} · positions ${positions} · suboptimal-probes ${probes} · enabled_opponent tags ${enabledSeen} · hits ${hits.length}\n`);
  }
} finally { solver.destroy(); }
process.stderr.write(`\nDONE: ${games} games, ${positions} positions, ${probes} suboptimal-col probes, ${enabledSeen} enabled_opponent tags, ${hits.length} rd-enabled fork hits\n`);
process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
