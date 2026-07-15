/**
 * Filter object for an explanation_cache row, scoped by position hash + locale.
 * @param {string} positionHash
 * @param {string} [locale='en']
 * @returns {{position_hash: string, locale: string}}
 */
export function buildCacheFilter(positionHash, locale = 'en') {
  return { position_hash: positionHash, locale };
}
