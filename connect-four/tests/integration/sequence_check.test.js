// Integration tests for POST /api/puzzles/:id/sequence/move.
// Spins up a minimal in-process Express server with mock puzzle data.
// Covers: forcing move → continue, non-forcing → fail, double-threat → success,
//         anonymous caller → 403, free-tier caller → 403.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { ForcedWinStrategy, getAiResponseCol, countThreatsAfterMove, parseBoardState } from '../../server/completionStrategies.js';
import { checkWin } from '../../server/classifier.js';

// Test positions using the well-known double-threat setup '3344' (player 1 to move):
//   col 0 (0-indexed): no threat after → fail
//   col 1 (0-indexed): exactly 1 threat after (at col 2) → continue, aiCol=2
//   col 2 (0-indexed): 2 threats after → success
const TEST_PUZZLE_ID = 'test-seq-puzzle-1';
const TEST_PUZZLE_SINGLE_ID = 'test-single-puzzle-1';

const mockPuzzles = {
  [TEST_PUZZLE_ID]: {
    id: TEST_PUZZLE_ID,
    category: 'forced_win',
    interaction_mode: 'sequence',
  },
  [TEST_PUZZLE_SINGLE_ID]: {
    id: TEST_PUZZLE_SINGLE_ID,
    category: 'double_threat',
    interaction_mode: 'single_move',
  },
};

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Mock auth: paid-token → paid, free-token → free, else null
  app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth === 'Bearer paid-token') req.user = { tier: 'paid' };
    else if (auth === 'Bearer free-token') req.user = { tier: 'free' };
    else req.user = null;
    next();
  });

  function userCanAccess(user, category) {
    const PAID = new Set(['forced_win']);
    if (!PAID.has(category)) return true;
    return user?.tier === 'paid';
  }

  const POSITION_RE = /^[0-6]{0,41}$/;
  const strategy = new ForcedWinStrategy();

  app.post('/api/puzzles/:id/sequence/move', (req, res) => {
    const puzzle = mockPuzzles[req.params.id];
    if (!puzzle) return res.status(404).json({ error: 'puzzle not found' });

    const { position, col } = req.body;
    if (typeof position !== 'string' || !POSITION_RE.test(position)) {
      return res.status(400).json({ error: 'position must be a string of 0–41 digits 0–6' });
    }
    if (!Number.isInteger(col) || col < 0 || col > 6) {
      return res.status(400).json({ error: 'col must be an integer 0–6' });
    }
    if (puzzle.interaction_mode !== 'sequence') {
      return res.status(400).json({ error: 'Use /sequence/move for sequence-mode puzzles' });
    }

    const heights = Array(7).fill(0);
    for (const ch of position) heights[parseInt(ch, 10)]++;
    if (heights[col] >= 6) {
      return res.status(400).json({ error: 'Column is full' });
    }

    if (!userCanAccess(req.user, puzzle.category)) {
      return res.status(403).json({ error: 'This category requires a paid subscription' });
    }

    const { board: boardBefore, colHeights: heightsBefore } = parseBoardState(position);
    const learner = position.length % 2 === 0 ? 1 : 2;
    const winRow = heightsBefore[col];
    const boardForWin = boardBefore.map(r => [...r]);
    boardForWin[winRow][col] = learner;
    if (checkWin(boardForWin, winRow, col, learner)) {
      return res.json({ outcome: 'success' });
    }

    const result = strategy.validateMove(position, col);
    if (!result.valid) {
      return res.json({ outcome: 'fail', reason: result.reason });
    }

    const threatsAfter = countThreatsAfterMove(position, col);
    if (threatsAfter >= 2) {
      return res.json({ outcome: 'success' });
    }

    const posAfterLearner = position + String(col);
    const aiCol = getAiResponseCol(posAfterLearner);
    return res.json({ outcome: 'continue', aiCol });
  });

  return app;
}

let server;
let baseUrl;

before(() => new Promise(resolve => {
  server = createServer(buildTestApp());
  server.listen(0, () => {
    baseUrl = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => server.close(resolve)));

async function post(path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const PAID = { Authorization: 'Bearer paid-token' };
const FREE = { Authorization: 'Bearer free-token' };

// Position '3344': player 1 to move; no threats before move.
// col 1 (0-indexed) → 1 threat at col 2 → continue
// col 2 (0-indexed) → 2 threats → success
// col 0 (0-indexed) → 0 threats → fail

describe('POST /api/puzzles/:id/sequence/move', () => {
  test('(a) forcing move → outcome: continue with aiCol', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 1 },
      PAID,
    );
    assert.equal(status, 200);
    assert.equal(body.outcome, 'continue');
    assert.equal(typeof body.aiCol, 'number', 'aiCol must be a number');
    assert.equal(body.aiCol, 2, 'AI blocks at col 2 (the single threat)');
  });

  test('(b) non-forcing move → outcome: fail with reason', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 0 },
      PAID,
    );
    assert.equal(status, 200);
    assert.equal(body.outcome, 'fail');
    assert.equal(typeof body.reason, 'string');
    assert.ok(body.reason.length > 0);
  });

  test('(c) double-threat final move → outcome: success', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 2 },
      PAID,
    );
    assert.equal(status, 200);
    assert.equal(body.outcome, 'success');
  });

  test('(d) immediate win on final sequence step → outcome: success (not fail)', async () => {
    // Position '001122': P1 has 3 in a row at row 0 cols 0-2, so there is 1 immediate
    // threat before the move (col 3). Playing col 3 wins — should succeed, not be
    // rejected by validateMove's "no threat before move" guard.
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '001122', col: 3 },
      PAID,
    );
    assert.equal(status, 200);
    assert.equal(body.outcome, 'success');
  });

  test('(e) anonymous caller on forced_win puzzle → 403', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 2 },
      {},
    );
    assert.equal(status, 403);
    assert.equal(typeof body.error, 'string');
  });

  test('(f) free-tier caller on forced_win puzzle → 403', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 2 },
      FREE,
    );
    assert.equal(status, 403);
    assert.equal(typeof body.error, 'string');
  });

  test('single-move puzzle returns 400 on sequence/move', async () => {
    const { status, body } = await post(
      `/api/puzzles/${TEST_PUZZLE_SINGLE_ID}/sequence/move`,
      { position: '3344', col: 2 },
      PAID,
    );
    assert.equal(status, 400);
    assert.match(body.error, /sequence/i);
  });

  test('invalid position returns 400', async () => {
    const { status } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: 'abc', col: 2 },
      PAID,
    );
    assert.equal(status, 400);
  });

  test('invalid col returns 400', async () => {
    const { status } = await post(
      `/api/puzzles/${TEST_PUZZLE_ID}/sequence/move`,
      { position: '3344', col: 7 },
      PAID,
    );
    assert.equal(status, 400);
  });

  test('unknown puzzle id returns 404', async () => {
    const { status } = await post(
      '/api/puzzles/nonexistent/sequence/move',
      { position: '3344', col: 2 },
      PAID,
    );
    assert.equal(status, 404);
  });
});
