// OI-172 — POST /api/evaluate-move must not hand an already-won position to the solver.
//
// Mounts the REAL createEvaluateMoveHandler factory over real HTTP, exactly like
// tests/integration/evaluateMoveStoredSet.test.js. The solver is a stub that reproduces
// c4solver-wrapper.js's real contract for this case verbatim: a position where either side has
// already won is rejected with `new Error('Invalid position: "<ms>"')` (c4solver-wrapper.js:25).
// That is the ONLY behaviour of the real wrapper this test depends on, and it is the behaviour
// OI-172 is about — the wrapper's rejection is correct and must not be weakened.
//
// FIXTURE (harvested from the OI-172 server log, then verified with ./visualize_board.sh):
//   terminal  '323033131056600101424522'  → "Move 24 | Next: Green [GAME OVER]" (Gray/P2 wins on
//             the col1r2 / col2r3 / col3r4 / col4r5 diagonal with move 24)
//   pre-move  '32303313105660010142452'   → "Move 23 | Next: Gray", NOT terminal
// The real request the app sends is { movestring: <pre-move>, col: 2, aiMove: true }: the pre-move
// board is perfectly legal, and it is classifyAiMove (classifyAiMove.js:29-32) that concatenates
// movestring + col and queries the TERMINAL 24-char board — which is exactly the string that
// appeared in the production log line `[evaluate-move] Invalid position: "3230331310566001014245
// 22"`. So the guard has to sit on the POST-move board, not only on the pre-move one.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { Board } from '../../server/classifier.js';
import { createEvaluateMoveHandler } from '../../server/evaluateMoveHandler.js';

const PRE_MOVE = '32303313105660010142452';
const WINNING_COL = 2;
const TERMINAL = PRE_MOVE + String(WINNING_COL); // '323033131056600101424522'

// Faithful stub of c4solver-wrapper.js: throws for an already-won position, returns a plausible
// score vector otherwise. Records every position it was asked about so the test can assert the
// terminal board was never sent.
function makeSolverStub() {
  const asked = [];
  return {
    asked,
    query: async (ms) => {
      asked.push(ms);
      const board = new Board(ms);
      if (board.hasWon(1) || board.hasWon(2)) {
        throw new Error(`Invalid position: "${ms}"`);
      }
      return [-1, 2, 6, 1, 0, -3, -4];
    },
  };
}

const i18nStub = { coach: {}, eval: {} };

async function post(handler, body) {
  const app = express();
  app.use(express.json());
  app.post('/api/evaluate-move', handler);
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: res.status, body: json, text };
  } finally {
    server.close();
  }
}

describe('POST /api/evaluate-move — terminal position (OI-172)', () => {
  test('the AI winning move is graded, not 500ed — the terminal post-move board never reaches the solver', async () => {
    const solver = makeSolverStub();
    const handler = createEvaluateMoveHandler({ solver, i18nTranslations: i18nStub, supabase: null });

    const { status, body, text } = await post(handler, {
      movestring: PRE_MOVE,
      col: WINNING_COL,
      aiMove: true,
    });

    assert.equal(status, 200, `expected 200, got ${status}: ${text}`);
    // The pre-move board is legal, so the move still gets a real quality/badge — the client
    // (useGameBoard.js commitAiMove) reads `quality` and would fall back to the neutral coach
    // pool if it were missing.
    assert.ok(body.quality !== undefined, 'expected a real `quality` on the winning AI move');
    // Nothing can be classified on a finished board.
    assert.equal(body.patternTag, null);
    assert.ok(
      !solver.asked.includes(TERMINAL),
      `the terminal position ${TERMINAL} must never be sent to the solver; asked=${JSON.stringify(solver.asked)}`,
    );
  });

  test('an already-won PRE-move position on the sparring path is a clean 400, never a 500', async () => {
    const solver = makeSolverStub();
    const handler = createEvaluateMoveHandler({ solver, i18nTranslations: i18nStub, supabase: null });

    const { status, body, text } = await post(handler, {
      movestring: TERMINAL,
      col: 4,
      aiMove: true,
    });

    assert.equal(status, 400, `expected 400, got ${status}: ${text}`);
    assert.match(body.error, /already over|already won/i);
    assert.ok(
      !solver.asked.includes(TERMINAL),
      `the terminal position must never be sent to the solver; asked=${JSON.stringify(solver.asked)}`,
    );
  });

  // Pins the scope of the guard above, so nobody widens it by accident. Several *taught* puzzle
  // boards are technically terminal — tests/integration/singleAnswerCategoriesAccepted.test.js's
  // figure_7 board '041015021326' prints "[GAME OVER]" under ./visualize_board.sh (P2 has five in
  // a row on the bottom rank) — and the puzzle/lesson grading path must keep grading them exactly
  // as it did before OI-172, on whatever scores it is given. (Whether such a board survives a
  // LIVE solver at all is a separate, pre-existing defect; see batch-C.md.)
  test('the puzzle grading path still grades a technically-terminal taught board (scope pin)', async () => {
    // Same stub shape as the single-answer tests: a stub that answers any board.
    const stub = { query: async () => [1, 2, 3, 4, 3, 2, 1] };
    const handler = createEvaluateMoveHandler({ solver: stub, i18nTranslations: i18nStub, supabase: null });

    const { status, body } = await post(handler, {
      movestring: '041015021326',
      col: 2,
      category: 'figure_7',
      correctCols: [2],
    });

    assert.equal(status, 200);
    assert.ok(body.quality !== undefined, 'taught-board grading must be unchanged by the OI-172 guard');
  });
});
