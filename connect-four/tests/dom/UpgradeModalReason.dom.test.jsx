// OI-169 — the upgrade modal shown for a locked PRO lesson only advertises Deep Reveals, never
// lessons. UpgradeModal had no `reason` prop seam (`UpgradeModal.jsx:29`:
// `({ onDismiss, onUpgrade, uiState: controlledUiState, onUiStateChange })`), so every one of the
// five call sites rendered the one global `upgrade.body` string.
//
// The seam mirrors AuthModal's existing `reason` prop verbatim — `AuthModal.jsx:9`
// `export function AuthModal({ onClose, reason })` / `:38` `{reason || t('auth.subtitle')}` —
// i.e. an already-translated string supplied by the caller, not a new mechanism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };
import { UpgradeModal } from '../../src/components/UpgradeModal.jsx';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation }, es: { translation: esTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function renderModal(props) {
  return render(
    <I18nextProvider i18n={i18n}>
      <UpgradeModal onDismiss={() => {}} onUpgrade={async () => {}} {...props} />
    </I18nextProvider>,
  );
}

test('with no reason prop the modal keeps rendering the global upgrade.body (no call site regresses)', () => {
  try {
    renderModal({});
    assert.ok(screen.getByText(i18n.t('upgrade.body')));
  } finally { cleanup(); }
});

test('a caller-supplied reason replaces the Deep-Reveal-only body', () => {
  try {
    renderModal({ reason: i18n.t('upgrade.bodyLessons') });
    assert.ok(
      screen.queryByText(i18n.t('upgrade.bodyLessons')),
      'UpgradeModal has no reason seam, so the lesson-specific value proposition cannot be shown (OI-169)',
    );
    assert.equal(screen.queryByText(i18n.t('upgrade.body')), null, 'the generic body must be replaced, not duplicated');
  } finally { cleanup(); }
});

test('upgrade.bodyLessons exists in BOTH en.json and es.json and mentions lessons', () => {
  assert.equal(typeof enTranslation.upgrade.bodyLessons, 'string', 'en.json upgrade.bodyLessons missing');
  assert.equal(typeof esTranslation.upgrade.bodyLessons, 'string', 'es.json upgrade.bodyLessons missing (would ship English silently)');
  assert.match(enTranslation.upgrade.bodyLessons, /lesson/i);
  assert.match(esTranslation.upgrade.bodyLessons, /leccion|lección/i);
});

test('SagaScreen passes the lesson-specific reason to UpgradeModal', async () => {
  // SagaScreen mounts fetches/IndexedDB and is heavy to render; assert at the source layer that
  // the seam is actually wired at the call site the OI names (SagaScreen.jsx:320-325).
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../src/screens/SagaScreen.jsx', import.meta.url), 'utf8');
  const modal = src.slice(src.indexOf('<UpgradeModal'), src.indexOf('<UpgradeModal') + 900);
  assert.match(modal, /reason=\{t\('upgrade\.bodyLessons'\)\}/, `SagaScreen's UpgradeModal call site: ${modal.split('/>')[0]}`);
});
