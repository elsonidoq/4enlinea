// Task 25 (finding 22): the Forced Win set showed "★★★ · 1 positions" — a hand-rolled
// literal instead of i18next's built-in plural forms. Render SetCard for real and assert
// the RENDERED string (not the producer) in both languages and both plural cases, per the
// CLAUDE.md warning that a green test on the producer alone missed a doubled-suffix bug
// elsewhere in this same plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };
import { SetCard } from '../../src/components/SetCard.jsx';

// Real en.json/es.json resources, but a standalone i18next instance (plain Node ESM
// JSON import needs an explicit `with { type: 'json' }` attribute that the app's own
// src/i18n/index.js — loaded via Vite in the browser — doesn't need to declare).
const i18n = i18next.createInstance();
await i18n.init({
  resources: {
    en: { translation: enTranslation },
    es: { translation: esTranslation },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function renderWithLang(lang, ui) {
  i18n.changeLanguage(lang);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

test('SetCard renders singular/plural position counts correctly in English', () => {
  renderWithLang('en', <SetCard title="Forced Win" stars={3} positionCount={1} onClick={() => {}} />);
  assert.ok(screen.getByText('· 1 position'));
  cleanup();

  renderWithLang('en', <SetCard title="Immediate Threat" stars={3} positionCount={66} onClick={() => {}} />);
  assert.ok(screen.getByText('· 66 positions'));
  cleanup();
});

test('SetCard renders singular/plural position counts correctly in Spanish', () => {
  renderWithLang('es', <SetCard title="Victoria forzada" stars={3} positionCount={1} onClick={() => {}} />);
  assert.ok(screen.getByText('· 1 posición'));
  cleanup();

  renderWithLang('es', <SetCard title="Amenaza inmediata" stars={3} positionCount={66} onClick={() => {}} />);
  assert.ok(screen.getByText('· 66 posiciones'));
  cleanup();
});
