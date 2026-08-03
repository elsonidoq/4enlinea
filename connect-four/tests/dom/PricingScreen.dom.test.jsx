// Spec 053 (Entitlement & Payments Consolidation), US4, T043.
//
// PricingScreen (src/screens/PricingScreen.jsx) sources every number it
// renders from two live endpoints — GET /api/paddle/config (prices/savings)
// and GET /api/limits (the free-tier quota figure) — with two independent
// degraded states (FR-022): a failed pricing fetch shows pricing.degraded and
// hides the purchase CTA entirely; a failed quota fetch alone falls back to
// the generic pricing.quotaFallback phrase (no hardcoded number) without
// touching the CTA. Assertions below match against the REAL en.json
// pricing.* strings (loaded from the actual bundle, not hand-typed English),
// so a missing/misspelled i18n key fails this test instead of silently
// falling back to English (per the task's explicit instruction).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { PricingScreen } from '../../src/screens/PricingScreen.jsx';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };

// monthlyAmount * 12 (3588) > annualAmount (2199) — a genuine annual saving,
// so computeAnnualSavings(prices) resolves non-null and the badge renders.
const LIVE_PRICES = {
  monthly: { amount: 299, currency: 'usd', interval: 'month' },
  annual: { amount: 2199, currency: 'usd', interval: 'year' },
};
const LIVE_LIMIT = { freeDeepRevealWeeklyLimit: 20 };

function renderPricingScreen() {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <PricingScreen go={() => {}} goBack={() => {}} />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('PricingScreen: live prices, savings badge, and quota render from the real fetch responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: LIVE_PRICES }) });
    if (u.endsWith('/api/limits')) return Promise.resolve({ ok: true, json: () => Promise.resolve(LIVE_LIMIT) });
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  try {
    renderPricingScreen();

    // Live quota figure — the real interpolated pricing.freeQuota string, not a
    // hand-typed "20 Deep Reveals per week".
    await waitFor(() => {
      assert.ok(screen.getByText(i18n.t('pricing.freeQuota', { count: LIVE_LIMIT.freeDeepRevealWeeklyLimit })));
    });

    // Live monthly price label (formatPrice output for $2.99/mo) — appears
    // twice (the toggle and the Pro card, both showing the default-selected
    // monthly plan), so assert presence via getAllByText rather than
    // getByText (which throws on >1 match).
    await waitFor(() => {
      assert.ok(screen.getAllByText('$2.99/mo').length >= 1);
    });

    // Savings badge derived from computeAnnualSavings(LIVE_PRICES): (1 - 2199/3588) ≈ 39%.
    await waitFor(() => {
      assert.ok(screen.getByText(i18n.t('upgrade.saveBadge', { percent: 39 })));
    });

    // Purchase CTA is offered — pricing fetch succeeded.
    assert.ok(screen.getByText(i18n.t('pricing.checkoutCta')));
    assert.equal(screen.queryByText(i18n.t('pricing.degraded')) === null, true);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('PricingScreen: a failed pricing fetch shows the degraded message and offers no purchase CTA', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) return Promise.resolve({ ok: false });
    if (u.endsWith('/api/limits')) return Promise.resolve({ ok: true, json: () => Promise.resolve(LIVE_LIMIT) });
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  try {
    renderPricingScreen();

    await waitFor(() => {
      assert.ok(screen.getByText(i18n.t('pricing.degraded')));
    });

    // No purchase action offered when live pricing is unavailable (FR-022).
    assert.equal(screen.queryByText(i18n.t('pricing.checkoutCta')) === null, true);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('PricingScreen: a failed quota fetch alone falls back to the generic phrase, CTA unaffected', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: LIVE_PRICES }) });
    if (u.endsWith('/api/limits')) return Promise.resolve({ ok: false });
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  try {
    renderPricingScreen();

    // Generic non-numeric fallback phrase — never a hardcoded number.
    await waitFor(() => {
      assert.ok(screen.getByText(i18n.t('pricing.quotaFallback')));
    });
    assert.equal(screen.queryByText(/Deep Reveals per week/) === null, true);

    // Pricing itself is fine, so the CTA still renders — the two degraded
    // modes must not be conflated (FR-022).
    assert.ok(screen.getByText(i18n.t('pricing.checkoutCta')));
    assert.equal(screen.queryByText(i18n.t('pricing.degraded')) === null, true);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
