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

test('L3 (eval-23): no-causation wording; names the branch-invariant pattern', () => {
  const { link } = classifyById('eval-23');
  assert.equal(link.id, 'L3');
  assert.match(link.text, /already losing/i);
  assert.match(link.text, /figure_7/);
  assert.match(link.text, /c4r3/);
  assert.match(link.text, /does not create it/i);
  assert.match(link.text, /loses faster/i);
  assert.match(link.text, /do not say your move caused/i);
});

test('L4 (eval-4): missed defense; occupies the block, names the opponent window', () => {
  const { link } = classifyById('eval-4');
  assert.equal(link.id, 'L4');
  assert.match(link.text, /better move \(col 5\)/);       // bestCol 4 -> display 5
  assert.match(link.text, /occupies c5r4/);
  assert.match(link.text, /skipped that defense/i);
});

test('L6 (eval-6): gave up a win AND handed the opponent one', () => {
  const { link } = classifyById('eval-6');
  assert.equal(link.id, 'L6');
  assert.match(link.text, /forced win via c2r5/);
  assert.match(link.text, /opponent force their own win via c2r6/);
});
