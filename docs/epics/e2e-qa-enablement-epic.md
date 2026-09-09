# Epic 13 — End-to-End QA Enablement

> **Invocation:** `/epics-manager docs/epics/e2e-qa-enablement-epic.md 1`
> (this file holds exactly one epic; the id argument is optional)

An autonomous agent cannot today run a complete end-to-end QA of this app. Two journeys are
unreachable: **every login CTA** (because there was no agreed way to return to a clean signed-out
state between them) and **every payment CTA** (because the checkout overlay never opened locally,
and because there is no way to roll a user back to free afterwards). This epic makes both
journeys drivable, repeatably, by an agent.

**The "user" of this epic is the QA agent, not an end customer.** Every user story below is
written from the perspective of an automated agent driving Chrome, plus the founder reading its
findings file. `/specify` must **not** generate customer-facing stories about paying subscribers —
no end-user-visible behavior changes in this epic except dev-only affordances.

**Lane:** touches `connect-four/server/scripts/` (new rollback tooling), `connect-four/server/`
(two dev-only, `requireLocalhost`-gated endpoints: the rollback endpoint sharing an implementation
module with the CLI script — Settled decision 7 — and the email-seeding endpoint calling the
service-role `auth.admin.updateUserById` — Settled decision 9),
`connect-four/src/components/AuthModal.jsx` + `SettingsScreen.jsx` (dev-only affordance to set an
email on the anonymous QA user — Settled decision 9), `.claude/skills/app-qa/` (references +
procedure), and `docs/`. Low conflict risk with feature lanes; **does** conflict with any
concurrent branch editing the app-qa skill.

**Scope source:** a requirements review conducted 2026-09-07, driven live against the running app
in the `e2e-qa-enablement` worktree. Two of the eight original blockers were resolved during that
review (see *The evidence*); this epic covers the remaining six.

**Sizing:** 4 user stories, ~20 tasks (a floor, not a measured count — the epic_fix pass adds a
server seam for the email affordance, a harvest-source task, and a client-side AC2 reload step, so
treat the true total as ~22–23), server + frontend + DB + QA-harness. All design decisions resolved
by the owner 2026-09-07 (Settled decisions 7–11). D2 landed on the cheap locally-signed
synthetic-event option (~3 tasks) rather than the ~10-task tunnel/simulator option, so the total
stays near the original ~20-task estimate — both prior open decisions are effectively "in scope"
without triggering the ~24-task ceiling. Passes all three speckit gates
(`docs/best_practices_spec_driven_development.md` §"Epic Sizing"). **Full speckit.**

**Deployment prerequisites: NONE.** Verified — `VITE_PADDLE_CLIENT_TOKEN` is already present on
staging and production (`specs/057-mvp-launch-gate/plan.md:335`, per OI-96). This epic is
local-and-dev-only. Do not add a `docs/deployment_steps.md` entry unless a task introduces a real
prod-visible change.

---

## Overview

| # | User story | Primary surface | Why it blocks |
|---|---|---|---|
| **US1** | As the QA agent, I can reset any account to a known-free state so run N+1 is identical to run N | `server/scripts/`, `users` table, Paddle API | Without it the second run silently reports false failures — see *Non-obvious facts* NF1 |
| **US2** | As the QA agent, I can complete a sandbox payment from every checkout CTA and verify the post-payment experience | 5 checkout call sites, Paddle overlay | The whole paid journey is currently unverified |
| **US3** | As the QA agent, I can exercise every login CTA and both of its exits from a clean state | 6 AuthModal call sites | Login CTAs are currently untested as a set |
| **US4** | As the founder, the QA harness's own documentation is true, so an agent does not act on stale facts | `.claude/skills/app-qa/`, `docs/` | Three docs assert a premise now proven false |

---

## The evidence (do not re-derive — this is the whole diagnosis)

All of the following was verified live on 2026-09-07 in the `e2e-qa-enablement` worktree
(API 4799 / Vite 6799). Do not re-investigate; build on it.

1. **The Paddle sandbox client token already existed and was never wired up.**
   `ctkn_01kxsd747gp2d0n3xyb28h602q`, created 2026-07-18, status `active`, named
   *"connect-four local dev (spec 050 US2)"*, description *"Frontend Paddle.js overlay checkout —
   sandbox, VITE_PADDLE_CLIENT_TOKEN for local npm run dev"*. It was minted for exactly this
   purpose and the `.env` line was forgotten.

2. **With the token set, the overlay works locally.** `window.Paddle` is defined,
   `cdn.paddle.com/paddle/v2/paddle.js` loads, and clicking "Become Pro" on `/pricing` opens a
   real **sandbox** checkout (`sandbox-buy.paddle.com`, "Test Mode", $2.99/mo). The `test_` prefix
   correctly routed it to sandbox rather than live.

3. **A browser agent can drive the Paddle overlay.** The chrome-devtools MCP a11y tree penetrates
   the cross-origin iframe: email textbox, country combobox, Continue and Close are all addressable
   uids. This was the load-bearing unknown for the whole epic and it is **resolved yes**.

4. **Therefore the recorded project belief is false.** "Paddle does not work locally
   (owner-confirmed)" appears at `docs/open_issues.md:3779`,
   `specs/057-mvp-launch-gate/spec.md:99`, and `docs/epics/pre-launch-mvp-epic.md:180`, with
   consequential mentions at `docs/deployment_steps.md:371,422`, `docs/open_issues.md:3915,5738`,
   and `specs/057-mvp-launch-gate/quickstart.md:171`. The premise held for seven weeks because a
   fact was recorded once and never re-checked.

5. **The dev sign-in affordance is already universal.** `🛠 Dev: skip auth` lives *inside*
   `AuthModal` (`src/components/AuthModal.jsx:57`), gated on `import.meta.env.DEV`. Every login
   entry point routes through `AuthModal` — `oauth/google` and `/api/auth/anonymous` appear
   nowhere else in `src/`. No task should be generated to "add dev sign-in to each CTA."

---

## Settled decisions (reflect verbatim — do not relitigate)

1. **Google OAuth is out of QA scope.** Owner decision, 2026-09-07: *"The google oauth works, so no
   need to Q&A that."* Additionally it is mechanically untestable from a worktree —
   `AuthModal.jsx:46` hardcodes `http://localhost:3001` in DEV, which reaches the **main
   checkout's** server. Do not build OAuth test tooling.

2. **`🛠 Dev: skip auth` is the only login mechanism the QA exercises.** It yields an
   **anonymous, no-email, free** user. Consequence: the QA verifies *CTA → modal → post-login
   return routing*, never identity or account linking. State this in the findings report rather
   than implying full coverage.

3. **There is no after-payment landing page, and the acceptance criterion must not assume one.**
   Spec 050 moved to an in-app overlay: `successUrl` is deliberately **not** forwarded to
   `Paddle.Checkout.open()`, and `handleCheckoutCompleted` closes the overlay in place
   (`src/lib/useUpgradeCheckout.js`). The correct assertion is: *the overlay closes, the user
   remains on the exact screen whose CTA they clicked, `CheckoutReturnBanner` goes
   `confirming → activated`, and that screen re-renders Pro without a manual reload.*

4. **The dev reset is the standard between-test reset.** `🛠 Dev: clear IndexedDB & sign out`
   (`SettingsScreen.jsx:330` → `handleDevReset` at `:304`) is the only path reaching a genuine
   first-run state. `signOut()` (`ProfileStore.jsx:98`, reachable at `StatsScreen.jsx:161`) leaves
   `localStorage`/IndexedDB intact and is used **only** when the sign-out button itself is the
   subject under test.

5. **Sandbox only.** Never `paddle-live`. Test transactions use Paddle sandbox test cards.

6. **The token value is never committed.** It lives in `connect-four/.env.local` (gitignored).
   `connect-four/.env.example:34` already documents the variable name.

7. **The rollback tool is both a CLI script and a dev-only HTTP endpoint, sharing one
   implementation module.** Owner decision, 2026-09-07 (resolves former D1). The reset logic lives
   in a plain module; it is exposed as a dev-only endpoint gated by `requireLocalhost` (NOT
   `requireAdmin` — that check is a no-op outside `NODE_ENV=production`), giving an agent driving
   Chrome a way to trigger the reset without a shell, plus a thin CLI wrapper over the same module.
   The reset must null `paddle_customer_id`, not just set `tier='free'` (NF1), and must cancel the
   Paddle sandbox subscription per the narrow exception in Settled decision 11 (AC1). It does not
   need to un-seed decision 9's email affordance: the standard reset (Settled decision 4) signs out
   and reloads, and the next `Dev: skip auth` mints a brand-new anonymous auth user and `users` row
   by construction (Evidence 5) — the email is gone because the row is gone, not because rollback
   cleared a field. **AC2's "observable without DevTools" is satisfied by the documented page
   reload after the reset, not by a server-side cache call** — `invalidateEntitlement()` is
   client-only code (`src/lib/entitlement.js:58`) that no server route can reach, and a reload
   discards the module-scoped cache wholesale regardless. Do not add a dev-gated "clear
   entitlement" button; it would be redundant with the required reload.

8. **Webhook-driven downgrades are covered via locally-signed synthetic events.** Owner decision,
   2026-09-07 (resolves former D2). QA tooling POSTs correctly-signed Paddle events at the local
   `POST /api/paddle/webhook`, using `PADDLE_NOTIFICATION_WEBHOOK_SECRET` (present in
   `connect-four/server/.env`; note this is the correct variable name — NOT
   `PADDLE_WEBHOOK_SECRET`) and the route's own verification,
   `paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)`
   (`connect-four/server/paddleProcessor.js:288`). **Binding constraint:** the synthetic payloads
   MUST be harvested from a real Paddle sandbox event, not hand-authored, for each of the three
   transitions at `server/paddleProcessor.js:64-70` (`subscription.updated → paused`,
   `subscription.canceled`, `past_due → no write`) — a hand-written fixture here is the "green test
   that tests your belief" trap (CLAUDE.md). A tunnel (ngrok/cloudflared) and Paddle's webhook
   simulator are explicitly **not** in scope — the simulator still needs a publicly reachable URL
   and collapses into the tunnel option, which was rejected. Accepted residual gap: this tests our
   processor against our idea of Paddle's payload shape; payload drift would pass locally while
   production breaks — a staging concern, not something this epic closes.

   **Harvesting mechanics (owner-resolved, 2026-09-07).** "Harvested, not authored" means: take one
   real Paddle sandbox event payload and re-send it, substituting only a closed allowlist of
   fields — `data.customerId`, `data.id` (subscription id), `event_id`, `occurred_at`, and the
   signature timestamp — with everything else left verbatim. The harness re-signs at send time
   (`webhooks.unmarshal` enforces a timestamp variance window, so a stored signature goes stale).
   The named harvest source is: complete one real sandbox purchase (AC3 already requires one), then
   pull the subscription entity / notification log via the `paddle-sandbox` MCP; the harvested
   payloads are checked into the repo as fixtures so later runs don't re-harvest. Identifying and
   recording the harvest source is an explicit first task of the user story covering AC3a.

9. **The email-bearing checkout branch is covered via a dev-only affordance.** Owner decision,
   2026-09-07 (resolves former D3). A dev-gated control (reusing the existing pattern in
   `AuthModal`/`SettingsScreen`) sets an email on the anonymous QA user, so both checkout branches
   (with/without `customer` in `Paddle.Checkout.open()`) are driven in one run, closing the OI-53
   failure class. **This is not a frontend-only change.** `public.users` has no `email` column
   (NF13), and `req.user.email` — the value the checkout branch reads — comes from the Supabase
   auth user (`server/index.js:547`). Setting it from the browser
   (`supabase.auth.updateUser({email})`) goes through a confirmation round-trip and does not take
   effect immediately, so the affordance is a dev-gated **button plus a `requireLocalhost`
   endpoint** using the service-role `auth.admin.updateUserById(id, { email, email_confirm: true
   })` — the same gating seam as decision 7's rollback endpoint. It interlocks with decision 7, but
   not by un-seeding: Supabase cannot clear an auth user's email back to null. Instead, the
   documented reset (Settled decision 4) signs out and reloads, and the next `Dev: skip auth` mints
   a brand-new anonymous auth user and `users` row (Evidence 5), so run N+1 starts from the
   no-email state by construction. Seeding a real email-bearing user directly in the DB was
   considered and rejected — dev-skip-auth has no "sign in as this specific user" affordance.

10. **One QA account persists across the entire payment CTA sweep.** Owner decision, 2026-09-07
    (resolves former D1). The per-CTA dev reset (Settled decision 4) is used only for the **auth**
    CTA sweep (AC4), which tests routing, not tier. The payment sweep (AC3, AC3a) deliberately
    keeps one account for its whole run, so the second-payment security check
    (`paddleProcessor.js:343-360`) is genuinely exercised and NF1 binds for a reason stated
    explicitly there, rather than reading as a contradiction with decision 4.

11. **QA rollback tooling may cancel Paddle sandbox subscriptions unattended, under a narrow
    written exception to `CLAUDE.md` §"Paddle integration."** Owner decision, 2026-09-07 (resolves
    former D2). The confirm-before-destructive-action rule governs calls to the `paddle-sandbox` /
    `paddle-live` MCP server; it does not extend to the Paddle **SDK** called directly from code.
    The exception: sandbox only, only subscriptions whose customer id matches the QA user's own
    row, cancellation performed via the Paddle SDK inside the rollback module (never the MCP
    server), and a `--yes` flag required for non-interactive runs. Because no subscription id is
    stored anywhere (`users` has only `paddle_customer_id`; no migration adds a subscription
    column — NF14), the rollback module must list the customer's subscriptions through the Paddle
    API **before** nulling `paddle_customer_id` — nulling it first makes the id unrecoverable.

---

## Non-obvious facts (verified at source — the spec/plan must respect these)

**NF1 — Rollback must null `paddle_customer_id`, not just `tier`. This is the highest-risk fact in
the epic.** `server/paddleProcessor.js` rejects any later `transaction.completed` whose claimed
`customData.app_user_id` already has an *established* `paddle_customer_id` differing from the
transaction's customer: it logs, returns `{ securityRejected: true }`, and **skips the tier write**.
A rollback that only sets `tier='free'` leaves `paddle_customer_id` populated; run 2's checkout
mints a new Paddle customer, mismatches, and is silently rejected — so run 2 reports "payment is
broken" while the app is fine. This failure mode corrupts results rather than failing loudly. This
fact binds specifically **because** the payment sub-run deliberately retains one account across the
checkout sweep (Settled decision 10) — it does not apply to the auth sweep, which resets per CTA.

**NF2 — A DB tier write is not observable by the client.** The entitlement cache is module-scoped
(not account-scoped) and a direct DB write never calls `invalidateEntitlement()`. Rollback means
*the app renders free again*, not *the row says free*. Today that requires a hard reload.

**NF3 — `set-tier.js`'s documented path is wrong, and it can never restore `paddle_customer_id`
(corrected 2026-09-08, tasks_critique B2 — re-read at source).** It lives at
`connect-four/server/scripts/set-tier.js` — **not** `scripts/set-tier.js` as
`.claude/skills/app-qa/references/environment.md` states. The original claim that it is
"unusable for the anonymous dev-skip-auth user" because it looks users up **by email** is only
**conditionally** true: once Settled decision 9's email-seeding affordance has run on an account,
`set-tier.js`'s lookup (`set-tier.js:19-24`, the admin auth API) succeeds for that account too.
What remains true regardless, and is the load-bearing half: `set-tier.js`'s only write is
`.from('users').update({ tier })` (`set-tier.js:27-28`) — it **never** writes
`paddle_customer_id`. So even with an email seeded, `set-tier.js` cannot re-establish a paid state
the downgrade fixtures or a post-reset fixture replay can act on. `specs/058-e2e-qa-enablement/`'s
FR-027 (`setQaAccountPaidState`, tasks_critique B2) closes this gap with a DB-only write that sets
`tier` and `paddle_customer_id` together, addressed by user id.

**NF4 — The webhook is the primary tier mirror, and it cannot reach localhost.**
`POST /api/paddle/webhook` (`server/paddleRoutes.js:89`) owns the lifecycle transitions enumerated
at `server/paddleProcessor.js:64-70`: `subscription.updated → paused → tier:'free'`,
`subscription.canceled → tier:'free'`, `past_due → no write`. Paddle sandbox cannot deliver to
`localhost`, so locally only the synchronous `verify-transaction` fallback runs and every downgrade
path would otherwise be unexercised. **Solved by Settled decision 8:** locally-signed synthetic
events, POSTed at the local endpoint with a real secret and harvested-not-authored payloads, drive
all three transitions without needing localhost to be reachable from Paddle.

**NF5 — The no-email checkout branch was the only one QA could take, without further work.**
`useUpgradeCheckout.js` omits `customer` entirely when there is no email, because passing a falsy
email threw *synchronously* and was swallowed by `UpgradeModal`'s `catch{}` — no overlay, no
console error, no visible failure (OI-53). The email-bearing branch had already produced one silent
production-class bug. **Solved by Settled decision 9:** the dev-only affordance to set an email on
the anonymous QA user means both branches are now covered.

**NF6 — A fresh worktree cannot run the app at all.** It has no `node_modules` (needs
`npm install`) and no `.env` files (gitignored; must be copied from the main checkout). Encountered
and worked around during this review; `app-qa/references/environment.md` documents neither.

**NF7 — Rate limits break long autonomous runs.** 120 req/min per IP, shared with the browser
session. A 429 returns **plain text**, which surfaces as an opaque JSON decode error with no server
log line.

**NF8 — Call-site inventories (locate by symbol; line numbers drift). `DeepRevealPane.jsx`'s two
call sites are excluded — deep reveal is out of QA scope by owner decision (see `NOT included`).**
- 6 `AuthModal` sites: `HomeScreen.jsx:156`, `StatsScreen.jsx:169`, `SagaScreen.jsx:329`,
  `MistakeDetailScreen.jsx:551`, `OnboardingMissionScreen.jsx:111`,
  `OnboardingImportOfferScreen.jsx:119`.
- 5 checkout sites: `SettingsScreen.jsx:47`, `SetPickerScreen.jsx:46`, `SagaScreen.jsx:154`,
  `PostSetSummaryScreen.jsx:22`, and `PricingScreen` (routed via `screenRegistry.jsx:44`).

**NF9 — `POST /api/paddle/portal` exists and is part of the paid journey.**
`server/paddleRoutes.js:105`, gated on `req.user.paddle_customer_id`; returns 400 without one.

**NF10 — Dead `successUrl`/`returnPath` machinery may still exist.** The server computes it and
`PostSetSummaryScreen.jsx:22` still passes `/setpicker`, but the UI ignores it (Settled decision 3).
**UNVERIFIED** whether it is fully dead — the plan must open the server path before specifying any
removal, and removal is optional cleanup, never a QA failure.

**NF11 — Tier writes are customer-keyed, and a mistargeted write fails silently.** `writeTier`
(`server/paddleProcessor.js:167-175`) does `query.eq('paddle_customer_id', customerId)`, and both
subscription-downgrade branches call it that way (`:391`, `:399`) — never by `userId`. A payload
whose `customerId` does not match the QA row's current `paddle_customer_id` therefore updates zero
rows; Supabase returns no error on a zero-row UPDATE, so the webhook route answers 200
`{received:true, handled:true}` while nothing changed. This is why Settled decision 8's harvested
payloads need the `data.customerId` substitution.

**NF12 — `payment_events.event_id` is UNIQUE, so a replayed synthetic event is a silent no-op.**
The insert happens before any tier write; a duplicate `event_id` hits Postgres error `23505` and
short-circuits to `{ handled: false, eventType: 'duplicate' }` (`server/paddleProcessor.js:302-306`)
without touching `users`. The same harvested payload sent on run N+1 therefore does nothing unless
`event_id` is re-stamped per send (Settled decision 8) — a bare "replay the same fixture" would
silently break AC1's idempotence requirement.

**NF13 — `public.users` has no `email` column; the checkout branch reads the Supabase auth user,
not the profile row.** Live column list: `id, device_uuid, tier, deep_reveal_count,
deep_reveal_reset_at, paddle_customer_id, created_at, updated_at, streak_count, last_active_date,
sparring_record, papergames_id, last_import_at, onboarding_status` — no `email`. `req.user.email`
is set from the Supabase auth user's own record (`server/index.js:547`,
`data.user.email` from `authClient.auth.getUser(token)`), which is why Settled decision 9's
affordance must write through the auth admin API rather than the `users` table.

**NF14 — No Paddle subscription id is stored anywhere.** `users` carries only
`paddle_customer_id`; no migration adds a subscription-id column. Settled decision 11's rollback
module must therefore look up the customer's subscriptions through the Paddle API before nulling
`paddle_customer_id` — nulling it first makes the subscription unrecoverable for cancellation.

---

## Acceptance criteria (epic-level)

**AC1 — Idempotent runs.** The QA suite runs twice back-to-back from the same starting state and
produces the same pass/fail per CTA. Explicitly: after rollback, `users.tier = 'free'` **and**
`users.paddle_customer_id IS NULL` **and** every subscription in a live-or-live-adjacent status
(`active`, `trialing`, `past_due`, `paused`) is canceled immediately, under Settled decision 11's
narrow exception and NF14's lookup-before-null ordering (NF1). Rollback does **not** clear
`payment_events` rows: NF15 establishes the table has no per-user/per-customer column (a narrow
delete has nothing to key on), and a purchase writes a second
`upgrade_completed_track:${transactionId}` ledger row a table-wide delete would miss anyway.
Replayability for the payment sweep (Settled decision 10) instead comes from FR-017/FR-018's
per-send `event_id` re-stamping on the synthetic webhook sender: a harvested event (Settled
decision 8) gets a fresh `event_id` on every send, so it is not deduplicated as a repeat on run N+1
even though its `payment_events` row from run N was never deleted.

**AC2 — Rollback is observable.** After rollback plus the documented page reload, a previously-Pro
screen renders free-tier UI with no manual DevTools intervention (NF2). The reload — not a
server-side cache call — is the mechanism: `invalidateEntitlement()` is client-only code no server
route can reach (Settled decision 7), and a reload discards the module-scoped cache wholesale.

**AC3 — Payment coverage.** All 5 checkout CTAs (NF8) are driven; at least one completes a real
sandbox transaction and satisfies Settled decision 3's assertion verbatim. `/api/paddle/portal`
(NF9) is reached post-purchase, and its 400 path renders something sensible rather than a dead
button. Both checkout branches are exercised: no-email (the default anonymous QA user) and
email-bearing (via the dev-only affordance from Settled decision 9), closing the OI-53 failure
class end-to-end.

**AC3a — Downgrade lifecycle coverage (NF4, Settled decision 8).** For each of the three
transitions at `server/paddleProcessor.js:64-70` (`subscription.updated → paused`,
`subscription.canceled`, `past_due → no write`), a locally-signed synthetic event — using a payload
harvested from a real Paddle sandbox event, not hand-authored — is POSTed to
`POST /api/paddle/webhook` and the expected effect (tier flip, or no write for `past_due`) is
verified against the `users` row.

**AC4 — Auth coverage.** All 6 AuthModal CTAs (NF8) are driven through **both** exits: dismiss
(returns to origin, no stranded state) and complete (lands on the destination the CTA promised).
The documented reset (Settled decision 4) runs before each.

**AC5 — One command, one findings file.** The QA run is startable with a single documented command
and writes one stamped findings file, per the app-qa skill's existing convention.

**AC6 — The harness's docs are true.** Every stale fact in NF3, NF6, NF7 is corrected in
`.claude/skills/app-qa/references/environment.md`, and the four locations in Evidence 4 are
retracted.

**AC7 — No end-user-visible change.** Every new affordance is dev-gated. `npm run test:fast` is
green (it is green on this branch's baseline).

---

## NOT included (so scope cannot grow silently)

- Real Google OAuth testing (Settled decision 1).
- Any `paddle-live` interaction.
- Fixing bugs the QA run *discovers* — this epic delivers the **ability** to run the QA. Findings
  become their own tasks/OI entries afterwards.
- Rewriting the app-qa skill's core methodology; only its stale facts and the tier-journey
  procedure change.
- Multi-account or concurrent-session testing.
- Changes to production tier/entitlement logic. Detectors, guards and grading stay untouched.
- A tunnel (ngrok/cloudflared) or Paddle's webhook simulator for downgrade-lifecycle testing
  (Settled decision 8) — locally-signed synthetic events replace both; the simulator still needs a
  publicly reachable URL and would have collapsed into the tunnel option.
- Seeding an email-bearing user directly in the database (Settled decision 9) — dev-skip-auth has
  no "sign in as this specific user" affordance, so this would not have been reachable anyway.
- The deep-reveal surface (`DeepRevealPane`) and its auth and checkout CTAs. Owner decision,
  2026-09-07: *"the deep reveal is OUT OF SCOPE."* No task may drive `DeepRevealPane.jsx:460`
  (AuthModal) or `DeepRevealPane.jsx:62` (checkout) — see NF8's now-6-and-5 inventories. Rollback
  needs no special handling for `deep_reveal_count` / `deep_reveal_reset_at` beyond whatever a
  fresh account already gives.

### Deliberately excluded from the pipeline — do these directly, before or alongside

Per `docs/best_practices_spec_driven_development.md` §"When to skip speckit", these are
mechanically obvious, single-purpose edits with no design content. Running them through
specify→plan→tasks costs more than doing them:

1. Retract the four "Paddle does not work locally" locations (Evidence 4). ~3 file edits.
2. Add `VITE_PADDLE_CLIENT_TOKEN` to the main checkout's `connect-four/.env.local` (already done in
   the `e2e-qa-enablement` worktree).
3. Document the worktree bootstrap (NF6) in `app-qa/references/environment.md`.

Note the one that must **stay** in the epic, even though it is now unblocked: the rest of
`environment.md`'s corrections (NF3's tier-flip snippet) can now be written, since Settled
decision 7 fixes the rollback tool's shape — but writing accurate documentation for that tool still
depends on US1's actual design output (the module's CLI/endpoint interface), so it stays pipeline
work rather than becoming a fourth direct edit above.

---

## Authoritative sources of truth

- `CLAUDE.md` §"Paddle integration" — sandbox/live derives from **key prefix**, never `NODE_ENV`;
  always check the `paddle-docs` MCP before writing Paddle code; confirm before destructive
  sandbox changes.
- `CLAUDE.md` §"Staging and production databases are disposable (pre-launch)" — prefer
  regenerate-from-scratch over surgical repair; no live-data choreography needed.
- `CLAUDE.md` §"Running tests" — `npm run test:fast`, never `npm test`.
- `docs/architecture/worktree-conventions.md` — `eval "$(./worktree-ports.sh)"` before starting or
  killing any server; never a bare port, never `pkill node`.
- `docs/architecture/server-conventions.md` §"PaymentProcessor Seam" — the documented trust model
  behind NF1.
- `docs/architecture/api-conventions.md` — before adding the dev-only rollback endpoint (Settled
  decision 7).
- `.claude/skills/app-qa/SKILL.md` + `references/environment.md` — the harness being repaired.
- `docs/open_issues.md` — OI-53 (NF5), OI-96 (the token premise), OI-54.
- `specs/050-paddle-checkout-migration/` and `specs/057-mvp-launch-gate/` — the overlay migration
  and the launch gate that inherited the false premise.
- Memory: `feedback_verify_at_the_source_layer`, `project_paddle_integration`,
  `project_entitlement_client_cache_traps`, `project_api_rate_limit_breaks_bulk_scripts`,
  `project_app_qa_setup_gotchas`, `feedback_never_print_secrets`.
