#!/usr/bin/env node
// build_evidence.mjs — precompute the reason-engine evidence for every fixture board and write a
// flat JSONL the /admin/fv-suff viewer can render with NO solver in the web server.
//
// Each output row = the engine's evidence object verbatim, augmented with the fixture's ground-truth
// labels (expectedCase / expectedGate / expectedExhaustive / bucket) so the viewer can flag any
// computed-vs-expected mismatch by eye.
//
// Usage (from connect-four/):
//   node server/scripts/reason_audit/build_evidence.mjs
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { loadEnv } from './lib/boardUtils.mjs';
import { computeReason } from './reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../../.env'));

const FIXTURE = join(__dirname, 'reason_fixture.jsonl');
// The admin endpoint reads from server/scripts/ — write the evidence file there (stable name).
const OUT = join(__dirname, '..', 'reason_evidence_all.jsonl');

const fixture = readFileSync(FIXTURE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const solver = await createSolverProcess();
const rows = [];
try {
  for (const f of fixture) {
    const evidence = await computeReason(f.movestring, f.playedCol, { solver });
    rows.push({
      ...evidence,
      expectedCase: f.expectedCase,
      expectedGate: f.expectedGate ?? null,
      expectedExhaustive: f.expectedExhaustive ?? null,
      bucket: f.bucket ?? null,
      caseMatches: evidence.case === f.expectedCase,
    });
  }
} finally {
  solver.destroy();
}

writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const mism = rows.filter((r) => !r.caseMatches).length;
console.log(`wrote ${rows.length} evidence rows to ${OUT}`);
console.log(`case mismatches vs fixture ground truth: ${mism}`);
