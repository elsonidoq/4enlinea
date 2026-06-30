#!/usr/bin/env node
// build_reason_eval_set.mjs — DIVERSITY board selector for the reason-vector LLM eval (Pipeline B, Stage ①).
//
// The new-world analog of generate_eval_set.mjs: instead of selecting boards by the old
// tag/direction predicates, it harvests mistake-weighted self-play (gameSampling.harvestBlunders),
// runs each blunder through computeReason, computes REASON-VECTOR predicates (below), and keeps a
// board whenever it advances predicate coverage — stopping when every predicate has appeared in
// >= TARGET_PER_PREDICATE boards (or MAX_GAMES). This concentrates an INTERESTING, DIVERSE set
// (every case, every half-shape, every tie kind, both parity/tactical wins, named + unnamed tactics,
// both gate verdicts, both players, every phase, both severity bands) rather than just spanning the
// 4 sign-cases.
//
// Output rows are exactly the from-vector eval shape — { id, pattern_category, feature_vector } with
// feature_vector = toNarratorVector(computeReason) — so explain_from_vector.mjs + grade-fv-sufficiency
// consume them directly (no separate build_evidence pass needed; the vector is computed live here).
//
// Usage (from connect-four/):
//   node server/scripts/build_reason_eval_set.mjs [--out reason_eval_set.jsonl]
//        [--target 2] [--max-games 4000]
//
// Distinct from build_fv_eval_set.mjs (which freezes a subset of the PRECOMPUTED corpus, no solver —
// fast, for quick prompt/glossary iteration). This one HARVESTS new boards for coverage — slower,
// for a rich set. Both feed the same answerer.

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { harvestBlunders } from '../gameSampling.js';
import { computeReason } from './reason_engine/reasonEngine.mjs';
import { toNarratorVector } from './reasonNarratorVector.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const outPath = argVal('--out', join(__dirname, 'reason_eval_set.jsonl'));
const TARGET_PER_PREDICATE = parseInt(argVal('--target', '2'), 10);
const MAX_GAMES = parseInt(argVal('--max-games', '4000'), 10);

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

  const lr = r.lostResource;
  if (lr) {
    if (lr.kind === 'winning_line' && lr.terminal === 'fork') preds.add(`lost_fork_${lr.forkCase}`);
    else if (lr.kind === 'winning_line') preds.add('lost_parity_win');
    else if (lr.kind === 'denial') preds.add(`lost_denial_${lr.verdict}`);
    else if (lr.kind === 'conditional_swindle') preds.add('lost_conditional_swindle');
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

async function main() {
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
        id: `${r.case}-${collected.length}`,
        pattern_category: r.case,
        feature_vector: toNarratorVector(r),
        _predicates: [...preds].sort(),    // selection provenance (underscore = not shown to the LLM; pruned by build step if reused)
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

main().catch((e) => { console.error(e); process.exit(1); });
