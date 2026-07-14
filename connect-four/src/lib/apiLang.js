// connect-four/src/lib/apiLang.js
import i18n from '../i18n/index.js';

/**
 * Header advertising the user's current UI language to the server.
 * Attach to any API fetch whose response depends on locale (deep reveal, TTS).
 * @returns {Record<string,string>}
 */
export function langHeaders() {
  return { 'Accept-Language': i18n.language || 'en' };
}
