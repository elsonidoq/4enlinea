## Blocking issue 1 — Settled decision 7's rationale is factually wrong (`invalidateEntitlement()` is browser-side)
Answer: Accept recommendation (auto-applied — no alternative). Rewrite decision 7's parenthetical to
DROP the "so the server can call `invalidateEntitlement()` in the same request" claim. The endpoint
still stands (an agent driving Chrome can hit it without a shell) — only the justification was
wrong. Wherever the epic names a cache reset, it must say **`clearEntitlement()`**
(`src/lib/entitlement.js:77`), never `invalidateEntitlement()` (`:58`), because the latter only
zeroes the TTL, keeps `lastKnownGood`, and its fail-open branch (`entitlement.js:66-75`) can re-pin
a stale `entitled: true` after a downgrade.

## Blocking issue 1 follow-on — what mechanism satisfies AC2?
Answer: **Documented page reload.** After calling the reset, the QA agent reloads the page; a reload
discards the module-scoped cache wholesale, and this is already how the existing dev reset works
(`SettingsScreen.jsx handleDevReset` ends in `window.location.reload()`). Do NOT add a dev-gated
"clear entitlement" button — rejected as redundant with the reload. AC2 must state the reload as an
explicit, required step of the documented procedure so the agent cannot omit it.

## Blocking issue 2 — synthetic events cannot target the QA user or be replayed
Answer: Accept recommendation (auto-applied — no alternative). Add a paragraph under Settled
decision 8 stating:
(i) the **closed allowlist** of fields the harness may substitute into a harvested payload —
    `data.customerId`, `data.id` (subscription id), `event_id`, `occurred_at`, and the signature
    timestamp — everything else verbatim. This preserves "harvested, not authored" while making the
    payload usable.
(ii) the harness **re-signs at send time** (`webhooks.unmarshal` enforces a timestamp variance
     window, so a stored signature goes stale).
(iii) a **named harvest source**: complete one real sandbox purchase (AC3 already requires one),
      then pull the subscription entity / notification log via the `paddle-sandbox` MCP. The
      harvested payloads are checked into the repo as fixtures so later runs do not re-harvest.
      Identifying and recording the harvest source is an explicit FIRST task of the user story
      covering AC3a.
Also record the two mechanical facts that forced this, verbatim, as Non-obvious facts: tier writes
are **customer-keyed** (`writeTier` at `paddleProcessor.js:167-175`, called at `:391`/`:399`) and a
zero-row UPDATE returns no error, so a mistargeted event answers 200 `{received:true,handled:true}`
while changing nothing; and `payment_events.event_id` is UNIQUE with the insert before any tier
write, so a `23505` short-circuits to `{handled:false, eventType:'duplicate'}` (`:302-306`) and a
replayed payload is a silent no-op.

## Blocking issue 3 — email seeding is not a frontend-only change
Answer: Accept recommendation (auto-applied — no alternative). Extend Settled decision 9: the
affordance is a dev-gated **button plus a `requireLocalhost` endpoint** using the service-role
`auth.admin.updateUserById(id, { email, email_confirm: true })` — the browser-side
`supabase.auth.updateUser({email})` path needs a confirmation round-trip and does not take effect
immediately. Add the server file to the Lane's file list.
Record as a Non-obvious fact: `public.users` has **no `email` column** (live column list:
`id, device_uuid, tier, deep_reveal_count, deep_reveal_reset_at, paddle_customer_id, created_at,
updated_at, streak_count, last_active_date, sparring_record, papergames_id, last_import_at,
onboarding_status`); `req.user.email` comes from the Supabase **auth** user
(`server/index.js:547`).
Replace decision 7's "rollback clears any dev-seeded email" — Supabase cannot clear an auth user's
email back to null, so that was unimplementable. State instead: the documented dev reset signs out
and reloads, after which `Dev: skip auth` calls `authClient.auth.signInAnonymously()`
(`index.js:507`) and mints a brand-new auth user and `users` row, so the email is gone by
construction. Rollback's job on the email is therefore **none, provided the reset ran** — say this
explicitly so the spec does not invent an un-set path.

## Decision D1 — one QA account throughout, or a fresh account per CTA?
Answer: **One account for the payment sweep.** One persistent QA account across all the checkout
CTAs; the per-CTA dev reset (Settled decision 4) is retained only for the **auth**-CTA sweep (AC4),
which tests routing rather than tier. NF1 therefore genuinely binds, and rollback must:
null `paddle_customer_id`, cancel the sandbox subscription, and delete the run's `payment_events`
rows so the synthetic events are replayable on run N+1.
Add one sentence to NF1 saying it binds **because** the payment sub-run deliberately retains one
account — this resolves the epic's internal contradiction between NF1 and Settled decision 4, which
must no longer read as conflicting.

## Decision D2 — may the QA tooling cancel Paddle sandbox subscriptions unattended?
Answer: **Narrow written exception.** Sandbox only; only subscriptions whose customer id matches the
QA user's row; cancellation performed via the Paddle **SDK inside the rollback module**, NOT via the
`paddle-sandbox` MCP server (the MCP server is what `CLAUDE.md` §Paddle's confirmation rule actually
governs); a `--yes` flag is required for non-interactive runs. Write this exception into the epic
explicitly so it does not read as a violation of the standing rule.
Record the ordering constraint the epic never stated: **no subscription id is stored anywhere**
(`users` has only `paddle_customer_id`; no migration adds a subscription column), so the tool must
list the customer's subscriptions through the Paddle API **before** nulling `paddle_customer_id` —
null it first and the id is unrecoverable.

## Owner directive (new, outside the critique) — DEEP REVEAL IS OUT OF SCOPE
Owner, 2026-09-07: *"Also, the deep reveal is OUT OF SCOPE"*. Apply throughout:
- Remove `DeepRevealPane.jsx:460` from NF8's AuthModal call-site inventory: **7 sites become 6**
  (`HomeScreen.jsx:156`, `StatsScreen.jsx:169`, `SagaScreen.jsx:329`, `MistakeDetailScreen.jsx:551`,
  `OnboardingMissionScreen.jsx:111`, `OnboardingImportOfferScreen.jsx:119`).
- Remove `DeepRevealPane.jsx:62` from NF8's checkout call-site inventory: **6 sites become 5**
  (`SettingsScreen.jsx:47`, `SetPickerScreen.jsx:46`, `SagaScreen.jsx:154`,
  `PostSetSummaryScreen.jsx:22`, and `PricingScreen` routed via `screenRegistry.jsx:44`).
- Update AC3 ("all 6 checkout CTAs") -> 5, and AC4 ("all 7 AuthModal CTAs") -> 6. Update the
  Overview table's US2/US3 rows and any other count in the epic that says 6 or 7 for these sweeps.
  Search the whole epic for stale counts; do not leave one behind.
- Add a bullet to `NOT included`: the deep-reveal surface (`DeepRevealPane`) and its auth and
  checkout CTAs are out of QA scope by owner decision; no task may drive them.
- Rollback need not special-case the `deep_reveal_count` / `deep_reveal_reset_at` columns beyond
  whatever a fresh account already gives — do not add deep-reveal state handling.
