// Spec 059 (Deep-Reveal Remediation, Epic 12), US1 / T009.
//
// Regression fixture for FR-001/FR-002/SC-001: replays the already-recorded 125-row run
// (`fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl`) through `compute.mjs`'s new
// `computeServedExplanation` post-guard path and asserts the HARVESTED counts. No model call —
// this only reads a checked-in JSONL file and calls the real, already-recorded-answer-driven
// guard path.
//
// (a) asserts the post-guard path imports and calls the real `guardExplainMoveLlmPayload` symbol,
//     not a reimplementation.
// (b) replays the recorded run and asserts: 0 raw `cNrM` tokens in served prose (zone/term tags
//     stripped first) across all 125 rows, and exactly 5 runs lose >=1 `[zone:...]` span.
//
// These figures were computed by actually running `computeServedExplanation` against the real
// recorded file in this session (not hand-written) — see the handoff notes in
// specs/059-deep-reveal-remediation for the exact command. If a future change to the guard or the
// corpus changes these counts, that is a finding to report, not a fixture to quietly update.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeServedExplanation } from '../scripts/compute.mjs';
import * as reasonRenderGuard from '../reasonRenderGuard.mjs';
import { Board } from '../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(
  __dirname,
  '../scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl',
);

// Word-bounded raw internal coordinate token — same shape reasonRenderGuard.mjs's CXRY_RE targets
// (the classifier's own `c${col+1}r${row+1}` 1-indexed cell string).
const CXRY_RE = /\bc\d+r\d+\b/i;

function stripAnnotationTags(text) {
  // Strip [zone:...]/[/zone:...] and [term:...]/[/term:...] wrapper delimiters, keeping inner
  // text — mirrors how a player actually reads the served string (the delimiters themselves are
  // never rendered; `stripAnnotationsForTTS` in production does the same class of strip).
  return text
    .replace(/\[\/?zone:[^\]]*\]/gi, '')
    .replace(/\[\/?term:[^\]]*\]/gi, '');
}

function loadCorpusRows() {
  const lines = readFileSync(CORPUS_PATH, 'utf8').trim().split('\n');
  return lines.map((l) => JSON.parse(l));
}

describe('compute.mjs post-guard served-explanation path (T009)', () => {
  it('compute.mjs imports guardExplainMoveLlmPayload/toAllowedSet from reasonRenderGuard.mjs (static source check)', () => {
    const computeSrc = readFileSync(join(__dirname, '../scripts/compute.mjs'), 'utf8');
    assert.match(
      computeSrc,
      /import\s*\{[^}]*\bguardExplainMoveLlmPayload\b[^}]*\}\s*from\s*['"]\.\.\/reasonRenderGuard\.mjs['"]/,
      'compute.mjs must import the real guardExplainMoveLlmPayload symbol from reasonRenderGuard.mjs, not reimplement it',
    );
    assert.match(
      computeSrc,
      /import\s*\{[^}]*\btoAllowedSet\b[^}]*\}\s*from\s*['"]\.\.\/reasonRenderGuard\.mjs['"]/,
      'compute.mjs must import the real toAllowedSet symbol from reasonRenderGuard.mjs',
    );
    // No inline reimplementation: compute.mjs's own source never defines a local
    // guardExplainMoveLlmPayload/stripFailingZoneSpans-shaped function.
    assert.doesNotMatch(computeSrc, /function\s+guardExplainMoveLlmPayload/);
  });

  it('computeServedExplanation actually calls the imported guardExplainMoveLlmPayload symbol and returns its output verbatim', () => {
    const rows = loadCorpusRows();
    const row = rows.find((r) => r.render_decision?.zones && typeof r.answer?.mechanism === 'string');
    assert.ok(row, 'expected at least one row with a render_decision and a mechanism to test against');

    const direct = reasonRenderGuard.guardExplainMoveLlmPayload({
      explanation: row.answer.mechanism,
      prompt: '',
      terms: {},
      board: new Board(row.feature_vector.movestring),
      allowedSet: reasonRenderGuard.toAllowedSet(row.render_decision.zones.aliases),
      diagnostics: true,
    });

    const { servedExplanation, guardDiagnostics } = computeServedExplanation(
      row.answer.mechanism,
      row.render_decision,
      row.feature_vector.movestring,
    );
    assert.equal(servedExplanation, direct.explanation, 'computeServedExplanation must return the guard\'s own output, not a reimplementation');
    assert.deepEqual(guardDiagnostics, direct.diagnostics);
  });

  it('replaying the recorded 125-row run: 0 raw cNrM tokens served, exactly 5 runs lose a span (SC-001)', () => {
    const rows = loadCorpusRows();
    assert.equal(rows.length, 125, 'the recorded corpus file is expected to carry exactly 125 rows');

    let rawTokenRows = 0;
    let spanLossRows = 0;

    for (const row of rows) {
      const { servedExplanation, guardDiagnostics } = computeServedExplanation(
        row.answer?.mechanism,
        row.render_decision,
        row.feature_vector?.movestring,
      );
      if (servedExplanation == null) continue; // no board/zones to guard against on this row
      const stripped = stripAnnotationTags(servedExplanation);
      if (CXRY_RE.test(stripped)) rawTokenRows++;
      if (guardDiagnostics?.strippedSpecs?.length > 0) spanLossRows++;
    }

    assert.equal(rawTokenRows, 0, 'raw cNrM tokens must never reach served prose (tags stripped)');
    assert.equal(spanLossRows, 5, 'exactly 5 of 125 runs are expected to lose >=1 zone span to the guard');
  });
});
