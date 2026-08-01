# Feature Specification: Entitlement & Payments Consolidation

**Feature Branch**: `053-entitlement-payments-consolidation`
**Created**: 2026-07-31
**Status**: Draft
**Input**: User description: "Epic 3 — Entitlement & Payments Consolidation" (`docs/epics/open-issues-epics.md`) — make "is this user entitled to this?" one server-computed answer, stop a paid lesson's content from being served to an unauthenticated caller, replace five independent client tier reads with one interface, ratify the accepted first-payment identity risk in documentation, replace the bare static pricing page with a designed in-app page that reads live prices, and stop a mid-set purchase from losing the player's set results.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A paid lesson's content is never served to someone who hasn't paid (Priority: P1)

A free (or signed-out) visitor requests a specific paid lesson directly — whether by navigating the app's own locked-lesson UI or by fetching the lesson URL directly (e.g. with a tool like `curl`). Today the server returns the lesson's full content, including every paid slide, regardless of who is asking. The app's own screens already refuse to *display* that content, but the data leaves the server anyway — anyone who inspects network traffic or fetches the URL directly gets it for free.

**Why this priority**: This is the only place where paid content actually leaves the server to an unentitled caller. It is a real leak today, independent of every other story in this epic, and it is the epic's namesake problem.

**Independent Test**: Fetch a known paid lesson's data directly as a signed-out caller and confirm the response contains no lesson content (no slides), while an entitled (paid) caller fetching the same lesson still receives full content. Can be tested and shipped with none of the other stories in this epic.

**Acceptance Scenarios**:

1. **Given** a paid lesson and a signed-out caller, **When** the caller requests that lesson directly, **Then** the response succeeds, identifies the lesson (id, title, ordering position, and that it is not a free lesson), states clearly that it is locked, and contains no lesson content.
2. **Given** a paid lesson and a caller with a paid entitlement, **When** the caller requests that lesson, **Then** the response contains the full lesson content as before.
3. **Given** a free lesson and any caller (signed out or free tier), **When** the caller requests that lesson, **Then** the response contains the full lesson content as before — free lessons are never locked.
4. **Given** a signed-out caller who requests a locked paid lesson through the app's own lesson screen (not a raw fetch), **When** the locked response is returned, **Then** the app still renders a real lesson title and an upgrade prompt, exactly as it does today when the lock is enforced client-side.

---

### User Story 2 - One authoritative answer for "is this user entitled to paid content" (Priority: P1)

Today, five different places in the app each independently read the user's plan tier from a locally cached copy of the user's profile to decide whether to show paid content or an upgrade prompt. None of them re-check with the server at the moment of the decision. A related piece of server code that computes entitlement was built for testing purposes and was never wired into any of these five real decision points, nor into the lesson-content leak in User Story 1. Because there are six independent places that each decide entitlement in their own way (five client-side reads plus the server-side gate in User Story 1), they can disagree with each other and with the account's actual, current paid status — for example right after a purchase completes, before the locally cached copy has refreshed.

**Why this priority**: Every other entitlement decision in the app (User Story 1's lesson gate, every upgrade-prompt trigger, the settings screen's subscription display) depends on this single source of truth existing and being authoritative. Fixing the lesson leak in User Story 1 without this would just add a seventh independent entitlement check.

**Independent Test**: Query the entitlement answer for a known free account and a known paid account directly and confirm each gets the correct, server-verified answer without relying on any client-cached value. Separately, confirm all five existing client decision points now source their answer from the new client-side entitlement helper rather than from the raw cached profile field, and that the server-side lesson gate (User Story 1) consults the same underlying server answer with no network hop of its own.

**Acceptance Scenarios**:

1. **Given** an account whose paid status was just changed on the server (e.g. by a purchase completing), **When** the client's entitlement cache is still within its cache window but a checkout has just returned, **Then** the client discards the stale cached answer and fetches a fresh one, so the newly paid account is recognized as paid without requiring a manual page reload.
2. **Given** the client's entitlement cache has expired (past its cache window) with no explicit invalidation event, **When** any of the five decision points asks for the current entitlement, **Then** a fresh answer is fetched from the server rather than reusing the stale one.
3. **Given** the server-side entitlement check cannot complete (e.g. a downstream error while computing the answer), **When** an unauthenticated or unentitled-by-default request needs an entitlement decision, **Then** the system fails to the safe (non-paid / locked) outcome rather than granting access it cannot verify.
4. **Given** an account whose plan tier changes only in the database (bypassing checkout, e.g. an operator adjustment), **When** the next entitlement check happens after any active client cache for that account has expired, **Then** the new answer is reflected — there is no code path where the stored plan tier and the entitlement answer can permanently disagree.
5. **Given** the five existing client decision points (Settings screen, post-set summary screen, saga/lesson-map screen, the deep-reveal panel's quota display, and the lesson-lock guard), **When** each of them decides whether to show paid content or an upgrade prompt, **Then** each sources that decision through the one new client-side entitlement helper rather than reading the raw cached tier field directly.

---

### User Story 3 - The accepted payment-identity risk is recorded as settled policy, not an open question (Priority: P3)

A prior hardening pass closed most of a payment-identity-forgery risk (an attacker could, in principle, redirect someone else's real payment to their own account) but left a narrow window open for a user's very first-ever payment, and documented that decision as an unreviewed, provisional judgment call rather than a resolved one. The app owner has since reviewed and explicitly accepted that residual risk as adequate for this product, given that exploiting it costs the attacker real money to benefit someone else's account. Separately, a known gap in this same area — a payment-confirmation code path skipping an analytics record — was written against a payment provider this app no longer uses, and needs to be re-evaluated against the current provider before it can be closed or kept open with accurate information.

**Why this priority**: This story changes no runtime behavior — no user-facing or security-relevant code changes. It converts an accurate but provisional record into an accurate and settled one, and closes out stale bookkeeping. It is lower priority than Stories 1–2 because nothing user-facing depends on it, but it must ship in this epic because it is one of the epic's named issues.

**Independent Test**: Read the project's documented policy on the payment-identity check and confirm it states the decision as settled (not provisional), names the specific residual risks accepted, and carries the date and authority of that decision. Separately, confirm the analytics-gap issue has either been closed as no-longer-applicable with a stated reason, or is still open with an accurate, current description of exactly what remains — and if still open and applicable, confirm the missing analytics record is now written. This story can be verified by documentation review plus (if the gap remains applicable) a test of the analytics write, independent of every other story here.

**Acceptance Scenarios**:

1. **Given** the documented payment-identity policy, **When** it is read, **Then** it states the decision as ratified and settled (not "a proposal to sanity-check"), names the accepted residual risks explicitly (an attacker granting someone else paid access at their own expense; laundering a payment likely to be reversed onto a third party's account), and does not propose any code change to the identity check.
2. **Given** the previously-recorded analytics gap for the fallback payment-confirmation path, **When** it is re-evaluated against the payment provider actually in use today, **Then** either it is marked resolved with an explanation of why it no longer applies, or it remains open with a current, accurate description of what is missing.
3. **Given** the fallback payment-confirmation path is still applicable and the analytics gap still applies, **When** a payment is confirmed exclusively through that fallback path (not through the primary confirmation path), **Then** the same analytics record that the primary path writes is also written, exactly once, for that payment.

---

### User Story 4 - A designed, accurate pricing page (Priority: P2)

Today's pricing page is a bare, hand-built page with prices and discount figures typed in as fixed text, separate from the actual current prices configured with the payment provider. If a price or promotion changes, this page can silently show the wrong numbers, and it also looks and feels disconnected from the rest of the app. A visitor deciding whether to upgrade should see an on-brand pricing experience with numbers that always match what they'll actually be charged, and should get a sensible page — not a broken one — if the pricing data is temporarily unavailable.

**Why this priority**: This is the most visible piece of the epic to a prospective paying customer, but it is not on the critical path the way the data leak (Story 1) or the shared entitlement source (Story 2) are — a mismatched marketing page is a trust/conversion problem, not a security one.

**Independent Test**: Visit the pricing page and confirm every price and savings figure shown matches the currently configured live prices, that the page renders using the app's own look and feel, and that a required legal/compliance page (the merchant-of-record and refund information) remains reachable at all times, unchanged in content. Separately, simulate the live pricing data being unavailable and confirm the page shows a clear, non-broken message instead of an error or blank screen.

**Acceptance Scenarios**:

1. **Given** a visitor navigating to the pricing page, **When** the page loads, **Then** every displayed price and any "you save X%" figure is sourced from the live, currently configured pricing — never a fixed number typed into the page — and the page matches the rest of the app's visual design and language handling.
2. **Given** the live pricing data is temporarily unavailable, **When** a visitor loads the pricing page, **Then** the page displays a clear message explaining pricing is temporarily unavailable (not a raw error, blank page, or stale/fake numbers) and does not offer a broken purchase action.
3. **Given** the merchant-of-record clause, refund policy statement, and terms link that a payment reviewer or a legal spot-check may look for, **When** anyone visits the dedicated legal/compliance page, **Then** all three are present, unchanged in wording, and that page remains reachable independent of whether the designed pricing page is working.
4. **Given** a visitor on the previous static pricing page's original address, **When** the redesigned pricing experience ships, **Then** that same address now serves the new designed page (not a broken link), and the old page's content is still reachable at its own, clearly linked address rather than being removed.
5. **Given** any hand-typed price, discount, or quota figure that existed on the old pricing page, **When** the redesigned `/pricing` page ships, **Then** no such fixed, hand-maintained figure remains on `/pricing` — every number on `/pricing` traces back to the live pricing source or another authoritative live source. This does not apply to the retained legal page at `/pricing-legal`, whose hand-typed figures are a knowingly accepted exception (see Assumptions).
6. **Given** the redesigned pricing page has finished loading and is being viewed, **When** it is served from the production, Express-served build (not the development server) and its checkout action is exercised, **Then** the browser reports zero content-security-policy violations for the page or the checkout action.

---

### User Story 5 - Paying mid-set doesn't erase the set the player just finished (Priority: P3)

A player finishes a practice set and lands on the results/summary screen, then decides to upgrade right there. Today, that summary screen only exists for the current app session — going through the purchase flow and returning can lose the very results the player was just looking at, dropping them somewhere else in the app instead. A player who just paid should land back on their results, not lose them.

**Why this priority**: This is a real but narrower rough edge in the purchase journey — it affects conversions from one specific screen, not the core entitlement/security problems in Stories 1–2, and there is already a same-day fallback in place (the player lands on a sensible screen, just not the one they left).

**Independent Test**: Start a purchase from the results/summary screen, complete it, and confirm the player returns to see the same results they left, without needing any other story in this epic. Can be tested in isolation against the existing purchase-return flow.

**Acceptance Scenarios**:

1. **Given** a player on the results/summary screen who starts a purchase, **When** the purchase completes and the player returns to the app, **Then** they see the same set results they had before starting the purchase, not a different screen.
2. **Given** a player who starts a purchase from the results/summary screen but the app is fully restarted (cold boot) before or during the return, **When** the app reopens, **Then** the same set results are still shown, recovered from where they were held during the purchase.
3. **Given** the information needed to recover the results is missing or invalid on return (e.g. an interrupted or unusual flow), **When** the player returns, **Then** the existing fallback behavior applies — the player lands on the practice-set picker screen rather than an error or blank screen.
4. **Given** a player has already returned once from a completed purchase and later opens the upgrade prompt again in the same session, **When** they view any purchase-outcome messaging, **Then** it reflects only the current purchase attempt — no outcome from the earlier, already-resolved purchase reappears.

---

### Edge Cases

- What happens when a caller requests a lesson id that doesn't exist at all (neither free nor paid)? (Out of scope for this epic's change — existing not-found behavior is unaffected.)
- What happens when an account's entitlement flips from paid to free (e.g. a cancellation) while the client still holds a cached "paid" answer? The cache window bounds how long the stale answer can be shown; there is no requirement in this epic to push an immediate, real-time downgrade notification.
- What happens if the live pricing source is unavailable but the visitor already has the pricing page open (not a fresh load)? The degraded-state message applies equally to an in-progress session that loses access to live pricing, not only to first load.
- What happens if a visitor reaches the dedicated legal/compliance page directly (not via the pricing page)? It must render correctly and completely on its own — it does not depend on the pricing page having been visited first.
- What happens when the entitlement check module itself cannot reach the data it depends on (not just "the answer is no", but "the check itself failed")? This is the fail-closed case in User Story 2 — the caller is treated as unentitled rather than the request erroring out ungracefully.
- What happens to a player's mid-set purchase flow if they never return to the summary screen at all (e.g. closes the app for good after paying)? No requirement to recover results beyond the current app session's normal retention.

## Requirements *(mandatory)*

### Functional Requirements

**Lesson content gating (User Story 1)**

- **FR-001**: The system MUST NOT return a paid lesson's content (slides) to a caller who does not hold a paid entitlement.
- **FR-002**: When an unentitled caller requests a paid lesson, the system MUST return an HTTP 200 response with body `{ id, title, order, free, locked: true }` — the lesson's `id`, `title`, its ordering position (`order`), its free/paid flag (`free`, which will be `false`), and `locked: true` — with the `slides` field absent from the response (not `null`, not an empty array).
- **FR-003**: A free lesson MUST always be returned in full to any caller, entitled or not.
- **FR-004**: An entitled (paid) caller requesting a paid lesson MUST receive the full lesson content, unchanged from current behavior.
- **FR-005**: The lesson list (the metadata for all lessons together) MUST continue to expose only public metadata to every caller, as it already does today — this epic does not change the list response.
- **FR-006**: The app's existing locked-lesson experience (title shown, upgrade prompt offered) MUST continue to work correctly using the locked response defined in FR-002.

**Single entitlement source (User Story 2)**

- **FR-007**: The system MUST provide exactly one authoritative, server-side computation of a given account's current entitlement, derived from the account's actual stored plan tier — not from any client-supplied or client-cached value.
- **FR-008**: Every server-side decision that depends on entitlement (including the lesson gate in FR-001–FR-004) MUST consult this one authoritative computation, directly, without introducing an additional network call between one server-side decision point and another.
- **FR-009**: The system MUST expose this authoritative computation to the client as a single queryable entitlement endpoint.
- **FR-010**: When the authoritative entitlement computation cannot complete on the **server** (an internal failure, not merely "the answer is free/unentitled"), the system MUST default to treating the caller as unentitled ("fail closed") rather than granting access it could not verify.
- **FR-011**: The client MUST cache the entitlement answer for a bounded amount of time rather than querying on every decision.
- **FR-012**: The client MUST invalidate (discard and re-fetch) its cached entitlement answer, at minimum, immediately upon returning from a completed checkout/purchase flow, and upon the cache's bounded lifetime expiring.
- **FR-013**: When the **client's** attempt to fetch a fresh entitlement answer fails (offline, timeout, server error), the client MUST fall back to the last entitlement answer it successfully obtained for that account, even if that cached answer is stale, and MUST treat the account as unentitled only when no answer has ever been successfully obtained for it. This is deliberately the opposite of FR-010: the server-side gate is the actual enforcement point, so once it is in place the client is free to optimize for not showing a paying customer a spurious upgrade prompt during a transient failure, rather than failing closed itself. (See also FR-033, which covers the related case of a session that lapsed rather than a fetch that failed.)
- **FR-014**: All decision points in the app that currently determine paid-vs-free behavior from a locally cached plan-tier value (the settings screen's subscription display, the post-set summary screen's free-user messaging, the saga/lesson-map screen's lock state, the deep-reveal panel's quota display, and the lesson-lock guard used across lesson screens) MUST be migrated to source that decision from the client-side entitlement helper described in FR-009/FR-011/FR-012/FR-013, replacing their current direct reads of the cached tier value.
- **FR-015**: The existing server-side helper that was built to prove the payment-provider interface's substitutability, but has no real production caller, MUST be documented as superseded, for production entitlement decisions, by the authoritative computation in FR-007 — its role in tests is unaffected.

**Payment identity & analytics documentation (User Story 3)**

- **FR-016**: The system's documented policy on the payment-identity check MUST state the current trust model as a ratified, settled decision (not a provisional, unreviewed one), and MUST name the specific residual risks accepted: an attacker granting paid access to an account they don't control (at their own financial expense), and laundering a chargeback-prone payment onto a third party's account.
- **FR-017**: This epic MUST NOT change the code that performs the payment-identity check — the change is documentation-only.
- **FR-018**: The previously recorded gap around a missing analytics record on the fallback payment-confirmation path MUST be re-evaluated against the payment provider currently in use, and MUST be recorded as either resolved (with the reason it no longer applies) or still open (with an accurate, current description).
- **FR-019**: If, after the re-evaluation in FR-018, the analytics gap is found to still apply, the fallback payment-confirmation path MUST write the same analytics record the primary confirmation path writes, exactly once per payment, without duplicating a record already written by the primary path for the same payment.

**Pricing page (User Story 4)**

- **FR-020**: The `/pricing` page MUST display prices, savings/discount figures, and any quota figures (e.g. the free-tier weekly limit) sourced from the live, currently configured data at the time the page is viewed — no fixed, hand-typed price, discount, or quota figure may appear on it. (The retained legal page at `/pricing-legal` is exempt from this requirement — see Assumptions.)
- **FR-021**: The pricing page MUST visually and behaviorally match the rest of the app (its established design language and translated-language support), replacing the current bare, disconnected page.
- **FR-022**: When live pricing data is unavailable, the pricing page MUST show a clear, non-error, non-blank message explaining that pricing is temporarily unavailable, and MUST NOT offer a purchase action that cannot succeed.
- **FR-023**: The merchant-of-record clause, the refund policy statement, and the link to the terms page MUST remain available, unchanged in wording, on a dedicated legal/compliance page that is reachable independent of the pricing page's own availability.
- **FR-024**: The address that previously served the old static pricing page MUST, after this change, serve the new designed pricing page.
- **FR-025**: The old static pricing page's content MUST remain reachable, unchanged in its legal content, at a distinct address, linked from the app (e.g. alongside the terms link), and MUST NOT be deleted.
- **FR-026**: No hand-typed price or discount figure that existed on the old pricing page MUST remain on the new `/pricing` page after this change ships. This requirement does not extend to the retained legal page at `/pricing-legal`, whose pre-existing hand-typed price and quota figures are a knowingly accepted exception (see Assumptions).
- **FR-027**: The redesigned pricing page and its checkout action MUST be verified to function under the production content-security policy as actually enforced by the production server build — verification performed against a built, server-served artifact, never against the development server, which does not enforce the policy.

**Backlog bookkeeping (cross-cutting)**

- **FR-028**: Every issue this epic covers (the paid-lesson data leak, the stale tier-read-site count, the payment-identity ratification, the fallback-activation analytics gap, the pricing-page drift risk, and the mid-set-purchase continuity gap) MUST be closed out in the project's issue backlog in the same change that ships the corresponding work — each one either marked resolved with the date, or, if it remains applicable, left open with a dated update naming exactly what remains outstanding. An issue is not required to close; it is required to be accurately updated.

**Checkout return continuity (User Story 5)**

- **FR-029**: When a player starts a purchase from the set-results/summary screen, the system MUST preserve that set's results across the purchase flow so they can be restored when the player returns, including across a full app restart occurring during the purchase.
- **FR-030**: On return from a completed purchase, if the preserved set results are available, the system MUST show the player their set results screen with those results, rather than routing them elsewhere.
- **FR-031**: If the information needed to restore the set results is missing or invalid on return, the system MUST fall back to its existing behavior of routing the player to the practice-set picker screen.
- **FR-032**: A purchase outcome (success/failure/confirming) shown to the player MUST reflect only the most recent purchase attempt — a previously resolved purchase's outcome MUST NOT reappear when the player later opens a purchase prompt again in the same session.

**Session-lapse handling (cross-cutting: User Stories 1 and 2)**

- **FR-033**: The system MUST be able to distinguish, in an entitlement answer, "this caller's session has lapsed or was never established" from "this account is genuinely on the free tier." When a fresh entitlement answer indicates the former, and the client had previously obtained an "entitled" answer for that account, the client MUST attempt to reestablish the session before treating the account as downgraded to unentitled, rather than immediately overwriting its cached "entitled" answer with the ambiguous one. A caller with no prior "entitled" answer for that account (the ordinary anonymous or free-tier visitor) is unaffected by this requirement and is treated as unentitled immediately, per FR-013.

### Key Entities

- **Entitlement answer**: The single, authoritative yes/no (paid vs. free) determination for a given account, computed server-side from the account's actual stored plan tier. Consumed identically by the lesson gate and by every client decision point.
- **Lesson (locked view)**: The redacted representation of a paid lesson returned to an unentitled caller — an HTTP 200 response with body `{ id, title, order, free, locked: true }`: the lesson's public identity (`id`, `title`, `order`, `free`) plus `locked: true`, with `slides` absent (not `null`, not an empty array).
- **Pricing page / legal page**: Two related but independently reachable surfaces — a live-data-driven purchase-decision page at `/pricing`, and a static legal/compliance record at `/pricing-legal` that must survive any redesign of the former unchanged and undeleted; the legal page's pre-existing hand-typed price and quota figures are a knowingly accepted exception to the "no hand-typed figures" rule (see Assumptions).
- **Payment-identity policy record**: The documented statement of the accepted trust model for binding an incoming payment to the account it grants access to, including its named residual risks.
- **Preserved set results**: A player's just-completed practice-set outcome, held across a purchase flow so it can be restored on return, keyed so it survives a full app restart.

## Out of Scope

- Migrating off the current payment provider, or changing the plan/price catalog.
- Adding new paywall entry points beyond the pricing page (the Settings screen's upgrade CTA already exists and is unaffected).
- Backfilling historical upgrade-completion analytics records from before this change.
- Closing the first-payment identity-forgery window with a server-minted customer id — accepted as a residual risk (see User Story 3 and FR-016/FR-017).
- Deleting the retained legal/compliance pricing page — it moves to its new address, it does not disappear (see FR-025).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-out request for any paid lesson's content returns zero lesson content, in 100% of cases, while still correctly identifying the lesson and its locked state.
- **SC-002**: Every decision in the app about whether to show paid content or a locked/upgrade experience agrees with the account's actual current paid status — there is no observable case in which the app's own UI and a direct request for the same data disagree about whether an account is entitled.
- **SC-003**: An account's entitlement status change (e.g. completing a purchase) is reflected in the app the player is using within one return-to-app action — no manual page reload is required to see paid content unlock.
- **SC-004**: Every price, discount, and quota figure shown to a visitor on the redesigned `/pricing` page always matches the currently configured live value — verified to have zero drift at the time of release, with no mechanism left in place that could silently reintroduce drift on that page (i.e., no remaining hand-typed figures). This does not apply to the retained legal page at `/pricing-legal`, whose pre-existing hand-typed figures are a knowingly accepted exception (see Assumptions).
- **SC-005**: A player who purchases from the results/summary screen sees their own results again after returning from a successful purchase, in 100% of normal-flow attempts, including after a full app restart during the purchase.
- **SC-006**: The documented payment-identity policy reads as a settled, dated decision with explicitly named accepted risks — a reviewer can find no remaining "treat this as unreviewed" language for the identity check.
- **SC-007**: The legal/compliance pricing page remains reachable and unchanged in its required legal content at all times, including when the live pricing page cannot load — verified independently of the live page's availability.
- **SC-008**: The pricing page loads, displays live prices, and launches checkout with zero content-security-policy violations reported, verified on the production build (never the development server).

## Assumptions

- "Entitled" in this epic means holding the paid plan tier as recorded in the account's own stored profile; no new plan tiers or entitlement types are introduced.
- The existing free/paid split of lessons (which specific lessons are free vs. paid) is unchanged by this epic — only how the paid ones are protected changes.
- The account's plan tier remains the single source of truth for entitlement; this epic does not introduce a new, separate entitlement record disconnected from that tier.
- The payment-identity trust model (how an incoming payment is bound to the account it grants access to) is out of scope for any code change in this epic — User Story 3 is documentation of an already-made decision, not new design work.
- The pricing page's redesign reuses the app's existing purchase flow (the checkout action itself) unchanged — only how prices are displayed and how the page is built/reached changes.
- No new payment provider, plan, or price point is introduced by this epic.
- The domain this app is served from has already been cleared for a live-data-driven purchase page by the payment provider's own review process; this epic does not need to initiate or wait on a new provider review before shipping the redesigned pricing page, though a confirmatory check that no new review is required is still expected.
- "Full app restart" in User Story 5 means the player's app session is fully torn down and reopened, not merely backgrounded — the preserved results must survive that, not just an in-memory pause.
- Analytics records referenced in User Story 3 (FR-019) are internal usage/audit records, not user-facing data — their absence or presence is not visible to the end user.
- **Accepted residual drift risk on the retained legal page**: the retained legal page (`/pricing-legal`) keeps its pre-existing hand-typed price figures and its hand-typed quota figure (the free-tier weekly limit), which duplicates the server-side configured value and has already drifted from it once before. This risk is knowingly accepted in exchange for not modifying a static, JavaScript-free page the payment provider has already reviewed and approved — editing it would reopen a question this epic does not need to reopen. The issue tracking this drift risk is not required to close as part of this epic; it may remain open with a dated note naming this exact residual scope (see FR-028).
