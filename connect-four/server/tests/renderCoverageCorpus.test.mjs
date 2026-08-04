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
