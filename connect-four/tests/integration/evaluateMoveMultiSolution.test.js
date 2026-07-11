// Spec 044 (Epic 4) US3 / T022 — client-server parity check for the multi-solution `accepted`
// field on POST /api/evaluate-move (SC-003, Edge Case 5).
//
// This project's test:fast harness is plain node:test with no jsdom/React-Testing-Library
// component-rendering infrastructure (verified: no @testing-library dependency, no jsdom setup
// anywhere in the repo), and server/index.js is a single monolithic file that calls app.listen()
// at import time with no exported `app` — booting the full production server inside a test is
// exactly what memory `project_integration_test_slowness` warns against. Rendering
// ChallengeScreen.jsx and observing a real browser network request (the strictest interpretation
// of T022) was therefore not automatable in this test file; see the handoff notes for the
// manual/app-qa follow-up this leaves open.
//
// What this test DOES verify, both real and load-bearing:
//   1. A static check on ChallengeScreen.jsx's actual source text confirming its
//      `/api/evaluate-move` fetch call body literally includes `movestring` and `category` — a
//      regression guard against the exact "orphaned-send" bug T022 is worried about (T021 reading
//      a response field the client never actually requested via a body the server needs).
//   2. A live Express route, built from the SAME imported production functions
//      (`evaluatePredicate`, `scoreMove`) that server/index.js's real `/api/evaluate-move` handler
//      uses, mounted with request/response wiring copied verbatim from that handler's `accepted`
//      computation (see server/index.js ~1599-1613) and driven with the EXACT request body shape
//      ChallengeScreen.jsx sends (`{ movestring, col, category }`) — confirming the server-computed
//      `accepted` field agrees with directly calling `evaluatePredicate` for the same board/column,
//      for a real multi-solution board sourced via playGame.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { evaluatePredicate } from '../../server/predicates.js';
import { scoreMove } from '../../server/moveQualityScorer.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const MULTI_SOLUTION_CATEGORIES = new Set(['immediate_threat', 'forced_block', 'double_threat']);

describe('ChallengeScreen.jsx source — request body shape guard (T015/T021 orphaned-send regression)', () => {
  test('the /api/evaluate-move fetch call body includes movestring and category', () => {
    const src = readFileSync(
      join(__dir, '../../src/screens/ChallengeScreen.jsx'),
      'utf8'
    );
    const fetchBlockMatch = src.match(/fetch\(`\$\{API\}\/api\/evaluate-move`[\s\S]{0,300}/);
    assert.ok(fetchBlockMatch, 'expected to find the /api/evaluate-move fetch call in ChallengeScreen.jsx');
    const block = fetchBlockMatch[0];
    assert.match(block, /movestring:\s*current\.move_string/, 'request body must send movestring');
    assert.match(block, /category:\s*effectiveCategory/, 'request body must send category');
  });

  test('handleColumnClick reads data.accepted for multi-solution categories, not a bare data.quality check', () => {
    const src = readFileSync(
      join(__dir, '../../src/screens/ChallengeScreen.jsx'),
      'utf8'
    );
    assert.match(src, /MULTI_SOLUTION_CATEGORIES\.has\(effectiveCategory\)/);
    assert.match(src, /data\.accepted === true/);
  });
});

// Mounts the SAME production functions server/index.js's /api/evaluate-move handler uses, wired
// the same way (see server/index.js ~1547-1616), so this is not a reimplementation of the
// business logic — only the express boilerplate (route registration, EMPTY_BOARD_SCORES,
// solver.query) is duplicated to avoid booting the full monolithic server.
function buildEvaluateMoveApp(solver) {
  const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
  const app = express();
  app.use(express.json());

  app.post('/api/evaluate-move', async (req, res) => {
    const { movestring, col, category } = req.body;
    const colInt = typeof col === 'number' ? col : parseInt(col, 10);

    const scores = movestring === '' ? EMPTY_BOARD_SCORES : await solver.query(movestring);
    const { badge, quality } = scoreMove(scores, colInt);

    let accepted = null;
    if (MULTI_SOLUTION_CATEGORIES.has(category)) {
      const predicateResult = evaluatePredicate({ category, moveString: movestring }, colInt, scores);
      accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied';
    }

    res.json({ badge, quality, accepted });
  });

  return app;
}

describe('POST /api/evaluate-move — accepted field agrees with evaluatePredicate for a real double_threat fork board', () => {
  let server, baseUrl;
  const solverStub = {
    // Deterministic stub avoids a live c4solver process for this parity check — the board below
    // (sourced via playGame during T019 fixture collection) is used with its already-captured
    // real solver scores, so no live solver call is needed to reproduce them.
    query: async () => [-2, -3, 1, -3, -3, 1, -2],
  };

  before(() => new Promise(resolve => {
    server = createServer(buildEvaluateMoveApp(solverStub));
    server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
  }));
  after(() => new Promise(resolve => server.close(resolve)));

  const ms = '333332'; // double_threat board, fork columns [2, 5] (see t019_multi_solution_search.mjs)

  test('a valid non-canonical fork column (col 5) is scored accepted:true — client and server never disagree', async () => {
    const body = { movestring: ms, col: 5, category: 'double_threat' };
    const res = await fetch(`${baseUrl}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(data.accepted, true);

    // Cross-check directly against evaluatePredicate for the exact same board/column.
    const direct = evaluatePredicate({ category: 'double_threat', moveString: ms }, 5, await solverStub.query(ms));
    assert.ok(direct.result === 'correct' || direct.result === 'tied');
  });

  test('a non-fork column (col 0) is scored accepted:false', async () => {
    const body = { movestring: ms, col: 0, category: 'double_threat' };
    const res = await fetch(`${baseUrl}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(data.accepted, false);
  });

  test('a single-answer category (z_threat) response has accepted:null (field is additive/gated, not universal)', async () => {
    const body = { movestring: ms, col: 2, category: 'z_threat' };
    const res = await fetch(`${baseUrl}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(data.accepted, null);
  });
});
