// connect-four/server/tests/reasonBoardTags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tagBoard, grainOf } from '../scripts/reasonBoardTags.mjs';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { boardSelectionDecisions, patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';
import { Board, detectFigure7, detectDoubleThreat } from '../classifier.js';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');

test('detects a gravity-top (immediate) major threat, owner via perspective', () => {
  // "01020": player1 has a vertical 3-in-col0, threatening c1r4 (=[3,0]); heights[0]=3 => gravity-top.
  const tags = tagBoard('01020', 1);
  const t = tags.find((x) => x.cell === 'c1r4');
  assert.ok(t, 'expected a tag at c1r4');
  assert.equal(t.kind, 'immediate');   // r === height
  assert.equal(t.owner, 'you');        // player1 === perspectivePlayer 1
});

test('same board from the opponent perspective flips owner', () => {
  const t = tagBoard('01020', 2).find((x) => x.cell === 'c1r4');
  assert.equal(t.owner, 'opp');
});

// T013 (FR-010, OI-204): the overlay is gated on the PRODUCTION detector actually matching on the
// board being tagged (I12 — never a hand-rolled proxy). '21444411562322311656615' is the D16 Case-A
// fork board (reasonEngine.test.mjs, sourced from computeReason('214444115623', 4)); detectDoubleThreat
// genuinely matches player 1 there (gravity-top majors at c4r3/c6r4), so from player 2's perspective
// this is a real 'opp' double_threat overlay, not a fabricated one.
test('surfaces a named pattern from the vector when provided', () => {
  const tags = tagBoard('21444411562322311656615', 2, { patternTag: 'double_threat', patternCompletingCell: 'c4r3',
    patternWindow: ['c4r3', 'c6r4'], patternOwner: 'opp' });
  const dbl = tags.find((x) => x.kind === 'double_threat');
  assert.ok(dbl);
  assert.equal(dbl.cell, 'c4r3');
  assert.deepEqual(dbl.window, ['c4r3', 'c6r4']);
  assert.equal(dbl.owner, 'opp');
});

// FR-010 / OI-204 — the suppression half of the invariant. '334' is pin-L2-enabled-opponent's
// decision board; ./visualize_board.sh 334 reports "Major threats: none" — the fork only exists on
// the punishment line '33432'. A double_threat overlay claiming the opponent already has it on '334'
// must be dropped, and must reappear once the discs it requires actually exist.
test('FR-010: a pattern overlay is suppressed when the tactic is not yet board-true (OI-204)', () => {
  const tags = tagBoard('334', 2, { patternTag: 'double_threat', patternCompletingCell: 'c2r1',
    patternWindow: ['c2r1', 'c6r1'], patternOwner: 'opp' });
  assert.ok(!tags.some((t) => t.kind === 'double_threat'),
    'overlay must not appear when the disc pattern does not exist yet');
});

test('FR-010: the SAME pattern surfaces once its discs actually exist (mirror of the suppression case)', () => {
  const tags = tagBoard('33432', 2, { patternTag: 'double_threat', patternCompletingCell: 'c2r1',
    patternWindow: ['c2r1', 'c6r1'], patternOwner: 'opp' });
  assert.ok(tags.some((t) => t.kind === 'double_threat'),
    'overlay must appear once the pattern is genuinely board-true');
});

test('no minor threats leak into the tag set', () => {
  // A lone 2-in-a-row must NOT produce a tag (minors excluded).
  const tags = tagBoard('0102', 1); // col0: p1 at r0,r1 only (2 discs) -> minor, not major
  assert.equal(tags.filter((t) => t.owner === 'you').length, 0);
});

test('tagBoard: every major/immediate tag carries the 4-cell line it completes', () => {
  // 315444233213 (spec-058 feedback board 2), perspective player 1.
  const tags = tagBoard('315444233213', 1);
  const majors = tags.filter((t) => t.kind === 'major' || t.kind === 'immediate');
  assert.ok(majors.length > 0, 'fixture must actually contain a major/immediate tag');
  for (const t of majors) {
    assert.ok(Array.isArray(t.lineWindow) && t.lineWindow.length === 4,
      `${t.owner} ${t.kind} at ${t.cell} has no 4-cell lineWindow`);
    assert.ok(t.lineWindow.includes(t.cell), 'the completing cell must be a member of its own line');
  }
  // `window` must stay absent on major/immediate so tagSpec/renderThreatList are untouched.
  for (const t of majors) assert.equal(t.window, undefined);
});

// ── FR-010 corpus-wide (T019) — every tactic overlay's discs actually exist on its own board ──────
//
// Deterministic, model-free, through the production render function (FR-031). Two directions, both
// checked against the INDEPENDENT production detector (detectFigure7 / detectDoubleThreat, I12 —
// never a hand-rolled proxy), bypassing tagBoard so the check cannot pass merely because tagBoard
// produced it:
//  1. If the decision board ever DOES carry a figure_7/double_threat overlay tag, the detector must
//     confirm it on that exact board (no false positive can survive).
//  2. Corpus-wide (13 records carry a vector-named fork half — eval-42/43/44/46/47/48/49/50,
//     pin-L1-completes-your-tactic, pin-L2-enabled-opponent, pin-L3-no-causation,
//     pin-branch-invariance-false, pin-branch-invariance-true-1), every half's pattern is realized
//     only on a LATER board (its own `finalMovestring`, verified — never the raw decision board), so
//     the corpus's own ground truth is that NONE of them are detector-confirmed on the decision
//     board today; this test asserts the render layer agrees (OI-204's exact regression: it used to
//     show all 13 unconditionally, board-false).
test('FR-010: every figure_7/double_threat overlay on every corpus board is independently detector-confirmed', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  let checkedHalves = 0;
  let foundOverlays = 0;
  const violations = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    let fv;
    try { fv = pruneVector(toNarratorVector(row.evidence)); } catch { continue; }
    let boards;
    try { boards = boardSelectionDecisions(fv); } catch { continue; }
    // Direction 1: any overlay tag actually rendered anywhere must be detector-confirmed on ITS OWN board.
    for (const b of boards) {
      if (!b.movestring) continue;
      for (const t of b.tags) {
        if (t.kind !== 'figure_7' && t.kind !== 'double_threat') continue;
        foundOverlays += 1;
        const player = t.owner === 'you' ? fv.player : 3 - fv.player;
        const boardObj = new Board(b.movestring);
        const detected = t.kind === 'figure_7' ? detectFigure7(boardObj, null, player)
          : detectDoubleThreat(boardObj, player);
        if (!detected.matched) {
          violations.push(`${row.id} / ${b.id}: ${t.kind} at ${t.cell} (owner ${t.owner}) rendered but NOT confirmed by the production detector`);
        }
      }
    }
    // Direction 2: for every half that NAMES a vector fork, the decision board must show the overlay
    // if and only if the detector independently confirms it there.
    const decision = boards.find((b) => b.id === 'decision');
    for (const [half, owner] of [[fv.lostResource, 'you'], [fv.opponentPunishment, 'opp']]) {
      if (!half || (half.tag !== 'figure_7' && half.tag !== 'double_threat')) continue;
      checkedHalves += 1;
      const player = owner === 'you' ? fv.player : 3 - fv.player;
      const boardObj = new Board(decision.movestring);
      const detected = half.tag === 'figure_7' ? detectFigure7(boardObj, null, player)
        : detectDoubleThreat(boardObj, player);
      const rendered = decision.tags.some((t) => t.kind === half.tag && t.owner === owner);
      if (detected.matched !== rendered) {
        violations.push(`${row.id}: ${half.tag} (${owner}) detector=${detected.matched} but rendered=${rendered}`);
      }
    }
  }
  assert.ok(checkedHalves > 0, 'expected at least one corpus record naming a vector-named fork half');
  assert.equal(foundOverlays, 0,
    'sanity: no corpus record\'s pattern half is board-true on the decision board today — if this ' +
    'changes, the FR-010 direction-1 loop above is exercised for the first time; do not weaken it');
  assert.deepEqual(violations, [], `FR-010 violations:\n${violations.join('\n')}`);
});

// ── FR-009 corpus-wide (T019) — L3's immediate_threat-grain claim matches its board's own grain ──
//
// classifyCausalLink is the production render function; grainOf (reasonBoardTags.mjs) is the same
// detector the rendered Tactics list uses. Independently verified: whenever the composed L3 text says
// "next move", the opponent's completingCell must actually be gravity-top ('immediate' grain) on the
// decision board it is checked against.
test('FR-009: an L3 "next move" claim always matches the decision board\'s own grain for that cell', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  let checkedL3 = 0;
  const violations = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    let fv;
    try { fv = pruneVector(toNarratorVector(row.evidence)); } catch { continue; }
    const ctx = fv.direction === 'enabled_opponent' ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
    let link;
    try { link = classifyCausalLink(fv, ctx); } catch { continue; }
    if (link.id !== 'L3') continue;
    checkedL3 += 1;
    const cell = fv.opponentPunishment?.completingCell;
    if (/next move/.test(link.text)) {
      const grain = grainOf(fv.movestring, fv.player, cell, 'opp');
      if (grain !== 'immediate') {
        violations.push(`${row.id}: L3 claims "next move" at ${cell} but decision-board grain is ${grain}`);
      }
    }
  }
  assert.ok(checkedL3 > 0, 'expected at least one corpus record routed to L3 (e.g. eval-37)');
  assert.deepEqual(violations, [], `FR-009 violations:\n${violations.join('\n')}`);
});
