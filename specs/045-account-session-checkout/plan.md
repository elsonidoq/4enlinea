# Implementation Plan: Account — Session Persistence & Paid Checkout

**Branch**: `feature/polish` | **Date**: 2026-07-11 | **Spec**: `specs/045-account-session-checkout/spec.md`
**Input**: Feature specification from `specs/045-account-session-checkout/spec.md` (Epic 5,
`polish_epic.md` lines 744-905)

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Wrap and extend existing, already-built surfaces — session cookies, the Stripe checkout/webhook/portal
routes, and the dead-no-op `UpgradeModal` — rather than building new ones. Four concrete changes drive
the plan: (1) the refresh-token exchange is **inferred** (from reading GoTrue client behavior and this
project's config, not from an empirical test) to rotate the credential on every use (reuse-detection is
GoTrue's default) — FR-002a explicitly requires this to be verified empirically before any new
coordination machinery is built, so the plan sequences a standalone empirical check as the very first
implementation task and gates the single-flight de-dup build on its result (see Phase ordering below and
`research.md` R1); (2) the Stripe webhook currently has no idempotency short-circuit despite
`stripe_events.stripe_event_id` being unique, letting a duplicate delivery double-fire the
`upgrade_completed` analytics track (confirmed by reading the handler, not inferred); (3) `loadUser`
never selects `stripe_customer_id`, silently breaking the existing (dead) billing-portal route and
blocking `getSubscriptionStatus` (confirmed by reading the handler); (4) the webhook's
`customer.subscription.updated` handling unconditionally sets tier to `paid` regardless of the
subscription's actual status field — under the new FR-025 requirement (`tier` as a live mirror of
Stripe's subscription status, owner-added — see `research.md` R2a), this is a latent correctness bug:
it never lets a terminated subscription drop a user back to `free`. (2), (3), and (4) are fixed
unconditionally as part of implementing FR-001–FR-025; (1) is fixed conditionally per the empirical gate.
The Stripe sandbox (zero products/prices, confirmed live via MCP) is provisioned via Stripe MCP as a
prerequisite gate (US5, P1) before US3/US4 can be considered verified.

## Technical Context

**Language/Version**: Node.js ≥20.10 (ESM, `ES2022`+ syntax) for `connect-four/server`; React 18/19 +
Vite for `connect-four/src`. No version change required by this feature.
**Primary Dependencies**: `express`, `@supabase/supabase-js` v2 (two-client pattern — `supabase` for DB,
`authClient` for `auth.*`, see `server-conventions.md`), `stripe` npm SDK (already a dependency, used
conditionally), `react-i18next`.
**Storage**: Supabase Postgres. No new tables, no new columns, no migration (FR-017). Reads/writes only
`users.tier` (per FR-025, now actively maintained as a live mirror of Stripe subscription status by the
webhook, not a set-once value — see Summary point (4) and `research.md` R2a), `users.stripe_customer_id`
(existing, currently mis-wired — see Summary), and `stripe_events` (existing, unique on
`stripe_event_id`).
**Testing**: `node --test` via `npm run test:fast` (per CLAUDE.md). New test files follow the
`server/userEndpoints.test.mjs` pattern — mock Express app + stub Supabase/Stripe clients, no real DB or
live Stripe calls in the fast suite.
**Target Platform**: Railway-hosted Node server (single process) serving the built SPA + `/api/*`
(existing deploy shape, `server-conventions.md` Migration Runner / SPA Catch-all sections). No
infrastructure change.
**Project Type**: Web application — Node/Express backend (`connect-four/server/`) + React SPA frontend
(`connect-four/src/`), single monorepo, existing structure preserved.
**Performance Goals**: Not perf-critical (Constitution §V's 2s Explanation Engine budget does not apply
to auth/checkout). The one explicit timing constraint is the FR-011/FR-013 bounded-wait budget for
post-checkout tier confirmation: `[0s, 2s, 4s, 7s, 10s]`, 5 attempts, ~10s total budget (FR-015, ratified;
see `research.md` R4).
**Constraints**: httpOnly-cookie-only auth (`credentials: 'include'`, never `Authorization` header from
the client — `api-conventions.md` Auth Threading); no new stored subscription-status field (FR-017); no
"remember me" UI (FR-006); recurring-subscription billing only, no one-time purchases; `UpgradeModal`'s
existing `onDismiss`/`onUpgrade` prop contract must be preserved, not redesigned
(`feedback_spec_existing_apis`).
**Scale/Scope**: Solo-founder-scale SaaS; low request volume. Touches 3 server route groups (auth,
stripe, `loadUser` middleware), 1 new server module (`paymentProcessor.js` + `stripeProcessor.js`), 1
frontend component (`UpgradeModal.jsx`) + 4 call sites + 1 new root-level return-flow handler, and one
external system (Stripe sandbox, MCP-provisioned).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Explanation Engine)**: N/A — this feature touches auth/payments, not move
  evaluation/explanation surfaces. No conflict.
- **Principle II (Code Quality & Simplicity)**: Honored — `PaymentProcessor` is a 3-method thin seam
  (not a speculative catalog layer); the refresh de-dup, *if the R1 empirical gate confirms it's needed*
  (see Implementation Sequencing), is a ~20-line addition reusing the existing in-memory-Map pattern (no
  new framework) — and if the gate finds it's not needed, the simpler outcome (docs + a regression test,
  no new machinery) is itself the Principle-II-honoring choice; the 4 `UpgradeModal` call sites share one
  extracted checkout helper instead of 4 duplicated fetch blocks (`upgrade-flow-frontend.md`). No
  half-finished scaffolding is added — every new function ships with a task-scoped test.
- **Principle III (Testing Standards)**: Honored — new server logic (refresh de-dup, webhook
  idempotency, `PaymentProcessor`/`StripeProcessor`/`StubProcessor`) gets `node --test` unit coverage
  added to `npm run test:fast`; US3/US5 checkout flow additionally requires a manual golden-path +
  cancel-path verification per the `quickstart.md` steps (UI feature, not solver-dependent, so the
  "real solver" clause doesn't apply — but the "manually verified on golden path + edge case" clause
  does).
- **Principle IV (UX Consistency & Progressive Disclosure)**: Honored — `UpgradeModal`'s existing
  idle/loading/success visual language is extended (not replaced) with `activating`/`timeout` states;
  the plan toggle is additive UI on the same sheet, no new visual language introduced.
- **Principle V (Performance)**: N/A (see Technical Context — 2s budget is Explanation-Engine-specific).
  The FR-011/013 bounded wait is a UX timing contract, not a Principle V perf target.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (`docs/architecture/api-conventions.md`, `server-conventions.md`,
  `db-schema.md`) and the source epic (`polish_epic.md` Epic 5) were read before this plan was drafted.
  Live code (`server/index.js` auth block `:195-369`, Stripe block `:2688-2802`, `loadUser` `:339-369`,
  `ProfileStore.jsx`, `UpgradeModal.jsx` + its 4 call sites, `App.jsx:31`) was re-read to verify line
  numbers and confirm current behavior rather than trusting epic/memory citations at face value — three
  undocumented gaps were found this way (R1/R2/R3 in `research.md`).
- [x] Undocumented conventions discovered during review (webhook idempotency gap, `loadUser` missing
  `stripe_customer_id`, refresh-token rotation inferred but not yet empirically confirmed — see
  Implementation Sequencing) are documented in `research.md` and will get `docs/architecture/` updates as
  part of `tasks.md` (see below).
- [x] `tasks.md` (next command) will include explicit documentation tasks: updating
  `server-conventions.md`'s Environment Variables/Stripe section with the `PaymentProcessor` seam, and
  `api-conventions.md` with the `GET /api/auth/session` auto-refresh behavior change — both are new
  architectural decisions this feature introduces.

## Project Structure

### Documentation (this feature)

```text
specs/045-account-session-checkout/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   ├── api-auth-session.md          # POST /api/auth/refresh + GET /api/auth/session behavior contract
│   ├── payment-processor-interface.md  # PaymentProcessor / StripeProcessor / StubProcessor + Stripe routes
│   └── upgrade-flow-frontend.md     # UpgradeModal prop contract + return-flow handling
├── checklists/requirements.md       # Pre-existing
├── staging_checks.md                # New (US5 task, Phase 2) — deployed-webhook + Supabase timeout gates
└── tasks.md                         # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js                # MODIFIED: REFRESH_TOKEN_MAX_AGE (60d), loadUser() adds
│   │                            #   stripe_customer_id to both .select() calls; POST /api/auth/refresh
│   │                            #   + GET /api/auth/session STAY INLINE (reconciled decision — no
│   │                            #   authRoutes.js extraction; only attemptRefresh() is imported from
│   │                            #   authRefresh.js), and calls registerStripeRoutes(app,
│   │                            #   paymentProcessor) instead of defining the Stripe routes inline
│   ├── authRefresh.js          # NEW: attemptRefresh() + in-memory de-dup map, imported DIRECTLY by
│   │                            #   index.js's inline POST /api/auth/refresh and GET /api/auth/session
│   │                            #   handlers (no authRoutes.js intermediary — reconciled decision, see
│   │                            #   below) — de-dup build is GATED on the R1 empirical check (see
│   │                            #   Implementation Sequencing below); FR-002a is satisfied by
│   │                            #   documentation + a regression test alone if the check finds no
│   │                            #   rotation-with-reuse-detection
│   ├── stripeRoutes.js         # NEW: registerStripeRoutes(app, paymentProcessor) — extracts
│   │                            #   POST /api/stripe/create-checkout, /webhook, /portal out of
│   │                            #   index.js as thin wrappers over paymentProcessor (US4 injection
│   │                            #   seam: tests mount a fresh app via this function with a
│   │                            #   StubProcessor)
│   ├── paymentProcessor.js     # NEW: interface + createPaymentProcessor() factory
│   ├── stripeProcessor.js      # NEW: StripeProcessor impl (createCheckout/handleWebhook/
│   │                            #   getSubscriptionStatus), webhook idempotency check (R2), and
│   │                            #   status-based tier mirroring (FR-025 / R2a): handleWebhook derives
│   │                            #   the tier write from the subscription's actual status field
│   │                            #   (active/trialing→paid, past_due→unchanged, canceled/unpaid/
│   │                            #   subscription.deleted→free) instead of always writing 'paid'
│   ├── server.test.mjs pattern # NEW test files (see below), following userEndpoints.test.mjs
│   └── .env                    # MODIFIED (local/dev only): + STRIPE_MONTHLY_PRICE_ID,
│                                #   STRIPE_ANNUAL_PRICE_ID, STRIPE_WEBHOOK_SECRET (US5 provisioning)
├── src/
│   ├── components/
│   │   └── UpgradeModal.jsx    # MODIFIED: monthly/annual toggle (additive), onUpgrade(plan) signature,
│   │                            #   activating/timeout uiState values
│   ├── lib/
│   │   └── useUpgradeCheckout.js  # NEW: shared checkout-start handler for the 4 call sites
│   ├── screens/
│   │   ├── PostSetSummaryScreen.jsx  # MODIFIED: wire real onUpgrade
│   │   ├── SetPickerScreen.jsx       # MODIFIED: wire real onUpgrade
│   │   └── SagaScreen.jsx            # MODIFIED: wire real onUpgrade
│   ├── components/
│   │   └── DeepRevealPane.jsx  # MODIFIED: wire real onUpgrade
│   ├── App.jsx or a new small component  # MODIFIED/NEW: ?checkout=success|cancelled return-flow
│   │                            #   handling + bounded-wait poll + activating/timeout banner
│   └── store/
│       └── ProfileStore.jsx    # UNCHANGED (server-side fix makes GET /api/auth/session
│                                #   transparently better — see research.md R7); refetchSession already
│                                #   exposed and reused by the new return-flow handler
└── docs/architecture/
    ├── server-conventions.md   # MODIFIED: document PaymentProcessor seam, refresh de-dup pattern
    │                            #   (or its documented absence), the loadUser stripe_customer_id fix,
    │                            #   AND the FR-025 status-based tier-mirror webhook logic; note that
    │                            #   auth routes stay inline in index.js (no authRoutes.js)
    └── api-conventions.md      # MODIFIED: document GET /api/auth/session auto-refresh behavior and
                                 #   the FR-025 webhook tier-mirror contract
```

**Structure Decision**: Existing monorepo web-app layout is preserved exactly (`connect-four/server` +
`connect-four/src`). No new top-level directories. New server modules follow the established
single-responsibility extraction pattern already used for `userRoutes.js`/`userHelpers.js`
(`server-conventions.md` "Route Module Organization") — `paymentProcessor.js` (interface + factory),
`stripeProcessor.js` (impl), `authRefresh.js` (shared refresh logic, imported directly by index.js's
inline `POST /api/auth/refresh`/`GET /api/auth/session` handlers — no `authRoutes.js` extraction; see
Reconciliation note below), `stripeRoutes.js` (register-function, mirrors `registerUserRoutes(app,
supabase)`) are each small, independently testable modules rather than growing `index.js` further.
Frontend follows the existing `src/lib/*.js` pattern for cross-component shared logic (e.g.
`coachQueuePagination.js` precedent cited in `api-conventions.md`).

**Reconciliation note (auth routes stay inline)**: An earlier draft of this plan listed a
`server/authRoutes.js` extraction (`registerAuthRoutes(app, authClient)`) alongside `stripeRoutes.js`.
That extraction is **not built** — only `stripeRoutes.js` is a register-function module; `POST
/api/auth/refresh` and `GET /api/auth/session` stay defined inline in `index.js` and simply import
`attemptRefresh` from `authRefresh.js`. Rationale: unlike the Stripe routes, nothing in this feature's
scope requires constructing two independently-testable app instances against different auth backends —
the substitutability driver (US4/FR-020) applies only to the payment processor, not to auth. Extracting
`authRoutes.js` would be unmotivated surface area for this feature (Principle II). `tasks.md` T007 reflects
this directly rather than citing it as merely "optional."

## Implementation Sequencing

This plan has one hard ordering dependency, driven by FR-002a's empirical-verification precondition:

1. **First, standalone**: run the R1 empirical check (`research.md` R1) — fire two concurrent
   `POST /api/auth/refresh` calls presenting the **same** refresh-token value against a real Supabase
   auth instance and observe the second call's result.
   - If it fails with `refresh_token_already_used` (or equivalent) → rotation-with-reuse-detection is
     confirmed. Proceed to build `authRefresh.js`'s single-flight de-dup (task set below).
   - If it succeeds (or only extends expiry / re-sets the same token) → FR-002a is **already satisfied**
     by current behavior. Do not build new coordination machinery — instead, document the finding in
     `server-conventions.md` and add a regression test asserting the observed (safe) behavior, then close
     FR-002a via documentation per the spec's escape hatch.
   - This task blocks all other `authRefresh.js` work (imported directly by index.js's inline handlers)
     — it is sequenced before, not alongside, the de-dup implementation.
2. **Then, in any order**: the `stripeRoutes.js` register-function extraction (US4 injection seam), R2
   (webhook idempotency), R2a (FR-025 status-based tier mirror), R3 (`loadUser` fix), the FR-007
   OAuth-vs-auto-refresh conflict check (with its in-scope client-ordering-guard remediation if a
   conflict is found — see `contracts/api-auth-session.md`), and frontend work — none of these depend on
   the R1 result.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — Constitution Check above passed cleanly. Table intentionally omitted.
