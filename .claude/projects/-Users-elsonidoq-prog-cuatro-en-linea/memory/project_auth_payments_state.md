---
name: project-auth-payments-state
description: Payments is NO LONGER deferred — Stripe scaffold exists but is untested/unprovisioned; spec 045 wires it
metadata:
  node_type: memory
  type: project
  originSessionId: eeccfcf5-fd26-4620-a25e-6d295f81cc1c
---

**Auth infrastructure notes:**
- The client-side Supabase SDK was removed in commit `87f2818` — no `getSupabaseClient()`, no anon key in frontend.
- Auth is fully server-mediated via httpOnly cookies (`sb_access_token`, `sb_refresh_token`); `ProfileStore.jsx` uses `POST /api/auth/callback` + `GET /api/auth/session`, no Supabase client calls.
- `GET /api/auth/session` currently 401s + clears cookies on an expired access token — it does NOT auto-refresh (spec 045 US2 changes this to attempt `/api/auth/refresh` first). `POST /api/auth/refresh` already exists.

**Payments — CORRECTED 2026-07-11 (the old "deferred / waitlist-only / don't propose Stripe work" notes were WRONG; do not act on them):**
- **Payments is the active work of Epic 5 / spec `045-account-session-checkout`.** Stripe is NOT deferred.
- Stripe server routes exist BUT are an **unvalidated scaffold** — never exercised end-to-end. The connected sandbox account (`DecodeC4 sandbox`, `acct_1TrxCXET4Rc2BDFf`) has **ZERO products and ZERO prices**, so `STRIPE_MONTHLY_PRICE_ID`/`STRIPE_ANNUAL_PRICE_ID` resolve to nothing. Provisioning is real work (spec 045 US5, MCP-assisted).
- `UpgradeModal.onUpgrade` is a **dead no-op** — the prop is never passed by any of its 4 call sites (SetPickerScreen, SagaScreen, PostSetSummaryScreen, DeepRevealPane). It is NOT "waitlist email capture." Spec 045 wires it + adds a monthly/annual toggle (preserve the existing `onUpgrade` API; the toggle is additive).
- **Stripe MCP + plugin** are available in-session (may be absent in headless/cron runs — interactively authenticated). Tools: `get_stripe_account_info`, `stripe_api_read/write/search`, `fetch_stripe_resources`; skills `stripe:stripe-best-practices`, `stripe:test-cards`.
- **Settled (spec 045):** recurring subscription, monthly/annual, thin 3-method `PaymentProcessor` seam (createCheckout/handleWebhook/getSubscriptionStatus; portal stays outside it). Tier stays a single column — NO `subscription_status` column.
- **`users.tier` is now a live webhook-maintained MIRROR of Stripe** (spec 045 FR-025): active/trialing→paid, canceled/unpaid + `subscription.deleted`→free, `past_due`→leave paid (downgrade only on FINAL termination, not first decline). Dunning UX (grace banners, retry emails) stays out of scope.

**Latent prod bugs found this session (folded into spec 045 tasks; see [[project-blunder-serving-dual-paths]]-style open issues):** see `docs/open_issues.md` OI-2/OI-3/OI-4 — portal broken (`loadUser` omits `stripe_customer_id`), webhook analytics double-fire, webhook `subscription.updated` always→paid.

**SHIPPED 2026-07-11 (spec 045 implemented — code complete, one live-purchase verify pending):** Session = 60-day rolling refresh window (`REFRESH_TOKEN_MAX_AGE`); `GET /api/auth/session` now silently refreshes before 401 via `server/authRefresh.js` (`attemptRefresh`, imported inline — NO `authRoutes.js`). FR-002a: NO de-dup Map built — GoTrue observed to NOT rotate-with-reuse (anonymous-session-only test; see OI-5). Payment seam extracted: `paymentProcessor.js`/`stripeProcessor.js`/`stripeRoutes.js` (`registerStripeRoutes(app, paymentProcessor)`); Stripe routes NO LONGER inline in index.js. OI-2/3/4 all FIXED. `users.tier` now a live webhook mirror of Stripe status (FR-025). `UpgradeModal` wired to real checkout (monthly/annual toggle, `onUpgrade(plan)`); return-flow poll `[0,2,4,7,10]s` in `CheckoutReturnBanner.jsx`. Webhook raw-body FIX: `app.use('/api/stripe/webhook', express.raw(...))` must sit BEFORE global `express.json()` or signature verify breaks. Sandbox provisioned (product + monthly $7.99/annual $59.99 prices, webhook secret in server/.env). **STILL PENDING: T017/T032 live test-mode purchase (needs dev-server restart + browser); `getSubscriptionStatus` is test-only by design (prod reads `tier` off req.user).**

**How to apply:** Treat Stripe as in-flight, not deferred. Before any payment reasoning, verify against current code — this file supersedes the pre-2026-07-11 "waitlist/deferred" framing. Related: [[reference_tier_source]], [[project_auth_flow_traps]].
