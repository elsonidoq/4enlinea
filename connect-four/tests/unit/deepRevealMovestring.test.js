// Regression test for OI-23 / FR-017 (spec 051 US3 Fix 3): the deep-reveal
// narration endpoint must accept the syntactically valid but empty move
// sequence (the opening move of a game, before any move has been played) as a
// legitimate input, not reject it as "missing".
//
// `GET /api/user/tts/deep-reveal` in server/index.js delegates its
// `moveString` query-param validation to `isValidDeepRevealMoveString`
// (server/deepRevealMoveStringGuard.mjs) — extracted per
// testing-conventions.md's Pure Function Extraction Pattern (there is no
// HTTP-level test harness for server/index.js: the Express app is not
// exported). This test exercises that exact exported function, which the
// route actually calls, not a route-local re-implementation.
//
// Pre-fix, the route's inline check was
// `if (!moveString || !/^[0-6]{0,42}$/.test(moveString))` — `!moveString` is
// true for the empty string (JS falsy), so the empty opening-move movestring
// was rejected as "missing" even though the regex itself (`{0,42}`, zero
// repetitions allowed) matches it. Confirmed RED against that literal
// pre-fix predicate before extraction/fix landed (see handoff notes).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDeepRevealMoveString } from '../../server/deepRevealMoveStringGuard.mjs';

describe('isValidDeepRevealMoveString (OI-23, FR-017)', () => {
  it('accepts the empty string — the opening move of a game', () => {
    assert.equal(isValidDeepRevealMoveString(''), true);
  });

  it('accepts a normal in-progress movestring', () => {
    assert.equal(isValidDeepRevealMoveString('34521'), true);
  });

  it('rejects a missing (undefined) moveString', () => {
    assert.equal(isValidDeepRevealMoveString(undefined), false);
  });

  it('rejects a non-string moveString', () => {
    assert.equal(isValidDeepRevealMoveString(123), false);
  });

  it('rejects non-digit characters', () => {
    assert.equal(isValidDeepRevealMoveString('abc'), false);
  });

  it('rejects a movestring longer than 42 characters', () => {
    assert.equal(isValidDeepRevealMoveString('1'.repeat(43)), false);
  });

  it('rejects digits outside 0-6', () => {
    assert.equal(isValidDeepRevealMoveString('789'), false);
  });
});
