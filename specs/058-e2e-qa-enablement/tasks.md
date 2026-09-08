# Tasks: End-to-End QA Enablement

**Input**: Design documents from `specs/058-e2e-qa-enablement/` (plan.md, spec.md, research.md,
data-model.md, contracts/qa-endpoints.md, quickstart.md) and `docs/epics/e2e-qa-enablement-epic.md`
**Branch**: `worktree-e2e-qa-enablement`

**Tests**: Included. `plan.md`'s Constitution Check (Principle III) requires unit tests for
`qaAccountTools.js`'s Paddle-SDK-dependent behavior with a mocked client, following the existing
`paddleProcessor.test.mjs` constructor-injection pattern.

**Deploy prerequisites**: **NONE** — verified against the actual design in `plan.md`'s "Deploy
Prerequisites" section (no schema migration, no backfill, no content-pool change, no new env var, no
cache invalidation, no server/frontend ordering constraint). **No task below appends a
`docs/deployment_steps.md` work-queue entry.** The two `docs/deployment_steps.md` edits that do
appear (T032) are prose *retractions* of a stale belief (FR-024, research.md D7), not a new
prerequisite entry — do not reshape them into the "Template for new entries" runbook format.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1/US2/US3/US4, matching spec.md's user stories
- File paths are exact where the design docs name them; symbol names are given alongside line
  numbers because line numbers drift (CLAUDE.md convention)

---

## Phase 1: Setup

- [ ] T001 Verify the local worktree is bootstrapped per `quickstart.md`'s Prerequisites: run
  `cd connect-four && npm install` if `node_modules` is missing, confirm
  `connect-four/.env.local` has `VITE_PADDLE_CLIENT_TOKEN=test_...` and
  `connect-four/server/.env` has `PADDLE_NOTIFICATION_WEBHOOK_SECRET` (copy both gitignored files
  from the main checkout if absent, NF6), then run `eval "$(./worktree-ports.sh)"` from the repo
  root and start the app (`npm run dev`). No file changes — this is a go/no-go gate before any
  other task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared rollback/email-seed module and its Paddle-client wiring. Both US1
(rollback) and US2 (email-seed affordance, FR-013) call into the same module
(`createQaAccountTools({ paddleClient, supabase })` returning `{ resetQaAccount,
setQaAccountEmail }`, research.md D2), so it is built once here rather than split. A third export,
`setQaAccountPaidState`, is added afterward in **Phase 2b** (tasks_critique B2) once the vacuous
downgrade-assertion problem it fixes is visible from US2's own tasks — see that phase for why it
is not folded into this one.

**⚠️ CRITICAL**: T002–T006 MUST be complete (and `test:fast` green) before any US1/US2 endpoint
task begins.

- [ ] T002 [P] In `connect-four/server/index.js`, hoist the Paddle client to module scope
  (research.md D1a, blocking issue 2): change `let paddlePaymentProcessor = null;` (currently
  near the `if (process.env.PADDLE_API_KEY) { ... }` block that also builds
  `paddleEnvironment`/`createPaddleProcessor`) to also declare `let paddleClient = null;`
  alongside it, and inside that same `if` block replace `const paddleClient = new Paddle(...)`
  with an assignment to the module-level `paddleClient` (i.e. `paddleClient = new Paddle(...)`).
  `createPaddleProcessor({ paddleClient, supabase, ... })`'s call and the values it receives are
  otherwise unchanged. Do not add a second `new Paddle(...)` construction site anywhere (rejected
  alternative in research.md D1a).
- [ ] T003 [P] Create `connect-four/server/qaAccountTools.js` exporting
  `createQaAccountTools({ paddleClient, supabase })` → `{ resetQaAccount, setQaAccountEmail }`
  (research.md D2), following `connect-four/server/paddleProcessor.js`'s constructor-injection
  header pattern:
  - `resetQaAccount({ userId })` (FR-002/003/004/005/008/009, NF14 ordering): read the target
    row's `paddle_customer_id`; if set, drain
    `paddleClient.subscriptions.list({ customerId: [paddleCustomerId] })` with
    `for await (const sub of ...)` (or repeated `collection.next()`) — **never** `await
    list()` treated as an array (research.md D2's iteration contract: `list()` is synchronous and
    returns a lazy `SubscriptionCollection`, `node_modules/@paddle/paddle-node-sdk/dist/cjs/resources/subscriptions/index.js:51-54`;
    treating the resolved value as an array silently sees zero subscriptions every time). For each
    drained subscription whose status is in `['active','trialing','past_due','paused']`, call
    `paddleClient.subscriptions.cancel(subscriptionId, { effectiveFrom: 'immediately' })`
    explicitly (omitting `effectiveFrom` defaults to next-billing-period, leaving the subscription
    `active`). Skip anything already `canceled` (gives FR-008 idempotence for free). THEN, in a
    single `supabase.from('users').update({ tier: 'free', paddle_customer_id: null }).eq('id',
    userId)`, write both fields together (NF1) — cancellation always happens before this write
    (NF14). Zero cancelable subscriptions or an already-null `paddle_customer_id` is a success
    no-op, not an error (FR-008; US1 Acceptance Scenarios 3–4). Return
    `{ reset: true, canceledSubscriptions: [<ids>] }`.
  - `setQaAccountEmail({ userId, email })` (FR-013): call
    `authClient.auth.admin.updateUserById(userId, { email, email_confirm: true })` using the
    service-role auth client already constructed in `server/index.js` for `loadUser` (reuse the
    same instance, don't construct a second one).
  - Before finalizing, verify the exact `subscriptions.list`/`subscriptions.cancel` SDK method
    names and parameter shapes against the `paddle-docs` MCP server (CLAUDE.md §"Paddle
    integration": "always check current Paddle documentation via the `paddle-docs` MCP server
    before suggesting code" — research.md D2 records the shapes above as *intent*, not yet
    MCP-confirmed).
- [ ] T004 [US1] [US2] Create `connect-four/server/qaAccountTools.test.mjs` — unit tests for both
  exports, mirroring `connect-four/server/paddleProcessor.test.mjs`'s mock-factory style (a
  `makeMockPaddle({...})` helper + a chainable mock `supabase`). **The mocked
  `paddleClient.subscriptions.list` MUST return a fake `SubscriptionCollection` object that
  exposes `next()` and/or `Symbol.asyncIterator` over its fixture rows — it MUST NOT be a plain
  array.** (research.md D2: "a plain-array mock makes both the correct code and the `await
  list()`-as-array bug pass, so it cannot fail for the right reason" — this is the exact case
  blocking issue 1 fixed.) Cover at minimum:
  - `resetQaAccount` drains a multi-page/multi-item fake collection and cancels only
    non-`canceled` subscriptions, passing `effectiveFrom: 'immediately'` on each `cancel()` call.
  - `resetQaAccount` on an account with `paddle_customer_id === null` completes without calling
    `subscriptions.list` and still returns `{ reset: true, canceledSubscriptions: [] }` (US1.4).
  - `resetQaAccount` invoked twice back-to-back (same account, no subscriptions left the second
    time) does not throw (US1.3, FR-008).
  - `resetQaAccount` calls `subscriptions.cancel` before `supabase...update` (assert call order —
    NF14).
  - `setQaAccountEmail` calls `authClient.auth.admin.updateUserById(userId, { email,
    email_confirm: true })` exactly.
  - A test asserting the *wrong* implementation (naive `const subs = await
    paddleClient.subscriptions.list(...)` then `for (const sub of subs)`) would fail against the
    fake-collection mock — confirm this by construction of the fake, not by writing a second
    "bug" test.
- [ ] T005 Append `server/qaAccountTools.test.mjs` to the `test:fast` file list in
  `connect-four/package.json`'s `"test:fast"` script value. **EDIT THIS BY HAND — do NOT delegate
  this specific edit to a sub-agent.** The `test:fast` script is a single ~6,887-character line
  listing every test file explicitly, with no glob pattern; two prior agents died attempting a
  sub-agent exact-match edit on this exact line (CLAUDE.md §"Editing test:fast kills agents" /
  memory `project_test_fast_edit_hazard`). Open `connect-four/package.json` yourself, locate the
  `"test:fast"` value, and append ` server/qaAccountTools.test.mjs` before the closing quote in
  one direct edit.
- [ ] T006 Run `cd connect-four && npm run test:fast` and confirm it is green — baseline before
  this feature was 1755 tests / 264 suites / 0 fail (orchestrator fact 4, measured 2026-09-07);
  after T002–T005 it should be that baseline plus `qaAccountTools.test.mjs`'s new tests, still 0
  fail, before any US1/US2 endpoint work begins.

**Checkpoint**: `qaAccountTools.js` is implemented, tested, and wired into `test:fast`. US1 and
US2 endpoint/UI work can now begin.

---

## Phase 2b: QA account paid-state capability (tasks_critique B2)

**Purpose**: T020's three downgrade assertions were vacuous — after the first fixture flips the
row to `free`, the second and third fixtures assert "flips to/stays free" against a row that is
already free, and nothing in the original task set could re-establish `tier='paid'` +
`paddle_customer_id` between sends (`set-tier.js` only ever writes `tier`, never
`paddle_customer_id` — verified at `connect-four/server/scripts/set-tier.js:27-28`, see the NF3
correction below). This phase adds a third `qaAccountTools.js` export that sets both fields
together, addressed by user id — reachable from the same `requireLocalhost` endpoint surface the
browser QA agent already drives, without routing through `set-tier.js` or coupling US1's
independent testability to US2's email affordance.

- [ ] T036 [P] [US1] [US2] Extend `connect-four/server/qaAccountTools.js`'s
  `createQaAccountTools({ paddleClient, supabase })` to also export a third function,
  `setQaAccountPaidState({ userId, paddleCustomerId })`: in a single
  `supabase.from('users').update({ tier: 'paid', paddle_customer_id: paddleCustomerId }).eq('id',
  userId)`, write both fields together (the same NF1 pairing discipline `resetQaAccount` already
  follows, just in the upward direction). This function does not call `paddleClient` at all — it
  exists purely to re-establish DB state a real checkout would have produced, not to perform a
  real Paddle-side action. Use the exact literal `'paid'` — **never** `'pro'` (the real tier enum
  value; several prose locations in this spec/epic say "pro", which is harmless in prose but must
  never appear in code). Depends on T003.
- [ ] T037 [P] [US1] [US2] Add unit tests for `setQaAccountPaidState` to
  `connect-four/server/qaAccountTools.test.mjs` (same file T004 created, same mocked-`supabase`
  discipline — no `paddleClient` mock is needed for this export since it never calls it). Cover:
  writes `tier` and `paddle_customer_id` in one `update()` call; a `paddleCustomerId: null` call
  writes `paddle_customer_id: null` (used by T019's portal-400 reachability recipe to produce
  `tier='paid'` + no customer id). Depends on T036, T004. No `test:fast` registration needed — this
  extends the already-registered `qaAccountTools.test.mjs` (T005), it is not a new file.
- [ ] T038 [US1] [US2] In `connect-four/server/index.js`'s admin block, register `app.post(
  '/api/admin/qa-set-paid-state', requireLocalhost, async (req, res) => { ... })`: body
  `{ userId, paddleCustomerId }` (`paddleCustomerId` may be `null`, per T037's null-case test); 400
  if `userId` is missing; **no 503 payments-not-configured check**, same reasoning as T013 — this
  route never touches `paddleClient` either; call `createQaAccountTools({ paddleClient, supabase
  }).setQaAccountPaidState({ userId, paddleCustomerId })` and respond 200
  `{ paidStateSet: true }`; 500 on a Supabase update error via `logError`. Add this endpoint to
  `contracts/qa-endpoints.md` (done by this fix pass, see the contract file). Depends on T036.
- [ ] T039 [US1] [US2] Add an HTTP-level test for `POST /api/admin/qa-set-paid-state`, in the same
  file/pattern T009 uses for `qa-rollback` (extend `server/userEndpoints.test.mjs` if that is where
  T009 landed, matching its existing registration in `test:fast` — **only** append a brand-new
  `.test.mjs` file to `connect-four/package.json`'s `test:fast` line, by hand, per T005/T009's
  warning, if this genuinely cannot be colocated). Cover: 400 on missing `userId`; 200 with
  `{ paidStateSet: true }` on success; non-localhost → 403. Depends on T038, T009.

**Checkpoint**: `qaAccountTools.js` now exposes all three operations
(`resetQaAccount`/`setQaAccountEmail`/`setQaAccountPaidState`), all tested, all wired into
`test:fast`, all reachable from `requireLocalhost` endpoints. T019/T020/T041/T042 below depend on
this checkpoint.

---

## Phase 3: User Story 1 - The QA agent resets an account to a known-free state between runs (Priority: P1) 🎯 MVP

**Goal**: A single documented action (CLI + HTTP endpoint) resets any test account's tier, Paddle
linkage, and sandbox subscription state, so run N+1 starts identical to run N (NF1, NF2, NF14).

**Independent Test**: Drive one sandbox purchase to Pro (can reuse US2's tooling once it exists,
or trigger `resetQaAccount` directly against a manually-set-up Pro test row), run the reset,
reload, confirm free-tier UI with no DevTools; repeat the purchase→reset cycle a second time and
confirm it succeeds identically (Acceptance Scenarios US1.1–4).

### Implementation for User Story 1

- [ ] T007 [US1] In `connect-four/server/index.js`'s "Admin endpoints (localhost-only)" block,
  register `app.post('/api/admin/qa-rollback', requireLocalhost, async (req, res) => { ... })`
  (contracts/qa-endpoints.md), in the same inline registration style as the existing
  `/api/admin/generate` route: body `{ userId }`; 400 `{ error: 'userId is required' }` if
  missing; 503 `{ error: 'payments not configured' }` when the module-level `paddleClient` (T002)
  is `null`, checked **before** calling `createQaAccountTools`; otherwise call
  `createQaAccountTools({ paddleClient, supabase }).resetQaAccount({ userId })` and respond 200
  with its `{ reset, canceledSubscriptions }` result; 500 with `logError` on any unexpected
  Supabase/Paddle SDK error. Depends on T002, T003.
- [ ] T008 [P] [US1] Create `connect-four/server/scripts/qa-rollback-cli.js` (research.md D2): a
  thin CLI wrapper parsing `process.argv` for a target user id and a `--yes` flag; refuses to call
  `resetQaAccount` without `--yes` present (FR-006), printing a clear message instead; on success,
  prints the canceled subscription ids. No CLI wrapper is added for `setQaAccountEmail` (Settled
  decision 9 only requires a button + endpoint for that one). Depends on T003.
- [ ] T009 [US1] Add HTTP-level tests for `POST /api/admin/qa-rollback` (following the existing
  pattern used for other `requireLocalhost` admin routes in this codebase's server test suite —
  check `server/userEndpoints.test.mjs` for the request-mocking convention before writing new
  scaffolding): 400 on missing `userId`; 503 when `paddleClient` is `null`; 200 with the expected
  body shape on success; confirm the route is registered behind `requireLocalhost` (non-localhost
  → 403, matching the existing verbatim response body). **If this task creates a brand-new
  `.test.mjs` file** (rather than extending the already-registered `server/userEndpoints.test.mjs`),
  append that file to the `test:fast` file list in `connect-four/package.json`'s `"test:fast"`
  script value yourself — **EDIT THIS BY HAND, do NOT delegate it to a sub-agent.** Same hazard as
  T005: one ~6,887-character line, no glob, two prior agents died on a sub-agent exact-match edit
  here (memory `project_test_fast_edit_hazard`). If this task instead extends
  `server/userEndpoints.test.mjs`, no registration step is needed — that file is already in
  `test:fast` — and this note is satisfied by that fact alone. Depends on T007.
- [ ] T010 [US1] Update `docs/architecture/api-conventions.md`'s "Access Guards" section (documents
  `requireLocalhost`-gated routes) to add `POST /api/admin/qa-rollback`: gate (`requireLocalhost`
  only, not `requireAdmin`), request/response shape, and the 503-when-unconfigured path
  (Constitution VIII, plan.md's mandated doc task).
- [ ] T011 [US1] If `qaAccountTools.js`'s constructor-injection shape warrants it, add a one-line
  cross-reference from `docs/architecture/server-conventions.md`'s "PaymentProcessor Seam" section
  to `qaAccountTools.js` as a second consumer of the same DI pattern (plan.md Constitution VIII
  task; research.md D2's rationale). If the existing section already generalizes cleanly to a
  second module, a single sentence addition is sufficient — do not restructure the section.
- [ ] T041 [US1] **Coverage gap 1 (tasks_critique, closes epic AC1/AC2)**: manually drive
  `resetQaAccount` against a **real** Paddle sandbox subscription — not the mocked client in T004
  — using either the CLI (T008) or the HTTP endpoint (T007). Confirm the full AC1 assertion:
  `users.tier = 'free'` AND `users.paddle_customer_id IS NULL` AND the sandbox subscription itself
  now reads `canceled` in Paddle (checked via the `paddle-sandbox` MCP server, not assumed from the
  200 response alone). Then perform the documented page reload and confirm AC2: a previously-Pro
  screen renders free-tier UI with **no DevTools intervention**. This is a checkbox task, not the
  Implementation Strategy's "STOP and VALIDATE" prose bullet, which omits the reload. Depends on
  T007, T008.
- [ ] T042 [US1] **Coverage gap 2 (tasks_critique, closes US1 Acceptance Scenario 5)**: after a
  reset (T041 or a fresh `resetQaAccount` call), `paddle_customer_id` is `NULL` — re-sending a
  harvested fixture against it would match zero `users` rows and pass **silently** (NF11), proving
  nothing. So first call T038's `setQaAccountPaidState` to re-link the account (`tier='paid'` +
  a real `paddle_customer_id`), THEN re-send one of T020's harvested fixtures via
  `send-synthetic-webhook.js` (T016) with a **freshly-stamped `event_id`** (not the one already
  consumed in T020/T021) and confirm it succeeds and applies the expected tier effect — proving
  replayability comes from the fresh `event_id`, not from the reset having deleted anything in
  `payment_events` (NF15 — the reset never touches that table). Depends on T016, T020, T038, T041.

**Checkpoint**: US1 is independently testable — rollback via CLI or HTTP endpoint, idempotent,
correctly ordered (list-before-null), documented, and verified end-to-end against a real Paddle
sandbox subscription (not just the mocked unit tests).

---

## Phase 4: User Story 2 - The QA agent drives every payment CTA and the full downgrade lifecycle (Priority: P1)

**Goal**: All 5 checkout CTAs open the sandbox overlay; at least one completes a real sandbox
purchase satisfying Settled decision 3's assertion verbatim; both checkout branches (no-email,
email-bearing) are exercised; the billing portal is reached; all three downgrade transitions are
verified via locally-signed, harvested-not-authored synthetic webhook events.

**Independent Test**: Open each of the 5 checkout call sites (NF8) in turn, complete at least one
real sandbox transaction, confirm the in-place upgrade assertion, reach `/api/paddle/portal`, then
separately POST three harvested-and-resigned synthetic webhook events and confirm each produces
its documented tier effect (Acceptance Scenarios US2.1–10).

### Implementation for User Story 2

- [ ] T012 [US2] In `connect-four/src/screens/SettingsScreen.jsx`, add a dev-only "Set QA email"
  button next to the existing `🛠 Dev: clear IndexedDB & sign out` button (`:330`), gated by the
  same `import.meta.env.DEV &&` pattern (research.md D3), that POSTs to
  `/api/admin/qa-set-email` with `{ userId: <current session's user id>, email: <a fixed QA
  address, e.g. prompted or hardcoded 'qa-agent@example.test'> }` and reports success/failure
  inline (reuse `handleDevReset`'s `fetch(...)` scaffolding in the same file as a starting point).
  Depends on T013 existing (or can be developed in parallel and wired once T013 lands).
- [ ] T013 [US2] In `connect-four/server/index.js`'s admin block, register `app.post(
  '/api/admin/qa-set-email', requireLocalhost, async (req, res) => { ... })`
  (contracts/qa-endpoints.md): body `{ userId, email }`; 400 if either is missing; **no 503
  payments-not-configured check** — `setQaAccountEmail` never touches `paddleClient`, and the
  contract that previously required this route to share `qa-rollback`'s 503 pre-check was itself
  wrong (tasks_critique D2, amended in `contracts/qa-endpoints.md`); call
  `createQaAccountTools({ paddleClient, supabase }).setQaAccountEmail({ userId, email })` directly
  and respond 200 `{ emailSet: true }`; 500 on `updateUserById` failure via `logError`. Depends on
  T002, T003.
- [ ] T014 [US2] Harvest source task (FR-016, Settled decision 8's harvesting mechanics — this MUST
  run before T015/T016, and now MUST run **after** T018's single completed sandbox transaction,
  tasks_critique B1). **Reorder note**: T014 no longer drives its own first purchase — it reuses
  T018's, so that the payment sweep's one successful purchase is both the first payment action on
  the account and the harvest source. This closes NF1's exact failure mode: if a harvest-only
  purchase established `paddle_customer_id` before T018's sweep purchase ran, T018's transaction
  would be silently `securityRejected` (differing customer id) and the sweep would report "payment
  is broken" while the app is fine. Using the Paddle sandbox, against the subscription T018 just
  created: (a) pause that subscription via the Paddle API; (b) cancel that subscription via the
  Paddle API. Both fall under Settled decision 11's narrow sandbox-only exception — do not widen
  it. (c) For `past_due`: pausing/canceling in (a)/(b) leaves no live subscription to dun, so this
  needs a **second, independent** sandbox checkout paid with the documented dunning test card
  `4000 0027 6000 3184` (`.claude/skills/app-qa/references/environment.md:116`) — this second
  checkout is a harvest-only action and does not need to land on the same QA account T018/T020 use
  (its resulting `customerId`/`id` are substituted away by `send-synthetic-webhook.js` anyway, per
  the closed allowlist in T016). If, for any reason, the past_due drive is performed on the SAME
  account instead (e.g. because a fresh throwaway sandbox identity isn't practical), restore that
  account's DB row to a known paid state afterward via T038's `POST /api/admin/qa-set-paid-state`
  (`setQaAccountPaidState`, Phase 2b) rather than interleaving a reset — Settled decision 10
  forbids a reset inside the payment sweep. State in the README (below) which of the two options
  was taken. Then pull the three resulting notification-log payloads **separately** via the
  `paddle-sandbox` MCP server (search / execute tools) — a completed purchase alone
  (`transaction.completed` + `subscription.created`) is explicitly NOT a sufficient harvest source
  for any of the three downgrade transitions. **Inspect the raw harvested JSON's top-level and
  `data.*` key casing (snake_case vs. the SDK's camelCase accessor names) and record which it is**
  — this is research.md D4's explicitly open item; determine it here by inspection, do not assume
  either casing. Write `connect-four/server/scripts/webhook-fixtures/README.md` recording the
  harvest method, date, the observed key casing, and the past_due account choice above. Depends on
  T018.
- [ ] T015 [US2] Save the three harvested payloads verbatim as
  `connect-four/server/scripts/webhook-fixtures/subscription-updated-paused.json`,
  `subscription-canceled.json`, and `subscription-updated-past-due.json` (research.md D5; names
  track the exact `event_type` + trigger). Depends on T014.
- [ ] T016 [US2] Create `connect-four/server/scripts/send-synthetic-webhook.js` (research.md D6):
  a CLI script taking `--fixture <name> --customer-id <paddleCustomerId>` (plus whatever
  subscription-id argument the harvested fixture's substitution point needs). It must: load the
  named fixture, substitute **only** the closed allowlist —`data.customerId`, `data.id`,
  `event_id`, `occurred_at` — using the exact key names/casing recorded in T014's README (`data.status`
  is explicitly NOT substitutable, FR-017); re-stamp a fresh `event_id` on every invocation (NF12);
  serialize to the exact raw body string that will be sent (no re-serialization after signing);
  compute `Paddle-Signature: ts=<nowUnixSeconds>;h1=<hex hmac-sha256(PADDLE_NOTIFICATION_WEBHOOK_SECRET,
  \`${ts}:${rawBodyString}\`)>` at send time (research.md D4, matching
  `node_modules/@paddle/paddle-node-sdk/.../webhooks-validator.js`'s `MAX_VALID_TIME_DIFFERENCE =
  5` second window — the whole compute-and-send must complete within ~5s); POST the header + raw
  body to `POST /api/paddle/webhook` on `$API_PORT`. No tunnel, no webhook simulator (FR-019).
  Depends on T015.
- [ ] T017 [P] [US2] Add a unit test (e.g.
  `connect-four/server/scripts/send-synthetic-webhook.test.mjs`, or colocated per this codebase's
  existing script-testing convention if one exists — check first) for the signature-construction
  function in isolation: given a fixed secret, timestamp, and raw body, assert the header string
  matches `ts=<ts>;h1=<hex>` with the HMAC computed over `` `${ts}:${rawBody}` ``. **This creates a
  brand-new `.test.mjs` file** (`send-synthetic-webhook.test.mjs`, unless an existing colocated
  script-test file is found to extend instead) — append it to the `test:fast` file list in
  `connect-four/package.json`'s `"test:fast"` script value yourself. **EDIT THIS BY HAND — do NOT
  delegate this specific edit to a sub-agent.** Same one ~6,887-character no-glob line as T005/T009;
  two prior agents died on a sub-agent exact-match edit here (memory
  `project_test_fast_edit_hazard`). Depends on T016.
- [ ] T018 [US2] Manually drive all 5 checkout CTAs (NF8: `SettingsScreen.jsx:47`,
  `SetPickerScreen.jsx:46`, `SagaScreen.jsx:154`, `PostSetSummaryScreen.jsx:22`, `PricingScreen`
  via `screenRegistry.jsx:44`) using the chrome-devtools MCP / app-qa browser-driving pattern:
  confirm the Paddle sandbox overlay opens from each one (FR-011, US2.1). With the default
  anonymous (no-email) QA account, confirm `Paddle.Checkout.open()` is called without a `customer`
  field and the overlay still opens (FR-014 no-email branch, US2.3, OI-53). Complete at least one
  full sandbox transaction with a Paddle sandbox test card and verify Settled decision 3's
  assertion **verbatim**: the overlay closes, the user remains on the exact screen whose CTA was
  clicked, `CheckoutReturnBanner` transitions `confirming → activated`, and that screen re-renders
  Pro without a manual reload (FR-012, US2.2). Then use T012's "Set QA email" affordance on the
  same (now-purchased, per Settled decision 10) account, open a checkout CTA again, and confirm
  `Paddle.Checkout.open()` is called with a `customer` field populated from that email (FR-014
  email-bearing branch, US2.4, closing OI-53's other branch). Do not reset the account between
  these checks — Settled decision 10 requires one account across this entire sweep so the
  second-payment security check (NF1) is genuinely exercised. **This task's single completed
  transaction is T014's harvest source (tasks_critique B1) — T014 depends on this task completing
  first; do not let T014 run ahead of it or drive its own independent purchase.** Depends on T012,
  T013, and (for the overlay itself) T001's bootstrapped environment.
- [ ] T019 [US2] Manually reach the billing-portal entry point from the purchased account
  (`paddle_customer_id` populated) and confirm `POST /api/paddle/portal` (NF9) returns a usable
  portal session (US2.5, FR-015). Separately, reach the 400 path (US2.6) via the **reachability
  recipe** (tasks_critique D1: the paid-tier gate on the portal button makes this state otherwise
  unreachable by normal use): call T038's `POST /api/admin/qa-set-paid-state` with
  `{ userId, paddleCustomerId: null }` to put the row in `tier='paid'` + no `paddle_customer_id`,
  reload, then click the portal button and confirm the resulting 400 renders a sensible UI state.
  **This task is verification only — no frontend or backend code change is authorized here.** The
  sensible-error UI already exists: `SettingsScreen.jsx:83` sets a `portalError` flag on any
  non-OK response and `:501-503` renders the localized `settings.portalError` string — cite this
  handler rather than filing a false "dead button" bug; AC3's portal clause is already satisfied
  in code. If the rendered state is nonetheless wrong once actually observed, record that as a QA
  finding/OI entry, not a fix in this feature (Out of Scope: "Fixing bugs the QA run discovers").
  Depends on T018, T038.
- [ ] T020 [US2] Using `send-synthetic-webhook.js` (T016) against the same persisted payment-sweep
  account (Settled decision 10), **re-establish `tier='paid'` + the matching `paddle_customer_id`
  via T038's `setQaAccountPaidState` immediately before each of the three sends** (tasks_critique
  B2 — without this, the first fixture already flips the row to `free` and the second/third
  assertions pass vacuously against an already-free row with no tool able to restore paid state;
  `set-tier.js` cannot — it writes `tier` only, never `paddle_customer_id`,
  `connect-four/server/scripts/set-tier.js:27-28`). For each of the three re-signed fixtures, in
  turn: (1) call `setQaAccountPaidState` to set `tier='paid'` + the account's real
  `paddle_customer_id`; (2) send the fixture; (3) assert the documented effect against the `users`
  row: `subscription-updated-paused` → `users.tier = 'free'` (US2.7); `subscription-canceled` →
  `users.tier = 'free'` (US2.8); `subscription-updated-past-due` → **no write** — assert the row is
  still `tier='paid'` with the customer id unchanged (US2.9, NF4's documented no-write branch —
  this is the only form of that assertion that can fail; "no write to `users`" alone is
  indistinguishable from a free row that was never touched). Depends on T015, T016, T038.
- [ ] T021 [US2] Re-send the same synthetic event from T020 a second time with an unmodified
  `event_id` and confirm the route responds without applying a second tier write (NF12,
  duplicate-suppression, US2.10) — this is expected behavior to confirm, not a defect to fix.
  Depends on T020.
- [ ] T022 [US2] Update `docs/architecture/api-conventions.md`'s "Access Guards" section to add
  `POST /api/admin/qa-set-email` (gate, request/response shape; **no** 503 payments-not-configured
  path — T013/D2 fixed the contract to scope that check to `qa-rollback` only) and
  `POST /api/admin/qa-set-paid-state` (T038: gate, request/response shape, also no 503 check),
  alongside T010's `qa-rollback` row in the same section (Constitution VIII). Depends on T013, T038.

**Checkpoint**: US1 and US2 together deliver the epic's primary diagnosis — every payment CTA and
the full downgrade lifecycle are drivable and repeatable.

---

## Phase 5: User Story 3 - The QA agent drives every login CTA through both exits from a clean state (Priority: P2)

**Goal**: All 6 AuthModal CTAs are driven from a clean, reset state through both the dismiss exit
and the complete (`🛠 Dev: skip auth`) exit.

**Independent Test**: Perform the documented reset, then for each of the 6 AuthModal call sites in
turn: open the modal, dismiss it and confirm return-to-origin, reopen and complete `🛠 Dev: skip
auth`, confirm the CTA's promised destination (Acceptance Scenarios US3.1–4).

### Implementation for User Story 3

- [ ] T023 [US3] Manually drive all 6 `AuthModal` call sites (NF8: `HomeScreen.jsx:156`,
  `StatsScreen.jsx:169`, `SagaScreen.jsx:329`, `MistakeDetailScreen.jsx:551`,
  `OnboardingMissionScreen.jsx:111`, `OnboardingImportOfferScreen.jsx:119`) using the
  chrome-devtools MCP / app-qa browser-driving pattern. Before **each** CTA, run the documented
  reset (`🛠 Dev: clear IndexedDB & sign out`, Settled decision 4 — never bare `signOut()`, which
  leaves storage intact). For each CTA: open the modal and confirm it opens (US3.1); dismiss it
  and confirm the app returns to the exact origin screen with no stranded state (US3.2); reopen it
  and complete `🛠 Dev: skip auth`, confirming the app lands on the destination that CTA promised
  (US3.3) and that the resulting session is anonymous, no-email, free-tier (Settled decision 2,
  US3.4) — never full identity or account linking. No Google OAuth test tooling is built or
  exercised (FR-022, Settled decision 1). This task requires no new code — it exercises T001's
  environment plus the already-universal `AuthModal`/dev-skip-auth affordance (Evidence 5). This
  task is independent of US1/US2 (US3 only depends on the Foundational phase's reset tooling
  indirectly via the documented dev-reset, which is pre-existing, not new).

**Checkpoint**: All 6 login CTAs verified as a set, both exits, from a clean state each time.

---

## Phase 6: User Story 4 - The founder can trust the QA harness's own documentation (Priority: P3)

**Goal**: Every stale or wrong fact in `.claude/skills/app-qa/references/environment.md` and the
seven "Paddle does not work locally" locations is corrected.

**Independent Test**: Read `environment.md` and each of the retracted locations; confirm each
states the now-current, verified fact (Acceptance Scenarios US4.1–5).

### Implementation for User Story 4

- [ ] T024 [P] [US4] In `.claude/skills/app-qa/references/environment.md`, correct NF3 (as amended
  2026-09-08, tasks_critique B2): fix the `set-tier.js` path (currently wrong at the file's
  `set-tier.js`-referencing lines, ~99 and ~114) to `connect-four/server/scripts/set-tier.js`, and
  state its limitation accurately — the email lookup **works** once Settled decision 9's affordance
  has seeded an email on the anonymous dev-skip-auth user (so "unusable for the anonymous user" is
  only true before an email is seeded), but its only write is `.from('users').update({ tier })`
  (`set-tier.js:27-28`) — it can **never** restore `paddle_customer_id`, so it cannot re-establish a
  paid state the downgrade fixtures (T020) or a post-reset replay (T042) can act on. Point to
  `setQaAccountPaidState` (T036/T038) as the tool that closes that gap (FR-023, FR-027).
- [ ] T025 [P] [US4] In the same file, add a "Worktree bootstrap" section documenting NF6: a fresh
  worktree has no `node_modules` (`npm install` required) and no `.env`/`.env.local` files
  (gitignored — must be copied from the main checkout), matching `quickstart.md`'s Prerequisites
  (FR-023).
- [ ] T026 [P] [US4] In the same file, add a "Rate limits" section documenting NF7: 120 req/min per
  IP, shared with the browser QA session; a 429 response is **plain text**, which surfaces as an
  opaque JSON-decode error with no server log line — so an agent recognizes the failure mode
  instead of misreading it as a JSON bug (FR-023).
- [ ] T027 [US4] Rewrite `environment.md`'s rollback-tool documentation (FR-025) from the actual
  interface built in T007/T008 (CLI flags, HTTP endpoint request/response shape) and T012/T013
  (the email-seed button/endpoint) — not a pre-implementation guess. Depends on T007, T008, T012,
  T013.
- [ ] T028 [US4] Retract the "Paddle does not work locally" belief at **all three** locations in
  `docs/open_issues.md`: `:3779` (the primary claim — "owner-confirmed: Paddle does not work
  locally"), `:3915` (FR-016 follow-up mention), and `:5738` ("It could not be confirmed against a
  real rejection locally because `VITE_PADDLE_CLIENT_TOKEN` is unset"). Each must state instead
  that the sandbox checkout overlay works locally once `VITE_PADDLE_CLIENT_TOKEN` is configured
  (FR-024). Do this as one pass over the one file so all three edits land together.
- [ ] T029 [P] [US4] Retract the same belief at `specs/057-mvp-launch-gate/spec.md:99`
  ("`VITE_PADDLE_CLIENT_TOKEN` is unset locally (owner-confirmed) — Paddle does not work locally;
  the sandbox end-to-end transaction check can only run on staging") (FR-024).
- [ ] T030 [P] [US4] Retract the same belief at `docs/epics/pre-launch-mvp-epic.md:180`
  ("OI-96 records the owner's confirmation that `VITE_PADDLE_CLIENT_TOKEN` is unset — Paddle does
  not work locally") (FR-024).
- [ ] T031 [P] [US4] Retract the same belief at `specs/057-mvp-launch-gate/quickstart.md:171`
  ("FR-016's real Paddle sandbox transaction ... `VITE_PADDLE_CLIENT_TOKEN` is unset locally")
  (FR-024).
- [ ] T032 [P] [US4] Retract the consequential mentions at `docs/deployment_steps.md:371,422`
  ("no `VITE_PADDLE_CLIENT_TOKEN` locally, so this cannot be exercised in this environment" and
  "a live transaction is not exercisable locally — `VITE_PADDLE_CLIENT_TOKEN` is unset"). **This
  is a prose correction inside existing entries, NOT a new entry under the file's "Template for
  new entries" format** (research.md D7) — do not add a Status/When/Blocks/Applies-to/Run-it/
  Verify/Roll-back block; edit the sentences in place (FR-024).

**Checkpoint**: The harness's own documentation is true; no stale fact from NF3/NF6/NF7 or the
"Paddle does not work locally" belief remains anywhere in scope.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 Re-run `cd connect-four && npm run test:fast` and confirm it is still green after all
  implementation tasks (T002–T032, T036–T042) — baseline 1755/264/0-fail plus
  `qaAccountTools.test.mjs`'s new tests (T004, T037) and any brand-new `.test.mjs` file actually
  added and registered by T009/T017/T039 (per each task's own registration step — verify each one
  really did append to `test:fast` if it created a new file, rather than assuming it), still 0
  fail (SC-007, AC7).
- [ ] T034 Walk `quickstart.md` top to bottom as a final integration smoke test: worktree
  bootstrap, start the app, run `/app-qa tier-journey` (or the equivalent single documented
  command per AC5 — no new command is created for this, the app-qa skill already accepts a
  `tier-journey` area argument), reset via CLI and via the HTTP endpoint, drive the downgrade
  lifecycle via `send-synthetic-webhook.js`, set an email via the dev-only affordance, and
  re-establish a paid state via `setQaAccountPaidState` — confirm every command in the doc works
  exactly as written.
- [ ] T035 Confirm every new affordance added by this feature (all three new endpoints, the
  `SettingsScreen.jsx` button, the CLI scripts) is gated by `requireLocalhost` or
  `import.meta.env.DEV` and does not change any production-visible behavior (AC7, SC-008) — spot
  check by grepping the diff for the three new routes and the new button's JSX guard.

**Architecture documentation** (Constitution Principle VIII): already satisfied inline —
`docs/architecture/api-conventions.md` (T010, T022) and `docs/architecture/server-conventions.md`
(T011). No `data-model.md`/`frontend-conventions.md`/`testing-conventions.md`/`contracts/` update
is needed beyond what `specs/058-e2e-qa-enablement/` itself already carries (no schema change, no
new frontend convention, no new testing convention beyond the existing constructor-injection
pattern already documented via T011). No `docs/deployment_steps.md` work-queue entry is added
(see the Deploy Prerequisites note at the top of this file).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: No dependencies.
- **Foundational (T002–T006)**: Depends on T001. BLOCKS all of US1 and US2 (both consume
  `qaAccountTools.js`). Does NOT block US3 or US4, which have no dependency on the rollback/email
  module.
- **Phase 2b — QA account paid-state capability (T036–T039)**: Depends on Foundational
  (specifically T003, T004, T005). BLOCKS T019, T020, T041, T042, and T022's doc row for
  `qa-set-paid-state`. Does not block T007–T012/T013/T014–T018/T023 — those do not consume
  `setQaAccountPaidState`.
- **US1 (T007–T011, T041, T042)**: T007–T011 depend on Foundational (T002, T003 specifically).
  T041 depends on T007, T008. T042 depends on T016, T020, T038, T041 — it is a US1 acceptance
  scenario but its mechanics require US2's synthetic-webhook tooling and Phase 2b's capability, so
  it cannot execute until both of those exist.
- **US2 (T012–T022)**: T012, T013 depend on Foundational (T002, T003). T014 depends on **T018**
  (tasks_critique B1 — reversed from the original draft, which had T014 running ahead of T018 and
  reproducing NF1's exact failure mode; see T014/T018's own text for the mechanism). T015 depends
  on T014. T016 depends on T015. T017 depends on T016. T018 depends on T012, T013, T001 — **not**
  on T014. T019 depends on T018, **T038**. T020 depends on T015, T016, **T038**. T021 depends on
  T020. T022 depends on T013, **T038**.
- **US3 (T023)**: Depends only on T001 (environment bootstrap) — independent of
  Foundational/Phase 2b/US1/US2.
- **US4 (T024–T032)**: T024–T026, T028–T032 depend only on T001 (they edit existing docs/prose).
  T027 depends on T007, T008, T012, T013 (US1's and US2's actual interfaces).
- **Polish (T033–T035)**: Depends on all prior phases desired for this release, including Phase 2b
  and T036–T042.

### The critical ordering invariant (tasks_critique B1 — read before executing US2)

T018's single completed sandbox transaction MUST be the first payment action taken against the
payment-sweep account, and MUST precede T014. The dependency edges above encode this as **T014
depends on T018** (not the reverse, and not independent). If this edge is violated — if any
harvest-only purchase establishes `paddle_customer_id` on the account before T018's transaction
runs — `paddleProcessor.js`'s NF1 security check silently rejects T018's transaction (differing
customer id), and the sweep reports "payment is broken" while the app is fine. Do not reorder T014
ahead of T018 to "get the fixtures ready early"; the fixtures are not needed until T015/T016/T020,
all of which are already downstream of T014.

### Parallel Opportunities

- Foundational: T002 and T003 (different files) can run in parallel.
- Phase 2b: T036 and T037 depend on T003/T004 but not on each other's completion in a strict
  sense — T037 tests T036's code, so in practice write T036 first, but both are small enough to
  treat as one unit; T038 (endpoint) can start once T036 lands, in parallel with T037.
- US1: T008 (CLI wrapper) can run in parallel with T007 (endpoint) once T003 lands — both consume
  `qaAccountTools.js` but write to different files.
- US4: T024, T025, T026 (same file, but non-overlapping sections) and T029, T030, T031, T032
  (four different files) are all parallelizable; T028 touches a single file (`open_issues.md`) at
  three locations and should be done as one pass, not three parallel edits, to avoid clobbering.
- US3 (T023) can proceed at any point in parallel with all of US1/US2/US4's work, once T001 is
  done — it shares no files with any other task in this list.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 (Setup) → T002–T006 (Foundational) → T036–T039 (Phase 2b) → T007–T011 (US1) → T041, T042.
2. **STOP and VALIDATE**: T041 IS this validation step (a checkbox task, not prose) — drive
   `resetQaAccount` against a real Paddle sandbox subscription via the CLI and the endpoint;
   confirm idempotence, NF1/NF14 ordering, and the post-reload AC2 assertion. T042 additionally
   validates replayability (US1 Acceptance Scenario 5) using T038's `setQaAccountPaidState` to
   re-link the account before re-sending a fixture with a fresh `event_id`.

### Incremental Delivery

1. Setup + Foundational → rollback/email-seed module ready.
2. Phase 2b → the paid-state re-establishment capability exists, unblocking T019/T020/T041/T042
   before they are reached.
3. Add US1 (T007–T011, T041, T042) → validate independently → the highest-risk fact in the epic
   (NF1) is now closed, verified against a real sandbox subscription, not just mocked unit tests.
4. Add US2 (T012–T022) → validate independently → the epic's primary diagnosis (every payment CTA
   + downgrade lifecycle) is closed; this is the largest phase and depends on a live Paddle
   sandbox harvest pass (T014) that cannot be parallelized away, and which itself now depends on
   T018 running first (see the critical ordering invariant above).
5. Add US3 → validate independently → login CTAs verified as a set. Can be pulled forward and done
   in parallel with US1/US2 by a second agent/session since it shares no files.
6. Add US4 → validate independently → harness documentation is trustworthy. T027 must wait for
   US1/US2's actual interfaces; the rest of US4 can be done anytime after T001.
7. Polish (T033–T035) once all four stories and Phase 2b are complete.
