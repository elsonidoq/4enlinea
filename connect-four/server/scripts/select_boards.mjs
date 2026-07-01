#!/usr/bin/env node
// select_boards.mjs — unified board-selector for the reason-eval pipeline.
//
// Strategies:
//   --strategy fixture   Regenerates reason_engine/reason_fixture.jsonl (byte-identical to committed).
//                        Ports build_fixture.mjs verbatim; changes only import paths.
//   --strategy coverage  Harvests a diverse coverage set for the from-vector eval.
//                        Ports the harvest loop from build_reason_eval_set.mjs; emits board-list
//                        rows (no toNarratorVector call).
//
// Usage (from connect-four/):
//   node server/scripts/select_boards.mjs --strategy {fixture|coverage} [--out <path>]
//        [--target N] [--max-games N]

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame, harvestBlunders } from '../gameSampling.js';
import { loadEnv, legalCols, emptyCellCount, INVALID_MOVE } from './reason_engine/lib/boardUtils.mjs';
import { swindleGate, REASON_CONFIG } from './reason_engine/reasonEngine.mjs';
import { computeReason } from './reason_engine/reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../.env'));

// ── arg parser ──
function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const strategy = argVal('--strategy', null);
if (!strategy || !['fixture', 'coverage'].includes(strategy)) {
  process.stderr.write('Error: --strategy {fixture|coverage} is required\n');
  process.exit(1);
}

const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
const defaultOut = strategy === 'fixture'
  ? join(__dirname, 'reason_engine/reason_fixture.jsonl')
  : join(__dirname, `boards_coverage_${ts}.jsonl`);

const outPath = argVal('--out', defaultOut);
const TARGET_PER_PREDICATE = parseInt(argVal('--target', '2'), 10);
const MAX_GAMES = parseInt(argVal('--max-games', '4000'), 10);

// ════════════════════════════════════════════════════════════════════════════
// STRATEGY: fixture
// Body ported VERBATIM from reason_engine/build_fixture.mjs — only import
// paths differ (now at server/scripts/ depth). Byte-identity depends on:
// same fixed seed, same anchors, same stratified loop, same rows.sort(), and
// the same JSON key order (JSON.stringify insertion order).
// ════════════════════════════════════════════════════════════════════════════
if (strategy === 'fixture') {
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
  writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`wrote ${rows.length} rows to ${outPath}`);
  console.log('counts:', JSON.stringify(counts, null, 2));
  void INVALID_MOVE; void COLS;

// ════════════════════════════════════════════════════════════════════════════
// STRATEGY: coverage
// Ported from build_reason_eval_set.mjs: harvest loop + 5s heartbeat +
// satisfied() termination. Drops toNarratorVector; emits board-list rows.
// ════════════════════════════════════════════════════════════════════════════
} else if (strategy === 'coverage') {
  // The FULL closed predicate universe, named upfront (design: docs/architecture reason review 2026-07-01).
  // Every value of every axis the reason engine can emit. `discovered ⊆ REASON_UNIVERSE` is asserted at
  // the end (Task 6): an engine-emitted predicate not listed here is a bug in this list, not the engine.
  const REASON_UNIVERSE = [
    'route_sign', 'route_realized_denied',
    'case_win_to_draw', 'case_win_to_lose', 'case_draw_to_lose', 'case_lose_to_faster_lose',
    'player_1', 'player_2',
    'phase_opening', 'phase_mid-game', 'phase_closing',
    'sev_small', 'sev_moderate', 'sev_large',
    'rd_immediate_threat_missed_own', 'rd_immediate_threat_enabled_opponent',
    'rd_forced_block_defensive_miss',
    'rd_double_threat_missed_own', 'rd_double_threat_enabled_opponent',
    'rd_figure_7_missed_own', 'rd_figure_7_enabled_opponent',
    'lost_fork_A', 'lost_fork_B', 'lost_parity_win',
    'lost_denial_occupation', 'lost_denial_no_occupation', 'lost_conditional_swindle',
    'lost_realized_immediate_threat', 'lost_realized_forced_block',
    'lost_realized_double_threat', 'lost_realized_figure_7',
    'opp_winning_line', 'opp_denial', 'opp_neutralization', 'opp_realized_pattern',
    'tie_tied', 'tie_independent', 'tie_temporal',
    'reg_lost_immediate', 'reg_lost_forced_sequence', 'reg_lost_parity',
    'reg_opp_immediate', 'reg_opp_forced_sequence', 'reg_opp_parity',
    'tactic_lost_present', 'tactic_lost_null', 'tactic_opp_present', 'tactic_opp_null',
    'parity_nameable', 'parity_unnameable', 'parity_forcedFirst',
    'opp_parity_nameable', 'opp_parity_unnameable',
    'gate_exhaustive', 'gate_bounded',
  ];
  // SEED partition — finalized empirically by Task 8 (calibration). Provisional = known-rare /
  // possibly-unreachable in ordinary self-play; reported but NON-blocking (never gates satisfied()).
  const PROVISIONAL = new Set([
    'rd_double_threat_enabled_opponent', 'rd_figure_7_enabled_opponent', // 0/60k harvested (D20 honest-limits)
    'tie_temporal',                        // lose_to_faster_lose only
    'lost_denial_no_occupation',           // D18: depth artifact, near-unreachable
    'lost_realized_figure_7', 'lost_fork_B', // figure_7/Case-B forks are rare
    'parity_unnameable', 'opp_parity_unnameable', // multi-window board-fill only
  ]);
  const REQUIRED = REASON_UNIVERSE.filter((p) => !PROVISIONAL.has(p));

  // ── Reason-vector predicates: the diversity axes the selector covers. ──
  // Each is a tag the board "exhibits"; we keep harvesting until every tag has appeared TARGET times.
  function reasonPredicates(r) {
    const preds = new Set();
    const half = (h, side) => {
      if (!h) return;
      if (h.register) preds.add(`reg_${side}_${h.register}`);
      if (h.tacticTag) preds.add(`tactic_${side}_present`); else preds.add(`tactic_${side}_null`);
    };

    preds.add(`case_${r.case}`);
    preds.add(r.player === 1 ? 'player_1' : 'player_2');
    preds.add(`phase_${r.boardState}`);                       // opening | mid-game | closing
    // severity band from the score gap (bestScore - playedScore), the engine's own magnitudes.
    const gap = (r.bestScore ?? 0) - (r.playedScore ?? 0);
    preds.add(gap >= 12 ? 'sev_large' : (gap >= 4 ? 'sev_moderate' : 'sev_small'));
    preds.add(`route_${r.route || 'sign'}`);
    if (r.route === 'realized_denied' && r.tag && r.direction) preds.add(`rd_${r.tag}_${r.direction}`);

    const lr = r.lostResource;
    if (lr) {
      if (lr.kind === 'winning_line' && lr.terminal === 'fork') preds.add(`lost_fork_${lr.forkCase}`);
      else if (lr.kind === 'winning_line') preds.add('lost_parity_win');
      else if (lr.kind === 'denial') preds.add(`lost_denial_${lr.verdict}`);
      else if (lr.kind === 'conditional_swindle') preds.add('lost_conditional_swindle');
      else if (lr.kind === 'realized_pattern') preds.add(`lost_realized_${lr.tag}`);
      if (lr.parityAttribution) {
        preds.add(lr.parityAttribution.nameable ? 'parity_nameable' : 'parity_unnameable');
        if (lr.parityAttribution.forcedFirstRequired) preds.add('parity_forcedFirst');
      }
    }
    half(lr, 'lost');

    const op = r.opponentPunishment;
    if (op) {
      if (op.kind) preds.add(`opp_${op.kind}`);                // winning_line | denial | neutralization
      if (op.tie?.kind) preds.add(`tie_${op.tie.kind}`);       // tied | independent | temporal
      if (op.parityAttribution) preds.add(op.parityAttribution.nameable ? 'opp_parity_nameable' : 'opp_parity_unnameable');
    }
    half(op, 'opp');

    if (r.gate) preds.add(r.gate.exhaustive ? 'gate_exhaustive' : 'gate_bounded');
    return preds;
  }

  const solver = createSolverProcess();
  const counts = new Map();              // predicate -> #boards it has appeared in
  const satisfied = () => [...counts.values()].length > 0 && [...counts.values()].every((c) => c >= TARGET_PER_PREDICATE);
  const collected = [];
  const seen = new Set();
  let boards = 0, games = 0, checked = 0;

  // Progress log every 5s: boards checked, boards generated, and the predicates still under target
  // (count < TARGET). A predicate stuck at 1 keeps satisfied() false and the harvest running to
  // MAX_GAMES — this surfaces exactly which one is holding it up.
  const startedAt = Date.now();
  let lastLogAt = startedAt;
  const logProgress = () => {
    const now = Date.now();
    if (now - lastLogAt < 5000) return;
    lastLogAt = now;
    const under = [...counts.entries()]
      .filter(([, c]) => c < TARGET_PER_PREDICATE)
      .sort((a, b) => a[1] - b[1])
      .map(([p, c]) => `${p}(${c})`);
    const elapsed = ((now - startedAt) / 1000).toFixed(0);
    process.stderr.write(
      `[${elapsed}s] checked ${checked} · generated ${boards} · games ${games} · `
      + `predicates ${counts.size} · under-target(${under.length}): ${under.join(' ') || 'none'}\n`,
    );
  };

  try {
    for await (const ply of harvestBlunders(solver, { maxGames: MAX_GAMES })) {
      games = ply.gameIndex;
      const { boardState, movePlayed } = ply;
      logProgress();                       // time-based (every 5s), independent of board rate
      const key = `${boardState}|${movePlayed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checked++;                           // unique blunder positions examined

      let r;
      try { r = await computeReason(boardState, movePlayed, { solver }); }
      catch { continue; }                 // illegal/terminal — skip
      if (r.notABlunder || !r.case || r.case === 'win_to_slower_win') continue;

      const preds = reasonPredicates(r);
      // Keep the board only if it pushes some predicate toward the target; if every predicate it
      // carries is already at target, it adds no coverage — skip it.
      const advancing = [...preds].filter((p) => (counts.get(p) || 0) < TARGET_PER_PREDICATE);
      if (advancing.length === 0) continue;

      for (const p of preds) counts.set(p, (counts.get(p) || 0) + 1);
      collected.push({
        id: `eval-${collected.length + 1}`,
        movestring: boardState,
        playedCol: movePlayed,
        strategy: 'coverage',
        selection: { predicates: [...preds].sort() },
      });
      writeFileSync(outPath, collected.map((x) => JSON.stringify(x)).join('\n') + '\n'); // crash-safe
      boards++;
      // Every predicate seen so far has reached the target → coverage complete, stop now.
      if (satisfied()) break;
    }
  } finally {
    solver.destroy();
  }

  const under = [...counts.entries()].filter(([, c]) => c < TARGET_PER_PREDICATE).map(([p]) => p);
  process.stderr.write(`\nDone: ${games} games, ${collected.length} boards → ${outPath}\n`);
  process.stderr.write(`Predicates covered: ${counts.size}; under target (${TARGET_PER_PREDICATE}): ${under.length ? under.join(' ') : 'none'}\n`);
}
