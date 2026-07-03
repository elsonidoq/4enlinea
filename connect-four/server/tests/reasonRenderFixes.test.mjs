import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildPromptForCondition } from '../scripts/compute.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const dPrompt = (id) => buildPromptForCondition('GLOSSARY', toNarratorVector(rows.find((r) => r.id === id).evidence), 'D');

test('eval-3: the deep fork is framed as deep, never as a near-term threat', () => {
  const p = dPrompt('eval-3');
  assert.match(p, /causal link L5/);
  // Scope the horizon checks to the composed reason (frame text + guardrail), between the reason
  // heading and the reading key — the generic reading key legitimately quotes both "deep on a forced
  // line" and "not a current threat", so asserting on the whole prompt would be meaningless.
  const reason = p.split('# Why this move was a blunder')[1].split('# Reading key')[0];
  assert.match(reason, /deep on a forced line/);   // the FRAME frames it deep
  assert.match(reason, /c4r3/);                     // fork completing cell named in the reason
  assert.doesNotMatch(reason, /immediate threat|current threat|right now/i);
});

test('eval-23: routes to L3 and forbids the causation claim', () => {
  const p = dPrompt('eval-23');
  assert.match(p, /causal link L3/);
  assert.match(p, /does not create it/i);
  assert.match(p, /do not say your move caused/i);
});
