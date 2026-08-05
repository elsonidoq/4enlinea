import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');

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
