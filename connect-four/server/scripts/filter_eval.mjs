#!/usr/bin/env node
/**
 * Usage: node filter_eval.mjs <input.jsonl> <output.jsonl> eval-1,eval-5,eval-10
 *
 * Creates a subset of an eval JSONL file containing only the specified IDs.
 */

import { readFileSync, writeFileSync } from 'fs';

const [, , inputFile, outputFile, idsArg] = process.argv;

if (!inputFile || !outputFile || !idsArg) {
  console.error('Usage: node filter_eval.mjs <input.jsonl> <output.jsonl> eval-1,eval-5,eval-10');
  process.exit(1);
}

const ids = new Set(idsArg.split(',').map(s => s.trim()));

const raw = readFileSync(inputFile, 'utf8').trim();

// Support both JSON array and JSONL (one object per line)
let records;
if (raw.startsWith('[')) {
  records = JSON.parse(raw);
} else {
  records = raw.split('\n').flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

const kept = records.filter(r => ids.has(r.id));

const foundIds = new Set(kept.map(r => r.id));
const missing = [...ids].filter(id => !foundIds.has(id));
if (missing.length > 0) {
  console.warn(`Warning: IDs not found in input: ${missing.join(', ')}`);
}

// Write as JSON array if input was JSON array, otherwise JSONL
const output = raw.startsWith('[')
  ? JSON.stringify(kept, null, 2) + '\n'
  : kept.map(r => JSON.stringify(r)).join('\n') + '\n';
writeFileSync(outputFile, output);
console.log(`Wrote ${kept.length} record(s) to ${outputFile}`);
