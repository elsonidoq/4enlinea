import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
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
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  assert.match(link.text, /c2r1/);                        // your completing cell
  assert.match(link.text, /c3r1/);                        // opponent denial cell
});

test('L2 (eval-21): played move handed the opponent the pattern', () => {
  const { link } = classifyById('eval-21');
  assert.equal(link.id, 'L2');
  assert.match(link.text, /let the opponent occupy c2r1/);
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  assert.match(link.text, /better move \(col 3\)/);       // bestCol 2 -> display 3
});

test('L3 (eval-23): no-causation, hold-the-line wording; names the branch-invariant pattern', () => {
  const { link } = classifyById('eval-23');
  assert.equal(link.id, 'L3');
  assert.match(link.text, /7-shaped double threat/);      // figure_7 slug -> plain C4 phrase
  assert.match(link.text, /c4r3/);
  assert.match(link.text, /didn't create it/i);           // no causation, player-facing
  assert.match(link.text, /work hardest|speeds up the finish/i);
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);  // A5b: no defeatist framing
  assert.match(link.guardrail, /caused or enabled/i);     // causation guardrail preserved (not in player text)
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

test('L7 (eval-8): practical swindle framed as toughest defense, no defeatist wording', () => {
  const { link } = classifyById('eval-8');
  assert.equal(link.id, 'L7');
  assert.match(link.text, /practical swindle/i);
  assert.match(link.text, /stubborn defense|most resilient|toughest/i);   // hold-the-line reframe
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);    // A5b: no defeatist framing
  assert.doesNotMatch(link.text, /you (would )?win\b/i);   // must not claim a win
});

test('L8 (eval-2): a draw abandoned; opponent now has a forced win', () => {
  const { link } = classifyById('eval-2');
  assert.equal(link.id, 'L8');
  assert.match(link.text, /position was a draw/i);
  assert.match(link.text, /occupying c4r4/);
  assert.match(link.text, /forced win/i);
});

test('L9 (eval-13): hedged parity, culprit not isolable', () => {
  const { link } = classifyById('eval-13');
  assert.equal(link.id, 'L9');
  assert.match(link.text, /parity/i);
  assert.match(link.text, /isn't cleanly isolable/i);
  assert.doesNotMatch(link.text, /the culprit is c\d+r\d+/i);  // must NOT fabricate a crisp cause
});
