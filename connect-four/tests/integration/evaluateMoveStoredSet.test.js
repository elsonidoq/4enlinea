// Spec 051 (Epic 1) US3 T052 — proves the stored-set grading branch of POST /api/evaluate-move
// (server/evaluateMoveHandler.js, added T051) grades `accepted = correct_cols.includes(playedCol)`
// DIRECTLY, with `evaluatePredicate`/`buildPredicatePuzzle` (server/predicates.js) never invoked at
// all for that request — this is the concrete evidence for Decision D2a's "bypassed entirely," not
// merely "not needed for this case."
//
// Mounts the REAL createEvaluateMoveHandler factory (server/evaluateMoveHandler.js), not a
// reimplementation, exactly as tests/integration/evaluateMoveMultiSolution.test.js already does for
// the pre-existing computed-live branch. The only new wiring is a stub Supabase client passed
// through the factory's own `supabase` parameter (T050) and — for test (a) only — a module mock of
// server/predicates.js's two exports via node:test's experimental module-mocking API, which is why
// `--experimental-test-module-mocks` must be present wherever this file runs (added to `test` and
// `test:fast` in package.json in this same task).
//
// double_threat fork board '104300405142342531' / scores [-10, 11, 11, 10, -10, 11, -10] is the
// same real, already-captured board+scores pair evaluateMoveMultiSolution.test.js uses (fork
// columns [1, 2, 5], verified through classifier.js#detectDoubleThreat) — reused here rather than
// re-harvested, since this test only needs A movestring+scores pair a live solver stub can answer
// deterministically, not a specific pattern's semantics (the stored-set branch never consults the
// pattern evaluators at all).
import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';

const MS = '104300405142342531';
const SCORES = [-10, 11, 11, 10, -10, 11, -10];

const solverStub = {
  query: async (ms) => (ms === MS ? SCORES : [0, 0, 1, 2, 1, 0, 0]),
};

const i18nStub = { coach: {}, eval: {} };

// Tracks the requested id, since evaluateMoveHandler.js chains
// .select(...).eq('id', puzzleId).eq('is_active', true).single().
function makeTrackedSupabaseStub(rowsById) {
  return {
    from() {
      let requestedId;
      const chain = {
        select() { return chain; },
        eq(col, val) {
          if (col === 'id') requestedId = val;
          return chain;
        },
        async single() {
          const row = rowsById[requestedId];
          return { data: row ?? null };
        },
      };
      return chain;
    },
  };
}

function buildApp({ supabase }) {
  return async () => {
    const { createEvaluateMoveHandler } = await import(
      `../../server/evaluateMoveHandler.js?bust=${Math.random()}`
    );
    const app = express();
    app.use(express.json());
    app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver: solverStub, i18nTranslations: i18nStub, supabase }));
    return app;
  };
}

describe('POST /api/evaluate-move — stored-set grading branch (Spec 051 US3, T051/T052)', () => {
  describe('(a) non-null correct_cols grades directly; evaluatePredicate/buildPredicatePuzzle are NEVER called', () => {
    let server, baseUrl, mockCtx;

    before(async () => {
      const predicatesUrl = new URL('../../server/predicates.js', import.meta.url).href;
      mockCtx = mock.module(predicatesUrl, {
        namedExports: {
          evaluatePredicate: () => {
            throw new Error('evaluatePredicate must NOT be called on the stored-set branch (Decision D2a)');
          },
          buildPredicatePuzzle: () => {
            throw new Error('buildPredicatePuzzle must NOT be called on the stored-set branch (Decision D2a)');
          },
        },
      });

      const supabase = makeTrackedSupabaseStub({
        'puzzle-with-set': {
          id: 'puzzle-with-set',
          category: 'double_threat',
          move_string: MS,
          highlight_metadata: null,
          correct_cols: [1, 2, 5],
        },
      });

      const appFactory = buildApp({ supabase });
      const app = await appFactory();
      await new Promise((resolve) => {
        server = createServer(app);
        server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      });
    });

    after(async () => {
      mockCtx.restore();
      await new Promise((resolve) => server.close(resolve));
    });

    test('a column present in correct_cols grades accepted:true', async () => {
      const res = await fetch(`${baseUrl}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: 'ignored-by-branch', col: 5, category: 'ignored', puzzleId: 'puzzle-with-set' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.accepted, true);
    });

    test('a column absent from correct_cols grades accepted:false — still without calling the evaluators', async () => {
      const res = await fetch(`${baseUrl}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: 'ignored-by-branch', col: 0, category: 'ignored', puzzleId: 'puzzle-with-set' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.accepted, false);
    });
  });

  describe('(b) NULL correct_cols falls through to the computed-live branch (FR-024a)', () => {
    let server, baseUrl;

    before(async () => {
      const supabase = makeTrackedSupabaseStub({
        'puzzle-null-set': {
          id: 'puzzle-null-set',
          category: 'double_threat',
          move_string: MS,
          highlight_metadata: null,
          correct_cols: null,
        },
      });

      const appFactory = buildApp({ supabase });
      const app = await appFactory();
      await new Promise((resolve) => {
        server = createServer(app);
        server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      });
    });

    after(() => new Promise((resolve) => server.close(resolve)));

    test('grades via the computed-live branch (evaluatePredicate), using the row\'s own category/move_string', async () => {
      const res = await fetch(`${baseUrl}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Deliberately send a WRONG category/movestring in the body to prove the fallback sources
        // its inputs from the looked-up row, not from the request body.
        body: JSON.stringify({ movestring: '333332', col: 5, category: 'forbidden_columns', puzzleId: 'puzzle-null-set' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      // Fork column 5 on the double_threat board MS is a genuine fork column (see
      // evaluateMoveMultiSolution.test.js) — accepted should be true via the real evaluator.
      assert.equal(data.accepted, true);
    });

    test('a non-fork column on the row\'s real board grades accepted:false', async () => {
      const res = await fetch(`${baseUrl}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: '333332', col: 0, category: 'forbidden_columns', puzzleId: 'puzzle-null-set' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.accepted, false);
    });
  });

  // Revised after OI-84: an unresolvable puzzleId used to 404, which silently killed grading
  // feedback for every lesson confirmation challenge (all of whose authored puzzleIds resolve to
  // zero rows) and every DEV-injected board. It now falls through to the computed-live branch for
  // the same reason FR-024a makes a NULL correct_cols fail open — a live drill must never be
  // broken by a row the server can't find. The request body still carries everything computed-live
  // grading needs, so nothing is lost.
  describe('(c) an unresolvable puzzleId falls through to computed-live, it does not fail the request', () => {
    let server, baseUrl;

    before(async () => {
      const supabase = makeTrackedSupabaseStub({});
      const appFactory = buildApp({ supabase });
      const app = await appFactory();
      await new Promise((resolve) => {
        server = createServer(app);
        server.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      });
    });

    after(() => new Promise((resolve) => server.close(resolve)));

    test('grades 200 via the computed-live branch instead of 404-ing', async () => {
      const res = await fetch(`${baseUrl}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: MS, col: 5, category: 'double_threat', puzzleId: 'does-not-exist' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      // Graded, not errored: the computed-live branch produced a real verdict from the request
      // body's own movestring/category.
      assert.equal(data.error, undefined);
      assert.ok(typeof data.quality === 'string', 'expected a graded response with a quality verdict');
      // The response must still never leak the stored set (Decision D2b).
      assert.equal(data.correct_cols, undefined);
      assert.equal(data.correctCols, undefined);
    });
  });
});
