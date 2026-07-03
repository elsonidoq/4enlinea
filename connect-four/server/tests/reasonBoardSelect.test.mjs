// connect-four/server/tests/reasonBoardSelect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBoardAscii, renderThreatList, selectBoards } from '../scripts/reasonBoardSelect.mjs';

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

test('surfaces the vector-named fork pattern on the decision board, owner from the half', () => {
  const fv = { movestring: '', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    lostResource: { kind: 'denial', completingCell: 'c3r1', window: ['c2r1','c3r1','c4r1','c5r1'] },
    opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c4r3',
                          window: ['c6r1','c5r2','c4r3','c3r4'] } };
  const decision = selectBoards(fv).find((b) => b.id === 'decision');
  const fig = decision.tags.find((t) => t.kind === 'figure_7');
  assert.ok(fig, 'figure_7 tag present on decision board');
  assert.equal(fig.cell, 'c4r3');
  assert.equal(fig.owner, 'opp');                 // pattern on opponentPunishment => opponent's
  assert.deepEqual(fig.window, ['c6r1','c5r2','c4r3','c3r4']);
});

test('a named pattern on lostResource is owned by you (missed_own)', () => {
  const fv = { movestring: '', bestCol: 1, playedCol: 4, player: 1, opponent: 2,
    lostResource: { kind: 'realized_pattern', tag: 'double_threat', completingCell: 'c2r1',
                    window: ['c2r1','c3r1','c4r1','c5r1'] },
    opponentPunishment: { kind: 'denial', completingCell: 'c3r1' } };
  const dbl = selectBoards(fv).find((b) => b.id === 'decision').tags.find((t) => t.kind === 'double_threat');
  assert.ok(dbl);
  assert.equal(dbl.owner, 'you');
});

test('the named pattern does not corrupt Option-A board selection (baseline is structural)', () => {
  // Empty decision board: no structural tactics; best/played add none either. Even though the
  // decision board DISPLAYS a figure_7 overlay, afterBest must still be omitted because its
  // structural tag-set matches the decision's structural tag-set.
  const fv = { movestring: '', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
    opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c4r3',
                          window: ['c6r1','c5r2','c4r3','c3r4'] } };
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
