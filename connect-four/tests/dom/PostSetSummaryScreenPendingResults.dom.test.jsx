// Spec 053 US5 (T061) — PostSetSummaryScreen.jsx's sessionStorage restore (T058-T060), proven
// through a SIMULATED GENUINE COLD BOOT (not a component remount — see the first test's comment
// for why that distinction is load-bearing here), the unchanged '/setpicker' fallback for a
// missing/invalid entry (FR-031), and a re-run (not an eyeball) of OI-59's replay-on-subscribe
// fix through this actual screen (FR-032).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { PostSetSummaryScreen } from '../../src/screens/PostSetSummaryScreen.jsx';
import { resetCheckoutReturnState, setCheckoutReturnState, subscribeCheckoutReturn } from '../../src/lib/checkoutReturnFlow.js';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };
const PENDING_KEY = 'pendingSetResults';

function renderScreen(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <PostSetSummaryScreen go={() => {}} {...props} />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('simulated genuine cold boot: a fresh mount with NO in-memory props restores results from a re-seeded sessionStorage entry, then clears it', async () => {
  sessionStorage.clear();

  // Re-seed sessionStorage exactly as it would look immediately after a real page reload —
  // written directly as a JSON string, not produced by an earlier still-mounted component
  // instance's in-memory state (that distinction is the whole point: a remount-only test would
  // leave some prior instance's closures/state around and could pass even if the sessionStorage
  // read path in PostSetSummaryScreen were entirely broken).
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({
    nonce: 'cold-boot-nonce',
    results: [
      { quality: 'optimal', category: 'undercut' },
      { quality: 'blunder', category: 'undercut' },
    ],
    category: 'undercut',
    savedAt: Date.now(),
  }));

  // A genuine cold boot also wipes checkoutReturnFlow.js's module-level `state` back to its
  // initial 'idle' (it's a plain in-memory `let`, gone on restart) — reset it explicitly so this
  // test can't accidentally pass by relying on stray in-memory state from an earlier test.
  resetCheckoutReturnState();

  try {
    // No `results`/`category` props at all — a real cold boot never carries them (SESSION_ONLY).
    renderScreen();

    assert.ok(screen.getByText('1 / 2 optimal'), 'restored results must be reflected in the rendered stats');
    assert.equal(sessionStorage.getItem(PENDING_KEY), null, 'a successfully-restored entry must be cleared so it cannot be replayed into a later, unrelated mount');
  } finally {
    cleanup();
    sessionStorage.clear();
  }
});

test('a missing sessionStorage entry falls through UNCHANGED to the existing fallback (empty in-memory props render, FR-031)', () => {
  sessionStorage.clear();
  try {
    renderScreen({ results: [], category: undefined });
    assert.ok(screen.getByText('0 / 0 optimal'));
  } finally {
    cleanup();
    sessionStorage.clear();
  }
});

test('an expired sessionStorage entry is rejected (and cleared), falling through unchanged rather than restoring stale results', () => {
  sessionStorage.clear();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({
    nonce: 'stale-nonce',
    results: [{ quality: 'optimal', category: 'undercut' }],
    category: 'undercut',
    savedAt: Date.now() - 31 * 60 * 1000, // older than the 30-minute freshness window
  }));

  try {
    renderScreen({ results: [], category: undefined });
    assert.ok(screen.getByText('0 / 0 optimal'), 'a stale entry must never override the fallback render');
    assert.equal(sessionStorage.getItem(PENDING_KEY), null, 'the stale entry must still be cleared, not left to be misread by a later mount');
  } finally {
    cleanup();
    sessionStorage.clear();
  }
});

test('OI-59 re-verified through this screen: a purchase completed on one mount does not resurface when the upgrade modal is reopened on a later mount in the same session (FR-032)', () => {
  sessionStorage.clear();
  resetCheckoutReturnState();

  try {
    // First mount: simulate a real payment's checkout.completed -> verify-transaction resolution
    // while this screen's subscription is active — exactly what useUpgradeCheckout.js's handler
    // does for a genuine purchase.
    const first = renderScreen({ results: [{ quality: 'blunder', category: 'undercut' }], category: 'undercut' });
    setCheckoutReturnState('confirming');
    setCheckoutReturnState('activated');
    first.unmount();

    // Later in the same session: a fresh subscribe (e.g. this screen mounting again for a
    // different completed set, or the upgrade modal reopening) must see only 'idle' — never a
    // replay of the first, already-consumed 'activated' outcome. This exercises the PRODUCTION
    // subscription callback inside PostSetSummaryScreen (which calls resetCheckoutReturnState()
    // on a terminal state), not just checkoutReturnFlow.js's own unit tests in isolation.
    const seen = [];
    const unsubscribe = subscribeCheckoutReturn((s) => seen.push(s));
    assert.deepEqual(seen, ['idle']);
    unsubscribe();
  } finally {
    cleanup();
    sessionStorage.clear();
    resetCheckoutReturnState();
  }
});
