// Spec 052 (Epic 2) US4 T050 — FR-021: candidate-generator.js's `cls.tag` consumer
// (`generateCandidates`, the `if (correctCols.length > 0) { const cls = classify(moveString,
// correctCols[0], scores); if (cls?.tag) tags.push(cls.tag); }` block, currently at
// server/candidate-generator.js:670-673) is NOT covered by `npm run test:fast` — its own test
// file (tests/integration/candidate-generator.test.js) is excluded from that script per
// CLAUDE.md's "Running tests" section (calls the real c4solver up to 400 times per test and
// frequently hangs on solver IPC deadlock).
//
// Solver-injection seam, verified before writing this test: `generateCandidates` (the function
// that contains the consumer) calls `createSolverProcess()` directly at its own top (no `solver`
// parameter — the process is spawned internally, not injected), so a parameter-level stub/mock
// is not available for that function. `classify()` itself, however, is a fully synchronous,
// solver-free function (server/classifier.js:730 `export function classify(moves, candidateCol,
// scores)`) — it never calls the solver; only later consumers of the candidate-generation
// pipeline (checkPredicate, computeHighlightCells) do. So this test takes the sanctioned
// alternative from tasks.md T050: construct a fixture board where classify()'s pure-geometry
// Category 3 gate is exercised directly, replicating the EXACT consumer snippet from
// candidate-generator.js (moveString/correctCols/scores -> classify -> tags.push(cls.tag)),
// with NO solver process spawned anywhere in this file.
//
// Fixture: harvested via server/gameSampling.js's playGame (see tests/classifier/classifier.test.js's
// 'classify() double_threat transition gating' describe block for the harvest provenance and RED
// evidence against the OLD boolean gate); solver scores were queried once, live, when harvesting,
// and are hardcoded here as historical values, not invented.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../../server/classifier.js';

// Mirrors candidate-generator.js's generateCandidates() consumer exactly:
//   const tags = [];
//   if (correctCols.length > 0) {
//     const cls = classify(moveString, correctCols[0], scores);
//     if (cls?.tag) tags.push(cls.tag);
//   }
function computeTagsLikeCandidateGenerator(moveString, correctCols, scores) {
  const tags = [];
  if (correctCols.length > 0) {
    const cls = classify(moveString, correctCols[0], scores);
    if (cls?.tag) tags.push(cls.tag);
  }
  return tags;
}

describe('candidate-generator.js cls.tag consumer (US4 T050, solver-free)', () => {
  test('a genuinely new, distinct fork (col5, alongside an existing cols 1/4 fork) tags as double_threat', () => {
    // Same board as classifier.test.js's US4 T046 fixture: mover already holds a fork in
    // 0-indexed cols 1 & 4; playing col5 creates a second, distinct fork.
    const moveString = '3332363356002460024262246611';
    const correctCols = [5];
    const scores = [6, 7, -1000, -1000, 7, 6, -1000];

    const tags = computeTagsLikeCandidateGenerator(moveString, correctCols, scores);
    assert.deepEqual(tags, ['double_threat']);
  });

  test('a persisting fork (no new columns) does NOT tag as double_threat — no regression', () => {
    // Same board as classifier.test.js's US4 T047 fixture: fork persists in cols 0 & 5 both
    // before and after; must not fire double_threat under the new diff either.
    const moveString = '42442343253231013316641411622605';
    const correctCols = [6];
    const scores = [5, -1000, -1000, -1000, -1000, 5, 4];

    const tags = computeTagsLikeCandidateGenerator(moveString, correctCols, scores);
    assert.equal(tags.includes('double_threat'), false);
  });

  test('empty correctCols never calls classify() — tags stays empty (existing guard, unaffected by US4)', () => {
    const tags = computeTagsLikeCandidateGenerator('3344', [], [-4, -3, 18, 2, 2, 18, -3]);
    assert.deepEqual(tags, []);
  });
});
