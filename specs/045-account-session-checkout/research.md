# Research: Account — Session Persistence & Paid Checkout

## R1. FR-002a — does refresh rotate or only extend? (CONFIRMED, empirically tested 2026-07-11)

**2026-07-11 empirical finding (supersedes the inference below)**: Ran two live tests directly against
this project's Supabase Auth instance (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from
`connect-four/server/.env`, via `@supabase/supabase-js`'s `authClient.auth.signInAnonymously()` +
`authClient.auth.refreshSession()` — no server process involved, direct GoTrue calls):

1. **Concurrent test**: signed in anonymously to get a real session + refresh token, then fired two
   concurrent `refreshSession({ refresh_token })` calls presenting the *identical* token value from two
   separate client instances via `Promise.all`. **Both calls succeeded** (`error: null`, valid session
   returned by both).
2. **Sequential reuse test**: signed in anonymously, called `refreshSession` once (got a new refresh
   token, confirmed different from the original — `gmisc5dadamg` → `njiret5lx5uz`), then — *after that
   first call had fully completed* — called `refreshSession` again with the **original, now-superseded**
   token value. **This also succeeded** (`error: null`, valid session returned).

**Conclusion**: This Supabase project's GoTrue configuration does **not** enforce refresh-token rotation
with reuse detection (or at minimum has a grace/reuse-tolerance window that a sequential post-completion
reuse falls well outside of and still succeeds). A previously-issued refresh token remains usable even
after a newer one has been issued from it. This is the "second call succeeds" branch of the empirical
task below → **FR-002a is already satisfied by current behavior**. Per the plan's own escape hatch,
`authRefresh.js` does **not** get a single-flight de-dup Map; T008 is documentation-only, closed by a
regression test (`authRefresh.test.mjs`) asserting two concurrent same-token refreshes both succeed
independently. (Caveat: this was tested against anonymous sessions, the only kind mintable without a
live email/OAuth flow in this environment; there is no reason to expect password/OAuth sessions to differ,
since token rotation policy is a GoTrue project-level setting applied uniformly across grant types, not
session-type-specific — but this exact scenario was not separately re-run for a non-anonymous session.)

---

### Original inference (superseded by the empirical finding above, kept for audit trail)

**Question**: When `POST /api/auth/refresh` (`server/index.js:257-280`) succeeds, does the underlying
Supabase refresh token get invalidated (rotated), or does the old refresh token remain valid alongside
the new one?

**Method used so far (inference, not an empirical test)**: Read `authClient.auth.refreshSession({
refresh_token })` (Supabase GoTrue client, `server/index.js:263`) behavior and the project's GoTrue
configuration. **No live call was made against this project's Supabase instance to observe the actual
response of a second concurrent refresh call.** This section documents the inference and the reasoning
behind it; it is a premise the plan treats as *unconfirmed* until the standalone empirical task (see
`plan.md` "Implementation Sequencing") runs.

**Finding (inference from documented GoTrue behavior)**: `refreshSession` calls Supabase Auth's
`/token?grant_type=refresh_token` endpoint. Supabase GoTrue's *documented default* refresh-token behavior
is **rotation with reuse detection**: each successful refresh issues a brand-new `refresh_token` and
immediately invalidates the previous one server-side. A second call using the now-superseded token is
documented to fail with `refresh_token_already_used` (or similar), and — if reuse detection is enabled
(the Supabase default) — the *entire* refresh-token family can be revoked, forcibly signing the user out
everywhere.

This is **not overridable at the client-library level** (`authClient.auth.refreshSession` has no
"don't rotate" option); it would be a GoTrue project-level setting. The code at `:257-280` unconditionally
sets a *new* `sb_refresh_token` cookie from the response and never reuses the old one, which is
*consistent with* rotation being in effect — but consistency-with is not proof; this project's GoTrue
instance has not actually been asked to rotate a token twice and been observed doing so.

**Working conclusion (conditional on the empirical task)**: If rotation-with-reuse-detection is confirmed
by the empirical check, then FR-002a is a live, unresolved risk in the current code, not an
already-satisfied requirement, for the following reasons:
- Two tabs open, tab A's access token expires and triggers `/api/auth/refresh` first → tab A gets new
  cookies; the old refresh token is now dead.
- Tab B, still holding the *old* refresh cookie value in its own in-memory copy of "what cookie exists"
  (in practice: browsers share cookies same-origin, so tab B will actually read the *same, updated*
  cookie jar — cookies are not per-tab, they're per-origin) — **this matters**: because `sb_refresh_token`
  is a same-origin httpOnly cookie, not `localStorage`, all tabs in the same browser share one cookie jar.
  A refresh performed by tab A immediately updates the cookie that tab B's next request will also send.
  There is no per-tab stale-copy problem *as long as tab B has not already sent its own concurrent
  refresh request using a refresh token value it read before tab A's rotation landed*.
- The real risk is **two concurrent in-flight `/api/auth/refresh` requests** (e.g., two tabs whose access
  tokens expire within the same event-loop tick and both fire `POST /api/auth/refresh` before either
  response returns): both read the *same* pre-rotation refresh-token cookie value, both call
  `refreshSession` with it — the first succeeds and rotates; the second is now presenting an
  already-used token and fails, triggering the failure branch (`res.clearCookie(...)`, 401), which the
  frontend currently treats as "sign the user out" (`ProfileStore.checkSession` catches the error and
  falls back to anonymous `IndexedDBStore`).
- **This is a genuine, reproducible spurious-sign-out bug for concurrent tabs/devices**, not a
  documentation-only gap. FR-002a needs real machinery, not just a test.

**Empirical task (must run before any de-dup code is written)**: fire two concurrent
`POST /api/auth/refresh` requests presenting the exact same `sb_refresh_token` cookie value against a
real, signed-in session in this project's Supabase instance, and observe the second response.
- **If the second call fails** (e.g. `refresh_token_already_used`, 401, or a revoked-family error) →
  rotation-with-reuse-detection is confirmed; proceed with the single-flight de-dup design below.
- **If the second call succeeds** (echoes/re-issues valid cookies, no error) → this project's refresh
  behavior only extends the credential rather than invalidating it on every use; **FR-002a is already
  satisfied by current behavior**. In that case, do not build `authRefresh.js`'s de-dup map — instead
  document the observed behavior in `server-conventions.md` and add one regression test asserting two
  concurrent refreshes both succeed, per the spec's documentation-only escape hatch (FR-002a).

**Decision for FR-002a, conditional on confirmation**: If (and only if) the empirical task confirms
rotation with reuse detection, implement **single-flight coordination on the server**, not tolerance of a
stale credential (rotation with reuse detection means "tolerate a grace window" is not compatible with
GoTrue's revocation-on-reuse behavior — a grace window would require *not* using GoTrue's native reuse
detection, which is out of reach without a Supabase support ticket). Concretely:

- A short-lived in-process de-duplication of concurrent `POST /api/auth/refresh` calls for the *same*
  refresh-token value: if a refresh is already in flight for a given token value, subsequent callers
  await and reuse its result rather than firing their own `refreshSession` call. This is the smallest
  change that removes the race, entirely server-side, no new schema, no new client behavior beyond
  "the endpoint doesn't race itself."
- Scope: keyed by the incoming `sb_refresh_token` cookie value (a string), TTL-bounded in-memory Map
  (mirrors the existing in-memory job-map pattern from papergames imports, `server/server-conventions.md`
  "In-Memory Job Map Pattern").
- This does **not** require any client-side single-flight/locking — the existing "each tab independently
  calls `/api/auth/session` → 401 → refresh" flow (added by US5.2) is left as-is; only the server
  endpoint gets de-duplication.

**Alternatives considered**:
- *Client-side leader-election / BroadcastChannel coordination across tabs*: rejected — much larger
  surface area (new cross-tab messaging code, browser-support caveats) for a race window that is only a
  few hundred milliseconds wide in practice (both tabs' access tokens must expire in the same narrow
  window). Server-side de-dup is a 15-20 line change that fully closes the race with no new client code.
- *Grace-window tolerance of the just-superseded token*: rejected — incompatible with GoTrue's built-in
  reuse-detection revocation; would require disabling a Supabase security feature.
- *Do nothing, document only*: this is the correct outcome **if and only if** the empirical task finds
  refresh does not invalidate a credential still in use elsewhere (see "Empirical task" above) — not
  rejected outright, but gated. Only reject this alternative once the empirical task confirms rotation;
  until then it remains the live fallback per the spec's explicit escape-hatch wording.

## R2. Webhook idempotency — current gap

**Finding**: `POST /api/stripe/webhook` (`server/index.js:2729-2784`) inserts into `stripe_events`
(unique on `stripe_event_id`, confirmed in `db-schema.md`) but **does not check the insert result before
proceeding** — the insert is fire-and-forget (`.catch(err => console.error(...))`) and the tier-flip /
`tracks` insert logic runs unconditionally afterward, regardless of whether this was a duplicate
delivery.

Setting `tier: 'paid'` twice is naturally idempotent (last-write-wins, same value). However, the
fire-and-forget `tracks` insert (`event: 'upgrade_completed'`) on `checkout.session.completed` **fires
again on every duplicate delivery** — this is exactly the "duplicated downstream effect" FR-018/SC-005
prohibit (a double-counted upgrade-completed analytics event).

**Decision**: Change the webhook handler to check the `stripe_events` insert result: if it fails with a
`23505` (unique-violation, i.e., this `stripe_event_id` was already processed), skip the tier-update and
analytics block entirely and return `{ received: true }` immediately. This mirrors the existing
`insertGameBlunder` dedup pattern (`23505` as success, documented in `server-conventions.md`).

## R2a. Webhook tier logic — currently `subscription.updated` always writes `paid` (owner-added FR-025)

**Finding**: The current webhook handler treats `customer.subscription.updated` as unconditionally
implying the user should be tier `'paid'` — it does not inspect the event payload's actual subscription
`status` field. There is no code path today that ever writes `tier: 'free'` in response to a subscription
ending (cancellation reaching its effective end, or a card ultimately failing after Stripe's retries are
exhausted). Under FR-018/FR-020 alone this was out of scope; the owner has now added FR-025 (`users.tier`
MUST be a live mirror of Stripe's subscription status, with automatic downgrade on final termination),
which makes this a latent correctness bug that must be fixed as part of this feature.

**Decision**: Change the webhook handler's tier-setting logic to branch on the subscription event's
`status` field instead of always writing `'paid'`:
- `active` / `trialing` → write `tier: 'paid'`.
- `past_due` → **no write** (leave `tier` as whatever it already is — this is Stripe's automatic retry
  window; a single decline must not downgrade a paying user).
- `canceled` / `unpaid` → write `tier: 'free'` (retries exhausted, or explicit cancellation already
  reached its terminal state).
- `customer.subscription.deleted` event (regardless of the deleted subscription's last status) → write
  `tier: 'free'` (explicit cancellation, terminated).
- This logic sits inside the same idempotency-guarded branch as R2 (skip entirely on a duplicate
  `stripe_event_id`), so the downgrade is idempotent under redelivery per FR-018/R2.
- No new stored field: this is a `tier`-only conditional write, keeping FR-017 intact.

**Explicitly not built**: any grace-period UI, "update your card" reminder, past_due banner, or retry
nudge — those remain out of scope (see spec.md "Explicitly out of scope"); only the `tier` value's
write-condition changes.

## R3. `stripe_customer_id` missing from `loadUser` — blocking bug for `getSubscriptionStatus`/portal

**Finding**: `loadUser` (`server/index.js:339-369`) selects `tier, deep_reveal_count, deep_reveal_reset_at,
device_uuid, papergames_id, last_import_at` from `users` — **`stripe_customer_id` is not included**.
`POST /api/stripe/portal` (`:2787-2802`) reads `req.user.stripe_customer_id`, which is therefore always
`undefined` today — the portal endpoint's `if (!req.user.stripe_customer_id) return 400` branch fires
for every user, even ones who successfully paid. This is a live bug uncovered by this feature's own
FR-016/FR-017 requirement (subscription status must be derivable from `tier` + `stripe_customer_id`).

**Decision**: Add `stripe_customer_id` to `loadUser`'s two `.select()` calls (initial fetch line 354 and
the just-created-row fetch line 360) and to the two fallback object literals when no profile is found
(line 364). This is a one-line-per-site fix bundled into the `PaymentProcessor.getSubscriptionStatus`
implementation task, not a schema change (the column already exists per `db-schema.md`).

## R4. Bounded-wait polling schedule — RATIFIED, resolves FR-015

Per the epic's only guidance ("a few attempts over roughly 10 seconds") and SC-003's non-numeric framing,
this schedule is now the ratified, spec-level decision (FR-015 closed; see `spec.md`):

- Poll `GET /api/auth/session` (which returns `tier`) at `[0s (immediate), 2s, 4s, 7s, 10s]` — 5 attempts,
  total budget 10s, increasing spacing (fewer server round-trips early, still resolves fast for the
  common case where the webhook lands in under 2s).
- If `tier === 'paid'` at any attempt, stop polling and show the paid UI immediately.
- If the 10s budget elapses without `tier === 'paid'`, switch to the FR-013 "still activating" message
  with a manual refresh affordance (re-running the same poll sequence on demand, not an infinite background
  poll).

This is a **resolved decision**, not a working assumption — `tasks.md` should implement this schedule
directly without a further `/speckit-clarify` pass on FR-015. (Open Question 1, cancellation/downgrade
timing, remains genuinely open and is unaffected by this resolution.)

## R5. `PaymentProcessor` interface shape

**Decision** (per epic "Settled decisions" — not re-litigated, just concretized against real call sites):

```js
// server/paymentProcessor.js
interface PaymentProcessor {
  createCheckout({ userId, email, plan }) → Promise<{ checkoutUrl: string }>
  handleWebhook(rawBody, signatureHeader) → Promise<{ handled: boolean, eventType: string }>
  getSubscriptionStatus({ tier, stripeCustomerId }) → { status: 'free' | 'paid' }
}
```

- `StripeProcessor` wraps the existing three Stripe call sites (`:2697`, `:2729`, `:2787` — portal stays
  a Stripe-specific convenience method on `StripeProcessor`, not part of the 3-method interface, since
  US4's interface is scoped to createCheckout/handleWebhook/getSubscriptionStatus per the epic, and the
  billing-portal is not itself a spec requirement — FR-016 lists exactly those three operations).
- `getSubscriptionStatus` is a **pure function** of `{ tier, stripeCustomerId }` already on `req.user`
  (post-R3 fix) — no new DB read, no new stored field (FR-017).
- A minimal `StubProcessor` (US4 AC3 / FR-020) implements the same 3-method interface without calling
  Stripe, returning canned success/failure — used only to prove call-site substitutability via a
  config/wiring swap: `server/index.js` constructs whichever processor via a single factory call
  (`createPaymentProcessor({...})`), and the test harness demonstrates the swap by passing a
  `StubProcessor` instance into that same construction point (dependency injection at the wiring layer)
  instead of calling `createStripeProcessor`. No production-facing `PAYMENT_PROCESSOR` env toggle is
  added — it isn't needed to satisfy AC3, and would be unused production surface. No second real
  provider is built.

## R6. Sandbox state (verified via Stripe MCP, live check 2026-07-11)

- Account: `acct_1TrxCXET4Rc2BDFf` ("DecodeC4 sandbox").
- `GET /v1/products` → **zero products**, confirming the epic's claim still holds as of plan time.
- US5 will create one product with two recurring `Price` objects (monthly, annual), a webhook endpoint
  registered against a locally-reachable URL (e.g., via `stripe listen --forward-to` for local dev, or a
  tunnel), and populate `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` in
  `connect-four/server/.env`.

## R7. Frontend session-check flow (current state, confirmed by reading code)

`ProfileStoreProvider.checkSession()` (`src/store/ProfileStore.jsx:16-62`) today: on a hash-based OAuth
return, POSTs to `/api/auth/callback`; otherwise GETs `/api/auth/session` — **on any non-2xx response it
silently falls back to anonymous `IndexedDBStore`, with no refresh attempt**. This confirms the epic's
"US5.2 changes this behavior" framing: `GET /api/auth/session` (`:290-316`) itself only reads the access
token and clears cookies + 401s on failure — no refresh is attempted server- or client-side today.

**Decision**: Implement the auto-refresh **inside** `GET /api/auth/session` (server-side), not as a
second client-side round trip. When the access-token check fails (expired/invalid) but a refresh-token
cookie is present, the handler internally calls the same refresh logic as `POST /api/auth/refresh`
(extract to a shared helper `attemptRefresh(req, res)` used by both endpoints) before falling back to
401 + cookie-clear. This means `ProfileStore.checkSession`'s existing single `GET /api/auth/session` call
transparently benefits with **no frontend code change required** for the core silent-refresh behavior
(FR-004) — the hash-preservation trap (`App.jsx:31`) is irrelevant to this change since it only touches
the non-hash branch.

## R8. Testing approach

No auth or Stripe-specific test file exists yet. New tests follow existing patterns:
- `server/userEndpoints.test.mjs` pattern (Express app + mock supabase client, per
  `server-conventions.md` "Route Module Organization") for `attemptRefresh`, single-flight de-dup, and
  the webhook idempotency check — pure handler-logic tests, no real DB/Stripe.
- `PaymentProcessor`/`StripeProcessor`/`StubProcessor` unit tests mock the `stripe` SDK object directly
  (constructor-injected, not the module-level singleton) so the substitutability claim (US4 AC3) can be
  asserted without hitting real Stripe.
- Run via `npm run test:fast` per CLAUDE.md; new files added to both `test` and `test:fast` npm scripts.
