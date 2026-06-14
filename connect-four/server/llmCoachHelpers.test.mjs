// connect-four/server/llmCoachHelpers.test.mjs
// Run with: node --test connect-four/server/llmCoachHelpers.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlunderExplainPrompt } from './llmCoachHelpers.js';

const BASE = {
  tag: 'drawing_move',
  direction: 'missed_own',
  humanReason: 'You had a forced win available — the position was winning — but this move settled for a draw.',
  positiveReason: null,
  correctMovePatterns: new Map(),
  boardViz: 'before board',
  postBoardViz: 'after board',
  playerName: 'Green',
  gap: 5,
  gapBucket: 'moderate',
  allowedSet: null,
  playedCol: 3,  // 0-indexed → column 4 in display
};

describe('buildBlunderExplainPrompt — H1: move location is explicit', () => {
  it('includes the played column number in Move context', () => {
    const prompt = buildBlunderExplainPrompt(BASE);
    assert.match(prompt, /Move played.*column 4/i);
  });
});

describe('buildBlunderExplainPrompt — H1: annotation cells are labelled as reference points', () => {
  it('grounding section header says NOT where the move was played', () => {
    const prompt = buildBlunderExplainPrompt({
      ...BASE,
      allowedSet: [{ cells: ['c3r3'] }],
    });
    assert.match(prompt, /NOT where the move was played/i);
  });

  it('header does not say "Allowed annotation cells" (old, confusing name)', () => {
    const prompt = buildBlunderExplainPrompt({
      ...BASE,
      allowedSet: [{ cells: ['c3r3'] }],
    });
    assert.doesNotMatch(prompt, /Allowed annotation cells/);
  });
});

describe('buildBlunderExplainPrompt — H2: null allowedSet allows column references', () => {
  it('null allowedSet rule clarifies columns 1–7 are always referenceable', () => {
    const prompt = buildBlunderExplainPrompt(BASE);  // allowedSet: null
    assert.match(prompt, /[Cc]olumn numbers? \(1[–-]7\) are always valid/);
  });

  it('null allowedSet rule does not say "Do not reference specific cells or columns"', () => {
    const prompt = buildBlunderExplainPrompt(BASE);
    assert.doesNotMatch(prompt, /Do not reference specific cells or columns/);
  });
});
