# tasks_critique output (abridged to the actionable findings)

## B1. The payment sweep's account choreography is unspecified, and the numeric order triggers NF1

T014 (harvest, tasks.md:204) drives a REAL sandbox purchase, then pauses/cancels and drives
`past_due` with the dunning card (which needs a live subscription paid with a different card — a
SECOND checkout). T018 (tasks.md:241) then drives the 5 checkout CTAs and requires one full
successful purchase on the SAME account. **T018 does not declare a dependency on T014** (its stated
deps are T012, T013, T001), yet T014 sits earlier in the file and is marked "MUST run before
T015/T016".

`paddleProcessor.js` rejects any later `transaction.completed` whose app user already has an
established, differing `paddle_customer_id` — logs, returns `securityRejected`, skips the tier write
(NF1). So if T014 runs first and establishes a customer id, T018's purchase is SILENTLY rejected and
the QA run reports "payment is broken" while the app is fine. NF1's exact failure mode, reproduced
inside the task list meant to close it.

**Fix**: make T018's successful purchase the FIRST payment action and the harvest source; reorder so
T018 (or at least its single completed transaction) precedes T014; have T014 harvest
`paused`/`canceled` from THAT subscription; state explicitly what happens for the `past_due` harvest
(which needs a second checkout). Add the dependency edge to the **Dependencies & Execution Order**
section — the invariant must live there, not only in T018's prose.

## B2. T020's three downgrade assertions go vacuous after the first, and nothing can restore paid state

`writeTier` keys subscription-event writes on `paddle_customer_id`; the mapping is
`paused -> free`, `canceled -> free`, `past_due -> no write`. T020 (tasks.md:265) posts each fixture
"in turn". The first (`paused`) already sets tier free. The second (`canceled`) then asserts "flips
to free" on an already-free row — passes without proving anything. The third (`past_due` -> no
write) is indistinguishable from writing `free` onto a free row. Two of three acceptance scenarios
(US2.8, US2.9 / AC3a) become tests that cannot fail for the right reason.

No tool can fix it. Re-establishing paid state needs `tier='paid'` AND a matching
`paddle_customer_id`. The feature builds only the downward path. `set-tier.js` cannot: it looks up
by email and, verified at source, updates **only** `tier` — never `paddle_customer_id`. T020's
declared deps are T015/T016 only, not T018, so it can legally run against a reset account whose
`paddle_customer_id` is NULL, where every fixture updates zero rows and Supabase returns no error
(NF11) — three green vacuous passes.

Same missing capability silently blocks the Implementation Strategy's "manually-set-up Pro test row"
(tasks.md:428) and T019's contrived `tier='paid'` + `paddle_customer_id=NULL` state.

**Fix**: add a task providing a "set QA account state" capability; reference it from T019, T020 and
the Implementation Strategy validate step. Rewrite T020 to re-establish `tier='paid'` + the matching
customer id before EACH of the three sends, and to assert `past_due` leaves the row **still paid** —
the only form of that assertion that can fail.

## B3. Two of the three new test files are never registered in `test:fast`

`test:fast` is one 6,887-char line enumerating every test file, **no glob** (verified:
`s.includes('*') === false`). T005 (tasks.md:109) appends exactly one file. But T009 creates
HTTP-level tests for `POST /api/admin/qa-rollback` and T017 creates
`server/scripts/send-synthetic-webhook.test.mjs` — neither registers itself. T033 claims it will
count "any test file added in T009/T017", which cannot happen. Result: a green `test:fast` proving
nothing about the two new endpoints or the webhook-signature construction, with no visible error.

**Fix**: add the registration step to T009 and T017 themselves, carrying T005's verbatim hand-edit
warning.

## D1. Is T019's verification-only treatment sufficient for AC3's portal clause?
**Source finding neither the spec nor tasks checked: the sensible-error UI ALREADY EXISTS.**
`SettingsScreen.jsx:83` sets a `portalError` flag on any non-OK response; `:501-503` renders the
localized `settings.portalError`. AC3's portal clause is already satisfied; no code task is needed.
The real gap is REACHABILITY — the portal button only renders for paid-tier users, so the 400 state
(paid tier, no customer id) is not reachable by normal use, and T019 doesn't say how to get there.
Recommended: keep T019 verification-only, add the reachability recipe + cite the existing handler so
a QA agent doesn't file a false bug.

## D2. Should `qa-set-email` return 503 "payments not configured"?
The contract says both routes do; T013 implements it literally. The coupling is a CONTRACT DEFECT:
the stated rationale ("mirrors the existing `/api/paddle/*` 503 pattern") does not apply, because
`qa-set-email` is not a Paddle-backed route. Cost: a QA agent without `PADDLE_API_KEY` is told
"payments not configured" when setting an email — a misleading dead end in the very harness this
epic repairs for truthfulness. Recommended: scope the 503 to `qa-rollback` only, amending
`contracts/qa-endpoints.md`, not just the task text.

## The four flagged judgment calls (adjudicated)
1. `qaAccountTools.js` in Foundational — **correct, no change.**
2. T013's 503 — **the contract is wrong, not the task.** Overrule "follow the contract literally", at
   the contract.
3. T019 verification-only — **sufficient; AC3 does not demand a code task.** What is missing is a way
   to REACH the 400 state, not a fix.
4. T018/T020/T021 one-account discipline — **NOT preserved as ordered.** No reset is interleaved
   (T023's per-CTA reset is correctly confined to the auth sweep), but T014 injects purchases ahead
   of T018 (B1) and T020 does not depend on T018 at all (B2). The Settled-decision-10 invariant must
   be expressed as task DEPENDENCIES, not a prose warning.

## Deploy-prerequisite check: NONE confirmed
Re-walked independently rather than trusting plan.md:160. No migration; `users`/`payment_events`
touched through existing columns only; `resetQaAccount` writes within the value domain `writeTier`
already uses; no new env var (`VITE_PADDLE_CLIENT_TOKEN` and `PADDLE_NOTIFICATION_WEBHOOK_SECRET`
both pre-exist); no cache invalidation (FR-010 forbids adding one); no content-pool change; both
endpoints + the SettingsScreen button ship in one branch and are `requireLocalhost` /
`import.meta.env.DEV` gated, so no observable half-deployed window. T032's `deployment_steps.md`
edits really are prose retractions inside existing entries. **No work-queue entry is owed.**

## Additional coverage gaps flagged but not promoted to blocking
- **Epic AC1 and AC2 have NO execution task.** US1's phase (T007-T011) is endpoint + CLI + unit
  tests + two doc edits — nothing drives a real reset against a real Paddle sandbox subscription,
  and nothing verifies AC2 (after reset + reload, a previously-Pro screen renders free-tier UI with
  no DevTools). T004's unit tests mock the Paddle client, so Paddle-side cancellation is never
  observed against Paddle. Only prose coverage: the Implementation Strategy's "STOP and VALIDATE"
  bullet (tasks.md:428), which isn't a checkbox and doesn't mention the reload.
- **US1 acceptance scenario 5 is uncovered**: "Reset, then re-send the same harvested fixture with a
  fresh `event_id` -> succeeds and applies the expected effect." T021 tests only the opposite case
  (unmodified `event_id` -> suppressed). Subtlety: after a reset `paddle_customer_id` is NULL, so a
  re-sent event matches zero rows and passes silently (NF11) — the scenario needs the account
  re-linked first.
