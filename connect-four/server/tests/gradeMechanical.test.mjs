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

test('A6 grades mechanism_pre_repair, not the (now-repaired) answer.mechanism', () => {
  // Task 4's repair overwrites answer.mechanism with a sentence naming the column — if A6 graded
  // THAT field it would read a constant 'pass' on every --retry run and stop measuring anything.
  // mechanism_pre_repair carries the column-less text the model actually produced; A6 must fail on it
  // even though answer.mechanism (post-repair) now names the column.
  const r = row({
    mechanism_pre_repair: 'You gave up the tempo with that drop.',   // no column named
    answer: { ...row().answer, mechanism: 'You gave up the tempo with that drop. Column 4 was better.' },
  });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});

test('A6 falls back to answer.mechanism when mechanism_pre_repair is absent (no-retry / pre-D63 rows)', () => {
  // A row from a run without --retry, or from before this field existed, has no mechanism_pre_repair
  // at all — A6 must behave exactly as it did before this task, reading answer.mechanism.
  const r = row();       // base fixture: answer.mechanism already names column 4
  assert.equal(gradeMechanicalRow(r).A6, 'pass');
});

test('M8: A6 must use ?? not || — an empty-string mechanism_pre_repair must NOT fall through to ' +
     'the repaired answer.mechanism', () => {
  // `row.mechanism_pre_repair ?? a.mechanism` is deliberate (grade_mechanical.mjs's A6 comment,
  // D63): `??` only falls through on null/undefined, so an empty string is still graded as the
  // model's own (column-less) text and A6 fails. Swapping to `||` would treat '' as falsy and grade
  // the REPAIRED answer.mechanism instead — the exact constant-pass failure D63 exists to prevent.
  // This case is unreachable from the current producer (compute.mjs never emits '' there), so this
  // is insurance against a future "simplification" collapsing `??` to `||`.
  const r = row({
    mechanism_pre_repair: '',
    answer: { ...row().answer, mechanism: 'Column 4 was better.' },   // names the column
  });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});
