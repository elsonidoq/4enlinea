# Tasks: Staging/Production Infrastructure & Deploy

**Input**: Design documents from `/specs/031-staging-production-deploy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/migrate-js-cli.md ✓

**Tests**: Included — the plan explicitly calls for unit tests covering all `migrate.js` execution paths (Principle III, plan.md Constitution Check).

**Organization**: Tasks are grouped by user story. Code deliverables (migrate.js, nixpacks.toml, package.json) are foundational and must complete before user story phases begin. Operator runbook tasks are organized per user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US4)

---

## Phase 0: Prerequisite Setup (Operator — One-Time Human Task)

**Purpose**: Provision local tooling and Railway project before any code is deployed. No code output; acceptance = Railway project exists with both environments configured.

- [ ] T000 [US1/US2] Prerequisite setup — local tooling and Railway project creation. Operator steps: (a) install required local tools: Postgres 15 client (`psql`, `pg_dump`) matching the Supabase server version, and the Railway CLI (`npm install -g @railway/cli` or via installer); (b) create the Railway project with two environments named `staging` and `production`; (c) designate the existing Supabase project as production (note its project URL, anon key, service role key, and session-mode pooler URL at port 5432); (d) provision a new free-tier Supabase project for staging (note the same four credentials); (e) set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Railway dashboard for **both** environments before triggering any build — Vite bakes these into the compiled bundle at build time, so they must be present before the first deploy. Acceptance = Railway project exists with staging and production environments; both environments have `VITE_*` variables set.

**Checkpoint**: Local tooling ready; Railway project provisioned; `VITE_*` build-time env vars set. Code tasks can now begin.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package manifest fix that unblocks all subsequent Railway deploys.

- [ ] T001 Move `"pg": "^8.21.0"` from `devDependencies` to `dependencies` in `connect-four/package.json` — Railway prunes devDependencies after the build phase; pg must survive to be available when `migrate.js` and `server/index.js` run at container start

**Checkpoint**: `pg` is now in `dependencies`. `npm install` in a production-only mode will include it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `server/migrate.js` — every user story depends on this script being correct.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Create `connect-four/server/migrate.js` — scaffold the file: check `process.env.DATABASE_URL`; if absent, print `"ERROR: DATABASE_URL environment variable is not set."` to stderr and `process.exit(1)`; otherwise create a `pg.Pool({ connectionString: process.env.DATABASE_URL })` and derive `migrationsDir = path.join(__dirname, 'migrations')` (using `__dirname` so the path resolves correctly regardless of the working directory from which the script is invoked)

- [ ] T003 Add `schema_migrations` table self-bootstrap to `connect-four/server/migrate.js` — as the first database action (after pool creation), execute `CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())` using a pooled client; this runs in both normal and `--baseline` modes before any other logic

- [ ] T004 Implement normal mode in `connect-four/server/migrate.js` — after table bootstrap: (1) `SELECT filename FROM schema_migrations` to build a `Set` of applied filenames; (2) `fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()` to get all disk files in alphabetical order; (3) compute `pending = diskFiles.filter(f => !ledgerSet.has(f))`; (4) if pending is empty, print `"0 pending migrations. Nothing to apply."` and exit 0; (5) for each pending file: acquire a client, `BEGIN`, read and execute the file's SQL, `INSERT INTO schema_migrations (filename) VALUES ($1)`, `COMMIT`; on any error: `ROLLBACK`, print `"ERROR: Migration [filename] failed. Transaction rolled back.\n[error.message]"` to stderr, `process.exit(1)`; (6) on success print `"Applied N migration(s): [filename1], ..."` and exit 0

- [ ] T005 Implement `--baseline` mode in `connect-four/server/migrate.js` — detect `process.argv.includes('--baseline')`; after table bootstrap: (1) `fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()` to get all disk filenames; (2) for each filename execute `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`; (3) print `"Baseline complete: N file(s) recorded in schema_migrations."` and exit 0; no SQL from migration files is read or executed in this mode

- [ ] T006 Finalize stdout/stderr contract in `connect-four/server/migrate.js` — verify all print paths match `contracts/migrate-js-cli.md` exactly: normal-0-pending message, normal-N-applied message, baseline message, DATABASE_URL-absent stderr, migration-failure stderr; add a `pool.end()` call in a `finally` block so the process exits cleanly after all DB operations complete

**Checkpoint**: `migrate.js` is complete and all five execution paths (DATABASE_URL absent, normal 0-pending, normal N-applied, --baseline, migration failure) are implemented.

---

## Phase 3: User Story 1 — Safe First Production Deploy (Priority: P1) 🎯 MVP

**Goal**: Operator runs `--baseline` against production, deploys to Railway, app starts without replaying any migration.

**Independent Test**: Run `DATABASE_URL=<test-db> node server/migrate.js --baseline` against a Postgres DB that has all migrations applied but no `schema_migrations` table → verify `schema_migrations` contains one row per `.sql` file → run `node server/migrate.js` → verify output is "0 pending migrations." and exit 0.

### Tests for User Story 1

- [ ] T007 [P] [US1] Create `connect-four/server/migrate.test.js` — test: when `DATABASE_URL` is absent from env, spawning `node server/migrate.js` exits with code 1 and stderr contains `"DATABASE_URL environment variable is not set"`; use `node:child_process` `spawnSync` with env that omits DATABASE_URL

- [ ] T008 [P] [US1] Add test to `connect-four/server/migrate.test.js` — idempotent normal run: given a test Postgres DB where all filenames already exist in `schema_migrations`, spawning `node server/migrate.js` exits 0 and stdout contains `"0 pending migrations"`; the test must set up and tear down `schema_migrations` rows around each run (use `DATABASE_URL` pointing at a dedicated test schema or test DB configured in the test environment)

- [ ] T009 [P] [US1] Add test to `connect-four/server/migrate.test.js` — `--baseline` then normal run: given a test DB with no `schema_migrations` table, spawning `node server/migrate.js --baseline` exits 0 and stdout contains `"Baseline complete"`; then spawning `node server/migrate.js` (normal mode) exits 0 with `"0 pending migrations"` (all filenames are in ledger so pending set is empty)

- [ ] T010 [P] [US1] Add test to `connect-four/server/migrate.test.js` — migration failure causes rollback: given a test DB where one pending `.sql` file contains deliberately invalid SQL (e.g., `CREATE TABLE $$INVALID$$`), spawning `node server/migrate.js` exits 1, stderr contains `"Migration"` and `"failed"`, and `schema_migrations` contains no row for the failing file (transaction was rolled back)

### Implementation for User Story 1

- [ ] T011 [US1] Create `connect-four/nixpacks.toml` with the following content:
  ```toml
  [phases.build]
  nixPkgs = ["gcc", "gnumake"]
  cmds = ["cd ../solver-src && make && npm run build"]

  [start]
  cmd = "node server/migrate.js && node server/index.js"
  ```
  Notes: (a) `gcc` nixpkg provides the full GCC toolchain including `g++`; `gnumake` provides `make`; (b) `solver-src/` is at the repo root — one level above `connect-four/` — so the path from Railway's `connect-four/` root is `../solver-src`; (c) `npm install` is automatic in nixpacks before `cmds`; (d) no `--env-file` flag in the start command — Railway injects env vars directly; (e) **before merging**, trigger a throwaway Railway deploy pointing at a scratch branch to verify that `cd ../solver-src` is permitted from the `connect-four/` root; if Railway's build sandbox blocks parent-directory traversal, use the fallback: set Railway root directory to the repo root (not `connect-four/`) and update the build command to `cd solver-src && make && cd connect-four && npm run build` — adjust all relative paths accordingly

- [ ] T012 [US1] Add production deploy section to `docs/deploy-runbook.md` (create the file if it does not exist) — this section covers: (a) **schema verification before baseline**: list tables and spot-check columns via `psql "$PROD_DATABASE_URL" -c "\dt"` to confirm production schema matches what the migration files would create — if any mismatch, reconcile before proceeding; (b) **production baseline command**: `DATABASE_URL=<prod-session-mode-url> node server/migrate.js --baseline` run from `connect-four/`; (c) **verify baseline**: `DATABASE_URL=<prod-url> node server/migrate.js` should output `"0 pending migrations."`; (d) **trigger Railway production deploy** via dashboard; include a note that `VITE_*` env vars must be set in Railway before the first build since Vite bakes them into the compiled bundle at build time, and `FRONTEND_URL` can be set after deploy (runtime var, triggers only a container restart)

- [ ] T020 [US1] Execute production schema verification and `--baseline` (operator execution task). Operator steps: (1) connect to the production DB via the session-mode pooler (port 5432, sslmode=require) using `psql "$PROD_DATABASE_URL"`; (2) run `\dt` and list all tables, then cross-reference each against the 39 migration filenames in `server/migrations/`; (3) reconcile any discrepancy before proceeding — do not run `--baseline` against a schema that diverges from the migration files; (4) from `connect-four/`, run `DATABASE_URL=<prod-session-pooler-url> node server/migrate.js --baseline` with `sslmode=require` in the connection string; (5) verify with a normal run: `node server/migrate.js` should print "0 pending migrations."; (6) record operator sign-off with timestamp. Acceptance = `schema_migrations` table populated with 39 rows and sign-off recorded.

**Checkpoint**: `migrate.js` passes all four unit tests, `nixpacks.toml` exists, production runbook section documents the baseline procedure, and production `--baseline` has been executed and verified. User Story 1 is independently verifiable.

---

## Phase 4: User Story 2 — Staging Environment Bootstrap (Priority: P2)

**Goal**: Fresh Supabase staging project, all migrations applied, puzzle data imported, auth configured, smoke test passes.

**Independent Test**: After following the staging bootstrap steps in the runbook, a tester loads the staging URL, signs in via magic link, and completes one puzzle — all steps succeed with no errors.

- [ ] T013 [US2] Add staging bootstrap section to `docs/deploy-runbook.md` — operator steps: (a) provision a new free-tier Supabase project for staging; collect its project URL, anon key, service role key, and session-mode pooler URL (port 5432); (b) create staging + production environments in one Railway project; (c) set all env vars in each Railway environment **before the first build** — for staging: `DATABASE_URL` (staging Supabase session-mode pooler), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`; omit `FRONTEND_URL` and `PORT` at this stage (Railway auto-sets PORT; FRONTEND_URL requires the deployed domain); (d) trigger the first Railway deploy for staging — `migrate.js` runs in normal mode against the empty staging DB and applies all 39 migrations in order; note the assigned staging domain after deploy completes

- [ ] T014 [US2] Add FRONTEND_URL and auth redirect configuration section to `docs/deploy-runbook.md` — steps: (a) set `FRONTEND_URL=https://<staging-domain>` in the Railway staging environment; (b) in the staging Supabase dashboard → Auth → URL Configuration → Redirect URLs, add the staging `FRONTEND_URL`; (c) repeat for production: set `FRONTEND_URL=https://<prod-domain>` in Railway production environment; add production `FRONTEND_URL` to the production Supabase project's Redirect URLs; (d) trigger a Railway redeploy (restart only — no rebuild required since `FRONTEND_URL` is a runtime variable read by the server, not baked into the bundle); note that without this step, magic-link sign-in fails (per `bug_auth_magic_link_redirect.md`)

- [ ] T015 [US2] Add puzzle data import and smoke test section to `docs/deploy-runbook.md` — steps: (a) **Postgres client version**: install Postgres 15 client locally (check Supabase project settings for current server version; a version mismatch causes pg_dump to fail with `server version mismatch`); (b) **export from production**: `pg_dump "$PROD_DATABASE_URL" --data-only --table=puzzles --no-acl --no-owner -f puzzles_export.sql`; (c) **import to staging**: `psql "$STAGING_DATABASE_URL" -f puzzles_export.sql`; (d) **smoke test checklist**: load staging URL → sign in via magic link → complete one puzzle → confirm no errors; (e) **env isolation check**: write a puzzle attempt in staging, verify the row appears in the staging Supabase dashboard and is absent from the production dashboard

- [ ] T021 [US2] Deploy to staging and run smoke test (operator execution task). Operator steps: (1) push the feature branch code to the Railway staging environment (via Railway CLI or dashboard); (2) verify the Railway build succeeds — nixpacks installs gcc/gnumake, compiles the solver, and runs `npm run build`; (3) once the domain is assigned, set `FRONTEND_URL=https://<staging-domain>` in the Railway staging environment (runtime var — triggers a container restart, not a rebuild); (4) in the staging Supabase dashboard → Auth → URL Configuration → Redirect URLs, add the staging `FRONTEND_URL`; (5) trigger a Railway redeploy (restart only); (6) run SC-001 smoke test: load the staging app, sign in via magic link, complete one puzzle, confirm no errors. Acceptance = smoke test passes; staging URL recorded in sign-off notes.

- [ ] T022 [US2] Import puzzle data into staging and verify isolation (operator execution task). Operator steps: (1) from the local machine, run `pg_dump "$PROD_DATABASE_URL" --data-only --table=puzzles --no-acl --no-owner -f puzzles_export.sql` (ensure the local Postgres client major version matches Supabase's server version to avoid `server version mismatch`); (2) import into staging: `psql "$STAGING_DATABASE_URL" -f puzzles_export.sql`; (3) verify puzzle rows are present on staging by querying the staging Supabase dashboard; (4) write one row (e.g., a test puzzle attempt) to the staging database and confirm it does not appear in the production Supabase dashboard within 30 seconds, satisfying SC-002. Acceptance = puzzle data present on staging; isolation verified.

**Checkpoint**: Staging is fully bootstrapped, smoke test passed, puzzle data imported, and isolation verified. User Story 2 acceptance scenarios are met.

---

## Phase 5: User Story 3 — Incremental Migration Deploy (Priority: P3)

**Goal**: Adding a new `.sql` migration file causes exactly that file to be applied on the next deploy; all prior rows remain unchanged.

**Independent Test**: Add `connect-four/server/migrations/040_test_increment.sql` with a trivially valid SQL statement to a test DB that already has all prior filenames in `schema_migrations`; run `migrate.js`; verify exactly one new row in `schema_migrations` and 0 rows changed.

- [ ] T016 [P] [US3] Add test to `connect-four/server/migrate.test.js` — incremental apply: given a test DB where schema_migrations has N pre-seeded rows (all filenames except one new dummy file `999_increment_test.sql`), running `node server/migrate.js` exits 0, `schema_migrations` now has N+1 rows, and all prior rows are unchanged (verify by checking that all original filenames still have their original `applied_at` values); clean up `999_increment_test.sql` in the test teardown

**Checkpoint**: Incremental migration behavior is verified. Adding any new `.sql` file to `server/migrations/` will be auto-detected and applied on the next deploy.

---

## Phase 6: User Story 4 — Environment Variable Isolation (Priority: P4)

**Goal**: Staging and production have completely separate env vars; a write in staging is invisible in production.

**Independent Test**: Complete a puzzle in staging and confirm no corresponding `puzzle_attempts` row appears in the production Supabase dashboard; and vice versa.

- [ ] T017 [US4] Add environment variable isolation section to `docs/deploy-runbook.md` — include: (a) per-environment variable checklist table listing all 15 vars (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, FRONTEND_URL, OPENAI_API_KEY, OPENAI_MODEL, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, STRIPE_WEBHOOK_SECRET, SENTRY_DSN, PORT) with notes on which are optional for staging and which Railway auto-sets; (b) explanation that `DATABASE_URL` MUST use the Supabase **session-mode pooler** (port **5432**) with `sslmode=require` — the transaction-mode pooler (port 6543) is forbidden because it breaks multi-statement transactions and `pg_dump`; (c) note that `VITE_*` vars are build-time (must be set before build runs — Vite bakes them into the bundle) while all other vars are runtime (can be updated without a full rebuild); (d) isolation verification step: write a test row in staging, confirm it is absent from the production Supabase dashboard

**Checkpoint**: Both Railway environments have complete, independent env var sets. Staging writes are invisible in production.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Architecture documentation required by Principle VIII, and the steady-state promote flow runbook section (FR-015c).

- [ ] T023 Add "Promote staging → production" section to `docs/deploy-runbook.md`. This section documents the recurring steady-state deploy cycle used for all future feature deploys (not just the one-time bootstrap): (1) push feature branch and trigger a Railway staging environment deploy; (2) run the SC-001 smoke test against staging (load app → sign in via magic link → complete one puzzle); (3) if smoke test passes, redeploy the same commit to the Railway production environment (via Railway dashboard or `railway up --environment production`); (4) `node server/migrate.js` runs automatically as part of the production start command and applies any new migration files present in `server/migrations/` that are not yet recorded in `schema_migrations`; (5) verify the production deploy succeeds (Railway health check). Acceptance = the section exists in `docs/deploy-runbook.md` and covers the full steady-state promote path from staging to production.

- [ ] T018 [P] Update `docs/architecture/server-conventions.md` — add a "Migration Runner (`migrate.js`)" section documenting: (a) `DATABASE_URL` must use the Supabase session-mode pooler (port 5432) with `sslmode=require`; the transaction-mode pooler (port 6543) is forbidden for multi-statement transactions; (b) `schema_migrations` ledger table schema (`filename TEXT PRIMARY KEY`, `applied_at TIMESTAMPTZ DEFAULT now()`); (c) `--baseline` flag semantics: records all filenames present on disk without executing their SQL; idempotent via `ON CONFLICT DO NOTHING`; must be run from `connect-four/` before the first production deploy; (d) transaction rollback behavior: each migration file runs inside its own `BEGIN/COMMIT`; a failure rolls back only that file, prints an error identifying the file, and exits 1; `index.js` does not start

- [ ] T019 Verify all tests pass — run `npm run test:fast` from `connect-four/`; confirm `migrate.test.js` tests pass for all four paths (DATABASE_URL absent, idempotent normal run, --baseline + normal run, migration failure rollback, incremental apply); confirm no regressions in existing test suite

**Checkpoint**: Architecture documentation updated. All tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 0)**: T000 is a prerequisite for any Railway deploy; must complete before Phase 4 staging deploy tasks
- **Setup (Phase 1)**: No code dependencies — start immediately alongside T000
- **Foundational (Phase 2)**: Depends on T001 (pg in dependencies) — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Foundational (T002–T006) complete; tests T007–T010 can run in parallel with each other; T020 (production baseline execution) depends on T012 (runbook written) and T000 (tooling ready)
- **Phase 4 (US2)**: Depends on Foundational complete and T000 complete; T021 depends on T013–T015 (runbook sections); T022 depends on T021 (staging URL known)
- **Phase 5 (US3)**: Depends on Foundational complete; T016 can run in parallel with Phase 4 tasks
- **Phase 6 (US4)**: Depends on Foundational complete; T017 is a doc task and can run in parallel with Phase 5
- **Phase 7 (Polish)**: Depends on all prior phases complete; T023 extends the runbook created in T012–T015

### User Story Dependencies

- **US1 (P1)**: Requires Foundational complete. T020 (production baseline) additionally requires T000 (tooling/Railway provisioned) and T012 (runbook written).
- **US2 (P2)**: Requires Foundational complete and T000 complete. T013 depends on T012 (runbook file created by T012). T014, T015 depend on T013. T021 (staging deploy) depends on T015. T022 (puzzle import + isolation) depends on T021.
- **US3 (P3)**: Requires Foundational complete. Independent of US2.
- **US4 (P4)**: Requires Foundational complete. T017 can extend the runbook created in T012/T013.

### Within Each User Story

- Tests (T007–T010, T016) are parallel — different test cases in the same file, no ordering constraint among them; all depend on Foundational complete
- T011 (nixpacks.toml) is independent of all tests
- T012 (runbook prod section) is independent of all tests and of T011
- T013–T015 (runbook staging sections) depend on T012 (file created); T014 depends on T013 (Railway domain not known until T013 deploy step is complete)

### Parallel Opportunities

```bash
# Phase 0: operator prerequisite (can run concurrently with code work):
T000  # tooling + Railway project creation

# Phase 2 (Foundational): strictly sequential — each task depends on the prior:
T002 → T003 → T004 → T005 → T006

# Phase 3 (US1): parallel set after Foundational:
T007, T008, T009, T010  # all tests can run in parallel
T011                    # nixpacks.toml — independent of tests
T012                    # runbook prod section — independent of tests and T011
T020                    # production --baseline execution — depends on T012 + T000

# Phases 4, 5, 6 can all start after Foundational:
T013 (US2) → T014 → T015 → T021 → T022  # sequential within US2
T016 (US3)                               # independent
T017 (US4)                               # independent

# Phase 7:
T023                    # promote flow runbook section
T018                    # server-conventions.md update — independent of T023
T019                    # verify all tests pass — after all code tasks
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 0: T000 (operator prerequisite — tooling + Railway project)
2. Complete Phase 1: T001 (pg to dependencies)
3. Complete Phase 2: T002–T006 (migrate.js)
4. Complete Phase 3 code tasks: T007–T012 (tests + nixpacks.toml + runbook prod section)
5. **STOP and VALIDATE**: Run --baseline against a test DB; verify 0 pending on next run; inspect nixpacks.toml with a throwaway Railway deploy
6. Complete T020: Execute production schema verification and `--baseline`
7. Trigger first production deploy; confirm server starts

### Incremental Delivery

1. Phase 0 (T000) + Phase 1 + 2 → migrate.js working locally; Railway project ready
2. Phase 3 code tasks (T007–T012) + T020 → nixpacks.toml + tests + prod runbook + production baseline executed → production is deploy-ready (US1)
3. Phase 4 (T013–T015 + T021 + T022) → staging bootstrap runbook + staging deployed + smoke test passed + data imported (US2)
4. Phase 5 → incremental migration test confirmed (US3)
5. Phase 6 → env var isolation documented and verified (US4)
6. Phase 7 (T023 + T018 + T019) → promote flow runbook section + architecture docs updated + all tests passing

---

## Notes

- [P] tasks = different files or independent test cases; no ordering constraint between them
- migrate.js reads migration filenames via `path.join(__dirname, 'migrations')` — __dirname is preferred over CWD so the script resolves correctly regardless of where Railway's start command runs from, but the Railway start command still runs from `connect-four/` per the nixpacks.toml design
- Tests (T007–T010, T016) require a real Postgres test database accessible via `DATABASE_URL`; the test file should configure this via env var in the test environment; mock-only approaches are insufficient for T009/T010 which test transaction rollback semantics
- T011 includes a mandatory throwaway-deploy validation step before the nixpacks.toml is considered done — this is the only way to confirm Railway's build sandbox permits `../solver-src` traversal
- T012 and T013 both write to `docs/deploy-runbook.md`; T012 creates the file (prod section), T013 adds the staging section; do not run concurrently
- The production `--baseline` step (T012) is irreversible — it registers all current migration filenames in the ledger; the schema verification sub-step must be completed first and signed off before executing the `--baseline` command
