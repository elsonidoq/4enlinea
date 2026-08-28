import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';
import { composeOpeningFrame } from '../scripts/reason_engine/openingFrame.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');

test('every corpus record renders with zero uncovered fields and a classified link', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(rows.length >= 25, `expected the 29-record corpus, got ${rows.length}`);
  const failures = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    try {
      const m = buildReasonRenderModel(toNarratorVector(row.evidence));
      assert.ok(m.link.id, `${row.id}: no link`);
    } catch (e) {
      failures.push(`${row.id}: ${e.message}`);
    }
  }
  assert.deepEqual(failures, [], `render failures:\n${failures.join('\n')}`);
});

// T041 (spec 058, US3/AC3, SC-004): required ⊆ offered for every corpus record that renders.
// deriveRequiredSet's own match-and-drop step (data-model.md §2: "A half with neither a resolvable
// cell nor a window yields no entry") should make this hold by construction — a failure here is a
// real regression in that step, not a fixture problem. Coordinator's own measurement on this exact
// 29-record corpus: 0 violations.
test('T041: every requiredSet[].spec is present among zones.aliases[].spec (required ⊆ offered)', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const violations = [];
  let rendered = 0;
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    let m;
    try {
      m = buildReasonRenderModel(toNarratorVector(row.evidence));
    } catch {
      continue; // covered by the render-failure test above
    }
    rendered += 1;
    const offeredSpecs = new Set((m.zones?.aliases ?? []).map((a) => a.spec));
    for (const group of m.requiredSet ?? []) {
      if (!offeredSpecs.has(group.spec)) {
        violations.push(`${row.id}: required spec "${group.spec}" not in offered aliases`);
      }
    }
  }
  assert.ok(rendered > 0, 'expected at least one corpus record to render');
  assert.deepEqual(violations, [], `required-not-offered violations:\n${violations.join('\n')}`);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// T039 (FR-014/015/020/021/022/023/024/025) — corpus-wide (63-record) parametric sweeps over the
// WHOLE offer set. FR-015/020/021/022/023/024/025 already have dedicated corpus-wide sweeps in
// zoneAnnotations.test.mjs (T035), causalLinks.test.mjs (T036) and openingFrame.test.mjs (T037) —
// those are not duplicated here. The two gaps this file closes:
//   1. FR-014a's existing sweep (causalLinks.test.mjs) is scoped to L1/L2/L3/L4/L8 only (that was
//      T022's own scope). B1 (this batch) fixed the remaining L5/L6/L9 producers too — this is the
//      first sweep asserting FR-014's full "neither link.text NOR zones.aliases[].role, for ANY
//      link id" claim over the entire 63-record corpus.
//   2. B3 (reading-key/guardrail consistency for "centrality") has no corpus-wide sweep anywhere
//      yet — only a single named-record test (renderReasonModel.test.mjs, eval-11). Added here per
//      the B3 handoff instruction to extend T039's (or T037's) corpus sweep.
// ══════════════════════════════════════════════════════════════════════════════════════════════

const CNRM_RE = /\bc\d+r\d+\b/;

test('FR-014 corpus-wide (ALL link ids, SC-011): link.text and zones.aliases[].role never carry a raw cNrM coordinate', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const violations = [];
  let checked = 0;
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    let model;
    try { model = buildReasonRenderModel(toNarratorVector(row.evidence)); } catch { continue; }
    checked += 1;
    for (const f of model.frames) {
      if (CNRM_RE.test(f.text)) violations.push(`${row.id} (frame ${f.id}): link.text="${f.text}"`);
    }
    for (const a of model.zones.aliases ?? []) {
      if (CNRM_RE.test(a.role)) violations.push(`${row.id}: alias ${a.handle} role="${a.role}"`);
    }
  }
  assert.ok(checked >= 60, `expected the full ~63-record corpus, checked ${checked}`);
  assert.deepEqual(violations, [], `FR-014 raw-coordinate violations:\n${violations.join('\n')}`);
});

// B3 (same class as OI-199/T029, FR-020/SC-012): the opening reading key must agree with its own
// record's guardrail on whether "centrality" is an admissible framing — a record whose guardrail
// drops "centrality" (centrality clause suppressed) must never have "centrality" appear in its own
// openingReadingKey text either.
test('B3 corpus-wide (FR-020/SC-012): openingReadingKey never states "centrality" when the guardrail itself drops it', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const violations = [];
  let checkedOpening = 0;
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const nv = toNarratorVector(row.evidence);
    const frame = composeOpeningFrame(nv);
    if (!frame) continue;
    checkedOpening += 1;
    let model;
    try { model = buildReasonRenderModel(nv); } catch { continue; }
    const guardrailOffersCentrality = /centrality/i.test(frame.guardrail);
    const readingKeyOffersCentrality = /centrality/i.test(model.openingReadingKey ?? '');
    if (readingKeyOffersCentrality && !guardrailOffersCentrality) {
      violations.push(`${row.id}: openingReadingKey mentions "centrality" but the guardrail does not offer it`);
    }
  }
  assert.ok(checkedOpening > 0, 'expected at least one opening-frame corpus record');
  assert.deepEqual(violations, [], `B3 reading-key/guardrail centrality mismatches:\n${violations.join('\n')}`);
});
