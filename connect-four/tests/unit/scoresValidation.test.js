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
