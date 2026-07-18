# Phase 1 Data Model: Paddle Checkout Migration

Source tables today (`docs/architecture/db-schema.md:9-30,341-352`):

```
users.stripe_customer_id  text  UNIQUE, nullable
stripe_events              (id uuid PK, stripe_event_id text UNIQUE NOT NULL, type text NOT NULL,
                             payload jsonb NOT NULL, processed_at timestamptz, created_at timestamptz)
```

## Target shape (this migration, `060_paddle_rename_and_payment_events.sql`)

Additive rename — no data migration needed (zero live rows, per epic Non-obvious facts and
spec.md Assumptions).

```
users.paddle_customer_id  text  UNIQUE, nullable   -- renamed from stripe_customer_id
payment_events             (id uuid PK, event_id text UNIQUE NOT NULL, event_type text NOT NULL,
                             payload jsonb NOT NULL, processed_at timestamptz, created_at timestamptz)
                            -- renamed from stripe_events; stripe_event_id -> event_id, type -> event_type
```

`event_type` (not `type`) is chosen for the renamed column to read unambiguously next to
`event_id` in the same row (`type` alone was already slightly ambiguous; this is a small
independent cleanup bundled into the same rename, not a new decision requiring its own
justification beyond "we're touching this table anyway").

### Migration SQL sketch (verify exact syntax at implementation time against the live schema, `reference_supabase_connection.md`)

```sql
-- 060_paddle_rename_and_payment_events.sql
ALTER TABLE public.users RENAME COLUMN stripe_customer_id TO paddle_customer_id;

ALTER TABLE public.stripe_events RENAME TO payment_events;
ALTER TABLE public.payment_events RENAME COLUMN stripe_event_id TO event_id;
ALTER TABLE public.payment_events RENAME COLUMN type TO event_type;

-- Constraint/index names inherited from the RENAME TABLE/COLUMN operations keep their
-- old physical names in Postgres (e.g. stripe_events_stripe_event_id_key) unless
-- explicitly renamed — confirm at implementation time whether to also rename the
-- constraint for readability (cosmetic only, no functional requirement) or leave it,
-- consistent with how other renames in this codebase have been handled (check migrations
-- 053/054 for precedent before deciding).

-- RLS was enabled on stripe_events by migrations/010_rls_backend_tables.sql; RENAME TABLE
-- preserves RLS state, so no re-enable needed. Re-verify with
-- `SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_events';` post-migration.

-- service_role grants: migrations/055_stripe_events_tracks_grants.sql granted
-- service_role on stripe_events + tracks. RENAME TABLE preserves existing grants on the
-- same physical table, so this migration needs NO new GRANT statement for payment_events
-- — verify with `\dp payment_events` post-migration rather than assuming.
```

**PostgREST schema cache**: per `db-schema.md`'s documented gotcha, `NOTIFY pgrst, 'reload
schema';` (or the Supabase dashboard reload) is required after this migration before any
Supabase client query against the renamed column/table succeeds — a `RENAME` is exactly the
kind of DDL this note warns about, not just `ADD COLUMN`.

## `USER_PROFILE_SELECT_COLUMNS` / `defaultUserProfile()` (both allowlists — server/userHelpers.js)

Current (`server-conventions.md:946-947`):
```js
USER_PROFILE_SELECT_COLUMNS = 'tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, stripe_customer_id'
defaultUserProfile() // sets stripe_customer_id: null among other fields
```

Target: both `'stripe_customer_id'` → `'paddle_customer_id'`. Edited in the same commit
(memory `project_user_column_propagation` — editing one without the other silently strands
`req.user.paddle_customer_id` as `undefined`).

## Entities carried from spec.md Key Entities, mapped to concrete shape

| Spec entity | Concrete representation |
|---|---|
| Subscription price | Not stored — read live from Paddle catalog via `paddleProcessor.getPrices()`, mirroring `stripeProcessor.js`'s `getPrices()` (no DB row) |
| Checkout session | Not stored server-side pre-payment (Paddle overlay owns this client-side); becomes a Paddle Transaction (`txn_...`) once created, retrievable via `paddle.transactions.get(id)` |
| User tier | `users.tier` (`'free'`\|`'paid'`) — unchanged column, still a live derivation, now driven by Paddle webhook events instead of Stripe's |
| Payment-provider customer identifier | `users.paddle_customer_id` (renamed) |
| Processed-event record | `payment_events` row, `event_id` UNIQUE (renamed from `stripe_events`) |

No new entity beyond the rename — this feature adds no new stored concept relative to what
Stripe already modeled; it only relabels ownership of the existing `tier`/customer-id/
processed-event shapes to the new provider, per epic Settled decisions §2.
