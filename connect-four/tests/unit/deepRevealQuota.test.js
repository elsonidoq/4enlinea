import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeQuota } from '../../src/lib/deepRevealQuota.js';

const NOW = new Date('2026-07-16T00:00:00Z');
const FUTURE = new Date('2026-07-20T00:00:00Z');

test('free signed-in user sees remaining and the upgrade CTA', () => {
  assert.deepStrictEqual(
    describeQuota({ signedIn: true, tier: 'free', count: 3, resetAt: FUTURE, limit: 20, now: NOW }),
    { show: true, remaining: 17, showUpgradeCta: true });
});

test('paid user sees no counter and no CTA', () => {
  const q = describeQuota({ signedIn: true, tier: 'paid', count: 3, resetAt: FUTURE, limit: 20, now: NOW });
  assert.strictEqual(q.show, false);
  assert.strictEqual(q.showUpgradeCta, false);
});

// CORRECTED 2026-07-16: anon's real profile is {device_uuid, tier:'free'}
// (IndexedDBStore.js:42-58) — tier is NEVER undefined for anon. Gate on
// signedIn instead, or an anon user is told they have 20 reveals left when
// their real entitlement is 1.
test('anon (signedIn:false, tier:free) sees no counter — the one-free-reveal gate is a different mechanism', () => {
  assert.strictEqual(describeQuota({ signedIn: false, tier: 'free', count: 0, resetAt: null, limit: 20, now: NOW }).show, false);
});

test('a stale count past the reset window shows a full allowance', () => {
  const stale = new Date('2026-07-13T00:00:00Z');
  assert.strictEqual(describeQuota({ signedIn: true, tier: 'free', count: 19, resetAt: stale, limit: 20, now: NOW }).remaining, 20);
});

test('remaining never goes negative', () => {
  assert.strictEqual(describeQuota({ signedIn: true, tier: 'free', count: 25, resetAt: FUTURE, limit: 20, now: NOW }).remaining, 0);
});
