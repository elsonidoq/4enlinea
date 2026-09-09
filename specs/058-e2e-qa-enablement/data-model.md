# Data Model: End-to-End QA Enablement

No schema migration. This feature reads/writes existing columns only (see plan.md's Deploy
Prerequisites walk). The "entities" below are the spec's Key Entities section made concrete
against the actual `public.users` and `payment_events` schemas.

## `public.users` (existing table — no new columns)

Live column list (verified, `NF13`): `id, device_uuid, tier, deep_reveal_count,
deep_reveal_reset_at, paddle_customer_id, created_at, updated_at, streak_count, last_active_date,
sparring_record, papergames_id, last_import_at, onboarding_status`.

Fields this feature reads/writes:

| Field | Read by | Written by |
|---|---|---|
| `id` | `resetQaAccount`, `setQaAccountEmail`, `setQaAccountPaidState` (lookup key) | — |
| `paddle_customer_id` | `resetQaAccount` (to list Paddle subscriptions before nulling, NF14) | `resetQaAccount` → `null` (FR-002); `setQaAccountPaidState` → the passed `paddleCustomerId` (FR-027, tasks_critique B2); `handleWebhook`'s existing `writeTier` (unchanged) |
| `tier` | — | `resetQaAccount` → `'free'` (FR-002); `setQaAccountPaidState` → `'paid'` (FR-027); existing `writeTier` paths (unchanged) |

`setQaAccountPaidState` (FR-027, added by tasks_critique B2) writes `tier` and `paddle_customer_id`
together in one `update()` call, mirroring `resetQaAccount`'s NF1 pairing discipline in the upward
direction. It never reads or writes anything beyond these two columns, and never calls the Paddle
SDK — it exists to re-create DB state a real checkout would have produced, not to perform one.

`email` is NOT a `public.users` column (NF13) — the email-seeding affordance (FR-013) writes
through the Supabase **auth** user record via `auth.admin.updateUserById`, never `public.users`.

## `payment_events` (existing table — no new columns, NOT written by rollback)

Columns (verified, NF15, from `060_paddle_rename_and_payment_events.sql` renaming
`001_initial.sql:50-57`'s `stripe_events`): `id, event_id, event_type, payload, processed_at,
created_at`. No user/customer column — this is why rollback does not (and per NF15, cannot
usefully) delete rows here; replayability comes from re-stamping `event_id` per send instead
(FR-017/FR-018).

## Key Entities (from spec.md, made concrete)

### Rollback module

Implementation: `createQaAccountTools({ paddleClient, supabase }).resetQaAccount({ userId })`
(`connect-four/server/qaAccountTools.js`, see research.md D2).

- **Input**: `userId` (the target `public.users.id` / Supabase auth user id).
- **Reads**: `users.paddle_customer_id` for that `userId`; the Paddle API's subscription list for
  that customer id.
- **Effects** (in order, NF14):
  1. List the customer's Paddle sandbox subscriptions via the SDK, draining the returned
     `SubscriptionCollection` with `for await (...)`/`collection.next()` — **not** by awaiting
     `list()` and treating the result as an array (research.md D2's "iteration contract" —
     `list()` is synchronous and the naive `await`-as-array reading silently sees zero
     subscriptions every time).
  2. Cancel every subscription whose status is in `['active', 'trialing', 'past_due', 'paused']`
     via the SDK (Settled decision 11's narrow exception), passing `effectiveFrom: 'immediately'`
     explicitly (omitting it defaults to *next billing period*, leaving the subscription reading
     `active` with only a scheduled cancellation). Skip anything already `canceled` — this also
     gives FR-008's idempotence for free on a re-run.
  3. `UPDATE users SET tier = 'free', paddle_customer_id = NULL WHERE id = $userId`.
- **Does NOT touch**: `payment_events` (NF15), `deep_reveal_count`/`deep_reveal_reset_at` (Out of
  Scope — deep reveal untouched), the Supabase auth user's email (FR-009 — no un-seeding).
- **Idempotence** (FR-008): step 1 draining to zero cancelable subscriptions, or
  `paddle_customer_id` already `NULL`, short-circuits steps 2/3's Paddle-side work without
  erroring.

### Synthetic webhook event fixture

Implementation: three JSON files under `connect-four/server/scripts/webhook-fixtures/` (research.md
D5), each a harvested-verbatim Paddle sandbox notification payload for one of
`subscription.updated→paused`, `subscription.canceled`, `subscription.updated→past_due`.

- **Substitutable fields** (closed allowlist, FR-017): `data.customerId`, `data.id`, `event_id`,
  `occurred_at`, and the signature timestamp used when re-signing. Exact raw-JSON key casing
  (camelCase vs. Paddle's documented snake_case) is confirmed by the harvest task itself
  (research.md D4's open item), not assumed here.
- **Non-substitutable**: `data.status` (FR-017, explicit) and every other field — sent verbatim.
- **Re-signing**: `Paddle-Signature: ts=<unix-seconds>;h1=<hex hmac-sha256(secret,
  "<ts>:<rawBody>")>` computed at send time (research.md D4), using
  `PADDLE_NOTIFICATION_WEBHOOK_SECRET`.

### Paid-state re-establishment capability (added by tasks_critique B2, 2026-09-08)

Implementation: `createQaAccountTools({ paddleClient, supabase }).setQaAccountPaidState({ userId,
paddleCustomerId })` (`connect-four/server/qaAccountTools.js`, FR-027).

- **Input**: `userId`; `paddleCustomerId` (nullable — `null` is a valid, intentional input, used to
  reach the billing-portal's no-customer-id 400 path while keeping `tier='paid'`).
- **Effect**: a single `supabase.from('users').update({ tier: 'paid', paddle_customer_id:
  paddleCustomerId }).eq('id', userId)`.
- **Does NOT**: call the Paddle SDK, touch `payment_events`, or perform any real Paddle-side
  action — it is a DB-only rehearsal tool for downgrade-fixture and portal-error test setup, not a
  substitute for the real checkout US2's sweep (T018) drives.
- **Why needed**: `resetQaAccount` only moves an account toward `free`; `set-tier.js` writes `tier`
  alone and never `paddle_customer_id` (NF3, corrected); without this capability, US2's three
  downgrade-transition assertions go vacuous after the first flips the row to `free`, and US1
  Acceptance Scenario 5 (reset, then replay a fixture with a fresh `event_id`) cannot be verified
  meaningfully since a reset account's `paddle_customer_id IS NULL` makes a replay match zero rows
  and pass silently (NF11).

### QA test account

Not a stored entity of its own — it is whichever `public.users` row + Supabase auth user was
minted by the most recent `🛠 Dev: skip auth` (anonymous, no email, `tier: 'free'` by construction,
`server/index.js`'s anonymous sign-in path). The email-bearing variant is the same row after
`setQaAccountEmail` has run (Settled decision 9); there is no separate "email-bearing user"
row/table.
