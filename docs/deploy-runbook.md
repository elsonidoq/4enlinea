# Deploy Runbook

## Pending Pre-Staging Checks

Checks that must be confirmed before the next staging/production sign-off, with a named owner and
target date (not a generic "pending"). This repo has no separate `docs/deployment_steps.md` file —
this section is the equivalent home for that requirement (spec `053`/Epic 7 FR-014c).

- **Coach onboarding-greeting real-browser audibility (EN + ES)** — `staging_checks.md:495`,
  `docs/open_issues.md` OI-21. Requires a human in a real (non-automation) desktop browser, clean
  incognito session, confirming the coach greeting audibly plays on first interaction after the
  first-run auto-route lands on `OnboardingMissionScreen`, in both languages. Not yet performed as of
  2026-08-01 (no human available this session). **Owner: Pablo (repo owner). Target: 2026-08-08.**
  Does not block OI-21's closeout (the design question — accept first-interaction playback — is
  already resolved) or any other part of spec `053`.

## Production Deploy

### Prerequisites

- Railway CLI installed (`npm install -g @railway/cli`) or access to the Railway dashboard.
- Postgres 15 client installed locally (`psql`, `pg_dump`). Check the Supabase project settings for the current Postgres server version; the local client major version must match to avoid `server version mismatch` errors during `pg_dump`.
- Access to the production Supabase project (session-mode pooler URL, port 5432).
- Access to the staging Supabase project (session-mode pooler URL, port 5432).

### Environment Variables

All variables must be set in each Railway environment (staging and production) independently:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Session-mode pooler URL, port 5432, `sslmode=no-verify` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `VITE_SUPABASE_URL` | Supabase project URL (build-time — baked into bundle) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (build-time — baked into bundle) |
| `FRONTEND_URL` | Deployed Railway URL (runtime — can be set after first deploy) |
| `OPENAI_API_KEY` | Optional for staging; 503 returned if absent |
| `OPENAI_MODEL` | Required alongside OPENAI_API_KEY |
| `ANTHROPIC_API_KEY` | Optional; annotation falls back to template text |
| `STRIPE_SECRET_KEY` | Optional for staging |
| `STRIPE_MONTHLY_PRICE_ID` | Optional for staging |
| `STRIPE_ANNUAL_PRICE_ID` | Optional for staging |
| `STRIPE_WEBHOOK_SECRET` | Optional for staging |
| `SENTRY_DSN` | Optional |
| `PORT` | Auto-set by Railway; no manual config needed |

**Critical timing note**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are build-time variables — Vite bakes them into the compiled frontend bundle. They MUST be set in Railway before the first build. `FRONTEND_URL` is a runtime variable read by the server process at startup — it can be set (or corrected) after deploy; doing so triggers only a container restart, not a full rebuild.

### One-Time Production Baseline

This procedure bootstraps the `schema_migrations` ledger table on the existing production database without re-executing any migration SQL. It must be run from the operator's local machine.

#### 1. Schema Verification Before Baseline

Before running `--baseline`, verify that the production database's actual schema matches what the on-disk migration files are expected to have created:

```bash
# List all tables in production
psql "$PROD_DATABASE_URL" -c "\dt"
```

Spot-check key columns and cross-reference with the migration files in `server/migrations/`. If any mismatch is found (e.g., a table that should exist is missing, or a column differs from what a migration file creates), reconcile the discrepancy before proceeding. **Do not run `--baseline` against a schema that diverges from the migration files.**

#### 2. Production Baseline Command

```bash
cd connect-four
DATABASE_URL=<prod-session-mode-url> node server/migrate.js --baseline
```

This records all migration filenames present on disk into `schema_migrations` without executing any SQL. The output should read:

```
Baseline complete: N file(s) recorded in schema_migrations.
```

#### 3. Verify Baseline

```bash
DATABASE_URL=<prod-url> node server/migrate.js
```

The output should read:

```
0 pending migrations. Nothing to apply.
```

If any pending migrations are listed, investigate before proceeding — this indicates a mismatch between the database schema and the migration files.

#### 4. Trigger Railway Production Deploy

Once schema verification and baseline are complete, trigger the production deploy via the Railway dashboard. The start command (`node server/migrate.js && node server/index.js`) will run `migrate.js` first — it will find 0 pending migrations (all filenames already in the ledger) and exit 0, then `index.js` will start.

---

## Staging Bootstrap

### Overview

This section covers bootstrapping a fresh staging environment: provisioning a new Supabase project, running all migrations from scratch, configuring auth redirect URLs, importing puzzle data from production, and running the smoke test.

### 1. Provision Staging Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project on the **free tier**.
2. Wait for provisioning to complete (~2 minutes).
3. From **Settings → Database**, collect:
   - **Project URL** (used for `SUPABASE_URL` and `VITE_SUPABASE_URL`)
   - **Anon key** (used for `VITE_SUPABASE_ANON_KEY`)
   - **Service role key** (used for `SUPABASE_SERVICE_ROLE_KEY`)
   - **Session-mode pooler URL** (used for `DATABASE_URL`) — choose the **Session mode** tab (port 5432), copy the URI, append `?sslmode=no-verify` if not already present

### 2. Configure Railway Environments

The Railway project should already have two environments: `staging` and `production`.

Set the following env vars in **each** environment before the first build:

**Required on both staging and production** (app will not start or will serve broken pages without these):
- `DATABASE_URL` — session-mode pooler URL for that environment's Supabase project, port 5432, `sslmode=no-verify`
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only)
- `VITE_SUPABASE_URL` — Supabase project URL (build-time — baked into the frontend bundle)
- `VITE_SUPABASE_ANON_KEY` — anon key (build-time — baked into the frontend bundle)

**Omit `FRONTEND_URL` and `PORT` at this stage** — Railway auto-sets `PORT`; `FRONTEND_URL` requires the deployed domain (not yet known).

**Optional for staging** (app degrades gracefully to 503 on affected endpoints if absent; staging smoke test does not exercise these paths):
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `SENTRY_DSN`

### 3. First Staging Deploy

Trigger the first Railway deploy for the staging environment (via Railway dashboard or `railway up --environment staging`).

The build phase (controlled by `connect-four/railpack.json`) will:
1. Railpack installs `g++`, `gcc`, and `make` via apt
2. Compile the c4solver binary for Linux (`cd ../solver-src && make`)
3. Run `npm run build` (Vite bundles the frontend)

The start phase will:
1. `migrate.js` runs in normal mode against the empty staging DB — all 39 migrations apply in order, each inside its own transaction
2. `index.js` starts the HTTP server

After the deploy completes, Railway assigns a stable domain (e.g., `myapp.up.railway.app`). Note this domain.

---

## FRONTEND_URL & Auth Redirect Configuration

Once the Railway domain is known for each environment:

### 1. Set FRONTEND_URL

In each Railway environment, set `FRONTEND_URL=https://<domain>` (e.g., `https://myapp.up.railway.app`). This is a **runtime** variable — it triggers a container restart, not a full rebuild.

### 2. Configure Supabase Auth Redirect URLs

For **each** environment's Supabase project:

1. Go to **Supabase Dashboard → Authentication → URL Configuration**
2. Add the environment's `FRONTEND_URL` to the **Redirect URLs** list
3. Save

**Without this step, magic-link sign-in fails.** The redirect URL must be explicitly allowlisted in Supabase Auth (see `bug_auth_magic_link_redirect.md`).

### 3. Redeploy

Trigger a Railway redeploy (restart only — no rebuild required since `FRONTEND_URL` is runtime) for each environment.

---

## Puzzle Data Import & Smoke Test

### Prerequisites

- **Postgres 15 client** installed locally (`psql`, `pg_dump`). Check the Supabase project settings for the current server version; the local client major version must match to avoid `server version mismatch` errors during `pg_dump`.

### Export Puzzles from Production

```bash
pg_dump "$PROD_DATABASE_URL" \
  --data-only \
  --table=puzzles \
  --no-acl --no-owner \
  -f puzzles_export.sql
```

`$PROD_DATABASE_URL` must use the **session-mode pooler** (port 5432) with `sslmode=no-verify`. The transaction-mode pooler (port 6543) breaks `pg_dump`.

### Import Puzzles into Staging

```bash
psql "$STAGING_DATABASE_URL" -f puzzles_export.sql
```

`$STAGING_DATABASE_URL` must also use the session-mode pooler.

### Smoke Test Checklist

1. Load the staging URL in a browser
2. Sign in via magic link (check staging Supabase dashboard → Authentication → Users if the link doesn't arrive)
3. Navigate to a challenge or sparring game
4. Complete one puzzle
5. Confirm no errors in the browser console

### Environment Isolation Check

1. Complete a puzzle in the staging environment
2. Check the staging Supabase dashboard → `puzzle_attempts` table — the row should be present
3. Check the production Supabase dashboard → `puzzle_attempts` table — the row must be **absent**
4. Repeat the reverse check (write in production, verify absent in staging)

This verifies that staging and production databases are fully isolated (FR-010, SC-002).

---

## Environment Variable Isolation

### Per-Environment Variable Checklist

| Variable | Required for staging | Required for production | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | Session-mode pooler (port 5432), `sslmode=no-verify` |
| `SUPABASE_URL` | ✅ | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | Service role key |
| `VITE_SUPABASE_URL` | ✅ | ✅ | Build-time — baked into bundle |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ | Build-time — baked into bundle |
| `FRONTEND_URL` | ✅ | ✅ | Runtime — set after deploy |
| `PORT` | Auto | Auto | Railway auto-sets |
| `OPENAI_API_KEY` | Optional | ✅ | 503 if absent |
| `OPENAI_MODEL` | Optional | ✅ | Required alongside OPENAI_API_KEY |
| `ANTHROPIC_API_KEY` | Optional | ✅ | Falls back to template text if absent |
| `STRIPE_SECRET_KEY` | Optional | ✅ | Payments |
| `STRIPE_MONTHLY_PRICE_ID` | Optional | ✅ | Payments |
| `STRIPE_ANNUAL_PRICE_ID` | Optional | ✅ | Payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | ✅ | Webhook verification |
| `SENTRY_DSN` | Optional | Optional | Error tracking |

### Critical: DATABASE_URL Pooler Type

`DATABASE_URL` **MUST** use the Supabase **session-mode pooler** (port **5432**) with `sslmode=no-verify`. The connection is still SSL-encrypted; `no-verify` skips certificate chain validation which is necessary because Supabase's pooler uses self-signed certificates. (`sslmode=require` triggers strict certificate verification in the `pg` driver v8.21+, which fails against Supabase poolers.)

The **transaction-mode pooler** (port **6543**) is **forbidden** because:
- It breaks multi-statement transactions (each statement may run on a different connection)
- `pg_dump` does not work with it

Example correct format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=no-verify
```

### Build-Time vs Runtime Variables

- **Build-time** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`): Must be set in Railway **before** the first build. Vite bakes these into the compiled JS bundle. Changing them later requires a full rebuild.
- **Runtime** (all other variables): Read by the server process at startup. Can be updated without a rebuild — Railway triggers a container restart.

### Isolation Verification

1. Write a test row in the staging app (e.g., complete a puzzle)
2. Verify the row appears in the staging Supabase dashboard
3. Verify the row is **absent** from the production Supabase dashboard (SC-002)
4. Repeat the reverse check

---

## Promote Staging → Production (Steady-State Deploy Cycle)

This is the recurring deploy flow used for **all future feature deploys** — not just the one-time bootstrap.

### 0. Branch → environment mapping (the deploy trigger)

**Each environment deploys from one specific branch. Pushing to that branch IS the deploy trigger.**

| Environment | Branch | URL |
|---|---|---|
| **Staging** | **`stagging`** | `https://staging.decodec4.xyz/` |
| **Production** | **`main`** | `https://decodec4.xyz/` |

⚠️ **`stagging` is spelled with a doubled `g`. That is the real branch name, not a typo in this
document — do not "correct" it to `staging`.** The environment, the URL and the Railway environment
are all spelled `staging` with one `g`; only the **branch** is `stagging`. Pushing to `staging` will
create a new branch that deploys nowhere and produce no error.

**Feature branches do not deploy anywhere.** Work is deployed by merging it into `stagging` (for
staging) or `main` (for production) and pushing — corrected 2026-08-04; this section previously said
to `git push origin <feature-branch>`, which deploys nothing and silently leaves the environment on
its old code while the push appears to succeed.

### 1. Deploy to Staging

```bash
# From the feature branch, merge into the staging branch and push.
# The push is the deploy trigger — Railway builds `stagging` for the staging environment.
git checkout stagging
git merge <feature-branch>
git push origin stagging
```

Railway will run the build phase (solver compile + Vite build) followed by the start phase (`migrate.js && node server/index.js`). If the merged branch includes new migration files, `migrate.js` automatically detects and applies only the new files.

**Migrations run automatically on every deploy, before the server starts.** Any entry in
`docs/deployment_steps.md` carrying a "migration must run before/after its code deploy" ordering
constraint must be reconciled against that fact — the automatic runner applies migrations *between*
the new build and the new server starting, while the previous instance may still be serving. A
migration that drops or narrows something the outgoing code still reads is unsafe in a single deploy
and must be split across two.

### 2. Smoke Test Staging

Run the smoke test checklist against the staging URL:
1. Load the staging URL
2. Sign in via magic link
3. Complete one puzzle
4. Confirm no errors

If any step fails, fix the issue and redeploy to staging before proceeding to production.

### 3. Deploy to Production

Once the smoke test passes on staging, promote the **same commit** to production by merging it into
`main` and pushing — **`main` is the production branch, and the push is the deploy trigger** (see §0):

```bash
git checkout main
git merge stagging          # promote the exact commit that passed staging
git push origin main
```

Do **not** promote by pushing a feature branch or by running `railway up` from an arbitrary checkout:
production builds `main`, so anything not on `main` does not reach it. (Corrected 2026-08-04 — this
step previously read `railway up --environment production` with no mention of the branch, which
deploys whatever `main` already had rather than the commit you just validated on staging.)

`migrate.js` runs automatically as part of the production start command. It compares the migration files on disk against the `schema_migrations` ledger and applies only new files (if any), each inside its own transaction.

### 4. Verify Production

1. Check the Railway production deploy status — health check should pass
2. Load the production URL and confirm the app loads
3. Verify that any new `schema_migrations` rows correspond to the new migration files
