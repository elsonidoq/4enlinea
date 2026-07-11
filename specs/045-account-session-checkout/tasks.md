---
description: "Task list for Epic 5 — Account: Session Persistence & Paid Checkout"
---

# Tasks: Account — Session Persistence & Paid Checkout

**Input**: Design documents from `specs/045-account-session-checkout/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included — Constitution Principle III requires `node --test` coverage for new server logic,
and the feature spec explicitly calls out idempotency/substitutability as testable acceptance criteria.
Run via `npm run test:fast` (inside `connect-four/`), per CLAUDE.md — never `npm test` for routine checks.

**Organization**: Tasks are grouped by user story in **priority order** (US1, US2, US5 are all P1; US3
is P2; US4 is P3 — spec.md's own priority ranking, not story-number order). US5 (sandbox provisioning)
is sequenced before US3/US4 because it is an explicit verification prerequisite for both ("Without this,
User Stories 3 and 4 are unverifiable" — spec.md). US4 intentionally reuses code paths built in US3
("It piggybacks on the same code paths as User Story 3" — spec.md) — see the cross-story dependency
note under US5 and the US3→US4 note below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 / US5 — maps to spec.md's user stories
- File paths are relative to the repo root unless stated otherwise (`connect-four/` prefix implied for
  all `server/` and `src/` paths)

---

## Phase 1: Setup

- [x] T001 Confirm baseline: run `npm run test:fast` (inside `connect-four/`) on a clean checkout of
  this branch and record that it passes before any Epic 5 change lands — establishes the regression
  floor this feature must not break.

---

## Phase 2: Foundational (blocks US2's de-dup build only — does not block US1/US3/US4/US5)

**⚠️ CRITICAL — run this before writing any `authRefresh.js` de-dup code (plan.md "Implementation
Sequencing", FR-002a).**

- [x] T002 Run the FR-002a empirical check (`research.md` R1): against a real signed-in session on this
  project's Supabase auth instance, fire two **concurrent** `POST /api/auth/refresh` requests presenting
  the **identical** `sb_refresh_token` cookie value (a throwaway script under
  `connect-four/server/scripts/` or two parallel `curl` calls is sufficient — this does not need to be a
  permanent committed artifact) and observe the second call's response.
  - Append the observed outcome (success/failure, error code if any) to `research.md` R1 as a dated
    finding, replacing the "INFERRED, pending empirical confirmation" heading with the confirmed result.
  - **If the second call fails** (e.g. `refresh_token_already_used`, 401, revoked-family error):
    rotation-with-reuse-detection is confirmed → US2's de-dup task (T008) must build the single-flight
    coordination described in `research.md` R1.
  - **If the second call succeeds** (both calls return valid, usable cookies): FR-002a is already
    satisfied by current behavior → T008 becomes a documentation-only task (regression test asserting
    two concurrent refreshes both succeed; no de-dup Map is built).
  - This task blocks T008 only. It does not block T003–T006 (US1), T018–T040 (US3/US4), or T014–T017
    (US5).

**Checkpoint**: R1 outcome recorded — US2's de-dup scope (T008) is now known. All other stories may
proceed regardless of this task's outcome.

---

## Phase 3: User Story 1 - Stay signed in for weeks (Priority: P1) 🎯 MVP

**Goal**: Returning users stay recognized as signed in across a 60-day rolling window measured from
their most recent successful refresh, not a fixed 60 days from original sign-in.

**Independent Test**: Sign in, force the refresh-token cookie's effective age forward (or reason about
the `maxAge` value directly), confirm the cookie's expiry reflects a 60-day rolling window and that it is
reset on every successful refresh. Fully testable without any Stripe/payment work.

- [x] T003 [US1] Change `REFRESH_TOKEN_MAX_AGE` from `7 * 24 * 3600_000` to `60 * 24 * 3600_000` in
  `connect-four/server/index.js` (~line 207). `ACCESS_TOKEN_MAX_AGE` (1h, line 206) is unchanged.
- [x] T004 [US1] Confirm all four cookie-set call sites (`connect-four/server/index.js` ~lines 235, 272,
  327, and the `POST /api/auth/anonymous` site ~line 332/334) reference the `REFRESH_TOKEN_MAX_AGE`
  constant rather than a literal duplicate value, so the 60-day change applies uniformly. Fix any site
  found to hardcode the old value.
- [x] T005 [P] [US1] Add a regression test asserting `REFRESH_TOKEN_MAX_AGE === 60 * 24 * 3600_000` and
  that `POST /api/auth/callback`/`/refresh`/`/anonymous` all set `sb_refresh_token` with that `maxAge`,
  in `connect-four/server/userEndpoints.test.mjs` (extend existing auth-cookie test coverage there) or a
  new `connect-four/server/authRefresh.test.mjs` if that file is created first by T011 (US2).
- [x] T006 [US1] Manual acceptance (per `quickstart.md` "US1/US2" steps 1–4): sign in locally, delete only
  `sb_access_token` in devtools, reload → still signed in with no prompt; then delete both cookies, reload
  → signed out, sign-in prompt shown. This also exercises FR-001/FR-002's rolling-window intent (full
  60-day elapsed-time verification itself is out of reach locally — see the FR-008 staging check, T043).

**Checkpoint**: User Story 1 is independently functional — the cookie window is 60 days and rolls
forward on every refresh (rotation confirmed in US2's phase, but the `maxAge` itself does not depend on
that).

---

## Phase 4: User Story 2 - Never see a surprise sign-out mid-session (Priority: P1)

**Goal**: Expired short-lived access tokens are transparently recovered via the longer-lived refresh
credential before the user is ever treated as signed out; concurrent refresh attempts converge on one
consistent state (FR-002a, scope determined by T002).

**Independent Test**: Force `sb_access_token` to expire mid-session while `sb_refresh_token` remains
valid, then hit an authenticated action — session recovers transparently, no visible interruption.

- [x] T007 [US2] Create `connect-four/server/authRefresh.js` exporting
  `async function attemptRefresh(refreshToken) → Promise<{ accessToken, refreshToken } | null>`,
  extracted from the existing `POST /api/auth/refresh` handler body
  (`connect-four/server/index.js:257-280`). Returns `null` on any failure (invalid/expired/revoked);
  the caller decides the HTTP response. Per the reconciled plan (`plan.md` "Reconciliation note (auth
  routes stay inline)"), `POST /api/auth/refresh` and `GET /api/auth/session` stay **inline** in
  `index.js` — no `authRoutes.js` module is created; both inline handlers import `attemptRefresh`
  directly from this file. (Correction: an earlier draft of this task cited `authRoutes.js` as
  merely "optional per plan.md" — plan.md said no such thing. The reconciled reasoning is that, unlike
  the Stripe routes, no substitutability driver in this feature requires auth routes to be extracted
  into a register-function; only `stripeRoutes.js` needs that seam, for US4.)
- [x] T008 [US2] Implement FR-002a per T002's outcome, inside `attemptRefresh`:
  - **If T002 confirmed rotation-with-reuse-detection**: add a short-lived, TTL-bounded in-memory
    de-duplication `Map` keyed by the incoming `refreshToken` string value (mirrors the existing
    papergames in-memory job-Map pattern, `server-conventions.md` "In-Memory Job Map Pattern") — a
    refresh already in flight for a given token value is awaited and its result shared, rather than
    firing a second `refreshSession` call.
  - **If T002 found refresh does not invalidate a credential still in use elsewhere**: skip the de-dup
    Map entirely; this task becomes "confirm no coordination code is needed" — the regression test in
    T011 covers this instead.
- [x] T009 [US2] Update `POST /api/auth/refresh` (`connect-four/server/index.js:257`) to call
  `attemptRefresh()` from T007/T008 instead of its inline logic; response shape unchanged.
- [x] T010 [US2] Update `GET /api/auth/session` (`connect-four/server/index.js:290`) per
  `contracts/api-auth-session.md`'s new processing order: if the access token is absent/invalid, fall
  through to `attemptRefresh(sb_refresh_token)` before ever returning 401 — on success, set the new
  cookies and return `200 { user: { id, tier } }` exactly as if the user had been signed in the whole
  time; on failure, clear both cookies and return `401 { error: 'Token invalid' }` (existing failure
  path, unchanged). No response-shape change — `ProfileStore.checkSession` requires no frontend edits
  (`research.md` R7).
  - **FR-007 remediation precondition** (not verify-only): if T013's manual OAuth-return check finds
    that this endpoint's auto-refresh actually conflicts with the in-flight OAuth hash-callback branch
    (`App.jsx:31`) — e.g. a race where `checkSession`'s non-hash branch issues `GET /api/auth/session`
    and rotates cookies before the hash-callback exchange completes — adding a client-side ordering
    guard in `ProfileStore.checkSession` (skip/defer the auto-refresh call while a hash-callback is
    pending) is IN SCOPE for this task, per `contracts/api-auth-session.md`'s "Verification is not
    purely read-only" note. Do not close FR-007 as verify-only if a conflict is actually observed.
- [x] T011 [P] [US2] Unit tests in `connect-four/server/authRefresh.test.mjs`: (a) `attemptRefresh` success
  and failure paths; (b) if T008 built the de-dup Map, a concurrency test asserting two simultaneous calls
  with the same token value trigger only one underlying `refreshSession` call and both resolve to the
  same result; if T008 found no de-dup needed, a regression test asserting two concurrent refreshes with
  the same token both succeed independently.
- [x] T012 [US2] Add `connect-four/server/authRefresh.test.mjs` to both the `"test"` and `"test:fast"`
  script entries in `connect-four/package.json`.
- [x] T013 [US2] Manual acceptance (per `quickstart.md` step 5 and spec.md US2 Acceptance Scenarios):
  two-tab race check — open two tabs signed in as the same user, expire the shared access-token cookie,
  reload both within the same second → neither tab shows a spurious sign-out; and verify the in-flight
  OAuth hash-callback branch (`App.jsx:31`) is untouched by this change (FR-007) by actually driving an
  OAuth sign-in return and observing whether the new `GET /api/auth/session` auto-refresh interferes. If
  a conflict is observed, implement the client-ordering guard called out in T010's FR-007 remediation
  precondition before considering FR-007 satisfied — do not mark FR-007 done on a verify-only pass that
  found a real conflict.

**Checkpoint**: User Stories 1 and 2 together deliver the full "stay signed in for weeks, never bounced
mid-session" experience, independent of any payment work.

---

## Phase 5: User Story 5 - Get the payment sandbox actually working (Priority: P1)

**Goal**: The Stripe sandbox has a real purchasable product (monthly + annual prices) and a registered
webhook destination, and one full test-mode purchase has been proven end-to-end.

**Independent Test**: Starting from the confirmed-empty sandbox (`research.md` R6), provision a product
with both prices, register a webhook destination, and run one complete test purchase, confirming the
purchasing user's account flips to paid.

**Note on sequencing**: T014–T016 (provisioning) have no code dependency and can run at any time,
including before US1–US4. T017 (the actual end-to-end purchase run) requires a working checkout +
webhook code path and therefore executes **after** US3's backend tasks (T018–T021) and ideally after
US4's webhook-idempotency fix (T033) have landed — see Dependencies & Execution Order below.

- [x] T014 [US5] Using Stripe MCP (`stripe_api_write` / `fetch_stripe_resources`), create one product in
  the `acct_1TrxCXET4Rc2BDFf` ("DecodeC4 sandbox") account with two active recurring `Price` objects —
  one monthly, one annual. Ground all API usage in the `stripe:stripe-best-practices` skill and
  `search_stripe_documentation` rather than memory (account was previously unconfigured, per
  `research.md` R6).
- [x] T015 [US5] Populate `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID` in
  `connect-four/server/.env` (local/dev only, gitignored) with the two price IDs from T014.
- [x] T016 [US5] Register a webhook endpoint (via Stripe MCP or `stripe listen --forward-to
  localhost:3001/api/stripe/webhook` for local forwarding) and populate `STRIPE_WEBHOOK_SECRET` in
  `connect-four/server/.env`. This is the "locally/test-reachable environment" FR-022 refers to — a
  deployed, publicly reachable webhook destination is explicitly out of scope here (FR-024, see T043).
- [x] T017 [US5] Run one complete test-mode purchase end-to-end using `stripe:test-cards`
  (`4242 4242 4242 4242`): start checkout → complete test payment → confirm the webhook event is
  delivered and processed → confirm the purchasing test user's `users.tier` flips to `'paid'` in the DB.
  **Depends on**: T018–T021 (US3 checkout backend) at minimum; run after T033 (US4 webhook idempotency
  fix) if sequencing allows, though not strictly required for this task's own pass/fail condition.

**Checkpoint**: The sandbox is provisioned and one real purchase has round-tripped successfully — US3
and US4's acceptance criteria can now be verified against a live sandbox rather than an empty one.

---

## Phase 6: User Story 3 - Upgrade to paid with a clear plan choice (Priority: P2)

**Goal**: A signed-in free user can pick monthly or annual, complete checkout, and always sees either
the unlocked paid experience or an explicit "activating" acknowledgment — never a silent free-tier
screen.

**Independent Test**: As a free-tier user, open the upgrade prompt, pick a plan, complete a test payment,
land back in the app, and observe the paid UI (or a bounded "activating" state that resolves to it).

### Backend (extraction + interface — also the substrate US4 builds on)

- [x] T018 [US3] Create `connect-four/server/paymentProcessor.js`: the `PaymentProcessor`
  interface/typedef (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`) plus a
  `createPaymentProcessor({...})` factory, per `contracts/payment-processor-interface.md` and
  `research.md` R5. Note: `getSubscriptionStatus` is deliberately test-only in production wiring — no
  production call site is wired through it (real paid-gates read `tier` directly off `req.user`); it
  exists to prove the 3-method interface's substitutability (FR-016c/US4 AC2-3) via T022/T036, and
  `getSubscriptionStatus`'s pure derivation over `tier`/`stripeCustomerId` is what FR-016c documents as
  "derivable" — this is sufficient as designed, not a gap (see T041's doc note).
- [x] T019 [US3] Create `connect-four/server/stripeProcessor.js`: `createStripeProcessor({...})`
  implementing the 3-method interface by wrapping the existing Stripe call sites
  (`connect-four/server/index.js:2697` create-checkout, `:2729` webhook, `:2787` portal) verbatim — no
  behavior change to the underlying Stripe calls yet (R2's idempotency fix and R3's `loadUser` fix land
  in US4, T033/T034).
- [x] T020 [US3] Create `connect-four/server/stripeRoutes.js` exporting
  `registerStripeRoutes(app, paymentProcessor)`, extracting the three route handlers out of `index.js`
  per the code block in `contracts/payment-processor-interface.md` (mirrors the existing
  `registerUserRoutes(app, supabase)` pattern in `connect-four/server/userRoutes.js`). Preserves exact
  status-code mapping (503 not-configured, 500 genuine Stripe errors).
- [x] T021 [US3] Wire `connect-four/server/index.js`: replace the module-level `let stripe = null; if
  (process.env.STRIPE_SECRET_KEY) {...}` block and inline route definitions with a single
  `paymentProcessor = process.env.STRIPE_SECRET_KEY ? createStripeProcessor({...}) : null` construction
  plus one `registerStripeRoutes(app, paymentProcessor)` call at boot (mirrors the existing
  `registerUserRoutes(app, supabase)` call site).
- [x] T022 [P] [US3] Unit tests for `createCheckout`/`handleWebhook`/`getSubscriptionStatus` (mocked
  Stripe SDK, constructor-injected) in `connect-four/server/stripeProcessor.test.mjs`.

### Frontend

- [x] T023 [P] [US3] Add a monthly/annual segmented toggle and `activating`/`timeout` `uiState` values to
  `connect-four/src/components/UpgradeModal.jsx`, preserving the existing `onDismiss={fn}` /
  `onUpgrade={async (plan) => {...}}` prop contract exactly (per `contracts/upgrade-flow-frontend.md` and
  CLAUDE.md `feedback_spec_existing_apis`) — `onUpgrade`'s signature extends from `()` to `(plan)`, which
  is not a breaking change since no current call site passes it.
- [x] T024 [P] [US3] Create `connect-four/src/lib/useUpgradeCheckout.js`: shared handler that
  `POST`s `{ plan }` to `/api/stripe/create-checkout` (`credentials: 'include'`) and navigates to the
  returned `checkoutUrl`, per `contracts/upgrade-flow-frontend.md`.
- [x] T025 [US3] Wire a real `onUpgrade` handler (via T024's hook) into
  `connect-four/src/screens/PostSetSummaryScreen.jsx`.
- [x] T026 [P] [US3] Wire a real `onUpgrade` handler into `connect-four/src/screens/SetPickerScreen.jsx`.
- [x] T027 [P] [US3] Wire a real `onUpgrade` handler into `connect-four/src/screens/SagaScreen.jsx`.
- [x] T028 [P] [US3] Wire a real `onUpgrade` handler into `connect-four/src/components/DeepRevealPane.jsx`.
- [x] T029 [US3] Implement `?checkout=success|cancelled` return-flow handling (new small component or an
  `App.jsx` mount-time effect, per `contracts/upgrade-flow-frontend.md`): on `?checkout=success`, strip
  the query param via `replaceState` (preserving `window.location.hash`, per the `App.jsx:31` trap),
  then run the bounded-wait poll `[0s, 2s, 4s, 7s, 10s]` (FR-015/R4) via `ProfileStore`'s existing
  `refetchSession`, rendering the "activating your subscription…" banner while polling, the paid UI once
  `tier === 'paid'`, or the "still activating, refresh to check again" message if the budget elapses
  (manual refresh re-runs the same 5-attempt sequence). On `?checkout=cancelled`, strip the param
  silently — free tier, no error, retry available.
- [x] T030 [P] [US3] Unit test for the return-flow poll state machine (idle/polling/activated/timeout
  transitions and the `[0,2,4,7,10]`s schedule) in
  `connect-four/tests/unit/checkoutReturnFlow.test.js`.
- [x] T031 [US3] Add `connect-four/server/stripeProcessor.test.mjs` (T022) and
  `connect-four/tests/unit/checkoutReturnFlow.test.js` (T030) to both the `"test"` and `"test:fast"`
  script entries in `connect-four/package.json`.
- [x] T032 [US3] Manual acceptance (per `quickstart.md` "US3" steps 1–5, using the sandbox provisioned in
  US5): toggle monthly/annual, complete a test purchase, land on `?checkout=success` → see "activating…"
  then paid UI with `users.tier === 'paid'` confirmed in the DB; repeat and cancel out → free tier, no
  error, retryable.

**Checkpoint**: A free user can genuinely upgrade end-to-end on either plan, with no silent free-tier
fallback at any point in the flow.

---

## Phase 7: User Story 4 - Swap payment providers without reworking the app (Priority: P3)

**Goal**: Every checkout/confirmation/subscription-status code path goes through the shared
`PaymentProcessor` interface only; a stand-in implementation is demonstrably substitutable via
config/wiring alone, with zero edits to `UpgradeModal` or any paid-feature gate. Also closes the
folded-in bugs (R2 webhook idempotency, R2a FR-025 status-based tier mirror, R3 `loadUser` gap)
uncovered while building this seam.

**Independent Test**: With US3's real processor wired and working, swap in a stand-in `StubProcessor` at
the construction point used by `registerStripeRoutes` and confirm identical route behavior with no
changes to `UpgradeModal.jsx`, `index.js` call sites, or tier-gate code.

- [x] T033 [US4] Fix R2 (webhook idempotency) in `connect-four/server/stripeProcessor.js`'s
  `handleWebhook`: check the `stripe_events` insert result; on a `23505` unique-violation (this
  `stripe_event_id` was already processed), skip the tier-update and `tracks` (`upgrade_completed`)
  insert entirely and return `{ handled: false, eventType: 'duplicate' }` immediately (mirrors the
  existing `insertGameBlunder` `23505`-as-success dedup pattern, `server-conventions.md`). Closes
  FR-018/SC-005 (no duplicated downstream side effects on a re-delivered confirmation event).
- [x] T033a [US4] Implement FR-025's status-based tier write in `connect-four/server/stripeProcessor.js`'s
  `handleWebhook`, per `research.md` R2a and `contracts/payment-processor-interface.md` (owner-added
  hard requirement: `users.tier` MUST be a live mirror of Stripe's subscription status, not set once at
  purchase). Replace the current unconditional `tier: 'paid'` write on `customer.subscription.updated`
  with a branch on the event's actual subscription `status` field: `active`/`trialing` → write `tier:
  'paid'`; `past_due` → **no write** (tier stays whatever it already is — Stripe's automatic retry
  window; a single transient decline must not downgrade a paying user); `canceled`/`unpaid` → write
  `tier: 'free'`. On a `customer.subscription.deleted` event, write `tier: 'free'` unconditionally
  (explicit cancellation reaching its terminal state). This write sits inside T033's same idempotency
  guard, so a re-delivered event does not re-trigger the write. Closes FR-025/SC-008 and resolves
  spec.md's former Open Question 1 in code.
- [x] T034 [P] [US4] Fix R3 (`loadUser` missing `stripe_customer_id`) in `connect-four/server/index.js`:
  add `stripe_customer_id` to `loadUser`'s two `.select()` calls (~line 354 initial fetch, ~line 360
  just-created-row fetch) and to the two fallback object literals used when no profile row is found
  (~line 364). Fixes the `POST /api/stripe/portal` endpoint (always-`undefined` `stripe_customer_id`
  today) and unblocks `getSubscriptionStatus` (FR-016c/FR-017 — pure derivation from `tier` +
  `stripeCustomerId` already on `req.user`).
- [x] T035 [US4] Create a test-only `StubProcessor` implementing the same 3-method interface with no
  network calls (canned `createCheckout` URL, in-memory tier map for `handleWebhook`/
  `getSubscriptionStatus`) — e.g. `connect-four/tests/fixtures/stubProcessor.js`, per
  `contracts/payment-processor-interface.md`. Never wired into a running server outside tests.
- [x] T036 [US4] US4 substitutability test: construct two fresh Express apps, each via its own call to
  `registerStripeRoutes` — one with `createStripeProcessor({ /* mocked Stripe SDK */ })`, one with the
  `StubProcessor` from T035 — and assert identical status codes / response shapes across a
  create-checkout → webhook → portal request sequence, in
  `connect-four/server/stripeRoutes.substitutability.test.mjs`. Confirms zero code changes are needed in
  `UpgradeModal.jsx`, `index.js` call sites, or any tier-gate code to swap processors (FR-020, SC-007,
  US4 AC3).
- [x] T037 [P] [US4] Unit test: a duplicate `stripe_event_id` delivered twice to `handleWebhook` results
  in `tier` set exactly once and the `upgrade_completed` `tracks` insert firing exactly once (FR-018,
  regression test for T033), in `connect-four/server/stripeProcessor.test.mjs`.
- [x] T037a [P] [US4] Regression tests for FR-025/T033a in `connect-four/server/stripeProcessor.test.mjs`:
  (a) a `customer.subscription.updated` event with `status: 'past_due'` leaves an already-`'paid'` user's
  `tier` unchanged (no downgrade during the retry window); (b) a `customer.subscription.updated` event
  with `status: 'canceled'` (and separately, `status: 'unpaid'`) sets `tier: 'free'`; (c) a
  `customer.subscription.deleted` event sets `tier: 'free'` regardless of the subscription's prior
  status; (d) duplicate delivery of any of (a)–(c) triggers the write (or non-write) exactly once,
  sharing T037's idempotency-assertion style. Covers SC-008.
- [x] T038 [P] [US4] Regression test: `loadUser` returns `stripe_customer_id` on `req.user` for both the
  initial-fetch and just-created-row code paths (regression for T034), in
  `connect-four/server/userHelpers.test.mjs` or `connect-four/server/userEndpoints.test.mjs` (whichever
  already covers `loadUser`).
- [x] T039 [US4] Add `connect-four/server/stripeRoutes.substitutability.test.mjs` and the new assertions
  from T037/T037a/T038 to both the `"test"` and `"test:fast"` script entries in
  `connect-four/package.json`.
- [x] T040 [US4] Manual acceptance (per `quickstart.md` "US4"): run
  `npm run test:fast` (inside `connect-four/`) and confirm the substitutability suite (T036) passes,
  proving both processor implementations produce identical route behavior with no production call-site
  edits.

**Checkpoint**: All four functional user stories (US1–US4) plus the sandbox prerequisite (US5) are
independently verifiable; the payment seam is provably swappable and the two folded-in bugs are fixed.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T041 [P] Update `docs/architecture/server-conventions.md`: document the `PaymentProcessor` seam
  (`paymentProcessor.js`/`stripeProcessor.js`/`stripeRoutes.js` register-function pattern, mirroring
  `registerUserRoutes` — note that `POST /api/auth/refresh`/`GET /api/auth/session` deliberately stay
  inline in `index.js`, importing `attemptRefresh` from `authRefresh.js` directly, with no
  `authRoutes.js` module — per T007/plan.md's reconciliation note), the `REFRESH_TOKEN_MAX_AGE` 60-day
  change, the `attemptRefresh` de-dup pattern (or its documented absence, per T002/T008's outcome), the
  `loadUser` `stripe_customer_id` fix, the FR-025 status-based tier-mirror webhook logic (T033a — `tier`
  is a live derivation of Stripe subscription status, not set once at purchase), and an explicit note
  that `getSubscriptionStatus`'s only consumer is test-only by design (T018/T022/T036) — subscription
  standing in production is read as `users.tier` directly, which `getSubscriptionStatus` encodes as a
  pure function for substitutability-proof purposes, not as a production call-site requirement.
- [x] T042 [P] Update `docs/architecture/api-conventions.md`: document `GET /api/auth/session`'s new
  auto-refresh processing order (per `contracts/api-auth-session.md`), `POST /api/auth/refresh`'s
  concurrent-call de-dup behavior contract, and the FR-025 webhook tier-mirror contract (status-based
  `tier` write on subscription events, per `contracts/payment-processor-interface.md`).
- [x] T043 Append Epic 5's staging-only checks to `/Users/elsonidoq/prog/cuatro_en_linea/staging_checks.md`
  under a new `## Epic 5 — Account: Session Persistence & Paid Checkout` heading, following the file's
  existing "What / Why staging / Expected / Source" convention (see the Epic 3 section for the pattern),
  with two `- [ ]` items:
  1. **Supabase dashboard session/inactivity-timeout verification** — confirm the identity provider's own
     session-timeout configuration permits the full 60-day window (FR-008); local dev cannot confirm an
     external IdP dashboard setting.
  2. **Deployed (non-local) Stripe webhook delivery** — confirm a payment-confirmation event reaches a
     real, publicly reachable deployment (FR-024); explicitly out of scope for local/test-mode US5
     verification (T014–T017).
- [x] T044 Run the full `quickstart.md` validation end-to-end (US1 through US5, in order) as a final
  manual regression pass.
- [x] T045 Run `npm run test:fast` (inside `connect-four/`) as the final automated regression gate; all
  new test files from T005/T011/T022/T030/T036/T037/T037a/T038 must be green alongside the existing
  suite before this feature is considered complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2, T002)**: No dependencies. Gates **T008 only** (US2's de-dup scope) — does
  **not** block US1, US3, US4, or US5's provisioning tasks (T014–T016).
- **US1 (Phase 3)**: Depends on Setup only. Fully independent of every other story.
- **US2 (Phase 4)**: Depends on Foundational (T002) for T008's scope decision; otherwise independent of
  US1/US3/US4/US5. T007/T009/T010 can start immediately; T008 waits on T002's result.
- **US5 provisioning (T014–T016)**: Depends on Setup only — no code dependency, can run anytime,
  including before US1–US4.
- **US5 verification (T017)**: Depends on T018–T021 (US3 backend: checkout + webhook code paths must
  exist to run a real purchase). Not required to wait for US4 (T033/T034), though running it after T033
  is preferable so idempotency is exercised too.
- **US3 (Phase 6)**: Depends on Setup only for its own acceptance bar. T018–T021 (backend seam) have no
  dependency on US1/US2/US5; T023–T032 (frontend) depend on T018–T021 existing (same request/response
  shapes as today, per contracts — no behavior change to depend on beyond the existing endpoints).
- **US4 (Phase 7)**: Depends on T018–T021 (US3's `paymentProcessor.js`/`stripeRoutes.js`) already
  existing — US4 fixes bugs in and adds a stub for the seam US3 built, per spec.md's own framing ("It
  piggybacks on the same code paths as User Story 3"). This is why US4 (P3) is sequenced after US3 (P2)
  despite both being "payment" stories.
- **Polish (Phase 8)**: Depends on all prior phases being complete (T043 in particular needs FR-008 (US1)
  and FR-024 (US5) context; T041/T042 need the final shape of every new module).

### Story Independence Summary

| Story | Can start after | Hard code dependency on another story |
|---|---|---|
| US1 | Setup | None |
| US2 | Setup (+ T002 gates T008 only) | None |
| US5 provisioning | Setup | None |
| US5 verification (T017) | US3 backend | T018–T021 |
| US3 | Setup | None |
| US4 | US3 backend | T018–T021 |

### Parallel Opportunities

- T005 (US1 test) can run parallel to T007–T010 (US2 handler work) once T003/T004 land — different
  files.
- T014–T016 (US5 provisioning) can run in parallel with all of US1/US2/US3 backend work — no shared
  files, external system only.
- T022–T028 (US3 tests + 4 frontend call sites) are almost entirely parallel — different files, no
  cross-dependencies except each screen file wiring being independent of the others.
- T034 (R3 fix) and T037/T037a/T038 (regression tests) can run parallel to T033/T033a/T035/T036 —
  different files (T037a shares `stripeProcessor.test.mjs` with T037 but is additive, not conflicting).
  T033a depends on T033 landing first (same function, same file, sequential edits).
- T041/T042 (docs) can run in parallel with each other and with T043–T045.

---

## Parallel Example: User Story 3 (frontend wiring)

```bash
# Once T018-T021 (backend seam) and T023-T024 (toggle + hook) land, these four are fully parallel:
Task: "Wire real onUpgrade handler in src/screens/PostSetSummaryScreen.jsx"
Task: "Wire real onUpgrade handler in src/screens/SetPickerScreen.jsx"
Task: "Wire real onUpgrade handler in src/screens/SagaScreen.jsx"
Task: "Wire real onUpgrade handler in src/components/DeepRevealPane.jsx"
```

## Parallel Example: User Story 4 (bug fixes + stub)

```bash
# T033 (webhook idempotency) and T034 (loadUser fix) touch different files/functions:
Task: "Fix R2 webhook idempotency in server/stripeProcessor.js"
Task: "Fix R3 stripe_customer_id in loadUser, server/index.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (US1) — the 60-day cookie window alone already ships the single most-reported
   annoyance fix (`new_TODOs #22`).
3. **STOP and VALIDATE**: quickstart.md US1 steps.
4. Deploy/demo if ready — US1 alone is a coherent, shippable increment.

### Incremental Delivery

1. Setup → US1 (cookie window) → demo.
2. Add US2 (silent refresh, gated by T002) → demo — US1+US2 together deliver the full "never forced to
   re-sign-in" promise.
3. Add US5 provisioning (T014–T016) any time in parallel with the above.
4. Add US3 backend + frontend (checkout works against the now-provisioned sandbox; run T017 once T018–T021
   land) → demo.
5. Add US4 (bug fixes + swappability proof) → demo — completes the epic.
6. Polish: docs + staging_checks.md + final regression (T041–T045).

### Notes

- [P] tasks touch different files with no dependency on an incomplete task.
- Every new server module ships with `node --test` coverage in the same or an adjacent task, per
  Constitution Principle III and `feedback_calllm_error_handling`-style discipline (don't defer tests to
  a separate pass).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Former Open Question 1 (cancellation/downgrade → tier timing) is now **resolved** per spec.md FR-025
  (owner decision: downgrade on final termination only, `past_due` stays paid) and implemented by
  T033a/T037a — no task above introduces a `subscription_status` column or cancellation-handling UI;
  only the existing `tier` field's write-condition changes.
