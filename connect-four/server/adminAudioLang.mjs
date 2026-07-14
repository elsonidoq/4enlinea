import { SUPPORTED_LOCALES } from './locale.mjs';

/**
 * Resolve a whitelisted admin-audio language code.
 *
 * Used by the /api/admin/audio/* endpoints to pick which registry/audio-dir/
 * manifest/i18n-source a request targets. Unlike `resolveTtsLocale` (also in
 * locale.mjs, used by the production deep-reveal TTS endpoint), this has no
 * Accept-Language fallback — the admin page always sends `lang` explicitly
 * (or omits it, meaning English).
 *
 * @param {unknown} raw - the raw `lang` query/body value from the request
 * @param {string} [fallback='en'] - language to use when raw is missing/invalid
 * @returns {'en'|'es'}
 */
export function resolveAdminLang(raw, fallback = 'en') {
  if (typeof raw === 'string' && SUPPORTED_LOCALES.includes(raw)) {
    return raw;
  }
  return fallback;
}
