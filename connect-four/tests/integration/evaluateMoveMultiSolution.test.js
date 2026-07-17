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
import { createEvaluateMoveHandler } from '../../server/evaluateMoveHandler.js';

const __dir = dirname(fileURLToPath(import.meta.url));

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

  // Spec 049 (Epic 9) T016 — regression guard for the mandatory snake_case→camelCase remap
  // (T010). The client's local puzzle object (`current`, from GET /api/puzzles/draw) is
  // snake_case; the server's /api/evaluate-move handler reads camelCase (correctCol,
  // highlightMetadata). If a future edit drops this remap, every single-answer-category puzzle
  // silently fails closed (accepted:false for every attempt, indistinguishable from a genuine
  // wrong answer — no error, no 400) per FR-007. This asserts the remap fields are present in
  // the request-body construction, source-text only (mirrors the `data.accepted === true` check
  // above).
  test('the /api/evaluate-move request body remaps current.correct_col and current.highlight_metadata to camelCase', () => {
    const src = readFileSync(
      join(__dir, '../../src/screens/ChallengeScreen.jsx'),
      'utf8'
    );
    const fetchBlockMatch = src.match(/fetch\(`\$\{API\}\/api\/evaluate-move`[\s\S]{0,1200}/);
    assert.ok(fetchBlockMatch, 'expected to find the /api/evaluate-move fetch call in ChallengeScreen.jsx');
    const block = fetchBlockMatch[0];
    assert.match(block, /correctCol:\s*current\.correct_col/, 'request body must remap correctCol from current.correct_col');
    assert.match(block, /highlightMetadata:\s*current\.highlight_metadata/, 'request body must remap highlightMetadata from current.highlight_metadata');
  });

  // Spec 049 (Epic 9) T011/T012 — regression guard that SINGLE_ANSWER_CATEGORIES is imported
  // from the mirrored src/lib/categories.js registry and actually used to widen the accepted
  // gate, not just imported and left dead.
  test('SINGLE_ANSWER_CATEGORIES is imported and used to widen the accepted gate', () => {
    const src = readFileSync(
      join(__dir, '../../src/screens/ChallengeScreen.jsx'),
      'utf8'
    );
    // Tolerates SINGLE_ANSWER_CATEGORIES being imported alongside other named exports
    // (e.g. MULTI_SOLUTION_CATEGORIES) from the shared registry — asserts the symbol is imported
    // from src/lib/categories.js, not that it is the sole import.
    assert.match(src, /import\s*\{[^}]*\bSINGLE_ANSWER_CATEGORIES\b[^}]*\}\s*from\s*['"]\.\.\/lib\/categories\.js['"]/);
    assert.match(src, /SINGLE_ANSWER_CATEGORIES\.has\(effectiveCategory\)/);
  });
});

// Spec 049 (Epic 9) T009 — mounts the REAL extracted handler (createEvaluateMoveHandler from
// server/evaluateMoveHandler.js), not a hand-copied reimplementation, so this file exercises the
// actual production accepted-gate (T006), correctCol/highlightMetadata destructuring (T004), and
// buildPredicatePuzzle (T005) — closing critique B1/B2 (the prior buildEvaluateMoveApp copy had a
// hardcoded MULTI_SOLUTION_CATEGORIES-only gate and never threaded correctCol/highlightMetadata,
// so it could not exercise the single-answer-category fix at all).
const i18nStub = { coach: {}, eval: {} };

function buildEvaluateMoveApp(solver) {
  const app = express();
  app.use(express.json());
  app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver, i18nTranslations: i18nStub }));
  return app;
}

describe('POST /api/evaluate-move — accepted field agrees with evaluatePredicate for a real double_threat fork board', () => {
  let server, baseUrl;
  // Deterministic per-board scores stub avoids a live c4solver process for this parity check —
  // every board below is used with its already-captured real solver scores, so no live solver
  // call is needed to reproduce them. '333332' (T019 fixture) keeps its original single-board
  // shape; the two OI-1 z_threat repro boards (T009) are keyed explicitly since they carry
  // different real scores.
  const scoresByMove = {
    '333332': [-2, -3, 1, -3, -3, 1, -2],
    // OI-1 repro board 1 — scores from a live solver.query() call made during test authoring.
    '3333302444422222060315555054': [3, -1, -1000, -1000, 3, 3, 3],
    // OI-1 repro board 2.
    '3333334512266550121166': [4, 4, 8, -1000, -10, 4, 4],
  };
  const solverStub = {
    query: async (ms) => scoresByMove[ms] ?? scoresByMove['333332'],
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

  // Spec 049 (Epic 9) T009 — z_threat moved from the "always null" set to the "real accepted
  // value" set (research.md R9) once the accepted-gate widened (T006) to cover
  // SINGLE_ANSWER_CATEGORIES. Split into two tests using the two OI-1 repro boards
  // (docs/open_issues.md OI-1), reusing the same real taught-column metadata T008 sourced for
  // board 1 (server/evaluateMoveHandler.js / tests/integration/singleAnswerCategoriesAccepted.test.js) —
  // not re-derived here.
  test('z_threat OI-1 repro board 1: non-taught, score-tying column (col 0) is accepted:false', async () => {
    const board1 = '3333302444422222060315555054';
    // Real taught column sourced via detectZThreat against this exact board through the live
    // solver (see singleAnswerCategoriesAccepted.test.js's z_threat comment for the derivation).
    const highlightMetadata = { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 };
    const body = { movestring: board1, col: 0, category: 'z_threat', highlightMetadata };
    const res = await fetch(`${baseUrl}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(data.accepted, false);
  });

  test('z_threat OI-1 repro board 2: taught column (col 0) is accepted:true despite a below-max solver score', async () => {
    const board2 = '3333334512266550121166';
    const body = { movestring: board2, col: 0, category: 'z_threat', highlightMetadata: { column: 0 } };
    const res = await fetch(`${baseUrl}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(data.accepted, true);
  });
});
