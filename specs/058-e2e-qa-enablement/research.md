# Research: End-to-End QA Enablement

All Settled decisions (1–11) and Non-obvious facts (NF1–NF15) are inherited verbatim from
`spec.md` and are NOT re-derived here — this file resolves the design questions the spec
deliberately left to planning (module shape, file placement, exact wire formats), each grounded
in a citation.

## D1 — Where do the two new `requireLocalhost` endpoints live?

**Decision**: Add both endpoints directly in `connect-four/server/index.js`, reusing the
existing in-file `requireLocalhost` function. Do NOT extract it into its own module.

**Rationale**: `requireLocalhost` is defined at `connect-four/server/index.js:2916`:

```js
function requireLocalhost(req, res, next) {
  const ip = req.socket?.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  console.warn('[requireLocalhost] blocked request from', ip, 'for', req.method, req.originalUrl);
  return res.status(403).json({ error: 'Admin endpoints are localhost-only' });
}
```

It is a plain function-scoped closure, not exported, and EVERY existing consumer
(`app.post('/api/admin/generate', requireLocalhost, ...)` at `index.js:2924`, plus 18+ more
`requireLocalhost`/`requireAdmin` routes from `index.js:711` through `:1042`) is registered in
the same file, in the same style — `app.<verb>(path, requireLocalhost, handler)` inline. There is
no precedent anywhere in this codebase of `requireLocalhost` being imported into a sibling module;
`docs/architecture/api-conventions.md:149` documents it as "Middleware for curation/generation
admin endpoints" without describing a module boundary. Extracting it into a new file for exactly
two more call sites would be the first instance of that pattern, contradicts
CLAUDE.md's "Occam + extend-don't-add" preference (extend the one existing convention), and adds a
migration risk (every other consumer would need updating for consistency, which is out of scope).
The rollback and email-seed **business logic** still lives in its own module (per Settled decision
7/9) — only the thin Express route registration + `requireLocalhost` gate stays inline in
`index.js`, exactly like every other admin route there.

**Alternative considered**: Extract `requireLocalhost` to `server/adminAuth.js` (which already
exports `requireAdmin`, `server/adminAuth.js:1`) so it can be imported. Rejected: `adminAuth.js`
today exports exactly one thing, is 8 lines, and none of the 18 existing `requireLocalhost` call
sites in `index.js` would migrate to import it (out of scope for this feature) — importing it in
only the two NEW call sites while every existing one keeps the in-file closure creates two
inconsistent patterns in the same file, which is worse than the status quo.

### D1a — Where do the new QA routes get a Paddle client? (Decision 1, blocking issue 2)

> **Amended 2026-09-08 (tasks_critique):** there are now **three** QA routes — `qa-rollback`,
> `qa-set-email` and `qa-set-paid-state`. Only `qa-rollback` calls `paddleClient` (to list and
> cancel subscriptions), so only it carries the 503 `payments not configured` pre-check; see
> `contracts/qa-endpoints.md` §"503 scoping". The hoist decided below is unchanged.

**Problem, verified at source**: the QA routes are registered near `index.js:2916` onward,
outside the `if (process.env.PADDLE_API_KEY) { ... }` block at `index.js:2842-2860` that
constructs the Paddle client. Inside that block, the client is a **block-scoped `const
paddleClient = new Paddle(...)`** (`index.js:2849-2851`), never assigned to a module-level
binding, and `createPaddleProcessor` returns only `{ getPrices, createCheckout, verifyTransaction,
handleWebhook, createPortalSession }` (`paddleProcessor.js:117`) — it never re-exposes the client
it was given. So as originally drafted, `contracts/qa-endpoints.md`'s claim that the new routes
reuse "`paddlePaymentProcessor`'s existing `paddleClient` construction" has nothing to attach to.

**Decision**: Hoist the client to module scope. Change `index.js` to declare `let paddleClient =
null;` alongside the existing `let paddlePaymentProcessor = null;` (`index.js:2842`), and assign it
*inside* the existing `if (process.env.PADDLE_API_KEY) { ... }` block at the same point the local
`const` was previously created — i.e. replace the block-scoped `const` with an assignment to the
module-level `let`. `createPaddleProcessor({ paddleClient, supabase, ... })`'s call and the values
it receives are unchanged. The two new QA routes then read the same module-level `paddleClient`
directly and respond `503 { "error": "payments not configured" }` when it is `null` (mirrors the
existing `/api/paddle/*` 503 pattern, `paddleRoutes.js:24-26`) — this is the endpoints' stated
source of truth for the 503 path.

**Rejected alternative** (a second `new Paddle(...)` constructed inside `qaAccountTools.js`):
duplicates the `_sdbx_`-prefix sandbox/live derivation that CLAUDE.md and Settled decision 11 make
load-bearing for "sandbox only," creating a second construction site where sandbox and live key
handling could drift out of sync with the primary one, and undercuts D2's constructor-injection
rationale (tests inject a client; production code must still have exactly one place that builds
one).

## D2 — Rollback module shape (Settled decision 7)

**Decision**: New module `connect-four/server/qaAccountTools.js`, following the
constructor-injection pattern `paddleProcessor.js` already uses (`createPaddleProcessor({
paddleClient, supabase, ... })`, `connect-four/server/paddleProcessor.js:119`) so tests can pass a
mocked Paddle client and mocked Supabase client with no network access — the same reason
`paddleProcessor.js`'s header gives for that pattern (`paddleClient` "constructor-injected …
rather than constructed internally … so tests can pass a mocked Paddle SDK object without hitting
the network", `paddleProcessor.js:105-108`).

Exports:
- `createQaAccountTools({ paddleClient, supabase })` returning `{ resetQaAccount, setQaAccountEmail }`.
- `resetQaAccount({ userId })`: implements FR-002/FR-003/FR-004/FR-005/FR-008/FR-009 — reads the
  target row's `paddle_customer_id`, lists Paddle subscriptions for that customer id
  (`paddleClient.subscriptions.list({ customerId: [...] })` — verify exact SDK method/shape
  against `paddle-docs` MCP at implementation time, per CLAUDE.md §"Paddle integration": "always
  check the `paddle-docs` MCP before writing Paddle code"), cancels every one whose status is in
  `['active', 'trialing', 'past_due', 'paused']` via the SDK (never the MCP server — Settled
  decision 11), THEN writes `{ tier: 'free', paddle_customer_id: null }` via a single
  `supabase.from('users').update(...)`, in that order (NF14). Idempotent: a `paddle_customer_id`
  already null, or a customer id with zero cancelable subscriptions (including one that is already
  `canceled`), is a no-op cancel step, not an error (FR-008, US1 Acceptance Scenarios 3–4).

  **`subscriptions.list()` iteration contract (blocking issue 1, verified at source)**:
  `paddleClient.subscriptions.list(queryParams)` is **synchronous** and returns a lazy paginated
  `SubscriptionCollection`, not a promise of rows —
  `node_modules/@paddle/paddle-node-sdk/dist/cjs/resources/subscriptions/index.js:51-54`:
  ```js
  list(queryParams) {
      const queryParameters = new QueryParameters(queryParams);
      return new SubscriptionCollection(this.client, SubscriptionPaths.list + queryParameters.toQueryString());
  }
  ```
  The base `Collection` (`dist/cjs/internal/base/collection.js`) initializes `data = []` and only
  populates it via `await collection.next()` or async iteration. `const subs = await
  paddleClient.subscriptions.list({...})` therefore resolves to the Collection object itself, not
  its rows — treating it as an array silently sees zero subscriptions every time. `resetQaAccount`
  MUST drain it with `for await (const sub of paddleClient.subscriptions.list({ customerId: [id] }))
  { ... }` (or repeated `await collection.next()`), never by awaiting `list()` and indexing the
  result. This matters because FR-008 defines "zero subscriptions found" as *success*: getting the
  drain wrong doesn't throw — it reports success, cancels nothing, and still nulls
  `paddle_customer_id`, permanently orphaning the live subscription (NF14) and silently defeating
  AC1 in exactly the way NF1 warns about. `qaAccountTools.test.mjs`'s mocked `paddleClient` MUST be
  a fake Collection (an object exposing `next()`/`Symbol.asyncIterator` over its fixture rows), not
  a plain array — a plain-array mock makes both the correct code and the `await list()`-as-array
  bug pass, so it cannot fail for the right reason.

  **Cancellation timing**: call `paddleClient.subscriptions.cancel(subscriptionId, {
  effectiveFrom: 'immediately' })`, passing `effectiveFrom` explicitly. Paddle's SDK default when
  it is omitted is *next billing period*, which leaves the subscription reading `active` with a
  merely scheduled cancellation — a rollback that omits this would still see an active subscription
  on run N+1 and AC1 would fail. Both the status list and `effectiveFrom: 'immediately'` must still
  be confirmed against the `paddle-docs` MCP at implementation time per CLAUDE.md's Paddle rule;
  this section records the *intent* so the implementer isn't guessing it from scratch.
- `setQaAccountEmail({ userId, email })`: implements FR-013 — calls
  `authClient.auth.admin.updateUserById(userId, { email, email_confirm: true })` (service-role
  client; Settled decision 9 names this exact method+options shape).

**CLI wrapper**: `connect-four/server/scripts/qa-rollback-cli.js` — thin, parses `process.argv`
for a target identifier and a `--yes` flag; refuses to call `resetQaAccount` without `--yes`
present (FR-006). No CLI wrapper is specified for `setQaAccountEmail` — Settled decision 9 only
requires "a dev-gated button plus a `requireLocalhost` endpoint," no CLI path; adding one would be
unrequested scope.

**Alternative considered**: Put `resetQaAccount` in `connect-four/server/scripts/` directly (so
"CLI script and module" collapse into one file) rather than a separate `server/qaAccountTools.js`.
Rejected: Settled decision 7 states "The reset logic lives in a plain module; it is exposed as
... a dev-only endpoint ... plus a thin CLI wrapper over the same module" — three artifacts
(module, endpoint, wrapper), not two. `index.js` cannot cleanly `import` from `server/scripts/`
for a request-handler dependency (scripts are entry points, not library modules, by every existing
convention: `set-tier.js`, `generate_candidates`, etc. are runnable-only) without inverting the
existing scripts/ vs. server/ boundary — keeping the module in `server/` (a peer of
`paddleProcessor.js`) is the path with zero new architectural precedent.

## D3 — Where does the dev-only "set QA email" button live?

**Decision**: `connect-four/src/screens/SettingsScreen.jsx`, next to the existing
`🛠 Dev: clear IndexedDB & sign out` button (`SettingsScreen.jsx:330`, gated by the same
`import.meta.env.DEV &&` pattern used at `SettingsScreen.jsx:317` / `AuthModal.jsx:56`).

**Rationale**: Settled decision 9 says "reusing the existing pattern in
`AuthModal`/`SettingsScreen`." `AuthModal` is the PRE-auth modal (its purpose is signing a user
in); the email-setting affordance needs an already-signed-in anonymous user (`req.user.id` must
resolve — `setQaAccountEmail` takes a `userId`), so it cannot live in `AuthModal`. `SettingsScreen`
already hosts the analogous dev-only, `import.meta.env.DEV`-gated control for a signed-in QA
session (the reset button) and already has network-call scaffolding in the same file (`handleDevReset`'s
`fetch(`${API}/api/auth/signout`, ...)`, `SettingsScreen.jsx:307`) to copy from directly.

## D4 — Webhook fixture: exact signature format for FR-017/FR-018 re-signing

**Decision**: Verified directly from the installed SDK (not assumed from training data, per
CLAUDE.md §"Paddle integration"): `node_modules/@paddle/paddle-node-sdk/dist/esm/notifications/helpers/webhooks-validator.js`
implements `isValidSignature(requestBody, secretKey, signature)` as:

```js
extractHeader(header) {
  // header format: "ts=<unix-seconds>;h1=<hex>"
}
async isValidSignature(requestBody, secretKey, signature) {
  const headers = this.extractHeader(signature);
  const payloadWithTime = `${headers.ts}:${requestBody}`;
  // reject if now > (ts + 5) seconds
  const computedHash = await cryptoProvider.computeHmac(payloadWithTime, secretKey);
  return computedHash === headers.h1;
}
```

So the synthetic-event sender must construct the `Paddle-Signature` header as
`` `ts=${nowUnixSeconds};h1=${hmacSha256Hex(secretKey, `${nowUnixSeconds}:${rawBodyString}`)}` ``
using `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, POST that header plus the substituted-and-serialized
JSON body (exact byte string used in the HMAC must be the exact body sent — no re-serialization
after signing) to `POST /api/paddle/webhook`. **`MAX_VALID_TIME_DIFFERENCE = 5` seconds** — the
signature must be computed and sent within a ~5s window, confirming FR-018's "re-sign at send
time" requirement is not just best practice but a hard 5-second deadline.

**Open item, explicitly NOT resolved here — flagged for the harvest task itself (FR-016)**: the
route calls `paddleClient.webhooks.unmarshal(rawBody.toString(), secret, signatureHeader)`
(`paddleProcessor.js:288`), which parses `rawBody` as the **raw wire JSON** Paddle sent — this is
almost certainly Paddle's documented snake_case field names (`data.customer_id`, `data.id`,
`event_id`, `occurred_at`), NOT the SDK's camelCase accessor names our own code reads after
parsing (`event.data.customerId`, `paddleProcessor.js:83`, `:386`). The three harvested fixtures
must be inspected for their actual top-level and `data.*` key casing before the allowlist
substitution is implemented — this is a fact to harvest, not to assume, and is the harvest task's
job (Settled decision 8's "Identifying and recording the harvest source is an explicit first task
of the user story covering AC3a").

## D5 — Harvested fixture storage location

**Decision**: `connect-four/server/scripts/webhook-fixtures/` — three files,
`subscription-updated-paused.json`, `subscription-canceled.json`, `subscription-updated-past-due.json`
(names track the exact `event_type` + trigger, not a generic index) — plus a
`README.md` in the same directory recording the harvest source (Settled decision 8's method:
actively drive the sandbox subscription into each state via the Paddle API / the dunning test
card, then pull the resulting notification-log payload via the `paddle-sandbox` MCP) and the date
harvested, so a later re-harvest has a documented precedent to follow.

**Rationale**: `connect-four/server/scripts/` already holds one-off/QA-adjacent server tooling
(`set-tier.js`) and is where FR-001's CLI wrapper also lives (D2) — colocating fixtures with the
scripts that consume them (the synthetic-event sender) keeps the QA surface in one directory
rather than spreading it across `server/`, `server/scripts/`, and a new top-level `fixtures/`.

## D6 — Synthetic-event sender shape

**Decision**: `connect-four/server/scripts/send-synthetic-webhook.js` — a CLI script taking a
fixture name + a target `paddle_customer_id`/subscription id, implementing D4's signing algorithm
and FR-017's field substitution (only `data.customerId`/`data.id`/`event_id`/`occurred_at` +
signature timestamp — `data.status` untouched, FR-017's explicit prohibition), re-stamping a fresh
`event_id` on every send (NF12, US1 Acceptance Scenario 5) so a replay after rollback is not a
silent no-op.

## D7 — `docs/deployment_steps.md` edits are retractions, not a new work-queue entry

**Decision**: FR-024 requires editing existing prose inside `docs/deployment_steps.md` at the
lines named in Evidence 4 (`:371,422`) to retract the false "Paddle does not work locally" claim.
This is NOT a new entry under the file's "Template for new entries" format
(`docs/deployment_steps.md:1567`) — it does not describe a step that must run around a deploy; it
corrects stale prose inside an existing entry. The epic itself is explicit: "Deployment
prerequisites: NONE… Do not add a `docs/deployment_steps.md` entry unless a task introduces a real
prod-visible change" (epic, line 39-42) — this feature introduces none (see plan.md's "Deploy
Prerequisites" section). `docs/deployment_steps.md` still appears in the Source Code file map
because FR-024 touches its content, but the task generated from it must NOT follow the
"Template for new entries" runbook shape (Status/When/Blocks/Applies to/Run it/Verify/Roll back)
— it is a find-and-correct edit like the other three Evidence-4 locations.
