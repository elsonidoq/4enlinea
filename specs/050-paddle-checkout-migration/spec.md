# Feature Specification: Paddle Checkout Migration (replace & remove Stripe)

**Feature Branch**: `050-paddle-checkout-migration`
**Created**: 2026-07-17
**Status**: Draft
**Input**: User description: "Epic 10 — Paddle Checkout Migration (replace & remove Stripe)" (`polish_epic.md`, appended 2026-07-17 from `docs/payment_provider_research.md`)

## Origin & Relationship to Other Work

Sourced from `docs/payment_provider_research.md` (decided 2026-07-16), not from `new_TODOs.md`/`agentic_QA.md`. This feature **supersedes the payment half of Epic 5** ("Account: Session Persistence & Paid Checkout" — its US5.3–US5.5 and the Stripe scaffold they validated); Epic 5's session-persistence half (US5.1–US5.2, long-lived sessions and silent token refresh) is untouched and unaffected by this work. This feature has no execution dependency on Epics 1–9 and may run at any time.

**End state**: the app charges via Paddle instead of Stripe; a case-insensitive search for "stripe" across the application source returns nothing outside documentation, memory, and the backlog file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Founder provisions the Paddle catalog and a live prices endpoint (Priority: P1)

As the founder, I need Paddle products and prices provisioned in the sandbox, and a public endpoint that returns those live prices, before any checkout code can be written against real price identifiers.

**Why this priority**: Nothing else in this feature can be built or tested without real Paddle price identifiers to check out against. This is the foundation every other story depends on.

**Independent Test**: Can be fully tested by calling the prices endpoint and confirming it returns live monthly/annual price and currency data sourced from the actual Paddle sandbox catalog (not a hardcoded fixture), and that it degrades cleanly (clear "not configured" response, no crash) when Paddle credentials are absent.

**Acceptance Scenarios**:

1. **Given** a Paddle sandbox product exists with monthly ($2.99/mo) and annual ($21.99/yr) recurring prices, **When** a client requests the prices endpoint, **Then** it receives the live monthly and annual price/currency data read directly off the Paddle catalog.
2. **Given** the Paddle environment is not configured (credentials absent), **When** a client requests the prices endpoint, **Then** the endpoint responds with a clear "payments not configured" failure rather than crashing or hanging.
3. **Given** a signed-out visitor, **When** they open the upgrade modal, **Then** prices load without requiring sign-in (the endpoint is public).

---

### User Story 2 - Free user upgrades via an in-app Paddle checkout (Priority: P1)

As a free user, I want to upgrade to the paid tier via a checkout experience that happens without leaving the app, and I want to know immediately that my upgrade worked.

**Why this priority**: This is the core, revenue-generating user journey the whole feature exists to deliver, and it is the direct successor of the Stripe checkout flow being retired.

**Independent Test**: Can be fully tested by opening the upgrade modal from any entry point, selecting a monthly or annual plan, completing checkout with a sandbox test card, and confirming the user lands back on the originating screen in the paid experience — never routed away to a separate hosted page and never shown a silent free-tier fallback after paying.

**Acceptance Scenarios**:

1. **Given** a signed-in free user opens the upgrade modal, **When** they select the monthly plan and complete checkout with a valid sandbox test card, **Then** they remain in the app throughout (no full-page redirect) and see confirmation that their upgrade succeeded.
2. **Given** a signed-in free user opens the upgrade modal, **When** they select the annual plan and complete checkout with a valid sandbox test card, **Then** the same in-app experience and confirmation occurs.
3. **Given** a user has just completed payment, **When** the tier-flip has not yet been confirmed server-side, **Then** the user sees an explicit "activating" acknowledgment — never a silent render of the free-tier UI.
4. **Given** the app is running against the Paddle sandbox, **When** a checkout is opened, **Then** the checkout visibly indicates it is running in sandbox mode (not production), and the resulting transaction appears in the sandbox dashboard, not live.
5. **Given** the server-side single-check fallback (User Story 2, Edge Cases) confirms a completed transaction that belongs to a *different* user than the one making the request, **When** the fallback runs, **Then** the request is rejected, the requesting user's tier is NOT granted, and no analytics record is created.

---

### User Story 3 - Paid status stays correct and reliable via webhook, and a paid user can manage their subscription (Priority: P1)

As the founder, I want a completed Paddle payment, and every subsequent subscription status change, to reliably and idempotently update the user's paid/free tier — exactly as reliably as the retired Stripe webhook did — and I want a paying customer to be able to reach the provider's customer-billing experience the moment they're paid, not as a later add-on.

**Why this priority**: Tier correctness is the business-critical guarantee behind the whole payment system; a silent failure here means either free access to paid content or a paying customer locked out. Customer-billing access is promoted into this same P1 story because a paid user with no way to manage or cancel their subscription is an incomplete, non-shippable core journey, not a polish item — only the broader "every entry point still works" regression sweep (User Story 5) remains at P2.

**Independent Test**: Can be fully tested by simulating each Paddle subscription/transaction event in the sandbox and observing the resulting tier state and idempotency-ledger behavior, independent of the checkout UI; and by confirming a paid user's account settings link reaches the provider's own customer-billing experience for their account.

**Acceptance Scenarios**:

1. **Given** a user completes a purchase, **When** the corresponding "transaction completed" event is delivered, **Then** the user's tier flips to paid and an upgrade analytics record is created exactly once.
2. **Given** the same completion event is redelivered (a legitimate retry), **When** it is processed a second time, **Then** the tier state and analytics record are unchanged (no duplicate write).
3. **Given** a subscription enters a temporary payment-retry state, **When** the corresponding status update is delivered, **Then** the user's tier is NOT downgraded (matching the existing "past_due does not downgrade" behavior).
4. **Given** a subscription is paused, **When** the corresponding status update is delivered, **Then** the user's tier flips to free.
5. **Given** a subscription is canceled (its terminal state), **When** the corresponding event is delivered, **Then** the user's tier flips to free unconditionally.
6. **Given** a subscription is scheduled to cancel at the end of the current billing period but has not yet reached that date, **When** the corresponding update is delivered, **Then** the user's tier is NOT downgraded until the terminal cancellation event actually arrives.
7. **Given** a webhook delivery has a tampered or invalid signature, **When** it is received, **Then** it is rejected, no data is written, and a failure response is returned (so the sender's retry mechanism will try again).
8. **Given** a validly-signed webhook event fails to process for any reason (e.g. a transient database error), **When** that failure occurs, **Then** the system returns a failure response (not a success response) so the provider's retry mechanism redelivers the event, and no partial tier or analytics write is left in place.
9. **Given** a signed-in paid user, **When** they request to manage their subscription/billing from account settings, **Then** they are taken to the payment provider's customer-billing/subscription-management experience for their own account.

---

### User Story 4 - Maintainer finds zero trace of the retired payment provider (Priority: P2)

As a maintainer, I never want to find a leftover code path, environment variable, or test belonging to the retired payment provider once this migration ships, so the codebase has exactly one payment integration to reason about.

**Why this priority**: Leftover dead code from the old provider is a source of confusion, a security-review distraction (stale secrets/config), and a maintenance trap — but the app functions correctly on Paddle even before this cleanup completes, so it is sequenced after the functional stories.

**Independent Test**: Can be fully tested by searching the application source for any reference to the retired provider and confirming zero matches outside documentation/history, and by running the full automated test suite to confirm it is green with no dangling references to deleted files.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** the application source (server code, frontend code, tests, database migrations, dependency manifest) is searched for the retired provider's name, **Then** zero matches are found.
2. **Given** the migration is complete, **When** the automated test suite runs, **Then** it passes with no errors caused by references to deleted files.
3. **Given** the migration is complete, **When** a developer inspects the deploy configuration and environment variable list, **Then** no retired-provider-specific secrets or configuration remain, while any unrelated shared configuration is untouched.

---

### User Story 5 - Every existing upgrade entry point keeps working, unchanged for callers (Priority: P2)

As a free user on any of the app's existing paid-tier touchpoints (settings, lesson gates, deep-reveal gates, set picker), I want the exact same upgrade experience I had before, just backed by the new provider, so nothing about how or where I'm asked to upgrade changes.

**Why this priority**: This is an integration-completeness story — it depends on Stories 1–3 being done, and it protects against a regression where the upgrade surface itself (the modal component and its call sites) is inadvertently redesigned during the swap.

**Independent Test**: Can be fully tested by opening the upgrade modal from every existing entry point in the app, completing a sandbox checkout, and confirming the modal's outward behavior (what it asks for, what states it shows, how callers invoke it) is unchanged from before the migration, with no full-page navigation anywhere in the flow.

**Acceptance Scenarios**:

1. **Given** the upgrade modal is opened from any existing entry point in the app, **When** a plan is selected and checkout is completed, **Then** the user lands back on the exact screen they started from, now with paid access.
2. **Given** a developer compares the upgrade modal's external interface before and after this migration, **When** they diff it, **Then** it is unchanged — the modal still expects the same inputs and reports the same states to its callers; only what happens internally when checkout is triggered has changed.
3. **Given** the account-settings entry point specifically (the customer-billing link delivered in User Story 3), **When** it is exercised as part of this story's full entry-point sweep, **Then** it continues to work correctly alongside every other entry point — this scenario is a regression check, not the first delivery of the capability, which happens in User Story 3.

### Edge Cases

- What happens if a user closes the checkout overlay before completing payment? The user remains on the originating screen, still free tier, with no error state (Paddle's own overlay handles cancellation).
- What happens if the webhook is delayed or dropped after a successful payment? The user sees an "activating" acknowledgment state (never silently shown as free) while a single server-side confirmation check runs; this check — not a bounded poll — is the fallback described in User Story 2, Acceptance Scenario 3.
- What happens if a user re-submits the same purchase (e.g. double-click) and two identical completion events arrive? Handled by the idempotency guarantee in User Story 3, Acceptance Scenario 2 — no duplicate tier writes or duplicate analytics records.
- What happens to a user who was mid-checkout when a provider outage occurs? Out of scope for this feature to design a bespoke recovery UX beyond the existing "activating" / retry messaging; Paddle Retain's own default retry behavior is accepted as-is (see Out of Scope).
- What happens if Paddle price identifiers change (e.g. a price is repriced on the provider's side) after this feature ships? The prices endpoint always reads live off the provider's catalog, so a same-value price change on the provider side reflects automatically with no code deploy required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a public, unauthenticated endpoint that returns the current monthly and annual subscription prices, sourced live from the payment provider's catalog (never a hardcoded copy), so the upgrade experience can never silently drift from what will actually be charged.
- **FR-002**: The system MUST respond to that endpoint with a clear "payments not configured" failure when the payment provider's credentials are not present, rather than crashing or hanging.
- **FR-003**: The system MUST let a signed-in free user initiate checkout for either the monthly or the annual plan from the existing upgrade experience, without navigating away from the application (no full-page redirect to a separate hosted page).
- **FR-004**: The system MUST clearly indicate, and enforce, that all checkout activity during development and testing runs against the payment provider's sandbox/test environment, never its live/production environment, unless explicitly and separately configured for a production deploy.
- **FR-005**: The system MUST inform the user of successful payment completion in-app and MUST NOT ever silently present the free-tier experience to a user who has just completed payment; if server-side confirmation of the payment is still pending, the system MUST show an explicit "activating" acknowledgment instead.
- **FR-006**: The system MUST verify the authenticity of every incoming payment-provider webhook/notification before acting on it, and MUST reject (with no data written) any delivery that fails that verification.
- **FR-007**: The system MUST update a user's paid/free tier from payment-provider webhook/notification events according to the following mapping: a completed transaction/first payment → tier becomes paid (and an upgrade analytics record is created); an active or trialing subscription status → tier is/stays paid; a past-due (payment-retry) status → tier is left unchanged (no downgrade); a paused subscription status → tier becomes free; a subscription scheduled to cancel at period end but not yet at that date → tier is left unchanged; a terminal canceled subscription status → tier becomes free unconditionally.
- **FR-008**: The system MUST process each distinct payment-provider event exactly once with respect to its effects (tier write and any associated analytics record), even if the same event is redelivered. The upgrade analytics record described in FR-007 is created **exclusively** by this webhook-driven path — the synchronous fallback in FR-010 confirms and grants tier but MUST NOT itself create or duplicate that analytics record, so the "exactly once" guarantee is never satisfied by two different code paths racing to write it.
- **FR-009**: The system MUST treat a webhook event as successfully handled — and only return a success response for it — after that event's effects (tier write, analytics record where applicable) are durably recorded, including the idempotency-ledger entry that marks it processed. If a validly-signed event fails to process for any reason (a transient database error is one example, not the only one), the system MUST return a failure response rather than a success response, so the provider's own retry mechanism redelivers the event; this applies whether the failure is a signature/verification failure (FR-006) or any downstream processing failure after verification succeeds.
- **FR-010**: The system MUST provide a synchronous, single-check fallback that confirms a just-completed payment server-side (as a backstop for a delayed or dropped webhook), rather than relying solely on the asynchronous webhook. Before granting tier through this fallback, the system MUST verify that the confirmed transaction/customer belongs to the authenticated user making the request (matching on the provider's customer identifier, user identifier, or account email as appropriate) and MUST reject the request — granting no tier change — if that ownership check fails.
- **FR-011**: The system MUST preserve the existing upgrade-experience component's outward contract (what it expects to be given, what states it reports to whatever invokes it) unchanged — only what happens internally when a user triggers checkout may change.
- **FR-012**: The system MUST let a signed-in paid user reach the payment provider's customer-billing/subscription-management experience from account settings. This is delivered as part of User Story 3 (P1) — a paid user must be able to manage their own subscription from day one, not as a later-sequenced entry point.
- **FR-013**: The system MUST reject a return/redirect destination supplied by the client that does not point to a page within the application itself (the existing open-redirect protection), regardless of which payment provider is behind checkout.
- **FR-014**: The system MUST NOT retain any code path, dependency, environment variable, or automated test tied to the retired payment provider once the migration is complete; a search of the application source (server code, frontend code, tests, database migrations, dependency manifest) for the retired provider's name MUST return zero matches.
- **FR-015**: The system's automated test suite MUST pass in full after the retired provider's code, dependencies, and tests are removed, with no failures caused by dangling references to deleted files.
- **FR-016**: The system MUST require no migration of existing customer or payment data, since no live customer has ever completed a payment through the provider being retired.
- **FR-017**: Every capability that this migration cannot fully verify in a local/sandbox environment MUST be explicitly recorded as a pending pre-launch verification rather than being marked complete. This includes, at minimum: real deployed webhook delivery, production domain approval, a real cross-border payout, live catalog provisioning, and the Argentine tax/retención withholding stack (a launch blocker that cannot be exercised in sandbox and must not be silently dropped from this list).

### Key Entities *(include if feature involves data)*

- **Subscription price**: A recurring monthly or annual price for the paid tier, sourced live from the payment provider's catalog; the two prices in effect at the time of this migration match the values already charged today ($2.99/mo, $21.99/yr) — this is a provider swap, not a repricing.
- **Checkout session**: A single attempt by a user to purchase a subscription; carries the selected plan and the user's identity/email for pre-fill, and resolves to either a completed transaction or an abandoned attempt.
- **User tier**: A user's paid/free access level; a live derivation of their current subscription status as reported by the payment provider, not a value set once at the moment of purchase and left alone.
- **Payment-provider customer identifier**: A per-user identifier from the payment provider, used to look up and grant access to that provider's customer-billing/subscription-management experience.
- **Processed-event record**: A durable record of each payment-provider event already acted on, used to guarantee an event's effects (tier change, analytics record) happen exactly once even under redelivery.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A free user can go from opening the upgrade modal to being fully upgraded (paid tier active) without ever leaving the application, on both the monthly and annual plans.
- **SC-002**: 100% of simulated payment-provider status-change scenarios (first payment, active, trialing, past-due, paused, canceled, scheduled-cancel-pending) result in the correct paid/free tier outcome, verified independently of the checkout UI.
- **SC-003**: A user who has just completed payment never sees the free-tier experience rendered to them, even under a delayed confirmation from the payment provider — they see either the paid experience or an explicit "activating" acknowledgment.
- **SC-004**: Redelivering the same payment-provider event a second time produces zero additional tier changes or analytics records (verified idempotency).
- **SC-005**: A tampered or invalid webhook delivery is rejected 100% of the time, with zero resulting data writes.
- **SC-006**: A full-source search for the retired payment provider's name returns zero matches outside documentation, memory, and historical planning artifacts.
- **SC-007**: The full automated test suite passes with zero failures after the migration is complete.
- **SC-008**: Every existing upgrade entry point in the app (settings, lesson gates, deep-reveal gates, set picker) successfully completes a sandbox checkout and returns the user to their originating screen, paid.
- **SC-009**: The upgrade experience component's inputs/outputs are unchanged before and after this migration, confirmed by direct comparison.
- **SC-010**: A single-check fallback confirmation for a transaction that does not belong to the requesting user is rejected 100% of the time, with zero tier grants and zero analytics records resulting.
- **SC-011**: A webhook event that fails to process (any cause, including a simulated transient database error) results in a non-success response 100% of the time, and zero partial tier or analytics writes are left behind; redelivery of that same event after the underlying failure is resolved succeeds exactly once.
- **SC-012**: A signed-in paid user can reach the payment provider's customer-billing experience from account settings as soon as their tier flips to paid, without waiting on any later-sequenced work.

## Assumptions

- No live customer has ever completed a payment through the payment provider being retired (sandbox/test-mode only), so this feature requires no customer or payment-history data migration.
- The monthly ($2.99) and annual ($21.99) price points carry over unchanged from the retired provider to the new one; revisiting the price values themselves is out of scope.
- The in-app (overlay-style) checkout experience is the confirmed direction for this migration, replacing the prior model where checkout happened on a separate hosted page reached via full-page redirect. This was the single largest design decision in this feature and is treated as settled, not open.
- All checkout, webhook, and end-to-end verification work in this feature happens against the payment provider's sandbox/test environment; production/live account activation, domain approval, live catalog provisioning, and a real payout are pre-launch verification items outside this feature's local deliverables (see Out of Scope).
- The specific endpoint paths and database column/table names used internally by the new payment integration are provisional-settled per the epic's recommended default (see Open Questions below) rather than fully open, since it does not change user-facing behavior or any acceptance scenario above; `/clarify` may still override this default before planning proceeds.
- The existing upgrade-experience component's outward contract (what it is given, what states it reports) is preserved; only its internal checkout mechanism changes.

## Out of Scope

- A second or third payment processor alongside the new one.
- Billing/invoice UI beyond what the payment provider's own checkout and customer-billing experience renders.
- Custom proration or dunning (failed-payment retry) UX beyond the payment provider's own default automatic retry behavior, which is accepted as-is.
- Any customer or payment data migration (none exists to migrate).
- Live/production account activation, production domain approval, or the first real (non-sandbox) payout — these are pre-launch verification items, not local deliverables of this feature.
- Changing the monthly/annual price values themselves (unless provisioning work discovers the previously "live" values were never actually charged, which would be a separate finding).
- Epic 5's session-persistence work (staying signed in, silent token refresh) — untouched by this feature.

## Open Questions

Both items below are **provisional-settled**, matching the epic's own classification of these as Settled decisions with a recommended default (not fully open questions). They are recorded here, rather than folded silently into the requirements, so that `/clarify` retains an explicit override point before planning locks them in; neither blocks acceptance-scenario testability above, since none of the scenarios depend on the specific paths/names chosen.

1. **Route naming** — provisional-settled: the payment-related API routes are renamed to `/api/paddle/*`, reflecting the new provider, rather than keeping the retired provider's route paths re-pointed at the new provider. Rationale: keeping the retired provider's name in routes that now serve the new provider would be actively misleading, and no external integration depends on the current paths. `/clarify` may override this default.
2. **Internal identifier naming** — provisional-settled: the database columns/tables that reference the retired provider by name are renamed to provider-neutral names (e.g. `paddle_customer_id`, `payment_events`), rather than kept as-is. Rationale: no live data exists to preserve, and keeping the retired provider's name after its removal is a known stale-naming trap in this codebase. `/clarify` may override this default.
