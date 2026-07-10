// Spec 043 US3 (FR-012..FR-016, contracts/post-login-return.md, research.md R3/R6)
//
// stashReturnTo/consumeReturnTo/clearReturnTo are pure sessionStorage-backed logic extracted
// into postLoginReturn.js so they're unit-testable with plain `node:test` (research.md R6's
// pure-function-extraction pattern, same split as boardA11y.js in US1).
//
// Structural note (handoff from Batch 1): postLoginReturn.js validates screenKey validity at
// consumption time against the same screen-key universe SCREENS is built from. Importing
// screenRegistry.jsx directly is NOT possible here — it transitively imports screen .jsx files,
// and `node --test` cannot parse JSX (confirmed empirically: "Unknown file extension .jsx").
// Rather than duplicating a hardcoded key list, postLoginReturn.js derives the valid-key set
// from URL_MAP in `src/lib/urlMapping.js` (already a plain-.js module, already the single
// source of truth mapping every URL to a screenKey, and every SCREENS key in screenRegistry.jsx
// has a corresponding URL_MAP entry — confirmed by inspection). This keeps `node:test`
// importability without introducing a second, driftable list of screen keys.
//
// sessionStorage stub: node:test has no browser globals. This repo has no existing
// sessionStorage/localStorage test shim to reuse, so we install a minimal in-memory
// Storage-like object on globalThis.sessionStorage before each test and clear it in a
// beforeEach/afterEach-free style (each test calls resetStorage() itself, keeping tests
// independent without relying on shared mutable module state across files).
import { test } from 'node:test';
import assert from 'node:assert/strict';

function installSessionStorageStub() {
  let store = new Map();
  globalThis.sessionStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  return () => store.clear();
}

const resetStorage = installSessionStorageStub();

const { stashReturnTo, consumeReturnTo, clearReturnTo } = await import('../../src/lib/postLoginReturn.js');

test('stashReturnTo -> consumeReturnTo round trip returns { screenKey, params } and deletes the key', () => {
  resetStorage();
  stashReturnTo('pastGames', { foo: 'bar' });
  assert.equal(globalThis.sessionStorage.getItem('postLoginReturnTo') !== null, true);

  const dest = consumeReturnTo();
  assert.deepEqual(dest, { screenKey: 'pastGames', params: { foo: 'bar' } });

  // read-once semantics: entry deleted
  assert.equal(globalThis.sessionStorage.getItem('postLoginReturnTo'), null);
});

test('stashReturnTo defaults params to {} when omitted', () => {
  resetStorage();
  stashReturnTo('stats');
  const dest = consumeReturnTo();
  assert.deepEqual(dest, { screenKey: 'stats', params: {} });
});

test('consumeReturnTo returns null when nothing is stashed', () => {
  resetStorage();
  assert.equal(consumeReturnTo(), null);
});

test('consumeReturnTo returns null (and deletes the entry) when the stashed screenKey is not a valid SCREENS key', () => {
  resetStorage();
  globalThis.sessionStorage.setItem('postLoginReturnTo', JSON.stringify({ screenKey: 'notAScreen', params: {} }));

  const dest = consumeReturnTo();
  assert.equal(dest, null);
  assert.equal(globalThis.sessionStorage.getItem('postLoginReturnTo'), null);
});

test('malformed JSON in the stashed value does not throw out of consumeReturnTo', () => {
  resetStorage();
  globalThis.sessionStorage.setItem('postLoginReturnTo', '{not valid json');

  assert.doesNotThrow(() => {
    const dest = consumeReturnTo();
    assert.equal(dest, null);
  });
  // also deleted so it isn't retried forever
  assert.equal(globalThis.sessionStorage.getItem('postLoginReturnTo'), null);
});

test('dismiss-then-unrelated-login regression: stash, clearReturnTo, then consumeReturnTo returns null', () => {
  resetStorage();
  stashReturnTo('pastGames');
  clearReturnTo();

  assert.equal(consumeReturnTo(), null);
});

test('clearReturnTo is a safe no-op when nothing was stashed', () => {
  resetStorage();
  assert.doesNotThrow(() => clearReturnTo());
  assert.equal(consumeReturnTo(), null);
});
