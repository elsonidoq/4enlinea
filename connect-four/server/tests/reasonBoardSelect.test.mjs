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
