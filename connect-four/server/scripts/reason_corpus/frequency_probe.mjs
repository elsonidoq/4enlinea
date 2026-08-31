#!/usr/bin/env node
// frequency_probe.mjs — Step 6 of the deep-reveal release assessment.
//
// The reason corpus (boards.jsonl) is built for CASE-TAXONOMY COVERAGE, with rare cases
// deliberately over-sampled, so a defect rate measured on it is per case type, NOT per player
// encounter. This probe answers the other question: harvest blunders from SIMULATED GAMES and run
// programmatic detectors over the production render path, so the counts are per real blunder.
//
// No LLM calls, no agents: every detector below is decidable from render_decision alone.
//
// Honest limit: this covers RENDER-LAYER defect classes only. A4 (fabrication) and A7 (usefulness)
// have no programmatic detector and are NOT represented here.
//
// Usage: node server/scripts/reason_corpus/frequency_probe.mjs [--games 40] [--seed 12345]

import { createSolverProcess } from '../../c4solver-wrapper.js';
import { harvestBlunders } from '../../gameSampling.js';
import { computeReason } from '../reason_engine/reasonEngine.mjs';
import { toNarratorVector } from '../reasonNarratorVector.mjs';
import { buildRenderDecision } from '../renderReasonModel.mjs';
import { Board } from '../../classifier.js';

const argVal = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const GAMES = parseInt(argVal('--games', '40'), 10);
const SEED = parseInt(argVal('--seed', '12345'), 10);

// deterministic rng so a re-run reproduces the same sample
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL = /^(?:future:)?c(\d+)r(\d+)$/;
const WINDOWS = /^(?:future:)?windows:(.+)$/;
const parseCell = (s) => { const m = CELL.exec(s ?? ''); return m ? { col: +m[1] - 1, row: +m[2] - 1 } : null; };
const parseWindow = (s) => {
  const m = WINDOWS.exec(s ?? ''); if (!m) return null;
  return m[1].split(',').map((c) => parseCell(c.trim())).filter(Boolean);
};

// Board movestring for each truthBoard id, from the vector itself.
export function boardMs(nv, id) {
  switch (id) {
    case 'decision': return nv.movestring;
    case 'afterBest': return nv.movestring + String(nv.bestCol);
    case 'afterPlayed': return nv.movestring + String(nv.playedCol);
    case 'projectedDeep': return nv.lostResource?.finalMovestring ?? null;
    case 'projectedDeepOpp': return nv.opponentPunishment?.finalMovestring ?? null;
    default: return null;
  }
}
function occupied(ms, cell) {
  if (!ms || !cell) return null;
  let b; try { b = new Board(ms); } catch { return null; }
  const g = b.board ?? b.grid;
  if (!Array.isArray(g)) return null;
  const v = g[cell.row]?.[cell.col];
  return v != null && v !== 0 && v !== '';
}

// ── Detectors ────────────────────────────────────────────────────────────────
// D1: a REQUIRED handle whose single-cell spec is already OCCUPIED on a NEAR board
//     (decision / afterBest / afterPlayed). No answer can satisfy it — the coach is obliged to
//     point at a square that is not there (verified on eval-47: c3r6 IS the played move).
//
//     The near-board restriction is load-bearing, not conservatism. On projectedDeep /
//     projectedDeepOpp the projection plays the line out, so a "future" cell being filled is the
//     NORMAL case: measured on the 63-board corpus, 60 of 62 occupied required cells sit on a
//     projected board and are correct. Without this restriction the detector fires on 37/63 boards
//     and means nothing; with it, it fires on exactly the one board the graders flagged.
const NEAR_BOARDS = new Set(['decision', 'afterBest', 'afterPlayed']);
function d1(rd, nv) {
  const hits = [];
  for (const q of rd.requiredSet ?? []) {
    if (!NEAR_BOARDS.has(q.truthBoard)) continue;
    const cell = parseCell(q.spec); if (!cell) continue;
    const occ = occupied(boardMs(nv, q.truthBoard), cell);
    if (occ === true) hits.push(`${q.handle}@${q.spec}/${q.truthBoard}`);
  }
  return hits;
}
// D2: a HORIZONTAL window (all cells same row) labelled "the one in column N" — a column locator
//     for a row-shaped object (verified on eval-34: "your line in column 4" is board-false).
function d2(rd) {
  const hits = [];
  for (const a of rd.zones?.aliases ?? []) {
    const w = parseWindow(a.spec); if (!w || w.length < 2) continue;
    if (new Set(w.map((c) => c.row)).size !== 1) continue;
    if (/^the one in column \d/.test(a.role ?? '')) hits.push(`${a.handle}@${a.spec}`);
  }
  return hits;
}
// D3: one role string covering two or more DIFFERENT specs — the model has no way to tell the
//     two objects apart (verified corpus-wide: you-key-square / opp-key-square share role text).
function d3(rd) {
  const byRole = new Map();
  for (const a of rd.zones?.aliases ?? []) {
    if (!a.role) continue;
    if (!byRole.has(a.role)) byRole.set(a.role, new Set());
    byRole.get(a.role).add(a.spec);
  }
  return [...byRole.entries()].filter(([, s]) => s.size > 1).map(([r, s]) => `${s.size}x "${r.slice(0, 44)}…"`);
}
// D4: an offered handle that the frame's own guardrail demands be named, but which requiredSet
//     omits — the prose is obliged to name a thing it was given no way to point at
//     (verified on eval-4: L6 demands both lines; opp-key-line offered, not required).
function d4(rd) {
  const req = new Set((rd.requiredSet ?? []).map((q) => q.handle));
  const g = rd.link?.guardrail ?? '';
  if (!/both lines|name both/i.test(g)) return [];
  return (rd.zones?.aliases ?? [])
    .filter((a) => /-line$/.test(a.handle) && !req.has(a.handle))
    .map((a) => a.handle);
}

export const DETECTORS = [
  ['D1 required handle on an occupied cell', d1],
  ['D2 horizontal line labelled by column', (rd) => d2(rd)],
  ['D3 one role string, two different squares', (rd) => d3(rd)],
  ['D4 guardrail demands a line the required set omits', (rd) => d4(rd)],
];

async function main() {
  const solver = createSolverProcess();
  const rng = mulberry32(SEED);
  const counts = Object.fromEntries(DETECTORS.map(([n]) => [n, 0]));
  const examples = Object.fromEntries(DETECTORS.map(([n]) => [n, null]));
  let blunders = 0, rendered = 0, engineErrors = 0, renderErrors = 0;
  const games = new Set();
  try {
    for await (const b of harvestBlunders(solver, { maxGames: GAMES, rng })) {
      blunders++; games.add(b.gameIndex);
      let nv, rd;
      try {
        const evidence = await computeReason(b.boardState, b.movePlayed, { solver });
        nv = toNarratorVector(evidence);
      } catch { engineErrors++; continue; }
      try { rd = buildRenderDecision(nv); } catch { renderErrors++; continue; }
      if (!rd) { renderErrors++; continue; }
      rendered++;
      for (const [name, fn] of DETECTORS) {
        const hits = fn(rd, nv);
        if (hits.length) {
          counts[name]++;
          if (!examples[name]) examples[name] = { ms: b.boardState, played: b.movePlayed, hits: hits.slice(0, 2) };
        }
      }
    }
  } finally { solver.destroy(); }

  console.log(`\nSAMPLE: ${games.size} simulated games -> ${blunders} blunders; ${rendered} produced a render decision`);
  console.log(`        (engine errors ${engineErrors}, render errors ${renderErrors}) seed=${SEED}\n`);
  console.table(DETECTORS.map(([n]) => ({
    detector: n,
    blunders_affected: counts[n],
    rate: rendered ? (100 * counts[n] / rendered).toFixed(1) + '%' : '-',
  })));
  for (const [n] of DETECTORS) if (examples[n]) console.log(`  ${n}\n    e.g. ms=${examples[n].ms} played=${examples[n].played} -> ${examples[n].hits.join(', ')}`);
  console.log('\nNOTE: render-layer classes only. A4 (fabrication) and A7 (usefulness) have no');
  console.log('      programmatic detector and are NOT covered by these numbers.');
}
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
