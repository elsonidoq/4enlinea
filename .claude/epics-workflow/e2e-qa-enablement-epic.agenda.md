# Brainstorm agenda — Epic 13 End-to-End QA Enablement

Gate verdict: BRAINSTORM_NEEDED. The epic's Settled decisions fix the approach, but its own
Open design decisions section states D2+D3 swing the epic from ~14 to ~24 tasks — a ~70% scope
difference that decides whether half the paid lifecycle is ever tested. Owner scope call.

## 1. How much of the paid lifecycle does QA cover? (epic D2)
Type: product-decision
Context: `POST /api/paddle/webhook` is the only path that flips a user back to free after
pause/cancel. Paddle cannot call localhost, so locally only the synchronous verify-transaction
upgrade path runs; downgrade is never exercised.
Why it blocks speccing: decides whether an 8-10 task workstream exists at all, and whether AC1's
"the sandbox subscription is canceled" is assertable end-to-end.
Options:
(a) Tunnel (ngrok/cloudflared) — highest fidelity, real Paddle payloads + real signature
    verification. Cost: third-party tool in the loop, URL changes per session, Paddle sandbox
    notification settings re-pointed each run. Fragile for an autonomous agent.
(b) Paddle's webhook simulator — still needs a reachable URL, so in practice collapses into (a)
    plus a tunnel. Cheaper only if you want events without doing a real checkout first.
(c) Locally-signed synthetic events — QA tooling POSTs a correctly-signed event at localhost.
    VERIFIED FEASIBLE: `PADDLE_NOTIFICATION_WEBHOOK_SECRET` is present in
    connect-four/server/.env and the route verifies via
    `paddle.webhooks.unmarshal(rawBody, secret, header)` (server/paddleProcessor.js:288).
    Zero external dependency, fully repeatable. Trade-off: tests our processor against our idea
    of Paddle's payload; payload drift passes locally while production breaks.
(d) Out of scope — cheapest; "cancel -> back to free" stays permanently untested.
Gate recommendation: (c). Only option an unattended agent runs repeatably; ~3 tasks vs ~10; the
fidelity gap it leaves is a staging concern. NOTE: this diverges from the epic text, which
recommends (a)/(b).

## 2. Does QA cover the email-bearing checkout branch? (epic D3)
Type: product-decision
Context: dev "skip auth" yields an anonymous user with NO email. Checkout has two branches: with
an email it pre-fills the Paddle form; without one it omits the customer block. The agent can only
take the no-email branch. The email branch already shipped one silent bug (OI-53: empty email
threw synchronously, swallowed by an empty catch, checkout never opened, no error anywhere).
Why it blocks speccing: covering it needs a new dev-only affordance to seed an identity, plus a
second pass over the 6 checkout call sites. Also interacts with item 3 — whatever seeds the email
must be un-seeded between runs.
Options:
(a) Accept the gap, document it — zero cost; a branch that has already broken once stays uncovered.
(b) Dev-only affordance to set an email on the anonymous QA user — ~3 tasks; reuses the existing
    dev-gated pattern in AuthModal/SettingsScreen; both branches driven in one run.
(c) Seed a real email-bearing user directly in the DB — the agent then has to sign in AS that
    user, which dev-skip-auth does not support; likely more work than it looks (UNVERIFIED).
Gate recommendation: (b).

## 3. Is the account-rollback tool a script, a dev endpoint, or both? (epic D1)
Type: technical-tradeoff
Context: between runs the agent must restore "free, never paid". (i) Resetting only tier is not
enough — a leftover paddle_customer_id makes run 2's payment SILENTLY rejected by our own fraud
check, so run 2 falsely reports "payment is broken" (NF1). (ii) Even a correct DB reset is not
visible in the browser — entitlement is cached in memory and a direct DB write never invalidates
it (NF2).
Why it blocks speccing: the two forms land in different parts of the codebase and produce
different acceptance evidence. Only the endpoint form can clear the in-memory cache in the same
call, which is what AC2 ("rollback observable without DevTools") is really asking. Also, the QA
harness's environment docs cannot be corrected until this is settled.
Options:
(a) CLI script only — simplest, no new attack surface; agent must hard-reload and docs must say so.
(b) Dev-only localhost-gated endpoint only — agent calls it from the browser session it is already
    driving; server invalidates its own cache; satisfies AC2 cleanly. Cost: a new route that must
    be provably unreachable in production. TRAP: requireAdmin is a no-op outside
    NODE_ENV=production; requireLocalhost is the only real gate.
(c) Both, sharing one implementation module — marginal extra cost over (b).
Gate recommendation: (c).
