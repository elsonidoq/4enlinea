import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage shim (repo pattern — see useLanguage.test.js).
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

const { canRevealAnon, markRevealedAnon } = await import('../../src/lib/anonDeepReveal.js');

describe('anonDeepReveal gate', () => {
  it('allows a reveal when none has been used', () => {
    assert.equal(canRevealAnon('3344:2'), true);
  });

  it('after marking, re-opening the SAME blunder stays free', () => {
    markRevealedAnon('3344:2');
    assert.equal(canRevealAnon('3344:2'), true);
  });

  it('after marking, a DIFFERENT blunder is gated', () => {
    markRevealedAnon('3344:2');
    assert.equal(canRevealAnon('5566:4'), false);
  });

  it('markRevealedAnon is idempotent — the first key wins', () => {
    markRevealedAnon('3344:2');
    markRevealedAnon('5566:4'); // must NOT overwrite
    assert.equal(canRevealAnon('3344:2'), true);
    assert.equal(canRevealAnon('5566:4'), false);
  });
});
