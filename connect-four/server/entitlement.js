// Shared server-side entitlement computation (spec 053, T002).
//
// entitlementForRequest(req) is the SOLE production entry point every
// server-side decision that needs "is this account paid" MUST call — it
// reads req.user (already populated by the global loadUser middleware from a
// real users.tier DB read) and never issues its own DB query
// (research.md Decision 1). computeEntitlement(user) is the internal pure
// core, exported only so tests can exercise it directly without building a
// fake req object.
//
// Never throws (FR-010, fail-closed): any unexpected input — null,
// undefined, a malformed shape — resolves to { entitled: false,
// authenticated: false }, never a thrown error that could crash a route
// handler mid-response.

/**
 * Internal pure core — exported ONLY for unit tests. Do not call from
 * production route handlers; call entitlementForRequest(req) instead
 * (see research.md Decision 1).
 * @param {{ tier?: string } | null | undefined} user  req.user, as populated by loadUser
 * @returns {{ entitled: boolean, authenticated: boolean }}
 */
export function computeEntitlement(user) {
  try {
    const authenticated = user != null;
    const entitled = authenticated && user.tier === 'paid';
    return { entitled, authenticated };
  } catch {
    // Defensive: user is a non-null value whose property access throws
    // (e.g. a Proxy with a throwing getter). Fail closed per FR-010.
    return { entitled: false, authenticated: false };
  }
}

/**
 * Production entry point — the ONLY function outside this module and its own
 * tests should call. Guarantees DB-sourced input structurally (req.user is
 * always populated by loadUser).
 * @param {import('express').Request} req
 * @returns {{ entitled: boolean, authenticated: boolean }}
 */
export function entitlementForRequest(req) {
  try {
    return computeEntitlement(req?.user);
  } catch {
    return { entitled: false, authenticated: false };
  }
}
