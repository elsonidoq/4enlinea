import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildRenderDecision, buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';
import { renderDecisionPredicates, RENDER_REQUIRED, RENDER_PROVISIONAL } from '../scripts/renderUniverse.mjs';
import { composeOpeningFrame } from '../scripts/reason_engine/openingFrame.mjs';

// Reads the pre-computed evidence for the committed P4 coverage board set (materialized once via
// compute.mjs), pushes each record through the render pipeline, and asserts every REQUIRED render
// predicate is exercised >=1. Solver-free (evidence is stored) — mirrors renderCoverageCorpus.test.mjs.
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');

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

// T039 (FR-014/SC-011, B3/FR-020/SC-012) — same universe of records as the coverage-predicate sweep
// above, using this file's own filtering convention (`!notABlunder && case`), asserted against the
// production render functions directly rather than the predicate abstraction.
const CNRM_RE_UNIVERSE = /\bc\d+r\d+\b/;

test('the committed P4 coverage set never leaks a raw cNrM coordinate into link.text or zones.aliases[].role (FR-014)', () => {
  const rows = readFileSync(EVIDENCE_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const violations = [];
  let checked = 0;
  for (const r of rows) {
    if (!r.evidence || r.evidence.notABlunder || !r.evidence.case) continue;
    let model;
    try { model = buildReasonRenderModel(toNarratorVector(r.evidence)); } catch { continue; }
    checked += 1;
    for (const f of model.frames) {
      if (CNRM_RE_UNIVERSE.test(f.text)) violations.push(`${r.id} (frame ${f.id}): "${f.text}"`);
    }
    for (const a of model.zones.aliases ?? []) {
      if (CNRM_RE_UNIVERSE.test(a.role)) violations.push(`${r.id}: alias ${a.handle} role="${a.role}"`);
    }
  }
  assert.ok(checked > 0, 'expected at least one record to check');
  assert.deepEqual(violations, [], `FR-014 violations:\n${violations.join('\n')}`);
});

test('the committed P4 coverage set never states "centrality" in openingReadingKey when its own guardrail drops it (B3, FR-020/SC-012)', () => {
  const rows = readFileSync(EVIDENCE_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const violations = [];
  let checkedOpening = 0;
  for (const r of rows) {
    if (!r.evidence || r.evidence.notABlunder || !r.evidence.case) continue;
    const nv = toNarratorVector(r.evidence);
    const frame = composeOpeningFrame(nv);
    if (!frame) continue;
    checkedOpening += 1;
    let model;
    try { model = buildReasonRenderModel(nv); } catch { continue; }
    const guardrailOffersCentrality = /centrality/i.test(frame.guardrail);
    const readingKeyOffersCentrality = /centrality/i.test(model.openingReadingKey ?? '');
    if (readingKeyOffersCentrality && !guardrailOffersCentrality) {
      violations.push(`${r.id}: openingReadingKey mentions "centrality" but the guardrail does not offer it`);
    }
  }
  assert.ok(checkedOpening > 0, 'expected at least one opening-frame record');
  assert.deepEqual(violations, [], `B3 violations:\n${violations.join('\n')}`);
});
