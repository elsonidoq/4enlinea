// Unit tests for src/lib/entitlement.js (spec 053 US2, T020).
//
// getEntitlement() accepts injectable { fetchFn, now } seams (same pattern
// as fetchWithAuthRetry.js's injectable fetchFn) so these tests run without
// a real network or a real 5-minute wait. Each test resets the module-level
// cache singleton first via __resetEntitlementCacheForTests — mirrors
// checkoutReturnFlow.test.js's reset-before-each-test pattern for the same
// kind of module-level singleton store.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getEntitlement,
  invalidateEntitlement,
  clearEntitlement,
  __resetEntitlementCacheForTests,
  ENTITLEMENT_CACHE_TTL_MS,
} from '../../src/lib/entitlement.js';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  __resetEntitlementCacheForTests();
});

describe('getEntitlement (spec 053 T019/T020)', () => {
  it('cache-first: a second call within the TTL window returns the cached answer with no fetch', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return jsonResponse({ entitled: true, authenticated: true });
    };

    const t0 = 1_000_000;
    const first = await getEntitlement({ fetchFn, now: t0 });
    assert.deepEqual(first, { entitled: true });
    assert.equal(calls, 1);

    const second = await getEntitlement({ fetchFn, now: t0 + 1000 });
    assert.deepEqual(second, { entitled: true });
    assert.equal(calls, 1, 'second call within TTL must not fetch again');
  });

  it('fetch is triggered again once the TTL has expired', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return jsonResponse({ entitled: true, authenticated: true });
    };

    const t0 = 1_000_000;
    await getEntitlement({ fetchFn, now: t0 });
    assert.equal(calls, 1);

    // Still within TTL — no fetch.
    await getEntitlement({ fetchFn, now: t0 + ENTITLEMENT_CACHE_TTL_MS - 1 });
    assert.equal(calls, 1);

    // TTL window has fully elapsed — fetch again.
    await getEntitlement({ fetchFn, now: t0 + ENTITLEMENT_CACHE_TTL_MS + 1 });
    assert.equal(calls, 2, 'a fresh fetch must fire once the TTL window has elapsed');
  });

  it('a failed fetch falls back to the last known good value', async () => {
    const t0 = 1_000_000;
    let mode = 'ok';
    const fetchFn = async () => {
      if (mode === 'ok') return jsonResponse({ entitled: true, authenticated: true });
      throw new Error('network down');
    };

    await getEntitlement({ fetchFn, now: t0 });

    mode = 'fail';
    const result = await getEntitlement({ fetchFn, now: t0 + ENTITLEMENT_CACHE_TTL_MS + 1 });
    assert.deepEqual(result, { entitled: true }, 'must fail open to the last known good answer');
  });

  it('a failed fetch with no prior known-good answer resolves to {entitled:false}', async () => {
    const fetchFn = async () => { throw new Error('network down'); };
    const result = await getEntitlement({ fetchFn, now: 1_000_000 });
    assert.deepEqual(result, { entitled: false });
  });

  it('FR-033: an ambiguous {entitled:false,authenticated:false} answer after a prior entitled:true triggers exactly one session-refresh-and-retry cycle', async () => {
    const t0 = 1_000_000;
    const calls = [];
    let entitlementCallCount = 0;
    const fetchFn = async (url, options) => {
      calls.push({ url, method: options?.method });
      if (url.endsWith('/api/auth/refresh')) return jsonResponse({}, true, 204);
      entitlementCallCount += 1;
      // Call 1 (priming, at t0): entitled. Call 2 (post-TTL-expiry, at t1):
      // the ambiguous session-lapse shape. Call 3 (the post-refresh retry):
      // entitled again — the refresh reestablished the session.
      if (entitlementCallCount === 2) return jsonResponse({ entitled: false, authenticated: false });
      return jsonResponse({ entitled: true, authenticated: true });
    };

    // Prime lastKnownGood = entitled:true.
    await getEntitlement({ fetchFn, now: t0 });

    // Simulate the account's session having lapsed: the next fetch (post-TTL
    // expiry) returns the ambiguous shape, but the refresh-and-retry
    // succeeds and reports entitled:true again.
    const t1 = t0 + ENTITLEMENT_CACHE_TTL_MS + 1;
    const result = await getEntitlement({ fetchFn, now: t1 });

    assert.deepEqual(result, { entitled: true });
    const refreshCalls = calls.filter((c) => c.url.endsWith('/api/auth/refresh'));
    assert.equal(refreshCalls.length, 1, 'exactly one session-refresh call');
    const entitlementFetches = calls.filter((c) => c.url.endsWith('/api/user/entitlement'));
    // 1 (priming) + 1 (ambiguous) + 1 (post-refresh retry) = 3
    assert.equal(entitlementFetches.length, 3);
  });

  it('an ambiguous answer with no prior known-good skips the refresh entirely and returns {entitled:false} immediately', async () => {
    const t0 = 1_000_000;
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      return jsonResponse({ entitled: false, authenticated: false });
    };

    const result = await getEntitlement({ fetchFn, now: t0 });

    assert.deepEqual(result, { entitled: false });
    assert.equal(calls.some((u) => u.endsWith('/api/auth/refresh')), false, 'no prior entitled:true answer -> no refresh attempt');
  });

  it('Decision 2: refresh-and-retry still ambiguous after the bounded attempt -> keeps returning the stale entitled:true until the TTL naturally expires', async () => {
    const t0 = 1_000_000;
    const calls = [];
    let entitlementCallCount = 0;
    const fetchFn = async (url) => {
      calls.push(url);
      if (url.endsWith('/api/auth/refresh')) return jsonResponse({}, true, 204);
      entitlementCallCount += 1;
      if (entitlementCallCount === 1) return jsonResponse({ entitled: true, authenticated: true });
      // Every subsequent call (the post-TTL-expiry fetch AND the retry
      // after refresh) stays ambiguous — simulates a DB-outage-shaped
      // failure that refresh cannot fix.
      return jsonResponse({ entitled: false, authenticated: false });
    };

    // Prime lastKnownGood = entitled:true.
    await getEntitlement({ fetchFn, now: t0 });

    const t1 = t0 + ENTITLEMENT_CACHE_TTL_MS + 1;
    const result = await getEntitlement({ fetchFn, now: t1 });

    // Decision 2: downgrade NOT accepted — still entitled:true.
    assert.deepEqual(result, { entitled: true });
    const refreshCalls = calls.filter((c) => c.endsWith('/api/auth/refresh'));
    assert.equal(refreshCalls.length, 1, 'exactly one bounded refresh attempt, not a retry loop');

    // The failed refresh attempt re-pins the stale answer for a fresh TTL
    // window starting at t1 (see the "DO bump lastFetchedAt" comment in
    // entitlement.js) — calling again shortly after t1 must keep serving the
    // stale entitled:true with NO further fetch at all (no hammering the
    // server every call during an ongoing outage).
    const callsBeforeThirdCall = calls.length;
    const stillStale = await getEntitlement({ fetchFn, now: t1 + 1 });
    assert.deepEqual(stillStale, { entitled: true });
    assert.equal(calls.length, callsBeforeThirdCall, 'no new fetch within the re-pinned TTL window');

    // Only once a full TTL window has elapsed past t1 does a normal re-fetch
    // happen again.
    const t2 = t1 + ENTITLEMENT_CACHE_TTL_MS + 1;
    entitlementCallCount = 0; // reset so this next fetch reports entitled:true cleanly
    const fresh = await getEntitlement({ fetchFn, now: t2 });
    assert.deepEqual(fresh, { entitled: true });
  });

  it('invalidateEntitlement() forces the next call to fetch even within an unexpired TTL window', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return jsonResponse({ entitled: true, authenticated: true });
    };

    const t0 = 1_000_000;
    await getEntitlement({ fetchFn, now: t0 });
    assert.equal(calls, 1);

    invalidateEntitlement();

    // Still well within the TTL window by clock time, but invalidation must
    // force a fresh fetch anyway.
    await getEntitlement({ fetchFn, now: t0 + 1 });
    assert.equal(calls, 2, 'invalidateEntitlement must force a re-fetch even inside the TTL window');
  });

  // Regression: found in the spec 053 cross-batch review. The cache is
  // module-scoped, not account-scoped, so a sign-out that only cleared the
  // React session left the previous account's `entitled: true` in place. Worse
  // than an ordinary stale read: the post-sign-out fetch answers
  // {entitled:false, authenticated:false}, which the FR-033 branch reads as an
  // ambiguous session lapse and — per Decision 2 — re-pins for another full TTL
  // window, every window, forever. clearEntitlement() (called by
  // ProfileStore.signOut) is what bounds that.
  it('clearEntitlement() drops lastKnownGood, so a signed-out tab cannot keep serving the previous account as entitled', async () => {
    const paidFetch = async () => jsonResponse({ entitled: true, authenticated: true });
    // Post-sign-out: no session, so the server answers the ambiguous shape.
    const signedOutFetch = async () => jsonResponse({ entitled: false, authenticated: false });

    const t0 = 1_000_000;
    assert.deepEqual(await getEntitlement({ fetchFn: paidFetch, now: t0 }), { entitled: true });

    // Without the reset, this is the bug: past the TTL, the ambiguous answer
    // gets treated as a lapse and the stale `entitled: true` survives.
    const tLater = t0 + ENTITLEMENT_CACHE_TTL_MS + 1;
    assert.deepEqual(
      await getEntitlement({ fetchFn: signedOutFetch, now: tLater }),
      { entitled: true },
      'documents the pre-fix behavior the reset exists to prevent',
    );

    clearEntitlement();

    assert.deepEqual(
      await getEntitlement({ fetchFn: signedOutFetch, now: tLater + 1 }),
      { entitled: false },
      'after clearEntitlement there is no lastKnownGood to fail open to, so the signed-out answer stands',
    );
  });
});
