---
name: project_paddle_webhook_payload_layer
description: "payment_events.payload stores the UNMARSHALED SDK entity (camelCase), not Paddle's raw wire payload (snake_case) — comparing a fixture to a stored row is a layer error; a renamed wire field VANISHES from the row"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6500448a-921a-4ad1-be14-580d1cb09e06
  modified: 2026-09-08T21:17:03.072Z
---

Two different representations of "a Paddle webhook event" live in this repo, and they do not have
the same shape. Confusing them produces a confident, wrong answer.

## The two layers

| Layer | Where | Casing | Example |
|---|---|---|---|
| **Raw wire payload** — what Paddle POSTs | `server/scripts/webhook-fixtures/*.json` | **snake_case** | `data.customer_id`, `event_id`, `occurred_at` |
| **Unmarshaled SDK entity** — what we store | `payment_events.payload` | **camelCase** | `data.customerId`, `eventId`, `eventType` |

`handleWebhook` stores `payload: event`, where `event` is the return of
`paddleClient.webhooks.unmarshal(...)` — the SDK's typed EventEntity, **not** the bytes Paddle sent.
So `payment_events.payload` is *already mapped*. The harvested fixtures, by contrast, are verbatim
wire payloads.

**Comparing a fixture directly against a `payment_events` row is an apples-to-oranges error** and
will report differences on every single field. To compare them, push the fixture through the same
`webhooks.unmarshal` path first (it verifies the signature, so sign it — the secret only has to
agree with itself). That is what `server/scripts/check-webhook-fixture-drift.mjs` does.

## The consequence that actually bites: a renamed field VANISHES

If Paddle renames a wire field, the SDK maps it to `undefined`, and `JSON.stringify` drops
`undefined` keys on the way into JSONB. The key does not become null — **it disappears from the
stored row entirely.** So drift shows up as a *missing key path*, never as a changed value. A
value-based diff would see nothing.

Corollary: the SDK only maps fields it knows about, so a **brand-new** Paddle field is invisible in
the stored entity until the SDK version that maps it is installed. Verified empirically 2026-09-08:
adding an unknown key to a fixture's wire payload produced no entity key at all.

## Fixtures are frozen, and local replay structurally cannot detect that

Paddle cannot deliver to `localhost`, so downgrade-lifecycle events are replayed locally by
`send-synthetic-webhook.js` from checked-in fixtures. Those fixtures were harvested from real
sandbox notifications (never hand-authored — see the fixtures README), but they are frozen at their
harvest date. **The local test is the frozen copy, so it can never notice Paddle changing shape.**
Drift is only visible where Paddle delivers for real. `check-webhook-fixture-drift.mjs --env staging`
exists for exactly this; its procedure and limits are in `staging_checks.md` § Epic 13.

**Why:** the natural assumption — "the DB stores what Paddle sent" — is wrong here, and every
downstream conclusion built on it (a drift check, a debugging session reading a stored payload, a
new fixture) inherits the error silently.

**How to apply:** before reasoning about a stored webhook payload, name which layer you are holding.
Reading `payment_events` → camelCase entity. Reading a fixture or Paddle's docs → snake_case wire.
Never hand-edit a fixture to make a check pass; re-harvest it. See [[project_paddle_integration]],
[[project_paddle_sdk_and_ledger_traps]], and [[feedback_verify_at_the_source_layer]] (this is that
rule's "name the layer" case, in the persistence direction).
