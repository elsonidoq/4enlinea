// connect-four/server/tests/reasonBoardSelect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderBoardAscii, renderThreatList, selectBoards, boardSelectionDecisions } from '../scripts/reasonBoardSelect.mjs';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { checkWin, parseBoardState } from '../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');

test('renderBoardAscii labels You/Opp and states the mapping', () => {
  const ascii = renderBoardAscii('01020', 1);
  assert.match(ascii, /Y = you \(player 1\)/);
  assert.match(ascii, /O = opponent/);
  assert.match(ascii, /c1 +c2/);      // header
  assert.match(ascii, /Y/);            // player1 discs shown as Y
});

test('renderThreatList renders one sentence per tag', () => {
  const line = renderThreatList([{ cell: 'c1r4', kind: 'immediate', owner: 'you' },
                                 { cell: 'c4r3', kind: 'figure_7', owner: 'opp', window: ['c6r1','c5r2','c4r3','c3r4'] }]);
  assert.match(line, /immediate at c1r4 \(you\)/);
  assert.match(line, /figure_7 at c4r3 \(opp, window c6r1·c5r2·c4r3·c3r4\)/);
  assert.equal(renderThreatList([]), '(no tactics)');
});

test('selectBoards includes decision always and omits an unchanged after-best', () => {
  // A decision board with no tactic; the best move adds none either => afterBest omitted.
  const fv = { movestring: '0', bestCol: 6, playedCol: 1, player: 1, opponent: 2,
               lostResource: { register: 'immediate' }, opponentPunishment: { register: 'immediate' } };
  const boards = selectBoards(fv);
  assert.ok(boards.find((b) => b.id === 'decision'));
  assert.ok(!boards.find((b) => b.id === 'afterBest'), 'unchanged afterBest should be omitted');
});

test('selectBoards adds a projected-deep board when a half is deep', () => {
  const fv = { movestring: '3', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
               lostResource: { register: 'parity', finalMovestring: '3333302' },
               opponentPunishment: { register: 'immediate' } };
  const boards = selectBoards(fv);
  assert.ok(boards.find((b) => b.id === 'projectedDeep'), 'deep resource => projected board present');
});

// T013 (FR-010, OI-204): the overlay is now gated on the PRODUCTION detector (detectFigure7 /
// detectDoubleThreat) actually matching on the board being tagged — an empty/fabricated movestring
// no longer surfaces a pattern that isn't board-true. These three fixtures were rewritten off a real,
// legally-played movestring (self-play random-legal-move search, not hand-built) where the pattern
// genuinely exists: '021220441263120' — detectFigure7(board, null, 1) matches, threat cells c4r3/c4r4.
test('surfaces the vector-named fork pattern on the decision board, owner from the half', () => {
  const fv = { movestring: '021220441263120', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { kind: 'denial', completingCell: 'c3r1', window: ['c2r1','c3r1','c4r1','c5r1'] },
    opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c4r3',
                          window: ['c4r3','c4r4'] } };
  const decision = selectBoards(fv).find((b) => b.id === 'decision');
  const fig = decision.tags.find((t) => t.kind === 'figure_7');
  assert.ok(fig, 'figure_7 tag present on decision board');
  assert.equal(fig.cell, 'c4r3');
  assert.equal(fig.owner, 'opp');                 // pattern on opponentPunishment => opponent's
  assert.deepEqual(fig.window, ['c4r3','c4r4']);
});

// '21444411562322311656615' — the D16 Case-A fork board (reasonEngine.test.mjs, sourced from
// computeReason('214444115623', 4).lostResource.finalMovestring). detectDoubleThreat(board, 1)
// genuinely matches there (gravity-top majors at c4r3/c6r4), so from player 1's own perspective this
// is a real 'you' double_threat overlay.
test('a named pattern on lostResource is owned by you (missed_own)', () => {
  const fv = { movestring: '21444411562322311656615', bestCol: 0, playedCol: 2, player: 1, opponent: 2,
    lostResource: { kind: 'realized_pattern', tag: 'double_threat', completingCell: 'c4r3',
                    window: ['c4r3','c6r4'] },
    opponentPunishment: { kind: 'denial', completingCell: 'c3r1' } };
  const dbl = selectBoards(fv).find((b) => b.id === 'decision').tags.find((t) => t.kind === 'double_threat');
  assert.ok(dbl);
  assert.equal(dbl.owner, 'you');
});

test('the named pattern does not corrupt Option-A board selection (baseline is structural)', () => {
  // '021220441263120' carries a real figure_7 overlay on the decision board (opponent's, verified
  // above), but Option-A selection compares STRUCTURAL tag sets only (tagBoard without opts) — col 0
  // adds no new major/immediate/double structural tag there (verified: tagKey(afterBest) equals
  // tagKey(decision)), so afterBest must still be omitted even though the decision board DISPLAYS
  // the overlay.
  const fv = { movestring: '021220441263120', bestCol: 0, playedCol: 4, player: 2, opponent: 1,
    opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c4r3',
                          window: ['c4r3','c4r4'] } };
  const boards = selectBoards(fv);
  assert.ok(boards.find((b) => b.id === 'decision').tags.some((t) => t.kind === 'figure_7'));
  assert.ok(!boards.find((b) => b.id === 'afterBest'), 'afterBest still omitted (structural unchanged)');
});

test('immediate_threat/forced_block tags are NOT overlaid (only fork tags surface)', () => {
  const fv = { movestring: '', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    opponentPunishment: { kind: 'realized_pattern', tag: 'immediate_threat', completingCell: 'c4r1',
                          window: ['c4r1','c4r2','c4r3','c4r4'] } };
  const decision = selectBoards(fv).find((b) => b.id === 'decision');
  assert.ok(!decision.tags.some((t) => t.kind === 'immediate_threat' && t.cell === 'c4r1'));
});

test('boardSelectionDecisions reports all four slots with shown flags', () => {
  // NV where afterBest changes nothing, afterPlayed changes the picture, resource is deep.
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5',
                    finalMovestring: '34133061334' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3' },
  };
  const d = boardSelectionDecisions(fv);
  assert.deepEqual(d.map((b) => b.id), ['decision', 'afterBest', 'afterPlayed', 'projectedDeep']);
  assert.equal(d.find((b) => b.id === 'decision').shown, true);
  assert.equal(d.find((b) => b.id === 'projectedDeep').shown, true); // deep resource → shown
  for (const b of d) assert.ok(typeof b.reason === 'string' && b.reason.length > 0);
});

test('selectBoards equals the shown subset of boardSelectionDecisions', () => {
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'immediate', completingCell: 'c6r5' },
    opponentPunishment: { kind: 'denial', completingCell: 'c3r3' },
  };
  const shownIds = boardSelectionDecisions(fv).filter((b) => b.shown).map((b) => b.id);
  const selIds = selectBoards(fv).map((b) => b.id);
  assert.deepEqual(selIds, shownIds);
});

// ── OI-190 — a per-half projected board ────────────────────────────────────────────────────────
//
// `deepHalf` used to `.find()` the FIRST deep half and build ONE shared `projectedDeep` board from
// its line. Any alias belonging to the OTHER half was then verified — and, since OI-196, restated in
// the required block — against a continuation it does not belong to. Measured corpus-wide: 38 of 63
// records have two deep halves, and in ALL 38 their `finalMovestring`s differ, so one half's cells
// were being pointed at a board they are not true on. Graded symptom on eval-11 / eval-20 (5/5):
// the opponent's completing cell is the PLAYER's own disc on the board actually shown, and the
// opponent's real four exists only on a line no board rendered at all.
test('OI-190: two deep halves with different lines get one projected board EACH', () => {
  const fv = { movestring: '34', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { register: 'forced_sequence', finalMovestring: '3433221100' },
    opponentPunishment: { register: 'forced_sequence', finalMovestring: '3444556611' } };
  const d = boardSelectionDecisions(fv);
  const deep = d.filter((b) => b.id.startsWith('projectedDeep'));
  assert.equal(deep.length, 2);
  assert.deepEqual(deep.map((b) => b.id), ['projectedDeep', 'projectedDeepOpp']);
  assert.equal(deep[0].movestring, '3433221100');   // lostResource's own line
  assert.equal(deep[1].movestring, '3444556611');   // opponentPunishment's own line
  for (const b of deep) { assert.equal(b.shown, true); assert.ok(b.ascii); }
});

test('OI-190: two deep halves sharing ONE line still render a single board', () => {
  const fv = { movestring: '34', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { register: 'forced_sequence', finalMovestring: '3433221100' },
    opponentPunishment: { register: 'parity', finalMovestring: '3433221100' } };
  const deep = boardSelectionDecisions(fv).filter((b) => b.id.startsWith('projectedDeep'));
  assert.equal(deep.length, 1);
  assert.equal(deep[0].id, 'projectedDeep');
});

test('OI-190: a single deep half is unchanged — still exactly one `projectedDeep`', () => {
  const fv = { movestring: '3', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { register: 'parity', finalMovestring: '3333302' },
    opponentPunishment: { register: 'immediate' } };
  const deep = boardSelectionDecisions(fv).filter((b) => b.id.startsWith('projectedDeep'));
  assert.equal(deep.length, 1);
  assert.equal(deep[0].id, 'projectedDeep');
  assert.equal(deep[0].movestring, '3333302');
});

test('OI-190: when only the opponent half is deep, its line owns the plain `projectedDeep` id', () => {
  const fv = { movestring: '3', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { register: 'immediate' },
    opponentPunishment: { register: 'forced_sequence', finalMovestring: '3444556611' } };
  const deep = boardSelectionDecisions(fv).filter((b) => b.id.startsWith('projectedDeep'));
  assert.equal(deep.length, 1);
  assert.equal(deep[0].id, 'projectedDeep');
  assert.equal(deep[0].movestring, '3444556611');
});

test('OI-190: no deep half still emits the single unshown placeholder', () => {
  const fv = { movestring: '3', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { register: 'immediate' }, opponentPunishment: { register: 'immediate' } };
  const deep = boardSelectionDecisions(fv).filter((b) => b.id.startsWith('projectedDeep'));
  assert.equal(deep.length, 1);
  assert.equal(deep[0].shown, false);
});

// ── FR-008 / OI-203 / T012 / T018 — corpus-wide: a terminal afterBest never carries a live threat ──
//
// Deterministic, model-free, through the production render function — no LLM call (FR-031). Loads
// the same 63-record `evidence.jsonl` corpus other US2/US3 tests use, runs each record through
// toNarratorVector -> pruneVector -> boardSelectionDecisions (the real production path), and
// independently re-derives terminality via the production `checkWin` — never trusting the `terminal`
// flag `boardSelectionDecisions` itself sets, so this test cannot pass by construction.
test('FR-008: a terminal afterBest board never carries a live threat entry (corpus-wide)', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(rows.length >= 25, `expected the full corpus, got ${rows.length}`);
  let checkedTerminal = 0;
  const violations = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    let fv;
    try { fv = pruneVector(toNarratorVector(row.evidence)); } catch { continue; }
    if (fv.bestCol == null) continue;
    const ms0 = fv.movestring ?? '';
    const { colHeights } = parseBoardState(ms0);
    const landingRow = colHeights[fv.bestCol];
    if (landingRow == null || landingRow >= 6) continue; // column full — best move not applicable
    const { board: afterBoard } = parseBoardState(ms0 + String(fv.bestCol));
    const isTerminal = checkWin(afterBoard, landingRow, fv.bestCol, fv.player);
    const boards = boardSelectionDecisions(fv);
    const afterBest = boards.find((b) => b.id === 'afterBest');
    if (!afterBest) continue;
    if (isTerminal) {
      checkedTerminal += 1;
      if (afterBest.tags.length !== 0) {
        violations.push(`${row.id}: terminal afterBest carries ${afterBest.tags.length} tag(s)`);
      }
      if (afterBest.terminal !== true) {
        violations.push(`${row.id}: terminal afterBest not flagged terminal:true`);
      }
    } else if (afterBest.terminal === true) {
      violations.push(`${row.id}: non-terminal afterBest incorrectly flagged terminal:true`);
    }
  }
  assert.ok(checkedTerminal > 0, 'expected at least one corpus record with a terminal afterBest (e.g. eval-41)');
  assert.deepEqual(violations, [], `FR-008 violations:\n${violations.join('\n')}`);
});
