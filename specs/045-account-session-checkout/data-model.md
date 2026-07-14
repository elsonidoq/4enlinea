# Data Model: Account — Session Persistence & Paid Checkout

No schema changes. This feature reads/writes only existing columns. Documented here per FR-017 to make
explicit which existing fields carry the feature's state.

## `users` (existing table, `docs/architecture/db-schema.md`)

| Column | Role in this feature |
|---|---|
| `tier` | `'free' \| 'paid'`. Sole source of truth for "is this user paid." **Derived/mirrored, not set-once-at-purchase (FR-025)**: written only by the Stripe webhook (`handleWebhook`) via `PaymentProcessor`, and the write is conditional on the subscription event's actual `status` field — `active`/`trialing` → `'paid'`; `past_due` → no write (tier unchanged, Stripe's automatic retry window); `canceled`/`unpaid`, or a `customer.subscription.deleted` event → `'free'` (final termination). Still no new column — `tier` itself is the mirror; only its write-condition changed (`research.md` R2a). Read by `getSubscriptionStatus`, by `loadUser`, and by the frontend via `store.getProfile().tier` (never `session.tier` — `reference_tier_source`). |
| `stripe_customer_id` | Unique, nullable. Set on first successful `checkout.session.completed`. **Gap fixed by this feature (R3)**: must be added to `loadUser`'s `.select()` so `req.user.stripe_customer_id` is populated — currently always `undefined`, breaking the existing (dead) `/api/stripe/portal` endpoint. |

No new columns. `getSubscriptionStatus({ tier, stripeCustomerId })` is a pure derivation over these two
fields — see `research.md` R5.

## `stripe_events` (existing table)

| Column | Role in this feature |
|---|---|
| `stripe_event_id` | Unique. Idempotency key — **gap fixed by this feature (R2)**: the webhook handler must check the insert's uniqueness-violation result and skip downstream processing (tier update, `tracks` insert) on a duplicate, rather than proceeding unconditionally. |
| `type`, `payload` | Unchanged — full event stored for audit/debug. |
| `processed_at` | Existing column, currently unused by the handler (`NULL` always written). Out of scope to start using it — `stripe_event_id` uniqueness alone is sufficient for FR-018 idempotency; not required to also start populating `processed_at`. |

## Session credentials (not a DB table — httpOnly cookies)

| Credential | Current | This feature |
|---|---|---|
| `sb_access_token` cookie | 1h TTL (`ACCESS_TOKEN_MAX_AGE`) | Unchanged (FR-003: no change to where/how credentials are exposed). |
| `sb_refresh_token` cookie | 7d TTL (`REFRESH_TOKEN_MAX_AGE`) | Extended to 60d (FR-001/FR-002). Rotated on every successful refresh (confirmed real rotation behavior — see `research.md` R1), resetting the 60-day window from the most recent refresh, not original sign-in. |

No new cookies, no client-readable storage introduced (FR-003).

## In-memory state (process-lifetime, not persisted — mirrors the existing papergames job-Map pattern)

| Structure | Purpose | Keyed by | Lifecycle |
|---|---|---|---|
| Refresh de-dup map (new, FR-002a) | Coalesces concurrent `POST /api/auth/refresh` calls presenting the same (pre-rotation) refresh-token value so only one `refreshSession` call is made and both callers share its result. | `sb_refresh_token` cookie value (string) | Entry created on first concurrent call, resolved/deleted once the in-flight `refreshSession` promise settles. Short-lived (milliseconds to low seconds) — not a durable cache. |

## Key Entities (from spec, mapped to concrete shapes)

- **User session** → `{ sb_access_token, sb_refresh_token }` cookie pair; no explicit "session" DB row.
- **Account tier** → `users.tier` + `users.stripe_customer_id`.
- **Payment plan** → not stored; a request-time enum `'monthly' | 'annual'` mapped to
  `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` env vars (unchanged shape, already present in
  `create-checkout`).
- **Checkout attempt** → not stored server-side as a row; represented client-side as UI state
  (`idle | loading | success | activating | timed-out`) in `UpgradeModal`'s extended state machine plus
  the `?checkout=success|cancelled` query-param return leg already wired into `create-checkout`'s
  `success_url`/`cancel_url`.
- **Payment-confirmation event** → `stripe_events` row (existing table, see above). Drives `tier` in both
  directions per FR-025 — not only the upgrade-to-paid write, but also the automatic downgrade-to-free
  write on final subscription termination (see `tier` row above and `research.md` R2a).
