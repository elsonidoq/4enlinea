import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptForCondition, postprocessAnswer } from '../scripts/compute.mjs';

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('condition D produces the grounded prompt (board + causal link), not the glossary+JSON dump', () => {
  const prompt = buildPromptForCondition('GLOSSARY-TEXT', NV, 'D');
  assert.match(prompt, /# Board/);
  assert.match(prompt, /causal link L6/);
  assert.match(prompt, /forced win via c6r5/);   // composed frame text (P3, NV's actual completingCell)
  assert.match(prompt, /# Reading key/);          // reading key present (P3)
  assert.doesNotMatch(prompt, /GLOSSARY-TEXT/); // D does not prepend the 607-line glossary
  // The output-contract must be appended so D answers are gradeable (final-review Fix 1).
  assert.match(prompt, /better_move/);
  assert.match(prompt, /"mechanism"/);
  assert.match(prompt, /key_cells/);
});

test('condition A is unchanged (glossary + JSON)', () => {
  const prompt = buildPromptForCondition('GLOSSARY-TEXT', NV, 'A');
  assert.match(prompt, /GLOSSARY-TEXT/);
  assert.match(prompt, /# Feature vector/);
});

test('postprocessAnswer expands handles + rederives key_cells only when a zone was emitted, and surfaces repairs', () => {
  const rd = { zones: { aliases: [{ handle: 'better-col', spec: 'col3', role: 'x', truthBoard: 'decision', kbId: null }],
                        terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'double threat', description: 'x' }] } };
  // a zone WAS emitted -> mechanism expanded, key_cells re-derived from the spec
  const withZone = postprocessAnswer({ mechanism: 'play [zone:better-col]column 3[/zone:better-col]', key_cells: ['c9r9'] }, rd);
  assert.match(withZone.answer.mechanism, /\[zone:col3\]column 3\[\/zone:col3\]/);
  assert.deepEqual(withZone.answer.key_cells, ['c3r1', 'c3r2', 'c3r3', 'c3r4', 'c3r5', 'c3r6']); // col3 expanded
  assert.deepEqual(withZone.repairs, []);
  assert.deepEqual(withZone.usedSpecs, ['col3']); // data-model.md §2 hop 2 — usedSpecs surfaced
  // NO zone emitted -> key_cells preserved (transition safety, M4): don't zero the model's cells
  // before it is prompted to emit handles
  const noZone = postprocessAnswer({ mechanism: 'just prose', key_cells: ['c1r1'] }, rd);
  assert.deepEqual(noZone.answer.key_cells, ['c1r1']);
  assert.deepEqual(noZone.repairs, []);
  assert.deepEqual(noZone.usedSpecs, []);
  // an unclosed offered term is bare-stripped and surfaced in repairs
  const withUnclosed = postprocessAnswer({ mechanism: 'the [term:double_threat] on c2', key_cells: [] }, rd);
  assert.doesNotMatch(withUnclosed.answer.mechanism, /\[term:/);
  assert.deepEqual(withUnclosed.repairs, ['unclosed_tag:term:double_threat']);
  assert.deepEqual(withUnclosed.usedSpecs, []);
  // no-op paths (early-return branch) — usedSpecs: [] per data-model.md §2 hop 2's explicit spec
  const same = { mechanism: 'x', key_cells: ['c1r1'] };
  assert.deepEqual(postprocessAnswer(same, null), { answer: same, repairs: [], usedSpecs: [] });
  assert.deepEqual(postprocessAnswer(null, rd), { answer: null, repairs: [], usedSpecs: [] });
});

test('sentence budget is interpolated into the mechanism schema line', async () => {
  const { answerSchemaBlock } = await import('../scripts/compute.mjs');
  assert.match(answerSchemaBlock('1-3'), /<1-3 sentences spoken directly to the player/);
  assert.match(answerSchemaBlock('4-6'), /<4-6 sentences spoken directly to the player/);
  // the rest of the contract must not drift with the budget
  assert.match(answerSchemaBlock('4-6'), /NO internal\/field\/engine terms/);
});
