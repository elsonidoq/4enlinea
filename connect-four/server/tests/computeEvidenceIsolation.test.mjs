import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceRow } from '../scripts/compute.mjs';

// NOTE on movestrings: these tests inject a solver stub whose `query` throws, so `computeReason`
// fails before any board is reasoned about. The `movestring` field is therefore an OPAQUE input to
// a throwing dependency, never a board whose properties are asserted — the global "no hand-rolled
// movestrings" rule (about reasoned boards) does not apply. Any string that reaches the stub works.

test('buildEvidenceRow isolates a throwing engine into an error row (never throws)', async () => {
  const throwingSolver = { query: async () => { throw new Error('Invalid position'); } };
  const row = await buildEvidenceRow({ movestring: 'x', playedCol: 0, id: 'x1' }, 0, throwingSolver);
  assert.equal(row.id, 'x1');
  assert.equal(row.evidence, null);
  assert.match(row.error, /Invalid position/);
});

test('buildEvidenceRow attaches groundTruth scaffold (matches:null) on the error path when expectedCase present', async () => {
  // Pins that groundTruth is built even when the engine throws (matches stays null, not mislabeled).
  // The success path (matches set from evidence.case) is covered end-to-end by Task 12's dry run.
  const throwingSolver = { query: async () => { throw new Error('boom'); } };
  const row = await buildEvidenceRow({ movestring: 'y', playedCol: 3, expectedCase: 'win_to_draw' }, 4, throwingSolver);
  assert.deepEqual(row.groundTruth, { case: 'win_to_draw', gate: null, exhaustive: null, bucket: null, matches: null });
  assert.equal(row.error, 'boom');
});
