#!/usr/bin/env node
// gate_vs_router.mjs — PROBE: does the D20 realized/denied router claim a Blunder on a
// lose_to_faster_lose board that the D4/D19/D23 swindle gate would call NotABlunder?
//
// WHY THIS EXISTS:
//   Since D20/D23, `computeReason` consults tagBlunder BEFORE the sign taxonomy. On a
//   both-losing board with a routed tag (immediate_threat/forced_block/double_threat/figure_7),
//   the realized/denied route emits a full Blunder reason with `gate: null` — the D4
//   practical-chance gate is never run. No existing TOOL can surface this divergence:
//   opp_punish_probe forces the Case-3 punishment search, not the swindle gate, and the
//   engine CLI only shows the routed output. This tool runs BOTH — computeReason (production
//   path) and swindleGate on bestRoot (the verdict the sign engine would have used) — and
//   reports when they disagree (router says Blunder, gate says NotABlunder), i.e. when the
//   emitted reason contradicts INVARIANTS I4 / DECISIONS D4 as written.
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/TOOLS/gate_vs_router.mjs <movestring> <playedCol>
//
// Output: JSON { case, route, notABlunder, tag, direction, engineGate, independentGate,
//                d4Conflict }  — d4Conflict=true means the production reason declares Blunder
//                while the swindle gate on bestRoot finds no practical chance.
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import { loadEnv, legalCols, INVALID_MOVE } from '../lib/boardUtils.mjs';
import { computeReason, swindleGate } from '../reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../../../.env'));

const movestring = process.argv[2];
const playedCol = Number(process.argv[3]);
if (!movestring || Number.isNaN(playedCol)) {
  console.error('usage: gate_vs_router.mjs <movestring> <playedCol>');
  process.exit(1);
}

const solver = await createSolverProcess();
try {
  const scores = await solver.query(movestring);
  const legal = legalCols(scores);
  let bestCol = legal[0];
  for (const c of legal) if (scores[c] > scores[bestCol]) bestCol = c;
  const bothLosing = scores[bestCol] < 0 && scores[playedCol] < 0 && scores[playedCol] !== INVALID_MOVE;

  const r = await computeReason(movestring, playedCol, { solver });
  // The verdict the sign engine would have produced for this board (gate on bestRoot).
  const gate = bothLosing ? await swindleGate(solver, movestring + String(bestCol), {}) : null;

  const d4Conflict = bothLosing && gate && !gate.found
    && r.route === 'realized_denied' && !r.notABlunder;

  console.log(JSON.stringify({
    movestring, playedCol, bestCol,
    bestScore: scores[bestCol], playedScore: scores[playedCol], bothLosing,
    case: r.case, route: r.route ?? 'sign', notABlunder: r.notABlunder,
    tag: r.tag ?? null, direction: r.direction ?? null,
    engineGate: r.gate,
    independentGate: gate ? { found: gate.found, nodesVisited: gate.nodesVisited, budgetHit: gate.budgetHit ?? false } : null,
    d4Conflict,
  }, null, 2));
} finally {
  solver.destroy();
}
