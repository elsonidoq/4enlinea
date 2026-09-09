---
name: project_paddle_integration
description: Paddle (MoR) SHIPPED provider; sandbox/live from key prefix NOT NODE_ENV/MODE; CSP=5-round discovery; domain resubmit=remove+re-add; checkout_not_enabled≠domain gate; fulfillment checklist needs 6 events + a REAL (non-simulated) delivery; absent [req] log proves request never reached app
metadata: 
  node_type: memory
  type: project
  originSessionId: b3651b10-6fef-44e8-8fb4-6381e4fda310
  modified: 2026-08-01T23:16:16.741Z
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

Server-side sandbox discipline (sandbox API key) does NOT make the browser checkout use sandbox. Paddle.js defaults to **production**: you must call `Paddle.Environment.set('sandbox')` **before** `initializePaddle()`, AND use the **sandbox client-side token** (prefixed `test_`; the live token has no prefix). Miss either and the overlay silently loads production while every server-side sandbox test still passes — a split-brain that hides until a real card is charged.

**CORRECTION (2026-07-18): do NOT gate this on `NODE_ENV`/`import.meta.env.MODE`.** That was this file's original advice and it's actively wrong for this project's deploy setup — Railway sets `NODE_ENV=production` on **every** service including staging (confirmed via a diagnostic log), and a plain `vite build` (this repo's actual build command, no `--mode` flag) always resolves `MODE` to `'production'` regardless of deploy target. Both the server (`process.env.NODE_ENV === 'production'`) and client (`import.meta.env.MODE === 'production'`) versions of this gate silently always picked `production`, producing a `forbidden` 403 on staging that looked exactly like a permissions problem, not an environment mismatch. **Fixed by deriving from the credential's own prefix instead**: server picks `Environment.sandbox` iff `PADDLE_API_KEY.includes('_sdbx_')`; client picks `'sandbox'` iff `VITE_PADDLE_CLIENT_TOKEN.startsWith('test_')`. This can never disagree with the key/token actually in use — see `docs/architecture/server-conventions.md`'s PaymentProcessor section (current, authoritative).

## 6b. Third-party checkout CSP is a discovery problem, not a one-shot fix

Adding Paddle.js (and, within it, enabling Google Pay) to a hardened `helmet` CSP took **five separate rounds** of one-violation-at-a-time fixes: `script-src` (cdn.paddle.com), `style-src` (`'unsafe-inline'` for Paddle's injected loading-overlay styles, then separately `*.paddle.com` for its external stylesheet), `connect-src`/`frame-src` (the checkout iframe + its API calls), then Google Pay's own manifest-fetch/payment-sheet domains (`pay.google.com`, `www.google.com`) on top of that. Each fix only surfaced the *next* violation. **A passing local smoke test proves nothing** — CSP only applies when Express serves the built `dist/` with the header; `npm run dev` doesn't exercise it at all (same caveat as the pre-existing papergames.io CSP note in server-conventions.md). Test against a real deployed build, and expect to iterate through script/style/connect/frame/img/font-src one violation at a time for any new third-party embed.

## 6c. Unrelated but adjacent: Google Fonts was never CSP-clean either

`index.html`'s Baloo 2 / Nunito webfont `<link>` (fonts.googleapis.com stylesheet + fonts.gstatic.com font files) had been silently broken by the same strict CSP since spec 047 shipped it — nobody had exercised a hardened deploy that actually enforced the header until this session. Needed `fonts.googleapis.com` on `style-src` and a brand-new `font-src` directive (there was none, so it fell back to `default-src 'self'`) allowing `fonts.gstatic.com`.

## 7. Going live has TWO independent gates; a hosted payment link does NOT bypass domain review

To process real money you need BOTH **domain review** (per checkout domain) AND **account/identity verification** (sole trader = you personally do a KYC/ID check) approved — either one still `Pending` blocks live transactions. **Correction to an easy wrong assumption:** a Paddle-hosted payment link does *not* sidestep domain review — for live accounts you cannot create transactions until a default payment link is set, and that requires domain verification. So there is NO no-code / no-domain shortcut to the first live payout test; sandbox is the only thing you can exercise before both gates clear. Domain review: most auto-approve, else 5–7 business days.

Domain submission: submit **`decodec4.xyz` ONLY** — not `staging.decodec4.xyz` (internal) and not `quaddojo.com` (serves the same app under a name the terms don't claim → brand mismatch). **App name is undecided**: `decodec4.xyz` is temporary, `quaddojo.com` a tentative test; terms/brand currently say "DecodeC4". Don't invest in brand assets until the name is committed; renaming later = one new domain submission + a find/replace, cheap.

## 8. Epic 10 is SHIPPED (2026-07-18) — Stripe fully removed, Paddle live in sandbox

`/coordinate-implementation` ran the full spec 050 build (4 batches + code review + QA) against `specs/050-paddle-checkout-migration/`; every Stripe file/dep/env-var/test is deleted, `docs/architecture/api-conventions.md` + `server-conventions.md` describe the shipped Paddle contract — read those for current truth, not this section. Two planning-era decisions below were **reversed** during implementation/QA — don't trust old plan docs or this memory's prior wording over the architecture docs:
- **`successUrl` is NOT passed to `Paddle.Checkout.open()`** (reversed 2026-07-18, contra the original plan). Passing it there makes Paddle.js navigate the *parent window* on checkout completion (confirmed live: a real full-page reload), which broke the "never leaves the app" requirement and raced with the `verify-transaction` call, silently dropping the tier grant. `successUrl` is still returned by `createCheckout` (the open-redirect guard still applies server-side) but the client now calls `paddle.Checkout.close()` once its own confirmation resolves instead.
- **`verifyTransaction`'s single check needs a bounded retry** — Paddle's transaction record settles to `status: 'completed'` asynchronously just after the client-side `checkout.completed` event fires ("typically less than a second" per Paddle's own docs); an immediate zero-delay check reproducibly saw a not-yet-`completed` transaction. One ~1.2s delayed re-fetch (not a poll) fixed it.
- **Checkout overlay's quantity stepper has no client-side hide option** — Paddle's own docs say so explicitly. Fixed by setting `quantity: { minimum: 1, maximum: 1 }` on both prices via `client.prices.update`. **Done on both catalogs now (2026-07-18)**: sandbox was fixed at ship time; the live catalog (`pri_01kxr65aphrqnamh9xhfc1yfcm` monthly, `pri_01kxr65ar3xm337d84ka3ah3r9` annual) had drifted — still `quantity.maximum: 100` — and was fixed separately this session. **Lesson: sandbox and live Paddle catalogs do NOT stay in sync automatically; a catalog-level fix applied to one must be manually mirrored to the other, and nothing will warn you if it isn't.**
- Ownership-check field (`custom_data.app_user_id`, not `customer_id`), the `useStripePrices→usePaddlePrices` rename, `subscription.created`'s no-op status, and the route/DB-identifier renames all shipped exactly as originally planned — no correction needed there.
- OI-55 (client-supplied `customData.app_user_id` had no server-side binding on the webhook path) was hardened post-ship: `handleWebhook` now cross-checks `data.customerId` against an already-established `users.paddle_customer_id` for every payment after a user's first. The first-payment forgery window is a known, accepted residual gap — see `docs/architecture/server-conventions.md` "Identity binding on `transaction.completed` (OI-55)".

## 9. First live domain review was soft-declined for pricing consistency — and confirmed how to actually resubmit

`decodec4.xyz`'s first live domain submission came back `action_required` ("soft-declined") with an email citing pricing clarity/consistency: a public pricing page, prices matching everywhere they're shown (site vs. checkout), a tax-transparency note, and trial/intro-pricing disclosure if applicable. Verified directly (not assumed) that `pricing.html`, the in-app `UpgradeModal` copy (`en.json`'s `upgrade.body`/`upgrade.price`), and the **live** Paddle catalog's actual prices all agree ($2.99/mo, $21.99/yr, no `trial_period` on either price) — this should clear that specific rejection.

**UPDATE 2026-08-01 (owner-confirmed): `decodec4.xyz`'s domain review has since been APPROVED.**
Two consequences that are easy to get wrong: (a) approval is granted **per domain, not per page** — changing
what an already-approved URL *serves* triggers no new review and there is nothing to re-submit, so the
remove-and-re-add dance below is NOT needed for a content or implementation change; (b) approval is not a
permanent waiver — Paddle can spot-check, and the Merchant-of-Record clause, 14-day refund statement and
`/terms` link must stay reachable on the domain. Because a spot-check may not execute JavaScript, spec 053
keeps the static server-rendered `pricing.html` alive at `/pricing-legal` when the React app takes `/pricing`.

**How to actually resubmit, for a standard (non-partner) seller account**: the email's "Resubmit domain for review" button just links to `vendors.paddle.com/request-domain-approval` (Website approval → Domain approval tab) — there is **no per-domain resubmit control there**, only an **X** (remove) next to the domain and a **"+ Add a new domain"** link. The `POST /checkout-domains/{id}/resubmit` API endpoint exists but is gated behind the Paddle **partner program** — not available here. The actual resubmit mechanism on this account is: **remove the domain (X), then re-add it via "+ Add a new domain"**, which triggers a fresh review pass. (The domain's own required content — terms/privacy/refund policy linked/contained on the site — was already satisfied; don't assume a second soft-decline means content is the problem without checking the email's actual reason first.)

## 10. `transaction_checkout_not_enabled` is a SEPARATE account gate from domain review

Confirmed live: `POST https://checkout-service.paddle.com/transaction-checkout` (what `buy.paddle.com` actually calls) returned `400 validation: transaction_checkout_not_enabled` — Paddle's own error text: "Checkouts aren't enabled for this account. This typically means you haven't fully completed the Paddle onboarding process." This is independent of item 7's two-gates framing being restated here with a concrete symptom: even with the domain **approved**, checkouts stay disabled account-wide until identity/business verification also clears. Don't diagnose this as a domain or CSP problem — check onboarding status at `vendors.paddle.com` instead. The two gates (domain, account onboarding) can be resolved in either order.

## 11. The "Handle fulfillment and provisioning" onboarding checklist step needs a REAL event, not a simulated one — and 6 event types, not 4

This step stayed stuck on "in progress" through: creating a working notification destination, fixing the signature secret, and successfully running single-event AND scenario simulations (`transaction.completed`, `subscription.created`, `subscription_renewal`, `subscription_cancellation` all showed "Success" in the simulator). None of that flipped it green. Two things were actually required, discovered by asking Paddle's own dashboard-provided AI-agent prompt template for this exact step (Paddle > Get started > step 3 has a "prompt for an agent" you can read — it's the ground truth for what Paddle expects, when you can find it):

1. **Subscribe to 6 events, not 4.** The prompt template explicitly lists `subscription.created/updated/canceled`, `customer.created/updated`, `transaction.completed` as required routing targets. This app's destination was only subscribed to the first 4 (matching what `handleWebhook` actually branches on) — `customer.created`/`updated` were missing entirely. Fixed via `notificationSettings.update` (must resend the COMPLETE event list — omitted events get unsubscribed). No code change needed: `handleWebhook`'s generic fallback (`return { handled: true, eventType }`) already no-ops any event type without a specific branch, so subscribing to `customer.*` doesn't require actually implementing a handler for it.
2. **A real, Paddle-triggered event has to land — simulations don't count.** Confirmed empirically: every earlier real card purchase happened *before* a working destination existed (the only prior destination pointed at unreachable `localhost:3001`), so despite fully working webhook infrastructure and multiple successful simulated deliveries, no genuine platform-sourced event had ever reached a correctly configured destination. One real sandbox test purchase (after the destination + secret were fixed) turned **all 3 onboarding steps green immediately**. The step's one-line description — "Listen to notifications from Paddle **in your app**" — is the tell in hindsight: "in your app" means real app-driven traffic, not the dashboard simulator.

**Reusable lesson**: when a Paddle onboarding checklist step won't flip despite everything *looking* done, check the step's own dashboard-provided agent prompt for the literal required event list before assuming your existing event set is sufficient, and don't trust simulator-only verification as proof it satisfies onboarding — you may still need one real triggered event.

**Reference**: sandbox notification destination `ntfset_01kxty7kpbks45dhq9n5nz58ng`, pointing at `https://staging.decodec4.xyz/api/paddle/webhook`, `traffic_source: 'all'`, subscribed to all 6 events above. This is the one to use for any future staging Paddle webhook testing — don't create a duplicate.

## 12. Debugging technique: an absent `[req]` log line proves a request never reached the app

When staging returned a generic `"upstream error"` on a `verify-transaction` retry with zero matching app-side error logs, the fix wasn't to guess at Paddle SDK internals — `server/index.js`'s very first middleware logs `[req] <method> <url>` for literally every incoming request before any routing happens. Checking Railway's logs (`railway logs --lines 1000 --json`, NDJSON — one JSON object per line, not a single array) for that request's `[req]` line and finding **none** proved the request died before reaching the Express process at all (ruled out: app bug, crash, in-progress redeploy — confirmed via `railway deployment list --json`, which showed the same deployment had been running unchanged the whole time). Conclusion: transient Railway-edge/network blip, not application-side — and the evidence path (deployment history → full-session log sweep for the `[req]` tag → absence proves non-arrival) is the reusable technique for any "the client got an error but our code shows nothing" report in this app.

## 13. `checkoutReturnFlow.js`'s pub/sub never replayed current state to new subscribers — the real cause of OI-59

The modal-stuck-on-idle bug (item 12's Railway detour was a red herring for a *different* attempt) had a real root cause: `subscribeCheckoutReturn(fn)` only notified listeners of *future* `setCheckoutReturnState` calls, never the current value at subscribe time. `useUpgradeCheckout.js`'s `checkout.completed` handler is a module-level singleton independent of which screen is mounted — if a screen's subscription effect wasn't active at the exact instant `'activated'` broadcast, the notification was lost forever, even though the store's internal `state` correctly held `'activated'`. Confirmed via screenshot: the modal was frozen at its pristine pre-payment `'idle'` state, not a loading spinner or a success message — and the account had correctly become Pro anyway (the server-side tier flip via webhook/`verifyTransaction` doesn't depend on any UI listener). Fixed by having `subscribeCheckoutReturn` immediately replay the current state on subscribe, paired with each of the 5 `UpgradeModal` call sites now calling `resetCheckoutReturnState()` after consuming a terminal state (so the replay doesn't leak a stale outcome into some later, unrelated modal open). See `docs/open_issues.md` OI-59 (resolved) for the full trace and 2 new regression tests in `checkoutReturnFlow.test.js`.

## 14. There is NO durable carrier across a checkout round-trip — the return-flow store dies on cold boot, and `successUrl` never reaches Paddle

Anything that must survive "user opens checkout, closes the app, reopens it" cannot ride either of the two
obvious channels, and both failures are silent:

- **`checkoutReturnFlow.js` is a bare in-memory module-level `let state = 'idle'`** with four string values,
  no payload field, no persistence. A cold boot resets it to `'idle'`. Any design that stashes a token there
  and compares it after a restart can never match — it will pass every in-session test and fail the exact case
  it was built for. Widening it to carry a payload is also not free: its header declares `useUpgradeCheckout.js`
  the sole writer and `CheckoutReturnBanner.jsx` a pure reader, and all five `UpgradeModal` call sites depend
  on the replay + `resetCheckoutReturnState()` contract that fixed OI-59 (item 13).
- **The return URL is not a carrier either**: per item 8, `successUrl` is deliberately **not** passed to
  `Paddle.Checkout.open()` (passing it navigates the parent window and raced the tier grant). It is still
  returned by `createCheckout` server-side, but Paddle never navigates to it — so appending a nonce to
  `returnPathOverride` only works if you first verify that path is actually navigated to.

The remaining reliable option is client-side storage that self-validates (freshness timestamp + a content
match), needing no coupling to the return flow at all. Surfaced while planning spec 053 US5 (restoring set
results after paying from `/summary`); the tasks carry it as an investigation, not a settled fix.
See [[feedback_plan_file_map_is_coverage_frontier]] for how the wrong assumption survived four review stages.

## 15. The **default payment link** must include Paddle.js — and `?_ptxn=` is unhandled today (OI-98)

Easy and costly to get backwards, surfaced 2026-08-01 while splitting `/pricing` (React) from
`/pricing-legal` (static) in spec 053. Paddle holds URLs for this site in two places that pull in
**opposite** directions:

- **Checkout → Checkout settings → Default payment link** must point at a page that *includes Paddle.js*.
  Paddle builds every transaction's checkout link, and the "update your payment method" links it emails to
  subscribers, by appending `?_ptxn=<transaction_id>` to it and expecting the page to auto-open a checkout.
  **Never point this at `/pricing-legal`** — that page is deliberately static and JS-free (it exists so a
  non-JS-executing Paddle spot-check can still read prices + the MoR clause), so it can never satisfy this.
- Any **legal/compliance URL** recorded for website approval should point at `/pricing-legal`, which is
  where the MoR clause, 14-day refund statement, and `/terms` link now live.

**The `_ptxn` flow is broken today and this is PRE-EXISTING, not caused by spec 053.** `useUpgradeCheckout()`
has no mount-time initialization — it returns a `handleUpgrade` closure and only calls `getPaddle()` inside
the click handler, so merely landing on `/pricing` never initializes Paddle.js; and `grep -a -rn "_ptxn"` over
`src/`+`server/` returns nothing. The *old* static `/pricing` contained no Paddle.js at all (`grep -a -c` for a
script include → 0; the only "Paddle" hits are MoR prose), so the flow never worked. Tracked as OI-98. Note the
`grep -a` — a bare grep on these files hits the non-UTF-8 binary trap and returns a false negative
([[project_grep_silent_zero_matches]]).

Related: [[project_paddle_integration]] (obsolete now that Stripe is deleted — kept only for historical Stripe-era context, do not use for anything current); `docs/payment_provider_research.md`; `docs/open_issues.md` (OI-54/55/56/57/59, all resolved); `docs/architecture/api-conventions.md` + `server-conventions.md` (current Paddle contract — authoritative).

## 16. Local Paddle DOES work — the "unset token" was a lost config line, not a property of the environment (2026-09-07)

**Retracting a premise recorded in three places.** `docs/open_issues.md` (OI-96 area),
`specs/057-mvp-launch-gate/spec.md:99` and `docs/epics/pre-launch-mvp-epic.md:180` all state that
`VITE_PADDLE_CLIENT_TOKEN` is unset locally and therefore "Paddle does not work locally
(owner-confirmed)". The token half is true; the conclusion is not.

An **active sandbox client-side token already exists** on the account —
`ctkn_01kxsd747gp2d0n3xyb28h602q`, created **2026-07-18**, named *"connect-four local dev (spec 050
US2)"*, described *"Frontend Paddle.js overlay checkout — sandbox, VITE_PADDLE_CLIENT_TOKEN for
local npm run dev"*. It was minted for precisely this and its value was never written into
`connect-four/.env.local`. Retrieve it with `client.clientTokens.list` via the `paddle-sandbox` MCP,
or from Paddle dashboard → Developer tools → Authentication → Client-side tokens. **Never print the
value** — pipe it straight into the env file and verify by prefix/length only
([[feedback_never_print_secrets]]).

Confirmed live 2026-09-07 once written: `window.Paddle` defined, `cdn.paddle.com/paddle/v2/paddle.js`
loaded, and "Become Pro" on `/pricing` opens a genuine **sandbox** overlay
(`sandbox-buy.paddle.com`, "Test Mode") — the `test_` prefix correctly selecting sandbox per §6.
Server-side was never the problem: `PADDLE_API_KEY` (sandbox) is present in `server/.env`, so
`/api/paddle/config` and `create-checkout` already worked and live prices already rendered. The
**only** broken link was the client token.

**The tell that it was never a real property:** [[project_app_qa_setup_gotchas]] documents driving
Paddle's checkout *fields* locally on **2026-07-18** — the same day the token was created. It
demonstrably worked, the config was lost, and the loss was then recorded as an environment
constraint. Nothing on staging/production was affected (the token is present there per OI-96,
`specs/057-mvp-launch-gate/plan.md:335`), so no deploy step is implied.

**QA consequence — rolling a user back to free must null `paddle_customer_id`, not just `tier`.**
`server/paddleProcessor.js`'s OI-55 identity binding (documented at
`docs/architecture/server-conventions.md:1359`) rejects any later `transaction.completed` whose
`customData.app_user_id` already has an *established* `paddle_customer_id` differing from the
transaction's customer: it returns `{ securityRejected: true }` and **skips the tier write**. So a
tier-only rollback makes the *next* QA checkout mint a new Paddle customer, mismatch, and be
silently rejected — the second run reports "payment is broken" while the app is fine. Also null it,
cancel the sandbox subscription, and remember a DB tier write never calls `invalidateEntitlement()`
([[project_entitlement_client_cache_traps]]) so the client needs a reload to observe it.

See `docs/epics/e2e-qa-enablement-epic.md`, OI-152, OI-153.

## Sandbox dunning does NOT fire on a forced renewal (2026-09-08)

The documented dunning test card `4000 0027 6000 3184` ("succeeds, then renewals decline") **did not
decline** when the renewal was forced early via `subscriptions.update({ nextBilledAt })` — it
succeeded, and no `subscription.past_due` / `transaction.payment_failed` notification was ever
emitted. Paddle also enforces a **minimum ~30-minute lead time** on `nextBilledAt`
(`subscription_next_billed_at_too_soon` below that), so a forced renewal cannot be used to shortcut
the cycle either. Undetermined whether the simulation only runs on an organic billing cycle or the
doc is simply wrong.

Consequence: the `past_due` webhook payload could not be harvested, so that downgrade transition is
unverified locally (OI-158). Do not plan work that assumes this card will produce a `past_due` event
on demand, and do not hand-author the fixture to move on.
