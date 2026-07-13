// Persisted UI-language preference (OI-15). Mirrors the useAudio localStorage
// pattern: components MUST NOT read localStorage for language directly — use
// these helpers / the hook so the storage key and validation stay in one place.
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const LANG_STORAGE_KEY = 'app_language';
export const SUPPORTED_LANGS = ['en', 'es'];

export function readStoredLang(fallback = 'en') {
  try {
    const v = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* private browsing — ignore */
  }
}

export function useLanguage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(() => readStoredLang(i18n.language || 'en'));
  const changeLanguage = useCallback(
    (next) => {
      if (!SUPPORTED_LANGS.includes(next)) return;
      writeStoredLang(next);
      i18n.changeLanguage(next);
      setLang(next);
    },
    [i18n],
  );
  return { lang, changeLanguage, supported: SUPPORTED_LANGS };
}
