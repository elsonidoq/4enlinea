#!/usr/bin/env node
// build_evidence.mjs — precompute the reason-engine evidence for every fixture board and write a
// flat JSONL the /admin/fv-suff viewer can render with NO solver in the web server.
//
// Each output row = the engine's evidence object verbatim, augmented with the fixture's ground-truth
// labels (expectedCase / expectedGate / expectedExhaustive / bucket) so the viewer can flag any
// computed-vs-expected mismatch by eye.
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/build_evidence.mjs
//     [--input <fixture.jsonl>]   # boards to compute (default: reason_fixture.jsonl beside this script)
//     [--out <name-or-path>]      # output (default: reason_evidence_all.jsonl in server/scripts/)
//
// --out: a BARE filename lands in server/scripts/ (the dir the /admin/fv-suff browser scans) and
// MUST match /^reason_evidence_[\w.-]*\.jsonl$/ to appear in its dropdown; a path with a slash is
// resolved relative to cwd (connect-four/) and used as-is. The default invocation (no flags) is
// unchanged: it reads reason_fixture.jsonl and overwrites reason_evidence_all.jsonl.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, resolve, basename } from 'path';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { loadEnv } from './lib/boardUtils.mjs';
import { computeReason } from './reasonEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../../.env'));

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

// --input: default reason_fixture.jsonl beside this script; a given path resolves from cwd.
const inputArg = argVal('--input', null);
const FIXTURE = inputArg
  ? (isAbsolute(inputArg) ? inputArg : resolve(process.cwd(), inputArg))
  : join(__dirname, 'reason_fixture.jsonl');

// --out: bare name → server/scripts/<name> (where the admin endpoint reads); path → cwd-relative.
const outArg = argVal('--out', 'reason_evidence_all.jsonl');
const OUT = outArg.includes('/')
  ? (isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg))
  : join(__dirname, '..', outArg);
if (!/^reason_evidence_[\w.-]*\.jsonl$/.test(basename(OUT))) {
  console.warn(`⚠️  "${basename(OUT)}" does not match reason_evidence_*.jsonl — it will NOT appear in the /admin/fv-suff dropdown.`);
}

const fixture = readFileSync(FIXTURE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const solver = await createSolverProcess();
const rows = [];
try {
  for (const f of fixture) {
    const evidence = await computeReason(f.movestring, f.playedCol, { solver });
    rows.push({
      ...evidence,
      expectedCase: f.expectedCase ?? null,
      expectedGate: f.expectedGate ?? null,
      expectedExhaustive: f.expectedExhaustive ?? null,
      bucket: f.bucket ?? null,
      // null when the fixture carries no ground-truth label (e.g. a hand-made / harvested fixture).
      caseMatches: f.expectedCase != null ? evidence.case === f.expectedCase : null,
    });
  }
} finally {
  solver.destroy();
}

writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const mism = rows.filter((r) => r.caseMatches === false).length;       // === false: skip unlabeled (null)
const labeled = rows.filter((r) => r.caseMatches !== null).length;
console.log(`wrote ${rows.length} evidence rows to ${OUT}`);
console.log(`case mismatches vs fixture ground truth: ${mism}${labeled < rows.length ? ` (${rows.length - labeled} rows unlabeled)` : ''}`);
