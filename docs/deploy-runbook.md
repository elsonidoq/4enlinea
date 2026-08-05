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

The **transaction-mode pooler** (port **6543**) is **convention drift to converge away from, not a
deploy blocker** (corrected 2026-08-04 — this previously read "**forbidden**" and gave a rationale
that has been disproven; see OI-31, closed as a documentation-sync 2026-08-04):

- The stated reason — "each statement may run on a different connection" — describes pgBouncer
  **statement** mode. In **transaction** mode a backend is pinned for the duration of an explicit
  `BEGIN…COMMIT`, which is exactly what `migrate.js` issues (`connect-four/server/migrate.js:82-92`).
- **Staging has been on 6543 for months and applies migrations through it successfully.** Its
  `schema_migrations` ledger records `060_paddle_rename_and_payment_events.sql` (2026-07-18) and
  `061_security_lints.sql` (2026-07-30) applied that way — re-confirmed read-only 2026-08-04 — plus
  `061_correct_cols.sql`/`062`/`063` applied through the same 6543 connection during the 2026-08-04
  staging deploy.
- **`pg_dump` genuinely does not work through 6543.** That limitation is real and is the reason the
  Puzzle Data Import section above requires the session-mode pooler.

Never report a 6543 `DATABASE_URL` as "this deploy will fail" without checking the ledger first.
Production is on 5432 and should stay there.

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

### 1a. The two-deploy pattern — for any migration that must run AFTER its code deploy

**Executed for real on staging 2026-08-04 (`064_drop_correct_col.sql`); this is the tested
procedure, not a sketch.** Use it whenever a migration removes or narrows something the *outgoing*
code still reads: `DROP COLUMN`, `DROP TABLE`, a narrowed `CHECK`/`NOT NULL`, a renamed column.

Why a single deploy cannot express it: the start command applies migrations **at container start**,
before the new server boots and while the old instance is still serving. So a migration sitting on
the deployed branch runs at the *beginning* of that deploy — the opposite of "after the code deploy".
Hand-running `migrate.js` afterwards does not fix this: if the file is on the branch, the deploy
already applied it; if it is not, you desynchronise the branch from the schema.

**Deploy A — everything except the destructive migration:**

```bash
git checkout stagging                       # or `main` for production
git merge <feature-branch>
git rm connect-four/server/migrations/<NNN>_<destructive>.sql
git commit -m "deploy: hold back <NNN>_<destructive>.sql for Deploy A"
git push origin stagging
```

Verify Deploy A is SUCCESS and the app is healthy. **This is the last safe revert point** — once the
column is dropped, reverting the code is no longer safe, because the old code would `SELECT` a column
that no longer exists.

**Deploy B — restore it:**

```bash
git revert --no-edit <sha of the hold-back commit>
git push origin stagging
```

Then re-run the migration's own verification *and* smoke-test the product paths the drop would break.

**Confirm the "outgoing code still reads it" premise at source before deciding** — this is what makes
the split necessary rather than cautious. Read the *deployed* commit, not the working tree:

```bash
# the deployed commit hash comes from Railway's deployment metadata
git show <deployed-sha>:connect-four/server/index.js | /usr/bin/grep -c "<column_name>"
```

PostgREST **errors** on a selected column that does not exist — it does not silently omit it — so a
single `.select('… <column> …')` string in the deployed code is enough to hard-fail those endpoints
for the length of the rollover.

### 1b. Adding a column is not populating it

A migration that only does `ADD COLUMN … DEFAULT NULL` leaves every existing row NULL. If the code
being deployed reads that column as its **sole** source of truth, the deploy is a live functional
break the moment it lands, on every pre-existing row.

**Always ask, per migration: does anything populate this, and is that step queued?** On staging
2026-08-04, `061_correct_cols.sql` added `puzzles.correct_cols` and nothing backfilled it — all 122
active puzzles served `"correct_cols":null` to code that reads only that field. The backfill existed
(`server/scripts/backfill-correct-cols.mjs`) but had never been added to `docs/deployment_steps.md`.

### 1c. Running the operational scripts non-interactively

`backfill-correct-cols.mjs`, `fill-candidate-pools.mjs` and
`repair-overcut-highlight-metadata.js` all prompt for a typed `Yes` on **stdin** (twice for
production). With stdin closed — a background shell, CI, `nohup` — the read gets EOF and the script
**aborts but still exits 0**. It looks like a successful run and writes nothing.

```bash
printf 'Yes\n' | node server/scripts/backfill-correct-cols.mjs --env staging
```

**Never judge these scripts by their exit code. Re-measure the database afterwards.** Tracked as
OI-146.

### 2. Smoke Test Staging

Run the smoke test checklist against the staging URL:
1. Load the staging URL
2. Sign in via magic link
3. Complete one puzzle
4. Confirm no errors

If any step fails, fix the issue and redeploy to staging before proceeding to production.

**A 200 is not "working".** The checklist above passes on a deploy whose puzzle answers are all NULL.
Use this fuller pass — every item was exercised on staging 2026-08-04 and each has a definite
success condition. Record the outcome in `staging_checks.md`.

| Check | How | Success condition |
|---|---|---|
| Renders, no errors | `list_console_messages` + `list_network_requests` (not a screenshot) | No unexpected console entries; every request 2xx/304. A `401` on `GET /api/auth/session` is the **expected** signed-out probe |
| CSP on a production build | Load `/pricing`, then `/pricing?_ptxn=<any id>` | **Zero** `Refused to …` lines. `cdn.paddle.com/paddle/v2/paddle.js` 200 on mount. An invalid `_ptxn` must degrade to the normal pricing page — Paddle rejects it *inside its own iframe* (`transaction-checkout` 400), which is after all CSP-governed loads and is a PASS |
| Pools serve | `GET /api/puzzles/counts` | Every category ≥ 20. Cross-check the set-picker's "N positions" |
| Grading | Draw a puzzle, `POST /api/puzzles/:id/check` with `{"candidateCol": <correct_cols[0]>}` | `"result":"correct"`; a different column gives `"result":"wrong"`. **The body field is `candidateCol`, not `column`** |
| Attempts actually persist | `SELECT outcome, count(*) FROM puzzle_attempts GROUP BY outcome` | An `incorrect` row appears after a wrong answer. All four writers are fire-and-forget, so a rejected insert is otherwise invisible |
| Explanation text integrity | Open a deep reveal; regex the rendered text | Zero matches for `\bc\d+(-c\d+)?\b`, `\bc\d+r\d+\b`, `[zone:…]`. Prose column references carry `data-zone="N"` and the board shows the matching highlight |
| Severity consistency | Open a red Review chip and an amber one | Red → `Blunder` badge `rgb(232,84,62)`; amber → `Suboptimal` badge `rgb(245,166,35)`. Note the adjacent teal heading is a *pattern tag*, not the severity (OI-145) |
| Locked-lesson CTA | Signed out, click a PRO lesson on `/saga` | AuthModal "Sign in to continue this lesson". The signed-in-free-tier → UpgradeModal half needs real OAuth and is owner-gated |
| Mobile | `emulate` at `390x844x3,mobile,touch` | `document.documentElement.scrollWidth === clientWidth`. **`resize_page` is dead — use `emulate`** |

**Onboarding intercepts deep links.** On a browser profile with no onboarding state, the first-run
auto-route redirects `/pricing`, `/challenge` and friends to `/`. Complete or dismiss onboarding
before testing any deep-linked route, or you will measure the redirect instead of the page
(OI-144).

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
