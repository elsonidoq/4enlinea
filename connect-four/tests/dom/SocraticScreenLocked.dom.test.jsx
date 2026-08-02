// Spec 053 (Epic — Entitlement & Payments Consolidation), US1, T012.
// Same pattern as tests/dom/ConceptScreenLocked.dom.test.jsx (see that file's header
// comment for the full rationale) applied to SocraticScreen.jsx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { SocraticScreen } from '../../src/screens/SocraticScreen.jsx';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// T001's verified paid lesson id.
const LOCKED_LESSON_ID = 'undercut';
const LOCKED_RESPONSE = { id: LOCKED_LESSON_ID, title: 'The Undercut', order: 11, free: false, locked: true };
// The lessons-LIST entry deliberately claims free:true so the client-side
// useLessonLockGuard says 'allowed' and the /api/lessons/:id fetch actually fires,
// modeling the race the new per-lesson guard covers (list vs. per-request entitlement
// disagreeing) — see ConceptScreenLocked.dom.test.jsx's header comment.
const LESSONS_LIST = [{ id: LOCKED_LESSON_ID, title: 'The Undercut', order: 11, free: true }];

function mockFetch(url) {
  const u = String(url);
  if (u.endsWith(`/api/lessons/${LOCKED_LESSON_ID}`)) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(LOCKED_RESPONSE) });
  }
  if (u.endsWith('/api/lessons')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(LESSONS_LIST) });
  }
  return Promise.reject(new Error(`unexpected fetch in SocraticScreenLocked test: ${u}`));
}

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };

function renderSocraticScreen(goReplaceCalls) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <SocraticScreen
          go={() => {}}
          goBack={() => {}}
          goReplace={(screenKey, params) => goReplaceCalls.push({ screenKey, params })}
          lessonId={LOCKED_LESSON_ID}
        />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('SocraticScreen: a locked lesson stub redirects to the existing upgrade-prompt affordance instead of crashing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  const goReplaceCalls = [];
  try {
    renderSocraticScreen(goReplaceCalls);

    await waitFor(() => assert.ok(goReplaceCalls.length > 0, 'expected goReplace to have been called'));

    assert.deepEqual(goReplaceCalls[0], { screenKey: 'saga', params: { lockAction: 'upgrade' } });

    // Still showing normal loading UI, not a crash and not a blank tree — the locked
    // stub has no `socratic` key, which the pre-guard code would otherwise fall
    // through into the generic error state for, masking the upgrade prompt.
    assert.ok(screen.getByText(/Loading/i));
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
