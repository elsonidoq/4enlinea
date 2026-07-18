// OI-56 (spec 050 review follow-up): the deleted tests/unit/stripePrices.test.js
// covered computeAnnualSavings/formatPrice pure-function logic (discount math,
// null-safety, es/en locale suffix behavior, and a named regression guard for
// the "doubled /mo/mo" bug). These functions now live in
// src/lib/usePaddlePrices.js — ported verbatim (same fixtures/assertions),
// pointed at the new module, per docs/open_issues.md OI-56's "If picked up" note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnnualSavings, formatPrice } from '../../src/lib/usePaddlePrices.js';

const MONTHLY = { amount: 299, currency: 'usd', interval: 'month' };
const ANNUAL = { amount: 2199, currency: 'usd', interval: 'year' };

test('computes the real discount from live PriceInfo prices', () => {
  const s = computeAnnualSavings({ monthly: MONTHLY, annual: ANNUAL });
  assert.strictEqual(s.percent, 39);                    // 1 - (2199 / (299*12)) = 38.7% -> 39
  // interval: null — formatPrice must add no suffix; the i18n copy key
  // ("{{price}}/mo billed annually" / "{{price}}/mes facturado anual") owns it.
  assert.deepStrictEqual(s.perMonth, { amount: 183, currency: 'usd', interval: null }); // 2199/12 = 183.25 -> 183
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

test('formatPrice localizes the /mo and /yr suffix (es)', () => {
  const rendered = formatPrice(MONTHLY, 'es');
  assert.ok(rendered.includes('/mes'), `expected Spanish "/mes" suffix, got: ${rendered}`);
  assert.ok(!rendered.includes('/mo'), `expected no English "/mo" leak, got: ${rendered}`);

  const renderedYear = formatPrice(ANNUAL, 'es');
  assert.ok(renderedYear.includes('/año'), `expected Spanish "/año" suffix, got: ${renderedYear}`);
  assert.ok(!renderedYear.includes('/yr'), `expected no English "/yr" leak, got: ${renderedYear}`);
});

test('formatPrice keeps the English /mo and /yr suffix (en)', () => {
  const rendered = formatPrice(MONTHLY, 'en');
  assert.ok(rendered.includes('/mo'), `expected English "/mo" suffix, got: ${rendered}`);

  const renderedYear = formatPrice(ANNUAL, 'en');
  assert.ok(renderedYear.includes('/yr'), `expected English "/yr" suffix, got: ${renderedYear}`);
});

test('formatPrice adds no suffix for interval: null, in any locale (regression guard)', () => {
  const noInterval = { amount: 183, currency: 'usd', interval: null };
  assert.strictEqual(formatPrice(noInterval, 'en'), '$1.83');
  assert.strictEqual(
    formatPrice(noInterval, 'es'),
    new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(1.83)
  );
});

test('formatPrice(perMonth) carries no interval suffix — the i18n copy key owns it', () => {
  // Regression for the "$1.83/mo/mo billed annually" / Spanish-with-hardcoded-"/mo" bug:
  // computeAnnualSavings' perMonth used to come back with interval: 'month', so
  // formatPrice appended its own "/mo" on top of the "{{price}}/mo billed annually"
  // (or Spanish "{{price}}/mes facturado anual") copy key, producing a doubled/mixed-
  // language suffix. The copy key must be the ONLY source of the suffix.
  const savings = computeAnnualSavings({ monthly: MONTHLY, annual: ANNUAL });
  const rendered = formatPrice(savings.perMonth);
  assert.strictEqual(rendered, '$1.83'); // no trailing /mo — the key supplies "/mo billed annually"
  const composedEn = `${rendered}/mo billed annually`;
  const composedEs = `${rendered}/mes facturado anual`;
  assert.ok(!composedEn.includes('/mo/mo'), `expected no doubled suffix, got: ${composedEn}`);
  assert.ok(!composedEs.includes('/mo'), `expected no stray English "/mo" in Spanish copy, got: ${composedEs}`);
});
