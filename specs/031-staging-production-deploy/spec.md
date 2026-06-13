# Feature Specification: Staging/Production Infrastructure & Deploy

**Feature Branch**: `031-staging-production-deploy`
**Created**: 2026-06-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Safe First Production Deploy (Priority: P1)

The operator runs `node server/migrate.js --baseline` to dynamically register all already-applied
migrations in the new `schema_migrations` ledger, then deploys to production for the first time
via Railway. The app starts without replaying any migration and serves real users.

**Why this priority**: Without this, the first Railway deploy crashes on non-idempotent DDL when
`migrate.js` attempts to replay all historical migrations against the live production database.
Everything else depends on this succeeding first.

**Independent Test**: Can be fully tested by running `migrate.js` against a PostgreSQL database that
already contains the full schema but has no `schema_migrations` table — after pre-seeding, the
runner should report 0 pending migrations and exit 0.

**Acceptance Scenarios**:

1. **Given** the production Supabase database has all migrations applied but no `schema_migrations`
   table, **When** the operator runs `DATABASE_URL=<prod-url> node server/migrate.js --baseline`,
   **Then** `schema_migrations` contains one row per `.sql` file currently present in
   `server/migrations/`, and a subsequent `node server/migrate.js` run finds 0 pending files and
   exits 0.
2. **Given** `schema_migrations` is fully seeded, **When** Railway executes
   `node server/migrate.js && node server/index.js`, **Then** the server starts successfully and
   serves the application.
3. **Given** `migrate.js` is run a second time with no new migration files, **When** it runs,
   **Then** it exits 0 without touching the database (idempotent).

---

### User Story 2 — Staging Environment Bootstrap (Priority: P2)

The operator provisions a fresh Supabase project for staging, runs all migrations from scratch,
imports puzzle data from production, configures auth redirect URLs, and deploys the app to the
Railway staging environment. A tester can then load the app, sign in with a magic link, and
complete one puzzle.

**Why this priority**: Staging is the safe proving ground for every future deploy. Without it,
every change ships directly to production with no intermediate validation gate.

**Independent Test**: Can be tested by running the full smoke test checklist (load app → sign in →
complete puzzle) against the staging Railway URL after a clean bootstrap.

**Acceptance Scenarios**:

1. **Given** a fresh Supabase project with no tables, **When** the operator runs `migrate.js`
   pointing at the staging `DATABASE_URL`, **Then** all migrations apply in order inside
   transactions, `schema_migrations` records one row per applied file, and the server starts.
2. **Given** staging schema is in place, **When** the operator imports puzzle rows from production
   via `pg_dump --data-only --table=puzzles | psql <staging-url>`, **Then** puzzle rows are present
   and the app can serve challenges.
3. **Given** the staging Supabase project's Auth → Redirect URLs include the staging `FRONTEND_URL`,
   **When** a user clicks a magic-link email, **Then** they are redirected to the staging app and
   land authenticated.
4. **Given** staging is fully configured, **When** a tester loads the staging URL, signs in, and
   completes one puzzle, **Then** all steps succeed with no errors.

---

### User Story 3 — Incremental Migration Deploy (Priority: P3)

A developer adds a new `.sql` migration file. On the next deploy to staging and subsequently to
production, `migrate.js` automatically detects and applies only the new file, leaving all
previously-applied migrations untouched.

**Why this priority**: Correct incremental migration is the core value of the runner for all future
epics. It must work reliably before any schema-changing epic ships.

**Independent Test**: Can be tested by adding a dummy migration file to a test database that already
has all prior migrations recorded, running `migrate.js`, and verifying only the new file was applied.

**Acceptance Scenarios**:

1. **Given** `schema_migrations` records N rows and a new file `040_test.sql` is added,
   **When** `migrate.js` runs, **Then** only `040_test.sql` is executed and an (N+1)th row is
   inserted into `schema_migrations`.
2. **Given** a migration file contains invalid SQL, **When** `migrate.js` runs that file,
   **Then** the transaction is rolled back, `migrate.js` exits non-zero, and `node server/index.js`
   does not start (deploy is blocked).
3. **Given** `migrate.js` successfully applies a new migration, **When** it is run again
   immediately, **Then** it is a no-op (0 new files applied).

---

### User Story 4 — Environment Variable Isolation (Priority: P4)

Staging and production each have their own complete set of environment variables in Railway. A
write to the staging database is invisible in production, and vice versa.

**Why this priority**: Correctness guarantee — without full env isolation, staging and production
databases can cross-contaminate.

**Independent Test**: Can be tested by writing a row in the staging app and confirming it does not
appear in the production Supabase dashboard, and vice versa.

**Acceptance Scenarios**:

1. **Given** staging and production each have distinct `SUPABASE_URL` values set in Railway,
   **When** a user completes a puzzle in the staging environment, **Then** the `puzzle_attempts`
   row appears only in the staging Supabase project.
2. **Given** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set per Railway environment,
   **When** the Vite build runs, **Then** the compiled frontend bundle connects to the correct
   Supabase project for that environment.

---

### Edge Cases

- What happens when `DATABASE_URL` is missing at deploy time? `migrate.js` must exit non-zero
  immediately with a clear error message, blocking the server from starting.
- What happens when a migration file is deleted from disk after being applied? `migrate.js` should
  not error — it only acts on files present on disk that are absent from the ledger.
- What happens if the `schema_migrations` table already exists when `migrate.js` bootstraps it?
  The `CREATE TABLE IF NOT EXISTS` guard makes this a no-op.
- What if the pre-seed is run twice on production? `ON CONFLICT DO NOTHING` makes the pre-seed
  idempotent.
- What if a Railway build fails mid-way (Vite build error)? The deploy must not reach `migrate.js`
  — the build step and start step are separate in Railway and a build failure prevents start.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide `connect-four/nixpacks.toml` so Railway can auto-detect the
  correct build root, build command, and start command without manual dashboard configuration.
  `nixpacks.toml` MUST declare `g++` and `make` as Nixpacks packages so the c4solver compilation
  tools are available during the build phase.
- **FR-001b**: The c4solver binary committed to the repository is a macOS ARM64 Mach-O executable
  that CANNOT run on Railway's Linux containers. `connect-four/nixpacks.toml` MUST configure the
  build command to compile the solver for the target platform: the build command MUST execute
  `cd ../solver-src && make` (which produces the Linux binary and copies it to `server/`) before
  `npm run build`. `solver-src/` is at the repository root, one level above `connect-four/`, so the
  path is `../solver-src` when executed from `connect-four/`. The 33 MB `7x6.book` opening book
  file is platform-independent and does not need regeneration.
- **FR-002**: The Railway build command MUST be `cd ../solver-src && make && npm run build` executed
  from `connect-four/`, and the start command MUST be
  `node server/migrate.js && node server/index.js` with no `--env-file` flag (Railway injects env
  vars directly).
- **FR-003**: The `pg` package MUST be moved from `devDependencies` to `dependencies` in
  `connect-four/package.json`. The rationale: Railway installs ALL dependencies (including
  devDependencies) during the build phase so that `vite build` can run. After the build completes,
  Railway prunes devDependencies before starting the runtime container. `pg` must be in
  `dependencies` to survive this prune step and remain available when `migrate.js` and
  `server/index.js` execute at runtime.
- **FR-004**: `server/migrate.js` MUST be created as a new file. It does not exist today.
- **FR-005**: `migrate.js` MUST self-bootstrap the ledger table as its first action:
  `CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`.
- **FR-006**: `migrate.js` MUST read all `.sql` files from `server/migrations/` in alphabetical
  order, skip any filename already recorded in `schema_migrations`, and apply the remaining files
  in order.
- **FR-007**: `migrate.js` MUST wrap each migration file's SQL in a database transaction. If any
  migration fails, it MUST roll back the transaction, print a clear error message, and exit with a
  non-zero status code, which blocks `node server/index.js` from starting.
- **FR-008**: `migrate.js` MUST connect to the database via the `DATABASE_URL` environment variable
  using the `pg` driver. If `DATABASE_URL` is absent, it MUST exit non-zero immediately with a
  descriptive error.
- **FR-009**: `migrate.js` MUST support a `--baseline` flag. When invoked as
  `node server/migrate.js --baseline`, it MUST read all `.sql` filenames present in
  `server/migrations/` at run time (in alphabetical order) and INSERT each filename into
  `schema_migrations (filename)` using `ON CONFLICT DO NOTHING`, without executing any SQL from
  those files. This replaces the static pre-seed approach: no hardcoded filename list exists in the
  spec or in the script. Before the first production deploy, the operator MUST run
  `DATABASE_URL=<prod-url> node server/migrate.js --baseline` to register all already-applied
  migrations. Because the filename list is read dynamically at execution time, the baseline step
  remains correct regardless of how many new migrations in-flight epics have added by deploy day.
- **FR-010**: Two separate Supabase projects MUST be used — one designated as production (the
  existing live project), one new project for staging. Schema separation or Supabase branching
  MUST NOT be used.
- **FR-011**: Each Railway environment (staging, production) MUST have env vars set independently,
  with the following distinction:
  - **Required on both staging and production** (app will not start or will serve broken pages
    without these): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
    `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FRONTEND_URL`, `PORT`.
  - **Optional on staging** (app degrades gracefully to 503 on the affected endpoints if absent;
    staging smoke test does not exercise these paths): `OPENAI_API_KEY`, `OPENAI_MODEL`,
    `ANTHROPIC_API_KEY`, Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`,
    `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`), `SENTRY_DSN`.
  - `DATABASE_URL` MUST use the Supabase **session-mode pooler** (port **5432**) with
    `sslmode=require` appended to the connection string. The transaction-mode pooler (port 6543)
    MUST NOT be used: it breaks multi-statement transactions and does not support `pg_dump`.
- **FR-012**: `VITE_*` variables MUST be set in the Railway environment before the build step runs,
  so they are baked into the compiled frontend bundle for that environment.
- **FR-013**: As a one-time staging setup step, the operator MUST export puzzle rows from
  production using `pg_dump --data-only --table=puzzles` and import them into the staging database
  so the smoke test has puzzle data to work with.
- **FR-014**: The operator MUST add the staging `FRONTEND_URL` to the staging Supabase project's
  Auth → URL Configuration → Redirect URLs, and the production `FRONTEND_URL` to the production
  project's Redirect URLs. Without this, magic-link sign-in fails.
- **FR-015**: A deploy runbook document MUST exist that describes: (a) how to deploy to staging,
  (b) how to deploy to production, (c) the promote-staging-to-prod flow, and (d) the one-time
  pre-seed step for production.

### Key Entities

- **`schema_migrations` table**: Ledger tracking which migration files have been applied.
  Fields: `filename TEXT PRIMARY KEY`, `applied_at TIMESTAMPTZ DEFAULT now()`.
- **Railway environment**: A named runtime context (staging or production) with its own env var
  set, build pipeline, and deployed service. One Railway project contains both.
- **`migrate.js`**: A Node.js script that reads `.sql` files from `server/migrations/`, compares
  against the `schema_migrations` ledger, and applies pending files inside transactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tester can complete the full smoke test (load app → sign in via magic link →
  complete one puzzle) against the staging environment after a clean deploy without any manual
  intervention beyond the one-time bootstrap steps.
- **SC-002**: A write made in the staging environment (e.g., a puzzle attempt) is confirmed absent
  from the production database within 30 seconds of the write, verifying full database isolation.
- **SC-003**: Running `migrate.js` twice in succession against the same database produces 0 new
  migrations applied on the second run, confirming idempotency.
- **SC-004**: A deploy with a deliberately broken migration file causes the deploy to halt (non-zero
  exit) before `server/index.js` starts, with a human-readable error message identifying the
  failing file.
- **SC-005**: Adding one new migration file and deploying causes exactly one new row in
  `schema_migrations` and leaves all prior rows unchanged.
- **SC-006**: The deploy runbook is complete enough that a person unfamiliar with the project can
  execute a staging deploy end-to-end by following the document alone.

## Assumptions

- Railway is the chosen PaaS; no alternative hosting target is in scope.
- `DATABASE_URL` MUST use the Supabase **session-mode pooler** (port **5432**) with
  `sslmode=require`. Direct DB host connections to Supabase fail (per
  `reference_supabase_connection.md`). The transaction-mode pooler (port 6543) is also forbidden
  for `DATABASE_URL` because it breaks multi-statement transactions and `pg_dump`.
- No CI/CD pipeline (e.g., GitHub Actions) is required in this epic — deploys are triggered
  manually via the Railway dashboard or CLI.
- The existing `server/index.js` static serving (`express.static` + SPA catch-all) is already
  correct and requires no changes.
- The `c4solver` binary committed to the repository is a macOS ARM64 Mach-O executable that cannot
  execute on Railway's Linux containers. A compilation step (via Nixpacks-provisioned `g++` and
  `make`) is required at build time; see FR-001b and FR-002.
- The `7x6.book` opening book is platform-independent binary data and does not need regeneration
  on Linux.
- The staging Supabase project uses the free tier; no paid Supabase features are required for
  staging.
- `node server/migrate.js && node server/index.js` in the Railway start command means a failed
  migration (non-zero exit) prevents `index.js` from starting, which Railway detects as a deploy
  failure.
- No `server/package.json` exists; frontend and server share `connect-four/package.json`.
  Railway deploys from `connect-four/` as the project root.
- The `--env-file=server/.env` flag used in `npm run dev` (local development) MUST NOT appear in
  the Railway start command.
