# Feature Specification: End-to-End QA Enablement

**Feature Branch**: `058-e2e-qa-enablement`
**Created**: 2026-09-07
**Status**: Draft
**Input**: Epic 13 — End-to-End QA Enablement (`docs/epics/e2e-qa-enablement-epic.md`): an autonomous
agent cannot today run a complete end-to-end QA of this app because two journeys are unreachable —
every login CTA (no agreed way to return to a clean signed-out state between them) and every payment
CTA (the checkout overlay never opened locally, and there is no way to roll a user back to free
afterwards). This feature makes both journeys drivable, repeatably, by an agent.

**The "user" of this feature is the QA agent, not an end customer.** Every user story below is
written from the perspective of an automated agent driving Chrome, plus the founder reading its
findings file. There are no customer-facing stories about paying subscribers, and no
end-user-visible behavior changes except dev-only affordances.

## Settled decisions (do not relitigate — carried verbatim from the epic)

1. **Google OAuth is out of QA scope.** Owner decision, 2026-09-07: "The google oauth works, so no
   need to Q&A that." It is also mechanically untestable from a worktree —
   `AuthModal.jsx:46` hardcodes `http://localhost:3001` in DEV, which reaches the **main checkout's**
   server, not this worktree's server. No OAuth test tooling is built.
2. **`🛠 Dev: skip auth` is the only login mechanism the QA exercises.** It yields an anonymous,
   no-email, free user. The QA verifies *CTA → modal → post-login return routing*, never identity or
   account linking. The findings report must state this rather than implying full coverage.
3. **There is no after-payment landing page, and no acceptance criterion may assume one.** Spec 050
   moved to an in-app overlay: `successUrl` is deliberately not forwarded to
   `Paddle.Checkout.open()`, and `handleCheckoutCompleted` closes the overlay in place
   (`src/lib/useUpgradeCheckout.js`). The correct assertion is: the overlay closes, the user remains
   on the exact screen whose CTA they clicked, `CheckoutReturnBanner` goes
   `confirming → activated`, and that screen re-renders Pro without a manual reload.
4. **The dev reset is the standard between-test reset.** `🛠 Dev: clear IndexedDB & sign out`
   (`SettingsScreen.jsx:330` → `handleDevReset` at `:304`) is the only path reaching a genuine
   first-run state. `signOut()` (`ProfileStore.jsx:98`, reachable at `StatsScreen.jsx:161`) leaves
   `localStorage`/IndexedDB intact and is used only when the sign-out button itself is the subject
   under test.
5. **Sandbox only.** Never `paddle-live`. Test transactions use Paddle sandbox test cards.
6. **The Paddle sandbox client token value is never committed.** It lives in
   `connect-four/.env.local` (gitignored). `connect-four/.env.example:34` already documents the
   variable name.
7. **The rollback tool is both a CLI script and a dev-only HTTP endpoint, sharing one implementation
   module.** Owner decision, 2026-09-07. The reset logic lives in a plain module; it is exposed as a
   dev-only endpoint gated by `requireLocalhost` (NOT `requireAdmin` — that check is a no-op outside
   `NODE_ENV=production`), giving an agent driving Chrome a way to trigger the reset without a shell,
   plus a thin CLI wrapper over the same module. The reset must null `paddle_customer_id`, not just
   set `tier='free'` (Non-obvious fact 1), and must cancel the Paddle sandbox subscription per the
   narrow exception in Settled decision 11 (AC1). It does not need to un-seed decision 9's email
   affordance: the standard reset (Settled decision 4) signs out and reloads, and the next
   `Dev: skip auth` mints a brand-new anonymous auth user and `users` row by construction — the email
   is gone because the row is gone, not because rollback cleared a field. **AC2's "observable without
   DevTools" is satisfied by the documented page reload after the reset, not by a server-side cache
   call** — `invalidateEntitlement()` is client-only code (`src/lib/entitlement.js:58`) that no
   server route can reach, and a reload discards the module-scoped cache wholesale regardless. No
   dev-gated "clear entitlement" button is added; it would be redundant with the required reload.
   **Rationale for why the reload is mandatory, not merely convenient:** even a soft, in-page call to
   `invalidateEntitlement()` (`src/lib/entitlement.js:58`) would be insufficient — it only zeroes
   `lastFetchedAt` and deliberately keeps `lastKnownGood`, so the fail-open branch can re-pin a stale
   `entitled: true` right after a downgrade. The hard reset is `clearEntitlement()`
   (`src/lib/entitlement.js:77`), used today only on sign-out (`src/store/ProfileStore.jsx:110`) —
   which is exactly what the documented reload-after-reset achieves by discarding the module-scoped
   cache wholesale, without adding any new server-reachable call.
8. **Webhook-driven downgrades are covered via locally-signed synthetic events.** Owner decision,
   2026-09-07. QA tooling POSTs correctly-signed Paddle events at the local
   `POST /api/paddle/webhook`, using `PADDLE_NOTIFICATION_WEBHOOK_SECRET` (present in
   `connect-four/server/.env`; this is the correct variable name — NOT `PADDLE_WEBHOOK_SECRET`) and
   the route's own verification, `paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)`
   (`connect-four/server/paddleProcessor.js:288`). **Binding constraint:** the synthetic payloads
   MUST be harvested from a real Paddle sandbox event, not hand-authored, for each of the three
   transitions at `server/paddleProcessor.js:64-70` (`subscription.updated → paused`,
   `subscription.canceled`, `past_due → no write`) — a hand-written fixture here is the "green test
   that tests your belief" trap. A tunnel (ngrok/cloudflared) and Paddle's webhook simulator are
   explicitly **not** in scope — the simulator still needs a publicly reachable URL and collapses
   into the tunnel option, which was rejected. Accepted residual gap: this tests our processor against
   our idea of Paddle's payload shape; payload drift would pass locally while production breaks — a
   staging concern, not something this feature closes.

   **Harvesting mechanics (owner-resolved, 2026-09-07; harvest-source method corrected during spec
   review).** "Harvested, not authored" means: take one real Paddle sandbox event payload and re-send
   it, substituting only a closed allowlist of fields — `data.customerId`, `data.id` (subscription
   id), `event_id`, `occurred_at`, and the signature timestamp — with everything else left verbatim,
   and `data.status` explicitly excluded (editing it to manufacture a transition state would defeat
   the point of harvesting). The harness re-signs at send time (`webhooks.unmarshal` enforces a
   timestamp variance window, so a stored signature goes stale). The named harvest source is: actively
   drive the sandbox subscription into each of the three states — pause via the Paddle API, cancel via
   the Paddle API, and dunning via the documented dunning test card `4000 0027 6000 3184`
   (`.claude/skills/app-qa/references/environment.md:116`) — then pull the three resulting
   notification-log payloads separately via the `paddle-sandbox` MCP. A completed sandbox purchase
   alone (AC3 already requires one) emits only `transaction.completed` and `subscription.created` and
   is NOT a sufficient harvest source for any of the three downgrade transitions. The harvested
   payloads are checked into the repo as fixtures so later runs don't re-harvest. Identifying and
   recording the harvest source is an explicit first task of the user story covering AC3a. Any
   harvest-source task that substitutes a field outside this closed allowlist is off-feature. Driving
   pause/cancel through the Paddle API falls under Settled decision 11's narrow sandbox-only
   exception; it must not be used to widen that exception.
9. **The email-bearing checkout branch is covered via a dev-only affordance.** Owner decision,
   2026-09-07. A dev-gated control (reusing the existing pattern in `AuthModal`/`SettingsScreen`)
   sets an email on the anonymous QA user, so both checkout branches (with/without `customer` in
   `Paddle.Checkout.open()`) are driven in one run, closing the OI-53 failure class. **This is not a
   frontend-only change.** `public.users` has no `email` column (Non-obvious fact 13), and
   `req.user.email` — the value the checkout branch reads — comes from the Supabase auth user
   (`server/index.js:547`). Setting it from the browser (`supabase.auth.updateUser({email})`) goes
   through a confirmation round-trip and does not take effect immediately, so the affordance is a
   dev-gated **button plus a `requireLocalhost` endpoint** using the service-role
   `auth.admin.updateUserById(id, { email, email_confirm: true })` — the same gating seam as decision
   7's rollback endpoint. It interlocks with decision 7, but not by un-seeding: Supabase cannot clear
   an auth user's email back to null. Instead, the documented reset (Settled decision 4) signs out
   and reloads, and the next `Dev: skip auth` mints a brand-new anonymous auth user and `users` row,
   so run N+1 starts from the no-email state by construction. Seeding a real email-bearing user
   directly in the DB was considered and rejected — dev-skip-auth has no "sign in as this specific
   user" affordance.
10. **One QA account persists across the entire payment CTA sweep.** Owner decision, 2026-09-07. The
    per-CTA dev reset (Settled decision 4) is used only for the **auth** CTA sweep (AC4), which tests
    routing, not tier. The payment sweep (AC3, AC3a) deliberately keeps one account for its whole
    run, so the second-payment security check (`paddleProcessor.js:343-360`) is genuinely exercised
    and Non-obvious fact 1 binds for a reason stated explicitly there, rather than reading as a
    contradiction with decision 4.
11. **QA rollback tooling may cancel Paddle sandbox subscriptions unattended, under a narrow written
    exception to `CLAUDE.md` §"Paddle integration."** Owner decision, 2026-09-07. The
    confirm-before-destructive-action rule governs calls to the `paddle-sandbox` / `paddle-live` MCP
    server; it does not extend to the Paddle **SDK** called directly from code. The exception:
    sandbox only, only subscriptions whose customer id matches the QA user's own row, cancellation
    performed via the Paddle SDK inside the rollback module (never the MCP server), and a `--yes`
    flag required for non-interactive runs. This exception is narrow and specific to this rollback
    module; it must not be generalized into a broader "QA tooling may perform destructive Paddle
    actions" permission. Because no subscription id is stored anywhere (`users` has only
    `paddle_customer_id`; no migration adds a subscription column — Non-obvious fact 14), the
    rollback module must list the customer's subscriptions through the Paddle API **before** nulling
    `paddle_customer_id` — nulling it first makes the id unrecoverable.

## Non-obvious facts (carried verbatim from the epic — context for requirements below)

### Rollback and tier-cache correctness (US1)

- **NF1 — Rollback must null `paddle_customer_id`, not just `tier`. This is the highest-risk fact in
  the feature.** `server/paddleProcessor.js` rejects any later `transaction.completed` whose claimed
  `customData.app_user_id` already has an *established* `paddle_customer_id` differing from the
  transaction's customer: it logs, returns `{ securityRejected: true }`, and skips the tier write. A
  rollback that only sets `tier='free'` leaves `paddle_customer_id` populated; run 2's checkout mints
  a new Paddle customer, mismatches, and is silently rejected — so run 2 reports "payment is broken"
  while the app is fine. This failure mode corrupts results rather than failing loudly. This fact
  binds specifically **because** the payment sub-run deliberately retains one account across the
  checkout sweep (Settled decision 10) — it does not apply to the auth sweep, which resets per CTA.
- **NF2 — A DB tier write is not observable by the client.** The entitlement cache is module-scoped
  (not account-scoped) and a direct DB write never calls `invalidateEntitlement()`. Rollback means
  the app renders free again, not the row says free. Today that requires a hard reload.
- **NF3 — `set-tier.js`'s documented path is wrong, and it can never restore `paddle_customer_id`
  (corrected 2026-09-08, tasks_critique B2).** It lives at
  `connect-four/server/scripts/set-tier.js` — **not** `scripts/set-tier.js` as
  `.claude/skills/app-qa/references/environment.md` states. Its email-lookup limitation is
  **conditionally** stale, not absolute: once Settled decision 9's email-seeding affordance has run
  on an account, `set-tier.js`'s lookup (`set-tier.js:19-24`, the admin auth API) succeeds for that
  account, so "unusable for the anonymous dev-skip-auth user" only holds before an email has been
  seeded. What remains true regardless, and is the load-bearing half: `set-tier.js`'s only write is
  `.from('users').update({ tier })` (`set-tier.js:27-28`) — it **never** writes
  `paddle_customer_id`. So even with an email seeded, `set-tier.js` cannot re-establish a paid
  state the downgrade fixtures (US2) or a post-reset replay (US1 Acceptance Scenario 5) can act on
  — that gap is what FR-027's `setQaAccountPaidState` closes.
- **NF14 — No Paddle subscription id is stored anywhere.** `users` carries only
  `paddle_customer_id`; no migration adds a subscription-id column. Settled decision 11's rollback
  module must therefore look up the customer's subscriptions through the Paddle API before nulling
  `paddle_customer_id` — nulling it first makes the subscription unrecoverable for cancellation.
- **NF15 — The reset does NOT clear `payment_events`; there is no per-account column to filter on,
  and a narrow delete would miss a second ledger row anyway.** `payment_events` (created as
  `stripe_events` in `server/migrations/001_initial.sql:50-57`, renamed by
  `060_paddle_rename_and_payment_events.sql`) has columns `id, event_id, event_type, payload,
  processed_at, created_at` — no user or customer column, so there is no per-account filter, only a
  JSONB dig into `payload`. A purchase also writes a *second* ledger row keyed
  `upgrade_completed_track:<transactionId>` (`server/paddleProcessor.js:195-199`) that any narrow
  delete would miss. This is why an earlier draft's rollback-clears-`payment_events` requirement was
  dropped: FR-017/FR-018 already require a fresh `event_id` on every synthetic-event send, which
  fully solves replayability (NF12) without an unscoped destructive delete on a module that also has
  a `--yes` non-interactive path.

### Payment coverage and the downgrade lifecycle (US2)

- **NF4 — The webhook is the primary tier mirror, and it cannot reach localhost.**
  `POST /api/paddle/webhook` (`server/paddleRoutes.js:89`) owns the lifecycle transitions enumerated
  at `server/paddleProcessor.js:64-70`: `subscription.updated → paused → tier:'free'`,
  `subscription.canceled → tier:'free'`, `past_due → no write`. Paddle sandbox cannot deliver to
  `localhost`, so locally only the synchronous `verify-transaction` fallback runs and every downgrade
  path would otherwise be unexercised. Solved by Settled decision 8: locally-signed synthetic events,
  POSTed at the local endpoint with a real secret and harvested-not-authored payloads, drive all
  three transitions without needing localhost to be reachable from Paddle.
- **NF5 — The no-email checkout branch was the only one QA could take, without further work.**
  `useUpgradeCheckout.js` omits `customer` entirely when there is no email, because passing a falsy
  email threw synchronously and was swallowed by `UpgradeModal`'s `catch{}` — no overlay, no console
  error, no visible failure (OI-53). The email-bearing branch had already produced one silent
  production-class bug. Solved by Settled decision 9: the dev-only affordance to set an email on the
  anonymous QA user means both branches are now covered.
- **NF9 — `POST /api/paddle/portal` exists and is part of the paid journey.**
  `server/paddleRoutes.js:105`, gated on `req.user.paddle_customer_id`; returns 400 without one.
- **NF10 — Dead `successUrl`/`returnPath` machinery may still exist.** The server computes it and
  `PostSetSummaryScreen.jsx:22` still passes `/setpicker`, but the UI ignores it (Settled decision 3).
  **UNVERIFIED** whether it is fully dead — planning must open the server path before specifying any
  removal, and removal is optional cleanup, never a QA failure.
- **NF11 — Tier writes are customer-keyed, and a mistargeted write fails silently.** `writeTier`
  (`server/paddleProcessor.js:167-175`) does `query.eq('paddle_customer_id', customerId)`, and both
  subscription-downgrade branches call it that way (`:391`, `:399`) — never by `userId`. A payload
  whose `customerId` does not match the QA row's current `paddle_customer_id` therefore updates zero
  rows; Supabase returns no error on a zero-row UPDATE, so the webhook route answers 200
  `{received:true, handled:true}` while nothing changed. This is why Settled decision 8's harvested
  payloads need the `data.customerId` substitution.
- **NF12 — `payment_events.event_id` is UNIQUE, so a replayed synthetic event is a silent no-op.**
  The insert happens before any tier write; a duplicate `event_id` hits Postgres error `23505` and
  short-circuits to `{ handled: false, eventType: 'duplicate' }` (`server/paddleProcessor.js:302-306`)
  without touching `users`. The same harvested payload sent on run N+1 therefore does nothing unless
  `event_id` is re-stamped per send (Settled decision 8) — a bare "replay the same fixture" would
  silently break AC1's idempotence requirement.
- **NF13 — `public.users` has no `email` column; the checkout branch reads the Supabase auth user,
  not the profile row.** Live column list: `id, device_uuid, tier, deep_reveal_count,
  deep_reveal_reset_at, paddle_customer_id, created_at, updated_at, streak_count, last_active_date,
  sparring_record, papergames_id, last_import_at, onboarding_status` — no `email`. `req.user.email` is
  set from the Supabase auth user's own record (`server/index.js:547`, `data.user.email` from
  `authClient.auth.getUser(token)`), which is why Settled decision 9's affordance must write through
  the auth admin API rather than the `users` table.

### Auth coverage and harness environment (US3, US4)

- **NF6 — A fresh worktree cannot run the app at all.** It has no `node_modules` (needs
  `npm install`) and no `.env` files (gitignored; must be copied from the main checkout). Encountered
  and worked around during the requirements review; `app-qa/references/environment.md` documents
  neither.
- **NF7 — Rate limits break long autonomous runs.** 120 req/min per IP, shared with the browser
  session. A 429 returns plain text, which surfaces as an opaque JSON decode error with no server log
  line.
- **NF8 — Call-site inventories (locate by symbol; line numbers drift). `DeepRevealPane.jsx`'s two
  call sites are excluded — deep reveal is out of QA scope by owner decision (see Out of Scope).**
  - 6 `AuthModal` sites: `HomeScreen.jsx:156`, `StatsScreen.jsx:169`, `SagaScreen.jsx:329`,
    `MistakeDetailScreen.jsx:551`, `OnboardingMissionScreen.jsx:111`,
    `OnboardingImportOfferScreen.jsx:119`.
  - 5 checkout sites: `SettingsScreen.jsx:47`, `SetPickerScreen.jsx:46`, `SagaScreen.jsx:154`,
    `PostSetSummaryScreen.jsx:22`, and `PricingScreen` (routed via `screenRegistry.jsx:44`).

## Orchestrator-established facts (verified 2026-09-07 — treat as settled, no re-derivation)

- **Local puzzle pool is already populated above the serving floor for all 12 categories** (602
  active rows total; floor is N=20 active per category, `specs/051-pattern-acceptance/pool-thresholds.md:3`).
  No spec/plan/task may treat an empty local puzzle pool as a QA blocker or a design decision. One
  outlier — a single active `forced_win` row (id `ea8d1739-8a69-45a6-964f-edd1b15ecf40`,
  `interaction_mode` `'sequence'`) has `correct_cols = NULL` while its 20 siblings have it populated —
  is a QA *finding*, out of this feature's scope (see Out of Scope); no task is generated for it.
- **Paddle sandbox test-card rules are already documented** at
  `.claude/skills/app-qa/references/environment.md:116` ("Paddle sandbox checkout — test cards"):
  `4242 4242 4242 4242` for a normal success, any future expiry / 3-digit CVC / ZIP / name; sandbox
  rejects real cards; sandbox-vs-live is decided by key prefix not `NODE_ENV`; scenario cards for 3DS,
  debit, declined, and dunning; the chrome-devtools a11y tree penetrates the Paddle iframe. No task
  documents test cards — it is done. The declined and dunning cards are directly useful to the AC3a
  downgrade work.
- **`staging_checks.md:102-105` still documents STRIPE test-mode keys and cards**, left over from
  before spec 050 migrated checkout to Paddle. Flagged to the owner; out of this feature's scope
  unless the owner says otherwise — no task silently absorbs this correction.
- **`npm run test:fast` baseline on this branch is GREEN**: 1755 tests, 264 suites, 0 fail (measured
  2026-09-07). Success criterion SC-007 ("`test:fast` stays green") is judged against this baseline,
  not against zero.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The QA agent resets an account to a known-free state between runs (Priority: P1)

As the QA agent, I can reset any test account to a known-free state — tier, Paddle linkage, and any
payment-event history from the run — via a single documented action, so that run N+1 starts from the
same conditions as run N and does not report false failures caused by leftover state from run N.

**Why this priority**: Every other user story depends on trustworthy resets. Without it, the payment
sweep's own security check (Settled decision 10, NF1) silently corrupts the second and every
subsequent run, and the auth sweep (US3) has no clean starting point per CTA.

**Independent Test**: Can be fully tested by driving one sandbox purchase to Pro, running the reset,
reloading, and confirming the account renders free-tier UI with no manual DevTools intervention — then
repeating the whole purchase → reset cycle a second time and confirming it succeeds identically.

**Acceptance Scenarios**:

1. **Given** a test account that completed a sandbox purchase and is tier `'pro'` with a populated
   `paddle_customer_id` and an active Paddle sandbox subscription, **When** the QA agent triggers the
   reset, **Then** `users.tier = 'free'`, `users.paddle_customer_id IS NULL`, and the Paddle sandbox
   subscription is canceled (Settled decision 11, NF14's lookup-before-null ordering).
2. **Given** a just-reset account, **When** the QA agent performs the documented page reload, **Then**
   a previously-Pro screen renders free-tier UI without any server-side cache-invalidation call (NF2,
   Settled decision 7).
3. **Given** the reset module, **When** it is invoked twice back-to-back on the same account, **Then**
   both invocations succeed without erroring on an already-absent subscription or an already-null
   `paddle_customer_id` (idempotence, AC1).
4. **Given** an account whose `paddle_customer_id` does not correspond to any Paddle sandbox
   subscription (e.g. never purchased), **When** the QA agent triggers the reset, **Then** it completes
   without error (nothing to cancel) and still nulls `paddle_customer_id` if set.
5. **Given** a payment-sweep run that exercised one or more of the downgrade transitions via synthetic
   webhook events, **When** the QA agent triggers the reset and then re-sends the same harvested
   fixture with a freshly-stamped `event_id`, **Then** the send succeeds and applies the expected tier
   effect — replayability is achieved by re-stamping `event_id` per send (FR-017/FR-018, NF12), not
   by the reset deleting `payment_events` (NF15; the reset does not touch that table).

---

### User Story 2 - The QA agent drives every payment CTA and the full downgrade lifecycle (Priority: P1)

As the QA agent, I can open the checkout overlay from every checkout entry point, complete a real
sandbox purchase, verify the paid experience takes effect in place, reach the billing portal, and — via
locally-signed synthetic Paddle webhook events — verify each of the three downgrade transitions the
webhook route owns, so the whole paid journey is verified rather than assumed.

**Why this priority**: This is the epic's primary diagnosis — "every payment CTA" was previously
unreachable — and it retires the false "Paddle does not work locally" belief recorded in four places.

**Independent Test**: Can be fully tested by opening each of the 5 checkout call sites (NF8) in turn,
completing at least one real sandbox transaction, confirming the in-place upgrade assertion (Settled
decision 3), reaching `/api/paddle/portal`, then separately POSTing three harvested-and-resigned
synthetic webhook events and confirming each produces its documented tier effect.

**Acceptance Scenarios**:

1. **Given** the app running locally with the sandbox client token configured, **When** the QA agent
   clicks each of the 5 checkout CTAs (NF8) in turn, **Then** the Paddle sandbox checkout overlay opens
   for each one.
2. **Given** an open sandbox checkout overlay, **When** the QA agent completes payment with a Paddle
   sandbox test card, **Then** the overlay closes, the user remains on the exact screen whose CTA was
   clicked, `CheckoutReturnBanner` transitions `confirming → activated`, and that screen re-renders Pro
   without a manual reload (Settled decision 3, verbatim).
3. **Given** the default anonymous QA user (no email), **When** the QA agent opens a checkout CTA,
   **Then** `Paddle.Checkout.open()` is called without a `customer` field and the overlay still opens
   (closing the no-email branch of OI-53).
4. **Given** the QA agent has used the dev-only email-setting affordance (Settled decision 9) on the
   test account, **When** the QA agent opens a checkout CTA, **Then** `Paddle.Checkout.open()` is
   called with a `customer` field populated from that email, and the overlay still opens (closing the
   email-bearing branch of OI-53).
5. **Given** a test account with a `paddle_customer_id` from a completed purchase, **When** the QA
   agent reaches the billing-portal entry point, **Then** `POST /api/paddle/portal` (NF9) is reached
   and returns a usable portal session.
6. **Given** a test account with no `paddle_customer_id`, **When** the QA agent reaches the
   billing-portal entry point, **Then** the 400 response renders something sensible in the UI rather
   than a dead button.
7. **Given** a real Paddle sandbox event payload (harvested per Settled decision 8's mechanics) for
   `subscription.updated → paused`, **When** the QA agent re-signs it with substituted allowlist
   fields only and POSTs it to `POST /api/paddle/webhook`, **Then** the route accepts the signature and
   the target account's `users.tier` flips to `'free'`.
8. **Given** a harvested-and-resigned `subscription.canceled` event for the same account, **When** the
   QA agent POSTs it, **Then** `users.tier` flips to `'free'`.
9. **Given** a harvested-and-resigned `past_due` event for the same account, **When** the QA agent
   POSTs it, **Then** no write occurs to `users` (the documented no-write branch, NF4).
10. **Given** the same harvested synthetic event POSTed twice with the same `event_id`, **When** the
    second POST is sent, **Then** the route responds without applying a second tier write (NF12) —
    this is expected duplicate-suppression behavior, not a bug to fix.

---

### User Story 3 - The QA agent drives every login CTA through both exits from a clean state (Priority: P2)

As the QA agent, I can trigger every AuthModal entry point from a known clean, signed-out state and
exercise both the dismiss exit and the complete exit, so login CTAs are verified as a set rather than
individually and inconsistently.

**Why this priority**: Depends on the reset tooling from US1 for a clean starting point per CTA;
independently valuable once that exists.

**Independent Test**: Can be fully tested by performing the documented reset, then for each of the 6
AuthModal call sites (NF8) in turn: opening the modal from that CTA, dismissing it and confirming
return-to-origin, then reopening and completing `🛠 Dev: skip auth` and confirming the CTA's promised
destination.

**Acceptance Scenarios**:

1. **Given** a freshly-reset (signed-out, empty IndexedDB) session, **When** the QA agent opens the
   AuthModal from each of the 6 call sites (NF8) in turn, **Then** the modal opens each time.
2. **Given** an open AuthModal from a given CTA, **When** the QA agent dismisses it, **Then** the app
   returns to the exact origin screen with no stranded state.
3. **Given** an open AuthModal from a given CTA, **When** the QA agent completes `🛠 Dev: skip auth`,
   **Then** the app lands on the destination that CTA promised.
4. **Given** the documented reset (Settled decision 4), **When** it runs before each of the 6 CTAs in
   sequence, **Then** each CTA is tested from an equivalent clean starting state, and the resulting
   session is anonymous, no-email, and free-tier (Settled decision 2) — never full identity or account
   linking.

---

### User Story 4 - The founder can trust the QA harness's own documentation (Priority: P3)

As the founder, I can read the QA harness's documentation and act on it directly, because every fact it
states about the environment, the tooling, and Paddle's local reachability is true — not because I
re-verify it myself first.

**Why this priority**: Lowest execution risk, but the epic's own diagnosis is that a false belief
("Paddle does not work locally") survived seven weeks because it was recorded once and never
re-checked; leaving the harness docs stale would repeat that failure immediately.

**Independent Test**: Can be fully tested by reading `.claude/skills/app-qa/references/environment.md`
and the four locations in the "Paddle does not work locally" belief, and confirming each states the
now-current, verified fact.

**Acceptance Scenarios**:

1. **Given** `.claude/skills/app-qa/references/environment.md`, **When** the QA agent reads the
   `set-tier.js` reference, **Then** it states the correct path (`connect-four/server/scripts/set-tier.js`)
   and the correct limitation: the email lookup works once Settled decision 9's affordance has
   seeded an email, but the script can never restore `paddle_customer_id` — its only write is
   `tier` (NF3, corrected 2026-09-08).
2. **Given** the same file, **When** the QA agent reads the worktree bootstrap section, **Then** it
   states that a fresh worktree needs `npm install` and copied `.env` files (NF6).
3. **Given** the same file, **When** the QA agent reads the rate-limit section, **Then** it states the
   120 req/min per-IP limit, that it is shared with the browser session, and that a 429 returns plain
   text that surfaces as an opaque JSON decode error with no server log line (NF7).
4. **Given** the four locations recording "Paddle does not work locally"
   (`docs/open_issues.md:3779`, `specs/057-mvp-launch-gate/spec.md:99`,
   `docs/epics/pre-launch-mvp-epic.md:180`, plus the consequential mentions), **When** the QA agent (or
   the founder) reads any of them, **Then** each is retracted and states that the sandbox checkout
   overlay works locally once the token is configured.
5. **Given** the harness's documentation for the rollback tool, **When** the QA agent reads it after
   US1 ships, **Then** it accurately describes the CLI/endpoint interface actually built (not a
   pre-US1 guess).

---

### Edge Cases

- What happens if the QA agent triggers the rollback endpoint on an account that was never a paid
  customer (no `paddle_customer_id`, no subscription)? → Must complete without error (Acceptance
  Scenario US1.4).
- What happens if a harvested synthetic webhook event is replayed with an unmodified `event_id`? →
  Must be silently suppressed as a duplicate, not double-applied (NF12, Acceptance Scenario US2.10).
- What happens if the rollback endpoint or the email-seeding endpoint is called from a non-localhost
  origin? → Must be rejected (403), since both are gated by `requireLocalhost`.
- What happens if the QA run is long enough to trip the 120 req/min rate limit? → The harness's
  documentation must describe the plain-text 429 failure mode (NF7) so an agent recognizes it instead
  of misreading it as a JSON decode bug.
- What happens when the billing portal is reached with no `paddle_customer_id`? → The 400 must render
  sensibly in the UI, not present as a dead button (Acceptance Scenario US2.6).
- What happens if the payment sweep (US2) and the auth sweep (US3) run in the same session? → They use
  different reset disciplines by design (Settled decision 10): the payment sweep keeps one account for
  its whole run; the auth sweep resets per CTA. Neither sweep's reset discipline may be silently
  substituted for the other's.

## Requirements *(mandatory)*

### Functional Requirements

**Rollback module (US1)**

- **FR-001**: The system MUST provide a single reset implementation, exposed both as a CLI script and
  as a dev-only HTTP endpoint gated by `requireLocalhost` (Settled decision 7).
- **FR-002**: The reset MUST set the target account's `users.tier` to `'free'` AND null
  `users.paddle_customer_id` in the same operation (NF1).
- **FR-003**: The reset MUST look up the target account's Paddle sandbox subscription(s) via the
  Paddle API and cancel any active subscription **before** nulling `paddle_customer_id` (NF14,
  ordering constraint).
- **FR-004**: Subscription cancellation MUST use the Paddle SDK called directly from the rollback
  module, never the `paddle-sandbox` or `paddle-live` MCP server (Settled decision 11).
- **FR-005**: Subscription cancellation MUST be scoped to sandbox subscriptions whose customer id
  matches the target account's own `paddle_customer_id` — never an unscoped or cross-account
  cancellation.
- **FR-006**: The CLI entry point MUST require an explicit `--yes` flag before performing a
  non-interactive cancellation (Settled decision 11).
- **FR-007**: *(removed — see Decision A in the spec-fix record. The reset MUST NOT clear
  `payment_events`: the table has no per-account column to filter on and a purchase writes a second
  ledger row a narrow delete would miss (NF15); replayability of harvested webhook fixtures is
  achieved by FR-017/FR-018's per-send `event_id` re-stamping instead. This slot is intentionally
  left vacant rather than renumbered, so no other FR id shifts.)*
- **FR-008**: The reset MUST be idempotent — invoking it twice in a row on the same account MUST NOT
  error, whether or not a subscription or `paddle_customer_id` remains to act on.
- **FR-009**: The reset MUST NOT attempt to clear the target account's email or un-seed the dev-only
  email affordance (Settled decision 9's interlock is via sign-out + reload + fresh anonymous user,
  not a rollback-side field clear).
- **FR-010**: The system MUST NOT introduce a server-reachable cache-invalidation call as part of
  rollback observability; the documented page reload is the sole mechanism (Settled decision 7,
  NF2). This is mandatory, not merely convenient: a soft in-page invalidation
  (`invalidateEntitlement()`, `src/lib/entitlement.js:58`) deliberately keeps `lastKnownGood`, so
  the fail-open branch could re-pin a stale `entitled: true` after a downgrade — only a full reload
  (equivalent to the hard reset `clearEntitlement()` performs on sign-out,
  `src/lib/entitlement.js:77`, `src/store/ProfileStore.jsx:110`) reliably clears it.

**Payment CTA and downgrade coverage (US2)**

- **FR-011**: All 5 checkout call sites (NF8) MUST open the Paddle sandbox checkout overlay when
  driven.
- **FR-012**: At least one checkout flow MUST be driven to a completed sandbox transaction and MUST
  satisfy Settled decision 3's post-completion assertion verbatim (overlay closes in place, origin
  screen unchanged, `CheckoutReturnBanner` `confirming → activated`, Pro renders without manual
  reload).
- **FR-013**: The system MUST provide a dev-gated affordance (button plus `requireLocalhost` endpoint,
  service-role `auth.admin.updateUserById`) to set an email on the anonymous QA user (Settled decision
  9).
- **FR-014**: Both checkout branches — no-email and email-bearing — MUST be driven and verified to
  open the overlay, closing the OI-53 failure class for both.
- **FR-015**: `POST /api/paddle/portal` MUST be reached with a `paddle_customer_id` present, and its
  400 no-`paddle_customer_id` path MUST render a sensible UI state rather than a dead button (NF9).
- **FR-016**: The harvest task MUST first drive the sandbox subscription into each of the three
  downgrade states — pause via the Paddle API, cancel via the Paddle API, and dunning via the
  documented dunning test card `4000 0027 6000 3184` (`.claude/skills/app-qa/references/environment.md:116`)
  — and MUST harvest the three resulting notification-log payloads separately, checked into the repo
  as fixtures (Settled decision 8). A completed sandbox purchase alone (`transaction.completed` +
  `subscription.created`) MUST NOT be treated as a sufficient harvest source for any of the three
  downgrade transitions.
- **FR-017**: For each of the three transitions at `server/paddleProcessor.js:64-70`
  (`subscription.updated → paused`, `subscription.canceled`, `past_due → no write`), the system MUST
  construct a locally-signed synthetic event from the harvested payload, substituting only the closed
  allowlist of fields (`data.customerId`, `data.id`, `event_id`, `occurred_at`, signature timestamp),
  and MUST verify the expected effect against the `users` row (tier flip, or no write for `past_due`).
  `data.status` is explicitly NOT part of this allowlist and MUST NOT be edited to manufacture a
  transition state — doing so converts a harvested payload back into a hand-authored one for the
  exact field under test and defeats Settled decision 8.
- **FR-018**: The synthetic-event construction MUST re-sign at send time rather than replaying a
  stored signature, since `webhooks.unmarshal` enforces a timestamp variance window.
- **FR-019**: The system MUST NOT use a tunnel (ngrok/cloudflared) or Paddle's webhook simulator for
  downgrade-lifecycle testing (Settled decision 8).

**Auth CTA coverage (US3)**

- **FR-020**: All 6 AuthModal call sites (NF8) MUST be driven through both exits: dismiss (returns to
  origin, no stranded state) and complete via `🛠 Dev: skip auth` (lands on the CTA's promised
  destination).
- **FR-021**: The documented reset (`🛠 Dev: clear IndexedDB & sign out`, Settled decision 4) MUST run
  before each of the 6 CTAs.
- **FR-022**: The system MUST NOT build Google OAuth test tooling (Settled decision 1).

**Harness truth and run mechanics (US4, AC5)**

- **FR-023**: `.claude/skills/app-qa/references/environment.md` MUST be corrected for NF3 (the
  `set-tier.js` path, and its real limitation — the email lookup works once an email is seeded,
  but it can never restore `paddle_customer_id`), NF6 (worktree bootstrap: `npm install` + copied
  `.env` files), and NF7 (the 120 req/min rate limit, shared with the browser, plain-text 429).
  Verified still undone as of this spec: `environment.md` still prints the wrong `set-tier.js` path
  (lines 99, 114) and has no worktree-bootstrap or rate-limit section — no task may treat any part
  of FR-023 as pre-satisfied. (`environment.md`'s "Paddle sandbox checkout — test cards" section,
  `environment.md:116`, is a separate, already-done item — see Orchestrator-established facts — and
  is not part of FR-023.)
- **FR-024**: The four "Paddle does not work locally" locations named in the epic's evidence section
  (`docs/open_issues.md:3779`, `specs/057-mvp-launch-gate/spec.md:99`,
  `docs/epics/pre-launch-mvp-epic.md:180`, and the consequential mentions at
  `docs/deployment_steps.md:371,422`, `docs/open_issues.md:3915,5738`, and
  `specs/057-mvp-launch-gate/quickstart.md:171`) MUST be retracted. Verified still undone as of this
  spec: `docs/open_issues.md:3779` and `specs/057-mvp-launch-gate/spec.md:99` both still assert
  Paddle "does not work locally" — no task may treat any part of FR-024 as pre-satisfied.
- **FR-025**: The environment doc's rollback-tool documentation MUST be written from the actual
  CLI/endpoint interface built by US1, not a pre-implementation guess.
- **FR-026**: The QA run covering this feature's flows MUST be startable with a single documented
  command and MUST write one stamped findings file, per the app-qa skill's existing convention (AC5).

**Repeatable paid-state re-establishment (added by tasks_critique B2, 2026-09-08)**

- **FR-027**: The system MUST provide a dev-gated way to set `users.tier = 'paid'` AND
  `users.paddle_customer_id` together, addressed by the target account's user id, without going
  through a real Paddle checkout. This is required because none of the other tools this feature
  builds or already has can do it: `resetQaAccount` (FR-002) only ever moves an account **toward**
  `free`; `set-tier.js` (NF3, corrected below) writes `tier` alone and never
  `paddle_customer_id`; and driving a fresh real checkout is not always available or desirable
  mid-QA-run (it is the thing US2's checkout sweep already exercises once, not a repeatable
  fixture-setup step). Without this capability, US2's three downgrade-transition assertions
  (subscription-updated→paused, subscription-canceled, subscription-updated→past_due) go vacuous
  after the first one flips the row to `free` — the second and third fixtures then assert against
  an already-free row and cannot fail for the right reason — and US1 Acceptance Scenario 5 (reset,
  then re-send a fixture with a fresh `event_id`) cannot be verified meaningfully either, since a
  reset account has `paddle_customer_id IS NULL` and a re-sent event matches zero `users` rows
  (NF11), passing silently. Implementation: a third `qaAccountTools.js` export,
  `setQaAccountPaidState({ userId, paddleCustomerId })`, exposed through the same
  `requireLocalhost` endpoint surface as `resetQaAccount`/`setQaAccountEmail` (not a CLI script —
  it must be reachable mid-run from the browser-driving QA agent, which a CLI cannot be). It
  performs a DB-only write (`supabase.from('users').update({ tier: 'paid', paddle_customer_id })`)
  and never calls the Paddle SDK.

### Key Entities

- **Rollback module**: The shared reset implementation used by both the CLI script and the dev-only
  endpoint. Inputs: target account identifier. Effects: `users.tier`, `users.paddle_customer_id`,
  Paddle sandbox subscription state. Does NOT touch `payment_events` — there is no per-account column
  to filter on, and replayability of harvested webhook fixtures is achieved instead by re-stamping
  `event_id` per send (NF15).
- **Synthetic webhook event fixture**: A harvested-not-authored Paddle sandbox event payload, checked
  into the repo, with a closed set of fields eligible for substitution before re-signing and sending.
- **QA test account**: An anonymous, no-email-by-default Supabase auth user plus its `public.users`
  row, minted via `🛠 Dev: skip auth`, optionally given an email via the dev-only affordance for the
  email-bearing checkout branch.
- **Paid-state re-establishment capability** (FR-027, added by tasks_critique B2): the third
  `qaAccountTools.js` export, `setQaAccountPaidState({ userId, paddleCustomerId })`. Inputs:
  `userId`, and a `paddleCustomerId` (nullable). Effect: `users.tier = 'paid'` AND
  `users.paddle_customer_id = paddleCustomerId` in one write. DB-only — no Paddle SDK call.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent can run the same QA suite twice back-to-back from the same starting state and
  get the same pass/fail result per CTA, with no manual cleanup between runs (idempotent runs, AC1).
- **SC-002**: After a rollback and the documented reload, a previously-upgraded account visibly shows
  free-tier UI with zero manual developer-tools steps (AC2).
- **SC-003**: All 5 payment entry points and all 6 login entry points in the app are exercised by an
  automated run, up from zero reachable today.
- **SC-004**: All three downgrade lifecycle outcomes (paused, canceled, past-due-no-write) are verified
  against real data end to end, up from zero verifiable locally today.
- **SC-005**: The billing-recovery entry point (portal) is reachable and its failure path is
  user-legible rather than a dead control.
- **SC-006**: Zero stale facts remain in the QA harness's own documentation about environment setup,
  rate limits, or Paddle's local reachability.
- **SC-007**: The full local automated test suite stays green throughout (`npm run test:fast`, 1755
  tests / 264 suites baseline, 0 fail).
- **SC-008**: No end-user-visible behavior changes — every new affordance introduced by this feature is
  gated to local development only.

## Assumptions

- The Paddle sandbox client token (`ctkn_01kxsd747gp2d0n3xyb28h602q`) is already configured in
  `connect-four/.env.local` for the worktree this feature is developed in (Evidence 1–2 of the epic);
  no task provisions it, only preserves and documents it.
- The chrome-devtools MCP a11y tree's ability to address the cross-origin Paddle iframe (Evidence 3)
  continues to hold; if a future Paddle.js version breaks that, it is a regression to report, not a
  design input for this feature.
- `requireLocalhost` remains the correct, real gate for every new dev-only endpoint this feature adds;
  `requireAdmin` continues to be a no-op outside `NODE_ENV=production` and is never relied on alone.
- The QA agent driving this suite has the same local environment access as the requirements-review
  session that produced the epic (running server + Vite dev server, ports resolved via
  `eval "$(./worktree-ports.sh)"`).
- `PADDLE_NOTIFICATION_WEBHOOK_SECRET` remains present and correct in `connect-four/server/.env` for
  the environment the synthetic-event tooling runs against.

## Out of Scope

- Real Google OAuth testing (Settled decision 1).
- Any `paddle-live` interaction.
- Fixing bugs the QA run *discovers* — this feature delivers the **ability** to run the QA. Findings
  become their own tasks/`OI-N` entries afterward, never fixed inline.
- Rewriting the app-qa skill's core methodology; only its stale facts and the tier-journey procedure
  change.
- Multi-account or concurrent-session testing.
- Changes to production tier/entitlement logic. Detectors, guards, and grading logic stay untouched.
- A tunnel (ngrok/cloudflared) or Paddle's webhook simulator for downgrade-lifecycle testing (Settled
  decision 8).
- Seeding an email-bearing user directly in the database (Settled decision 9).
- The deep-reveal surface (`DeepRevealPane`) and its auth and checkout CTAs. Owner decision,
  2026-09-07: "the deep reveal is OUT OF SCOPE." No task may drive `DeepRevealPane.jsx:460`
  (AuthModal) or `DeepRevealPane.jsx:62` (checkout) — see NF8's 6-and-5 inventories. Rollback needs
  no special handling for `deep_reveal_count` / `deep_reveal_reset_at` beyond whatever a fresh account
  already gives.
- The single `forced_win` puzzle row with `correct_cols = NULL` (id
  `ea8d1739-8a69-45a6-964f-edd1b15ecf40`) — a QA finding, not a blocker for this feature; no task
  addresses it here.
- The stale Stripe references in `staging_checks.md:102-105` — flagged to the owner, not corrected by
  this feature.
- Adding `VITE_PADDLE_CLIENT_TOKEN` to the main checkout's `.env.local` is handled as a direct,
  non-speckit edit per `docs/best_practices_spec_driven_development.md` §"When to skip speckit" —
  outside this pipeline, and verified already done. Retracting the "Paddle does not work locally"
  belief in the four evidence locations (FR-024) and documenting the worktree bootstrap in
  `environment.md` (FR-023, NF6) are **in-scope pipeline work**, not direct edits — checked at
  source and confirmed still undone (see FR-023, FR-024). The rollback-tool section of
  `environment.md` (which depends on US1's actual interface) is likewise in-scope pipeline work
  under FR-025.
- No `docs/deployment_steps.md` entry unless a task introduces a real production-visible change; this
  feature is local-and-dev-only with no deployment prerequisites.
