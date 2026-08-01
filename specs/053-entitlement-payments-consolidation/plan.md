# Implementation Plan: Entitlement & Payments Consolidation

**Branch**: `053-entitlement-payments-consolidation` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/053-entitlement-payments-consolidation/spec.md`, ratified by
`docs/epics/open-issues-epics.md` §"Epic 3 — Entitlement & Payments Consolidation"

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md`
for the execution workflow.

## Summary

Six independent entitlement checks exist in this app today (five client-side tier reads plus zero
server-side enforcement on the lesson-content endpoint), and they can disagree with each other and with the
account's actual paid status. This plan consolidates them into **one server-side entitlement module**
(`connect-four/server/entitlement.js`), exposed to the client as a thin wrapper endpoint
(`GET /api/user/entitlement`) and consumed directly (no HTTP hop) by the lesson-content gate. It closes the
one place paid content actually leaves the server unentitled (`GET /api/lessons/:id`), migrates all five
client tier-read call sites onto a new cached, fail-open client helper, replaces the bare static `/pricing`
page with a live-data-driven in-app React route (retaining the legal copy at `/pricing-legal`), ratifies the
already-accepted payment-identity risk in documentation only, and persists a mid-set purchase's results
across the checkout round trip. No new plan tiers, no new payment provider, no change to the payment-identity
binding code.

## Technical Context

**Language/Version**: Node.js (ES modules, `"type": "module"`), React 18 (JSX), both under `connect-four/`.
**Primary Dependencies**: Express 5 (server), `@paddle/paddle-node-sdk` + Paddle.js overlay (payments,
unchanged), React + `react-i18next` (frontend), `@supabase/supabase-js` (DB), no router library
(hand-rolled `URL_MAP`/`screenRegistry.jsx`/`pushState` navigation — `react-router-dom` is a permanent
absence, spec 011 FR-001).
**Storage**: Supabase Postgres (`users.tier`, read by the new entitlement module and already read by
`loadUser`); `sessionStorage` (new, US5 preserved-results nonce); no new DB table or column.
**Testing**: `node:test` + `node:assert/strict` via `npm run test:fast` (inside `connect-four/`) — **never**
`npm test` (that suite includes `candidate-generator.test.js`, which calls the real c4solver up to 400 times
and can hang 10+ minutes; irrelevant to this feature's surface anyway).
**Target Platform**: Existing Connect Four web app (Express server serving a built Vite/React SPA).
**Project Type**: Web application — single Express server (`connect-four/server/`) + single React SPA
(`connect-four/src/`), no separate frontend/backend repos.
**Performance Goals**: No new latency budget beyond the constitution's existing ones (Explanation Engine
under 2s does not apply here). The entitlement module is a synchronous, in-process function call — adds no
measurable latency to `GET /api/lessons/:id`.
**Constraints**: Server-side entitlement failure MUST fail closed (unentitled); client-side entitlement
lookup failure MUST fail open to the last known good answer (deliberately asymmetric — FR-010/FR-013). No
code change to payment-identity binding (`paddleProcessor.js`'s `transaction.completed` cross-check). CSP for
the new pricing route MUST be verified against the Express-served `dist/` build, never `npm run dev`
(Vite dev serves no CSP header at all). The entitlement module's exported **production** entry point is
`entitlementForRequest(req)`, not the pure `computeEntitlement(user)` core — DB provenance of the tier is
structural, not conventional (research.md Decision 1). The `pricing.html` file served at `/pricing-legal`
MUST stay byte-stable — route path only changes; its hand-typed price/quota literals are retained by owner
decision (2026-08-01) and are NOT part of this feature's de-hardcoding scope, which applies to `/pricing`
only; OI-41 therefore stays open with a dated `UPDATE`, not a `RESOLVED` flip.
**Scale/Scope**: 5 user stories, ~34 tasks (see per-story estimates in the Project Structure section below);
touches server route handlers, one new server module, one new client module, 5 existing client tier-read
call sites, 3 existing lesson-content screens (locked-response handling), 3 frontend navigation registries,
1 new React screen, 3 existing static legal pages (`/pricing` link re-pointing), `server/index.js` route
registration order, the i18n key files (`src/i18n/en.json`/`es.json`, new `pricing.*` + `footer.pricingLegal`
keys), and 3 architecture docs (`server-conventions.md`, `api-conventions.md`, `frontend-conventions.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Explanation Engine)** — N/A. This feature does not touch move evaluation, pattern
  classification, or LLM annotation.
- **Principle II (Code Quality & Simplicity)** — Satisfied by design: the entitlement module is a single
  small pure function (no speculative abstraction); the client helper reuses the existing
  extracted-plain-`.js`-module pattern (`checkoutReturnFlow.js`, `onboardingRouting.js`,
  `postLoginReturn.js`) rather than inventing a new one; the storage-agnostic `ProfileStore` interface is
  not touched (entitlement is server-truth, deliberately separate from the local profile cache — see
  research.md Decision 2).
- **Principle III (Testing Standards)** — This feature has no solver dependency. New unit tests for the
  entitlement module (pure, `node:test`), the redacted-lesson-response builder (pure, `node:test`, mirrors
  `blunderDetailResponse.js`'s test seam), the client cache/TTL/fail-open logic (pure, `node:test`), and the
  pricing-page degraded state (component test). No board fixtures needed.
- **Principle IV (UX Consistency & Progressive Disclosure)** — Directly enforced: FR-006 requires the
  existing locked-lesson preview-card-with-upgrade-prompt experience to keep working (this principle's
  explicit "Locked paid-tier content MUST always render a preview card... MUST NOT be invisible or produce
  an error" requirement). This now explicitly includes all three real consumers of `GET /api/lessons/:id`'s
  `{ locked: true }` stub — `ConceptScreen.jsx`, `SocraticScreen.jsx`, `CLChallengeScreen.jsx` — each of
  which MUST detect `locked === true` and render the existing upgrade-prompt affordance instead of indexing
  the now-absent `slides` array (see Source Code map below; a naive fetch-and-index would throw a
  `TypeError` and violate this principle directly). The pricing page reuses `UpgradeModal.jsx`'s
  toggle/savings-badge treatment for visual consistency (FR-021).
- **Principle V (Performance)** — Analytics writes (the OI-34 `upgrade_completed` fallback write, if it
  still applies after FR-018's re-evaluation) MUST stay fire-and-forget, per the existing
  `paddleProcessor.js`/`writeTier` pattern. No other latency-budget-relevant work.
- **Principle VI (Debugging Methodology)** — The plan is built entirely from source-verified citations (see
  research.md); no theoretical claim about the five tier-read sites, the routing files, or the CSP
  discovery process is taken from the epic doc without independent grep/read verification this session
  (documented per-claim in research.md).
- **Principle VII (Design Philosophy)** — The asymmetric fail-open/fail-closed policy (FR-010 vs FR-013) is
  an explicit, load-bearing exception to "one obvious way to do it" — documented with its rationale at the
  point where it's load-bearing (both in the spec and in `server-conventions.md`/the client module's own
  header comment), not left implicit.
- **Tier & Access Control Constraints** — This epic is the direct enforcement of "MUST be enforced
  server-side; client-side gating is presentational only" for the one place that constraint was violated
  (`GET /api/lessons/:id`). The Deep Reveal weekly quota figure (`FREE_DEEP_REVEAL_WEEKLY_LIMIT = 20`) is
  unchanged in value; this plan only adds a way to read it live instead of hand-typing it on `/pricing`.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (docs/architecture/, data-model.md, contracts/, prior plan.md files,
  constitution) were read before this plan was drafted — `server-conventions.md` §PaymentProcessor Seam /
  §Identity binding / §SPA Catch-all Route / §Route Module Organization / §Lesson Loader / §CSP Directive
  Rationale, `api-conventions.md` §Route Naming / §Access Guards / §Paddle Checkout Config / §Route
  Registration Ordering Constraint, `frontend-conventions.md` §Storage Abstraction / §Screen Navigation /
  §URL Sync & Navigation / §Upgrade / Checkout flow, `testing-conventions.md`, and the constitution's Tier &
  Access Control Constraints section.
- [x] Undocumented conventions discovered during review have been documented before planning continued — see
  research.md Decision 6 (`LegalFooter.jsx`'s `/pricing` link is a 4th, previously-uncited navigation touch
  point beyond the epic's three) and Decision 11 (the three static legal pages — `privacy.html`, `terms.html`,
  `refunds.html` — that also link to `/pricing` and must be re-pointed to `/pricing-legal`, plus the three
  lesson screens that consume the locked-lesson response shape).
- [x] tasks.md will include explicit documentation tasks for every new architectural decision this feature
  introduces (the entitlement module + endpoint seam, the redacted-lesson-response contract, the
  `GET /api/limits` endpoint, the `/pricing`↔`/pricing-legal` split, the OI-55 ratification) — enumerated in
  data-model.md and contracts/.

## Project Structure

### Documentation (this feature)

```text
specs/053-entitlement-payments-consolidation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    ├── entitlement.md    # GET /api/user/entitlement + the shared server module
    ├── lessons.md        # GET /api/lessons/:id — locked-response contract
    └── limits.md         # GET /api/limits — new live quota endpoint
```

(`tasks.md` is produced by a later `/speckit-tasks` run, not by this plan.)

### Source Code (repository root)

**Structure Decision**: Existing single-app layout — `connect-four/server/` (Express) +
`connect-four/src/` (React SPA), no new top-level directories. This feature adds two new server modules,
one new client module, one new screen, and touches the files below.

```text
connect-four/
├── server/
│   ├── entitlement.js            # NEW — entitlementForRequest(req) → { entitled, authenticated }
│   │                              # (production entry point); computeEntitlement(user) is the internal,
│   │                              # test-only pure core it wraps — see research.md Decision 1
│   ├── lessonEntitlement.js      # NEW — buildLessonResponse(lesson, entitlement) pure fn (US1)
│   ├── userRoutes.js             # + GET /api/user/entitlement (thin wrapper, US2) — response now
│   │                              # { entitled, authenticated } per research.md Decision 4
│   ├── index.js                  # US1: gate GET /api/lessons/:id via lessonEntitlement.js
│   │                              # US4: remove the static /pricing sendFile route; register the SAME
│   │                              # handler body at /pricing-legal instead (route path only — file
│   │                              # content is byte-stable, see pricing.html below)
│   │                              # NEW: GET /api/limits (US4/quota plumbing)
│   ├── paymentProcessor.js       # US2: doc comment update only (superseded, not deleted)
│   ├── paddleProcessor.js        # US3: OI-34 upgrade_completed write IF still applicable
│   ├── pricing.html              # US4: ROUTE PATH ONLY (/pricing → /pricing-legal). File content is
│   │                              # BYTE-STABLE — hand-typed price/quota literals are retained by owner
│   │                              # decision (2026-08-01); this file is NOT edited. De-hardcoding scopes
│   │                              # to PricingScreen.jsx only. OI-41 stays open with a dated UPDATE
│   │                              # naming these retained literals, never a RESOLVED flip.
│   ├── privacy.html              # US4: re-point <a href="/pricing"> → <a href="/pricing-legal">
│   ├── terms.html                # US4: re-point <a href="/pricing"> → <a href="/pricing-legal">
│   └── refunds.html              # US4: re-point <a href="/pricing"> → <a href="/pricing-legal">
├── src/
│   ├── lib/
│   │   ├── entitlement.js        # NEW — client cache/TTL/fail-open helper (US2); consumes
│   │   │                          # { entitled, authenticated }; on authenticated:false while holding a
│   │   │                          # lastKnownGood of entitled:true, attempts one bounded session refresh
│   │   │                          # (reusing fetchWithAuthRetry.js's pattern) before accepting a downgrade
│   │   ├── fetchWithAuthRetry.js # US2: reused (not modified) by entitlement.js's session-refresh path
│   │   ├── urlMapping.js         # US4: + /pricing URL_MAP entry
│   │   └── checkoutReturnFlow.js # US2/US5: invalidation hook + nonce plumbing touch points
│   ├── lib/screenRegistry.jsx    # US4: + pricing screen entry
│   ├── screens/
│   │   ├── PricingScreen.jsx         # NEW (US4) — copy sourced from src/i18n/{en,es}.json's new `pricing.*`
│   │   │                              # namespace (below), not hardcoded strings
│   │   ├── SettingsScreen.jsx        # US2: migrate tier read
│   │   ├── PostSetSummaryScreen.jsx  # US2: migrate tier read; US5: results persistence
│   │   ├── SagaScreen.jsx            # US2: migrate tier read
│   │   ├── ConceptScreen.jsx         # US1: detect locked===true on GET /api/lessons/:id response;
│   │   │                              # render existing upgrade-prompt affordance instead of indexing
│   │   │                              # lesson.slides[slideIndex] (currently unguarded — Blocking issue 2)
│   │   ├── SocraticScreen.jsx        # US1: same locked===true guard as ConceptScreen.jsx
│   │   └── CLChallengeScreen.jsx     # US1: same locked===true guard (cold-boot fetch path, already
│   │                                  # named in contracts/lessons.md)
│   ├── lib/useLessonLockGuard.js     # US2: migrate tier read; consumes new { entitled, authenticated }
│   │                                  # shape via getEntitlement()
│   ├── components/
│   │   ├── DeepRevealPane.jsx    # US2: migrate tier read
│   │   └── LegalFooter.jsx       # US4: /pricing → go('pricing') + /pricing-legal link; also correct the
│   │                              # file's own header comment, which currently claims ALL its links "live
│   │                              # outside the SPA" — false for /pricing once it's an in-app route
│   ├── i18n/
│   │   ├── en.json               # NEW keys (US4, tasks-critique blocking issue 2): a `pricing.*` namespace
│   │   │                          # (PricingScreen.jsx headings/CTA/degraded-state/quota-fallback copy) and
│   │   │                          # `footer.pricingLegal` alongside the existing `footer.pricing` key
│   │   └── es.json               # Rioplatense-voseo equivalents of every en.json key above — a missing key
│   │                              # here falls back to English silently, with no failing test, so this file
│   │                              # is in scope for the same task as en.json, not an afterthought
│   └── App.jsx                   # US4: nav wiring
├── tests/
│   ├── integration/               # new: lesson-gate test (incl. locked-response rendering for all 3
│   │                              # screens), entitlement endpoint test (incl. authenticated:false +
│   │                              # session-refresh case)
│   └── unit/                      # new: entitlement module, client cache, response builder tests
docs/architecture/
├── server-conventions.md          # US2: getSubscriptionStatus superseded note; US3: OI-55 ratification
├── api-conventions.md             # US1: locked lesson-response contract; US2: entitlement endpoint
│                                  # (incl. entitlementForRequest(req) vs computeEntitlement(user));
│                                  # US4: GET /api/limits
├── frontend-conventions.md        # US2 (tasks-critique blocking issue 3): §"Reading the user's tier —
│                                  # profile, never session" currently mandates the exact
│                                  # `store.getProfile().then(p => setTier(p.tier))` pattern (naming
│                                  # PostSetSummaryScreen.jsx as canonical precedent) that this feature
│                                  # deletes from all five call sites — must be rewritten to mandate
│                                  # getEntitlement() instead, retaining the existing session?.tier warning
docs/open_issues.md                # US3/all: OI-66, OI-39, OI-55, OI-34, OI-41 (UPDATE, not resolved), OI-25
staging_checks.md                  # US4: CSP + domain-review confirmatory checks, under a new
                                    # "## Epic 3 — Entitlement & Payments Consolidation (spec 053)" heading —
                                    # NOT the pre-existing, unrelated "## Epic 3 — Global UI/UX &
                                    # Accessibility Polish (spec 043)" heading already in that file
```

## Complexity Tracking

*No constitution violations requiring justification. The one deliberate asymmetry (server fail-closed vs.
client fail-open) is a requirement (FR-010/FR-013), not a complexity violation — see Constitution Check
above.*
