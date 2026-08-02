// Spec 053 (Epic — Entitlement & Payments Consolidation), US1, T011.
//
// The server-side entitlement gate (server/lessonEntitlement.js) can now return a
// redacted `{ id, title, order, free, locked: true }` stub for a paid lesson — no
// `slides` key. ConceptScreen's own client-side useLessonLockGuard already blocks a
// genuinely signed-out/free-tier direct URL before this fetch ever fires (tier read
// from the lessons LIST endpoint, `/api/lessons`), so to exercise the NEW per-lesson
// guard this test deliberately makes the list say the lesson is free (client-side
// 'allowed') while the per-id detail fetch — the one actually gated server-side —
// returns the locked stub. This models the real race the guard exists for: the
// client's cached/last-fetched tier state can disagree with the server's live
// per-request entitlement check. Without the guard, ConceptScreen would index the
// absent `lesson.slides[slideIndex]` and throw.
//
// Renders through a lightweight `<StoreContext.Provider value={{ store: null, ... }}>`
// instead of the real `ProfileStoreProvider` (which performs real network calls —
// checkSession — on mount): useLessonLockGuard and ConceptScreen's own `store` usage
// both fall back to store-absent defaults, matching every prior null-store code path
// already in these files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { ConceptScreen } from '../../src/screens/ConceptScreen.jsx';

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
// useLessonLockGuard says 'allowed' and the /api/lessons/:id fetch actually fires —
// see the file-header comment for why this models the race the new guard covers.
const LESSONS_LIST = [{ id: LOCKED_LESSON_ID, title: 'The Undercut', order: 11, free: true }];

function mockFetch(url) {
  const u = String(url);
  if (u.endsWith(`/api/lessons/${LOCKED_LESSON_ID}`)) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(LOCKED_RESPONSE) });
  }
  if (u.endsWith('/api/lessons')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(LESSONS_LIST) });
  }
  return Promise.reject(new Error(`unexpected fetch in ConceptScreenLocked test: ${u}`));
}

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };

function renderConceptScreen(goReplaceCalls) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <ConceptScreen
          go={() => {}}
          goBack={() => {}}
          goReplace={(screenKey, params) => goReplaceCalls.push({ screenKey, params })}
          lessonId={LOCKED_LESSON_ID}
        />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('ConceptScreen: a locked lesson stub redirects to the existing upgrade-prompt affordance instead of crashing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  const goReplaceCalls = [];
  try {
    renderConceptScreen(goReplaceCalls);

    await waitFor(() => assert.ok(goReplaceCalls.length > 0, 'expected goReplace to have been called'));

    // Same affordance useLessonLockGuard's own client-side 'blocked' path uses
    // (SagaScreen reads lockAction:'upgrade' to open UpgradeModal) — reused, not
    // reinvented, per contracts/lessons.md's consumer table.
    assert.deepEqual(goReplaceCalls[0], { screenKey: 'saga', params: { lockAction: 'upgrade' } });

    // The component itself must not have thrown/blanked out — it should still be
    // showing its normal loading UI (TopBar + loading text), never an indexed-`slides`
    // crash or an empty tree.
    assert.ok(screen.getByText(/Loading/i));
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
