# Quickstart: End-to-End QA Enablement

## Prerequisites (worktree bootstrap, NF6)

```bash
cd connect-four && npm install                 # no node_modules in a fresh worktree
cp <main-checkout>/connect-four/.env.local connect-four/.env.local   # gitignored, must be copied
cp <main-checkout>/connect-four/server/.env connect-four/server/.env # gitignored, must be copied
```

Verify `connect-four/.env.local` has `VITE_PADDLE_CLIENT_TOKEN=test_...` (Evidence 1/2 — already
true in this worktree) and `connect-four/server/.env` has `PADDLE_NOTIFICATION_WEBHOOK_SECRET`
(Settled decision 8).

## Start the app

```bash
eval "$(./worktree-ports.sh)"   # from repo root — exports $API_PORT/$VITE_PORT, never hardcode
cd connect-four && npm run dev  # or the two-process app-qa launch pattern (references/environment.md)
```

## Run the QA suite (AC5)

Single documented command, per the app-qa skill's existing convention:

```bash
/app-qa tier-journey   # or the feature-verification invocation once tasks.md names the exact area
```

Writes one stamped findings file: `agentic_QA_<YYYY-MM-DD-HHMM>.md` at repo root (app-qa
`SKILL.md`'s existing convention, step 6 of its setup checklist).

## Reset between runs (US1)

```bash
# via the CLI wrapper
cd connect-four && node --env-file=server/.env server/scripts/qa-rollback-cli.js <userId> --yes

# via the dev-only HTTP endpoint (what a Chrome-driving agent uses)
curl -sX POST http://localhost:$API_PORT/api/admin/qa-rollback \
  -H 'Content-Type: application/json' -d '{"userId":"<userId>"}'
```

Then reload the page in Chrome (Settled decision 7 — this IS the observability mechanism, no
server-side cache call exists).

## Drive the downgrade lifecycle (US2/AC3a)

```bash
cd connect-four && node --env-file=server/.env server/scripts/send-synthetic-webhook.js \
  --fixture subscription-updated-paused --customer-id <paddleCustomerId>
```

Repeat for `subscription-canceled`. (`subscription-updated-past-due` is documented in
`server/scripts/webhook-fixtures/README.md` as BLOCKED — Paddle's sandbox dunning card did not
decline on a forced early renewal when harvested, so that fixture file does not exist; do not
attempt this invocation until it is harvested.) Each re-stamps a fresh `event_id` (NF12) so
repeated sends across runs are not silently suppressed as duplicates.

## Re-establish a paid state (US2, `setQaAccountPaidState`)

`set-tier.js` can flip the `tier` column but can never restore `paddle_customer_id` (see
`references/environment.md` "Flip tier"). To recreate the DB state a real checkout would have
left behind — both `tier` and `paddle_customer_id` together — use the dedicated endpoint:

```bash
curl -sX POST http://localhost:$API_PORT/api/admin/qa-set-paid-state \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<userId>","paddleCustomerId":"<paddleCustomerId>"}'
```

`paddleCustomerId` must not already be assigned to a different account (`users.paddle_customer_id`
is unique) — reusing another QA account's id fails with a 500 `duplicate key value violates
unique constraint` (verified 2026-09-08). Use a fresh/unused value per account.

## Set an email on the QA account (US2 branch coverage, Settled decision 9)

Click the dev-only "Set QA email" button in Settings (`SettingsScreen.jsx`, research.md D3), or:

```bash
curl -sX POST http://localhost:$API_PORT/api/admin/qa-set-email \
  -H 'Content-Type: application/json' -d '{"userId":"<userId>","email":"qa-agent@example.test"}'
```

`qa-agent@example.test` is a hardcoded literal (both the button and this example) — Supabase auth
emails are unique, and `qa-rollback` does NOT clear an account's email (documented in
`references/environment.md`'s "What `resetQaAccount` actually does"). If a prior QA run already
claimed this address on a *different* account, this call 500s with `Error updating user`
(verified 2026-09-08). Use a distinct email (e.g. append a run-specific suffix) if you hit this.
