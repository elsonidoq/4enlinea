// The anonymous onboarding user gets exactly ONE free deep reveal. We record
// WHICH blunder was revealed (movestring:col) in localStorage so re-opening that
// same reveal stays free, but any NEW reveal is gated behind sign-up. This is the
// honest UX gate; server-side abuse is bounded by the per-IP rate limiter.
const KEY = 'anon_deep_reveal_v1';

function read() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/**
 * @param {string} blunderKey - stable per-blunder key, e.g. `${movestring}:${col}`
 * @returns {boolean} true if the free reveal is unused, or this is the same blunder.
 */
export function canRevealAnon(blunderKey) {
  const used = read();
  return used === null || used === blunderKey;
}

/**
 * Record the free reveal as spent on this blunder. Idempotent — the first key wins.
 * @param {string} blunderKey
 */
export function markRevealedAnon(blunderKey) {
  try { if (read() === null) localStorage.setItem(KEY, blunderKey); } catch { /* no-op */ }
}
