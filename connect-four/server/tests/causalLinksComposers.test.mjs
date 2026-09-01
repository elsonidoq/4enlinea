import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { classifyCausalLink, denialCell } from '../scripts/reason_engine/causalLinks.mjs';
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
  // B1 (FR-014/SC-011): fork completing cell (c4r3) and opponent denial cell (c6r5) now render as
  // "column N" prose, not raw cNrM.
  assert.match(link.text, /completing at column 4/);      // fork completing cell named
  assert.match(link.text, /deny it at column 6/);          // opponent denial cell named
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);          // no raw coordinate leaks (OI-194)
  assert.doesNotMatch(link.text, /immediate|right now|current threat/i);
});

test('L1 (pin-L1-completes-your-tactic): completes YOUR tactic; opponent denial named', () => {
  const { link } = classifyById('pin-L1-completes-your-tactic');
  assert.equal(link.id, 'L1');
  assert.match(link.text, /[Cc]olumn 3 was the better move/);   // bestCol 2 -> display 3, prose form
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  // T022 (FR-014a, OI-194): completingCell/denial cell now render as "column N" prose, not a raw
  // cNrM token — c2r1 -> column 2 (your completing cell), c3r1 -> column 3 (opponent denial cell).
  assert.match(link.text, /completes your .* in column 2/);   // your completing cell
  assert.match(link.text, /opponent take column 3/);          // opponent denial cell
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);              // no raw coordinate leaks (OI-194)
});

test('L2 (pin-L2-enabled-opponent): played move handed the opponent the pattern', () => {
  const { link } = classifyById('pin-L2-enabled-opponent');
  assert.equal(link.id, 'L2');
  // OI-195: this assertion used to lock `c2r1` — the fork's remote winning square, still EMPTY on
  // the half's own finalMovestring `33432`. The opponent actually landed on `c3r1`
  // (= tie.sharedCells[0], the square the better move would have taken). The old expectation was
  // part of the bug: it kept a board-false frame green across every earlier run.
  // T022 (FR-014a, OI-194): the conceded cell now renders as "column N" prose — c3r1 -> column 3,
  // c2r1 -> column 2.
  assert.match(link.text, /let the opponent occupy column 3/);
  assert.doesNotMatch(link.text, /occupy column 2\b/);
  assert.match(link.text, /double threat/i);              // double_threat slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /double_threat/);        // raw slug must not leak
  assert.match(link.text, /[Cc]olumn 3 was the better move/);   // bestCol 2 -> display 3, prose form
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);         // no raw coordinate leaks (OI-194)
});

test('L3 (pin-L3-no-causation): no-causation, hold-the-line wording; names the branch-invariant pattern', () => {
  const { link } = classifyById('pin-L3-no-causation');
  assert.equal(link.id, 'L3');
  assert.match(link.text, /7-shaped double threat/);      // figure_7 slug -> plain C4 phrase
  assert.match(link.text, /column 4/);                    // T022 (OI-194): c4r3 -> "column 4" prose
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);         // no raw coordinate leaks (OI-194)
  assert.match(link.text, /didn't create it/i);           // no causation, player-facing
  assert.match(link.text, /work hardest|speeds up the finish/i);
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);  // A5b: no defeatist framing
  assert.match(link.guardrail, /caused or enabled/i);     // causation guardrail preserved (not in player text)
});

test('L4 (pin-L4-missed-defense): missed defense; occupies the block, names the opponent window', () => {
  const { link } = classifyById('pin-L4-missed-defense');
  assert.equal(link.id, 'L4');
  assert.match(link.text, /[Cc]olumn 5 was the better move/);   // bestCol 4 -> display 5, prose form
  assert.match(link.text, /occupies column 5/);           // T022 (OI-194): c5r4 -> "column 5" prose
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);         // no raw coordinate leaks (OI-194)
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
  // B1 (FR-014/SC-011) named both completing cells (c2r5, c2r6) as "column N" prose — but they are
  // TWO DIFFERENT squares sharing that column, so bare "column 2" for both was self-contradictory
  // ("you had a win via column 2 ... opponent forces their own win via column 2"). Regression fix
  // (2026-08-28): `cellPhrase` now disambiguates genuinely different same-column cells by height
  // (row 1 = bottom); c2r5 sorts lower than c2r6, so the fixture reads "the lower square in column 2"
  // for the player's own win and "the upper square in column 2" for the opponent's.
  assert.match(link.text, /forced win via the lower square in column 2/);
  assert.match(link.text, /opponent force their own win via the upper square in column 2/);
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);
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
  assert.match(link.text, /occupying column 4/);          // T022 (OI-194): c4r4 -> "column 4" prose
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);          // no raw coordinate leaks (OI-194)
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
// completingCell; the CELL CHOICE for the other three L2-routed records is unchanged by D49 (still
// `tie.sharedCells[0]`, which happens to equal `completingCell` for these three). The VERB is no
// longer unchanged: spec 059 T015 (FR-012, OI-195 remaining half a) found the named square is empty
// on the punishment half's own `finalMovestring` for all three — "occupy" was a board-false
// over-claim (the cell is a live gravity-top THREAT, not yet taken). The template now checks
// occupancy and says "open a path to" instead; see causalLinks.test.mjs's FR-012 corpus test for the
// full invariant this asserts.
// T022 (FR-014a, OI-194) update: the conceded cell now renders as "column N" prose, not the raw
// cNrM token — the column-number checks below replace the old raw-cell regexes; the underlying
// occupied/open-path invariant (T015/FR-012) is unchanged.
test('OI-195: the three L2 records whose shared cell already equalled the completing cell name the same cell (verb now occupancy-checked, T015)', () => {
  for (const [id, col] of [['eval-33', 5], ['eval-44', 3], ['eval-45', 4]]) {
    const { fv, link } = classifyById(id);
    assert.equal(link.id, 'L2', `${id} must still route to L2`);
    assert.equal(fv.opponentPunishment.tie.sharedCells[0], fv.opponentPunishment.completingCell);
    // T015: the cell is empty on the punishment half's own finalMovestring — "open a path to", not "occupy".
    assert.match(link.text, new RegExp(`let the opponent open a path to column ${col}\\b`));
    assert.doesNotMatch(link.text, new RegExp(`let the opponent occupy column ${col}\\b`));
    assert.doesNotMatch(link.text, /\bc\d+r\d+\b/, `${id}: no raw coordinate leaks (OI-194)`);
  }
});

test('OI-195: a punishment half with no tie falls back to completingCell (T015: verb reflects that cell\'s own occupancy)', () => {
  const { fv } = classifyById('pin-L2-enabled-opponent');
  const noTie = { ...fv, opponentPunishment: { ...fv.opponentPunishment, tie: undefined } };
  const link = classifyCausalLink(noTie, { patternOnAfterBestBoard: false });
  assert.equal(link.id, 'L2');
  // Falls back to completingCell = c2r1 (column 2), which is EMPTY on this half's own
  // finalMovestring ('33432') — tie.sharedCells[0] ('c3r1') is the one actually taken (D49). T015's
  // occupancy check therefore correctly says "open a path to", not "occupy", once the tie (and its
  // correct cell choice) is gone. T022 (OI-194): rendered as "column 2" prose, not the raw token.
  assert.match(link.text, /let the opponent open a path to column 2\b/);
  assert.doesNotMatch(link.text, /let the opponent occupy column 2\b/);
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);
});

// ── A7a (task 6) — L3 states the CONCESSION, not just the outcome; the inevitability claim is gated;
// L5 gains the causal connective. Graded 3/3 deterministic on eval-37 / eval-42 / eval-28.
//
// The hard constraint on every new L3 clause is L3's own guardrail, verbatim: "MUST NOT say the
// played move caused or enabled the pattern, and MUST NOT tell the player they are lost". The
// clauses below are descriptive of the resulting position only; the tests assert that directly.

test('A7a/L3 (eval-37): names the concession (the square right beneath the one the opponent needs), not just the outcome', () => {
  const { fv, link } = classifyById('eval-37');
  assert.equal(link.id, 'L3');
  assert.equal(fv.playedCol, 0);
  assert.equal(fv.opponentPunishment.completingCell, 'c1r4');
  assert.match(link.text, /right beneath the one your opponent needs in column 1/);
  assert.doesNotMatch(link.text, /only speeds up the finish\.$/);
  // patternOnAfterBestBoard === true here, so the inevitability clause and its no-causation denial stay.
  assert.match(link.text, /no matter what you play here/);
  assert.match(link.text, /didn't create it/i);
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);           // no raw coordinate leaks (OI-194)
});

test('A7a/L3 (eval-42): no inevitability claim when the pattern is absent from the after-best board, and no causation assertion', () => {
  const { link } = classifyById('eval-42');
  assert.equal(link.id, 'L3');
  assert.ok(!link.text.includes('no matter what you play here'), link.text);
  // "available", never "already there"/"waiting": the figure_7's own cell c3r2 is EMPTY on the
  // decision board (the opponent holds only c4r1 and c2r3 of that window), so a PRESENCE claim
  // would be an I2 fabrication. `realized_pattern` means the opponent realizes it with their reply.
  assert.match(link.text, /already available in this position/);
  assert.doesNotMatch(link.text, /already there|waiting in this position/i);
  // The guardrail's hard MUST NOT, asserted on the player-facing text itself.
  assert.doesNotMatch(link.text, /caused|enabled|opened the door|created it|let the opponent/i);
  // Final-review fix (2026-09-01): the clause is NON-CONTRASTIVE — its own sentence, no semicolon
  // parallel with "Column 1 makes your opponent work hardest for it". `bestCol` here is 0 and the
  // needed column index is 2, so playing the BETTER column leaves that square open too; the old
  // semicolon frame implied otherwise and invited "column 1 would have stopped them".
  assert.match(link.text, /The square your opponent needs in column 3 is already open to them on their very next turn/);
  assert.doesNotMatch(link.text, /the move you played leaves the square/);
  assert.doesNotMatch(link.text, /work hardest for it; the move you played/);
  // The mechanism must still be named — this record is the reason the clause exists (A7a 3/3 -> 0/3,
  // full pass, D60). Regressing it to the mechanism-free abstention would undo that.
  assert.doesNotMatch(link.text, /only speeds up the finish/);
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);
});

test('A7a/L3 (eval-42): the non-contrastive branch makes no claim about the BETTER move leaving that square open', () => {
  // The structural defect the rewording fixes, asserted on the vector that proves it: playing
  // `bestCol` does not touch the needed square's column either, so any sentence that contrasts the
  // played move with the better move ON THIS POINT is false. Derived from the record, not asserted
  // as a constant.
  const { fv, link } = classifyById('eval-42');
  const m = /^c(\d+)r(\d+)$/.exec(fv.opponentPunishment.completingCell);
  const neededCol = Number(m[1]) - 1;
  assert.notEqual(fv.bestCol, neededCol,
    'fixture premise: the better column is NOT the needed square\'s column, so the contrast would be false');
  assert.notEqual(fv.playedCol, neededCol, 'fixture premise: this is the not-the-played-column branch');
  // Nothing in the text attributes the open square to the played move.
  assert.doesNotMatch(link.text, /the move you played (leaves|left|opened|allows)/i);
});

// Derived, never hard-coded: the no-causation sweep below is the ONLY mechanical guard on L3's hard
// MUST NOT, so it has to cover an L3 record added to the corpus tomorrow, not the nine that happen to
// exist today. Rows that don't produce a vector/link at all (error rows) are skipped, exactly as the
// other corpus sweeps in this suite do.
function idsForLink(linkId) {
  const ids = [];
  for (const row of rows) {
    if (!row?.evidence || row.error) continue;
    try { if (classifyById(row.id).link.id === linkId) ids.push(row.id); } catch { /* not classifiable */ }
  }
  return ids;
}

test('A7a/L3: no clause on ANY L3 corpus record asserts the played move caused or enabled the pattern', () => {
  const l3Ids = idsForLink('L3');
  assert.ok(l3Ids.length >= 9, `expected the corpus to still carry the known L3 records; got ${l3Ids.length}`);
  for (const id of l3Ids) {
    const { link } = classifyById(id);
    assert.equal(link.id, 'L3', id);
    assert.doesNotMatch(link.text, /\b(caused|enabled|opened the door|handed|gave (your|the) opponent)\b/i, id);
    assert.doesNotMatch(link.text, /already losing|neither move wins|you are lost/i, id);
    assert.doesNotMatch(link.text, /\bc\d+r\d+\b/, id);
  }
});

test('A7a/L3: abstains to the existing wording when the completing cell is not gravity-top after the played move', () => {
  const { link } = classifyById('pin-L3-no-causation');
  assert.match(link.text, /only speeds up the finish\.$/);   // I2 abstention, wording unchanged
});

test('A7a/L5 (eval-28): the denial square is tied to the winning line instead of being left as a bare outcome', () => {
  const { fv, link } = classifyById('eval-28');
  assert.equal(link.id, 'L5');
  assert.ok(fv.lostResource.window.includes(denialCell(fv.opponentPunishment)));
  assert.match(link.text, /Your winning line ran through that square/);
  assert.match(link.text, /taking it is what kills the win/);
  assert.doesNotMatch(link.text, /\bc\d+r\d+\b/);
});

test('A7a/L5: every L5 corpus record gets the causal sentence, and it abstains when the vector cannot support it', () => {
  const l5Ids = idsForLink('L5');
  assert.ok(l5Ids.length >= 9, `expected the corpus to still carry the known L5 records; got ${l5Ids.length}`);
  for (const id of l5Ids) {
    const { fv, link } = classifyById(id);
    assert.equal(link.id, 'L5', id);
    assert.ok(fv.lostResource.window.includes(denialCell(fv.opponentPunishment)), `${id}: denial cell must be in the winning window`);
    assert.equal(fv.opponentPunishment.verdict, 'occupation', `${id}: the opponent must actually TAKE that square`);
    assert.match(link.text, /Your winning line ran through that square/, id);
  }
  // I2 abstention 1: no window on the vector -> "your winning line ran through that square" is
  // not fabricated.
  const { fv } = classifyById('eval-28');
  const noWindow = { ...fv, lostResource: { ...fv.lostResource, window: undefined } };
  const link = classifyCausalLink(noWindow, {});
  assert.equal(link.id, 'L5');
  assert.doesNotMatch(link.text, /Your winning line ran through that square/);
  // I2 abstention 2: a half that denies WITHOUT occupying that square -> "taking it is what kills
  // the win" is not fabricated either (the `no_occupation` shape eval-37's own lostResource has).
  const noOcc = { ...fv, opponentPunishment: { ...fv.opponentPunishment, verdict: 'no_occupation' } };
  const link2 = classifyCausalLink(noOcc, {});
  assert.equal(link2.id, 'L5');
  assert.doesNotMatch(link2.text, /taking it is what kills the win/);
  assert.match(link2.text, /let the opponent deny it at column 7\.$/);   // weaker but true, unchanged
});
