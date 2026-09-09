## Blocking issue 1 — `subscriptions.list()` returns a lazy Collection, not a promise of subscriptions
Answer: Accept recommendation (auto-applied — no alternative). Amend `research.md` D2 and
`data-model.md` to state the iteration contract EXPLICITLY: `paddleClient.subscriptions.list(...)`
is SYNCHRONOUS and returns a lazy paginated `SubscriptionCollection`
(`node_modules/@paddle/paddle-node-sdk/dist/cjs/resources/subscriptions/index.js:51-54`); its `data`
is `[]` until drained. Drain it with `for await (const sub of collection)` or
`await collection.next()`. `await`-ing `list()` itself yields the Collection object, NOT the rows.
Also require that the `qaAccountTools.test.mjs` mock be a **fake Collection** (an object exposing
`next()` / `Symbol.asyncIterator`), NOT a plain array — a plain-array mock goes green over the bug.
State in the plan WHY this matters: because FR-008 defines "zero subscriptions found" as success,
the mistake is silent — rollback reports success, cancels nothing, and still nulls
`paddle_customer_id`, making the subscription unrecoverable (NF14) and defeating AC1 in exactly the
corrupting way NF1 warns about.
The query-parameter shape is confirmed correct: `customerId?: string[]`.

## Blocking issue 2 / Decision 1 — how do the QA endpoints get a Paddle client?
Answer: **Hoist the client to module scope (Option A).** Change `index.js` so the Paddle SDK client
lives in a module-level `let paddleClient = null`, alongside the existing
`let paddlePaymentProcessor = null`, assigned inside the existing
`if (process.env.PADDLE_API_KEY) { ... }` block. The two QA routes return **503 `payments not
configured`** when it is null — that is the stated source of truth for the contract's 503 path.
Hard constraint: the hoist MUST NOT change what `createPaddleProcessor` receives. One client, one
construction site, and exactly ONE place where the sandbox-vs-live key-prefix rule lives.
Option B (a second `new Paddle(...)` inside `qaAccountTools.js`) was REJECTED: it duplicates the
`_sdbx_` prefix logic that CLAUDE.md and Settled decision 11 make load-bearing for "sandbox only",
creating a place where sandbox and live can drift apart, and it undercuts D2's constructor-injection
rationale (testability without network).
Update `contracts/qa-endpoints.md` and `research.md` D2 to match, and add the `index.js`
client-construction block to that file's change description in the Source Code map so the task
actually touches it.

## Blocking issue 3 — `connect-four/package.json` missing from the Source Code file map
Answer: Accept recommendation (auto-applied — no alternative). Add a row to the Source Code map:
`connect-four/package.json  # MODIFIED — append server/qaAccountTools.test.mjs to the test:fast file list`.
`npm run test:fast` is NOT a glob — it is one explicit ~6,887-character file list with no `*`
anywhere, so an unlisted `.test.mjs` is invisible and "test:fast green / 1755 tests" stays true
while the new module is wholly untested.
Carry this warning into the task text verbatim: **that script line must be edited BY HAND, never via
a sub-agent exact-match edit — two agents have already died on that exact edit.**

## Decision 2 — cancellation scope and timing
Answer: Accept recommendation (auto-applied — the alternatives fail an acceptance criterion, so
there is no viable second option).
- **Statuses**: list and cancel `['active','trialing','past_due','paused']`; skip anything already
  `canceled`. An `active`-only filter would strand a live sandbox subscription, because US2
  deliberately drives the account into `paused` and `past_due` via synthetic webhooks BEFORE
  rollback runs. Skipping `canceled` also gives FR-008's idempotence for free — a re-run finds
  nothing to cancel and succeeds.
- **Timing**: pass `effectiveFrom: 'immediately'` EXPLICITLY to `cancel(subscriptionId, body)`.
  Paddle's default is *next billing period*, which leaves the subscription reading `active` with a
  scheduled change — run N+1 would still see an active subscription and AC1's assertion would fail.
- Record BOTH in `research.md` D2 rather than leaving them to the implementer. Both must still be
  confirmed against the `paddle-docs` MCP at implementation time per CLAUDE.md, but the intent
  (cancel now; cover the non-active-but-live statuses) belongs in the plan.

## Consistency repairs (auto-applied — no alternative)
1. **The epic's AC1 now contradicts the shipped spec.** AC1 still requires rollback to clear
   `payment_events`; the spec consciously dropped that (NF15; FR-007 marked removed) because the
   table has no per-account column and a purchase writes a second `upgrade_completed_track:*` ledger
   row a narrow delete would miss — replayability is instead solved by FR-017/FR-018's per-send
   `event_id` re-stamping. Update `docs/epics/e2e-qa-enablement-epic.md`'s AC1 to match the spec's
   reasoned deviation, citing NF15. Do NOT reintroduce the clause into the spec.
2. **`docs/open_issues.md` row in the file map names only `:3779`**, but FR-024 covers three
   mentions in that file — `:3779`, `:3915`, `:5738` — all confirmed still asserting the false
   premise. Amend the map row to name all three so the task fixes all three, not one of three.

## Notes for the fix agent — preserve these, do not "helpfully" resolve them
- **D7**: the `docs/deployment_steps.md` edits are stale-prose RETRACTIONS, never a "Template for
  new entries" work-queue item. Reformatting them as a runbook entry is a regression.
- **D4's open item**: the raw-wire key casing of the harvested fixtures (`data.customer_id` vs
  `data.customerId`) is DELIBERATELY unresolved and is the harvest task's job. Do not resolve it.
- When adding the `package.json` and amended `open_issues.md` rows, verify NO existing row was lost
  from the Source Code map — `/speckit-tasks` reads that map, and a dropped row silently drops a
  file's task.
