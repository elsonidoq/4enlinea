import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildRenderDecision } from '../scripts/renderReasonModel.mjs';
import { renderDecisionPredicates, RENDER_REQUIRED, RENDER_PROVISIONAL } from '../scripts/renderUniverse.mjs';

// Reads the pre-computed evidence for the committed P4 coverage board set (materialized once via
// compute.mjs), pushes each record through the render pipeline, and asserts every REQUIRED render
// predicate is exercised >=1. Solver-free (evidence is stored) — mirrors renderCoverageCorpus.test.mjs.
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl');

test('the committed P4 coverage set exercises every REQUIRED render predicate', () => {
  const rows = readFileSync(EVIDENCE_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const hit = new Set();
  for (const r of rows) {
    if (!r.evidence || r.evidence.notABlunder || !r.evidence.case) continue;
    let rd;
    try { rd = buildRenderDecision(toNarratorVector(r.evidence)); } catch { continue; }
    for (const p of renderDecisionPredicates(rd)) hit.add(p);
  }
  const missingRequired = RENDER_REQUIRED.filter((p) => !hit.has(p));
  const missingProvisional = [...RENDER_PROVISIONAL].filter((p) => !hit.has(p));
  if (missingProvisional.length) {
    console.log(`PROVISIONAL render predicates not covered (non-blocking): ${missingProvisional.join(', ')}`);
  }
  assert.deepEqual(missingRequired, [], `uncovered REQUIRED render predicates: ${missingRequired.join(', ')}`);
});
