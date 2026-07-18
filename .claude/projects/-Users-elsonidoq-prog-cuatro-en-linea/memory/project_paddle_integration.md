---
name: project_paddle_integration
description: Paddle (MoR) is the SHIPPED payment provider (Stripe fully removed 2026-07-18); MCP plugin reads keys from Claude Code env NOT server/.env; account is Paddle Billing; successUrl/quantity-stepper/verifyTransaction fixes made post-ship; legal pages ship via a separate PR off main
metadata: 
  node_type: memory
  type: project
  originSessionId: b3651b10-6fef-44e8-8fb4-6381e4fda310
---

**The decision + full evidence lives in `docs/payment_provider_research.md`** (canonical, indexed). Stripe is unavailable to Argentine sellers, so the project is migrating payments to **Paddle**, a merchant of record. This file is only the traps that doc won't warn you about.

## 1. The Paddle MCP plugin reads keys from Claude Code's env, NOT `server/.env`

The `paddle` plugin's `.mcp.json` interpolates `${PADDLE_SANDBOX_API_KEY}` / `${PADDLE_LIVE_API_KEY}` from the **process environment Claude Code launched with**. It has no idea `connect-four/server/.env` exists (that file is read by the Express server at runtime, a different process). If the vars aren't in Claude Code's env, the literal string `Bearer ${PADDLE_SANDBOX_API_KEY}` goes over the wire and Paddle returns **"Authentication header included, but incorrectly formatted."** — which looks like a bad key, but is a missing-env-var.

Fix: an `env` block in `.claude/settings.local.json` (gitignored) with both keys, then **restart Claude Code** — MCP servers inherit env at launch, so a running session won't pick it up. Sandbox key is `pdl_sdbx_...`, live is `pdl_live_...`. CLAUDE.md rule: default to `paddle-sandbox`; only touch `paddle-live` on explicit "live/production" instruction.

## 2. The account is Paddle **Billing**, not Classic

Key format `pdl_sdbx_apikey_...` = Billing (modern). Classic used vendor-ID + auth-code and lacks the `client.products`/`prices` API. So use `@paddle/paddle-node-sdk`, `paddle.webhooks.unmarshal()`, the Billing webhook shapes — the `paddle:*` skills (subscription-sync, webhooks, checkout-web) all target Billing. (UI styling looked Classic in a screenshot; the key format is the reliable signal — don't trust the dashboard chrome.)

## 3. Observed payout reality (resolved the one unknowable)

In our own account, payout settings offer **Wire transfer** and **Payoneer**, Bank Country = **Argentina**, Transfer Currency = **USD** — Paddle will send USD to an AR bank. No public doc stated this; only the dashboard did. Threshold **$100**, monthly (paid by 15th). **TRAP:** "net of fees" is our assumption not documented — a $100 charge nets ~$94.50 and may never clear; confirm net-vs-gross on the first real payout. `$15` SWIFT likely applies (ARS not a payout currency).

## 4. Legal/pricing pages ship via a SEPARATE PR off `main`, not the feature branch

`terms.html` (names Pablo Zivic, drops "free/non-commercial", adds MoR clause + 14-day refund), `privacy.html` (discloses Paddle + OpenAI/Anthropic), and `pricing.html` + its `/pricing` route are Paddle **domain-review requirements** and live on branch **`chore/legal-pages`** (a worktree off `origin/main`). The working feature branch is ~496 commits ahead of main, so a small prod-facing fix goes via a fresh worktree off `origin/main` — NOT by merging the 496-commit branch. Deployed to `decodec4.xyz` (prod). `pricing.html` hardcodes prices (drift risk) — see OI-41.

## 5. A 200 on a new static route may be the SPA catch-all, not your file

`GET /pricing` returned 200 while serving `index.html` (the SPA fallback) before the route was actually registered/deployed. Never trust the status code for a new static route — grep the response body for a content marker (e.g. `Merchant of Record`). `sendFile` routes re-read disk per request (so `/terms` content updates need only a redeploy, not a restart), but a NEW route is code and needs the process restarted/redeployed.

## 6. Paddle.js defaults to PRODUCTION on the client — the sandbox footgun

Server-side sandbox discipline (sandbox API key) does NOT make the browser checkout use sandbox. Paddle.js defaults to **production**: you must call `Paddle.Environment.set('sandbox')` **before** `initializePaddle()`, AND use the **sandbox client-side token** (prefixed `test_`; the live token has no prefix). Miss either and the overlay silently loads production while every server-side sandbox test still passes — a split-brain that hides until a real card is charged. Gate both on a Vite `import.meta.env.MODE`/`VITE_*` dev/prod switch, default sandbox. (Captured in `polish_epic.md` Epic 10 US10.2.4, but it's a durable Paddle trap, so it lives here too.)

## 7. Going live has TWO independent gates; a hosted payment link does NOT bypass domain review

To process real money you need BOTH **domain review** (per checkout domain) AND **account/identity verification** (sole trader = you personally do a KYC/ID check) approved — either one still `Pending` blocks live transactions. **Correction to an easy wrong assumption:** a Paddle-hosted payment link does *not* sidestep domain review — for live accounts you cannot create transactions until a default payment link is set, and that requires domain verification. So there is NO no-code / no-domain shortcut to the first live payout test; sandbox is the only thing you can exercise before both gates clear. Domain review: most auto-approve, else 5–7 business days.

Domain submission: submit **`decodec4.xyz` ONLY** — not `staging.decodec4.xyz` (internal) and not `quaddojo.com` (serves the same app under a name the terms don't claim → brand mismatch). **App name is undecided**: `decodec4.xyz` is temporary, `quaddojo.com` a tentative test; terms/brand currently say "DecodeC4". Don't invest in brand assets until the name is committed; renaming later = one new domain submission + a find/replace, cheap.

## 8. Epic 10 is SHIPPED (2026-07-18) — Stripe fully removed, Paddle live in sandbox

`/coordinate-implementation` ran the full spec 050 build (4 batches + code review + QA) against `specs/050-paddle-checkout-migration/`; every Stripe file/dep/env-var/test is deleted, `docs/architecture/api-conventions.md` + `server-conventions.md` describe the shipped Paddle contract — read those for current truth, not this section. Two planning-era decisions below were **reversed** during implementation/QA — don't trust old plan docs or this memory's prior wording over the architecture docs:
- **`successUrl` is NOT passed to `Paddle.Checkout.open()`** (reversed 2026-07-18, contra the original plan). Passing it there makes Paddle.js navigate the *parent window* on checkout completion (confirmed live: a real full-page reload), which broke the "never leaves the app" requirement and raced with the `verify-transaction` call, silently dropping the tier grant. `successUrl` is still returned by `createCheckout` (the open-redirect guard still applies server-side) but the client now calls `paddle.Checkout.close()` once its own confirmation resolves instead.
- **`verifyTransaction`'s single check needs a bounded retry** — Paddle's transaction record settles to `status: 'completed'` asynchronously just after the client-side `checkout.completed` event fires ("typically less than a second" per Paddle's own docs); an immediate zero-delay check reproducibly saw a not-yet-`completed` transaction. One ~1.2s delayed re-fetch (not a poll) fixed it.
- **Checkout overlay's quantity stepper has no client-side hide option** — Paddle's own docs say so explicitly. Fixed by setting `quantity: { minimum: 1, maximum: 1 }` on both prices via `client.prices.update` (sandbox and, per `staging_checks.md`, still needed on the live catalog when it's provisioned).
- Ownership-check field (`custom_data.app_user_id`, not `customer_id`), the `useStripePrices→usePaddlePrices` rename, `subscription.created`'s no-op status, and the route/DB-identifier renames all shipped exactly as originally planned — no correction needed there.
- OI-55 (client-supplied `customData.app_user_id` had no server-side binding on the webhook path) was hardened post-ship: `handleWebhook` now cross-checks `data.customerId` against an already-established `users.paddle_customer_id` for every payment after a user's first. The first-payment forgery window is a known, accepted residual gap — see `docs/architecture/server-conventions.md` "Identity binding on `transaction.completed` (OI-55)".

Related: [[project_stripe_traps]] (obsolete now that Stripe is deleted — kept only for historical Stripe-era context, do not use for anything current); `docs/payment_provider_research.md`; `docs/open_issues.md` (OI-54/55/56/57, all resolved); `docs/architecture/api-conventions.md` + `server-conventions.md` (current Paddle contract — authoritative).
