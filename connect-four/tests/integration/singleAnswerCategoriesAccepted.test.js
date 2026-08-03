// Spec 049 (Epic 9) T008 — production-path coverage for the additive `accepted` field on
// POST /api/evaluate-move, for all six SINGLE_ANSWER_CATEGORIES (z_threat, overcut, claimeven,
// undercut, figure_7, j_shape). This mounts the REAL extracted handler
// (createEvaluateMoveHandler from server/evaluateMoveHandler.js) — not a hand-copied
// reimplementation — so the widened accepted-gate (T006), the correctCol/highlightMetadata
// destructuring (T004), and buildPredicatePuzzle (T005) are all exercised as actual production
// code, per the binding ordering in tasks.md (T003→T004→T005→T006→T007→T007a→T008/T009).
//
// Every category has BOTH a positive (accepted:true, taught column + real metadata) and a
// negative (accepted:false, real metadata + a genuinely non-pattern column) assertion — a suite
// that only asserted false/null, or that proved false via absent metadata, would not catch a
// broken client→server remap (see research.md R1/R1a "Critical correction").
//
// Boards are never hand-constructed (CLAUDE.md/I12) — every board below is either one of the two
// OI-1 repro boards (docs/open_issues.md) or sourced verbatim from an existing per-category
// integration test file (z_threat.test.js, claimeven.test.js, figure7_jshape.test.js,
// undercut_overcut.test.js).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { createEvaluateMoveHandler } from '../../server/evaluateMoveHandler.js';

// Minimal i18n translations stub — enough structure for pickFromPool() to resolve pools without
// throwing; the exact coach copy is irrelevant to this test's `accepted` assertions.
const i18nStub = { coach: {}, eval: {} };

function buildApp(solver) {
  const app = express();
  app.use(express.json());
  app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver, i18nTranslations: i18nStub }));
  return app;
}

async function postEvaluateMove(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/evaluate-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

describe('POST /api/evaluate-move — accepted for the six SINGLE_ANSWER_CATEGORIES (real extracted handler)', () => {
  let server, baseUrl;

  // Deterministic per-board score stub — each test supplies the real solver scores for its own
  // board (sourced from the live c4solver during test authoring; see per-board comments below),
  // keyed by the movestring the test sends, so no live solver process is needed here.
  const scoresByMove = {
    // z_threat OI-1 repro board 1 (docs/open_issues.md OI-1): scores from a live
    // `solver.query('3333302444422222060315555054')` call made during test authoring.
    '3333302444422222060315555054': [3, -1, -1000, -1000, 3, 3, 3],
    // z_threat OI-1 repro board 2.
    '3333334512266550121166': [4, 4, 8, -1000, -10, 4, 4],
    // claimeven fixture board (tests/integration/claimeven.test.js) — scores are irrelevant to
    // evalClaimeven (it only reads puzzle.correctCol), any placeholder array of length 7 works.
    '2122222445': [0, 0, 0, 0, 0, 0, 0],
    // figure_7 / j_shape pre-completion boards (tests/integration/figure7_jshape.test.js) —
    // scores are irrelevant to evalFigure7/evalJShape (they only read puzzle.correctCol).
    '041015021326': [0, 0, 0, 0, 0, 0, 0],
    '04101502': [0, 0, 0, 0, 0, 0, 0],
    // undercut/overcut fixture boards (tests/integration/undercut_overcut.test.js) — scores are
    // irrelevant to evalUndercut/evalOvercut (they only read puzzle.highlightMetadata.cells).
    '334455221100': [0, 0, 0, 0, 0, 0, 0],
    '33445522110033': [0, 0, 0, 0, 0, 0, 0],
  };

  const solverStub = {
    query: async (ms) => {
      const scores = scoresByMove[ms];
      if (!scores) throw new Error(`no stubbed scores for movestring ${ms}`);
      return scores;
    },
  };

  before(() => new Promise(resolve => {
    server = createServer(buildApp(solverStub));
    server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
  }));
  after(() => new Promise(resolve => server.close(resolve)));

  describe('z_threat', () => {
    // Real taught z-threat column for OI-1 repro board 1, sourced by running detectZThreat
    // (server/classifier.js) against this exact pre-move board through the live c4solver
    // (same pattern as tests/integration/z_threat.test.js), during test authoring:
    //   detectZThreat(new Board('3333302444422222060315555054'), scores)
    //     → { matched: true, highlightMetadata: { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 } }
    // Column 0 (played in the OI-1 repro) is confirmed NOT the taught column.
    const board1 = '3333302444422222060315555054';
    const board1Metadata = { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 };

    // Real taught z-threat column for OI-1 repro board 2, sourced the same way:
    //   detectZThreat(new Board('3333334512266550121166'), scores)
    //     → { matched: true, highlightMetadata: { type: 'capsule', column: 0, fromRow: 1, toRow: 3, badgeCount: 3 } }
    const board2 = '3333334512266550121166';
    const board2Metadata = { type: 'capsule', column: 0, fromRow: 1, toRow: 3, badgeCount: 3 };

    test('non-taught, score-tying column (col 0) is accepted:false', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: board1, col: 0, category: 'z_threat',
        highlightMetadata: board1Metadata,
      });
      assert.equal(data.accepted, false);
    });

    test('taught column (col 0), even though a below-max solver score, is accepted:true', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: board2, col: 0, category: 'z_threat',
        highlightMetadata: board2Metadata,
      });
      assert.equal(data.accepted, true);
    });
  });

  describe('claimeven', () => {
    // Sourced verbatim from tests/integration/claimeven.test.js's `evalClaimeven` fixtures:
    // moveString '2122222445', correctCol 2.
    const ms = '2122222445';
    const correctCol = 2;

    test('taught column is accepted:true', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: correctCol, category: 'claimeven', correctCols: [correctCol],
      });
      assert.equal(data.accepted, true);
    });

    test('non-pattern column is accepted:false', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: 5, category: 'claimeven', correctCols: [correctCol],
      });
      assert.equal(data.accepted, false);
    });
  });

  describe('figure_7', () => {
    // F7_PRE and correctCol sourced verbatim from tests/integration/figure7_jshape.test.js:27.
    const F7_PRE = '041015021326';
    const correctCol = 2;

    test('taught column is accepted:true', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: F7_PRE, col: correctCol, category: 'figure_7', correctCols: [correctCol],
      });
      assert.equal(data.accepted, true);
    });

    test('non-pattern column is accepted:false', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: F7_PRE, col: 0, category: 'figure_7', correctCols: [correctCol],
      });
      assert.equal(data.accepted, false);
    });
  });

  describe('j_shape', () => {
    // J_PRE and correctCol sourced verbatim from tests/integration/figure7_jshape.test.js:39.
    const J_PRE = '04101502';
    const correctCol = 1;

    test('taught column is accepted:true', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: J_PRE, col: correctCol, category: 'j_shape', correctCols: [correctCol],
      });
      assert.equal(data.accepted, true);
    });

    test('non-pattern column is accepted:false', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: J_PRE, col: 0, category: 'j_shape', correctCols: [correctCol],
      });
      assert.equal(data.accepted, false);
    });
  });

  describe('undercut', () => {
    // Fixture sourced verbatim from tests/integration/undercut_overcut.test.js's
    // 'evalUndercut — from highlightMetadata' block: moveString '334455221100',
    // killing_threat at column 3 / row 2 (dead_threat at column 3 / row 4).
    const ms = '334455221100';
    const highlightMetadata = {
      type: 'cells',
      cells: [
        { column: 3, row: 2, role: 'killing_threat' },
        { column: 3, row: 4, role: 'dead_threat' },
      ],
    };

    test('non-killing column is accepted:true (avoid-the-pattern semantics)', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: 0, category: 'undercut', highlightMetadata,
      });
      assert.equal(data.accepted, true);
    });

    test('killing column is accepted:false, exactly as before', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: 3, category: 'undercut', highlightMetadata,
      });
      assert.equal(data.accepted, false);
    });
  });

  describe('overcut', () => {
    // Fixture sourced verbatim from tests/integration/undercut_overcut.test.js's
    // 'evalOvercut — from highlightMetadata' block: moveString '33445522110033',
    // major_threat at column 4 / row 3 (neutralised_threat at column 4 / row 1).
    const ms = '33445522110033';
    const highlightMetadata = {
      type: 'cells',
      cells: [
        { column: 4, row: 1, role: 'neutralised_threat' },
        { column: 4, row: 3, role: 'major_threat' },
      ],
    };

    test('major_threat column is accepted:true', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: 4, category: 'overcut', highlightMetadata,
      });
      assert.equal(data.accepted, true);
    });

    test('non-major column is accepted:false', async () => {
      const data = await postEvaluateMove(baseUrl, {
        movestring: ms, col: 0, category: 'overcut', highlightMetadata,
      });
      assert.equal(data.accepted, false);
    });
  });
});
