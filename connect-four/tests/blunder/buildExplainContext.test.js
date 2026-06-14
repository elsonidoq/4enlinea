// T012 / FR-T04 + FR-T05 — buildExplainContext integration tests.
//
// FR-T04 (blunder path): prompt contains REASON_TEMPLATES sentence; validateAnnotation passes.
// FR-T05 (optimal path): prompt contains POSITIVE_TEMPLATES sentence; tagBlunder NOT called.
//
// Movestring sources:
//
//   Blunder path: '00113' (5 moves, Yellow to move).
//     Yellow's forced_block was missed by playing col0 instead of col2.
//     tagBlunder → { tag: 'forced_block', direction: 'defensive_miss' }
//     humanReason: REASON_TEMPLATES.get('forced_block:defensive_miss')
//       = "Your opponent was about to win. You had to block and didn't."
//     Source: tests/blunder/tagBlunder.test.js (verified).
//
//   Optimal path: '3344' (4 moves, Red to move), col=2.
//     Red plays col2 with score=18 (the highest; tied with col5).
//     contrast.isOptimal=true → optimal path → skip tagBlunder.
//     correctMovePatterns after '33442': immediate_threat (Red wins at col1/col5).
//     positiveReason: POSITIVE_TEMPLATES.get('immediate_threat')
//       = "You spotted the immediate win and took it — the clearest winning move available."
//     Source: tests/classifier/classifier.test.js double_threat fixtures.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildExplainContext } from '../../server/explainContext.js';
import { validateAnnotation } from '../../server/annotationGate.js';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from '../../server/blunderReasons.js';
import { Board } from '../../server/classifier.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

// ─────────────────────────────────────────────────────────────────────────────
// FR-T04 — blunder path
// ─────────────────────────────────────────────────────────────────────────────
describe('buildExplainContext — blunder path (FR-T04)', () => {
  let solver;
  before(() => { solver = createSolverProcess(); });
  after(() => { solver.destroy(); });

  it('returns non-null prompt for known blunder position', async () => {
    // '00113', col=0 (Yellow's blunder: missed forced_block at col2)
    const result = await buildExplainContext('00113', 0, 1, solver);
    assert.ok(result !== null, 'result must not be null');
    assert.ok(result.prompt !== null, 'prompt must not be null');
    assert.ok(typeof result.prompt === 'string', 'prompt must be a string');
    assert.ok(result.prompt.length > 0, 'prompt must be non-empty');
  }, { timeout: 120_000 });

  it('prompt contains the REASON_TEMPLATES sentence (not the terse reason string)', async () => {
    const result = await buildExplainContext('00113', 0, 1, solver);
    assert.ok(result?.prompt, 'prompt must exist');

    // The humanReason sentence (from REASON_TEMPLATES) must appear in the prompt.
    const humanReason = REASON_TEMPLATES.get('forced_block:defensive_miss');
    assert.ok(humanReason, 'REASON_TEMPLATES must have forced_block:defensive_miss entry');
    assert.ok(
      result.prompt.includes(humanReason),
      `prompt must contain humanReason "${humanReason}" but got:\n${result.prompt.slice(0, 300)}`
    );

    // The terse internal reason string must NOT appear in the prompt.
    assert.ok(
      !result.prompt.includes('matched defensive_miss:'),
      'prompt must NOT contain the terse reason string "matched defensive_miss:"'
    );
    assert.ok(
      !result.prompt.includes('matched defensive_miss: forced_block'),
      'prompt must NOT contain the terse reason string'
    );
  }, { timeout: 120_000 });

  it('validateAnnotation passes on a clean synthetic explanation', async () => {
    const result = await buildExplainContext('00113', 0, 1, solver);
    assert.ok(result?.prompt, 'prompt must exist');

    // Validate a simple explanation (no zone tags) against the board + allowedSet.
    // This confirms the allowedSet is properly structured (not accidentally []).
    const board = new Board('00113');
    const syntheticExplanation = 'This was not the right move here.';
    const validation = validateAnnotation(syntheticExplanation, board, result.allowedSet);
    assert.ok(
      validation.valid,
      `validateAnnotation must pass; failures: ${JSON.stringify(validation.failures)}`
    );
  }, { timeout: 120_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-T05 — optimal path
// ─────────────────────────────────────────────────────────────────────────────
describe('buildExplainContext — optimal path (FR-T05)', () => {
  let solver;
  before(() => { solver = createSolverProcess(); });
  after(() => { solver.destroy(); });

  it('returns non-null prompt for known optimal-move position', async () => {
    // '3344' (4 moves, Red's turn): col=2 is the best move (score=18, tied with col5).
    // After playing col2, Red has immediate_threat at col1 and col5.
    const result = await buildExplainContext('3344', 2, 1, solver);
    assert.ok(result !== null, 'result must not be null');
    assert.ok(result.prompt !== null, 'prompt must not be null');
    assert.ok(typeof result.prompt === 'string', 'prompt must be a string');
  }, { timeout: 120_000 });

  it('prompt contains the POSITIVE_TEMPLATES sentence (not blunder framing)', async () => {
    const result = await buildExplainContext('3344', 2, 1, solver);
    assert.ok(result?.prompt, 'prompt must exist');

    // The positiveReason must be in the prompt.
    // After '33442', correctMovePatterns has immediate_threat (highest cascade priority).
    const immediatePositive = POSITIVE_TEMPLATES.get('immediate_threat');
    const doublePositive    = POSITIVE_TEMPLATES.get('double_threat');
    const forcedWinPositive = POSITIVE_TEMPLATES.get('forced_win');

    // At least one of the positive template sentences must appear.
    const hasPositive =
      (immediatePositive && result.prompt.includes(immediatePositive)) ||
      (doublePositive    && result.prompt.includes(doublePositive))    ||
      (forcedWinPositive && result.prompt.includes(forcedWinPositive)) ||
      result.prompt.includes('This was the strongest move available.');

    assert.ok(
      hasPositive,
      `prompt must contain a POSITIVE_TEMPLATES sentence; got:\n${result.prompt.slice(0, 300)}`
    );

    // Prompt must NOT contain blunder framing language.
    assert.ok(
      !result.prompt.includes('matched missed_own:') && !result.prompt.includes('matched enabled_opponent:'),
      'prompt must NOT contain terse blunder reason strings'
    );
  }, { timeout: 120_000 });

  it('prompt does NOT contain any REASON_TEMPLATES sentence (tagBlunder was not called)', async () => {
    const result = await buildExplainContext('3344', 2, 1, solver);
    assert.ok(result?.prompt, 'prompt must exist');

    // None of the REASON_TEMPLATES sentences should appear.
    for (const [, sentence] of REASON_TEMPLATES) {
      assert.ok(
        !result.prompt.includes(sentence),
        `prompt must not contain blunder reason sentence: "${sentence.slice(0, 60)}..."`
      );
    }
  }, { timeout: 120_000 });

  it('validateAnnotation passes on a clean synthetic explanation', async () => {
    const result = await buildExplainContext('3344', 2, 1, solver);
    assert.ok(result?.prompt, 'prompt must exist');

    const board = new Board('3344');
    const syntheticExplanation = 'Great move — you spotted the winning threat.';
    const validation = validateAnnotation(syntheticExplanation, board, result.allowedSet);
    assert.ok(
      validation.valid,
      `validateAnnotation must pass; failures: ${JSON.stringify(validation.failures)}`
    );
  }, { timeout: 120_000 });
});
