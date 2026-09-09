// OI-172 — POST /api/scores must short-circuit an already-won position before calling the solver.
//
// Why this is a source-parse test and not an HTTP test: `server/index.js` boots the full
// production server (solver process, DB) at import time and exports no `app`, so the handler
// cannot be mounted. This mirrors, deliberately and verbatim in style, the existing FR-008
// board-full ordering test in tests/unit/scoresValidation.test.js — which documents the same
// limitation and the same failure mode: a guard placed AFTER solver.query() is unreachable,
// because c4solver-wrapper.js:25 throws `Invalid position` first and the handler's catch turns
// that into a generic 500. Order is the property under test, so order is what is asserted.
//
// The behavioural half (that the guard idiom actually recognises the OI-172 board) is asserted
// against the real `Board` from server/classifier.js, on the movestring harvested from the
// production log line `[scores] ... Invalid position` / `[evaluate-move] Invalid position:
// "323033131056600101424522"` and verified with ./visualize_board.sh (Move 24, [GAME OVER],
// Gray/P2 wins the col1r2–col4r5 diagonal).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Board } from '../../server/classifier.js';

const TERMINAL = '323033131056600101424522';
const LIVE = '32303313105660010142452';

test('fixture check: the OI-172 movestring really is terminal and the guard idiom sees it', () => {
  const won = new Board(TERMINAL);
  assert.equal(won.hasWon(1) || won.hasWon(2), true, `${TERMINAL} must be a won position`);
  assert.equal(won.hasWon(2), true, 'Gray (P2) is the winner on this board');

  const live = new Board(LIVE);
  assert.equal(live.hasWon(1) || live.hasWon(2), false, `${LIVE} must NOT be terminal`);
});

test('POST /api/scores: a won-position guard precedes solver.query (OI-172, endpoint level)', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../../server/index.js', import.meta.url)),
    'utf8',
  );

  const handlerStart = src.indexOf("app.post('/api/scores'");
  assert.ok(handlerStart > 0, "expected to find the POST /api/scores handler");
  const handler = src.slice(handlerStart, handlerStart + 3500);

  // Anchor on the guard EXPRESSION (hasWon), not on its error message — the message can also
  // appear in a comment or a catch branch, which would keep this green with the guard deleted.
  const guardIdx = handler.search(/hasWon\(/);
  const solverIdx = handler.indexOf('solver.query(moves)');

  assert.ok(guardIdx > 0, 'expected an explicit already-won (hasWon) check in the /api/scores handler');
  assert.ok(solverIdx > 0, 'expected the solver.query(moves) call in the /api/scores handler');
  assert.ok(
    guardIdx < solverIdx,
    'the already-won guard must run BEFORE solver.query — after it, the wrapper has already thrown "Invalid position" and the handler returns a generic 500',
  );

  // The existing board-full guard is scoped to the sparring path (`difficulty !== undefined`).
  // A won-but-not-full board is the OI-172 case and reaches the solver on BOTH paths, so the new
  // guard must not be nested inside that same difficulty scope.
  const guardLine = handler.slice(handler.lastIndexOf('\n', guardIdx) + 1, handler.indexOf('\n', guardIdx));
  assert.ok(
    !/difficulty !== undefined/.test(guardLine),
    `the already-won guard must apply to the hint path too, not only the sparring path: ${guardLine.trim()}`,
  );
});
