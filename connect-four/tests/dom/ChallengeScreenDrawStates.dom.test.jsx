// OI-171 — a standalone /challenge/<category> whose draw returns nothing rendered a blank,
// stranded screen: no board, no message, no CTA, no way back (browser Back only).
//
// Three distinguishable states are required, and the three cases below are exactly the
// three ways `GET /api/puzzles/draw` can fail to yield puzzles:
//   1. HTTP 403  — a paid category at free tier (the server-side paywall is CORRECT and
//                  untouched here) => explanation + the app's existing upgrade affordance.
//   2. HTTP 200 with `{ puzzles: [] }` => "no positions available" + a route back.
//   3. the fetch itself rejecting (network) => a distinct error message + a route back.
// Before the fix, (1) and (2) were indistinguishable because the draw fetch never checked
// `res.ok` — a 403 body parses cleanly and `data.puzzles || []` yields `[]` — and all three
// collapsed into `setPhase('pre-move')` with an empty puzzle list.
//
// Harness: the jsdom stubs (ResizeObserver / HTMLMediaElement) are copied from
// tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx. IndexedDB is avoided by providing
// StoreContext directly (store: null) rather than mounting ProfileStoreProvider, the
// pattern used by tests/dom/CLChallengeScreenLocked.dom.test.jsx.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { ChallengeScreen } from '../../src/screens/ChallengeScreen.jsx';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation }, es: { translation: esTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// A PAID category (server/challengeSets.js: `undercut` has free:false) — the one the
// re-verification note says still reliably reproduces the 403 path.
const PAID_CATEGORY = 'undercut';

before(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  const proto = globalThis.HTMLMediaElement.prototype;
  proto.play = function play() { return Promise.resolve(); };
  proto.pause = function pause() {};
});

let drawResponder;

beforeEach(() => {
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('/api/puzzles/draw')) return drawResponder();
    // Everything else (coach-audio manifest, analytics) 404s harmlessly.
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

const STORE_CONTEXT_VALUE = {
  store: null,
  // A signed-in session so handleBack() skips its window.confirm() branch
  // (ChallengeScreen.jsx `handleBack`), which jsdom does not implement.
  session: { user: { id: 'u1' } },
  sessionChecked: true,
  signOut: () => {},
  refetchSession: () => {},
};

function mount(goCalls) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <ChallengeScreen
          go={(screenKey, params) => goCalls.push({ screenKey, params })}
          goBack={() => {}}
          category={PAID_CATEGORY}
        />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

function backButton() {
  return screen.getByText(i18n.t('common.back')).closest('button');
}

test('OI-171 state 1: a 403 draw (paid category at free tier) explains the paywall and offers the upgrade CTA', async () => {
  drawResponder = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: 'Pro subscription required' }),
  });
  const goCalls = [];
  try {
    mount(goCalls);

    await waitFor(() => assert.ok(
      screen.getByText(i18n.t('challenge.locked.body')),
      'expected the needs-Pro explanation for a 403 draw',
    ));

    // The upgrade affordance: the same UpgradeModal every other screen opens.
    // Located by `upgrade.heading` — the label for a control that OPENS the sheet.
    // In English `upgrade.heading` and `upgrade.cta` are BOTH "Become Pro", so this
    // English assertion alone cannot tell the two keys apart; the Spanish test below
    // is what makes the choice of key actually tested.
    const cta = screen.getByText(i18n.t('upgrade.heading')).closest('button');
    assert.ok(cta, 'expected an upgrade CTA button');
    cta.click();
    await waitFor(() => assert.ok(
      screen.getByText(i18n.t('upgrade.body')),
      'expected the UpgradeModal to open from the CTA',
    ));

    // ...and it is NOT confused with the plain empty state.
    assert.equal(screen.queryByText(i18n.t('challenge.empty.body')), null);
  } finally {
    cleanup();
  }
});

// Locale-differential guard. `upgrade.heading` and `upgrade.cta` are the SAME string in
// English ("Become Pro"), so an English-only assertion cannot tell them apart — which is
// exactly how the wrong key survives review. In Spanish they diverge:
//   upgrade.heading = "Hacete Pro"        (correct: this button opens the upgrade sheet)
//   upgrade.cta     = "Continuar al pago" ("Continue to payment" — correct only on
//                                          UpgradeModal.jsx:250's actual checkout button)
// This test goes red if the open-the-sheet button is ever labelled with `upgrade.cta`.
test('OI-171 state 1 (es): the needs-Pro CTA opens the sheet — it must not promise checkout', async () => {
  drawResponder = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: 'Pro subscription required' }),
  });
  const goCalls = [];
  await i18n.changeLanguage('es');
  try {
    mount(goCalls);

    await waitFor(() => assert.ok(screen.getByText(esTranslation.challenge.locked.body)));

    assert.ok(
      screen.getByText(esTranslation.upgrade.heading).closest('button'),
      'expected the Spanish open-the-sheet label ("Hacete Pro") on the CTA',
    );
    assert.equal(
      screen.queryByText(esTranslation.upgrade.cta),
      null,
      'the CTA must not be labelled "Continuar al pago" — it opens a sheet, it does not start a checkout',
    );
  } finally {
    await i18n.changeLanguage('en');
    cleanup();
  }
});

test('OI-171 state 2: an empty draw says so and routes back to the set picker', async () => {
  drawResponder = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ puzzles: [], session_id: null, resume_idx: 0 }),
  });
  const goCalls = [];
  try {
    mount(goCalls);

    await waitFor(() => assert.ok(
      screen.getByText(i18n.t('challenge.empty.body')),
      'expected the no-positions message for an empty draw',
    ));
    assert.equal(screen.queryByText(i18n.t('challenge.locked.body')), null,
      'an empty category must not be reported as a paywall block');

    backButton().click();
    assert.deepEqual(goCalls[0], { screenKey: 'setpicker', params: undefined });
  } finally {
    cleanup();
  }
});

test('OI-171 state 3: a network failure shows a distinct error, never a silent empty board', async () => {
  drawResponder = async () => { throw new Error('network down'); };
  const goCalls = [];
  try {
    mount(goCalls);

    await waitFor(() => assert.ok(
      screen.getByText(i18n.t('challenge.error.body')),
      'expected a distinct error message for a failed draw fetch',
    ));
    assert.equal(screen.queryByText(i18n.t('challenge.empty.body')), null,
      'a network failure must not masquerade as an empty category');
    assert.equal(screen.queryByText(i18n.t('challenge.locked.body')), null);

    backButton().click();
    assert.deepEqual(goCalls[0], { screenKey: 'setpicker', params: undefined });
  } finally {
    cleanup();
  }
});
