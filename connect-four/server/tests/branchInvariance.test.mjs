import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const pv = (id) => pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));

test('computation: pattern NOT on after-best for genuinely-causal L2 records', () => {
  for (const id of ['eval-17', 'eval-21']) assert.equal(patternOnAfterBestBoard(pv(id)), false, id);
});

test('computation: pattern IS on after-best for L3 records', () => {
  for (const id of ['eval-18', 'eval-19', 'eval-20', 'eval-23']) assert.equal(patternOnAfterBestBoard(pv(id)), true, id);
});

// D30 (supersedes D28 sub-decision 3): patternOnAfterBestBoard is a GEOMETRIC fact and is retired as
// the L2/L3 discriminator. L3 asserts an OUTCOME ("both moves lose") and now fires ONLY on
// lose_to_faster_lose; a win_to_lose enabled_opponent case stays L2 even when the opponent pattern
// happens to sit on the after-best board (the eval-53 misroute this fix closes). The computation above
// is still exercised — it remains informational in render_decision — but it no longer routes.
test('routing (D30): win_to_lose enabled_opponent stays L2 regardless of patternOnAfterBestBoard', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L2');
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

test('routing (D30): lose_to_faster_lose enabled_opponent routes to L3 (both moves lose)', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L3');
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L3');
});

test('integration: eval-23 routes to L3 through buildReasonRenderModel', () => {
  const m = buildReasonRenderModel(toNarratorVector(rows.find((r) => r.id === 'eval-23').evidence));
  assert.equal(m.link.id, 'L3');
});

test('integration: eval-21 routes to L2 (pattern absent on after-best)', () => {
  const m = buildReasonRenderModel(toNarratorVector(rows.find((r) => r.id === 'eval-21').evidence));
  assert.equal(m.link.id, 'L2');
});
