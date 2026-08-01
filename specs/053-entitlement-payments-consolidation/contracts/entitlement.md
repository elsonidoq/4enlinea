# Contract: Shared entitlement module + `GET /api/user/entitlement`

## `server/entitlement.js` (new module, not itself an HTTP contract)

```js
/**
 * Production entry point — the ONLY function outside this module and its own tests should call.
 * Guarantees DB-sourced input structurally (req.user is always populated by loadUser).
 * @param {import('express').Request} req
 * @returns {{ entitled: boolean, authenticated: boolean }}
 */
export function entitlementForRequest(req) { return computeEntitlement(req.user); }

/**
 * Internal pure core — exported ONLY for unit tests. Do not call from production route handlers;
 * call entitlementForRequest(req) instead (see research.md Decision 1).
 * @param {{ tier?: string } | null} user  req.user, as populated by loadUser
 * @returns {{ entitled: boolean, authenticated: boolean }}
 */
export function computeEntitlement(user) { /* ... */ }
```

- Pure, synchronous, never throws.
- `entitled === true` iff `user != null && user.tier === 'paid'`; `authenticated === true` iff `user != null`.
- `entitlementForRequest` is the **sole** production-authoritative entitlement computation (FR-007). Every
  other server-side decision point that needs "is this account paid" MUST call `entitlementForRequest(req)`,
  not re-derive tier logic locally, and not call the internal `computeEntitlement(user)` directly.

## `GET /api/user/entitlement`

**Auth**: Runs through the global `loadUser` middleware like every route, but does **NOT** follow the
strict `/api/user/*` "401 if `req.user` is null" ownership invariant — see research.md Decision 4 for the
rationale. This is a deliberate, documented exception.

**Request**: No params, no body.

**Response `200`** (always — this endpoint has no error branch of its own):
```json
{ "entitled": true, "authenticated": true }
```
or
```json
{ "entitled": false, "authenticated": true }
```
or
```json
{ "entitled": false, "authenticated": false }
```

A signed-in free-tier account gets `{ entitled: false, authenticated: true }`; a session-lapsed or fully
anonymous caller gets `{ entitled: false, authenticated: false }`. The client uses `authenticated` only to
decide whether to attempt a session refresh before accepting a downgrade from a cached `entitled: true`
(research.md Decision 4) — it is not a general-purpose auth-status field and callers with no cached "was
entitled" state can ignore it entirely.

**Implementation**: thin wrapper —
```js
router.get('/api/user/entitlement', (req, res) => {
  res.json(entitlementForRequest(req));
});
```

**Registered in**: `server/userRoutes.js` (per Route Naming: `/api/user/<resource>`), alongside the
existing 15 `/api/user/*` endpoints.

## Client contract: `src/lib/entitlement.js`

```js
/** @returns {Promise<{ entitled: boolean }>} */
export function getEntitlement() { /* cache-first, TTL-bounded, fail-open, session-refresh-on-lapse —
  see data-model.md */ }

/** @returns {void} */
export function invalidateEntitlement() { /* ... */ }
```

**Callers** (migrated in the same change, per Settled decision #1):
- `src/screens/SettingsScreen.jsx` (replaces `setTier(profile.tier === 'paid' ? 'paid' : 'free')`)
- `src/screens/PostSetSummaryScreen.jsx` (replaces `setIsFreeUser(!profile || profile.tier === 'free')`)
- `src/screens/SagaScreen.jsx` (replaces `.then(p => setTier(p?.tier ?? 'free'))`)
- `src/components/DeepRevealPane.jsx` (replaces the `tier: profile?.tier` feed into `describeQuota`)
- `src/lib/useLessonLockGuard.js` (replaces `store.getProfile().then(p => p?.tier ?? 'free').catch(() =>
  'free')`)

Each call site converts a boolean `entitled` answer into whatever local shape it previously derived from
`tier` (e.g. `'paid' | 'free'`) — `getEntitlement()` does not change what each screen renders, only where the
answer comes from.

**Session-refresh path (FR-013 addendum, research.md Decision 4)**: when a fetch resolves
`{ entitled: false, authenticated: false }` while the module holds a `lastKnownGood` of `entitled: true`,
the module attempts one bounded refresh via `src/lib/fetchWithAuthRetry.js`'s existing single-retry pattern
(`POST /api/auth/refresh` then one re-fetch of `GET /api/user/entitlement`) before overwriting
`lastKnownGood`. If no `lastKnownGood` exists, the module skips the refresh and returns `{entitled:false}`
immediately — this is the ordinary anonymous/free-tier path and must stay fast.

**Invalidation call site**: `src/lib/useUpgradeCheckout.js`'s `checkout.completed` handler, immediately
alongside its existing `setCheckoutReturnState('activated')` call.
