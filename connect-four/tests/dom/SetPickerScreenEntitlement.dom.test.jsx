// OI-177 — a PAYING user still cannot open any paid challenge set: SetPickerScreen
// gated `locked` / the click handler on the STATIC `set.free` flag from
// server/challengeSets.js, never on the account's entitlement, so a paid account saw
// every paid set locked and tapping one opened the UpgradeModal (inviting them to buy
// again).
//
// These tests drive the real production path: they stub `globalThis.fetch` so the real
// `getEntitlement()` (src/lib/entitlement.js) performs its real GET /api/user/entitlement
// and the screen consumes its real answer. No mock of the entitlement helper itself — a
// mock there would test the wiring's shape rather than its effect.
//
// Harness copied from tests/dom/CLChallengeScreenLocked.dom.test.jsx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { SetPickerScreen } from '../../src/screens/SetPickerScreen.jsx';
import { __resetEntitlementCacheForTests } from '../../src/lib/entitlement.js';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Verbatim shape of two rows of server/challengeSets.js (CHALLENGE_SETS): one free set
// and one paid set, plus the /api/puzzles/counts response shape the screen reads
// (`{ sets, counts }`, and it filters out any set whose count is 0).
const SETS = [
  { slug: 'immediate_threat', displayNameKey: 'challengeSet.immediate_threat.displayName', stars: 1, free: true },
  { slug: 'undercut', displayNameKey: 'challengeSet.undercut.displayName', stars: 4, free: false },
];
const COUNTS = { immediate_threat: 42, undercut: 49 };

function makeFetch({ entitled }) {
  return function mockFetch(url) {
    const u = String(url);
    if (u.endsWith('/api/puzzles/counts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sets: SETS, counts: COUNTS }) });
    }
    if (u.endsWith('/api/user/entitlement')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ entitled, authenticated: true }) });
    }
    if (u.endsWith('/api/user/challenge-progress')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ progress: {} }) });
    }
    return Promise.reject(new Error(`unexpected fetch in SetPickerScreenEntitlement test: ${u}`));
  };
}

const STORE_CONTEXT_VALUE = {
  store: null,
  session: { user: { id: 'u1' } },
  sessionChecked: true,
  signOut: () => {},
  refetchSession: () => {},
};

function renderSetPicker(goCalls) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <SetPickerScreen go={(screenKey, params) => goCalls.push({ screenKey, params })} />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

function paidSetButton() {
  const label = i18n.t('challengeSet.undercut.displayName');
  return screen.getByText(label).closest('button');
}

test('OI-177: an ENTITLED account can open a paid challenge set (no upgrade modal)', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: true });
  __resetEntitlementCacheForTests();
  const goCalls = [];
  try {
    renderSetPicker(goCalls);

    // Wait for the sets list to render at all.
    await waitFor(() => assert.ok(paidSetButton(), 'expected the paid set card to render'));
    // ...and for the entitlement answer to land. SetCard renders `var(--lock-bg)` when
    // `locked` and `var(--card)` otherwise (src/components/SetCard.jsx), so this asserts
    // the user-visible lock state, not an internal flag.
    await waitFor(() => assert.equal(
      paidSetButton().style.background,
      'var(--card)',
      'a paid set must not render locked for an entitled account',
    ));

    paidSetButton().click();

    assert.deepEqual(goCalls[0], { screenKey: 'challenge', params: { category: 'undercut' } });
    // 'upgrade.heading' and 'upgrade.cta' are both "Become Pro", hence queryAllByText.
    assert.equal(
      screen.queryAllByText(i18n.t('upgrade.heading')).length,
      0,
      'a paying account must never be shown the upgrade modal for a set they own',
    );
  } finally {
    globalThis.fetch = originalFetch;
    __resetEntitlementCacheForTests();
    cleanup();
  }
});

test('OI-177 regression guard: a FREE account still sees the upgrade modal on a paid set', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: false });
  __resetEntitlementCacheForTests();
  const goCalls = [];
  try {
    renderSetPicker(goCalls);

    await waitFor(() => assert.ok(paidSetButton(), 'expected the paid set card to render'));
    assert.equal(paidSetButton().style.background, 'var(--lock-bg)', 'a paid set must render locked at free tier');
    paidSetButton().click();

    await waitFor(() => assert.ok(screen.queryAllByText(i18n.t('upgrade.heading')).length > 0));
    assert.equal(goCalls.length, 0, 'a free account must not be navigated into a paid set');
  } finally {
    globalThis.fetch = originalFetch;
    __resetEntitlementCacheForTests();
    cleanup();
  }
});

test('OI-177: a free set is openable regardless of entitlement', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetch({ entitled: false });
  __resetEntitlementCacheForTests();
  const goCalls = [];
  try {
    renderSetPicker(goCalls);

    const label = i18n.t('challengeSet.immediate_threat.displayName');
    await waitFor(() => assert.ok(screen.getByText(label)));
    screen.getByText(label).closest('button').click();

    assert.deepEqual(goCalls[0], { screenKey: 'challenge', params: { category: 'immediate_threat' } });
  } finally {
    globalThis.fetch = originalFetch;
    __resetEntitlementCacheForTests();
    cleanup();
  }
});
