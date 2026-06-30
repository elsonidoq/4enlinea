#!/usr/bin/env node
// build_fixture.mjs — ONE stratified rejection-sampling fixture builder for the reason engine,
// replacing the five ad-hoc per-case selectors (select_win_to_draw / wtl_selector /
// select_draw_to_lose / select_ltfl / select_w2d_byregister).
//
// Streams playGame (gameSampling.js) with a FIXED seed (deterministic, committed) and keeps a
// position only when it lands in the INSTRUCTIVE regime: mid-game boards whose relevant score is
// LARGE-magnitude (short forced line -> immediate/forced_sequence register), stratified to hit each
// in-scope case, PLUS a few low-magnitude (parity-register) boards per case for coverage.
//
// Ground truth: expectedCase is derived purely from the SOLVER sign pair (not from the engine).
// For lose_to_faster_lose, expectedGate comes from swindleGate (sound for Blunder; exact NotABlunder
// only on <=10-empty boards, which is what we deliberately collect for the NotABlunder row).
//
// Usage (from connect-four/):
//   node server/scripts/reason_audit/build_fixture.mjs
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { playGame } from '../../gameSampling.js';
import { loadEnv, legalCols, emptyCellCount, INVALID_MOVE } from './lib/boardUtils.mjs';
import { swindleGate, REASON_CONFIG } from './reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../../.env'));
const OUT = join(__dirname, 'reason_fixture.jsonl');

// ── config knobs ──
const CFG = {
  seed: 0xC0FFEE,
  nGames: 1200,
  discMin: 12,            // skip opening theory
  discMax: 34,            // mid-game / early-closing band (target ~15–30)
  magFloor: 8,            // |score| floor for the "large-magnitude" (teachable) buckets
  lowMag: 3,              // |score| <= this => parity-register coverage bucket
  perCaseHigh: 5,         // target large-magnitude rows per case
  perCaseLow: 2,          // target parity-register rows per case
  ltflBlunder: 3,         // gate => Blunder rows
  ltflNotABlunder: 1,     // gate => NotABlunder rows (require <=10 empties for exact verdict)
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 7;
const rows = [];
const seen = new Set();
const counts = {
  win_to_draw: { high: 0, low: 0 }, win_to_lose: { high: 0, low: 0 },
  draw_to_lose: { high: 0, low: 0 },
  lose_to_faster_lose: { blunder: 0, notABlunder: 0, low: 0 },
};

function push(row) {
  if (seen.has(row.movestring + ':' + row.playedCol)) return false;
  seen.add(row.movestring + ':' + row.playedCol);
  rows.push(row);
  return true;
}

function need() {
  return counts.win_to_draw.high < CFG.perCaseHigh || counts.win_to_draw.low < CFG.perCaseLow
    || counts.win_to_lose.high < CFG.perCaseHigh || counts.win_to_lose.low < CFG.perCaseLow
    || counts.draw_to_lose.high < CFG.perCaseHigh || counts.draw_to_lose.low < CFG.perCaseLow
    || counts.lose_to_faster_lose.blunder < CFG.ltflBlunder
    || counts.lose_to_faster_lose.notABlunder < CFG.ltflNotABlunder
    || counts.lose_to_faster_lose.low < CFG.perCaseLow;
}

// Curated ANCHOR boards from the companion doc's validated set (blunder-reason-evidence.md §6).
// Pinned so the committed test deterministically covers every code path — notably the tactical
// defensive_hold draw_to_lose, which random sampling rarely lands on. expectedCase/gate are still
// derived from the live solver (ground truth), not hard-coded.
const ANCHORS = [
  { movestring: '3325', playedCol: 5 },                                         // win_to_draw
  { movestring: '463512252326', playedCol: 0 },                                 // win_to_lose
  { movestring: '3342652233354244431011', playedCol: 0 },                       // draw_to_lose (tactical defensive_hold)
  { movestring: '2444422235255630400333', playedCol: 0 },                       // draw_to_lose (zugzwang)
  { movestring: '3333325662555225', playedCol: 1 },                             // lose_to_faster_lose (Blunder)
  { movestring: '33343022442233255525004414106106605511', playedCol: 6 },       // lose_to_faster_lose (NotABlunder)
];

function classifyByScores(scores, playedCol) {
  const legal = legalCols(scores);
  let bestCol = legal[0], bestScore = scores[legal[0]];
  for (const c of legal) if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; }
  const playedScore = scores[playedCol];
  let expectedCase = null;
  if (bestScore > 0 && playedScore > 0) expectedCase = 'win_to_slower_win';
  else if (bestScore > 0 && playedScore === 0) expectedCase = 'win_to_draw';
  else if (bestScore > 0 && playedScore < 0) expectedCase = 'win_to_lose';
  else if (bestScore === 0 && playedScore < 0) expectedCase = 'draw_to_lose';
  else if (bestScore < 0 && playedScore < 0) expectedCase = 'lose_to_faster_lose';
  return { bestCol, bestScore, playedScore, expectedCase };
}

const solver = await createSolverProcess();
try {
  // ── anchors first (deterministic, ground-truth-labeled) ──
  for (const a of ANCHORS) {
    const scores = await solver.query(a.movestring);
    const { bestCol, expectedCase } = classifyByScores(scores, a.playedCol);
    const row = { movestring: a.movestring, playedCol: a.playedCol, bestCol, scores, discs: a.movestring.length, expectedCase, bucket: 'anchor' };
    if (expectedCase === 'lose_to_faster_lose') {
      const exhaustive = emptyCellCount(a.movestring) <= REASON_CONFIG.gateExhaustiveEmpties;
      const gate = await swindleGate(solver, a.movestring + String(bestCol), { exhaustive });
      row.expectedGate = gate.found ? 'Blunder' : 'NotABlunder';
      row.expectedExhaustive = exhaustive;
    }
    push(row);
  }

  const rng = mulberry32(CFG.seed);
  for (let g = 0; g < CFG.nGames && need(); g++) {
    for await (const pos of playGame(solver, rng)) {
      if (!need()) break;
      const { ms, scores } = pos;
      const discs = ms.length;
      if (discs < CFG.discMin || discs > CFG.discMax) continue;
      const legal = legalCols(scores);
      if (legal.length < 2) continue;
      let bestCol = legal[0], bestScore = scores[legal[0]];
      for (const c of legal) if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; }

      // ── win_to_draw: best>0, some legal col draws (=0) ──
      const drawCols = legal.filter((c) => scores[c] === 0);
      if (bestScore > 0 && drawCols.length) {
        const playedCol = drawCols[0];
        const big = bestScore >= CFG.magFloor;
        const bucket = big ? 'high' : (bestScore <= CFG.lowMag ? 'low' : null);
        if (bucket && counts.win_to_draw[bucket] < (bucket === 'high' ? CFG.perCaseHigh : CFG.perCaseLow)) {
          if (push({ movestring: ms, playedCol, bestCol, scores, discs, expectedCase: 'win_to_draw', bucket })) counts.win_to_draw[bucket]++;
        }
      }

      // ── win_to_lose: best>0 (=> max>0, not losing_either_way), some legal col loses (<0) ──
      const loseCols = legal.filter((c) => scores[c] < 0);
      if (bestScore > 0 && loseCols.length) {
        const playedCol = loseCols.reduce((a, b) => (scores[b] < scores[a] ? b : a)); // most negative
        const big = bestScore >= CFG.magFloor;
        const bucket = big ? 'high' : (bestScore <= CFG.lowMag ? 'low' : null);
        if (bucket && counts.win_to_lose[bucket] < (bucket === 'high' ? CFG.perCaseHigh : CFG.perCaseLow)) {
          if (push({ movestring: ms, playedCol, bestCol, scores, discs, expectedCase: 'win_to_lose', bucket })) counts.win_to_lose[bucket]++;
        }
      }

      // ── draw_to_lose: best==0, some legal col loses ──
      if (bestScore === 0 && loseCols.length) {
        const playedCol = loseCols.reduce((a, b) => (scores[b] < scores[a] ? b : a));
        const mag = Math.abs(scores[playedCol]);
        const big = mag >= CFG.magFloor;
        const bucket = big ? 'high' : (mag <= CFG.lowMag ? 'low' : null);
        if (bucket && counts.draw_to_lose[bucket] < (bucket === 'high' ? CFG.perCaseHigh : CFG.perCaseLow)) {
          if (push({ movestring: ms, playedCol, bestCol, scores, discs, expectedCase: 'draw_to_lose', bucket })) counts.draw_to_lose[bucket]++;
        }
      }

      // ── lose_to_faster_lose: max<0 (all lose), played strictly worse than best ──
      if (bestScore < 0) {
        const worse = legal.filter((c) => scores[c] < bestScore);
        if (worse.length) {
          const playedCol = worse.reduce((a, b) => (scores[b] < scores[a] ? b : a));
          const empties = emptyCellCount(ms);
          const exhaustive = empties <= REASON_CONFIG.gateExhaustiveEmpties;
          // need NotABlunder rows on small boards (exact); Blunder rows anywhere (sound).
          const wantNAB = counts.lose_to_faster_lose.notABlunder < CFG.ltflNotABlunder && exhaustive;
          const wantBlunder = counts.lose_to_faster_lose.blunder < CFG.ltflBlunder;
          const wantLow = counts.lose_to_faster_lose.low < CFG.perCaseLow && Math.abs(scores[playedCol]) <= CFG.lowMag;
          if (wantNAB || wantBlunder || wantLow) {
            const gate = await swindleGate(solver, ms + String(bestCol), { exhaustive });
            const verdict = gate.found ? 'Blunder' : 'NotABlunder';
            const row = {
              movestring: ms, playedCol, bestCol, scores, discs,
              expectedCase: 'lose_to_faster_lose', expectedGate: verdict, expectedExhaustive: exhaustive,
            };
            if (verdict === 'NotABlunder' && wantNAB) {
              if (push({ ...row, bucket: 'notABlunder' })) counts.lose_to_faster_lose.notABlunder++;
            } else if (verdict === 'Blunder' && (wantBlunder || wantLow)) {
              const bucket = wantLow ? 'low' : 'blunder';
              if (push({ ...row, bucket })) counts.lose_to_faster_lose[bucket]++;
            }
          }
        }
      }
    }
  }
} finally {
  solver.destroy();
}

// stable order: by case then discs (deterministic file)
const order = ['win_to_draw', 'win_to_lose', 'draw_to_lose', 'lose_to_faster_lose'];
rows.sort((a, b) => (order.indexOf(a.expectedCase) - order.indexOf(b.expectedCase)) || (a.discs - b.discs) || a.movestring.localeCompare(b.movestring));
writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`wrote ${rows.length} rows to ${OUT}`);
console.log('counts:', JSON.stringify(counts, null, 2));
void INVALID_MOVE; void COLS;
