import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnnualSavings } from '../../src/lib/useStripePrices.js';

const MONTHLY = { amount: 299, currency: 'usd', interval: 'month' };
const ANNUAL = { amount: 2199, currency: 'usd', interval: 'year' };

test('computes the real discount from live PriceInfo prices', () => {
  const s = computeAnnualSavings({ monthly: MONTHLY, annual: ANNUAL });
  assert.strictEqual(s.percent, 39);                    // 1 - (2199 / (299*12)) = 38.7% -> 39
  assert.deepStrictEqual(s.perMonth, { amount: 183, currency: 'usd', interval: 'month' }); // 2199/12 = 183.25 -> 183
});

test('returns null when prices are unavailable (degrade silently)', () => {
  assert.strictEqual(computeAnnualSavings({ monthly: null, annual: ANNUAL }), null);
  assert.strictEqual(computeAnnualSavings(null), null);
});

test('returns null when annual is not actually cheaper', () => {
  assert.strictEqual(computeAnnualSavings({
    monthly: { amount: 100, currency: 'usd', interval: 'month' },
    annual: { amount: 1500, currency: 'usd', interval: 'year' },
  }), null);
});

test('returns null on a currency mismatch (not a meaningful discount)', () => {
  assert.strictEqual(computeAnnualSavings({
    monthly: { amount: 299, currency: 'usd', interval: 'month' },
    annual: { amount: 2199, currency: 'eur', interval: 'year' },
  }), null);
});
