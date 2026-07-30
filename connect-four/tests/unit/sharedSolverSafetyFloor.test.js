// Spec 051 (Epic 1) T061 — proves FR-026's "no branch restates the rule" invariant AT THE CODE
// LEVEL: `isSolverSafe` (server/answerSetInvariant.js) is the ONLY definition of the relative
// solver-safety floor anywhere in server/, and every per-column safety check added in US1/US2
// (the computed-live branch's `evalUndercut` in predicates.js, and the generation-time
// `checkUndercutPredicate` in candidate-generator.js) imports and calls that single shared
// function — never an independently-behaving copy that merely happens to agree today.
//
// `server/evaluateMoveHandler.js` is DELIBERATELY absent from every assertion below — per the
// handoff (FR-026): the stored-set branch does not call `isSolverSafe` at all, because the value
// it reads (`correct_cols`) was already produced by a writer (generation/backfill) that called it.
// Asserting evaluateMoveHandler.js imports it would be asserting a FALSE requirement.
//
// Two independent kinds of evidence:
//   (1) source inspection — every file that mentions `isSolverSafe` imports it from
//       answerSetInvariant.js; none defines a same-named or re-derived local copy.
//   (2) behavioral — mocking answerSetInvariant.js's `isSolverSafe` export (via node:test's
//       experimental module-mock API) changes the OUTPUT of both call sites, proving each one
//       actually invokes the shared reference at runtime rather than a copy that happens to
//       compute the same thing.
import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('../../server/', import.meta.url));
const readServerFile = (name) => fs.readFileSync(serverDir + name, 'utf8');

describe('FR-026 — isSolverSafe source inspection: one definer, two importers, no restatement', () => {
  test('answerSetInvariant.js is the sole `function isSolverSafe` definer in server/', () => {
    const files = fs.readdirSync(serverDir).filter(f => f.endsWith('.js'));
    const definers = files.filter(f => /function\s+isSolverSafe\s*\(/.test(readServerFile(f)));
    assert.deepEqual(definers, ['answerSetInvariant.js']);
  });

  test('predicates.js imports isSolverSafe from answerSetInvariant.js and defines no local copy', () => {
    const src = readServerFile('predicates.js');
    assert.match(
      src,
      /import\s*\{\s*isSolverSafe\s*\}\s*from\s*['"]\.\/answerSetInvariant\.js['"]/,
      'predicates.js must import the shared function, not restate it',
    );
    assert.doesNotMatch(src, /function\s+isSolverSafe\s*\(/, 'predicates.js must not define its own isSolverSafe');
  });

  test('candidate-generator.js imports isSolverSafe from answerSetInvariant.js and defines no local copy', () => {
    const src = readServerFile('candidate-generator.js');
    assert.match(
      src,
      /import\s*\{[^}]*\bisSolverSafe\b[^}]*\}\s*from\s*['"]\.\/answerSetInvariant\.js['"]/,
      'candidate-generator.js must import the shared function, not restate it',
    );
    assert.doesNotMatch(src, /function\s+isSolverSafe\s*\(/, 'candidate-generator.js must not define its own isSolverSafe');
  });

  test('exactly three server/ files reference isSolverSafe at all: the definer + its two importers', () => {
    const files = fs.readdirSync(serverDir).filter(f => f.endsWith('.js'));
    const referencers = files.filter(f => /isSolverSafe/.test(readServerFile(f))).sort();
    assert.deepEqual(referencers, ['answerSetInvariant.js', 'candidate-generator.js', 'predicates.js']);
  });

  test('evaluateMoveHandler.js (the stored-set branch) does NOT import or call isSolverSafe — safe by construction, per FR-026', () => {
    const src = readServerFile('evaluateMoveHandler.js');
    assert.doesNotMatch(src, /isSolverSafe/, 'the stored-set branch reads a value already gated at write time; it must not re-derive the floor');
  });
});

describe('FR-026 — behavioral: mocking the shared isSolverSafe intercepts BOTH the computed-live grading call site and the generation-time call site', () => {
  let mockCtx, calls;

  before(async () => {
    calls = [];
    const invariantUrl = new URL('../../server/answerSetInvariant.js', import.meta.url).href;
    const realInvariant = await import(invariantUrl);
    // Only col 0 is "safe" under this mock — arbitrary, chosen only to prove the two call sites
    // consume this exact function's decision rather than any independent logic.
    // `answerSetHolds` is passed through unmodified: it is candidate-generator.js's OTHER import
    // from this module (used elsewhere in the file, not by checkUndercutPredicate itself), and
    // node:test's module mock replaces the whole export set — omitting it would make
    // candidate-generator.js fail to import at all, for a reason unrelated to this test.
    mockCtx = mock.module(invariantUrl, {
      namedExports: {
        ...realInvariant,
        isSolverSafe: (col, scores) => {
          calls.push({ col, scores });
          return col === 0;
        },
      },
    });
  });

  after(() => {
    mockCtx.restore();
  });

  test('evalUndercut (computed-live grading branch, predicates.js) defers to the mocked isSolverSafe', async () => {
    const predicates = await import(`../../server/predicates.js?bust=${Math.random()}`);
    const puzzle = predicates.buildPredicatePuzzle('undercut', '334455221100', {
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 2, role: 'killing_threat' },
          { column: 3, row: 4, role: 'dead_threat' },
        ],
      },
    });
    const scores = [0, 0, 0, 0, 0, 0, 0]; // arbitrary and unused by the mock — real values would matter for the real function

    const callsBefore = calls.length;
    const acceptedCol0 = predicates.evaluatePredicate(puzzle, 0, scores);
    assert.equal(acceptedCol0.result, 'correct', 'col 0 must be graded correct — the mock says it is safe');
    assert.ok(calls.length > callsBefore, 'evalUndercut must have called the shared isSolverSafe, not a re-derivation');

    const rejectedCol1 = predicates.evaluatePredicate(puzzle, 1, scores);
    assert.equal(rejectedCol1.result, 'wrong', 'col 1 must be graded wrong — the mock says it is NOT safe, and a real independent copy would not agree by construction');
  });

  test('checkUndercutPredicate (generation-time, candidate-generator.js) defers to the mocked isSolverSafe', async () => {
    // Mock classifier.js's detectUndercutVictim so this stays a pure unit test (no solver) while
    // proving the SAME thing T061 needs: the generation-time per-column loop calls the shared
    // isSolverSafe rather than an independent copy. Board/colHeights are real (imported for real
    // before mocking) since checkUndercutPredicate reads them directly.
    const classifierUrl = new URL('../../server/classifier.js', import.meta.url).href;
    const realClassifier = await import(classifierUrl);
    const classifierMockCtx = mock.module(classifierUrl, {
      namedExports: {
        ...realClassifier,
        detectUndercutVictim: () => ({
          matched: true,
          highlightMetadata: {
            type: 'cells',
            cells: [
              { column: 6, row: 0, role: 'killing_threat' },
              { column: 6, row: 1, role: 'dead_threat' },
            ],
          },
          categoryEvidence: null,
        }),
      },
    });
    try {
      const cg = await import(`../../server/candidate-generator.js?bust=${Math.random()}`);
      const scores = [0, 0, 0, 0, 0, 0, 0]; // arbitrary — the mock ignores the values
      const callsBefore = calls.length;
      const result = cg.checkUndercutPredicate('', scores); // empty board: every column has room, killing col is 6 (mocked)
      assert.deepEqual(result.correctCols, [0], 'only col 0 passes the mocked isSolverSafe — proving the loop reads its verdict, not an independent copy');
      assert.ok(calls.length > callsBefore, 'checkUndercutPredicate must have called the shared isSolverSafe for each non-killing column');
    } finally {
      classifierMockCtx.restore();
    }
  });
});
