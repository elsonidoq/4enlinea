import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeMechanicalRow } from '../scripts/grade_mechanical.mjs';

const FV = { bestCol: 3, playedCol: 1, case: 'win_to_draw' };          // display column 4
const ZONES = { aliases: [{ handle: 'better-col', spec: 'col4' }], terms: [] };
const row = (over = {}) => ({
  id: 'x', condition: 'D', run_index: 0, feature_vector: FV,
  render_decision: { zones: ZONES },
  answer: { better_move: 4, best_outcome: 'win', played_outcome: 'draw', mechanism: 'Column 4 was better.' },
  raw: 'Column 4 was better.', ...over,
});

test('A1 compares 1-indexed better_move against 0-indexed bestCol', () => {
  assert.equal(gradeMechanicalRow(row()).A1, 'pass');
  assert.equal(gradeMechanicalRow(row({ answer: { ...row().answer, better_move: 3 } })).A1, 'fail');
});

test('A2 derives both outcomes from feature_vector.case', () => {
  assert.equal(gradeMechanicalRow(row()).A2, 'pass');
  const wrong = row({ answer: { ...row().answer, played_outcome: 'loss' } });
  assert.equal(gradeMechanicalRow(wrong).A2, 'fail');
});

test('A6 accepts a raw coordinate the guard rewrites to "column N"', () => {
  const r = row({ answer: { ...row().answer, mechanism: 'You had to take c4r1.' } });
  assert.equal(gradeMechanicalRow(r).A6, 'pass');
});

test('A6 rejects a column that survives ONLY inside a zone handle', () => {
  const r = row({ answer: { ...row().answer, mechanism: 'Take [zone:col4]the centre[/zone:col4].' } });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});

test('A6 fails on an empty mechanism (mentionsBetterColumn abstains true; grading must not)', () => {
  const r = row({ answer: { ...row().answer, mechanism: '' } });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});

test('G7b reads raw, so an unoffered slug stripped from answer.mechanism is still caught', () => {
  const r = row({ raw: 'Play [term:central]the middle[/term:central] in [zone:better-col]column 4[/zone:better-col].' });
  const g = gradeMechanicalRow(r);
  assert.equal(g.G7b_offered, 'fail');
  assert.equal(g.G7a_offered, 'pass');        // the zone handle WAS offered
  assert.match(g.notes, /central/);
});

test('G7a/G7b pass when every emitted handle and slug was offered', () => {
  const r = row({ raw: 'Play [zone:better-col]column 4[/zone:better-col].' });
  const g = gradeMechanicalRow(r);
  assert.equal(g.G7a_offered, 'pass');
  assert.equal(g.G7b_offered, 'pass');
});
