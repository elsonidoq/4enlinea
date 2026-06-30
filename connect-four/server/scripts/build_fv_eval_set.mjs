#!/usr/bin/env node
// build_fv_eval_set.mjs — freeze a from-vector eval set from the reason-engine corpus.
//
// Turns the precomputed reason-engine corpus (reason_evidence_all.jsonl, produced offline by
// reason_engine/build_evidence.mjs over the fixture) into a frozen, comparable input for the
// from-vector eval answerer (explain_from_vector.mjs). Each output row is:
//     { id, pattern_category, feature_vector }
// where feature_vector = toNarratorVector(corpus row) — the SAME LLM-facing projection production
// will apply to a live computeReason result (see reasonNarratorVector.mjs). The corpus is an
// OFFLINE convenience; production computes the vector live from the request, never from this file.
//
// notABlunder rows are dropped (the eval explains why a move WAS a blunder; a non-blunder has no
// lostResource/opponentPunishment to narrate).
//
// SCALING TO A BIGGER SET: this script does not cap size by default. To grow the eval set:
//   1. enlarge the fixture     — reason_engine/build_fixture.mjs  (stratified sampling, raise --n)
//   2. recompute the corpus    — reason_engine/build_evidence.mjs (runs computeReason per board)
//   3. re-freeze               — this script (optionally --per-case <k> to balance across cases)
// The answerer + grader are size-agnostic; only the frozen file grows.
//
// Usage (from connect-four/):
//   node server/scripts/build_fv_eval_set.mjs
//     [--input  server/scripts/reason_evidence_all.jsonl]
//     [--out    server/scripts/fv_eval_set.jsonl]
//     [--per-case <k>]   # cap rows per (case) bucket for a balanced/smaller set; default: all

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { toNarratorVector } from './reasonNarratorVector.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const inputPath = argVal('--input', join(__dirname, 'reason_evidence_all.jsonl'));
const outPath = argVal('--out', join(__dirname, 'fv_eval_set.jsonl'));
const perCase = argVal('--per-case', null);
const perCaseCap = perCase != null ? parseInt(perCase, 10) : Infinity;

// Short, stable id prefix per case (keeps ids readable in the grader report).
const CASE_PREFIX = {
  win_to_draw: 'wd', win_to_lose: 'wl', draw_to_lose: 'dl', lose_to_faster_lose: 'ltfl',
  win_to_slower_win: 'wsw', draw_to_draw: 'dd',
};

const rows = readFileSync(inputPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const perCaseCount = {};
const out = [];
for (const row of rows) {
  if (row.notABlunder) continue;          // not a blunder → nothing to narrate
  const c = row.case;
  perCaseCount[c] = (perCaseCount[c] ?? 0);
  if (perCaseCount[c] >= perCaseCap) continue;
  const idx = perCaseCount[c]++;
  const prefix = CASE_PREFIX[c] || c;
  out.push({
    id: `${prefix}-${idx}`,
    pattern_category: c,               // grader groups/reports by pattern_category
    feature_vector: toNarratorVector(row),
  });
}

writeFileSync(outPath, out.map((r) => JSON.stringify(r)).join('\n') + '\n');

const counts = {};
for (const r of out) counts[r.pattern_category] = (counts[r.pattern_category] ?? 0) + 1;
console.log(`Wrote ${out.length} eval rows → ${outPath}`);
console.log('Per case:', JSON.stringify(counts));
console.log('IDs:', out.map((r) => r.id).join(', '));
