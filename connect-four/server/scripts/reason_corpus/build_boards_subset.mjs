// Builds boards_subset.jsonl — the FROZEN 25-board evaluation subset.
//
// Frozen against the 2026-08-06 grading run (fv_suff_answers_boards_2026-08-06T16-04-29Z_grades.jsonl).
// Chosen by set-cover over the strata the render remediation changes, NOT by sampling, so each fix has
// its own measurable stratum. DO NOT regenerate this list from a later grading run: re-selecting on
// post-fix outcomes would destroy the meaning of the passing-case controls.
//
// Strata covered (count in subset / count in the full 63):
//   passing controls (regression guard)          5 / 5   <- ALL of them, deliberately
//   A7 deterministic x opening  (opening merge)  9 / 20
//   A7 deterministic x mid/late (control)        4 / 9
//   A6 deterministic x column ABSENT (L5/L6/L9)  4 / 8
//   A6 deterministic x column parenthetical      4 / 4
//   A6 flaky x column prose (salience control)   4 / 7
//   fork cases (A7c pivot)                       5 / 19
//   render_bug triage                            4 / 17
//   G5/G7 board-truth + annotation               6 / 21
//   A4 flaky (fabrication variance)              5 / 15
//   plus >= 2 cases for every causal link L1-L9
//
// Usage (from connect-four/):  node server/scripts/reason_corpus/build_boards_subset.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const SUBSET_IDS = [
  // passing controls
  'eval-2', 'eval-33', 'eval-37', 'pin-branch-invariance-true-1', 'pin-branch-invariance-true-2',
  // L1 (parenthetical column, A6 deterministic)
  'eval-34', 'eval-41', 'eval-47', 'eval-50',
  // L2
  'pin-L2-enabled-opponent',
  // L4
  'eval-32', 'eval-39',
  // L5 (column absent)
  'eval-9', 'eval-16', 'pin-L5-deep-fork',
  // L6 (column absent, opening, forks)
  'eval-11', 'eval-20',
  // L7 (prose column, opening)
  'eval-5', 'eval-6', 'eval-13', 'eval-21',
  // L8
  'eval-36', 'eval-38',
  // L9 (column absent)
  'eval-35', 'pin-L9-hedged-parity',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = join(__dirname, 'boards.jsonl');
const OUT = join(__dirname, 'boards_subset.jsonl');

export function buildSubset(rows, ids = SUBSET_IDS) {
  const want = new Set(ids);
  const kept = rows.filter((r) => want.has(r.id));
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) throw new Error(`ids not present in boards.jsonl: ${missing.join(', ')}`);
  return kept;                       // boards.jsonl order, rows copied verbatim
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = readFileSync(IN, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const kept = buildSubset(rows);
  writeFileSync(OUT, kept.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`wrote ${OUT} — ${kept.length} boards`);
}
