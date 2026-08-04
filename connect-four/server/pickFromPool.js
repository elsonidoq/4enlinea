// Extracted from server/index.js (spec 057 T034) so it can be imported by
// reconstructAnalysisFromBlunders.js without importing index.js itself, which has
// heavy import-time side effects (spawns the c4solver process, opens listeners —
// see tests/unit/debugClassifyAllValidation.test.js's header note).

/**
 * Picks a random i18n key from a phrase pool at `translations.<prefix>.*`.
 * @param {object} translations  i18n translation tree (e.g. src/i18n/en.json)
 * @param {string} prefix        dot-separated path to the pool node
 * @returns {string|null} `${prefix}.${randomKey}`, or null if the pool is empty/missing
 */
export function pickFromPool(translations, prefix) {
  const parts = prefix.split('.');
  let node = translations;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[part];
  }
  if (!node || typeof node !== 'object') return null;
  const keys = Object.keys(node);
  if (keys.length === 0) return null;
  const idx = Math.floor(Math.random() * keys.length);
  return `${prefix}.${keys[idx]}`;
}
