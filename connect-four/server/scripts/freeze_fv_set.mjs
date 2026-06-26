#!/usr/bin/env node
// freeze_fv_set.mjs — Step 1 of the Feature-Vector Sufficiency Experiment.
//
// Selects a small STRATIFIED subset of eval_set_large_3.json spanning every blunder
// `pattern_category`, with both sparse and dense boards represented, and writes it to
// eval_set_fv_suff_frozen.json. That file is then fed to run_eval.mjs --no-llm once to
// produce the frozen vectors jsonl (the constant input across every prompt×model iteration).
//
// Usage (from connect-four/):
//   node server/scripts/freeze_fv_set.mjs
//
// Stratification (direction / lookahead.case are computed at runtime, not present in the
// source entries, so we stratify on what IS available — category + is_sparse — and verify
// direction/case spread from the generated vectors afterward, topping up if needed).

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'eval_set_large_3.json');
const OUT = join(__dirname, 'eval_set_fv_suff_frozen.json');

const all = JSON.parse(readFileSync(SRC, 'utf8'));

const byCat = {};
for (const e of all) (byCat[e.pattern_category] ??= []).push(e);

// How many to take per category. Tactical categories that commonly span multiple
// `direction`s (missed_own / enabled_opponent) get 2 to widen direction coverage.
const PER_CAT = {
  immediate_threat: 2,
  forced_win: 2,
  double_threat: 2,
};
const DEFAULT_PER_CAT = 1;

// Categories that carry sparse entries: take one sparse + one dense for board variety.
const SPARSE_DENSE = new Set(['drawing_move', 'suboptimal_move']);

const selected = [];
const seen = new Set();
function take(e) {
  if (!e || seen.has(e.id)) return;
  seen.add(e.id);
  selected.push(e);
}

for (const [cat, arr] of Object.entries(byCat)) {
  if (SPARSE_DENSE.has(cat)) {
    take(arr.find((e) => e.is_sparse));        // first sparse
    take(arr.find((e) => !e.is_sparse));       // first dense
    continue;
  }
  const n = PER_CAT[cat] ?? DEFAULT_PER_CAT;
  for (let i = 0; i < n && i < arr.length; i++) take(arr[i]);
}

writeFileSync(OUT, JSON.stringify(selected, null, 2) + '\n');

// Report
const counts = {};
for (const e of selected) counts[e.pattern_category] = (counts[e.pattern_category] ?? 0) + 1;
console.log(`Wrote ${selected.length} cases → ${OUT}`);
console.log('Per category:', JSON.stringify(counts));
console.log('Sparse:', selected.filter((e) => e.is_sparse).length, '/', selected.length);
console.log('IDs:', selected.map((e) => e.id).join(', '));
