import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { evaluatePredicate } from '../../server/predicates.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(__dir, 'fixtures/fixtures.json'), 'utf8')
);

describe('evaluatePredicate()', () => {
  for (const fix of fixtures) {
    test(fix.description, () => {
      const result = evaluatePredicate(fix.puzzle, fix.candidateCol, fix.scores);
      assert.equal(
        result.result,
        fix.expectedResult,
        `Expected result "${fix.expectedResult}" but got "${result.result}" (correctCol: ${result.correctCol})`
      );
    });
  }
});

describe('evaluatePredicate() edge cases', () => {
  test('returns wrong for unknown category', () => {
    const puzzle = { id: 99, category: 99, moveString: '44', goalPredicateType: 'unknown' };
    const result = evaluatePredicate(puzzle, 3, [0, 0, 0, 5, 0, 0, 0]);
    assert.equal(result.result, 'wrong');
  });

  test('cat 1 returns correctCol when result is wrong', () => {
    const puzzle = { id: 1, category: 'immediate_threat', moveString: '112233', goalPredicateType: 'immediate_win' };
    const result = evaluatePredicate(puzzle, 0, [-2, -1, -1, 18, -2, -2, -3]);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 3);
  });

  test('forced_win handles all-equal negative scores as tied', () => {
    const puzzle = { id: 5, category: 'forced_win', moveString: '44444', goalPredicateType: 'forced_win' };
    const scores = [-1, -1, -1, -1, -1, -1, -1];
    const result = evaluatePredicate(puzzle, 0, scores);
    // All equal: any move is "correct" (tied)
    assert.ok(result.result === 'correct' || result.result === 'tied');
  });
});

// ── HTTP regression: single-move categories unaffected by interaction_mode guard ──────
// Verifies that /check still evaluates single_move puzzles correctly and does NOT
// return any interaction_mode-related error.

const singleMoveFixtures = [
  {
    id: 'reg-imm-1',
    category: 'immediate_threat',
    interaction_mode: 'single_move',
    move_string: '112233',
    scores: [-2, -1, -1, 18, -2, -2, -3],
    candidateCol: 3,
    expectedResult: 'correct',
  },
  {
    id: 'reg-fb-1',
    category: 'forced_block',
    interaction_mode: 'single_move',
    move_string: '11224',
    scores: [-18, -18, 0, -18, -18, -18, -18],
    candidateCol: 2,
    expectedResult: 'correct',
  },
  {
    id: 'reg-dt-1',
    category: 'double_threat',
    interaction_mode: 'single_move',
    move_string: '4455',
    scores: [-4, -3, 18, 2, 2, 18, -3],
    candidateCol: 2,
    expectedResult: 'tied',
  },
];

function buildCheckApp() {
  const app = express();
  app.use(express.json());

  const puzzleStore = Object.fromEntries(singleMoveFixtures.map(f => [f.id, f]));

  app.post('/api/puzzles/:id/check', (req, res) => {
    const puzzle = puzzleStore[req.params.id];
    if (!puzzle) return res.status(404).json({ error: 'puzzle not found' });

    if (puzzle.interaction_mode === 'sequence') {
      return res.status(400).json({ error: 'Use /sequence/move for sequence-mode puzzles' });
    }

    const { candidateCol } = req.body;
    if (typeof candidateCol !== 'number' || candidateCol < 0 || candidateCol > 6) {
      return res.status(400).json({ error: 'candidateCol must be integer 0-6' });
    }

    const puzzleObj = {
      id: puzzle.id,
      category: puzzle.category,
      moveString: puzzle.move_string,
      goalPredicateType: puzzle.category,
    };
    const evaluation = evaluatePredicate(puzzleObj, candidateCol, puzzle.scores);
    res.json({ result: evaluation.result, correctCol: evaluation.correctCol ?? null });
  });

  return app;
}

let checkServer;
let checkBaseUrl;

before(() => new Promise(resolve => {
  checkServer = createServer(buildCheckApp());
  checkServer.listen(0, () => {
    checkBaseUrl = `http://localhost:${checkServer.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => checkServer.close(resolve)));

describe('/check endpoint — regression: single-move categories unaffected', () => {
  for (const fix of singleMoveFixtures) {
    test(`${fix.category} (${fix.move_string}): /check returns ${fix.expectedResult}, no interaction_mode error`, async () => {
      const res = await fetch(`${checkBaseUrl}/api/puzzles/${fix.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateCol: fix.candidateCol }),
      });
      assert.equal(res.status, 200, 'should return 200 not a mode-related error');
      const body = await res.json();
      assert.ok(!body.error, `should not have error field; got: ${body.error}`);
      assert.equal(body.result, fix.expectedResult);
    });
  }
});
