import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FREE_DEEP_REVEAL_WEEKLY_LIMIT, effectiveDeepRevealCount, peekQuota } from '../../server/quotaLimits.js';

test('the free weekly limit is 20 — matching what auth.deepRevealGate promises', () => {
  assert.strictEqual(FREE_DEEP_REVEAL_WEEKLY_LIMIT, 20);
});

test('a count inside the window is returned as-is', () => {
  const now = new Date('2026-07-16T00:00:00Z');
  const resetAt = new Date('2026-07-20T00:00:00Z');
  assert.strictEqual(effectiveDeepRevealCount({ count: 7, resetAt, now }), 7);
});

test('a stale count past the reset date normalizes to 0', () => {
  const now = new Date('2026-07-16T00:00:00Z');
  const resetAt = new Date('2026-07-13T00:00:00Z');
  assert.strictEqual(effectiveDeepRevealCount({ count: 19, resetAt, now }), 0);
});

test('a null resetAt is treated as already expired', () => {
  assert.strictEqual(effectiveDeepRevealCount({ count: 5, resetAt: null, now: new Date() }), 0);
});

// The following drive `peekQuota` — the actual read-only gate index.js calls
// at server/index.js:550 (`const gate = peekQuota(req.user)`). This is the
// production call site, not a reimplementation of the rule: index.js imports
// this exact function from quotaLimits.js. Pinning behavior here means the
// rule is exercised for real, not just in a helper nobody calls.

test('peekQuota: a free user past their reset date is allowed, even at/over the stored limit', () => {
  const user = {
    tier: 'free',
    deep_reveal_count: 25, // over the 20/week limit
    deep_reveal_reset_at: '2026-07-13T00:00:00Z', // in the past relative to "now" below
  };
  const now = new Date('2026-07-16T00:00:00Z');
  const result = peekQuota(user, now);
  assert.strictEqual(result.allowed, true);
});

test('peekQuota: a free user inside the window at the limit is not allowed', () => {
  const user = {
    tier: 'free',
    deep_reveal_count: 20,
    deep_reveal_reset_at: '2026-07-20T00:00:00Z', // still in the future
  };
  const now = new Date('2026-07-16T00:00:00Z');
  const result = peekQuota(user, now);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.resetsAt);
});

test('peekQuota: paid tier is always allowed regardless of count/reset', () => {
  const user = { tier: 'paid', deep_reveal_count: 999, deep_reveal_reset_at: '2020-01-01T00:00:00Z' };
  assert.deepStrictEqual(peekQuota(user), { allowed: true });
});

test('peekQuota: non-free/non-paid tier (anonymous) is not allowed', () => {
  assert.deepStrictEqual(peekQuota(null), { allowed: false, reason: 'anonymous' });
  assert.deepStrictEqual(peekQuota({ tier: 'anon' }), { allowed: false, reason: 'anonymous' });
});
