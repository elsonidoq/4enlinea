// Pure map test for evaluatePredicate's raw result vocabulary -> the stored
// puzzle_attempts.outcome enum (spec 054 US3, FR-015).
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so the map lives here and is unit-tested; index.js only wires it.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toStoredOutcome } from './outcomeVocabulary.js';

describe('toStoredOutcome', () => {
  it("maps evaluatePredicate's 'correct' -> 'correct_first'", () => {
    assert.equal(toStoredOutcome('correct'), 'correct_first');
  });
  it("maps evaluatePredicate's 'wrong' -> 'incorrect'", () => {
    assert.equal(toStoredOutcome('wrong'), 'incorrect');
  });
  it("maps evaluatePredicate's 'tied' -> 'tied' (unchanged)", () => {
    assert.equal(toStoredOutcome('tied'), 'tied');
  });
});
