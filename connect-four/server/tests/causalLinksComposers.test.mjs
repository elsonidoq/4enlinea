import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
export function classifyById(id) {
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));
  const ctx = fv.direction === 'enabled_opponent' ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
  return { fv, link: classifyCausalLink(fv, ctx) };
}

test('L5 (pin-L5-deep-fork): deep fork framed as deep, not immediate', () => {
  const { link } = classifyById('pin-L5-deep-fork');
  assert.equal(link.id, 'L5');
  assert.match(link.text, /forced win/i);
  assert.match(link.text, /deep on a forced line/);      // horizon-honest (pin-L5-deep-fork fix)
  assert.match(link.text, /c4r3/);                        // fork completing cell named
  assert.match(link.text, /c6r5/);                        // opponent denial cell named
  assert.doesNotMatch(link.text, /immediate|right now|current threat/i);
});

test('L1 (pin-L1-completes-your-tactic): completes YOUR tactic; opponent denial named', () => {
  const { link } = classifyById('pin-L1-completes-your-tactic');
  assert.equal(link.id, 'L1');
  assert.match(link.text, /[Cc]olumn 3 was the better move/);   // bestCol 2 -> display 3, prose form
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  assert.match(link.text, /c2r1/);                        // your completing cell
  assert.match(link.text, /c3r1/);                        // opponent denial cell
});

test('L2 (pin-L2-enabled-opponent): played move handed the opponent the pattern', () => {
  const { link } = classifyById('pin-L2-enabled-opponent');
  assert.equal(link.id, 'L2');
  // OI-195: this assertion used to lock `c2r1` — the fork's remote winning square, still EMPTY on
  // the half's own finalMovestring `33432`. The opponent actually landed on `c3r1`
  // (= tie.sharedCells[0], the square the better move would have taken). The old expectation was
  // part of the bug: it kept a board-false frame green across every earlier run.
  assert.match(link.text, /let the opponent occupy c3r1/);
  assert.doesNotMatch(link.text, /occupy c2r1/);
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  assert.match(link.text, /[Cc]olumn 3 was the better move/);   // bestCol 2 -> display 3, prose form
});

test('L3 (pin-L3-no-causation): no-causation, hold-the-line wording; names the branch-invariant pattern', () => {
  const { link } = classifyById('pin-L3-no-causation');
  assert.equal(link.id, 'L3');
  assert.match(link.text, /7-shaped double threat/);      // figure_7 slug -> plain C4 phrase
  assert.match(link.text, /c4r3/);
  assert.match(link.text, /didn't create it/i);           // no causation, player-facing
  assert.match(link.text, /work hardest|speeds up the finish/i);
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);  // A5b: no defeatist framing
  assert.match(link.guardrail, /caused or enabled/i);     // causation guardrail preserved (not in player text)
});

test('L4 (pin-L4-missed-defense): missed defense; occupies the block, names the opponent window', () => {
  const { link } = classifyById('pin-L4-missed-defense');
  assert.equal(link.id, 'L4');
  assert.match(link.text, /[Cc]olumn 5 was the better move/);   // bestCol 4 -> display 5, prose form
  assert.match(link.text, /occupies c5r4/);
  assert.match(link.text, /skipped that defense/i);
});

test('L4 (eval-39): lose_to_faster_lose routes to L4 and gets the hold-the-line guardrail', () => {
  const { fv, link } = classifyById('eval-39');
  assert.equal(fv.case, 'lose_to_faster_lose');
  assert.equal(link.id, 'L4');
  assert.match(link.guardrail, /toughest|work hardest/i);
  assert.doesNotMatch(link.guardrail, /you are lost/i);
  assert.match(link.guardrail, /MUST NOT tell the player they are lost/);
  assert.match(link.guardrail, /but the position is still lost/); // defeatist-caveat prohibition, like L3/L9
});

test('L4 (pin-L4-missed-defense): non-lose_to_faster_lose case keeps the original guardrail verbatim', () => {
  const { fv, link } = classifyById('pin-L4-missed-defense');
  assert.notEqual(fv.case, 'lose_to_faster_lose');
  assert.equal(link.id, 'L4');
  assert.equal(link.guardrail, 'The better move blocks the opponent pattern; frame it as a missed defense.');
});

test('L6 (pin-L6-lost-win-and-gave-one): gave up a win AND handed the opponent one', () => {
  const { link } = classifyById('pin-L6-lost-win-and-gave-one');
  assert.equal(link.id, 'L6');
  assert.match(link.text, /forced win via c2r5/);
  assert.match(link.text, /opponent force their own win via c2r6/);
});

test('L7 (pin-L7-practical-swindle): practical swindle framed as toughest defense, no defeatist wording', () => {
  const { link } = classifyById('pin-L7-practical-swindle');
  assert.equal(link.id, 'L7');
  assert.match(link.text, /practical swindle/i);
  assert.match(link.text, /stubborn defense|most resilient|toughest/i);   // hold-the-line reframe
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);    // A5b: no defeatist framing
  assert.doesNotMatch(link.text, /you (would )?win\b/i);   // must not claim a win
});

test('L8 (pin-L8-draw-abandoned): a draw abandoned; opponent now has a forced win', () => {
  const { link } = classifyById('pin-L8-draw-abandoned');
  assert.equal(link.id, 'L8');
  assert.match(link.text, /position was a draw/i);
  assert.match(link.text, /occupying c4r4/);
  assert.match(link.text, /forced win/i);
});

test('L9 (pin-L9-hedged-parity): hedged parity, culprit not isolable', () => {
  const { link } = classifyById('pin-L9-hedged-parity');
  assert.equal(link.id, 'L9');
  assert.match(link.text, /parity/i);
  assert.match(link.text, /isn't cleanly isolable/i);
  assert.doesNotMatch(link.text, /the culprit is c\d+r\d+/i);  // must NOT fabricate a crisp cause
});

// The A6 invariant: the composed frame is the ONLY place the player learns which column to play.
// A parenthetical "(col N)" was measured to be dropped from the coach's prose about half the time,
// and L5/L6/L9 omitted the column entirely. Every link must state it as prose.
const ONE_PER_LINK = {
  L1: 'pin-L1-completes-your-tactic', L2: 'pin-L2-enabled-opponent', L3: 'pin-L3-no-causation',
  L4: 'pin-L4-missed-defense', L5: 'pin-L5-deep-fork', L6: 'pin-L6-lost-win-and-gave-one',
  L7: 'pin-L7-practical-swindle', L8: 'pin-L8-draw-abandoned', L9: 'pin-L9-hedged-parity',
};

for (const [linkId, boardId] of Object.entries(ONE_PER_LINK)) {
  test(`${linkId}: composed text names the better column as prose, not a parenthetical`, () => {
    const { fv, link } = classifyById(boardId);
    assert.equal(link.id, linkId);
    const display = fv.bestCol + 1;
    // Prose ONLY, as of the 2026-08-25 conversion. The parenthetical form was kept as a deliberate
    // control group and the control returned the OPPOSITE of the plan's expectation: measured on the
    // final 25-board run, `(col N)` failed A6 on 16% of mid/late runs against 0% for prose (the gap
    // WIDENED from the 9%-vs-0% figure that had justified leaving it alone). L1/L2/L4/L8 were
    // converted; nothing may reintroduce a parenthetical column.
    assert.match(link.text, new RegExp(`[Cc]olumn ${display}\\b`),
      `${linkId} must name the better column (${display}) as prose; got: ${link.text}`);
    assert.doesNotMatch(link.text, /\(col \d+\)/,
      `${linkId} must not name the column parenthetically; got: ${link.text}`);
  });
}


// ── OI-195 — the conceded cell is the SHARED one, validated over the whole L2 case space ───────
//
// Only pin-L2-enabled-opponent and its branch-invariance twin have tie.sharedCells[0] !==
// completingCell; the other three L2-routed records must render byte-identically, which is what
// makes the next measurement attributable to this one change.
test('OI-195: the three L2 records whose shared cell already equalled the completing cell are unchanged', () => {
  for (const [id, cell] of [['eval-33', 'c5r6'], ['eval-44', 'c3r1'], ['eval-45', 'c4r6']]) {
    const { fv, link } = classifyById(id);
    assert.equal(link.id, 'L2', `${id} must still route to L2`);
    assert.equal(fv.opponentPunishment.tie.sharedCells[0], fv.opponentPunishment.completingCell);
    assert.match(link.text, new RegExp(`let the opponent occupy ${cell}`));
  }
});

test('OI-195: a punishment half with no tie falls back to completingCell (no behaviour change)', () => {
  const { fv } = classifyById('pin-L2-enabled-opponent');
  const noTie = { ...fv, opponentPunishment: { ...fv.opponentPunishment, tie: undefined } };
  const link = classifyCausalLink(noTie, { patternOnAfterBestBoard: false });
  assert.equal(link.id, 'L2');
  assert.match(link.text, /let the opponent occupy c2r1/);
});
