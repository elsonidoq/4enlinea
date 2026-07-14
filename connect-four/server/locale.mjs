export const SUPPORTED_LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';

/**
 * Resolve a supported locale from an Accept-Language header.
 * Parses q-weighted language ranges, matches the first supported base language.
 * @param {string|undefined} acceptLanguage
 * @returns {'en'|'es'}
 */
export function resolveLocale(acceptLanguage) {
  if (typeof acceptLanguage !== 'string' || acceptLanguage.trim() === '') return DEFAULT_LOCALE;
  const ranges = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { base: tag.trim().toLowerCase().split('-')[0], q: Number.isNaN(q) ? 0 : q };
    })
    .filter((r) => r.base)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranges) {
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Express middleware: resolve req.locale from Accept-Language. */
export function localeMiddleware(req, _res, next) {
  req.locale = resolveLocale(req.headers['accept-language']);
  next();
}

// Server-side user-facing strings that are NOT produced by the LLM.
const STRINGS = {
  en: {
    notABlunder: 'This move keeps the game on its best track — there is no better alternative to highlight here.',
    column: (n) => `column ${n}`,
  },
  es: {
    notABlunder: 'Esta jugada mantiene la partida en su mejor camino — no hay una alternativa mejor para destacar acá.',
    column: (n) => `columna ${n}`,
  },
};

/**
 * Look up a server-side user-facing string by locale + key.
 * Falls back to English for unknown locales/keys.
 * @param {string} locale
 * @param {string} key
 * @returns {string|Function}
 */
export function serverT(locale, key) {
  const table = STRINGS[locale] ?? STRINGS.en;
  return table[key] ?? STRINGS.en[key];
}
