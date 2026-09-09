## B1 — payment-sweep account choreography / NF1 ordering
Answer: Accept recommendation (auto-applied — no alternative; the current order reproduces NF1).
Make T018's single successful purchase the FIRST payment action AND the harvest source. Reorder so
T018 (or at minimum its one completed transaction) precedes T014, and have T014 harvest
`paused`/`canceled` from THAT subscription. Add the real dependency edge to the
**Dependencies & Execution Order** section — the Settled-decision-10 invariant must live there as
task dependencies, NOT only as a prose warning in T018.
For the `past_due` harvest (which needs a live subscription paid with a different card, i.e. a
second checkout): use the new state capability from B2 to re-establish `tier='paid'` + a matching
`paddle_customer_id` rather than interleaving a reset — Settled decision 10 forbids a reset inside
the payment sweep. State the chosen mechanism explicitly in T014 so an implementer does not improvise.

## B2 — vacuous downgrade assertions; no way back to a known paid state
Answer: **Add a third export to `qaAccountTools.js`** — a function that sets `tier` AND
`paddle_customer_id` together, addressed by **user id** (not email).
Rationale to record: it works whether or not an email has been seeded, so US1 can validate its own
reset WITHOUT depending on US2's email affordance (routing it through `set-tier.js` would couple
US1 to US2 and break independent testability); it is reachable from the `requireLocalhost` endpoint
the browser agent already drives (a CLI cannot be called mid-run from Chrome); and it inherits the
same constructor-injection test pattern as the other two exports.
NOT chosen: extending `set-tier.js` with `--paddle-customer-id` (CLI-only, ordering-coupled to US2,
and it widens an operator-facing production-adjacent tool for QA use); and "do both".
Expose it through the existing dev-only localhost endpoint surface, consistent with Settled
decision 7's shared-module shape. Add a unit test with the same fake-Collection/mocked-supabase
discipline as `qaAccountTools.test.mjs`, and register any NEW test file per B3.
Then **rewrite T020**: re-establish `tier='paid'` + the matching `paddle_customer_id` BEFORE each of
the three sends, and assert `past_due` leaves the row **still paid** — the only form of that
assertion that can fail. Reference the new capability from T019, T020, and the Implementation
Strategy's validate step (tasks.md:428, the unexplained "manually-set-up Pro test row").
Also add the new module + endpoint + test file to `plan.md`'s **Source Code file map** — a file
absent from that map gets no task.

### Related source correction (apply to the epic's NF3 and to FR-023's environment.md work)
`connect-four/server/scripts/set-tier.js` was re-read at source 2026-09-08. NF3's blanket claim
that it "looks users up by email, which the anonymous dev-skip-auth user does not have" becomes
**conditionally stale** once Settled decision 9's affordance seeds an email — the lookup
(`set-tier.js:19-24`, admin auth API) then succeeds. What remains true, and is the load-bearing
half, is that its only write is `.from('users').update({ tier })` (`set-tier.js:27-28`) — it NEVER
writes `paddle_customer_id`. Correct NF3 and the `environment.md` text to say exactly this: the
email lookup works once an email is seeded, but the script cannot restore `paddle_customer_id`, so
it cannot re-establish a state the downgrade fixtures can act on.

## B3 — two of three new test files never registered in `test:fast`
Answer: Accept recommendation (auto-applied — no alternative). Add the registration step to **T009
and T017 themselves**: "if this creates a new `.test.mjs`, append it to the `test:fast` script in
`connect-four/package.json`", carrying T005's hand-edit warning VERBATIM (one ~6,887-char line, no
glob; two prior agents died on that exact-match edit — do it by hand, never delegate it). If T009
instead extends the already-registered `server/userEndpoints.test.mjs`, the instruction must say
that satisfies the requirement. Fix T033's claim that it counts "any test file added in T009/T017"
so it is achievable.

## D1 — T019 / AC3 portal 400 path
Answer: Accept recommendation (auto-applied — the source finding makes the alternatives non-viable).
Keep T019 **verification-only**; add the reachability recipe: reach the 400 by using B2's new state
capability to set `tier='paid'` with `paddle_customer_id=NULL`, then click the portal button. Cite
the EXISTING handler so a QA agent does not file a false bug — `SettingsScreen.jsx:83` sets
`portalError` on any non-OK response and `:501-503` renders the localized `settings.portalError`.
AC3's portal clause is therefore already satisfied in code; no code task is owed.

## D2 — `qa-set-email` 503 "payments not configured"
Answer: **Fix the contract.** Scope the 503 to `qa-rollback` only; `qa-set-email` drops the check.
The amendment MUST land in `specs/058-e2e-qa-enablement/contracts/qa-endpoints.md` (the artifact
that is wrong), not only in T013's task text. Update T013 to match and remove the "INTENTIONAL"
annotation.
Reason to record: the contract's stated rationale ("mirrors the existing `/api/paddle/*` 503 pattern
so this endpoint fails the same way as every other Paddle-backed route") does not apply, because
`qa-set-email` is not a Paddle-backed route — it talks only to Supabase auth. Telling a QA agent
"payments not configured" when it tries to set an email is a misleading dead end inside the very
harness this epic is repairing for truthfulness.

## Coverage gaps to close (auto-applied — acceptance criteria must have execution coverage)
1. **Add one US1 manual-drive task** closing epic AC1 and AC2: drive a real reset against a real
   Paddle sandbox subscription (not the mocked client in T004), then confirm AC1's full assertion
   (`users.tier='free'` AND `users.paddle_customer_id IS NULL` AND the sandbox subscription
   canceled) and AC2's (after the documented page reload, a previously-Pro screen renders free-tier
   UI with no DevTools intervention). It must be a checkbox task, not a prose bullet — the
   Implementation Strategy's "STOP and VALIDATE" at tasks.md:428 is not a task and omits the reload.
2. **Cover US1 acceptance scenario 5**: reset, then re-send the same harvested fixture with a FRESH
   `event_id` and confirm it succeeds and applies the expected effect. T021 currently tests only the
   opposite case (unmodified `event_id` -> suppressed). Handle the subtlety explicitly: after a
   reset `paddle_customer_id` is NULL, so a re-sent event matches zero rows and passes SILENTLY
   (NF11) — the account must be re-linked (B2's capability) before the assertion means anything.

## Notes for the fix agent — preserve these
- The real tier enum value is **`'paid'`, not `'pro'`**. Spec and tasks say "pro" in prose in
  several places; harmless in prose, WRONG in any code or SQL.
- Do NOT delegate the `test:fast` edit to a sub-agent. By hand, always.
- T028's "one pass over one file" for `docs/open_issues.md`'s three locations is deliberate — do not
  split it into parallel tasks.
- T012's soft dependency on T013 ("or can be developed in parallel") is fine — leave it.
- D4's raw-wire JSON key casing stays DELIBERATELY unresolved; it is T014's job to determine by
  inspection. Do not resolve it by assumption.
- Deploy prerequisites are NONE, independently re-walked. Do not add a `docs/deployment_steps.md`
  work-queue entry; T032 remains a prose retraction only.
