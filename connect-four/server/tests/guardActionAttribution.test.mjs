// Spec 059 (Deep-Reveal Remediation, Epic 12), US1 / T010.
//
// Asserts the T008 code -> open-issue mapping table (`GUARD_FAILURE_CODE_TO_OI`,
// `attributeGuardFailureCode`, both in `compute.mjs`) covers every guard-action failure code that
// `guardDiagnostics.failures` actually surfaces across the recorded 125-row run, and that the
// four named issues (OI-140 ordering, OI-172 `P5strong:cell_not_allowed`, OI-170 `P5strong:tg`,
// OI-208 `unclosed_tag` repair placement) are attributed to their own OI rather than being folded
// into a generic OI-194 (raw-coordinate) count.
//
// No LLM call — replays the already-recorded corpus file through the real
// `computeServedExplanation` path (same fixture T009 uses) and inspects the failure codes it
// actually surfaces.
//
// Does NOT edit docs/open_issues.md — that half of T008 (updating the four issues' entries with an
// "attributed, not fixed" note) belongs to a later batch (per this batch's hard constraints).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  computeServedExplanation,
  GUARD_FAILURE_CODE_TO_OI,
  attributeGuardFailureCode,
} from '../scripts/compute.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(
  __dirname,
  '../scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl',
);

function loadCorpusRows() {
  const lines = readFileSync(CORPUS_PATH, 'utf8').trim().split('\n');
  return lines.map((l) => JSON.parse(l));
}

describe('code -> open-issue attribution table (T010 / T008)', () => {
  it('statically names OI-140, OI-172, OI-170, and OI-208 in the mapping table', () => {
    const attributedIssues = new Set(Object.values(GUARD_FAILURE_CODE_TO_OI));
    for (const oi of ['OI-140', 'OI-172', 'OI-170', 'OI-208']) {
      assert.ok(attributedIssues.has(oi), `expected the mapping table to attribute some code to ${oi}`);
    }
  });

  it('P6 (the ordering defect) attributes to OI-140, P5strong:cell_not_allowed to OI-172, P5strong:tg to OI-170', () => {
    assert.equal(attributeGuardFailureCode('P6:raw_coordinate:future:c6r2'), 'OI-140');
    assert.equal(attributeGuardFailureCode('P5strong:cell_not_allowed:c4r3'), 'OI-172');
    assert.equal(attributeGuardFailureCode('P5strong:tg'), 'OI-170');
  });

  it('every guard-action failure code that actually appears across the recorded 125-row run is covered by the table (no silent OI-194 fold-in)', () => {
    const rows = loadCorpusRows();
    assert.equal(rows.length, 125);

    const observedCodes = new Set();
    for (const row of rows) {
      const { guardDiagnostics } = computeServedExplanation(
        row.answer?.mechanism,
        row.render_decision,
        row.feature_vector?.movestring,
      );
      for (const f of guardDiagnostics?.failures ?? []) observedCodes.add(f);
    }

    assert.ok(observedCodes.size > 0, 'expected at least one guard failure to be observed in the recorded run (the known 5 P6 span losses)');

    const uncovered = [];
    for (const code of observedCodes) {
      if (attributeGuardFailureCode(code) == null) uncovered.push(code);
    }
    assert.deepEqual(uncovered, [], `every observed guard-action failure code must be attributed to an OI, got uncovered: ${uncovered.join(', ')}`);

    // The specific, harvested case: every observed failure in this run is a P6 ordering failure,
    // and every one of them attributes to OI-140, not a generic/OI-194 bucket.
    for (const code of observedCodes) {
      if (code.startsWith('P6:')) {
        assert.equal(attributeGuardFailureCode(code), 'OI-140', `P6 failure ${code} must attribute to OI-140, not fold into OI-194`);
      }
    }
  });
});
