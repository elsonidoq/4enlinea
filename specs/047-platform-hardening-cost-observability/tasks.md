---

description: "Task list for Platform Hardening & Cost Observability (Epic 7, spec 047)"
---

# Tasks: Platform Hardening & Cost Observability

**Input**: Design documents from `/specs/047-platform-hardening-cost-observability/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/llm-call-helper.md, quickstart.md
**Epic source**: `polish_epic.md` "Epic 7 — Platform Hardening & Cost Observability" (US7.1–US7.5)

**Tests**: Regression tests are explicitly required by FR-012 (US3) and the `contracts/llm-call-helper.md`
Testability section (US5), so test tasks are included for those stories. US1/US2/US4 rely on the
manual/scripted verification in `quickstart.md` rather than new automated tests, per spec scope.

**Organization**: Tasks are grouped by user story (US1–US5, matching spec.md's numbering, which is
identical to the epic's US7.1–US7.5). US1 and US4 are fully file-disjoint from every other story. US2, US3,
and US5 each independently edit `connect-four/server/index.js` (US2: boot assertion + helmet mount; US3:
debug-endpoint + 500-handler sites; US5: the `POST /api/explain-move-llm` route's `computeMechanism` call,
T034 edit point (b)) in non-overlapping regions — see the "Parallel Opportunities" coordination note below.
Otherwise, US5 touches a new `llmChat.js`/`llmPricing.js`/`llmUsageLedger.js` triad + 3 call-site edits not
touched by any other story. All five stories can be implemented and tested independently, in any order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are relative to the repo root `/Users/elsonidoq/prog/cuatro_en_linea/` unless stated otherwise

## Path Conventions

This is a **web application monorepo**; this feature is **server-only** (no `connect-four/src/` changes
required by any FR — see plan.md "Project Structure"). All code changes live under `connect-four/server/`
and `connect-four/package.json`. New regression tests live in `connect-four/tests/unit/` — the real,
already-existing directory that holds `tests/unit/adminAuth.test.js` (NOT `connect-four/server/tests/unit/`,
which does not exist, and NOT `connect-four/server/tests/`, which holds solver-dependent reason-engine
tests). **Critically, `connect-four/package.json`'s `test`/`test:fast` scripts do NOT auto-discover files**
— each script passes `node --test` an explicit, hand-maintained list of file paths. A new test file that is
not added to that list will never run, no matter where it lives (see T002). Every task below that adds a
new test file (T011, T018, T019, T032, T037) includes a step to register it in both script lists.
Documentation changes live under `docs/architecture/`, `docs/open_issues.md`, and `staging_checks.md`
(repo root).

---

## Phase 1: Setup

**Purpose**: Establish the before/after baseline this feature's acceptance criteria compare against.

- [x] T001 [P] Run `npm audit --production` inside `connect-four/` and record the current critical/high
  vulnerability count (expected: 2 critical, 2 high per audit F1) — this is the "before" baseline that
  US1's acceptance test (spec US1 AC2, quickstart.md "US1 — Dependency vulnerabilities") compares against
  after remediation. No file changes; record the count in your working notes for the T0xx verification task.

**Checkpoint**: Baseline captured — remediation work in Phase 3 (US1) can now be verified against it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one piece of shared infrastructure multiple stories' regression tests depend on.

**⚠️ CRITICAL**: Complete before starting any story that adds a test to `connect-four/tests/unit/`
(US2, US3, US5).

- [x] T002 Confirm the real test-registration mechanism, correcting a false premise: `connect-four/
  package.json`'s `test` and `test:fast` scripts do **not** rely on `node --test`'s directory-recursion
  default — each script invokes `node --test` with an explicit, hand-maintained list of ~90 file paths
  (inspect the `"test"` and `"test:fast"` entries in `connect-four/package.json` directly; note
  `tests/unit/adminAuth.test.js` is already one of the listed paths — this is the real, existing directory
  every new test in this feature must also use, NOT `connect-four/server/tests/unit/`, which does not
  exist). A new file placed in `connect-four/tests/unit/` but never added to both lists will silently never
  execute — `npm run test:fast` will report green with no indication the file was skipped. Verify this
  end-to-end: add a trivial passing `connect-four/tests/unit/sanity.test.js`, run `npm run test:fast` and
  confirm it is **not** picked up (proving no auto-discovery), then add its path to both the `test` and
  `test:fast` script strings in `connect-four/package.json`, re-run `npm run test:fast`, confirm it now
  runs and passes, then delete the sanity file AND remove its two script-list entries before later tasks
  add real tests.

**Checkpoint**: The registration mechanism is confirmed (explicit list, not auto-discovery) and
`connect-four/tests/unit/` is confirmed as the correct, already-existing path — US2/US3/US5 test tasks can
now add real files there and register them.

---

## Phase 3: User Story 1 - Dependency vulnerability remediation (Priority: P1) 🎯 MVP

**Goal**: Zero critical/high npm vulnerabilities in the production dependency graph, without breaking the
build.

**Independent Test**: `npm audit --production` before/after comparison inside `connect-four/`, independent
of every other story (spec "Independent Test").

### Implementation for User Story 1

- [x] T003 [US1] In `connect-four/package.json`, move `"concurrently": "^9.2.1"` from `"dependencies"` to
  `"devDependencies"` (confirmed present under `dependencies`, absent from `devDependencies` per
  research.md §0) — it is a dev-only build/orchestration tool that drags in the critical `shell-quote`
  vulnerability into the production graph (FR-001).
- [x] T004 [US1] Run `npm audit fix` inside `connect-four/` to apply the non-breaking fixes for the
  remaining flagged vulnerabilities (`ws` high; `qs`, `ip-address`, `@opentelemetry/core`,
  `brace-expansion` moderate) per audit F1 (FR-002).
- [x] T005 [US1] For any vulnerability `npm audit fix` cannot resolve without a breaking major-version
  bump, add a dated entry to `docs/open_issues.md` (OI-N format, following the existing entries' "Status /
  Area / Discovered" structure) recording the package, severity, and why the breaking upgrade is deferred
  rather than forced through (FR-002, spec Assumptions).
- [x] T006 [US1] Run `npm audit --production` inside `connect-four/` and confirm 0 critical/high findings
  (compare against T001's baseline); then run `npm run test:fast` inside `connect-four/` and confirm no
  regressions from the `concurrently` re-scope + audit fixes (spec US1 AC2, AC3).
- [x] T007 [US1] In `staging_checks.md`, create the `## Epic 7 — Platform Hardening & Cost Observability
  (spec 047)` heading (following the existing per-epic heading convention used by Epic 3/5/6) and add the
  first line item under it, in the file's What/Why staging/Expected/Source + `- [ ]` checkbox format: "What:
  run `npm audit --production` against the deployed image. Why staging: the production dependency graph as
  actually built/deployed can differ from local `node_modules` resolution. Expected: 0 critical/high
  findings. Source: audit C12, spec US1 AC4, SC-001." (FR-025 — this item is live-deployment-only per spec
  Assumptions; do not mark it done from local `npm audit` evidence alone.)

**Checkpoint**: `concurrently` is a dev dependency, `npm audit --production` reports 0 critical/high
locally, `npm run test:fast` passes, and the deployed-image confirmation is queued in
`staging_checks.md` — matches polish_epic.md's US7.1 acceptance criteria (except the deployed-image leg,
which is staging-only by design).

---

## Phase 4: User Story 2 - Deploy & transport hardening (Priority: P1)

**Goal**: Production fails safe on cookie security / admin authz when misconfigured, and serves standard
security response headers, without breaking TTS audio or Google OAuth.

**Independent Test**: Inspect response headers, cookie flags, and admin-endpoint behavior for
unauthenticated requests against the live deployment, independent of every other story (spec "Independent
Test").

### Implementation for User Story 2

- [x] T008 [US2] In `connect-four/server/index.js`, add a boot-time assertion placed immediately after all
  env-file loading resolves and before `app.listen(...)`: if `process.env.NODE_ENV !== 'production'` AND
  `process.env.SUPABASE_URL` is set and does **not** contain `127.0.0.1` or `localhost`, `console.error`
  a loud, unmissable message and call `process.exit(1)` (refuse to boot). This inspects only `process.env`
  — it must **not** read any file (research.md §1 confirms this does not trigger the
  `project_boot_path_env_read_crash` trap). Local dev (`SUPABASE_URL=http://127.0.0.1:54321`) and any
  future local Supabase setup must continue to boot without `NODE_ENV=production` (FR-006, research.md §1).
- [x] T009 [US2] Add `"helmet"` as a new dependency in `connect-four/package.json` (confirmed absent per
  research.md §0) and mount it in `connect-four/server/index.js` with this exact directive set (research.md
  §2, final directive table):
  ```
  default-src 'self'
  script-src  'self'
  style-src   'self'
  img-src     'self' data:
  media-src   'self' https://<supabase-host>
  connect-src 'self'
  frame-ancestors 'none'
  base-uri    'self'
  object-src  'none'
  ```
  where `<supabase-host>` is computed once at server startup via `new URL(process.env.SUPABASE_URL).host`
  (works for both the production Supabase host and local `127.0.0.1:54321`, no env-specific branch). Set
  HSTS to `{ maxAge: 31536000, includeSubDomains: true }`; leave `X-Content-Type-Options: nosniff` and
  `Referrer-Policy` on helmet's defaults (`strict-origin-when-cross-origin`) — no custom config needed for
  those two (FR-003, FR-004).
- [x] T010 [US2] Run the FR-005 local smoke test with the CSP from T009 active on a local dev server
  (`npm run dev` inside `connect-four/`), three legs, per `contracts` decision in research.md §2: (1) TTS —
  trigger a Deep Reveal, confirm coach audio plays (validates `media-src` allows the signed Supabase
  Storage URL); (2) OAuth — complete a full Google sign-in round-trip, confirm it still succeeds (validates
  no CSP directive blocks the top-level-navigation redirect chain or the post-redirect page's script/style
  loading); (3) general click-through (Home → Board → a Deep Reveal panel) with browser DevTools console
  open, confirm zero CSP violation messages — this is also the gate for whether `style-src 'unsafe-inline'`
  is needed (ship `'self'` only, per T009, unless this leg surfaces a real violation, in which case update
  T009's directive and re-run this leg). Do not ship T009's CSP until all three legs pass. The
  error-reporting leg is **N/A** — do not add a fourth leg for it (FR-005; see T012).
- [x] T011 [P] [US2] Add regression test `connect-four/tests/unit/securityHeaders.test.js` asserting
  a request to the local Express app (helmet mounted per T009) returns `content-security-policy`,
  `strict-transport-security`, `x-content-type-options: nosniff`, and a `referrer-policy` header — this is
  the automatable subset of FR-003/SC-002 (the live-deployment confirmation is staging-only, see T014). Add
  `tests/unit/securityHeaders.test.js` to both the `test` and `test:fast` script lists in `connect-four/
  package.json` (per T002 — it will not run otherwise) and confirm it executes under `npm run test:fast`.
- [x] T012 [US2] Add a new entry to `docs/open_issues.md` (OI-N format) documenting that frontend
  `@sentry/react`'s `Sentry.init()` is never called anywhere in `connect-four/src/` (confirmed via
  repo-wide search per research.md §5), so `ErrorBoundary.jsx`'s `Sentry.captureException(...)` call is
  currently a no-op that transmits nothing — frontend error reporting is non-functional, independent of
  this feature, and this feature deliberately does not fix it (FR-005 Deferred, research.md §5).
- [x] T013 [US2] Verify (local, code-reading — no code change expected) that `cookieOpts()` in
  `connect-four/server/index.js` (currently `{ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV
  === 'production', path: '/' }`) already sets `httpOnly` and `sameSite: 'lax'` unconditionally; the
  `secure` flag's correctness in production depends on `NODE_ENV`, which is confirmed by T008's boot
  assertion and the staging cookie-inspection item in T014 (FR-007, spec US2 AC4).
- [x] T014 [US2] In `staging_checks.md` under the `## Epic 7` heading (created by T007), append these
  What/Why staging/Expected/Source line items with `- [ ]` checkboxes: (a) security headers present on a
  live response (C1, US2 AC2, SC-002); (b) HTTPS redirect (plain HTTP → 301/308) and `.env`/`.git`/source-map
  requests all return 404 (C2/C4, US2 AC5) — **FR-007 is verify-only for this feature; there is no code task
  that implements the redirect or the dotfile/source-map 404s.** If this staging check fails, the
  remediation is a follow-up code task (Express force-HTTPS redirect middleware placed behind `trust proxy
  = 1` so it reads the real `X-Forwarded-Proto`, plus a dotfile/`.map`-deny route or static-serving
  exclusion) — do not treat a failure here as merely informational; open a follow-up task/issue for the
  code fix so FR-007's MUST is not left unowned; (c) both `sb_access_token` and `sb_refresh_token` cookies
  carry `Secure; HttpOnly; SameSite=Lax` in production (C3, US2 AC4); (d) `NODE_ENV=production` is active in
  Railway (boot assertion from T008 did not fire) and unauthenticated `GET/POST /api/admin/lessons` returns
  401/403, not 200 (C5/C6, US2 AC1/AC6); (e) repeat T010's TTS + Google OAuth smoke-test legs against the
  real deployed CSP (no local-dev proxy shortcuts) (FR-005) (FR-025 — none of these five items can be
  truthfully confirmed from local dev per spec Assumptions).

**Checkpoint**: Boot-time assertion, `helmet` CSP/HSTS/headers, and the TTS+OAuth smoke test are shipped
locally; the open_issues.md Sentry backlog entry exists; the five live-only confirmations are queued in
`staging_checks.md` — matches polish_epic.md's US7.2 acceptance criteria (headers/cookies/redirect/admin-gate
lines are staging-only by design).

---

## Phase 5: User Story 3 - Admin-gate & server-response hardening (Priority: P2)

**Goal**: The localhost admin gate cannot be XFF-spoofed, server errors never leak internal detail, and the
debug endpoint validates its input like every other endpoint.

**Independent Test**: Send forged-header requests at localhost-gated admin endpoints and malformed input at
the debug endpoint, and inspect error response bodies for any endpoint made to fail, independent of every
other story (spec "Independent Test").

### Implementation for User Story 3

- [x] T015 [US3] In `connect-four/server/index.js`, replace the debug endpoint's duplicated inline
  localhost check (currently at the top of `app.post('/api/debug/classify-all', ...)`, ~lines 2779–2783:
  `const ip = req.ip || req.socket?.remoteAddress || ''; if (ip !== '127.0.0.1' && ...) return
  res.status(403)...`) with a call to the shared `requireLocalhost` middleware (defined later in the file,
  ~line 2822, but callable here because function declarations hoist) — removes duplicated logic and is the
  natural place to add T016's validation in the same edit (research.md §3, Constitution II).
- [x] T016 [US3] In the same `POST /api/debug/classify-all` handler, validate `req.body.moves` against the
  existing canonical `const MOVES_RE = /^[0-6]{0,42}$/;` (defined at `index.js:133` — reuse this constant,
  do not inline a second copy) before calling `solver.query(ms)`; return `400` with a descriptive error on
  a non-matching value instead of passing it through to the solver unchecked (FR-011, audit F8).
- [x] T017 [US3] In `connect-four/server/index.js`, audit **every** `res.status(500).json({ error:
  err.message })` / `.json({ error: e.message })` site — **all ~38 sites (research.md §0), with no
  exceptions and no narrowing to "public" endpoints.** FR-010's prose scopes to "public endpoints", but the
  resolved scope for this task is blanket/uniform: every 500 body in the file is replaced the same way,
  admin-gated or not, because a generic body costs nothing on an internal endpoint and a missed site is a
  silent regression risk. Grep `grep -c 'res.status(500).json({ error: err.message })'` + the `e.message`
  variant to enumerate them, and change each to return a generic body (e.g. `{ error: 'internal error' }`)
  to the caller, while keeping (or adding, if missing) a server-side `logError(...)` / `console.error(...)`
  call carrying the real error for operator-side debugging (FR-010, audit F5).
- [x] T018 [P] [US3] Add regression test `connect-four/tests/unit/errorResponseBody.test.js`
  asserting that a representative endpoint's forced-error 500 response body contains no raw `err.message`/
  stack text — assert the body equals/matches the generic shape from T017, not the underlying driver
  message (FR-012). Add `tests/unit/errorResponseBody.test.js` to both the `test` and `test:fast` script
  lists in `connect-four/package.json` (per T002) and confirm it executes under `npm run test:fast`.
- [x] T019 [P] [US3] Add regression test `connect-four/tests/unit/debugClassifyAllValidation.test.js`
  asserting `POST /api/debug/classify-all` with a malformed `moves` value (e.g. `"not-a-movestring"`)
  returns `400` and never reaches `solver.query` (mock/spy the solver call to assert it is not invoked)
  (FR-012). Add `tests/unit/debugClassifyAllValidation.test.js` to both the `test` and `test:fast` script
  lists in `connect-four/package.json` (per T002) and confirm it executes under `npm run test:fast`.
- [x] T020 [US3] Add a dated entry to `docs/open_issues.md` (OI-N format) for FR-009's deferred item:
  "mandatory authenticated admin session as a second factor alongside the `requireLocalhost` gate" — the
  admin gate remains localhost-only for this feature (hardened against XFF-spoofing by T015's consolidation
  onto `requireLocalhost`, which is unaffected by a spoofed header because `trust proxy = 1` derives `req.ip`
  from the trusted proxy hop, not client-supplied header content); adding a required admin session on top is
  explicitly out of scope here (spec Out of Scope, FR-009).
- [x] T021 [US3] In `staging_checks.md` under the `## Epic 7` heading, append a line item: "What:
  `curl -H 'X-Forwarded-For: 127.0.0.1' <staging-url>/api/admin/candidates` (and one other
  `requireLocalhost`-gated endpoint). Why staging: verifies `trust proxy = 1` sees only Railway's real proxy
  hop and discards a client-forged XFF value — this depends on Railway's actual edge topology, which does
  not exist in local dev. Expected: 403, never 200. Source: audit C7, spec US3 AC1." with a `- [ ]` checkbox
  (FR-025).

**Checkpoint**: The debug endpoint uses the shared `requireLocalhost` + `MOVES_RE` validation, 500 bodies
are generic everywhere, both regression tests pass under `npm run test:fast`, and the XFF-spoof live
confirmation is queued in `staging_checks.md` — matches polish_epic.md's US7.3 acceptance criteria.

---

## Phase 6: User Story 4 - Repo hygiene, secret-posture guardrails & live config verification (Priority: P2)

**Goal**: No reconnaissance-useful artifacts remain tracked in git, and the live security-relevant
configuration the audit found "sound by design" is confirmed sound in the running system.

**Independent Test**: Inspect the git-tracked file set for removed artifacts and run the audit's
live-verification checklist against the deployed system and its dashboards, independent of every other
story (spec "Independent Test").

### Implementation for User Story 4

- [x] T022 [US4] Run `git rm --cached connect-four/log` and add `log` to `connect-four/.gitignore` (the
  file's existing `*.log`/`logs` patterns do not match the literal filename `log`) so the 673 KB tracked
  dev-server log (containing user IDs/IPs, audit F6) is untracked and cannot be re-added (FR-013).
- [x] T023 [P] [US4] Run `git rm --cached` on the 3 currently-tracked `.DS_Store` files
  (`.claude/.DS_Store`, `docs/external_references/.DS_Store`, `docs/mvp/mockup/.DS_Store`) — the root
  `.gitignore` already lists `.DS_Store` (research.md §0 correction: added since the audit ran), so no
  `.gitignore` edit is needed for this half of F7, only the untracking (FR-013).
- [x] T024 [US4] Make and document a deliberate decision on whether `.claude/` (146 tracked files per
  research.md §0 — memory + skills content, recon-useful operational detail but no secrets, audit F9) stays
  tracked in git; record the decision and its rationale in `docs/architecture/server-conventions.md` (new
  short subsection, e.g. "Repo Hygiene — `.claude/` Tracking Decision") rather than leaving the status quo
  as an unexamined default (FR-014).
- [x] T025 [US4] In `docs/architecture/server-conventions.md`, record the audit's F10 positive controls as
  explicit regression guards (a checklist future feature work must not silently violate): service-role
  Supabase key stays server-only (no `createClient`/`SUPABASE_SERVICE_ROLE_KEY`/`sb_secret` under
  `connect-four/src/`); RLS stays enabled deny-by-default on every user-data/backend table, including the
  new `llm_usage` table from US5; solver invocations stay `spawn`/`spawnSync` with array args, never `shell:
  true`; no CORS middleware is added (same-origin API + SPA serving stays intact); no
  `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` is introduced under `connect-four/src/`;
  `tier` stays writable only by the Stripe webhook path; the Stripe webhook signature verification
  (`stripe.webhooks.constructEvent`) stays in place on the raw body (FR-016, quickstart.md "F10 regression
  guards").
- [x] T026 [US4] In `staging_checks.md` under the `## Epic 7` heading, append these line items (What/Why
  staging/Expected/Source + `- [ ]` checkbox each): (a) an anonymous-key data-access attempt against a
  user-data table (e.g. `blunders`) returns no rows — live RLS denial confirmed, not just configured (C8,
  US4 AC3); (b) an unsigned public URL to the private `coach-tts` audio-storage bucket returns a client
  error (C9, US4 AC3); (c) the sign-in/magic-link redirect allowlist (Supabase dashboard) contains no
  wildcard or unintended origin (C10, US4 AC3); (d) a burst of requests exceeding the configured rate limit
  from a single client address begins receiving 429 rejections, confirming the limiter sees the real client
  address behind the Railway proxy (C11, US4 AC4) (FR-025 — none confirmable from local dev per spec
  Assumptions).
- [x] T027 [US4] Add one more `staging_checks.md` line item under `## Epic 7` (or confirm it is already
  covered elsewhere) for the dashboard-only, owner-run verification: GitHub `main` branch protection is
  enabled and CI includes secret-leakage scanning (audit §6) — mark this explicitly as an owner-run,
  dashboard-side item per spec Assumptions (kind 2: "never code-addressable to begin with"), distinct from
  T026's kind-1 live-code-behavior items.

**Checkpoint**: `connect-four/log` and the 3 `.DS_Store` files are untracked and ignored, the `.claude/`
tracking decision is documented, F10 regression guards are recorded in
`docs/architecture/server-conventions.md`, and all live-config confirmations are queued in
`staging_checks.md` — matches polish_epic.md's US7.4 acceptance criteria.

---

## Phase 7: User Story 5 - LLM token/cost telemetry for OpenAI chat calls (Priority: P1)

**Goal**: Every OpenAI chat completion call across the three in-scope call sites records tokens/cost,
tagged with endpoint/user/purpose, in a durable append-only ledger.

**Independent Test**: Trigger the production deep-reveal explanation feature and the offline evaluation
script, then confirm a usage record with correct model, token counts, and cost appears for each,
independent of the four hardening stories (spec "Independent Test").

### Implementation for User Story 5

- [x] T028 [US5] Create migration `connect-four/server/migrations/056_llm_usage.sql` (next number after
  `055_stripe_events_tracks_grants.sql`) creating the `llm_usage` table per data-model.md: `id` uuid PK
  default `gen_random_uuid()`; `endpoint` text not null; `purpose` text not null; `user_id` uuid nullable
  (no FK — analytics table, matches `tracks` precedent); `model` text not null; `prompt_tokens` integer not
  null; `completion_tokens` integer not null; `total_tokens` integer not null; `cost_usd` numeric nullable;
  `created_at` timestamptz not null default `now()`. Enable RLS, deny-by-default, **no policies** (matches
  `explanation_cache`/`stripe_events` precedent — service-role client only). The migration file must
  contain **no** TRUNCATE/DELETE statement against `llm_usage`, now or ever (FR-021, US5 AC5, data-model.md).
- [x] T029 [P] [US5] Create `connect-four/server/llmPricing.js` — a version-controlled, in-repo constants
  module keyed by model id, with priced entries for at least `gpt-5.4-mini` and `gpt-5.4` (the two models
  currently configured via `OPENAI_MODEL`/`EXPLAIN_MODEL` per research.md §7); export
  `estimateCost(model, { promptTokens, completionTokens })` returning a numeric USD cost for a priced model,
  or `null` plus a `logError` warning for an unrecognized model id — never throwing (FR-020, research.md
  §7).
- [x] T030 [P] [US5] Create `connect-four/server/llmUsageLedger.js` — export
  `recordUsage({ endpoint, purpose, userId, model, usage, costUsd })` that inserts one row into `llm_usage`
  via the service-role `supabase` client (never `authClient` — see server-conventions.md "Supabase
  Two-Client Pattern"); catch and log any internal error via
  `logError('[llm-usage-ledger]', err, { endpoint, purpose })` **inside** this function so a ledger-write
  failure never propagates to the LLM caller (FR-021, data-model.md "Write path").
- [x] T031 [US5] Create `connect-four/server/llmChat.js` exporting the unified helper per
  `contracts/llm-call-helper.md`:
  `async function callOpenAIChat(prompt, { model, apiKey, endpoint, userId = null, purpose,
  maxCompletionTokens = 4000, useJsonFormat = true, fetchImpl = fetch })`. Behavior: perform the fetch
  against `https://api.openai.com/v1/chat/completions`, porting the existing
  response_format-rejection-retry-once logic verbatim from `defaultCallLLM`/`callExplainLLM`; on success,
  return `{ content, usage: { promptTokens, completionTokens, totalTokens } }` mapped from OpenAI's
  `usage.prompt_tokens`/`usage.completion_tokens`/`usage.total_tokens`, compute `costUsd` via T029's
  `estimateCost`, and fire-and-forget (not awaited) call T030's `recordUsage({ endpoint, purpose, userId,
  model, usage, costUsd })`; on failure (non-2xx or thrown), log via
  `logError('[llm-chat]', err, { endpoint, purpose, userId, model })` and re-throw, **without** calling
  `recordUsage` (no partial/fabricated row) (FR-017, FR-018, FR-022).
- [x] T032 [P] [US5] Add unit tests `connect-four/tests/unit/llmChat.test.js` injecting `fetchImpl`
  and a stub `recordUsage` (module-mock or DI, matching the `contracts/llm-call-helper.md` Testability
  section): (a) a successful call returns `{ content, usage }`; (b) `recordUsage` is called with the
  correct `costUsd` for a known model; (c) an unpriced model still produces a call to `recordUsage` with
  `costUsd: null` and a logged warning; (d) a thrown fetch error propagates to the caller and `recordUsage`
  is never called; (e) the `response_format` retry fires exactly once, not in a loop. Add
  `tests/unit/llmChat.test.js` to both the `test` and `test:fast` script lists in `connect-four/
  package.json` (per T002) and confirm it executes under `npm run test:fast`.
- [x] T033 [US5] In `connect-four/server/mechanismExplainer.mjs`, rewrite `defaultCallLLM(prompt, { model,
  apiKey })` (currently lines ~29–51, the raw `fetch` + retry logic) to become a thin wrapper: accept and
  forward `{ endpoint, userId, purpose }` in addition to `{ model, apiKey }`, and delegate to
  `callOpenAIChat(prompt, { model, apiKey, endpoint, userId, purpose })` imported from `llmChat.js` (FR-017).
  This task changes `defaultCallLLM`'s signature only — the `userId`/`endpoint`/`purpose` values it
  receives are threaded in by T034, not created here.
- [x] T034 [US5] **Both edit points required together — this is one task, not two independent ones.**
  Thread `userId` through the production deep-reveal call path so it is never silently `null`:
  (a) in `connect-four/server/mechanismExplainer.mjs`, add `userId = null` to `computeMechanism`'s
  destructured options object (currently `{ solver, model, callLLM } = {}` at `export async function
  computeMechanism(movestring, col, { solver, model, callLLM } = {})`, ~line 99) and forward it into the
  internal default-call closure (currently `const call = callLLM ?? ((p) => defaultCallLLM(p, { model,
  apiKey: process.env.OPENAI_API_KEY }))`, ~line 106) as `defaultCallLLM(p, { model, apiKey:
  process.env.OPENAI_API_KEY, endpoint: 'explain-move-llm', userId, purpose: 'deep-reveal' })`;
  (b) in `connect-four/server/index.js`, at the `POST /api/explain-move-llm` route's call to
  `computeMechanism` (currently `const result = await computeMechanism(movestring, col, { solver, model:
  process.env.OPENAI_MODEL })` at line 1083), add `userId: req.user.id` to the options object — `req.user`
  is guaranteed non-null at this point per the existing `if (!req.user) return res.status(401)...` guard at
  line 1036, so no additional null-check is needed at the call site, but `computeMechanism`'s own `userId =
  null` default from (a) must remain (it has other/test callers that don't pass one). Skipping either (a) or
  (b) leaves `userId` silently `null` for every production call with no error and no test failure unless
  T036 exists — do not mark this task done with only one half applied (FR-019, US5 AC1, contracts/
  llm-call-helper.md "userId threading").
- [x] T035 [US5] In `connect-four/server/llmCoachHelpers.js`, rewrite `callLLM(prompt)` (currently lines
  ~184–209, its own raw `fetch`) to call `callOpenAIChat(prompt, { model: process.env.OPENAI_MODEL, apiKey:
  process.env.OPENAI_API_KEY, endpoint: 'run-eval', userId: null, purpose: 'offline-eval',
  maxCompletionTokens: 400, useJsonFormat: false })` imported from `llmChat.js`; update
  `connect-four/server/scripts/run_eval.mjs`'s two call sites (lines ~212, ~235) to destructure `{ content
  }` from the new return shape instead of treating the return value as a bare string (FR-017/018/019).
- [x] T036 [US5] In `connect-four/server/scripts/compute.mjs`, delete the local `callExplainLLM` function
  (currently lines ~266–292) and its module-level `useJsonFormat` state; update `runLlm()` (currently ~line
  375, calling `raw = await callExplainLLM(prompt)`) to import `callOpenAIChat` from `../llmChat.js` and
  call `callOpenAIChat(prompt, { model, apiKey: process.env.OPENAI_API_KEY, endpoint: 'compute-eval',
  userId: null, purpose: 'offline-eval' })` directly, where `model` is the existing module-level variable
  set from `--model`/`EXPLAIN_MODEL` (FR-017/018/019).
- [x] T037 [US5] Add a regression test (extend `connect-four/server/tests/mechanismExplainer.test.mjs`,
  already registered in both script lists — preferred, no registration step needed; or, if a new file is
  used instead, it MUST be `connect-four/tests/unit/mechanismExplainerUserId.test.mjs`, registered in both
  the `test` and `test:fast` script lists in `connect-four/package.json` per T002) that injects a stub
  `callLLM` into `computeMechanism` and asserts a non-null `userId` passed into `computeMechanism`'s
  options reaches the stub's call context end-to-end — this is the only thing that would have caught T034
  being done half-way (research.md §8 explicitly warns no other test catches this).
- [x] T038 [US5] Run quickstart.md's US5 local verification: trigger `POST /api/explain-move-llm` (signed-in
  session + real board) and `node connect-four/server/scripts/compute.mjs --llm <input.jsonl>`; query
  `llm_usage` (per `reference_supabase_connection.md` inline Node script pattern — `cd connect-four`, parse
  `.env` manually, `SUPABASE_SERVICE_ROLE_KEY`) and confirm rows with `endpoint='explain-move-llm'`/
  `purpose='deep-reveal'`/model matching `OPENAI_MODEL`, and `endpoint='compute-eval'`/
  `purpose='offline-eval'`/model matching `EXPLAIN_MODEL`, both with non-null `cost_usd` (SC-006, US5 AC1–3).
- [x] T039 [US5] In `staging_checks.md` under the `## Epic 7` heading, append a line item: "What: query
  `llm_usage` row count immediately before and after a routine staging deploy. Why staging: only a real
  deploy cycle can confirm the table is never truncated/purged as a side effect of deploy tooling. Expected:
  row count after ≥ row count before (zero loss). Source: FR-021/SC-007, spec US5 AC5." with a `- [ ]`
  checkbox (FR-025).

**Checkpoint**: `llm_usage` migration applied, `llmPricing.js`/`llmUsageLedger.js`/`llmChat.js` exist and are
unit-tested, all three call sites (`mechanismExplainer.mjs`, `llmCoachHelpers.js`, `scripts/compute.mjs`)
route through `callOpenAIChat`, `userId` threading is verified end-to-end by a real test, and the
deploy-survival confirmation is queued in `staging_checks.md` — matches polish_epic.md's US7.5 acceptance
criteria.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation lockstep (Constitution Principle VIII) and a final full-suite run across every
story's changes.

- [x] T040 [P] Update `docs/architecture/data-model.md` with the new `llm_usage` table (all columns,
  nullability, RLS posture, and its append-only/never-truncated lifecycle contrasted with
  `explanation_cache`) per data-model.md (Constitution VIII, plan.md "tasks.md will include explicit
  documentation tasks").
- [x] T041 [P] Update `docs/architecture/server-conventions.md`'s "LLM Coach Helpers" section (or add one if
  it doesn't yet document this) with `callOpenAIChat`'s full contract — signature, the three call sites and
  their `{ endpoint, purpose }` context values, the `userId` threading requirement from T034, and the
  fire-and-forget `recordUsage` write path — cross-referencing `contracts/llm-call-helper.md` rather than
  duplicating it verbatim (Constitution VIII).
- [x] T042 [P] Update `docs/architecture/server-conventions.md` with the CSP directive rationale from T009
  (why each origin is/isn't included, notably the Sentry and OAuth non-requirements from research.md §2/§4/
  §5) so a future contributor doesn't re-add a speculative `connect-src` entry for dead Sentry
  configuration (Constitution VIII).
- [x] T043 Run `npm run test:fast` inside `connect-four/` once more with every story's changes applied
  together (T003–T039) and confirm a clean pass — the single full-suite gate for this feature (per
  CLAUDE.md "Running tests").
- [x] T044 Do a final read-through of `staging_checks.md`'s `## Epic 7` section (built incrementally by
  T007/T014/T021/T026/T027/T039) and confirm every live-deployment-only acceptance item from spec FR-025 is
  present with a What/Why staging/Expected/Source block and an unchecked `- [ ]` sign-off box — no item is
  simultaneously claimed as a passing local check (spec Assumptions, FR-025, SC-008).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: No dependency on Phase 1's content, but conventionally run after it. Blocks
  any task in US2/US3/US5 that adds a file under `connect-four/tests/unit/` (T011, T018, T019, T032,
  T037).
- **User Stories (Phase 3–7)**: All five are independent of each other and of Setup's T001 (only US1
  consumes T001's baseline). Any story can start once Phase 2 completes; they may be done in any order or
  in parallel.
- **Polish (Phase 8)**: Depends on whichever stories' documentation/test surface it touches — T040 depends
  on US5 (T028), T041/T042 depend on US5 (T031) and US2 (T009) respectively, T043 depends on all
  implementation tasks across every story, T044 depends on every story's `staging_checks.md` append task
  (T007, T014, T021, T026, T027, T039).

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 1 (T001). No dependency on US2–US5.
- **US2 (P1)**: Depends only on Phase 2 (T002, for T011). No dependency on US1/US3/US4/US5. T007 (created
  by US1) must exist before T014 appends to the same `## Epic 7` heading — if US2 is done before US1, T014
  creates the heading itself instead of appending to it; either order works, but only one task should
  create the heading (first one run).
- **US3 (P2)**: Depends only on Phase 2 (T002, for T018/T019). No other cross-story dependency.
- **US4 (P2)**: Fully independent of every other story.
- **US5 (P1)**: Depends only on Phase 2 (T002, for T032/T037). Fully independent of US1–US4's code changes;
  T028 (migration) has no dependency on any other story's schema.

### Within Each User Story

- US1: T003/T004 before T005/T006 (fix before verify); T007 last.
- US2: T008/T009 before T010 (assertion + CSP must exist before the smoke test); T011 can run parallel to
  T010; T012/T013 independent of the rest; T014 last.
- US3: T015 before T016 (consolidate onto shared middleware, then add validation on top of it); T017
  independent; T018/T019 after T016/T017 (tests assert the behavior those tasks implement); T020 independent;
  T021 last.
- US4: T022/T023 parallel; T024/T025 independent of each other and of T022/T023; T026/T027 last.
- US5: T028/T029/T030 parallel (independent new files) → T031 (depends on T029, T030) → T032 (tests T031) in
  parallel with T033–T036 (all depend on T031 existing) → T034 depends on T033 → T037 depends on T034 → T038
  depends on T033–T036 all being wired → T039 last.

### Parallel Opportunities

- T001 (Setup) has no story dependency and can run any time before T006.
- Within US5: T029 and T030 in parallel (different files, both feed T031); T032 in parallel with T033–T036
  once T031 exists.
- Within US4: T022 and T023 in parallel (different `git rm --cached` targets); T024 and T025 in parallel.
- Within US3: T018 and T019 in parallel (different test files) once T016/T017 land.
- Across stories: US1, US2, US3, US4, US5 can all be worked in parallel by different agents/sessions once
  Phase 2 completes (verify: US1 touches only `package.json`; US4 touches only `.gitignore` + git tracking +
  docs — both are fully file-disjoint from every other story). **US2, US3, and US5 all independently edit
  `connect-four/server/index.js`**, in three non-overlapping regions: US2 — boot assertion (T008) + helmet
  mount (T009); US3 — debug-endpoint consolidation/validation (T015/T016) + 500-handler sites (T017); US5 —
  the `POST /api/explain-move-llm` route's `computeMechanism` call (T034, edit point (b), ~line 1083). If
  any two (or all three) of US2/US3/US5 are run concurrently by different agents/sessions, coordinate to
  avoid a merge conflict even though the edited regions don't overlap. US5's other files (`llmChat.js`/
  `llmPricing.js`/`llmUsageLedger.js`, the migration, and the `mechanismExplainer.mjs`/`llmCoachHelpers.js`/
  `scripts/compute.mjs` call-site edits) are not touched by any other story.

---

## Parallel Example: User Story 5

```bash
# Launch the three new independent modules together:
Task: "Create connect-four/server/llmPricing.js per contracts/llm-call-helper.md"
Task: "Create connect-four/server/llmUsageLedger.js per data-model.md write path"
Task: "Create migration connect-four/server/migrations/056_llm_usage.sql"

# After llmChat.js (T031) exists, launch its tests alongside the three caller rewrites:
Task: "Add connect-four/tests/unit/llmChat.test.js (register in package.json test + test:fast)"
Task: "Rewrite mechanismExplainer.mjs's defaultCallLLM to wrap callOpenAIChat"
Task: "Rewrite llmCoachHelpers.js's callLLM to wrap callOpenAIChat"
Task: "Delete compute.mjs's callExplainLLM; call callOpenAIChat from runLlm()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002) — only strictly needed if US1 is followed immediately by a story
   with tests; US1 itself has no test tasks and can ship without Phase 2.
3. Complete Phase 3: User Story 1 (T003–T007).
4. **STOP and VALIDATE**: `npm audit --production` shows 0 critical/high, `npm run test:fast` passes.
5. This alone closes the highest-severity, most directly exploitable finding (audit F1) and is safe to ship
   independently of the rest of the epic.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → ship (dependency vulns closed).
3. US2 → validate (local smoke test) → ship (transport/deploy hardening; staging sign-off follows post-deploy).
4. US3 → validate (regression tests green) → ship (admin-gate + error-body hardening).
5. US4 → validate (git status clean) → ship (repo hygiene; staging sign-off follows post-deploy).
6. US5 → validate (usage rows appear with correct model/cost) → ship (cost observability live).
7. Phase 8 Polish → documentation lockstep + final full-suite run, once all desired stories are in.

Each story is independently shippable in any order; US1/US2/US5 (all P1) are the natural first wave if
sequencing by priority, with US3/US4 (P2) following.

---

## Notes

- [P] tasks touch different files and have no completed-task dependency within their phase.
- [Story] labels map every implementation/test task to its user story for traceability back to spec.md and
  polish_epic.md's US7.1–US7.5.
- FR-025's `staging_checks.md` items (T007, T014, T021, T026, T027, T039) are **not** satisfied by any local
  evidence — they are satisfied only when their checkbox is ticked post-deploy, per spec Assumptions.
- T034 (userId threading) is intentionally written as a single non-collapsible task with two named edit
  points — do not split it across two separate task-completion claims, and do not mark it done with only one
  edit applied.
- Nothing in this feature touches `connect-four/src/` (frontend) — every task operates on
  `connect-four/server/`, `connect-four/package.json`, or repo-root documentation/config files.
- Out of scope, not tasked here (per spec Out of Scope / Deferred, do not add tasks for): full pen-test;
  breaking dependency upgrades (ticketed via T005 instead); a cost-visualization dashboard UI; automated
  spend rate-limiting; the Stripe secret setup itself; Anthropic call-path telemetry; OpenAI TTS cost
  telemetry; frontend Sentry wiring (tracked via T012's backlog entry, not implemented); mandatory admin
  session as a second factor (tracked via T020's backlog entry, not implemented).
