import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SUBSET_IDS } from '../scripts/reason_corpus/build_boards_subset.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/boards.jsonl');
const SUBSET = join(__dirname, '../scripts/reason_corpus/boards_subset.jsonl');
const jsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

// The 5 cases that PASSED the 2026-08-06 grading. They are the regression detector: a fix that
// breaks a currently-passing board is invisible without them.
const PASSING_CONTROLS = ['eval-2', 'eval-33', 'eval-37',
  'pin-branch-invariance-true-1', 'pin-branch-invariance-true-2'];

test('subset file exists and has exactly the frozen ids, in boards.jsonl order', () => {
  assert.ok(existsSync(SUBSET), 'boards_subset.jsonl not generated — run build_boards_subset.mjs');
  const sub = jsonl(SUBSET);
  assert.equal(sub.length, 25);
  assert.deepEqual(new Set(sub.map((r) => r.id)), new Set(SUBSET_IDS));
});

test('every subset id exists in boards.jsonl and the row is copied verbatim', () => {
  const full = new Map(jsonl(CORPUS).map((r) => [r.id, r]));
  for (const r of jsonl(SUBSET)) {
    assert.ok(full.has(r.id), `subset id ${r.id} is not in boards.jsonl`);
    assert.deepEqual(r, full.get(r.id), `row for ${r.id} diverges from boards.jsonl`);
  }
});

test('all 5 passing controls are retained', () => {
  const ids = new Set(jsonl(SUBSET).map((r) => r.id));
  for (const id of PASSING_CONTROLS) assert.ok(ids.has(id), `lost regression control ${id}`);
});

test('all 9 causal links L1-L9 are represented', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { classifyCausalLink } = await import('../scripts/reason_engine/causalLinks.mjs');
  const { patternOnAfterBestBoard } = await import('../scripts/reasonBoardSelect.mjs');
  const ev = new Map(jsonl(join(__dirname, '../scripts/reason_corpus/evidence.jsonl'))
    .map((r) => [r.id, r.evidence]));
  const seen = new Set();
  for (const r of jsonl(SUBSET)) {
    const fv = pruneVector(toNarratorVector(ev.get(r.id)));
    const ctx = fv.direction === 'enabled_opponent'
      ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
    seen.add(classifyCausalLink(fv, ctx).id);
  }
  assert.deepEqual([...seen].sort(), ['L1','L2','L3','L4','L5','L6','L7','L8','L9']);
});
