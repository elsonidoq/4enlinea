import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlunderExplainPrompt } from '../server/llmCoachHelpers.js';

test('buildBlunderExplainPrompt includes look-ahead section when provided', () => {
  const prompt = buildBlunderExplainPrompt({
    tag: 'suboptimal_move', direction: 'missed_own', humanReason: 'A stronger move was available.',
    positiveReason: null, correctMovePatterns: new Map(),
    boardViz: 'B', bestMoveBoardViz: 'B2', postBoardViz: 'B3',
    playerName: 'Green', gap: 2, gapBucket: 'small', allowedSet: null,
    playedCol: 4, contrastCol: 3,
    lookaheadSection: '## What the better move leads to\n\nIf your opponent slips, [zone:future-double_threat-1]a double threat[/zone:future-double_threat-1] becomes available.',
  });
  assert.ok(prompt.includes('## What the better move leads to'));
  assert.ok(prompt.includes('[zone:future-double_threat-1]'));
  // Ordering: after threat comparison region, before best-move evidence (which is absent here).
  assert.ok(prompt.indexOf('## What the better move leads to') < prompt.indexOf('## Hard grounding rules'));
});
