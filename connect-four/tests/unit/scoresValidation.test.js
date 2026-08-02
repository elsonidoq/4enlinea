import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMoves } from '../../server/validateMoves.mjs';

test('validateMoves: rejects non-digit garbage', () => {
  assert.ok(validateMoves('99abcXYZ!!'));
});

test('validateMoves: accepts a valid 22-move movestring', () => {
  assert.equal(validateMoves('4344333664113442316612'), null);
});

test('validateMoves: accepts the empty opening board', () => {
  assert.equal(validateMoves(''), null);
});

test('validateMoves: rejects column 7 (cols are 0-indexed 0-6)', () => {
  assert.ok(validateMoves('7'));
});

test('validateMoves: rejects non-string input with the exact type message', () => {
  assert.equal(validateMoves(123), 'moves must be a string');
});

test('validateMoves: rejects a 43-char all-digit string (bounded at 42 cells)', () => {
  const tooLong = '1'.repeat(43);
  assert.ok(validateMoves(tooLong));
});

// Spec 054 (Epic 4) FR-008 — endpoint-level guard for a full board.
//
// Why this test is a source-parse and not a unit test: chooseSparringMove's own
// NoLegalMoveError is already covered by tests/unit/chooseSparringMove.test.js, and that
// test was GREEN while POST /api/scores still returned 500 for a full board — because
// solver.query(moves) runs BEFORE chooseSparringMove and throws its own generic
// "Invalid position" first, so the NoLegalMoveError branch was unreachable from the
// endpoint. The unit test could not see that; only a curl against the running server
// could. server/index.js exports no testable `app`, so this asserts the ordering
// property directly against the shipped source: the board-full guard must appear
// BEFORE the solver.query call inside the handler.
test('POST /api/scores: the full-board guard precedes solver.query (FR-008, endpoint level)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(
    fileURLToPath(new URL('../../server/index.js', import.meta.url)),
    'utf8'
  );

  const handlerStart = src.indexOf("app.post('/api/scores'");
  assert.ok(handlerStart > 0, "expected to find the POST /api/scores handler");
  const handler = src.slice(handlerStart, handlerStart + 3000);

  // Anchor on the guard's own board-full EXPRESSION, not on its error message — the
  // message also appears in this handler's NoLegalMoveError catch branch and in the
  // explanatory comment, so matching the string stays green even with the guard deleted
  // (verified: it did).
  const guardIdx = handler.search(/colHeights\.every\(/);
  const solverIdx = handler.indexOf('solver.query(moves)');

  assert.ok(guardIdx > 0, 'expected an explicit board-full colHeights check in the /api/scores handler');
  assert.ok(solverIdx > 0, 'expected a solver.query(moves) call in the /api/scores handler');
  assert.ok(
    guardIdx < solverIdx,
    'the board-full guard must run BEFORE solver.query(moves) — otherwise the solver throws ' +
    'a generic "Invalid position" first and the endpoint returns 500 instead of the ' +
    'FR-008-mandated 400, which is exactly the bug QA found'
  );
});
