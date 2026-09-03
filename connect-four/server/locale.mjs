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

/**
 * Resolve the locale for an endpoint that accepts an explicit `?lang=` query param
 * in addition to the Accept-Language-derived req.locale.
 *
 * Needed for requests where the client cannot set a custom header (e.g. `new Audio(url)`,
 * which always sends the browser's own language) — so the caller passes the in-app
 * selected language explicitly via `?lang=`. The param is whitelisted against
 * SUPPORTED_LOCALES; anything else (missing, unsupported, malformed) falls back to
 * `fallbackLocale` (normally req.locale).
 * @param {string|undefined} explicitLangParam
 * @param {string} [fallbackLocale='en']
 * @returns {'en'|'es'}
 */
export function resolveTtsLocale(explicitLangParam, fallbackLocale = DEFAULT_LOCALE) {
  if (typeof explicitLangParam === 'string' && SUPPORTED_LOCALES.includes(explicitLangParam)) {
    return explicitLangParam;
  }
  return fallbackLocale;
}

// Server-side user-facing strings that are NOT produced by the LLM.
const STRINGS = {
  en: {
    notABlunder: 'This move keeps the game on its best track — there is no better alternative to highlight here.',
    column: (n) => `column ${n}`,
    // Ranged internal-coordinate connector (e.g. raw "c3-c6" -> "columns 3 through 6") — added for
    // T026 (OI-126), which widens stripInternalTokens to cover bare/ranged cXrY forms, not just paired.
    columnRange: (a, b) => `columns ${a} through ${b}`,
    // A FULL cell reference — column AND row. Used by `reasonRenderGuard.mjs`'s
    // `humanizeGroundedCoordinates` / `promoteRawCoordinates` wherever a raw `cNrM` sits inside a
    // zone whose own spec vouches for it, so the highlight survives the gate with its precision
    // intact. Deliberately distinct from `column` above: that one is the LAST-RESORT flattening for
    // an UNVOUCHED coordinate and drops the row on purpose (Decision A). Staging feedback on board
    // `315444233213134122` was explicitly about the lost row ("the text says 'column 1' but the
    // coach speaks c1r3 which is much more precise").
    cell: (c, r) => `column ${c}, row ${r}`,
    // D63 / OI-224. The deterministic better-column post-repair sentence, appended by
    // `retryDecision.mjs`'s `ensureBetterColumnMention` when the served explanation never names the
    // column the player should have played. `n` is already 1-indexed (display) at the call site.
    // It MUST contain the exact `column ${n}` substring that `mentionsBetterColumn` searches for —
    // that check is what declared the mention missing, and the repair has to satisfy it.
    betterColumnRepair: (n) => `Your better move was column ${n}.`,
  },
  es: {
    notABlunder: 'Esta jugada mantiene la partida en su mejor camino — no hay una alternativa mejor para destacar acá.',
    column: (n) => `columna ${n}`,
    columnRange: (a, b) => `columnas ${a} a ${b}`,
    cell: (c, r) => `columna ${c}, fila ${r}`,
    betterColumnRepair: (n) => `Tu mejor jugada era la columna ${n}.`,
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
