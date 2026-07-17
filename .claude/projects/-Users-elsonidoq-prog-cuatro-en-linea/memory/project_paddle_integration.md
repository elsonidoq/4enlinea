---
name: project_paddle_integration
description: Paddle (MoR) is the chosen payment provider replacing Stripe for AR; the MCP plugin reads keys from Claude Code env NOT server/.env; account is Paddle Billing; legal pages ship via a separate PR off main
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

Related: [[project_stripe_traps]] (the outgoing provider); `docs/payment_provider_research.md`; `docs/open_issues.md` OI-41.
