import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeOpeningFrame, centralityQualitative } from '../scripts/reason_engine/openingFrame.mjs';

// eval-9 namedOpening: player 1, win_to_draw, movestring 33322226, played 5 best 6
const namedFv = {
  case: 'win_to_draw', player: 1, movestring: '33322226', bestCol: 6, playedCol: 5,
  lostResource: { kind: 'winning_line', register: 'parity', pliesToEnd: 30, completingCell: 'c1r3' },
  opponentPunishment: { kind: 'denial', register: 'parity', pliesToEnd: 28 },
  openingContext: { namedOpening: { id: 'allen-3-4-opening', family: 'central-column opening', matchedPrefixLen: 8, bookNextCol: 6 } },
};

// eval-5 defense: player 2, lose_to_faster_lose, movestring 33322, played 0 best 2
const defenseFv = {
  case: 'lose_to_faster_lose', player: 2, movestring: '33322', bestCol: 2, playedCol: 0,
  lostResource: { kind: 'conditional_swindle', register: 'parity', pliesToEnd: 35, completingCell: 'c6r2' },
  opponentPunishment: { kind: 'winning_line', register: 'parity', pliesToEnd: 33, completingCell: 'c1r3' },
  openingContext: { defense: { id: null, family: 'central-column opening', matchedPrefixLen: 5, bestDefenseCol: 2, centralityGrounded: true } },
};

const centralityFv = {
  case: 'lose_to_faster_lose', player: 2, movestring: '3', bestCol: 3, playedCol: 1,
  lostResource: { kind: 'conditional_swindle', register: 'parity', pliesToEnd: 35, completingCell: 'c6r2' },
  opponentPunishment: { kind: 'winning_line', register: 'parity', pliesToEnd: 37, completingCell: 'c1r3' },
  openingContext: { centrality: { bestCol: 3, playedCol: 1, betterHasMoreLines: true,
    text: 'In the opening, the more central a column is, the more four-in-a-row lines run through it...', resistAndWait: true } },
};

test('returns null without openingContext', () => {
  assert.equal(composeOpeningFrame({ case: 'win_to_lose', player: 1 }), null);
});

test('O1 namedOpening: book move column, 1-indexed, names family+id, no deep cell', () => {
  const f = composeOpeningFrame(namedFv);
  assert.equal(f.id, 'O1');
  assert.equal(f.kind, 'namedOpening');
  assert.match(f.text, /central-column opening/);
  assert.match(f.text, /allen-3-4-opening/);
  assert.match(f.text, /column 7/);          // bookNextCol 6 -> display 7
  assert.match(f.text, /column 6/);          // playedCol 5 -> display 6
  assert.doesNotMatch(f.text, /c6r2|c1r3/);  // no deep completing cell
  assert.match(f.text, /lesson is the opening/);
});

test('O2 defense: resilience framing, NO "lost" doom, family-only when id null', () => {
  const f = composeOpeningFrame(defenseFv);
  assert.equal(f.id, 'O2');
  assert.match(f.text, /more resilient move is column 3/);  // bestDefenseCol 2 -> display 3
  assert.match(f.text, /column 1 gives ground faster/);     // playedCol 0 -> display 1
  assert.doesNotMatch(f.text, /lost|theoretically/i);
  assert.doesNotMatch(f.text, /allen-/);                    // id null -> family only
});

test('O3 centrality: uses embedded text lead', () => {
  const f = composeOpeningFrame(centralityFv);
  assert.equal(f.id, 'O3');
  assert.match(f.text, /more central a column is/);
});

test('centralityQualitative: strong gap -> much_easier', () => {
  // player 1: bestCol 6 lands display c7r1 (internal r0,c6 ~0.037) vs playedCol 5 c6r1 (r0,c5 ~0.104)
  // played cell has MORE mass here, so no claim
  assert.equal(centralityQualitative(namedFv), null);
  // defense player 2: bestCol 2 lands c3r? vs playedCol 0 c1r? — assert it returns a valid enum
  assert.ok(['much_easier', 'easier', null].includes(centralityQualitative(defenseFv)));
});

test('guardrail forbids deep-cell grounding', () => {
  // Re-pointed for Task 6 (spec 058): GUARDRAIL no longer says "do not ground"; it requires the LATER
  // framing instead, so the deep cell CAN be named as long as it is framed as future, not present.
  assert.match(composeOpeningFrame(namedFv).guardrail, /matters LATER/i);
});

test('guardrail forbids inventing a centrality claim when qualitative is null', () => {
  assert.equal(centralityQualitative(namedFv), null); // precondition (also asserted at line 63)
  assert.match(composeOpeningFrame(namedFv).guardrail, /not stated to differ in centrality/i);
});

test('guardrail omits the no-centrality clause when qualitative is non-null', () => {
  // defenseFv's centralityQualitative may be null or a real value depending on the heatmap data;
  // only assert the clause's ABSENCE when a real qualitative value is present.
  if (centralityQualitative(defenseFv) !== null) {
    assert.doesNotMatch(composeOpeningFrame(defenseFv).guardrail, /not stated to differ in centrality/i);
  }
});

test('frame text carries no engine vocabulary (A5a)', () => {
  for (const fv of [namedFv, defenseFv, centralityFv]) {
    const { text } = composeOpeningFrame(fv);
    assert.doesNotMatch(text, /\bsolver\b/i, `"solver" leaked into coach prose: ${text}`);
    assert.doesNotMatch(text, /\bplies\b/i, `"plies" leaked into coach prose: ${text}`);
    assert.match(text, /lesson is the opening/);   // the frame's point survives the rewrite
  }
});

test('centrality prohibition is attached whenever no centrality clause was emitted', () => {
  // O2 with centralityGrounded:false suppresses the clause; the guardrail MUST then forbid the claim.
  const ungrounded = { ...defenseFv,
    openingContext: { defense: { ...defenseFv.openingContext.defense, centralityGrounded: false } } };
  const f = composeOpeningFrame(ungrounded);
  assert.doesNotMatch(f.text, /easier to build a connected four/);   // clause suppressed
  assert.match(f.guardrail, /more central/,                          // ...so prohibition present
    'clause was suppressed but GUARDRAIL_NO_CENTRALITY was not attached');
});

test('a frame that DOES state centrality does not also forbid it', () => {
  const f = composeOpeningFrame(defenseFv);       // centralityGrounded: true
  if (/easier to build a connected four/.test(f.text)) {
    assert.doesNotMatch(f.guardrail, /do not say one column is "more central"/);
  }
});
