/**
 * Pick a random i18n key from a prefixed pool (e.g. 'coach.generic.blunder').
 * Probes sequential indices until t() returns the key itself (not found).
 * Pass usedKeys to prefer keys not yet used; falls back to the full pool when all are used.
 */
export function pickRandomKey(t, prefix, usedKeys = null) {
  const allKeys = [];
  for (let i = 0; i < 30; i++) {
    const fullKey = `${prefix}.${i}`;
    if (t(fullKey) !== fullKey) allKeys.push(fullKey);
    else break;
  }
  if (allKeys.length === 0) return `${prefix}.0`;
  const unused = usedKeys ? allKeys.filter(k => !usedKeys.has(k)) : allKeys;
  const pool = unused.length > 0 ? unused : allKeys;
  return pool[Math.floor(Math.random() * pool.length)];
}
