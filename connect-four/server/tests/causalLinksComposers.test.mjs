import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
export function classifyById(id) {
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));
  const ctx = fv.direction === 'enabled_opponent' ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
  return { fv, link: classifyCausalLink(fv, ctx) };
}

test('L5 (eval-3): deep fork framed as deep, not immediate', () => {
  const { link } = classifyById('eval-3');
  assert.equal(link.id, 'L5');
  assert.match(link.text, /forced win/i);
  assert.match(link.text, /deep on a forced line/);      // horizon-honest (eval-3 fix)
  assert.match(link.text, /c4r3/);                        // fork completing cell named
  assert.match(link.text, /c6r5/);                        // opponent denial cell named
  assert.doesNotMatch(link.text, /immediate|right now|current threat/i);
});

test('L1 (eval-22): completes YOUR tactic; opponent denial named', () => {
  const { link } = classifyById('eval-22');
  assert.equal(link.id, 'L1');
  assert.match(link.text, /better move \(col 3\)/);       // bestCol 2 -> display 3
  assert.match(link.text, /double_threat/);
  assert.match(link.text, /c2r1/);                        // your completing cell
  assert.match(link.text, /c3r1/);                        // opponent denial cell
});

test('L2 (eval-21): played move handed the opponent the pattern', () => {
  const { link } = classifyById('eval-21');
  assert.equal(link.id, 'L2');
  assert.match(link.text, /let the opponent occupy c2r1/);
  assert.match(link.text, /double_threat/);
  assert.match(link.text, /better move \(col 3\)/);       // bestCol 2 -> display 3
});
