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

test('no composed frame text contains a literal "undefined"/"null" across the corpus', () => {
  const bad = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const p = buildPromptForCondition('GLOSSARY', toNarratorVector(row.evidence), 'D');
    // check only the prose half (before the JSON dump) — a template that referenced a missing
    // field would render the literal "undefined" (or "null", e.g. from a denialCell helper that
    // can return null) there.
    if (/\b(undefined|null)\b/.test(p.split('# Vector facts')[0])) bad.push(row.id);
  }
  assert.deepEqual(bad, [], `records with "undefined"/"null" in composed prose: ${bad.join(', ')}`);
});

test('no score-family key or raw movestring key leaks into any condition-D prompt', () => {
  const bad = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const p = buildPromptForCondition('GLOSSARY', toNarratorVector(row.evidence), 'D');
    // JSON keys of the scrubbed score family, or the board-transformed movestring keys.
    if (/"[^"]*[Ss]core[^"]*"\s*:/.test(p) || /"(final)?[Mm]ovestring"\s*:/i.test(p)) bad.push(row.id);
  }
  assert.deepEqual(bad, [], `records leaking score/movestring keys: ${bad.join(', ')}`);
});
