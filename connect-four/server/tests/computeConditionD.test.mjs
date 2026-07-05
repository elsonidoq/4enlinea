import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptForCondition } from '../scripts/compute.mjs';

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
