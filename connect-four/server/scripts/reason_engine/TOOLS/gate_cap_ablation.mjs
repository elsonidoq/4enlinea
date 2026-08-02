#!/usr/bin/env node
// gate_cap_ablation.mjs — SELECTOR/ABLATION: does the lose_to_faster_lose swindle gate's WIDTH
// pruning (gateBranch, gatePlayerTiedCap, dedup-by-score) ever change its BLUNDER/NotABlunder
// verdict versus an uncapped, dedup-free reference search?
//
// WHY THIS EXISTS (review F4 — challenges D23):
//   INVARIANT I6 says DEPTH is the only admissible bound; I0 says never weaken the search to save
//   calls. The production swindleGate (reasonEngine.mjs) nonetheless prunes on solver SCORE: it
//   branches only REASON_CONFIG.gateBranch distinct-score opponent winning replies, follows only
//   gatePlayerTiedCap tied-best player replies, and DEDUPS opponent replies by score. D23's own
//   rationale says "worst-by-eventual-outcome != worst-by-solver-score" — which is exactly the
//   assumption those width caps rely on. No existing TOOL can tell whether the caps ever hide a
//   real swindle. This one harvests ltfl boards from seeded self-play (deterministic) and, on each,
//   runs BOTH:
//     - the production swindleGate (import), and
//     - a REFERENCE gate identical in admissibility (D19, via the production detectImmediateThreat)
//       but with NO score-dedup, a very wide branch factor, and all tied-best player replies,
//   then reports every board where the two verdicts DIFFER. A `found:true` reference with a
//   `found:false` production result is a width-cap-hidden swindle: an I12 counterexample that
//   would demote the caps from "sound bound" to "unprincipled prune." Zero diffs over a large,
//   deterministic harvest is the empirical evidence D23's caps need (they were never validated).
//
//   The reference gate shares the production DEPTH cap (gateMaxPlies) so DEPTH is held fixed and
//   WIDTH is the only variable — this isolates the caps under scrutiny, nothing else.
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/TOOLS/gate_cap_ablation.mjs [nGames=60] [seed=12345]
//
// Output: JSON { nGames, seed, ltflBoards, verdictDiffs: [ {ms,bestCol,prodFound,refFound,...} ],
//                summary }.  verdictDiffs === [] => the width caps changed no verdict in this harvest.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import { playGame } from '../../../gameSampling.js';
import { Board } from '../../../classifier.js';
import { swindleGate, REASON_CONFIG, computeReason } from '../reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
readFileSync(join(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const COLS = 7, ROWS = 6, INVALID = -1000;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// D19 admissibility via the PRODUCTION detector (not a proxy — I12): a reply is admissible iff after
// it the player has no immediate win-in-1. Identical criterion to reasonEngine.admissibleOpponentCols.
function admissibleOpponentCols(ms, legal, player) {
  const board = new Board(ms);
  const threatened = board.immediateThreats(player).length > 0;
  const adm = legal.filter((c) => board.withMove(c).immediateThreats(player).length === 0);
  return { adm, unblockable: threatened && adm.length === 0 };
}

// REFERENCE gate: same admissibility + same DEPTH cap as production, but NO width pruning —
// every admissible winning reply is branched, no score-dedup, and ALL tied-best player replies are
// followed. This is the "uncapped" search the width caps approximate.
async function referenceGate(solver, node, depthCap) {
  const player = ((node.length - 1) % 2 === 0) ? 1 : 2;
  const stack = [{ ms: node }];
  const seen = new Set();
  let nodesVisited = 0;
  const NODE_BUDGET = 500000; // generous — this is an offline audit, not the harvest hot path
  while (stack.length) {
    const { ms } = stack.pop();
    if ((ms.length - node.length) > depthCap) continue;
    if (seen.has(ms)) continue;
    seen.add(ms);
    if (++nodesVisited > NODE_BUDGET) return { found: false, nodesVisited, budgetHit: true };
    let oppScores;
    try { oppScores = await solver.query(ms); } catch { continue; }
    const legal = [];
    for (let c = 0; c < COLS; c++) if (oppScores[c] !== INVALID) legal.push(c);
    if (!legal.length) continue;
    const { adm, unblockable } = admissibleOpponentCols(ms, legal, player);
    if (unblockable) return { found: true, node: ms, unblockable: true, nodesVisited };
    const nonWin = adm.filter((c) => oppScores[c] <= 0);
    if (nonWin.length) return { found: true, node: ms, nonWin, nodesVisited };
    // NO dedup, NO branch cap: descend through every admissible winning reply and every tied-best player reply.
    const winning = adm.filter((c) => oppScores[c] > 0);
    for (const oc of winning) {
      const afterOpp = ms + String(oc);
      let pScores;
      try { pScores = await solver.query(afterOpp); } catch { continue; }
      const pLegal = [];
      for (let c = 0; c < COLS; c++) if (pScores[c] !== INVALID) pLegal.push(c);
      if (!pLegal.length) continue;
      const maxP = Math.max(...pLegal.map((c) => pScores[c]));
      for (const pc of pLegal) if (pScores[pc] === maxP) stack.push({ ms: afterOpp + String(pc) });
    }
  }
  return { found: false, nodesVisited };
}

const solver = createSolverProcess();
const nGames = Number(process.argv[2] ?? 60);
const seed = Number(process.argv[3] ?? 12345);
const verdictDiffs = [];
let ltflBoards = 0, prodBlunder = 0, refBlunder = 0;
try {
  for (let g = 0; g < nGames; g++) {
    const rng = mulberry32(seed + g * 7919);
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores, movePlayed } = pos;
      const legal = [];
      for (let c = 0; c < COLS; c++) if (scores[c] !== INVALID) legal.push(c);
      if (legal.length < 2) continue;
      const bestScore = Math.max(...legal.map((c) => scores[c]));
      const bestCol = legal.find((c) => scores[c] === bestScore);
      const playedScore = scores[movePlayed];
      if (!(bestScore < 0 && playedScore < 0 && playedScore < bestScore)) continue;
      ltflBoards++;
      const node = ms + String(bestCol);
      const depthCap = REASON_CONFIG.gateMaxPlies;
      const prod = await swindleGate(solver, node, { depthCap });
      const ref = await referenceGate(solver, node, depthCap);
      if (prod.found) prodBlunder++;
      if (ref.found) refBlunder++;
      if (prod.found !== ref.found) {
        // Enrich with the ACTUAL user-facing verdict: if computeReason routes this board (a routed
        // tactic present), the reason is still emitted and the gate diff is only diagnostic (D24). The
        // USER-VISIBLE harm is a diff where the board stays on the SIGN route AND notABlunder===true —
        // there the false gate NotABlunder OMITS the reason entirely.
        let route = 'sign', notABlunder = null;
        try { const cr = await computeReason(ms, movePlayed, { solver }); route = cr.route ?? 'sign'; notABlunder = cr.notABlunder; } catch { /* terminal */ }
        verdictDiffs.push({
          ms, bestCol, bestScore, movePlayed, playedScore,
          prodFound: prod.found, refFound: ref.found,
          prodNodes: prod.nodesVisited, refNodes: ref.nodesVisited,
          refBudgetHit: ref.budgetHit ?? false, game: g,
          computeRoute: route, computeNotABlunder: notABlunder,
          userVisibleOmit: route === 'sign' && notABlunder === true,
        });
      }
    }
  }
  console.log(JSON.stringify({
    nGames, seed, ltflBoards, prodBlunder, refBlunder,
    verdictDiffs,
    summary: verdictDiffs.length === 0
      ? `No verdict diff over ${ltflBoards} ltfl boards: the width caps (gateBranch=${REASON_CONFIG.gateBranch}, gatePlayerTiedCap=${REASON_CONFIG.gatePlayerTiedCap}, score-dedup) changed no Blunder/NotABlunder verdict vs the uncapped reference at depth ${REASON_CONFIG.gateMaxPlies}.`
      : `${verdictDiffs.length} verdict diff(s): a width cap hid a swindle the uncapped search found — I12 counterexample(s) to D23's caps.`,
  }, null, 2));
} finally {
  solver.destroy();
}
