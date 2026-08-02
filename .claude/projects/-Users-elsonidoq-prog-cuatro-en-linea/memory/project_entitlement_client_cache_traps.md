---
name: project_entitlement_client_cache_traps
description: "getEntitlement's cache is module-scoped not account-scoped; sign-out needs clearEntitlement or the fail-open FR-033 branch re-pins a stale entitled:true forever"
metadata: 
  node_type: memory
  type: project
  originSessionId: 55226c7e-c6bb-4652-8845-65604ceb7e96
  modified: 2026-08-02T01:40:53.386Z
---

Traps in `connect-four/src/lib/entitlement.js` (spec 053 US2, the single client-side paid-vs-free
source that replaced five independent `profile.tier` reads). The *contract* is documented in
`docs/architecture/frontend-conventions.md` §"Reading the user's tier" — this file is only what that
doc won't warn you about.

## The cache is scoped to the MODULE, not to an account

`lastKnownGood` / `lastFetchedAt` are module-level singletons (same pattern as
`checkoutReturnFlow.js`). Nothing about them is keyed by user id. So any identity transition that does
not explicitly clear them leaves the previous account's answer in place.

## Why a stale `entitled: true` becomes PERMANENT, not merely stale

This is the non-obvious part, and it's why the bug is worse than an ordinary cache-staleness issue.
Two deliberate design choices compose into a trap:

1. The client **fails open** (FR-013) — opposite the server's fail-closed rule (FR-010) — because the
   server gate is the real enforcement point, so the client optimizes for never showing a paying
   customer a spurious upgrade prompt.
2. FR-033/"Decision 2": a fetch resolving `{entitled:false, authenticated:false}` while
   `lastKnownGood.entitled === true` is treated as an **ambiguous session lapse**, not a downgrade. It
   attempts one bounded session refresh, and if that is still ambiguous it keeps the stale answer *and
   re-pins `lastFetchedAt = now`* so it doesn't re-attempt a doomed fetch every call during an outage.

A signed-out user produces exactly that ambiguous shape. So without an explicit reset: within the TTL
the tab serves `entitled: true` outright, and past the TTL every subsequent read re-pins it for another
full window — forever, for the life of the tab. Found in cross-batch review of spec 053; fixed by
`clearEntitlement()` (drops `lastKnownGood` entirely) called from `ProfileStore.signOut()`. Regression
test in `tests/unit/entitlementClient.test.js` documents the pre-fix behavior first, then asserts the
reset.

**Do not "harmonize" the client's fail-open with the server's fail-closed** — the asymmetry is the
design, and both files carry comments saying so. The correct fix for an identity change is always
`clearEntitlement()`, never weakening the fail-open branch.

## `invalidateEntitlement()` ≠ `clearEntitlement()`

`invalidateEntitlement()` drops *freshness only* and deliberately preserves `lastKnownGood`, so a
forced re-fetch that then fails still has something to fail open to. It is therefore the wrong tool for
a sign-out and the right one after a checkout. Related: it fires **unconditionally** in
`useUpgradeCheckout.js`'s `checkout.completed` handler, not gated on the sync `verify-transaction`
succeeding — the webhook can activate the account moments later, and gating would pin a genuinely paid
customer to `free` for the rest of the TTL. Cost of being wrong that way is one extra fetch.

Related: [[project_paddle_integration]], [[feedback_isolated_review_misses_seams]] (this bug lived in
the join between two batches — the helper batch and the sign-out path — and neither batch's own tests
could see it).
