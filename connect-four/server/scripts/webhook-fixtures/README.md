# Webhook fixtures — harvest record (spec 058, T014/T015)

This directory holds real, harvested-verbatim Paddle sandbox webhook payloads,
consumed by `../send-synthetic-webhook.js`:

- `subscription-updated-paused.json` — **harvested, present.**
- `subscription-canceled.json` — **harvested, present.**
- `subscription-updated-past-due.json` — **NOT present. Harvest BLOCKED — see
  "past_due: blocked" below. Do not hand-author this file; leave it absent.**

Never hand-write a fixture here to unblock local testing (Settled decision 8
— a hand-authored payload converts the test back into testing an assumption
rather than production reality). `send-synthetic-webhook.js`'s own unit test
(`send-synthetic-webhook.test.mjs`) uses an inline in-memory fixture object
instead, precisely to avoid needing a real file for that purpose.

## Harvest method (paused, canceled)

Date: 2026-09-08.

1. Drove a real sandbox purchase through the app's PricingScreen CTA
   (`4242 4242 4242 4242`), completing subscription `sub_01m215vt7cm867j3qaarjn3dw5`
   on customer `ctm_01m215ve6kmw26200awckr2nys` (spec 058 T018's single
   completed transaction — this harvest ran AFTER T018 per the critical
   ordering invariant).
2. Paused that subscription immediately (`effectiveFrom: 'immediately'`), then
   canceled it immediately, both via the Paddle Node SDK called directly from
   a throwaway local script (`server/scripts/qa-pause-cancel-sub.mjs`,
   deleted after use) — Settled decision 11's narrow sandbox-only exception.
   Never used the `paddle-sandbox` MCP for either mutation.
3. Pulled the resulting notifications via the `paddle-sandbox` MCP (read-only):
   `client.notifications.list({ filter: '<subscriptionId>' })` to find the
   `ntf_...` ids, then `client.notifications.get(notificationId)` for each —
   its `.payload` field is the exact wire-format body Paddle POSTs to a
   webhook endpoint. Saved that `.payload` object verbatim as each fixture
   file (no field added, removed, or reordered).

## Observed key casing

**snake_case**, throughout — both top-level (`event_id`, `event_type`,
`occurred_at`, `notification_id`) and inside `data` (`data.customer_id`,
`data.id`, `data.status`, `data.paused_at`, `data.canceled_at`, etc.).
Resolves research.md D4: the real harvested JSON matches Paddle's wire format
exactly, not the SDK's camelCase typed-accessor names.
`send-synthetic-webhook.js`'s casing-agnostic probe needs no change either
way, but this confirms which branch it actually takes in production use.

## past_due: BLOCKED

**Attempted, did not produce a `subscription.past_due` (or a declined-renewal
`subscription.updated`) event. This fixture is NOT harvested. Do not
hand-author it.**

What was tried:

1. A second, independent sandbox checkout was completed on the SAME QA
   account (`12cf0eef-3781-4215-a48d-ea8d828ecb41`), paid with the documented
   dunning test card `4000 0027 6000 3184` (a 3D-Secure-2 challenge appeared;
   completed via the sandbox's own "COMPLETE" test button). This transaction
   **succeeded** (`txn_01m216a67bwbyay8k2dde8m825`, `status: "completed"`),
   creating subscription `sub_01m216dx345v9mwepyqq2n5tbx` on a **new** Paddle
   customer `ctm_01m2166v2qfb1k6kraqncycahv` — matching the documented
   "succeeds on the first charge" half of this card's behavior
   (`.claude/skills/app-qa/references/environment.md:116`).
2. Per that same documentation, the DECLINE is supposed to happen on a
   **renewal**, which this subscription's `next_billed_at` placed a real
   month away (`2026-10-08`) — not practical to wait out live. To force an
   earlier renewal attempt without waiting a month, `subscriptions.update()`
   was called directly via the Paddle SDK (`server/scripts/qa-force-renewal.mjs`,
   deleted after use) to move `next_billed_at` to the earliest Paddle allows
   (30-minute minimum lead time; used ~32 minutes), with
   `prorationBillingMode: 'prorated_immediately'`.
3. At the forced due time, Paddle **did** attempt a new charge
   (`txn_01m218e22a9v8zfh99y57mhcc1`, `origin: "subscription_recurring"`) —
   but it also **succeeded** (`status: "completed"`), and the subscription
   stayed `active` with `next_billed_at` rolled forward another month. No
   `subscription.past_due`, `transaction.past_due`, or
   `transaction.payment_failed` event appeared in the sandbox event stream
   for this customer/subscription (`client.events.list` filtered on
   `event_type` and cross-checked against `data.customer_id`).

Interpretation: either (a) the dunning-decline behavior only fires on an
**organically elapsed** billing cycle, not a manually-forced
`next_billed_at`/`prorated_immediately` update, or (b) this card's decline
behavior in the current sandbox does not reproduce the way
`environment.md:116`'s table describes it. Not determined which — this is a
genuine open question, not a fixed defect (Out of Scope: fixes are not made
in this feature). Record as a finding (see the batch's Handoff context) and
an open issue for a later attempt (e.g. waiting out a real ~30-day cycle, or
investigating whether Paddle sandbox exposes a more direct dunning-simulation
lever).

## Which account harvested each fixture

- `subscription-updated-paused.json`, `subscription-canceled.json`: the
  primary QA sweep account (`12cf0eef-3781-4215-a48d-ea8d828ecb41`),
  customer `ctm_01m215ve6kmw26200awckr2nys` — the same account/subscription
  T018's single completed transaction created.
- `subscription-updated-past-due.json`: N/A — not harvested. The attempted
  harvest-only dunning checkout ran on the SAME QA account (not a fresh
  throwaway identity) and was restored via `POST /api/admin/qa-set-paid-state`
  after use, per T014's documented fallback option, before the account was
  used for T041's reset.

## Are these fixtures still accurate? (drift check)

These payloads are frozen at their harvest date. Because Paddle cannot deliver to `localhost`, the
local replay in `send-synthetic-webhook.js` cannot notice if Paddle later changes its payload shape —
the local test *is* the frozen copy. Drift is only visible where Paddle delivers for real.

To check an environment where it does:

```bash
cd connect-four && node server/scripts/check-webhook-fixture-drift.mjs --env staging
```

Exit 0 = no drift, exit 3 = drift found (it names the exact key paths), exit 1 = could not run.
A `compared 0` summary is not a pass — it means that environment has no matching delivered events
yet. See `staging_checks.md` § "Epic 13 — End-to-End QA Enablement (spec 058)" for the full
procedure, success condition and known limits.

If the check reports drift, re-harvest the affected fixture using the method recorded above and
commit the new payload verbatim — never hand-edit a fixture to make the check pass, which would
reintroduce exactly the hand-authored-payload trap Settled decision 8 forbids.
