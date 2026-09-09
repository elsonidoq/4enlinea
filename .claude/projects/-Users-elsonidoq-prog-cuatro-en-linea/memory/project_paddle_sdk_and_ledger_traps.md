---
name: project_paddle_sdk_and_ledger_traps
description: "Paddle SDK + payment_events traps: subscriptions.list() is a lazy Collection not a promise; signatures expire in 5s; payment_events has no per-account column; set-tier.js writes only tier"
metadata:
  node_type: memory
  type: project
---

**Trigger: you are about to write code that lists/cancels Paddle subscriptions, constructs or
replays a Paddle webhook, deletes from `payment_events`, or restores a user to a paid state.**
All four traps below were verified at source 2026-09-08 in the installed
`@paddle/paddle-node-sdk` (^3.8.0) and this repo's migrations. Each of them produces a **silent**
wrong answer, not an error — three of the four go green under a plausible unit test.

## 1. `paddleClient.subscriptions.list()` is SYNCHRONOUS and returns a lazy Collection

`node_modules/@paddle/paddle-node-sdk/dist/cjs/resources/subscriptions/index.js:51-54`:

```js
list(queryParams) {
    const queryParameters = new QueryParameters(queryParams);
    return new SubscriptionCollection(this.client, SubscriptionPaths.list + queryParameters.toQueryString());
}
```

No `async`, no promise. The base `Collection` (`dist/cjs/internal/base/collection.js`) initialises
`data = []` and only fetches when you `await collection.next()` or `for await (const s of collection)`.
So the natural-looking `const subs = await paddleClient.subscriptions.list({...})` resolves to the
**Collection object**, whose `data` is `[]` — you find zero subscriptions and conclude there are none.

Why this is corrupting rather than merely wrong: a rollback that treats "zero subscriptions" as
success will cancel nothing, report success, and still null `paddle_customer_id` — after which the
subscription id is unrecoverable (nothing stores it, see §3). The next checkout mints a new customer,
mismatches the OI-55 identity binding, and is silently rejected. **A unit test whose mocked
`subscriptions.list` returns a plain array passes over all of it.** Mock a fake Collection
(`next()` / `Symbol.asyncIterator`), never an array.

The query shape is fine: `customerId?: string[]`
(`dist/types/resources/subscriptions/operations/list-subscription-query-parameters.d.ts`).

Also: `cancel(subscriptionId, body)` defaults to **next billing period** if you omit
`effectiveFrom`. The subscription keeps reading `active` with a scheduled change, so any
"is it canceled?" assertion fails. Pass `effectiveFrom: 'immediately'` explicitly. And a status
filter of only `['active']` misses `paused`/`past_due`/`trialing`, which are still live.

## 2. A Paddle webhook signature is valid for FIVE SECONDS

`dist/cjs/notifications/helpers/webhooks-validator.js`: `static MAX_VALID_TIME_DIFFERENCE = 5` (`:7`).
Header is `Paddle-Signature: ts=<unix-seconds>;h1=<hex>` split on `;` (`:9-24`); the signed payload is
``` `${headers.ts}:${requestBody}` ``` (`:37`), compared at `:42`. Env var is
**`PADDLE_NOTIFICATION_WEBHOOK_SECRET`** — NOT `PADDLE_WEBHOOK_SECRET`; a grep for the latter finds
nothing and reads as "the secret is missing".

Consequence: a signature stored alongside a saved fixture is **always stale**. Anything that replays a
captured event must re-sign at send time. This makes locally-signed synthetic events a viable
alternative to a tunnel (Paddle cannot deliver to localhost), but only if you re-sign.

## 3. `payment_events` has NO user or customer column — and a purchase writes TWO rows

Columns are exactly `id, event_id, event_type, payload, processed_at, created_at` — created as
`stripe_events` in `server/migrations/001_initial.sql:50-57`, renamed by
`060_paddle_rename_and_payment_events.sql` (`stripe_event_id`→`event_id`, `type`→`event_type`).
There is **no per-account filter**; only a JSONB dig into `payload`. Any plan to "clear this
account's ledger rows" is not expressible. A purchase also inserts a *second* row keyed
`upgrade_completed_track:${transactionId}` (`server/paddleProcessor.js:194`, event_type
`'upgrade_completed_track'`) as a claim before the tier write — a narrow delete misses it.

`event_id` is UNIQUE and the insert precedes any tier write, so a `23505` short-circuits to
`{ handled: false, eventType: 'duplicate' }` (`paddleProcessor.js:302-306`). **Replaying a captured
event is a no-op.** Re-stamp `event_id` per send — that, not deleting rows, is the fix.

## 4. `set-tier.js` writes ONLY `tier`, never `paddle_customer_id`

`connect-four/server/scripts/set-tier.js` is 33 lines. It looks the user up by email through the
admin auth API (`:19-24`), then its entire write is `.from('users').update({ tier })` (`:27-28`).

Two corrections to the commonly-recorded belief about it:
- "It can't find the QA user because the anonymous dev-skip-auth user has no email" is only true
  **until an email is seeded** onto that user. Once one is, the lookup works.
- The part that stays true, and is the load-bearing half: it cannot write `paddle_customer_id`. Since
  `writeTier` keys subscription-event writes on `.eq('paddle_customer_id', customerId)`, a
  tier-only restore leaves the row unmatched by every webhook — and a zero-row Supabase UPDATE
  returns **no error**, so the assertions pass vacuously.

Restoring a *usable* paid state therefore needs `tier` **and** `paddle_customer_id` written together.

Related: [[project_paddle_integration]] §16 (local Paddle works; rollback must null
`paddle_customer_id`), [[project_entitlement_client_cache_traps]] (a DB tier write is invisible to
the client), [[feedback_wrong_test_is_part_of_the_bug]], `specs/058-e2e-qa-enablement/`,
`docs/architecture/server-conventions.md` §"PaymentProcessor Seam".
