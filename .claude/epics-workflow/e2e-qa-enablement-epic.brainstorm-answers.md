## 1. How much of the paid lifecycle does QA cover? (epic D2)
Decision: **Locally-signed synthetic events** (gate option (c); this OVERRIDES the epic text's
current recommendation of a tunnel/simulator — update that text). Our QA tooling POSTs correctly
signed Paddle events at the local `POST /api/paddle/webhook`. Feasible because
`PADDLE_NOTIFICATION_WEBHOOK_SECRET` is already present in `connect-four/server/.env` (variable
name verified; value never printed) and the route verifies via
`paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)` at
`connect-four/server/paddleProcessor.js:288`. Note the env var name is
`PADDLE_NOTIFICATION_WEBHOOK_SECRET`, NOT `PADDLE_WEBHOOK_SECRET`.
Binding constraint carried from the option's description: the synthetic payloads MUST be
**harvested from a real Paddle sandbox event**, not hand-authored, for each of the three
transitions enumerated at `server/paddleProcessor.js:64-70` (`subscription.updated -> paused`,
`subscription.canceled`, `past_due -> no write`). A hand-written fixture here is the "green test
that tests your belief" trap in CLAUDE.md. The residual fidelity gap (Paddle payload drift passing
locally while production breaks) is accepted and is a staging concern, and must be stated in the
epic so it is not later mistaken for full coverage.
Tunnel/ngrok is NOT in scope. Paddle's webhook simulator is NOT a distinct option (it still needs a
publicly reachable URL, so it collapses into the tunnel) — do not spec it.

## 2. Does QA cover the email-bearing checkout branch? (epic D3)
Decision: **A dev-only affordance to set an email on the anonymous QA user** (gate option (b)).
Reuses the existing dev-gated pattern in `AuthModal`/`SettingsScreen`. Both checkout branches get
driven in one run, closing the OI-53 failure class. It must interlock with the reset tool from
item 3: whatever seeds the email must be un-seeded by the reset, so run N+1 starts from the
no-email state.
NOT chosen: accepting the gap; seeding an email-bearing user directly in the DB (dev-skip-auth has
no "sign in as this specific user" affordance — do not spec it).

## 3. Is the account-rollback tool a script, a dev endpoint, or both? (epic D1)
Decision: **Both, sharing one implementation module** (gate option (c)). The reset logic lives in a
plain module; it is exposed as a dev-only, `requireLocalhost`-gated endpoint (so the server can
call `invalidateEntitlement()` in the same request — this is what AC2 "observable without DevTools"
actually requires, per NF2), plus a thin CLI wrapper over the same module.
Hard constraint: `requireAdmin` is a NO-OP outside `NODE_ENV=production`; `requireLocalhost` is the
only real gate. Do not reach for `requireAdmin`.
The reset must null `paddle_customer_id`, not just set `tier='free'` (NF1), must cancel the Paddle
sandbox subscription (AC1), and must clear any dev-seeded email from item 2.
Consequence: NF3's `environment.md` tier-flip snippet can now be written — it was blocked on this
decision.
