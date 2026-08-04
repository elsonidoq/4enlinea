// Spec 057 (MVP Launch Gate) US3, T039/FR-013/OI-98.
//
// PricingScreen.jsx must initialize Paddle.js on MOUNT — not only from the
// "Become Pro" click handler (useUpgradeCheckout.js's handleUpgrade, called
// from handleCheckoutClick) — so that a visitor arriving via Paddle's default
// payment link (`/pricing?_ptxn=<transaction id>`, see
// developer.paddle.com/build/transactions/pass-transaction-checkout/#use-checkout-payment-link)
// gets an auto-opened checkout for that transaction without ever clicking
// anything.
//
// `getPaddle` (src/lib/useUpgradeCheckout.js) is not exported before T041 —
// this test drives it exclusively through PricingScreen's mount behavior,
// never by importing getPaddle directly, so it exercises the real production
// path rather than a reimplementation. `@paddle/paddle-js`'s `initializePaddle`
// is mocked via node:test's module-mock API (`--experimental-test-module-mocks`,
// same mechanism as tests/unit/sharedSolverSafetyFloor.test.js) so this test
// runs with no live Paddle account, per the batch's "stand alone without a
// live Paddle" instruction — VITE_PADDLE_CLIENT_TOKEN is unset locally, so
// without this mock getPaddle() would just resolve to null (see
// useUpgradeCheckout.js's `if (!token) return null;` short-circuit) and the
// checkout-open assertions below could never observe anything.
//
// All three phases live in ONE test, run sequentially, rather than three
// separate `test()` blocks: `getPaddle()`'s module-level `paddlePromise` is a
// deliberate page-load singleton ("initializePaddle must run at most once per
// page load", useUpgradeCheckout.js) — real production behavior, not a test
// artifact — so a second PricingScreen mount within the same process reuses
// the already-initialized Paddle instance instead of calling
// `initializePaddle` again. Splitting into independent `test()`s would either
// fight that singleton (asserting an init count that depends on execution
// order) or paper over it with a per-test module reset that no real page
// load ever does. Sequential phases inside one test mirror the one thing
// that actually happens: Paddle.js initializes exactly once, and later
// mounts (e.g. re-navigating to /pricing with a different `_ptxn`) reuse it.
import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
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

const LIVE_PRICES = {
  monthly: { amount: 299, currency: 'usd', interval: 'month' },
  annual: { amount: 2199, currency: 'usd', interval: 'year' },
};
const LIVE_LIMIT = { freeDeepRevealWeeklyLimit: 20 };

function stubFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: LIVE_PRICES }) });
    if (u.endsWith('/api/limits')) return Promise.resolve({ ok: true, json: () => Promise.resolve(LIVE_LIMIT) });
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  return () => { globalThis.fetch = originalFetch; };
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

let paddleModuleMock;
let initializePaddleCalls;
let checkoutOpenCalls;
// Transaction id used by the "expired/invalid" edge case — Checkout.open
// throws synchronously for this one id, everything else succeeds silently,
// matching real Paddle.js's documented synchronous-throw behavior (see
// useUpgradeCheckout.js's customer.email note for a real example of this).
const EXPIRED_TXN = 'txn_expired_or_invalid';

before(() => {
  globalThis.__DOM_TEST_IMPORT_META_ENV__ = { VITE_PADDLE_CLIENT_TOKEN: 'test_dom_client_token' };
  initializePaddleCalls = [];
  checkoutOpenCalls = [];
  paddleModuleMock = mock.module('@paddle/paddle-js', {
    namedExports: {
      initializePaddle: async (opts) => {
        initializePaddleCalls.push(opts);
        return {
          Checkout: {
            open: (args) => {
              checkoutOpenCalls.push(args);
              if (args.transactionId === EXPIRED_TXN) {
                throw new Error('transaction not found or expired');
              }
            },
          },
        };
      },
    },
  });
});

after(() => {
  paddleModuleMock.restore();
});

test('PricingScreen: mount-time Paddle.js init (no click) + ?_ptxn= auto-open, including the expired/invalid edge case', async () => {
  const restoreFetch = stubFetch();
  try {
    // Phase A — plain /pricing, no query param. Mount alone (no click on
    // "Become Pro") must trigger Paddle.js init.
    window.history.pushState({}, '', '/pricing');
    renderPricingScreen();
    await waitFor(() => {
      assert.equal(initializePaddleCalls.length, 1);
    });
    assert.equal(initializePaddleCalls[0].token, 'test_dom_client_token');
    // No transaction id in the URL — nothing auto-opens.
    assert.equal(checkoutOpenCalls.length, 0);
    cleanup();

    // Phase B — /pricing?_ptxn=<real id>. Paddle.js is already initialized
    // (the page-load singleton from Phase A); the auto-open must still fire
    // for THIS mount's transaction id.
    window.history.pushState({}, '', '/pricing?_ptxn=txn_real_valid_12345');
    renderPricingScreen();
    await waitFor(() => {
      assert.equal(checkoutOpenCalls.length, 1);
    });
    assert.equal(checkoutOpenCalls[0].transactionId, 'txn_real_valid_12345');
    // Still only ever initialized once (the singleton held across mounts).
    assert.equal(initializePaddleCalls.length, 1);
    cleanup();

    // Phase C — /pricing?_ptxn=<expired/invalid id> (edge case from spec.md).
    // Paddle.js is never worse off than today (already initialized), and the
    // auto-open attempt fails gracefully: no error state, the visitor sees
    // the normal /pricing page (purchase CTA present, no degraded message).
    window.history.pushState({}, '', `/pricing?_ptxn=${EXPIRED_TXN}`);
    renderPricingScreen();
    await waitFor(() => {
      assert.equal(checkoutOpenCalls.length, 2);
    });
    assert.equal(checkoutOpenCalls[1].transactionId, EXPIRED_TXN);
    await waitFor(() => {
      assert.ok(screen.getByText(i18n.t('pricing.checkoutCta')));
    });
    assert.equal(screen.queryByText(i18n.t('pricing.degraded')) === null, true);
  } finally {
    restoreFetch();
    cleanup();
  }
});
