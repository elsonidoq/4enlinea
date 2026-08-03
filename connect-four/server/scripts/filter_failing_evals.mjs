#!/usr/bin/env node
// filter_failing_evals.mjs — extract failing entries from an eval run into a new eval set.
//
// Usage (run from connect-four/):
//   node server/scripts/filter_failing_evals.mjs <results.jsonl> <eval_set.json> [output.json]
//
// "Failing" means final_response is null (covers both annotation failures and pipeline errors).
// Output defaults to <eval_set_basename>_failing_<timestamp>.json next to the results file.

import { readFileSync, writeFileSync } from 'fs';
import { dirname, basename, join } from 'path';

const [,, resultsFile, evalSetFile, outputFile] = process.argv;

if (!resultsFile || !evalSetFile) {
  console.error('Usage: node filter_failing_evals.mjs <results.jsonl> <eval_set.json> [output.json]');
  process.exit(1);
}

const results = readFileSync(resultsFile, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const failingIds = new Set(
  results.filter(r => r.final_response === null).map(r => r.id)
);

console.log(`Total entries: ${results.length}`);
console.log(`Failing entries: ${failingIds.size}`);

const evalSet = JSON.parse(readFileSync(evalSetFile, 'utf8'));
const failingEntries = evalSet.filter(e => failingIds.has(e.id));

if (failingEntries.length !== failingIds.size) {
  const missing = [...failingIds].filter(id => !evalSet.find(e => e.id === id));
  console.warn(`Warning: ${missing.length} failing IDs not found in eval set: ${missing.join(', ')}`);
}

const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
const stem = basename(evalSetFile, '.json');
const out = outputFile ?? join(dirname(resultsFile), `${stem}_failing_${ts}.json`);

writeFileSync(out, JSON.stringify(failingEntries, null, 2) + '\n');
console.log(`Wrote ${failingEntries.length} entries → ${out}`);
