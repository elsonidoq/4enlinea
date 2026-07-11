# Feature Specification: Account — Session Persistence & Paid Checkout

**Feature Branch**: `045-account-session-checkout`
**Created**: 2026-07-11
**Status**: Draft
**Input**: User description: "Epic 5 — Account: Session Persistence & Paid Checkout. Keep users signed in for weeks, and validate the already-scaffolded Stripe checkout flow behind a swappable payment-processor interface." (full epic text supplied by the caller; see `polish_epic.md` lines 744–905 for the source epic)

## Context: refactor-and-wire, not greenfield

This feature wraps and extends existing, already-built surfaces rather than building new ones from scratch:

- Sign-in, sign-out, session-check, and token-refresh already work today, but the session is short (1-hour access token, 7-day refresh token) and the app does not attempt a silent refresh when the access token expires — it simply signs the user out.
- Stripe checkout, the payment webhook, and the customer billing portal already exist in code and already flip a user's account tier on successful payment. However, the connected Stripe sandbox has **zero products and prices configured**, so this flow has never been exercised end-to-end. Provisioning the sandbox and proving the round-trip works is in scope here.
- The in-app upgrade prompt (a bottom-sheet with idle/loading/success states) already exists but today is a **dead button** — none of its four call sites currently wire it to any real upgrade action. This feature wires it to real checkout and adds a monthly/annual plan choice.
- Account tier (free vs. paid) is already stored per-user; no new stored fields are introduced by this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stay signed in for weeks (Priority: P1)

As a returning user, I want to stay signed in for weeks so that I don't have to repeatedly sign back in every time I return to the app after a few days away.

**Why this priority**: Losing sign-in state is the single most visible daily-use annoyance reported in the source issue tracker (`new_TODOs #22`). It affects every returning user, every session, and blocks trust in "my progress is saved."

**Independent Test**: Sign in, close the browser, wait several days (within the new session window), reopen the app — the user is still recognized as signed in, with no re-authentication step. This can be verified independently of any payment work.

**Acceptance Scenarios**:

1. **Given** a user signed in today, **When** they return to the app 30 days later having done nothing in between, **Then** they are still recognized as signed in without re-entering credentials.
2. **Given** a user actively using the app, **When** their short-lived session token silently expires mid-session, **Then** the app refreshes their session behind the scenes and they are never bounced to a sign-in prompt (see User Story 2).
3. **Given** a user who has been continuously active (returning at least once within every rolling window), **When** they keep returning, **Then** their signed-in window keeps extending — it does not have a fixed end date independent of activity.
4. **Given** a user who does not return for longer than the session window, **When** they eventually reopen the app, **Then** they are correctly treated as signed out and asked to sign in again (the window is not infinite).

---

### User Story 2 - Never see a surprise sign-out mid-session (Priority: P1)

As a user actively using the app, I don't want to be logged out in the middle of what I'm doing just because my short-lived session token happened to expire at that moment.

**Why this priority**: This is the mechanism that makes User Story 1 actually work in practice — without it, "stay signed in for weeks" is undermined by users being kicked out mid-task the moment their hourly token lapses, which reads to the user as a broken "stay signed in" promise. Tightly coupled to US1 but called out separately because it is independently testable and is itself directly user-visible.

**Independent Test**: Force a short-lived session token to expire while the user is mid-session (without touching the longer-lived credential that proves who they are), then perform an action that requires being signed in — the app recovers the session transparently and the action succeeds, with no visible interruption or forced re-entry of credentials.

**Acceptance Scenarios**:

1. **Given** a user with a valid but expired short-lived session token, **When** the app checks whether they're signed in, **Then** the app transparently restores the session using their longer-lived credential, without asking the user to do anything.
2. **Given** a user whose longer-lived credential has also become invalid (e.g., they signed out elsewhere, or the credential itself expired), **When** the app attempts to restore the session, **Then** the restoration fails cleanly and the user is treated as signed out (asked to sign in again) — this is the one case where a visible sign-out is correct.
3. **Given** a user in the middle of a sign-in redirect flow (e.g., returning from an external sign-in provider), **When** the app processes the returning link, **Then** the session-restoration logic does not interfere with or break that in-flight sign-in.

---

### User Story 3 - Upgrade to paid with a clear plan choice (Priority: P2)

As a free user, I want to upgrade to a paid plan by choosing between a monthly or annual price and completing checkout, and I want to know immediately afterward that my upgrade worked.

**Why this priority**: This is the feature that turns the product into a revenue-generating one (`new_TODOs #24`). It depends on User Stories 1–2 only loosely (a signed-in user is a checkout prerequisite, but checkout itself is a separate, testable flow) and is independently valuable and demoable even before the underlying processor is swappable (User Story 4).

**Independent Test**: As a free-tier signed-in user, open the upgrade prompt, pick a plan (monthly or annual), complete a test payment, and land back in the app — verify the app shows either the unlocked paid experience immediately, or an explicit "we're activating your plan" message that later resolves to the paid experience. At no point does the user see the ordinary free-tier screen with no explanation.

**Acceptance Scenarios**:

1. **Given** a signed-in free-tier user, **When** they open the upgrade prompt, **Then** they can choose between a monthly and an annual plan before proceeding to payment.
2. **Given** a user who selects a plan and completes payment successfully, **When** they are returned to the app, **Then** within a short, bounded wait they see their account reflected as paid and paid features become usable without signing in again.
3. **Given** a user who completes payment but the confirmation has not yet finished processing when they land back in the app, **When** the app is still waiting for confirmation, **Then** the user sees an explicit "activating your subscription" message — never the plain free-tier screen with no explanation of what's happening.
4. **Given** confirmation takes longer than the app's bounded wait, **When** the wait times out, **Then** the user sees a message acknowledging the payment was received and is still being activated, with a clear next step (such as refreshing) — again, never a silent reversion to the ordinary free-tier screen.
5. **Given** a user who cancels out of the payment step, **When** they return to the app, **Then** they remain on the free tier with no error and can retry the upgrade at any time.

---

### User Story 4 - Swap payment providers without reworking the app (Priority: P3)

As the person operating this product, I want the checkout, payment-confirmation, and subscription-status logic to sit behind a stable internal interface, so that switching to a different payment provider later doesn't require touching the upgrade screen or any place in the app that checks whether a user is paid.

**Why this priority**: This is a forward-looking investment, not something end users notice directly — it's the lowest priority of the four, but it is what makes User Story 3 durable rather than a one-off integration. It piggybacks on the same code paths as User Story 3.

**Independent Test**: With the current payment provider wired in and working (per US3), confirm that every place in the app that (a) starts a checkout, (b) receives a payment confirmation, or (c) checks a user's subscription state, talks only to the internal interface — not to any provider-specific detail. Demonstrating this typically means showing that a second, stub implementation of the interface could be substituted with a configuration change and no edits to the upgrade screen or any tier-gated feature.

**Acceptance Scenarios**:

1. **Given** a successful payment confirmation arrives from the payment provider, **When** it is processed, **Then** the user's account is marked paid exactly once, even if the same confirmation is somehow delivered more than once (no duplicate side effects).
2. **Given** the upgrade screen or any paid-feature gate in the app, **When** examined for how it determines "is this provider's checkout available" or "is this user paid," **Then** it does so exclusively through the shared interface, never through payment-provider-specific code or data shapes.
3. **Given** a hypothetical second payment provider implementing the same interface, **When** it is substituted for the first, **Then** no code changes are required in the upgrade screen or any paid-feature gate — only configuration/wiring changes. This is demonstrated by swapping in a minimal stand-in implementation of the shared interface (one that implements the same checkout-start, confirmation-processing, and subscription-status operations without doing real payment processing) via configuration only, and confirming no call site outside that implementation needed to change. Building a second real, fully-functioning payment provider is explicitly not required to satisfy this scenario.

---

### User Story 5 - Get the payment sandbox actually working before relying on it (Priority: P1)

As the person operating this product, before any of the checkout work (User Stories 3–4) can be trusted, I need the connected payment sandbox to actually be configured with real, working products and prices, and I need to have proven a complete test payment flows end-to-end through it.

**Why this priority**: Without this, User Stories 3 and 4 are unverifiable — the checkout code exists but currently points at a payment sandbox with nothing configured in it, so no real checkout can succeed today. This is a hard prerequisite gate, ranked P1 because it blocks validating the other payment stories, even though it is invisible to end users.

**Independent Test**: Starting from the current unconfigured sandbox, set up a purchasable product with both a monthly and an annual recurring price, register a delivery destination for payment-confirmation events, and run one full test purchase from start to finish, confirming the purchasing user's account ends up marked paid.

**Acceptance Scenarios**:

1. **Given** the payment sandbox currently has no purchasable product configured, **When** setup is complete, **Then** a product exists with both a monthly and an annual recurring price available for checkout.
2. **Given** the product and prices are configured, **When** a test purchase is completed using a test payment method, **Then** the confirmation event is delivered, received, and processed, and the purchasing test user's account is observed to flip to paid.
3. **Given** this environment is local/test-mode only, **When** documenting completion of this story, **Then** it is explicit that confirming event delivery to a real, publicly reachable deployment is a separate, later verification step — not claimed as done here.

---

### Edge Cases

- What happens if a user's longer-lived credential is revoked or invalidated (e.g., a security event) while their short-lived token is still technically unexpired? The next silent-refresh check must catch this and end the session cleanly rather than continuing to honor a token whose backing credential is gone.
- What happens if a user opens the app in two tabs, and one tab triggers a silent refresh while the other is idle? Both tabs must end up in a consistent signed-in state without one tab spuriously signing the user out (see FR-002a).
- What happens if a user completes payment, then immediately closes the tab before the app can confirm it? On their next visit, the app must reflect their paid status once the confirmation has processed — it must not require them to "finish" anything.
- What happens if a payment-confirmation event is delivered twice for the same purchase (a known behavior of message-delivery systems, which may retry)? The account must not be double-charged in effect (i.e., no duplicate downstream side effects) and must simply remain paid.
- What happens if a user cancels their subscription? **Resolved by FR-025**: access continues at the paid tier through Stripe's automatic retry window (`past_due`) and, for an explicit cancellation scheduled at period end, through to that period's actual end; the tier value drops to `free` automatically only on final termination (`canceled`/`unpaid` after retries, or `customer.subscription.deleted`) — never instantly on the first decline or the moment cancellation is requested.
- What happens if the payment sandbox becomes temporarily unreachable during checkout (network/provider outage)? The user must see an explicit failure/retry message, never a silent hang or a false "you're paid now."
- What happens if a free user with no payment method configured navigates directly to a paid-only area (bypassing the upgrade prompt)? Existing tier-gating behavior for paid areas is unchanged by this feature; only the upgrade *entry point* and *confirmation* behavior change.

## Requirements *(mandatory)*

### Functional Requirements

**Session persistence & silent refresh (User Stories 1–2)**

- **FR-001**: The system MUST keep a user recognized as signed in across return visits for a 60-day rolling window measured from their most recent successful session-refresh, not a fixed 60 days from original sign-in.
- **FR-002**: Every time the system successfully restores a user's session using their longer-lived credential, it MUST issue a new longer-lived credential that resets the 60-day window (rolling renewal), so continuously-returning users are never forced to re-authenticate purely due to elapsed time.
- **FR-002a**: When a user has more than one active tab or device open, concurrent or duplicated session-restoration attempts MUST converge on a single consistent signed-in state — no tab or device may be spuriously signed out purely because another tab or device restored the session first. This can be satisfied either by coordinating restoration attempts so only one proceeds at a time, or by tolerating a just-superseded longer-lived credential for a short grace window, or by confirming that the underlying restoration mechanism does not actually invalidate a credential still in use elsewhere (in which case no new mechanism is needed — this must be verified, not assumed). *Plan-time note: before designing any new coordination mechanism, first verify empirically whether the existing session-refresh mechanism invalidates the prior longer-lived credential on every restoration or only extends its expiry — if the latter, this requirement is already satisfied by current behavior and only needs to be documented and covered by a test, not built.*
- **FR-003**: The system MUST continue to rely exclusively on secure, non-client-readable storage for both the short-lived and longer-lived credentials — no change to where or how credentials are exposed to client-side code.
- **FR-004**: When a user's short-lived session token has expired but their longer-lived credential is still valid, the system MUST transparently restore the session (no visible interruption, no re-entry of credentials) before ever treating the user as signed out.
- **FR-005**: The system MUST only treat a user as signed out when session restoration genuinely fails (the longer-lived credential is itself invalid, expired, or revoked) — at which point it MUST cleanly clear the session and require normal re-authentication.
- **FR-006**: The system MUST NOT introduce a user-facing "remember me" choice — the 60-day rolling session described above is the only mode; there is no shorter opt-in/opt-out session mode.
- **FR-007**: The sign-in return flow (e.g., returning from an external identity provider) MUST NOT be disrupted by the silent-refresh logic — in-flight sign-in completion takes precedence over any session-restoration check that might otherwise interfere with it.
- **FR-008**: The operator MUST independently confirm that the identity provider's own session/inactivity-timeout configuration permits sessions to remain valid for the full 60-day window described in FR-001 — this is an external configuration check outside the application's own code, to be tracked and verified as a deployment readiness item, not asserted as done by code changes alone.

**Paid checkout & plan selection (User Story 3)**

- **FR-009**: A signed-in free-tier user MUST be able to open an upgrade prompt that offers a choice between a monthly and an annual paid plan before proceeding to payment.
- **FR-010**: Selecting a plan and choosing to proceed MUST take the user to a real checkout flow for that specific plan (not a placeholder, waitlist, or no-op).
- **FR-011**: Upon successful completion of payment, the user MUST be returned to the app and, within a short bounded wait, see their account reflected as paid, with paid features usable without any additional sign-in step.
- **FR-012**: While payment confirmation is still processing (i.e., the return-to-app moment happens before the account has been marked paid), the app MUST show an explicit, human-readable "activating your subscription" acknowledgment — the user MUST NOT be shown the ordinary free-tier UI with no explanation during this window.
- **FR-013**: If the bounded wait for confirmation elapses without the account being marked paid, the app MUST show an explicit message acknowledging that payment was received and activation is still in progress, along with a clear next step (e.g., refreshing) — this state MUST also never fall back to a silent, unexplained free-tier UI.
- **FR-014**: A user who abandons or cancels the checkout flow before completing payment MUST be returned to the app on the free tier with no error state, and MUST be able to retry the upgrade at any time.
- **FR-015**: The bounded-wait schedule for FR-011/FR-013 confirmation-check polling is: attempts at `0s` (immediate), `2s`, `4s`, `7s`, and `10s` after the return-to-app moment — 5 attempts total, ~10s total wait budget. If the account is confirmed paid at any attempt, polling stops immediately and the paid UI is shown. If the budget elapses without confirmation, the app falls back to the FR-013 "still activating" message with a manual-refresh affordance (re-running the same 5-attempt sequence on demand, not an unbounded background poll).

**Processor-agnostic seam & webhook integrity (User Story 4)**

- **FR-016**: All code paths that (a) start a checkout, (b) receive/process a payment-confirmation event, or (c) determine a user's current subscription standing MUST go through one shared internal interface — no such code path may depend on payment-provider-specific details directly.
- **FR-017**: The subscription-standing determination (part of FR-016c) MUST be derivable entirely from data the system already stores about the user's tier and their payment-provider customer reference — this feature MUST NOT introduce any new stored field to represent subscription status.
- **FR-018**: A payment-confirmation event MUST be processed idempotently — if the same confirmation is delivered more than once, the user's account must end up in the same correct paid state with no duplicated downstream effects (e.g., no double-counted upgrade records).
- **FR-019**: Every payment-confirmation event MUST have its authenticity verified before being acted on (i.e., the system MUST reject and ignore confirmation events that cannot be verified as genuinely originating from the connected payment provider).
- **FR-020**: The upgrade prompt and every paid-feature gate in the app MUST be demonstrably substitutable to a different payment-provider implementation via configuration/wiring alone — with no code changes required in the upgrade prompt or any paid-feature gate. "Demonstrably substitutable" is satisfied by swapping in a minimal stand-in implementation of the shared interface (see User Story 4, Acceptance Scenario 3) — a second, fully-functioning real payment provider is not required.

**Sandbox provisioning & end-to-end proof (User Story 5)**

- **FR-021**: The connected payment sandbox MUST be configured with one purchasable product carrying both a monthly and an annual recurring price before any of FR-009–FR-020 can be considered verified.
- **FR-022**: The system MUST have a registered destination for payment-confirmation events pointed at a locally/test-reachable environment, sufficient to prove the FR-018/FR-019 processing path end-to-end.
- **FR-023**: A complete test-mode purchase MUST be run and observed to succeed end-to-end: checkout starts, a test payment completes, the confirmation event is delivered and processed, and the purchasing user's account is confirmed to flip to paid.
- **FR-024**: Confirming that payment-confirmation events can be delivered to a real, publicly reachable (non-local) deployment is explicitly OUT of scope for FR-021–FR-023 and MUST be tracked separately as a pre-launch deployment readiness item, not claimed as satisfied by local/test-mode verification alone.

**Tier as a live subscription mirror (resolves Open Question 1)**

- **FR-025**: `users.tier` MUST be maintained as a live, webhook-derived mirror of the payment provider's actual subscription status — not a value set once at purchase and left stale thereafter. Specifically, on each relevant subscription-status webhook event:
  - Status `active` or `trialing` → tier is (or becomes) `paid`.
  - Status `past_due` → tier remains `paid`, unchanged. This is the payment provider's automatic retry window; a single transient decline MUST NOT immediately downgrade a paying user.
  - Final termination — status `canceled` or `unpaid` (i.e., the provider's retries are exhausted), or a subscription-deleted event (explicit cancellation reaching its effective end) — → tier drops to `free` automatically, with no manual/administrator intervention required.
  - This downgrade logic MUST be idempotent under duplicate event delivery, consistent with FR-018.
  - Out of scope, unchanged from below: no grace-period UI, no "update your card" reminder emails, no retry nudges, no past_due banners, no proration — FR-025 governs only the `tier` value itself, never a dunning/notification experience.

**Explicitly out of scope for this feature** (do not build):

- A second, alternative payment-provider implementation (only the seam from FR-016/FR-020 is required; a second implementation is not built now).
- Any billing history, invoice list, or receipts UI.
- Mid-cycle plan proration when switching plans.
- Dunning / failed-payment retry-and-notify flows (grace-period UI, "update your card" reminders, retry nudges, past_due banners) — FR-025 tracks only the `tier` value automatically; it introduces no dunning UX.
- A "remember me" opt-in/opt-out checkbox (see FR-006).
- Any new stored field for subscription status beyond existing tier/customer-reference data (see FR-017; also see Deferred below).
- Verifying payment-confirmation delivery to a real, non-local deployment (see FR-024).

### Key Entities

- **User session**: Represents a signed-in user's ongoing authenticated state. Has a short-lived proof-of-identity and a longer-lived renewal credential; the renewal credential's remaining validity window determines whether "still signed in" holds. Rolls forward on each successful renewal.
- **Account tier**: Represents whether a user's account is on the free or paid plan. Already exists; this feature only adds new ways of reading/writing it consistently through one shared interface, plus the payment-provider customer reference already associated with a user.
- **Payment plan**: Represents a purchasable option (monthly or annual) a user can select when upgrading. Two plans exist at launch; both must be purchasable.
- **Checkout attempt**: Represents one user's journey from selecting a plan through completing (or abandoning) payment. Ends in one of: completed, still-processing (bounded wait), timed-out-still-processing, or abandoned/cancelled.
- **Payment-confirmation event**: Represents an authoritative notification from the payment provider that a purchase succeeded (or a subscription changed/ended). Must be verified, processed idempotently, and is the sole trigger for flipping a user's account tier to paid.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who was signed in and returns any time within 60 days of their last visit is recognized as signed in with zero manual re-authentication steps, 100% of the time (barring a genuine credential revocation).
- **SC-002**: Across a full day of typical usage, zero users experience an unexplained mid-session sign-out caused purely by short-lived-token expiry (as opposed to genuine credential invalidation).
- **SC-003**: A free user can go from opening the upgrade prompt to being recognized as paid, for either plan, within the same bounded-wait budget defined by FR-011/FR-013/FR-015 (~10s, 5 attempts) under normal conditions (immediate confirmation) — and in the slow-confirmation case, never waits longer than that same budget without seeing an explicit status message. There is no separate, independently-numbered wait ceiling for this criterion.
- **SC-004**: 0% of users who completed a successful payment ever see the plain, unexplained free-tier screen afterward — they see either the unlocked paid experience or one of the two explicit "activating" acknowledgment states.
- **SC-005**: A duplicate delivery of the same payment-confirmation event never results in a user being charged, credited, or logged as upgraded more than once.
- **SC-006**: The payment sandbox demonstrably supports one full test purchase, start to finish, with the purchasing test account observably flipping from free to paid.
- **SC-007**: Introducing a second payment-provider implementation — verified via a minimal stand-in implementation of the shared interface, without building a real second provider (see User Story 4, Acceptance Scenario 3 and FR-020) — requires zero edits to the upgrade prompt component or any paid-feature gate — only new configuration/wiring code.
- **SC-008** (FR-025): A subscription entering the payment provider's automatic retry window (`past_due`) never drops a user's tier to `free`; tier drops to `free` automatically, with zero manual/administrator steps, only once the subscription reaches final termination (`canceled`/`unpaid` after retries exhausted, or `customer.subscription.deleted`) — verified for both the explicit-cancellation path and the payment-failure-to-termination path.

## Assumptions

- **Rolling 60-day session window**: chosen over a fixed expiry so that continuously-active users are effectively never logged out, while genuinely inactive users still eventually re-authenticate — this is a settled decision from epic planning, not an open question.
- **No "remember me" toggle**: the 60-day rolling session is the only session mode offered; there is no shorter-lived opt-in mode. Settled decision.
- **Recurring subscription billing model** (monthly/annual), matching what the existing checkout code already assumes — no one-time-purchase model is introduced.
- **Tier-only subscription-status persistence, now a live mirror**: "is this user paid" is answerable from existing stored fields (tier + payment-provider customer reference) without adding a new status field. Per FR-025 (resolves former Open Question 1), `tier` is actively kept in sync with the provider's subscription status by the webhook handler — it is not a value set once at purchase and left stale. This still does not represent a richer "cancelled, access continues until X, here's the date" *display* state (no countdown UI, no explicit "access ends on" messaging) — only the binary free/paid value is mirrored; see the Deferred note.
- **Local/test-mode payment verification is sufficient for this feature's completion bar**: proving the payment sandbox and webhook path work in a local/test environment satisfies User Story 5; proving it against a real public deployment is intentionally deferred to a separate, later readiness check (FR-024).
- **Existing paid-feature gating logic elsewhere in the app is unchanged**: this feature only changes how a user gets to "paid" and how that fact is determined internally — it does not change what becomes unlocked once paid.

### Open Questions (RESOLVED — carried forward for record only)

1. ~~**Cancellation/downgrade timing** [NEEDS CLARIFICATION]~~ — **RESOLVED (owner decision)**: See FR-025. Downgrade happens on **final termination only**, not on first decline or at the moment cancellation is requested. A `past_due` (automatic-retry) status leaves tier at `paid`; an explicit cancellation scheduled at period end also leaves tier at `paid` until Stripe actually terminates the subscription (`customer.subscription.deleted`) or its status becomes `canceled`/`unpaid` after retries are exhausted. The tier field alone is sufficient to represent this because the *decision* is binary (paid-until-terminated vs. free) — no "access until X" countdown display is required by this feature (see Deferred).
2. ~~**Bounded-wait schedule for post-payment confirmation polling** (FR-015)~~ — **RESOLVED**: see FR-015 above ([0s, 2s, 4s, 7s, 10s], 5 attempts, ~10s budget).

### Deferred (explicitly not required now, but noted for future consideration)

- A dedicated subscription-status field (beyond tier) is deferred. Every currently-known consumer of a richer status (billing/invoice UI, dunning) is out of scope for this feature; if a future feature needs a concrete "cancelled, access continues until X" experience, that is expected to be handled by a later, additive, reversible change — not by this feature.
