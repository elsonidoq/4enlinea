# plan_critique output

## Blocking issues

### 1. `paddleClient.subscriptions.list()` is not a promise — the plan's usage silently cancels nothing

`research.md` D2 and `data-model.md` specify `resetQaAccount` as: list the customer's subscriptions via `paddleClient.subscriptions.list({ customerId: [...] })`, cancel the active one, then null `paddle_customer_id`. The handoff flags this exact call as the one thing D2 did **not** verify.

`node_modules/@paddle/paddle-node-sdk/dist/cjs/resources/subscriptions/index.js:51-54`:

```js
list(queryParams) {
    const queryParameters = new QueryParameters(queryParams);
    return new SubscriptionCollection(this.client, SubscriptionPaths.list + queryParameters.toQueryString());
}
```

`list` is **synchronous** and returns a lazy paginated `Collection`, not a promise of subscriptions. The base class (`dist/cjs/internal/base/collection.js`) initialises `data = []` and only populates it when you call `await collection.next()` or iterate `for await (const sub of collection)`. So the natural reading of the plan — `const subs = await paddleClient.subscriptions.list({...})` then inspecting the result — resolves to the Collection object with `data === []`. Rollback would find zero subscriptions, skip cancellation, report success, and still null `paddle_customer_id` (making the subscription unrecoverable per NF14). Because FR-008 defines "zero subscriptions" as **success, not failure**, this failure is silent and defeats AC1 exactly the way NF1 warns about. A unit test with a mocked `paddleClient` returning an array would go green over it.

The query-parameter shape *is* right: `customerId?: string[]` (`dist/types/resources/subscriptions/operations/list-subscription-query-parameters.d.ts`).

**Fix**: amend research.md D2 and data-model.md to state the iteration contract explicitly — `list()` returns a collection; drain it with `for await (...)` or `await collection.next()` — and require the `qaAccountTools.test.mjs` mock to be a fake Collection (an object with `next()`/`Symbol.asyncIterator`), not a plain array, so the test can fail for the right reason.

### 2. The `paddleClient` the two new endpoints are told to reuse is not in scope at the route site

`contracts/qa-endpoints.md` states: "`paddlePaymentProcessor`'s existing `paddleClient` construction (`index.js`, guarded on `process.env.PADDLE_API_KEY`) is reused, not re-derived." Not achievable as written. In `connect-four/server/index.js`, `paddleClient` is a **block-scoped `const` inside the `if (process.env.PADDLE_API_KEY) { ... }` block** (`index.js:2843-2861`), and `createPaddleProcessor` returns only `{ getPrices, createCheckout, verifyTransaction, handleWebhook, createPortalSession }` (`paddleProcessor.js:117`) — the client is never exposed. The new routes registered near `index.js:2916+` sit outside that block and cannot see it. (`supabase` and `authClient` *are* module-level `let`s at `index.js:323-324`, so those two halves of the plan are fine.)

The contract's 503 `payments not configured` path also has no stated source of truth once the client is unreachable.

**Fix**: apply Decision 1's resolution and write it into `contracts/qa-endpoints.md` + `research.md` D2, then add `index.js`'s client-construction block to the change description in the file map so the task actually touches it.

### 3. `connect-four/package.json` is missing from the Source Code file map — the new unit test would never run

The plan adds `server/qaAccountTools.test.mjs` and leans on it for Constitution Principle III and SC-007/AC7. But `npm run test:fast` is **not a glob**: it is a single explicit 6,887-character file list (`eslint . && node --test --experimental-test-module-mocks tests/... server/paddleProcessor.test.mjs ...`, verified — no `*` anywhere in the script). A new `.test.mjs` file not appended to that list is invisible to the suite, so "test:fast is green (1755 tests)" would remain true while the new module is entirely untested.

`connect-four/package.json` appears nowhere in the plan's Source Code map, and a file named only in prose gets no task — here it is not even in prose.

**Fix**: add a `connect-four/package.json # MODIFIED — append server/qaAccountTools.test.mjs to the test:fast file list` row to the map, and carry CLAUDE.md's warning into the task text: that script line must be edited by hand, never via a sub-agent exact-match edit (two agents have already died on it).

## Decisions required

### Decision 1 — How should the QA rollback endpoint get a Paddle API client?
- **A (recommended)** — hoist to a module-level `let paddleClient = null` alongside `let paddlePaymentProcessor = null`; QA routes 503 when null.
- **B** — construct a second `new Paddle(...)` inside `qaAccountTools.js`. Duplicates the `_sdbx_` prefix logic and breaks D2's constructor-injection rationale.

### Decision 2 — What counts as a subscription worth canceling, and does cancellation take effect immediately?
- **Which statuses.** SDK enum is `'active' | 'canceled' | 'past_due' | 'paused' | 'trialing'`. US2 deliberately drives the account into `paused` and `past_due`, so an `active`-only filter strands a live subscription. Recommended: list `['active','trialing','past_due','paused']`, skip `canceled` (also gives FR-008 idempotence free).
- **When it takes effect.** `cancel(subscriptionId, requestBody)` takes an optional `effectiveFrom`. Omitting it uses Paddle's default of *next billing period*, leaving the subscription `active` with a scheduled change — run N+1 still sees an active subscription and AC1 fails. Recommended: pass `effectiveFrom: 'immediately'` explicitly and record it in research.md D2.
