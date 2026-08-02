// Spec 053 US5 (T059/T061) — pure sessionStorage-carrier logic for src/lib/pendingSetResults.js.
// The JSX-mounting half of T061 (PostSetSummaryScreen.jsx restoring on a genuine cold boot) lives
// in tests/dom/PostSetSummaryScreenPendingResults.dom.test.jsx — this plain node:test file cannot
// parse JSX (see reference_inline_node_scripts / testing-conventions.md), so it covers only the
// carrier module itself: save/read/clear round trip, freshness expiry, and malformed-entry
// handling.
//
// T059 investigation record: the ORIGINAL/"preferred" carrier design — threading the T058 nonce
// through the checkout returnPath (`useUpgradeCheckout(returnPathOverride)` ->
// `POST /api/paddle/create-checkout`'s `{ plan, returnPath }`) — was investigated and REJECTED.
// Read at source, `src/lib/useUpgradeCheckout.js`'s `handleCheckoutCompleted` deliberately never
// forwards `successUrl` to `Paddle.Checkout.open()`; it closes the overlay itself once its own
// `verify-transaction` call resolves, specifically so Paddle's own redirect never fires
// (FR-003/US2 AC1). Nothing else in the app reads a Paddle return URL either (confirmed by grep:
// no caller reads `resultsNonce` or any Paddle-supplied return query param). A nonce embedded in
// `returnPath` would be written to the server and read by nobody — a carrier that looks plausible
// but is never read. CHOSEN INSTEAD: this module's plain self-validating sessionStorage entry
// (freshness timestamp only), with zero coupling to checkoutReturnFlow.js or the checkout
// returnPath.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  savePendingSetResults,
  readAndClearPendingSetResults,
  hasFreshPendingSetResults,
  clearPendingSetResults,
  PENDING_SET_RESULTS_MAX_AGE_MS,
} from '../../src/lib/pendingSetResults.js';

// tests/dom/setup.js registers a jsdom global for the DOM suite; this plain node:test file has no
// DOM at all, so provide a minimal sessionStorage stand-in (Map-backed) — enough for these pure
// save/read/clear round trips, matching this repo's existing "extract the pure logic, test it
// without a DOM" pattern used throughout tests/unit/.
function installFakeSessionStorage() {
  const backing = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => { backing.set(k, String(v)); },
    removeItem: (k) => { backing.delete(k); },
    clear: () => { backing.clear(); },
  };
  return backing;
}

test('save then read-and-clear round-trips the results/category and clears the entry', () => {
  installFakeSessionStorage();
  const results = [{ quality: 'optimal' }, { quality: 'blunder' }];
  savePendingSetResults({ results, category: 'undercut' });

  const restored = readAndClearPendingSetResults();
  assert.deepEqual(restored, { results, category: 'undercut' });

  // Cleared — a second read finds nothing.
  assert.equal(readAndClearPendingSetResults(), null);
});

test('an entry within the freshness window is reported fresh by hasFreshPendingSetResults (non-destructive)', () => {
  installFakeSessionStorage();
  savePendingSetResults({ results: [], category: 'undercut' });

  assert.equal(hasFreshPendingSetResults(), true);
  // Peeking must NOT clear it — a subsequent consuming read still finds it.
  const restored = readAndClearPendingSetResults();
  assert.ok(restored);
});

test('an entry older than the freshness window is rejected and cleared, not restored', () => {
  const backing = installFakeSessionStorage();
  const staleSavedAt = Date.now() - (PENDING_SET_RESULTS_MAX_AGE_MS + 1);
  backing.set('pendingSetResults', JSON.stringify({
    nonce: 'stale-nonce',
    results: [{ quality: 'optimal' }],
    category: 'undercut',
    savedAt: staleSavedAt,
  }));

  assert.equal(hasFreshPendingSetResults(), false);
  assert.equal(readAndClearPendingSetResults(), null);
  // The stale entry must be cleared by the consuming read, not left for a later misread.
  assert.equal(backing.has('pendingSetResults'), false);
});

test('a missing entry: hasFreshPendingSetResults is false and readAndClearPendingSetResults is null', () => {
  installFakeSessionStorage();
  assert.equal(hasFreshPendingSetResults(), false);
  assert.equal(readAndClearPendingSetResults(), null);
});

test('a malformed entry (wrong shape) is treated as absent, not thrown', () => {
  const backing = installFakeSessionStorage();
  backing.set('pendingSetResults', JSON.stringify({ nonce: 'x' })); // missing results/category/savedAt
  assert.equal(readAndClearPendingSetResults(), null);

  backing.set('pendingSetResults', 'not even json');
  assert.equal(readAndClearPendingSetResults(), null);
});

test('clearPendingSetResults removes an entry outright', () => {
  installFakeSessionStorage();
  savePendingSetResults({ results: [], category: 'undercut' });
  clearPendingSetResults();
  assert.equal(readAndClearPendingSetResults(), null);
});
