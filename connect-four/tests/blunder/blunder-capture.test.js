import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Unit tests for the blunder capture guard logic.
// Mirrors the server logic without running the full Express app.

function shouldInsertBlunder({ isSuccess, attemptNumber }) {
  return !isSuccess && attemptNumber === 1;
}

describe('blunder capture guard', () => {
  it('inserts blunder on first-attempt failure', () => {
    assert.equal(shouldInsertBlunder({ isSuccess: false, attemptNumber: 1 }), true);
  });

  it('does NOT insert blunder on second-attempt failure', () => {
    assert.equal(shouldInsertBlunder({ isSuccess: false, attemptNumber: 2 }), false);
  });

  it('does NOT insert blunder on first-attempt success', () => {
    assert.equal(shouldInsertBlunder({ isSuccess: true, attemptNumber: 1 }), false);
  });

  it('does NOT insert blunder on second-attempt success', () => {
    assert.equal(shouldInsertBlunder({ isSuccess: true, attemptNumber: 2 }), false);
  });
});
