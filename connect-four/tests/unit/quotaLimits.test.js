import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FREE_DEEP_REVEAL_WEEKLY_LIMIT, effectiveDeepRevealCount } from '../../server/quotaLimits.js';

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
