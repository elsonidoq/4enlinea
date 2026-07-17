// Mirrors server/quotaLimits.js#effectiveDeepRevealCount — peekQuota is read-only, so
// deep_reveal_count is stale past the reset date and MUST be normalized here too, or a
// user who has rolled over sees a spent quota they don't have. This client-side copy
// is plan-mandated (D4): the client cannot import the server's CJS/ESM module, so the
// normalization rule is intentionally duplicated rather than DRY'd into a broken import.
//
// CORRECTED 2026-07-16: gate on `signedIn`, not `tier`. Anon users' IndexedDB
// profile is {device_uuid, tier:'free'} (IndexedDBStore.js:42-58) — tier alone
// cannot distinguish anon from a real free account, and showing anon a "20
// left" counter misrepresents their real 1-reveal entitlement (the AuthModal
// gate from W3).
export function describeQuota({ signedIn, tier, count, resetAt, limit, now = new Date() }) {
  if (!signedIn || tier !== 'free') return { show: false, remaining: 0, showUpgradeCta: false };
  const reset = resetAt ? new Date(resetAt) : new Date(0);
  const effective = now > reset ? 0 : (count ?? 0);
  return { show: true, remaining: Math.max(0, (limit ?? 20) - effective), showUpgradeCta: true };
}
