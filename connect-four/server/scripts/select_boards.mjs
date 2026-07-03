#!/usr/bin/env node
// select_boards.mjs — unified board-selector for the reason-eval pipeline.
//
// Strategies:
//   --strategy fixture   Regenerates reason_engine/reason_fixture.jsonl sampled rows.
//                        Committed fixture additionally carries route/expectedTag/expectedDirection
//                        and d19-witness labels added by D19/D20 test commits; this strategy does
//                        not re-emit those labels (output not byte-identical to committed).
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
import { swindleGate } from './reason_engine/reasonEngine.mjs';
import { computeReason } from './reason_engine/reasonEngine.mjs';
import { toNarratorVector } from './reasonNarratorVector.mjs';
import { buildRenderDecision } from './renderReasonModel.mjs';
import { renderDecisionPredicates, RENDER_UNIVERSE, RENDER_PROVISIONAL, RENDER_REQUIRED } from './renderUniverse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../.env'));

// ── arg parser ──
function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const HELP = `select_boards.mjs — unified board-selector for the reason-eval pipeline.

Strategies:
  fixture   Regenerates the sampled rows of reason_engine/reason_fixture.jsonl from a fixed seed
            and stratified per-case buckets. NOTE: the committed fixture also carries
            route/expectedTag/expectedDirection and D19/D20 witness labels that this strategy does
            NOT re-emit, so its output is not byte-identical to the committed file.
  coverage  Harvests a diverse coverage set for the from-vector eval against a named, closed
            predicate universe (REQUIRED predicates gate termination; PROVISIONAL ones are
            reported but non-blocking). Emits board-list rows (no toNarratorVector call).

Usage (from connect-four/):
  node server/scripts/select_boards.mjs --strategy {fixture|coverage} [--out <path>]
       [--target N] [--max-games N]

Options:
  --strategy fixture|coverage  REQUIRED. Which selector to run.
  --out <path>                 Output file. Default: reason_engine/reason_fixture.jsonl (fixture)
                               or boards_coverage_<timestamp>.jsonl (coverage).
  --target <N>                 coverage only: boards required per predicate before stopping. Default: 2.
  --max-games <N>              coverage only: max self-play games to harvest before giving up. Default: 4000.
  -h, --help                   Show this help and exit.`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
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
process.stderr.write(`Output will be written to: ${outPath}\n`);
const TARGET_PER_PREDICATE = parseInt(argVal('--target', '2'), 10);
const MAX_GAMES = parseInt(argVal('--max-games', '4000'), 10);

// ════════════════════════════════════════════════════════════════════════════
// STRATEGY: fixture
// Regenerates sampled rows from the same fixed seed and stratified loop logic.
// NOTE: Committed reason_fixture.jsonl carries additional route/expectedTag/
// expectedDirection and d19-witness labels (added by D19/D20 test commits
// 0a85b0c, 7c06e24, bb36202). This strategy's output does not re-emit those.
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
        const gate = await swindleGate(solver, a.movestring + String(bestCol), {});
        row.expectedGate = gate.found ? 'Blunder' : 'NotABlunder';
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
            // Prefer near-full boards for NotABlunder fixture rows (their not-found verdict is the most
            // stable); this is only a sampling heuristic now, not tied to any engine flag (D23).
            const nearFull = emptyCellCount(ms) <= 10;
            const wantNAB = counts.lose_to_faster_lose.notABlunder < CFG.ltflNotABlunder && nearFull;
            const wantBlunder = counts.lose_to_faster_lose.blunder < CFG.ltflBlunder;
            const wantLow = counts.lose_to_faster_lose.low < CFG.perCaseLow && Math.abs(scores[playedCol]) <= CFG.lowMag;
            if (wantNAB || wantBlunder || wantLow) {
              const gate = await swindleGate(solver, ms + String(bestCol), {});
              const verdict = gate.found ? 'Blunder' : 'NotABlunder';
              const row = {
                movestring: ms, playedCol, bestCol, scores, discs,
                expectedCase: 'lose_to_faster_lose', expectedGate: verdict,
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
// Harvests boards against a named, closed predicate universe (REASON_UNIVERSE, below),
// partitioned into REQUIRED (blocks termination via satisfied()) and PROVISIONAL
// (known-rare, reported but non-blocking). Any predicate the reason engine emits that
// is not in REASON_UNIVERSE trips the discovered⊆named guard at insertion time.
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
    // NB: there is no `lost_realized_forced_block`. forced_block is definitionally a defensive_miss
    // (you failed to answer the OPPONENT's pre-existing threat), so its realized pattern is always the
    // opponentPunishment half, never the lostResource — the pairing is structurally impossible. (D23)
    'lost_realized_immediate_threat',
    'lost_realized_double_threat', 'lost_realized_figure_7',
    'opp_winning_line', 'opp_denial', 'opp_neutralization', 'opp_realized_pattern',
    'tie_tied', 'tie_independent', 'tie_temporal',
    'reg_lost_immediate', 'reg_lost_forced_sequence', 'reg_lost_parity',
    'reg_opp_immediate', 'reg_opp_forced_sequence', 'reg_opp_parity',
    'tactic_lost_present', 'tactic_lost_null', 'tactic_opp_present', 'tactic_opp_null',
    'parity_nameable', 'parity_unnameable',
    'opp_parity_nameable', 'opp_parity_unnameable',
    'gate_ran',   // D23: the gate is one uniform depth-bounded search; the exhaustive/bounded split is retired.
  ];
  // Partition CALIBRATED empirically (Task 8, 2026-07-01: coverage harvest, target 2, ~497 games).
  // Provisional = known-rare / structurally-unreachable in ordinary self-play; reported but
  // NON-blocking (never gates satisfied()). Observed: 45/47 REQUIRED filled by ~497 games; the
  // predicates below never reached target within budget.
  const PROVISIONAL = new Set([
    // rd_double_threat_enabled_opponent is now REQUIRED: the earlier "0/60k, rare" finding was a
    // router-locus bug (realizedPattern was checked one ply before the fork forms), not rarity —
    // the tag is common in self-play. Fixed in reasonEngine.realizedDeniedReason (D23).
    'rd_figure_7_enabled_opponent',        // Case-B enabled fork: reachable post-fix but genuinely rare (like lost_fork_B)
    'tie_temporal',                        // lose_to_faster_lose only
    'lost_denial_no_occupation',           // D18: depth artifact, near-unreachable
    'lost_realized_figure_7', 'lost_fork_B', // figure_7/Case-B forks are rare
    'parity_unnameable', 'opp_parity_unnameable', // multi-window board-fill only
  ]);
  const REQUIRED = REASON_UNIVERSE.filter((p) => !PROVISIONAL.has(p));

  // Union the render-layer (Task 4) predicates into the joint universe the sampler must span
  // (spec §3e): the coverage set now has to exercise both the engine's own axes AND the
  // render_decision's link/board/branch-invariance/horizon/covers axes.
  const FULL_UNIVERSE = new Set([...REASON_UNIVERSE, ...RENDER_UNIVERSE]);
  const ALL_PROVISIONAL = new Set([...PROVISIONAL, ...RENDER_PROVISIONAL]);
  const ALL_REQUIRED = [...REQUIRED, ...RENDER_REQUIRED];

  // Rare-fill safety bounds (debug-stuck-jobs.md 2026-07-03): the directed post-pass probes computeReason
  // on EVERY suboptimal column, so a full MAX_GAMES sweep chasing a near-unreachable predicate runs for
  // tens of minutes with no progress. Cap its budget, and bail when a run of games adds no new board.
  const RARE_FILL_GAMES = Math.min(MAX_GAMES, 200);
  const RARE_FILL_NOPROGRESS_GAMES = 40;

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
        // `parity_forcedFirst` retired (review F3): forcedFirstRequired was an unbacked
        // Aftereven claim; attributeParityWin no longer emits it.
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

    if (r.gate) preds.add('gate_ran');   // D23: uniform depth-bounded gate (no exhaustive/bounded split)

    // Render-layer predicates (spec §3e): derive the render_decision from this evidence and union in
    // its link/board/branch-invariance/horizon/covers predicates. Failure (unroutable) → engine preds only.
    try {
      const rd = buildRenderDecision(toNarratorVector(r));
      for (const rp of renderDecisionPredicates(rd)) preds.add(rp);
    } catch { /* render pipeline can't route this board — keep engine predicates */ }

    return preds;
  }

  const solver = createSolverProcess();
  const counts = new Map();              // predicate -> #boards it has appeared in
  const satisfied = () => ALL_REQUIRED.every((p) => (counts.get(p) || 0) >= TARGET_PER_PREDICATE);
  const collected = [];
  const seen = new Set();
  let boards = 0, games = 0, checked = 0;

  // Progress log every 5s: boards checked, boards generated, and the predicates still under target
  // (count < TARGET). A predicate stuck at 1 keeps satisfied() false and the harvest running to
  // MAX_GAMES — this surfaces exactly which one is holding it up.
  const startedAt = Date.now();
  let lastLogAt = startedAt;
  const predicateReport = () => {
    const seenPreds = new Set(counts.keys()); // predicates observed (distinct from the outer board-dedup `seen`)
    const fulfilled = ALL_REQUIRED.filter((p) => (counts.get(p) || 0) >= TARGET_PER_PREDICATE);
    const underTarget = [...FULL_UNIVERSE].filter((p) => seenPreds.has(p) && (counts.get(p) || 0) < TARGET_PER_PREDICATE)
      .sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0)).map((p) => `${p}(${counts.get(p) || 0})`);
    const neverSeen = [...FULL_UNIVERSE].filter((p) => !seenPreds.has(p)).map((p) => ALL_PROVISIONAL.has(p) ? `${p}*` : p);
    return { fulfilled, underTarget, neverSeen };
  };
  const logProgress = () => {
    const now = Date.now();
    if (now - lastLogAt < 5000) return;
    lastLogAt = now;
    const { fulfilled, underTarget, neverSeen } = predicateReport();
    const elapsed = ((now - startedAt) / 1000).toFixed(0);
    process.stderr.write(
      `[${elapsed}s] checked ${checked} · generated ${boards} · games ${games} · `
      + `fulfilled ${fulfilled.length}/${ALL_REQUIRED.length} · under-target(${underTarget.length}): ${underTarget.join(' ') || 'none'} · `
      + `never-seen(${neverSeen.length}): ${neverSeen.join(' ') || 'none'}\n`,
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

      for (const p of preds) {
        if (!FULL_UNIVERSE.has(p)) throw new Error(`unnamed predicate "${p}" — add it to REASON_UNIVERSE/RENDER_UNIVERSE (I12 selector guard)`);
        counts.set(p, (counts.get(p) || 0) + 1);
      }
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

    // ── Directed rare-fill: for still-unfilled predicates (mostly PROVISIONAL render/flip-case ones),
    // probe every suboptimal legal column per position, not just the played move — a broader existential
    // than the diversity sweep. Never fabricates a board; each candidate is a real self-play position
    // plus a real legal (suboptimal) column. Bounded by the same MAX_GAMES budget.
    if (!satisfied()) {
      const rng2 = (() => { let a = 0x5EED; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      let fillGames = 0, gamesSinceProgress = 0;
      for (let g = 0; g < RARE_FILL_GAMES && !satisfied() && gamesSinceProgress < RARE_FILL_NOPROGRESS_GAMES; g++) {
        const boardsBefore = boards;
        for await (const pos of playGame(solver, rng2)) {
          fillGames = g;
          logProgress();
          const { ms, scores } = pos;
          const legal = legalCols(scores);
          if (legal.length < 2) continue;
          let bestCol = legal[0], bestScore = scores[legal[0]];
          for (const c of legal) if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; }
          for (const col of legal) {
            if (col === bestCol || scores[col] >= bestScore) continue;   // suboptimal only
            const key = `${ms}|${col}`;
            if (seen.has(key)) continue;
            let r;
            try { r = await computeReason(ms, col, { solver }); } catch { continue; }
            if (r.notABlunder || !r.case || r.case === 'win_to_slower_win') continue;
            const preds = reasonPredicates(r);
            const advancing = [...preds].filter((p) => (counts.get(p) || 0) < TARGET_PER_PREDICATE);
            if (advancing.length === 0) continue;                        // adds no coverage
            seen.add(key);
            for (const p of preds) {
              if (!FULL_UNIVERSE.has(p)) throw new Error(`unnamed predicate "${p}" — add it to REASON_UNIVERSE/RENDER_UNIVERSE (I12 selector guard)`);
              counts.set(p, (counts.get(p) || 0) + 1);
            }
            collected.push({ id: `eval-${collected.length + 1}`, movestring: ms, playedCol: col,
              strategy: 'coverage', selection: { predicates: [...preds].sort(), source: 'rare-fill' } });
            writeFileSync(outPath, collected.map((x) => JSON.stringify(x)).join('\n') + '\n');
            boards++;
          }
          if (satisfied()) break;
        }
        gamesSinceProgress = (boards > boardsBefore) ? 0 : gamesSinceProgress + 1;
      }
      process.stderr.write(`rare-fill: ${fillGames} extra games${gamesSinceProgress >= RARE_FILL_NOPROGRESS_GAMES ? ' (stopped early: no reachable target)' : ''}\n`);
    }
  } finally {
    solver.destroy();
  }

  const { fulfilled, underTarget, neverSeen } = predicateReport();
  const stopped = satisfied() ? 'all REQUIRED predicates satisfied' : `hit MAX_GAMES=${MAX_GAMES} — a REQUIRED predicate could not be filled (investigate)`;
  process.stderr.write(`\nDone: ${games} games, ${collected.length} boards → ${outPath} (${stopped})\n`);
  process.stderr.write(`Fulfilled (${fulfilled.length}/${ALL_REQUIRED.length})\n`);
  process.stderr.write(`Under target ${TARGET_PER_PREDICATE} (${underTarget.length}): ${underTarget.join(' ') || 'none'}\n`);
  process.stderr.write(`Never seen — * = provisional (${neverSeen.length}): ${neverSeen.join(' ') || 'none'}\n`);
}
