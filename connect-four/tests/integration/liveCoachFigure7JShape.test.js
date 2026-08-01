// Spec 052 (Epic 2) US5 / T056 — live-coach recognition of figure_7 and j_shape via the REAL
// POST /api/evaluate-move endpoint (not a unit-level classify() call).
//
// D40 (docs/architecture/reason-DECISIONS.md) admitted only figure_7 and j_shape of the seven
// candidates (figure_7, j_shape, z_threat, undercut, overcut, odd_even_threat, claimeven) to
// live recognition — both are zero-solver-cost (pure geometry over the board, using an already-
// unused `_scores` argument) AND retain an explicit `perspective` parameter, which is what makes
// them the ONLY two candidates compatible, without any redesign, with the existing absent→present
// transition-gate shape (`classifier.js` Category 3/4, `if (hasX(nextBoard) && !hasX(board))`)
// classify()'s new Category 6 reuses verbatim (see classifier.js Category 6 comment).
//
// Each fixture board/column below is a REAL, solver-verified, legal (non-terminal) position —
// harvested via a brute-force scan of server/gameSampling.js's playGame() output (figure_7) and
// taken from docs-adjacent tests/blunder/fixtures/tagBlunderFixtures.json's
// "j_shape:missed_own" bin (j_shape) — never hand-constructed, per CLAUDE.md "When you need a
// concrete movestring". Scores are captured from a live c4solver query() call made during test
// authoring and hardcoded into a stub solver below (same pattern as
// tests/integration/evaluateMoveMultiSolution.test.js), so this suite needs no live solver
// process to run under `npm run test:fast`.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { createEvaluateMoveHandler } from '../../server/evaluateMoveHandler.js';

const i18nStub = {
  coach: { spoken: { figure_7: { suboptimal: { x: 'nice figure-7' } }, j_shape: { suboptimal: { x: 'nice j-shape' } } } },
  eval: {},
};

// board -> scores, captured live (see header). Every board is confirmed non-terminal and legal
// via ./visualize_board.sh before use.
const scoresByMove = {
  // figure_7 fixture: move 24 (Green/P1 to move), playing col 3 (0-indexed) newly creates a
  // figure_7 for the mover — confirmed via classify() returning {tag:'figure_7'} for exactly
  // this (board, col) pair during test authoring.
  '351430335544411144515000': [7, 7, 8, 7, -1000, 7, 7],
  // after the figure_7-creating move: used to confirm the pattern does NOT re-fire on a
  // subsequent move where it merely persists.
  '3514303355444111445150003': [-7, -7, -8, -7, -1000, -7, -8],

  // j_shape fixture (tagBlunderFixtures.json "j_shape:missed_own", source: harvestBlunders
  // seed=12345 game=18): move 6 (Green/P1 to move), playing col 4 (0-indexed) is the fixture's
  // own `correctCol` — the move that (per the fixture's own label) creates the j_shape the
  // blunderer missed.
  '333443': [-5, -3, -4, -5, -4, -5, -5],
  // after the j_shape-creating move: used for the persistence (no re-fire) check.
  '3334434': [-5, -3, -4, -5, -4, -5, -5],
};

const solverStub = {
  query: async (ms) => {
    if (!(ms in scoresByMove)) throw new Error(`unexpected movestring in test stub: "${ms}"`);
    return scoresByMove[ms];
  },
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver: solverStub, i18nTranslations: i18nStub }));
  return app;
}

async function post(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/evaluate-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

describe('POST /api/evaluate-move — live-coach figure_7/j_shape recognition (spec 052 US5, D40)', () => {
  let server, baseUrl;

  before(() => new Promise((resolve) => {
    server = createServer(buildApp());
    server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
  }));
  after(() => new Promise((resolve) => server.close(resolve)));

  test('figure_7: fires exactly once on creation, not on a later persisting move', async () => {
    const board = '351430335544411144515000';
    const creatingCol = 3;

    const created = await post(baseUrl, { movestring: board, col: creatingCol });
    assert.equal(created.patternTag, 'figure_7', 'the move that creates the figure_7 must be tagged figure_7');

    // A subsequent move on the post-creation board, where the figure_7 shape merely persists
    // (no new instance created), must NOT re-fire the tag.
    const nextBoard = board + creatingCol;
    const persisted = await post(baseUrl, { movestring: nextBoard, col: 1 });
    assert.notEqual(persisted.patternTag, 'figure_7', 'a move on a board where figure_7 already exists must not re-fire the tag');
  });

  test('j_shape: fires exactly once on creation, not on a later persisting move', async () => {
    const board = '333443';
    const creatingCol = 4;

    const created = await post(baseUrl, { movestring: board, col: creatingCol });
    assert.equal(created.patternTag, 'j_shape', 'the move that creates the j_shape must be tagged j_shape');

    const nextBoard = board + creatingCol;
    const persisted = await post(baseUrl, { movestring: nextBoard, col: 0 });
    assert.notEqual(persisted.patternTag, 'j_shape', 'a move on a board where j_shape already exists must not re-fire the tag');
  });
});
