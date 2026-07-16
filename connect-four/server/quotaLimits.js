// QA 2026-07-15 / D4: the limit was the bare literal 5, duplicated in
// checkAndDecrementQuota and peekQuota, while auth.deepRevealGate promises 20/week in
// BOTH locales and the anon plan states "free tier stays 20/week — never lower it".
// The 5 was a debug convenience. Copy is correct; the code was the bug.
export const FREE_DEEP_REVEAL_WEEKLY_LIMIT = 20;

// Single source of truth for "what does resetAt mean". A null/undefined
// resetAt (never scheduled, e.g. a brand-new free user) is treated as already
// expired — epoch is always in the past — so the very first read/write
// normalizes it. This is a NULLISH check, not a truthy one: a `timestamptz`
// column only ever comes back as an ISO string or null/undefined, never another
// falsy value ('', 0, false), so there is no real-world case where the two
// checks diverge — but nullish is the precise statement of the rule ("no
// value scheduled"), so it's the one both production call sites use and the
// one kept here.
export function resolveResetAt({ resetAt }) {
  return (resetAt === null || resetAt === undefined) ? new Date(0) : new Date(resetAt);
}

export function isPastReset({ resetAt, now = new Date() }) {
  return now > resolveResetAt({ resetAt });
}

// peekQuota is read-only, so deep_reveal_count stays stale until a WRITE path runs.
// Every reader (server gate AND the client counter) must normalize against the window
// or a user past their reset date sees a spent quota they don't actually have.
export function effectiveDeepRevealCount({ count, resetAt, now = new Date() }) {
  return isPastReset({ resetAt, now }) ? 0 : (count ?? 0);
}

// Read-only quota check — used as an early gate (before the expensive LLM
// compute) so an over-quota free user gets the paywall immediately instead of
// watching the deep reveal "compute" first, then getting 429.
// checkAndDecrementQuota (server/index.js) still performs the real decrement
// afterwards (only on an actual blunder), and shares the reset/normalize rule
// above rather than reimplementing it.
export function peekQuota(user, now = new Date()) {
  if (!user) return { allowed: false, reason: 'anonymous' };
  if (user.tier === 'paid') return { allowed: true };
  if (user.tier !== 'free') return { allowed: false, reason: 'anonymous' };

  const resetAtRaw = user.deep_reveal_reset_at;
  const resetAt = resolveResetAt({ resetAt: resetAtRaw });
  const count = effectiveDeepRevealCount({ count: user.deep_reveal_count, resetAt: resetAtRaw, now });
  if (count >= FREE_DEEP_REVEAL_WEEKLY_LIMIT) return { allowed: false, resetsAt: resetAt.toISOString() };
  return { allowed: true };
}
