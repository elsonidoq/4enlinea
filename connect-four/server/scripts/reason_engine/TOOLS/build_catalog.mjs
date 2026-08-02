#!/usr/bin/env node
// build_catalog.mjs — produce the full-66 routing catalog for the reason-field audit.
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/TOOLS/build_catalog.mjs > server/scripts/reason_engine/CATALOG.md
//
// For each case in eval_set_large_3.json it queries the solver on the PRE-MOVE board,
// reads the score of bestCol (correct_move) and playedCol (move_played), maps each to a
// win/draw/loss outcome, and derives:
//   - outcomeDelta (best vs played)
//   - branch: FLIP (best != played) | SAME (best == played)
//   - expected reason kind per epic §5 ladder (cheap heuristic; auditor confirms)
//   - disc count, is_sparse, severity
// No deep lookahead — these are the cheap routing signals only (epic §3).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
const env = readFileSync(join(root, '.env'), 'utf8');
env.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const cases = JSON.parse(readFileSync(join(root, 'scripts/eval_set_large_3.json'), 'utf8'));
const INVALID = -1000;
const outcome = (s) => (s === INVALID ? 'invalid' : s > 0 ? 'win' : s < 0 ? 'loss' : 'draw');

const PARITY_CATS = new Set(['z_threat', 'claimeven']);

function expectedKind(branch, best, played, cat, isSparse, discs) {
  if (branch === 'FLIP') {
    if (PARITY_CATS.has(cat)) return 'parity_control?';      // needs same-perspective cell pass
    if (isSparse || discs <= 6) return 'positional?';
    return 'concrete_line';
  }
  // SAME floor
  if (best === 'loss' && played === 'loss') return 'resistance';
  if (best === 'win' && played === 'win') return 'conversion';
  if (best === 'draw' && played === 'draw') return 'OMIT(both-draw)';
  return 'OMIT(?)';
}

const solver = createSolverProcess();
const rows = [];
try {
  for (const c of cases) {
    let scores;
    try { scores = await solver.query(c.board_state); }
    catch { scores = null; }
    const best = scores ? outcome(scores[c.correct_move]) : 'ERR';
    const played = scores ? outcome(scores[c.move_played]) : 'ERR';
    const branch = best === played ? 'SAME' : 'FLIP';
    const discs = c.board_state.length;
    const kind = expectedKind(branch, best, played, c.pattern_category, c.is_sparse, discs);
    rows.push({
      id: c.id, cat: c.pattern_category, discs, best, played, branch, kind,
      sparse: c.is_sparse ? 'Y' : '', sev: c.severity,
      sBest: scores ? scores[c.correct_move] : null,
      sPlayed: scores ? scores[c.move_played] : null,
    });
  }
} finally {
  solver.destroy();
}

// Emit markdown
console.log('# Reason-Field Audit — Case Catalog (all 66)\n');
console.log('Cheap routing signals from the solver on the pre-move board. `kind?` = heuristic guess the auditor must confirm.');
console.log('Mark a case analyzed by appending ` [A]` to its id cell.\n');
console.log('| id | cat | discs | best | played | sBest | sPlayed | branch | exp.kind | sparse | sev |');
console.log('|----|-----|-------|------|--------|-------|---------|--------|----------|--------|-----|');
for (const r of rows) {
  console.log(`| ${r.id} | ${r.cat} | ${r.discs} | ${r.best} | ${r.played} | ${r.sBest} | ${r.sPlayed} | ${r.branch} | ${r.kind} | ${r.sparse} | ${r.sev} |`);
}

// Summary by (branch x expected kind)
const groups = {};
for (const r of rows) {
  const key = `${r.branch} / ${r.kind}`;
  (groups[key] ||= []).push(r.id);
}
console.log('\n## Groups (branch × expected-kind) — each needs ≥1 analyzed representative\n');
for (const [k, ids] of Object.entries(groups).sort()) {
  console.log(`- **${k}** (${ids.length}): ${ids.join(', ')}`);
}
