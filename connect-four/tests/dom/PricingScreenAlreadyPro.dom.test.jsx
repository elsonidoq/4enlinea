// OI-179 — /pricing gives a paying user no "already Pro" acknowledgement. Re-verified:
// `grep -ac "tier" src/screens/PricingScreen.jsx` returns 0 — the screen has no tier/entitlement
// awareness of any kind.
//
// CRITICAL constraint from the OI entry: the purchase CTA must stay reachable REGARDLESS of tier.
// That unconditional CTA is what makes Paddle payment-link checkouts (`/pricing?_ptxn=…`) work,
// so the last test below is a guard against "fixing" this by hiding or disabling it.
//
// Drives the REAL getEntitlement() (src/lib/entitlement.js) via a stubbed global fetch — no mock
// of the entitlement helper itself. Harness copied from tests/dom/PricingScreen.dom.test.jsx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { PricingScreen } from '../../src/screens/PricingScreen.jsx';
import { __resetEntitlementCacheForTests } from '../../src/lib/entitlement.js';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation }, es: { translation: esTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };
const LIVE_PRICES = {
  monthly: { amount: 299, currency: 'usd', interval: 'month' },
  annual: { amount: 2199, currency: 'usd', interval: 'year' },
};

function makeFetch({ entitled }) {
  return function mockFetch(url) {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: LIVE_PRICES }) });
    if (u.endsWith('/api/limits')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ freeDeepRevealWeeklyLimit: 20 }) });
    if (u.endsWith('/api/user/entitlement')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ entitled, authenticated: true }) });
    return Promise.reject(new Error(`unexpected fetch in PricingScreenAlreadyPro test: ${u}`));
  };
}

function renderPricingScreen() {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <PricingScreen go={() => {}} goBack={() => {}} />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('an entitled visitor is told they are already Pro', async () => {
  __resetEntitlementCacheForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: true });
  try {
    renderPricingScreen();
    await waitFor(() => {
      assert.ok(
        screen.queryByText(i18n.t('pricing.alreadyPro')),
        '/pricing renders identically for a paying user — no "already Pro" acknowledgement (OI-179)',
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    __resetEntitlementCacheForTests();
  }
});

test('the purchase CTA stays reachable for an entitled visitor (the _ptxn payment-link case)', async () => {
  __resetEntitlementCacheForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: true });
  try {
    renderPricingScreen();
    await waitFor(() => { assert.ok(screen.queryByText(i18n.t('pricing.alreadyPro'))); });
    const ctaButton = screen.getByRole('button', { name: i18n.t('pricing.checkoutCta') });
    assert.ok(ctaButton, 'the CTA must never be gated on tier — that is what makes /pricing?_ptxn= work');
    assert.equal(ctaButton.disabled, false, 'the CTA must not be disabled for an entitled visitor either');
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    __resetEntitlementCacheForTests();
  }
});

test('a free visitor sees no already-Pro banner', async () => {
  __resetEntitlementCacheForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: false });
  try {
    renderPricingScreen();
    await waitFor(() => { assert.ok(screen.getByText(i18n.t('pricing.checkoutCta'))); });
    assert.equal(screen.queryByText(i18n.t('pricing.alreadyPro')), null);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    __resetEntitlementCacheForTests();
  }
});

test('the new pricing strings exist in BOTH en.json and es.json', () => {
  for (const key of ['alreadyPro', 'manageBilling']) {
    assert.equal(typeof enTranslation.pricing[key], 'string', `en.json pricing.${key} missing`);
    assert.equal(typeof esTranslation.pricing[key], 'string', `es.json pricing.${key} missing (would ship English silently)`);
  }
});
