import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCausalLink, CAUSAL_LINKS } from '../scripts/reason_engine/causalLinks.mjs';

test('L1 missed_own', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'missed_own',
               lostResource: { kind: 'realized_pattern' }, opponentPunishment: { kind: 'denial' } };
  assert.equal(classifyCausalLink(fv).id, 'L1');
});

test('L3 enabled_opponent when already losing (branch-invariant default)', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv).id, 'L3');
});

test('L2 enabled_opponent when winning was available and pattern not branch-invariant', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

// Fix B (D30): the sign `case` — not the geometric patternOnAfterBestBoard — gates L2 vs L3.
// A win_to_lose / draw_to_lose enabled_opponent case must NEVER route to L3, even when the opponent
// pattern happens to sit on the after-best board (the eval-51/eval-53 misroute).
test('L2 for win_to_lose enabled_opponent even when pattern IS on the after-best board (Fix B)', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L2');
});

test('L2 for draw_to_lose enabled_opponent regardless of branch-invariance ctx (Fix B)', () => {
  const fv = { case: 'draw_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L2');
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

test('L3 only fires on lose_to_faster_lose enabled_opponent (Fix B); text is hold-the-line, not defeatist', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c5r4' } };
  const link = classifyCausalLink(fv, { patternOnAfterBestBoard: false });
  assert.equal(link.id, 'L3');
  assert.match(link.text, /didn't create it|work hardest|speeds up/i);
  assert.match(link.text, /7-shaped double threat/);        // figure_7 slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);  // no defeatist framing
  assert.match(link.guardrail, /caused or enabled/i);       // causation guardrail preserved
});

test('L7 conditional swindle', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'sign',
               lostResource: { kind: 'conditional_swindle', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity' } };
  assert.equal(classifyCausalLink(fv).id, 'L7');
});

test('L9 diffuse parity win (no shared cell) beats L6', () => {
  const fv = { case: 'win_to_lose', route: 'sign',
               lostResource: { kind: 'winning_line', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity', tie: { sharedCells: [] } } };
  assert.equal(classifyCausalLink(fv).id, 'L9');
});

test('L4 defensive_miss', () => {
  const fv = { case: 'draw_to_lose', route: 'realized_denied', direction: 'defensive_miss',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv).id, 'L4');
});
test('L8 draw abandoned (sign)', () => {
  const fv = { case: 'draw_to_lose', route: 'sign',
               lostResource: { kind: 'denial', register: 'forced_sequence' },
               opponentPunishment: { kind: 'winning_line', register: 'parity' } };
  assert.equal(classifyCausalLink(fv).id, 'L8');
});
test('L6 two winning lines (sign)', () => {
  const fv = { case: 'win_to_lose', route: 'sign',
               lostResource: { kind: 'winning_line', register: 'forced_sequence' },
               opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                                     tie: { sharedCells: ['c4r5'] } } };
  assert.equal(classifyCausalLink(fv).id, 'L6');
});

test('no rule matches throws', () => {
  assert.throws(() => classifyCausalLink({ case: 'nonsense', route: 'sign', lostResource: {}, opponentPunishment: {} }));
});

test('every catalog entry has the required shape', () => {
  for (const l of CAUSAL_LINKS) {
    assert.ok(l.id && l.family && l.confidence && typeof l.when === 'function' && Array.isArray(l.covers));
  }
});
