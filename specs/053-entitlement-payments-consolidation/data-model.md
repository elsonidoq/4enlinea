# Phase 1 Data Model: Entitlement & Payments Consolidation

No database schema changes ship in this feature (no new table, no new column — the spec's Assumptions
section is explicit: "the account's plan tier remains the single source of truth for entitlement; this
epic does not introduce a new, separate entitlement record"). All entities below are either in-memory
server computations, wire-format response shapes, or client-side ephemeral storage.

## Entitlement answer

**Owner**: `connect-four/server/entitlement.js` (new).

**Shape**: `{ entitled: boolean, authenticated: boolean }`.

**Derivation**: `entitled = user != null && user.tier === 'paid'`; `authenticated = user != null`, where
`user` is the `req.user` object `loadUser` (registered globally, `server/index.js`) already populates from
a `users.tier` DB read on every request. See research.md Decision 1.

**Production entry point**: `entitlementForRequest(req)` — the only exported function production code calls.
`computeEntitlement(user)` is the internal pure core it wraps; it is exported too, but only for unit tests
(research.md Decision 1's "structural, not conventional" rationale).

**Consumers** (all must agree, by construction, because all call the same function):
1. `GET /api/lessons/:id` handler → `lessonEntitlement.js#buildLessonResponse` (server-internal, no HTTP
   hop — FR-008).
2. `GET /api/user/entitlement` route handler (thin wrapper — FR-009).

**Failure mode**: never throws; returns `{ entitled: false, authenticated: false }` on any unexpected input
(FR-010, fail-closed).

**Why `authenticated` exists separately from `entitled`**: without it, a session-lapsed caller (expired
cookie → `loadUser` sets `req.user = null`) is indistinguishable from a genuinely free/anonymous caller —
both produce `entitled: false`. That collapse breaks the client's ability to attempt a session refresh
before accepting a downgrade (see "Client-cached entitlement answer" below and research.md Decision 4).

## Client-cached entitlement answer

**Owner**: `connect-four/src/lib/entitlement.js` (new, plain `.js` module — no JSX).

**Shape** (module-private state, not exported directly):
```js
{ entitled: boolean, authenticated: boolean, fetchedAt: number /* Date.now() ms */ }
```

**Public API**:
- `getEntitlement(): Promise<{ entitled: boolean }>` — cache-first, TTL-bounded (`ENTITLEMENT_CACHE_TTL_MS`,
  5 minutes — research.md Decision 2), falls back to the last successful answer on fetch failure (FR-013),
  defaults to `{ entitled: false }` only when no answer was ever obtained. The `authenticated` field is
  consumed internally (see below) but the public return value stays `{ entitled: boolean }` — no caller
  outside this module needs `authenticated`, per Decision 4's design.
- `invalidateEntitlement(): void` — clears the cached answer, forcing the next `getEntitlement()` call to
  re-fetch. Called from `useUpgradeCheckout.js`'s `checkout.completed` handler alongside
  `setCheckoutReturnState('activated')` (FR-012's checkout-return invalidation trigger).

**State transitions**:

| Trigger | Effect |
|---|---|
| `getEntitlement()`, no cached value, or cache older than TTL | Fetch `GET /api/user/entitlement`; on success, cache + return; on failure, return last known good or `{entitled:false}` |
| `getEntitlement()`, cached value within TTL | Return cached value, no fetch |
| Fetch resolves `{ entitled: false, authenticated: false }` **and** `lastKnownGood.entitled === true` | Do NOT immediately overwrite `lastKnownGood`. Attempt one bounded session refresh (`POST /api/auth/refresh`, reusing `fetchWithAuthRetry.js`'s single-retry pattern), then re-fetch `GET /api/user/entitlement` once. If the retry still returns `authenticated: false`, accept the downgrade and overwrite `lastKnownGood`. If no `lastKnownGood` exists yet (never-signed-in case), skip the refresh and accept `{entitled:false}` immediately (research.md Decision 4). |
| `invalidateEntitlement()` | Drop cached value's freshness (next call always fetches); last-known-good value is retained separately for the fail-open path so a fetch failure immediately after invalidation still degrades gracefully |
| Checkout completes (`checkout.completed` → `verify-transaction` resolves) | `invalidateEntitlement()` called |

## Lesson (locked view)

**Owner**: `connect-four/server/lessonEntitlement.js#buildLessonResponse` (new).

**Shape** (unentitled caller, paid lesson): `{ id: string, title: string, order: number, free: false,
locked: true, authenticated: boolean }` — `slides` field absent from the JSON body entirely (not `null`,
not `[]`). `authenticated` is carried through from the entitlement answer (research.md Decision 4) so a
client that sees `locked: true, authenticated: false` while it believed the account was paid can trigger the
same session-refresh path as the entitlement endpoint, instead of caching this as a settled "this account
is free tier" answer.

**Shape** (entitled caller, or any caller on a free lesson): the full existing `getLesson(id, locale)`
object, unchanged — no `locked` key present at all (its absence, not `locked: false`, signals "not locked,"
matching the existing response shape every current consumer already expects).

**Derivation rule**: `locked = !lesson.free && !entitlement.entitled`; `authenticated =
entitlement.authenticated`.

**Consumers** (all three MUST handle `locked === true` by rendering the existing upgrade-prompt affordance
instead of indexing `slides` — see research.md Decision 3's addendum and plan.md's Source Code map):
`src/screens/ConceptScreen.jsx`, `src/screens/SocraticScreen.jsx`, `src/screens/CLChallengeScreen.jsx`.

## Preserved set results (US5)

**Owner**: new `sessionStorage` entry, written by `PostSetSummaryScreen.jsx` before purchase, read by the
same screen on mount.

**Shape**:
```js
{ nonce: string /* crypto.randomUUID() */, results: Array<...> /* unchanged shape, see results prop below */, category: string }
```

**Key**: a fixed `sessionStorage` key (e.g. `'pendingSetResults'`) — sessionStorage is already tab-scoped, so
no per-nonce keying is needed; the nonce lives *inside* the value and travels through the checkout
`returnPath` (or an equivalent client-side channel — see quickstart.md) so the app can confirm the restored
value belongs to the purchase attempt that was in flight, not a stale leftover from an earlier, already-
resolved session (FR-032's "no stale outcome" requirement, extended here to results).

**Lifecycle**:
1. Written when a purchase starts from `/summary` (before `Paddle.Checkout.open()`).
2. Read + cleared on `/summary`'s mount effect if the nonce matches what the return flow expects.
3. If missing/invalid on return → existing `returnPathOverride='/setpicker'` fallback applies unchanged
   (FR-031 — this plan does not remove that fallback, only makes it a true fallback instead of the only
   path).
4. Survives a full app restart because `sessionStorage` (unlike React state) persists across a page reload
   within the same tab — this is the mechanism, not `localStorage` (which would survive a tab close, not
   required, and would risk stale leakage across sessions) and not `IndexedDB` (unnecessary durability for a
   single-purchase-attempt value).

## Payment-identity policy record (US3, documentation-only)

**Owner**: `docs/architecture/server-conventions.md` §"Identity binding on `transaction.completed`
(OI-55)" (existing section, edited in place — no new file).

**Change**: the existing "This was an unreviewed judgment call... treat this section as a proposal to
sanity-check, not settled policy" closing paragraph is replaced with a dated ratification paragraph naming
the accepted residual risks verbatim (FR-016): "an attacker granting paid access to an account they don't
control (at their own financial expense)" and "laundering a chargeback-prone payment onto a third party's
account." No code in this section changes (FR-017).

## `GET /api/limits` response (US4 quota plumbing)

**Owner**: `connect-four/server/index.js` (new route) + `connect-four/server/quotaLimits.js` (existing
constant, unchanged).

**Shape**: `{ freeDeepRevealWeeklyLimit: number }` — currently `20`, sourced live from
`FREE_DEEP_REVEAL_WEEKLY_LIMIT`.

**Failure mode**: always `200` (no external dependency — this is a bare constant, not gated behind
`PADDLE_API_KEY` or any other config). See research.md Decision 7 for why this is a separate endpoint from
`GET /api/paddle/config`.
