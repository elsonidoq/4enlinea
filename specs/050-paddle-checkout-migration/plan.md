# Implementation Plan: Paddle Checkout Migration (replace & remove Stripe)

**Branch**: `worktree-epic-10-paddle-checkout` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-paddle-checkout-migration/spec.md`

**Note**: This plan is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the app's payment provider from Stripe (unavailable to Argentine sole traders) to
Paddle (a merchant-of-record observed paying out USD to an Argentine bank), without changing
the vendor-neutral `PaymentProcessor` seam (`server/paymentProcessor.js`) that Epic 5 already
built. This is a **swap behind an existing interface**, not an architecture redesign:
`createPaddleProcessor(...)` implements the same
`{ createCheckout, handleWebhook, getSubscriptionStatus }` shape that
`createStripeProcessor(...)` implements today, `server/paddleRoutes.js` replaces
`server/stripeRoutes.js` as a thin HTTP adapter, and the checkout model moves from a
server-built hosted-checkout-URL + full-page redirect to a client-side Paddle.js overlay
(`Paddle.Checkout.open(...)`), per the `paddle:checkout-web` skill's idiomatic Paddle Billing
pattern. Every Stripe-specific file, dependency, env var, DB identifier, and test is deleted;
the two genuinely neutral pieces of the old code (`sanitizeReturnPath`,
`checkoutReturnFlow.js`'s poll-state-machine shape) are carried forward, adapted to the new
event-driven (not polled) confirmation model. Route paths move from `/api/stripe/*` to
`/api/paddle/*`, and `stripe_customer_id`/`stripe_events` are renamed to
`paddle_customer_id`/`payment_events` via an additive migration — both are the epic's
provisional-settled recommended defaults, applied here as this plan's concrete decision (see
Research §1–2).

## Technical Context

**Language/Version**: Node.js (ESM, `"type": "module"` in `connect-four/package.json`), Express 4, React 18 + Vite (frontend)
**Primary Dependencies**: `@paddle/paddle-node-sdk` (server, new), `@paddle/paddle-js` (frontend, new), `@supabase/supabase-js` (existing, unaffected), Express (existing). **Install order (corrected — see below)**: both packages are added to `package.json` and actually `npm install`-ed during US10.2, before US10.2's sandbox-checkout tests run — not deferred to US10.4.4. US10.4.4's later lockfile pass (which removes `"stripe"`) runs `npm install` again against a lockfile that already has both Paddle packages resolved; the two installs reconcile in the same lockfile with no re-download of the Paddle packages, only the removal of `stripe`'s tree.
**Storage**: Supabase Postgres — `users.paddle_customer_id` (renamed from `stripe_customer_id`), new `payment_events` table (renamed from `stripe_events`), both via an additive migration (`connect-four/server/migrations/060_*.sql`)
**Testing**: `node --test` via `npm run test:fast` (excludes `tests/integration/candidate-generator.test.js`; see CLAUDE.md "Running tests"). Webhook durability (FR-009) needs a DB-failure-injection unit test since the Paddle sandbox cannot itself simulate a downstream DB error (see Research §5).
**Target Platform**: Existing Railway-deployed Node server + Vite SPA; sandbox-only for this feature's local deliverables (Assumptions, spec.md)
**Project Type**: Web application (existing `connect-four/server/` + `connect-four/src/` split — already in place; no new top-level project)
**Performance Goals**: N/A beyond existing constitution latency budgets (Principle V) — this feature adds no solver-path or Explanation-Engine work
**Constraints**: Sandbox-only verification locally (per spec Assumptions/Out of Scope); Paddle.js defaults to production unless explicitly set to sandbox (footgun called out in the epic, addressed in US10.2.5/US10.5.1); webhook idempotency and durability must exactly mirror the existing `stripe_events`-ledger dedup pattern (`server-conventions.md:928`)
**Scale/Scope**: 5 user stories (US10.1–US10.5 in the epic; mapped to this plan's phases below), ~7 frontend call sites, 3 server modules replaced, 1 additive migration, 2 new npm dependencies, 1 dependency removed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Explanation Engine as SSOT)**: N/A — this feature touches no move evaluation, pattern classification, or LLM annotation surface.
- **Principle II (Code Quality & Simplicity)**: Satisfied by design — the adapter shape is kept identical (no speculative abstraction beyond the existing 3-method interface); `paymentProcessor.js`'s two interface-touching edits (US10.2's `createCheckout` return-shape change, US10.4's de-Stripe/rename) are each scoped to exactly the lines the epic calls out, not a rewrite.
- **Principle III (Testing Standards)**: This feature has no solver-dependent surface (N/A for the "real C++ solver" sub-clause). It does require: (a) sandbox end-to-end checkout/webhook tests via `paddle:sandbox-testing` (US10.2.8, US10.3.6), and (b) a DB-failure-injection test harness for FR-009's non-2xx-on-any-processing-failure contract, since the sandbox cannot itself simulate a downstream failure (flagged as Fragile in Research §5 — addressed with a stubbed-Supabase-client unit test, not a live-sandbox test).
- **Principle IV (UX Consistency & Progressive Disclosure)**: `UpgradeModal`'s existing idle/loading/success states (FR-011) are preserved unchanged; the "activating" acknowledgment (FR-005) reuses the existing never-silently-free pattern from Epic 5 US5.3.4, now event-driven instead of polled.
- **Principle V (Performance)**: N/A for solver/heatmap budgets. The `tracks` `upgrade_completed` insert stays fire-and-forget, matching the existing constraint.
- **Principle VI (Reproduce before theorizing)**: Applied throughout — every fixture and API shape below is harvested from `stripeProcessor.js`/`stripeRoutes.js`'s actual code (cited by file:line), and Paddle-specific shapes are grounded against the `paddle-docs` MCP / `paddle:*` skills rather than assumed from training data, per CLAUDE.md § "Paddle integration".
- **Principle VII (Software Design Philosophy)**: The "one obvious way" rule motivates the route-rename and DB-identifier-rename decisions (Research §1–2) — keeping Stripe-named surfaces after Stripe is deleted would be the less-obvious, misleading path.
- **Principle VIII — Documentation (MUST check before planning)**:
  - [x] Existing architecture docs (`docs/architecture/api-conventions.md`, `server-conventions.md`, `db-schema.md`, `data-model.md`), `docs/payment_provider_research.md`, CLAUDE.md § "Paddle integration", and Epic 5 (`polish_epic.md`) were read before this plan was drafted.
  - [x] No undocumented conventions were discovered during review beyond what the epic's "Non-obvious facts" already names (e.g. the two-allowlist `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` trap, memory `project_user_column_propagation`); these are carried into the tasks below rather than re-derived.
  - [x] `tasks.md` (next command) will include explicit documentation tasks for every new architectural decision this feature introduces: rewriting `api-conventions.md`'s four Stripe sections and `server-conventions.md`'s "PaymentProcessor Seam" section (US10.4.8), and updating `db-schema.md`/`data-model.md` for the renamed columns/table (US10.4.7).

**Gate result: PASS.** No unjustified violations; Complexity Tracking is empty.

## Task-ordering corrections carried into `tasks.md` (next command)

These override the epic's (`polish_epic.md`) task-level phrasing where they conflict — this
plan's decision is authoritative for `/speckit-tasks`:

- **SDK install**: `npm install @paddle/paddle-node-sdk @paddle/paddle-js` happens inside US10.2,
  before US10.2's sandbox-checkout test task, not folded into US10.4.4 as the epic text
  currently describes. See Technical Context above and Research (npm-install-order decision).
- **Checkout→confirm wiring**: `useUpgradeCheckout.js`'s `checkout.completed` handler is the
  sole owner of `transactionId` / sole caller of `verify-transaction`; `CheckoutReturnBanner.jsx`
  is a pure renderer of `checkoutReturnFlow.js` state. See Research §11.
- **`sanitizeReturnPath` home**: stays exported from `paddleProcessor.js`; no new shared module.
  See Research §6.
- **FR-009 test design**: the DB-failure-injection unit test stubs Supabase to resolve with
  `{ error }` (matching `stripeProcessor.test.mjs`'s actual mock shape), not to reject a
  promise, and FR-009 is documented as new required behavior tightening the existing Stripe
  handler's behavior, not a mirror of it. See Research §5.

## Project Structure

### Documentation (this feature)

```text
specs/050-paddle-checkout-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── paddle-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

This is an existing web application (server + frontend split already in place under
`connect-four/`). No new top-level project is introduced; this feature edits/adds files
within the existing structure.

```text
connect-four/
├── server/
│   ├── paymentProcessor.js         # EDITED (kept) — interface typedef; two edits (US10.2.3, US10.4.2)
│   ├── paddleProcessor.js          # NEW — replaces stripeProcessor.js
│   ├── paddleRoutes.js             # NEW — replaces stripeRoutes.js
│   ├── stripeProcessor.js          # DELETED
│   ├── stripeRoutes.js             # DELETED
│   ├── userHelpers.js              # EDITED — USER_PROFILE_SELECT_COLUMNS, defaultUserProfile()
│   ├── index.js                    # EDITED — wiring block, raw-body middleware path, rate-limit path
│   ├── migrations/
│   │   └── 060_paddle_rename_and_payment_events.sql   # NEW (additive)
│   ├── paddleProcessor.test.mjs                # NEW — replaces stripeProcessor.test.mjs
│   ├── paddleRoutes.substitutability.test.mjs  # NEW — replaces stripeRoutes.substitutability.test.mjs
│   └── stripeProcessor.test.mjs, stripeRoutes.substitutability.test.mjs  # DELETED
├── tests/
│   ├── fixtures/stubProcessor.js          # kept if vendor-agnostic (confirm by reading first)
│   ├── unit/stripePrices.test.js          # DELETED → unit/paddlePrices.test.js (NEW)
│   ├── unit/stripePortalReturn.test.js    # DELETED → unit/paddlePortalReturn.test.js (NEW)
│   └── unit/checkoutReturnFlow.test.js    # EDITED IN PLACE (pure poll-state-machine logic is vendor-agnostic — confirm by reading, then adapt to the single-check states) — NOT deleted
├── src/
│   ├── lib/useUpgradeCheckout.js          # EDITED — Paddle.js overlay instead of redirect; its checkout.completed handler owns transactionId and is the sole caller of verify-transaction (Research §11)
│   ├── lib/useStripePrices.js → lib/usePaddlePrices.js  # RENAMED — hook + export renamed
│   │                                                     #   to usePaddlePrices, repointed to
│   │                                                     #   /api/paddle/config (required for the
│   │                                                     #   zero-Stripe-trace check, FR-014/SC-006;
│   │                                                     #   see tasks.md T052 — the earlier "keep
│   │                                                     #   the name, see Research §7" note here
│   │                                                     #   was a miscitation, corrected)
│   ├── lib/checkoutReturnFlow.js          # EDITED — collapse poll-schedule to single-check states; shared store written by useUpgradeCheckout.js's handler (Research §11)
│   ├── store/CheckoutReturnBanner.jsx     # EDITED — pure renderer of checkoutReturnFlow.js state; does NOT call verify-transaction itself (Research §11)
│   ├── screens/SettingsScreen.jsx         # EDITED — repoint portal fetch
│   ├── screens/PostSetSummaryScreen.jsx   # EDITED — stale comment only
│   └── components/UpgradeModal.jsx        # EDITED — import line only (usePaddlePrices rename,
│                                           #   T052/T054); onDismiss/onUpgrade/uiState/
│                                           #   onUiStateChange contract unchanged
├── package.json                     # EDITED — deps (+2 Paddle, −1 stripe), test/test:fast arrays
└── .env.example                     # EDITED — PADDLE_* vars added, STRIPE_* removed

docs/architecture/
├── api-conventions.md               # EDITED — 4 Stripe sections → Paddle contract
└── server-conventions.md            # EDITED — "PaymentProcessor Seam" section → Paddle

docs/architecture/db-schema.md, data-model.md    # EDITED — renamed columns/table

staging_checks.md                    # EDITED — new "## Epic 10 —" section (5 items, per epic)
```

**Structure Decision**: The existing `connect-four/server/` + `connect-four/src/` web-app
split is reused as-is — no new top-level project, no `backend/`/`frontend/` rename. All new
files are added beside their Stripe-era counterparts and deleted/renamed 1:1 with the files
they replace. `paddleProcessor.js`/`paddleRoutes.js` match US10.2.2's exact file names in the
epic (not the epic header's looser `paddlePaymentProcessor.js` phrasing, which the epic's own
task-level text supersedes).

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
