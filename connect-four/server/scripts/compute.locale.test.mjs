import { describe, it, expect } from 'vitest';
import { buildPromptForCondition } from './compute.mjs';

// Real narrator-vector fixture reused from server/tests/computeConditionD.test.mjs
// (a hand-written stub throws in buildReasonRenderModel/classifyCausalLink; project rule
// forbids hand-rolling movestrings/vectors, so this frozen fixture is reused verbatim).
const fv = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

describe('buildPromptForCondition locale', () => {
  it('en (default) contains no Spanish directive', () => {
    const p = buildPromptForCondition(null, fv, 'D');
    expect(p).not.toMatch(/voseo/i);
  });
  it('es appends the Spanish output directive', () => {
    const p = buildPromptForCondition(null, fv, 'D', 'es');
    expect(p).toMatch(/voseo/i);
    expect(p).toMatch(/verde/);
    expect(p).toMatch(/gris/);
  });
  it('es keeps the English JSON schema keys intact', () => {
    const p = buildPromptForCondition(null, fv, 'D', 'es');
    expect(p).toMatch(/"mechanism":/);
    expect(p).toMatch(/"better_move":/);
  });
});
