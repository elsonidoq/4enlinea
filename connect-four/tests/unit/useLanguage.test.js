import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS, readStoredLang, writeStoredLang } from '../../src/lib/useLanguage.js';

// Minimal localStorage shim for node:test (no jsdom needed for the pure helpers).
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('supported langs and key are stable', () => {
  assert.deepEqual(SUPPORTED_LANGS, ['en', 'es']);
  assert.equal(LANG_STORAGE_KEY, 'app_language');
});

test('readStoredLang falls back for missing or invalid values', () => {
  assert.equal(readStoredLang(), 'en');
  writeStoredLang('es');
  assert.equal(readStoredLang(), 'es');
  globalThis.localStorage.setItem(LANG_STORAGE_KEY, 'fr');
  assert.equal(readStoredLang(), 'en'); // 'fr' unsupported -> fallback
});
