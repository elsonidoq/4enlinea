// QA 2026-07-15 / D4: the limit was the bare literal 5, duplicated in
// checkAndDecrementQuota and peekQuota, while auth.deepRevealGate promises 20/week in
// BOTH locales and the anon plan states "free tier stays 20/week — never lower it".
// The 5 was a debug convenience. Copy is correct; the code was the bug.
export const FREE_DEEP_REVEAL_WEEKLY_LIMIT = 20;

// peekQuota is read-only, so deep_reveal_count stays stale until a WRITE path runs.
// Every reader (server gate AND the client counter) must normalize against the window
// or a user past their reset date sees a spent quota they don't actually have.
export function effectiveDeepRevealCount({ count, resetAt, now = new Date() }) {
  const reset = resetAt ? new Date(resetAt) : new Date(0);
  return now > reset ? 0 : (count ?? 0);
}
