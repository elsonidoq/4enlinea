// OI-178 (MAJOR) — after a successful payment the UpgradeModal never reaches 'success' and
// never auto-dismisses; it sits on pristine 'idle' forever.
//
// ROOT CAUSE (established by an instrumented sandbox purchase, txn_01m238300kdxdnzsvc0ddxgrnk):
// the app's OWN `paddle.Checkout.close()` in handleCheckoutCompleted's `finally` makes Paddle
// emit `checkout.closed` SYNCHRONOUSLY inside that call. useUpgradeCheckout's eventCallback
// dispatches PADDLE_CHECKOUT_DISMISSED_EVENT ungated by completion, also synchronously. So
// UpgradeModal's handleDismissed runs in the SAME task as the `setUpgradeUiState('success')`
// issued ~1ms earlier — before React re-rendered — its closure still reads 'loading', the guard
// passes, and (because onUiStateChange is supplied) it writes 'idle' into the PARENT. Both
// writes batch, so 'success' is never committed at all.
//
// This is an ORDERING/BATCHING defect, so both tests below model the synchronous interleaving
// explicitly: the parent's 'success' write and the dismissed-event dispatch happen inside ONE
// act() — one task, no render in between. A test that awaited between them would not test it.
//
// Two independent fixes are covered:
//   (A) UpgradeModal must not downgrade a state written in the same task (defence in depth).
//   (B) useUpgradeCheckout must not dispatch the dismissed event for OUR OWN programmatic close
//       after a completed payment — matching the event's documented purpose
//       ("closes/errors WITHOUT a completed payment").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { UpgradeModal } from '../../src/components/UpgradeModal.jsx';
import {
  PADDLE_CHECKOUT_DISMISSED_EVENT,
  handlePaddleCheckoutEvent,
} from '../../src/lib/useUpgradeCheckout.js';
import { resetCheckoutReturnState } from '../../src/lib/checkoutReturnFlow.js';

// jsdom-env artifact, not a production bug: Node's own global `CustomEvent` is a different
// class from jsdom's, and `window.dispatchEvent` rejects it ("parameter 1 is not of type
// 'Event'"). In a browser they are the same class. Alias it so the PRODUCTION
// `window.dispatchEvent(new CustomEvent(...))` in useUpgradeCheckout.js runs unmodified.
globalThis.CustomEvent = window.CustomEvent;

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function stubFetch() {
  const original = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/paddle/config')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: null }) });
    }
    if (u.endsWith('/api/paddle/verify-transaction')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ activated: true }) });
    }
    if (u.endsWith('/api/user/entitlement')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ entitled: true, authenticated: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };
  return () => { globalThis.fetch = original; };
}

// Mirrors the five real call sites (SettingsScreen.jsx:586-591, SagaScreen.jsx:320-325,
// SetPickerScreen.jsx:208-213, PostSetSummaryScreen.jsx:272-277, DeepRevealPane.jsx:466-471):
// controlled uiState owned by the parent + onUiStateChange={setUpgradeUiState}.
let parentSetUiState;
function CallSiteHarness() {
  const [upgradeUiState, setUpgradeUiState] = useState('idle');
  parentSetUiState = setUpgradeUiState;
  return (
    <UpgradeModal
      onDismiss={() => {}}
      onUpgrade={async () => {}}
      uiState={upgradeUiState}
      onUiStateChange={setUpgradeUiState}
    />
  );
}

// 'Become Pro' is BOTH the heading and the CTA label — query the button, not the text.
function cta() {
  return screen.getByRole('button', { name: i18n.t('upgrade.cta') });
}

async function openCheckout() {
  render(
    <I18nextProvider i18n={i18n}>
      <CallSiteHarness />
    </I18nextProvider>,
  );
  // Click "Become Pro" -> setUiState('loading'), await onUpgrade (opens the overlay in prod).
  await act(async () => {
    fireEvent.click(cta());
  });
}

// Lets any deferred (macrotask) re-check run.
async function flushTimers() {
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

test('A: a success written in the SAME task as checkout.closed is not overwritten with idle', async () => {
  const restore = stubFetch();
  try {
    await openCheckout();

    // THE RACE, verbatim: the subscribeCheckoutReturn('activated') callback writes 'success',
    // and ~1ms later — still in the same task, still before React re-renders — our own
    // Checkout.close() makes Paddle emit checkout.closed, which dispatches the dismissed event.
    await act(async () => {
      parentSetUiState('success');
      window.dispatchEvent(new window.CustomEvent(PADDLE_CHECKOUT_DISMISSED_EVENT));
    });
    await flushTimers();

    assert.ok(
      screen.queryByText(i18n.t('upgrade.success')),
      'the modal is back on pristine idle after a successful payment (OI-178)',
    );
  } finally {
    restore();
    cleanup();
    resetCheckoutReturnState();
  }
});

test('A2: a genuine dismissal with NO completed payment still resets loading -> idle (OI-54)', async () => {
  const restore = stubFetch();
  try {
    await openCheckout();
    // The CTA is disabled while 'loading'.
    assert.equal(cta().disabled, true);

    await act(async () => {
      window.dispatchEvent(new window.CustomEvent(PADDLE_CHECKOUT_DISMISSED_EVENT));
    });
    await flushTimers();

    assert.equal(
      cta().disabled, false,
      'closing the overlay without paying must re-enable the CTA',
    );
  } finally {
    restore();
    cleanup();
    resetCheckoutReturnState();
  }
});

// ── B: the hook must not dispatch the dismissed event for our own programmatic close ────────
// Ordered deliberately: B1 runs first while the module-level "a payment just completed" flag is
// still false, so no reset seam is needed.
test('B1: a bare checkout.closed (user abandoned the overlay) DOES dispatch the dismissed event', () => {
  const restore = stubFetch();
  let dispatched = 0;
  const listener = () => { dispatched++; };
  window.addEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, listener);
  try {
    handlePaddleCheckoutEvent({ name: 'checkout.closed' });
    assert.equal(dispatched, 1);
  } finally {
    window.removeEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, listener);
    restore();
    resetCheckoutReturnState();
  }
});

test('B2: the checkout.closed our own Checkout.close() triggers after checkout.completed does NOT', async () => {
  const restore = stubFetch();
  let dispatched = 0;
  const listener = () => { dispatched++; };
  window.addEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, listener);
  try {
    handlePaddleCheckoutEvent({ name: 'checkout.completed', data: { transaction_id: 'txn_test' } });
    // handleCheckoutCompleted is async (verify-transaction, then the finally's Checkout.close()).
    await new Promise((r) => setTimeout(r, 5));
    // ...and THAT close() is what emits checkout.closed, synchronously, from inside our own call.
    handlePaddleCheckoutEvent({ name: 'checkout.closed' });

    assert.equal(
      dispatched, 0,
      'our own post-payment close still bounces the dismissed event, which resets the modal to idle (OI-178)',
    );
  } finally {
    window.removeEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, listener);
    restore();
    cleanup();
    resetCheckoutReturnState();
  }
});
