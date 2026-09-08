# Implementation Plan: End-to-End QA Enablement

**Branch**: `worktree-e2e-qa-enablement` | **Date**: 2026-09-08 | **Spec**: `specs/058-e2e-qa-enablement/spec.md`
**Input**: Feature specification from `specs/058-e2e-qa-enablement/spec.md` (Epic 13,
`docs/epics/e2e-qa-enablement-epic.md`)

**Note**: This plan carries every Settled decision (1–11) and Non-obvious fact (NF1–NF15) from
`spec.md` verbatim as hard constraints — see spec.md itself rather than re-quoting it wholesale
here. Design questions the spec deliberately left open are resolved in `research.md` (D1–D7),
each with a citation.

## Summary

The app cannot today be QA'd end-to-end by an autonomous agent because two journeys are
unreachable: every login CTA (no way to return to a clean signed-out state between runs) and
every payment CTA (the checkout overlay never opened locally, and there was no way to roll a
paid account back to free). This plan delivers: (1) a shared rollback module
(`server/qaAccountTools.js`) exposed as both a CLI script and a `requireLocalhost`-gated HTTP
endpoint, correctly nulling `paddle_customer_id` and canceling the Paddle sandbox subscription
via the SDK before doing so (NF1, NF14); (2) a dev-only email-seeding affordance (button +
`requireLocalhost` endpoint using `auth.admin.updateUserById`) so both checkout branches (OI-53)
are drivable; (3) three harvested-not-authored synthetic Paddle webhook fixtures plus a
re-signing sender script, closing the downgrade-lifecycle gap (NF4) without a tunnel or the
webhook simulator; (4) corrections to `.claude/skills/app-qa/references/environment.md` (NF3,
NF6, NF7) and retraction of the "Paddle does not work locally" belief in its four recorded
locations; (5) a third `qaAccountTools.js` export, `setQaAccountPaidState`, plus its
`requireLocalhost` endpoint (FR-027, added by tasks_critique B2), that sets `tier='paid'` and
`paddle_customer_id` together by user id — a DB-only rehearsal tool closing the gap neither
`resetQaAccount` (only moves toward `free`) nor `set-tier.js` (never writes
`paddle_customer_id`) can close, which the payment sweep's downgrade fixtures and the reset's own
replay coverage both depend on. No schema migration, no new environment variable, no
production-visible behavior change — every new affordance is `import.meta.env.DEV`- or
`requireLocalhost`-gated.

## Technical Context

**Language/Version**: Node.js (ESM, `"type": "module"`, `connect-four/package.json:5`), React 19
(`connect-four/package.json` dependencies).
**Primary Dependencies**: Express 5 (`server/index.js`), `@supabase/supabase-js` ^2.105.1 (DB +
auth admin API), `@paddle/paddle-node-sdk` ^3.8.0 (subscription list/cancel — SDK, never the
`paddle-sandbox` MCP, per Settled decision 11), `@paddle/paddle-js` ^1.6.4 (client-side overlay,
unchanged by this feature), chrome-devtools MCP (QA-agent browser driving, unchanged).
**Storage**: Supabase Postgres (`public.users`, `public.payment_events` — both existing, no schema
change, see data-model.md).
**Testing**: `node --test --experimental-test-module-mocks` via `npm run test:fast`
(`connect-four/package.json`'s `test:fast` script) — ESLint runs first; a lint error stops all
tests (`docs/architecture/testing-conventions.md`; CLAUDE.md §"Running tests"). New unit tests for
`qaAccountTools.js` follow the existing constructor-injection mock pattern already used by
`server/paddleProcessor.test.mjs`.
**Target Platform**: Local dev only (Node server + Vite dev server in a git worktree); no
staging/production surface added.
**Project Type**: Web application — `connect-four/server/` (Express API) + `connect-four/src/`
(React SPA), existing structure, no new top-level project.
**Performance Goals**: N/A — dev-only tooling, not a user-facing runtime path; Constitution
Principle V's latency budgets govern production request paths, none of which this feature touches
(the three new endpoints — qa-rollback, qa-set-email, qa-set-paid-state — are QA-only, never
reached outside `requireLocalhost`).
**Constraints**: Every new affordance MUST be `requireLocalhost`- or `import.meta.env.DEV`-gated
(AC7/SC-008); the reset MUST NOT introduce a server-reachable cache-invalidation call (FR-010);
Paddle SDK calls only, never the MCP server for destructive sandbox actions (Settled decision 11).
**Scale/Scope**: 4 user stories, ~7 new/modified server files (incl. `qaAccountTools.js`'s third
export and its endpoint, tasks_critique B2), 2 modified frontend files, 1 modified skill-reference
doc, 4 stale-belief retraction edits. No DB scale concerns (single QA account per run).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I (Explanation Engine)**: N/A — this feature adds no move evaluation, pattern label,
or annotation surface.

**Principle II (Code Quality & Simplicity)**: Satisfied by research.md D1 (reuse the existing
in-file `requireLocalhost`, no speculative extraction) and D2 (reuse `paddleProcessor.js`'s
constructor-injection pattern rather than inventing a new DI shape).

**Principle III (Testing Standards)**: `qaAccountTools.js`'s Paddle-SDK-dependent behavior is unit
tested with a mocked `paddleClient` (matching `paddleProcessor.test.mjs`'s existing pattern) — no
new solver-dependent code is introduced, so the "exercise the real solver, not a mock" clause does
not apply here. The QA suite itself (US1–US4's acceptance scenarios) is verified by an actual
`app-qa` browser run (manual verification clause), not by unit tests alone.

**Principle IV (UX Consistency)**: N/A — no user-facing UI change; every new control is dev-gated
and invisible in production.

**Principle V (Performance)**: N/A per Technical Context above — dev-only endpoints, not a
production request path.

**Principle VII (Design Philosophy)**: "Errors MUST NOT pass silently" is directly load-bearing
for FR-009 (webhook route already THROWS on non-duplicate ledger-insert failure,
`paddleProcessor.js:308-312` — this feature does not touch that path) and for `resetQaAccount`'s
idempotence (FR-008: a genuinely-absent subscription is a documented no-op, not a swallowed
error — distinguished from an actual Paddle API error, which still throws).

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs read before drafting this plan: `docs/architecture/api-conventions.md`
  (Access Guards §, `:145-150`), `docs/architecture/server-conventions.md` (PaymentProcessor Seam
  §, `:1312-1371`; localhost-gating §, `:1705-1716`), `docs/architecture/worktree-conventions.md`,
  `docs/deployment_steps.md` (Lifecycle + Template sections), constitution.md (this section).
- [x] No undocumented convention was discovered that needed documenting before planning could
  continue — `requireLocalhost`'s existing shape and every consumer pattern were already
  documented (or independently verified against source, see research.md D1).
- [x] `tasks.md` (produced by `/speckit-tasks`, not this plan) MUST include an explicit
  documentation task updating `docs/architecture/api-conventions.md`'s "Access Guards" section to
  list all three new endpoints (new architectural surface: three new `requireLocalhost` routes —
  the third, `qa-set-paid-state`, added by tasks_critique B2 after the initial tasks pass) and
  `docs/architecture/server-conventions.md` if `qaAccountTools.js`'s constructor-injection shape
  warrants a one-line cross-reference next to the `PaymentProcessor Seam` section it borrows from.
  This plan's Source Code file map (below) lists both docs so `/speckit-tasks` does not drop them.

## Project Structure

### Documentation (this feature)

```text
specs/058-e2e-qa-enablement/
├── plan.md              # This file
├── research.md          # Phase 0 output — D1-D7 design decisions
├── data-model.md         # Phase 1 output — users/payment_events fields, entity shapes
├── quickstart.md        # Phase 1 output — QA run commands
├── contracts/
│   └── qa-endpoints.md  # POST /api/admin/qa-rollback, POST /api/admin/qa-set-email
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this plan)
```

### Source Code (repository root)

Existing web-application structure (`connect-four/server/` API + `connect-four/src/` SPA) — no
new top-level directories.

```text
connect-four/
├── package.json                       # MODIFIED — append server/qaAccountTools.test.mjs, and any brand-new HTTP-level or webhook-signature test file T009/T017/T039 actually create, to the test:fast file list (blocking issue 3). EDIT BY HAND — the test:fast line is one ~6,887-char line with no glob; two prior agents died attempting a sub-agent exact-match edit on it (CLAUDE.md "Editing test:fast kills agents"). Do not delegate this edit.
├── server/
│   ├── index.js                       # MODIFIED — hoist `paddleClient` to module-level `let` alongside `paddlePaymentProcessor` (research.md D1a), plus THREE new requireLocalhost routes: qa-rollback, qa-set-email, qa-set-paid-state (research.md D1, contracts/qa-endpoints.md; the third added by tasks_critique B2)
│   ├── qaAccountTools.js              # NEW — resetQaAccount, setQaAccountEmail, setQaAccountPaidState (research.md D2, data-model.md; setQaAccountPaidState added by tasks_critique B2 — sets tier='paid' + paddle_customer_id together, addressed by user id, so US2's downgrade-fixture assertions and US1's replay/portal-400 coverage have a way to re-establish a known paid state that `set-tier.js` cannot provide)
│   ├── qaAccountTools.test.mjs        # NEW — unit tests for all three exports; mocked paddleClient (fake SubscriptionCollection, NOT a plain array — research.md D2) and mocked supabase (Constitution III); setQaAccountPaidState's tests need only the mocked supabase, no paddleClient mock
│   ├── userEndpoints.test.mjs         # MODIFIED (already exists, already registered in test:fast) — HTTP-level tests for POST /api/admin/qa-rollback (T009) and POST /api/admin/qa-set-paid-state (T039), following this file's existing requireLocalhost-route test convention; if either task instead creates a brand-new `.test.mjs` file, that file is NEW and MUST be registered in test:fast by hand (T009/T017/T039's own text)
│   ├── scripts/
│   │   ├── qa-rollback-cli.js         # NEW — thin CLI wrapper, requires --yes (FR-006, research.md D2)
│   │   ├── send-synthetic-webhook.js  # NEW — FR-017/FR-018 re-signing sender (research.md D4, D6)
│   │   ├── send-synthetic-webhook.test.mjs  # NEW — unit test for the signature-construction function (T017); MUST be registered in test:fast by hand (see package.json row above)
│   │   └── webhook-fixtures/
│   │       ├── README.md              # NEW — harvest source + date (research.md D5, FR-016); also records T014's past_due-harvest account choice (tasks_critique B1)
│   │       ├── subscription-updated-paused.json    # NEW — harvested fixture (FR-016)
│   │       ├── subscription-canceled.json          # NEW — harvested fixture (FR-016)
│   │       └── subscription-updated-past-due.json  # NEW — harvested fixture (FR-016)
├── src/
│   └── screens/
│       └── SettingsScreen.jsx         # MODIFIED — dev-only "Set QA email" button (research.md D3, FR-013)
docs/
├── architecture/
│   ├── api-conventions.md             # MODIFIED — document all three new endpoints, incl. qa-set-paid-state (tasks_critique B2) (Constitution VIII)
│   └── server-conventions.md          # MODIFIED — one-line cross-reference from PaymentProcessor Seam § if warranted (Constitution VIII)
├── deployment_steps.md                # MODIFIED — retract stale "Paddle does not work locally" mentions at :371,422 (FR-024; NOT a new work-queue entry, research.md D7)
├── open_issues.md                     # MODIFIED — retract stale "Paddle does not work locally" mentions at :3779, :3915, :5738 (FR-024, all three confirmed still present)
├── epics/
│   └── pre-launch-mvp-epic.md         # MODIFIED — retract stale mention at :180 (FR-024)
specs/
└── 057-mvp-launch-gate/
    ├── spec.md                        # MODIFIED — retract stale mention at :99 (FR-024)
    └── quickstart.md                  # MODIFIED — retract stale mention at :171 (FR-024)
.claude/skills/app-qa/references/
└── environment.md                     # MODIFIED — NF3 correct set-tier.js path/limitation, NF6 worktree bootstrap, NF7 rate limits, FR-025 rollback-tool docs written from the ACTUAL interface (lines currently wrong: 99, 114 — see spec.md FR-023's "verified still undone")
```

**Structure Decision**: Existing single-repo web-application layout
(`connect-four/server` + `connect-four/src`) is unchanged — this feature adds files inside it
rather than introducing a new project boundary. All doc edits are corrections to existing files;
no new `docs/` subtree.

## Deploy Prerequisites

Walked against the design above, per the mandatory checklist:

- **Schema migration** — NO. No file added under `connect-four/server/migrations/`. `users` and
  `payment_events` are read/written through existing columns only (data-model.md).
- **Data migration / backfill** — NO. Nothing changes the *meaning* of an already-stored row: no
  new enum value, no changed detector/predicate output, no renamed field, no new NOT NULL column.
  `resetQaAccount` writes `tier`/`paddle_customer_id` through the exact same columns and value
  domain `writeTier` already writes (`paddleProcessor.js:167-175`).
- **Content pools** — NO. No predicate, puzzle, or candidate-generation logic is touched.
- **Secrets / env vars** — NO new variable. `VITE_PADDLE_CLIENT_TOKEN` (client) and
  `PADDLE_NOTIFICATION_WEBHOOK_SECRET` (server) are both already present in this worktree's
  `.env.local`/`server/.env` (verified: `grep VITE_PADDLE_CLIENT_TOKEN connect-four/.env.local`
  returned `VITE_PADDLE_CLIENT_TOKEN=test_41084376a1adf4d594984744c80`) and, per the epic, already
  present on staging/production (`specs/057-mvp-launch-gate/plan.md:335`, OI-96) — this feature
  reads no env var beyond what `paddleProcessor.js`/`index.js` already read for the existing
  `/api/paddle/*` surface.
- **Caches** — NO. `explanation_cache`, TTS/audio artifacts, and i18n-keyed content are untouched.
  FR-010 explicitly forbids adding any server-reachable cache-invalidation call; the client-side
  `entitlement.js` module cache is discarded by the documented page reload, not by a new
  server-side mechanism.
- **Ordering** — N/A. No two-halves (server+frontend) release coordination is needed: all three new
  endpoints (including `qa-set-paid-state`, added by tasks_critique B2) and the
  `SettingsScreen.jsx` button ship in the same commit/branch and are dev-gated, so there is no
  window where one half exists without the other in a way a user could observe.

**Finding: NONE.** No `docs/deployment_steps.md` work-queue entry is added (per the epic's own
instruction and this walk's result). The edits to `docs/deployment_steps.md` listed in the Source
Code map above are retractions of stale prose (FR-024), not a new prerequisite — see research.md
D7 for why these must not be authored in the "Template for new entries" runbook shape.

## Complexity Tracking

*No Constitution Check violations were identified — this section is intentionally empty.*
