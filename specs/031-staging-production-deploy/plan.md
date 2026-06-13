# Implementation Plan: Staging/Production Infrastructure & Deploy

**Branch**: `031-staging-production-deploy` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/031-staging-production-deploy/spec.md`

## Summary

Create the infrastructure layer that allows the Connect Four app to be deployed to Railway with
full staging/production environment isolation. The work is a combination of code artifacts
(`migrate.js`, `nixpacks.toml`, `package.json` edit) and operator runbook steps
(Supabase project provisioning, Railway env var configuration, puzzle data import). The code
deliverables are small but load-bearing: an incorrect `migrate.js` can replay DDL against a live
production database with schema already applied.

## Technical Context

**Language/Version**: Node.js 20.10+ (required for `with { type: 'json' }` import attributes — already in use by `server/index.js`); C++ (g++/make for solver compilation)  
**Primary Dependencies**: `pg` ^8.21.0 (database connection), `express` ^5.2.1 (already in use), Railway PaaS (deploy target), Supabase (Postgres host)  
**Storage**: PostgreSQL via Supabase session-mode pooler (port 5432, `sslmode=require`); `schema_migrations` ledger table  
**Testing**: `node --test` (project standard); migrate.js --baseline mode unit-tested against a mock/in-memory DB interaction; idempotency tested against a real schema-equipped DB  
**Target Platform**: Railway Linux containers (x86-64); Nixpacks build system  
**Project Type**: DevOps/infrastructure additions to an existing web-service monorepo  
**Performance Goals**: `migrate.js` startup time is not latency-sensitive; correctness is the only constraint  
**Constraints**: `DATABASE_URL` MUST use session-mode pooler (port 5432); transaction-mode pooler (port 6543) is forbidden for multi-statement transactions and `pg_dump`. No CI/CD automation — all deploys are manual.  
**Scale/Scope**: 39 existing migrations (files 001–040 with 004 absent from the sequence); two Railway environments; two Supabase projects

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:  
- [x] Not applicable — this epic adds infrastructure only; no move evaluation or annotation paths are created or modified.

**Principle II — Code Quality & Simplicity**:  
- [x] `migrate.js` is a single flat script; no unnecessary abstractions. It reads files, queries the ledger, executes SQL in transactions. No speculative helper layers.
- [x] The `--baseline` flag is a simple conditional branch; no polymorphism needed.

**Principle III — Testing Standards**:  
- [x] `migrate.js` will be unit-tested for: normal run (pending files applied), idempotent run (no-op), `--baseline` mode, `DATABASE_URL` absent, transaction rollback on SQL error.
- [x] Tests use `node --test` (project standard). Solver compilation is tested implicitly by the Railway build; no mocks for that path.

**Principle IV — UX Consistency & Progressive Disclosure**:  
- [x] Not applicable — infrastructure-only feature; no user-facing UI changes.

**Principle V — Performance Requirements**:  
- [x] Not applicable — `migrate.js` is a startup script; no latency SLA.

**Principle VI — Implementation & Debugging Methodology**:  
- [x] `migrate.js` --baseline reads filenames dynamically (no hardcoded list); correct regardless of in-flight epics on deploy day.
- [x] All load-bearing assumptions explicit: `DATABASE_URL` checked at startup; `sslmode=require` enforced via connection string.

**Principle VII — Software Design Philosophy**:  
- [x] Simple flat script. Explicit error messages. No silent errors.

**Principle VIII — Documentation as First-Class Deliverable**:  
- [x] `docs/deploy-runbook.md` documents all operator steps (FR-015).
- [x] `docs/architecture/server-conventions.md` will be updated with the `DATABASE_URL` session-pooler constraint and `schema_migrations` ledger table.
- [x] This plan was drafted after reading: `spec.md`, `server-conventions.md`, `solver-src/Makefile`, `package.json`, all migration filenames.

## Path Correction: solver-src Location

**CRITICAL**: The spec's FR-002 states the build command is `cd solver-src && make && npm run build`
"executed from `connect-four/`". However, `solver-src/` is at the **repository root** (a sibling
of `connect-four/`), not inside `connect-four/`. Railway's root directory is set to `connect-four/`,
so the correct relative path is `../solver-src`.

**Correction applied in this plan**: The `nixpacks.toml` build command will be:
```
cd ../solver-src && make && npm run build
```

The Makefile `SERVER_DIR=../connect-four/server` was audited — it copies the binary to
`../connect-four/server/c4solver` relative to `solver-src/`. From `connect-four/`, running
`cd ../solver-src && make` produces the binary correctly at `connect-four/server/c4solver`.

The Makefile uses only standard C++ flags (`g++ --std=c++17 -W -Wall -O3 -DNDEBUG`) with no
macOS-specific flags (no `-arch arm64`, no `-mmacos-version-min`). The Makefile is fully
Linux-portable.

## Project Structure

### Documentation (this feature)

```text
specs/031-staging-production-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (schema_migrations table)
├── contracts/
│   └── migrate-js-cli.md  # CLI interface contract for migrate.js
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (changed/created files)

```text
connect-four/
├── nixpacks.toml                    # NEW — Railway build/start config
├── package.json                     # EDIT — move pg to dependencies
└── server/
    └── migrate.js                   # NEW — migration runner script

docs/
└── deploy-runbook.md               # NEW — operator deploy procedures (FR-015)
```

No existing source files are modified except `package.json` (single dependency section change).

## Complexity Tracking

No constitution violations.

---

## Phase 0: Research

### Research task 1: nixpacks.toml format for Railway

**Decision**: Use Railway's Nixpacks `[phases.build]` / `[start]` table format.

```toml
[phases.build]
nixPkgs = ["gcc", "gnumake"]
cmds = ["cd ../solver-src && make && npm run build"]

[start]
cmd = "node server/migrate.js && node server/index.js"
```

**Rationale**:
- `nixPkgs` provisions g++ (via `gcc` nixpkg, which includes g++) and `make` at build time. The spec requires `g++` and `make`; in Nixpkgs the package name that provides g++ is `gcc` (GCC toolchain). Alternatively `gcc12` or `gpp` are valid; `gcc` is the canonical choice.
- `cmds` list runs in order: first compile the solver (producing `server/c4solver`), then `npm run build` (Vite bundle).
- `[start].cmd` runs at container startup. `&&` ensures `index.js` never starts if `migrate.js` exits non-zero.
- No `--env-file` flag in the start command — Railway injects env vars directly.
- `VITE_*` env vars must be set in Railway before the first build so they are baked into the bundle.

**Alternatives considered**:
- `Dockerfile`: More control but defeats the purpose of using Railway's managed build. Rejected — adds maintenance burden.
- `Procfile`: Only covers the start command, not build. Does not address solver compilation or Nixpkg provisioning.

### Research task 2: pg session-mode pooler connection string format

**Decision**: `DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`

**Rationale**:
- Port 5432 = session-mode pooler (one server connection per client connection).
- Port 6543 = transaction-mode pooler (forbidden: breaks multi-statement transactions and `pg_dump`).
- `sslmode=require` is mandatory for Supabase connections.
- The `pg` driver's `Pool` accepts the full connection string as `connectionString`.

### Research task 3: migrate.js transaction wrapping with pg

**Decision**: Use `pg.Pool`, acquire a client with `pool.connect()`, manually issue `BEGIN` / `COMMIT` / `ROLLBACK` around each migration file's SQL.

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [filename]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

**Rationale**:
- Each migration file gets its own transaction. A failure rolls back only that file.
- `INSERT INTO schema_migrations` is inside the transaction — the ledger row is recorded atomically with the migration SQL.
- If the transaction aborts, `migrate.js` exits non-zero, blocking `node server/index.js`.

### Research task 4: --baseline mode idempotency

**Decision**: Dynamic filename discovery using `fs.readdirSync('server/migrations/').filter(f => f.endsWith('.sql')).sort()` + `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`.

**Rationale**:
- No hardcoded filename list. Running `--baseline` on deploy day records exactly the files present on disk, regardless of how many in-flight epics have added new migrations.
- `ON CONFLICT DO NOTHING` makes repeated `--baseline` runs safe.
- After `--baseline`, a normal `migrate.js` run finds all filenames in the ledger and applies 0 new files.

### Research task 5: pg_dump puzzle data export

**Decision**: Use `pg_dump` with the session-mode pooler (port 5432) for both source (production) and destination (staging).

```bash
# Export from production
pg_dump "$PROD_DATABASE_URL" \
  --data-only \
  --table=puzzles \
  --no-acl --no-owner \
  -f puzzles_export.sql

# Import to staging  
psql "$STAGING_DATABASE_URL" -f puzzles_export.sql
```

**Rationale**:
- `pg_dump` requires a session-mode connection (port 5432). The transaction-mode pooler (port 6543) breaks `pg_dump`.
- `--data-only` skips DDL; staging schema is already in place from `migrate.js`.
- `--no-acl --no-owner` avoids role-related errors in the staging project.

---

## Phase 1: Design & Contracts

See `data-model.md` and `contracts/` for full schemas and interface definitions.

### schema_migrations table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
```

- Self-bootstrapped by `migrate.js` as its first action (FR-005).
- `filename` is the `.sql` basename (e.g., `001_initial.sql`), not a full path.
- `PRIMARY KEY` on filename enforces uniqueness; `ON CONFLICT DO NOTHING` in `--baseline` mode is safe.
- No foreign keys, no RLS — this is a server-managed operational table, not a user-data table.

### migrate.js algorithm

```
1. Read DATABASE_URL from env; exit 1 with clear message if absent.
2. Connect pg.Pool.
3. CREATE TABLE IF NOT EXISTS schema_migrations (...).
4. If --baseline flag:
   a. Read all .sql filenames from server/migrations/, sort alphabetically.
   b. INSERT each INTO schema_migrations ON CONFLICT DO NOTHING.
   c. Print "Baseline complete: N files recorded." Exit 0.
5. Else (normal mode):
   a. SELECT filename FROM schema_migrations.
   b. Read all .sql filenames from server/migrations/, sort alphabetically.
   c. Compute pending = sorted_files - ledger_set (set difference).
   d. If pending is empty: print "0 pending migrations." Exit 0.
   e. For each pending file in order:
      - BEGIN transaction.
      - Read file contents.
      - Execute SQL.
      - INSERT filename into schema_migrations.
      - COMMIT. On error: ROLLBACK, print error with filename, exit 1.
6. Print "Applied N migrations." Exit 0.
```

### nixpacks.toml design

Located at `connect-four/nixpacks.toml` (Railway root = `connect-four/`):

```toml
[phases.build]
nixPkgs = ["gcc", "gnumake"]
cmds = ["cd ../solver-src && make && npm run build"]

[start]
cmd = "node server/migrate.js && node server/index.js"
```

Key decisions:
- `gcc` nixpkg provides `g++` on NixOS (GCC toolchain includes both). If Railway's Nixpkgs version lacks `g++` from `gcc`, `gpp` can be substituted.
- `gnumake` provides the `make` binary.
- Build phases run sequentially; `cmds` entries run in order within the build phase.
- The `npm install` phase is automatic in nixpacks (before `cmds`); no explicit `npm install` needed.
- `VITE_*` variables must be set as Railway environment variables before the build runs (they are baked into the bundle at build time by Vite).

> **Railway build sandbox test (required before finalizing nixpacks.toml)**: Before committing
> `nixpacks.toml`, the operator MUST test `cd ../solver-src && make` on a throwaway Railway deploy
> to confirm the build sandbox permits parent-directory traversal from `connect-four/`. If Railway
> sandboxes the build to the declared root directory and blocks `../` traversal, the fallback is:
> set Railway's root directory to the **repository root** (not `connect-four/`) and change the build
> command to `cd solver-src && make && cd connect-four && npm run build`. The start command and all
> relative paths within `nixpacks.toml` must be adjusted accordingly if the fallback is used.

### package.json change

Move `"pg": "^8.21.0"` from `devDependencies` to `dependencies`.

**Why**: Railway prunes `devDependencies` after the build phase. `pg` is needed at runtime by `migrate.js` only — `server/index.js` does not import `pg` directly. `migrate.js` runs as `node server/migrate.js` in the Railway start command (before `node server/index.js`), so `pg` must survive the prune step and be present in the runtime container. Moving it to `dependencies` achieves this.

### Environment variable checklist (both Railway environments)

Each Railway environment (staging, production) must have these set independently:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Session-mode pooler URL, port 5432, `sslmode=require` |
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `VITE_SUPABASE_URL` | Supabase project URL (baked into frontend bundle) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (baked into frontend bundle) |
| `FRONTEND_URL` | Deployed Railway URL for this environment |
| `OPENAI_API_KEY` | Optional; 503 returned if absent |
| `OPENAI_MODEL` | Required alongside OPENAI_API_KEY |
| `ANTHROPIC_API_KEY` | Optional; annotation falls back to template text |
| `STRIPE_SECRET_KEY` | Optional for staging |
| `STRIPE_MONTHLY_PRICE_ID` | Optional for staging |
| `STRIPE_ANNUAL_PRICE_ID` | Optional for staging |
| `STRIPE_WEBHOOK_SECRET` | Optional for staging |
| `SENTRY_DSN` | Optional |
| `PORT` | Railway auto-sets; no manual config needed |

### Operator steps (non-code, documented in runbook)

> **Ops execution environment**: The `--baseline`, `pg_dump`, and `psql` operations MUST be run from
> the operator's local machine with a Postgres client whose major version matches Supabase's Postgres
> server version. Check the Supabase project settings for the current version; as of 2026, Supabase
> defaults to Postgres 15. A version mismatch causes `pg_dump` to fail with a
> `server version mismatch` error. The runbook must state the required version explicitly.

> **VITE_* vs FRONTEND_URL timing**: `VITE_*` variables are build-time — they must be set before
> Railway triggers any build because Vite bakes them into the compiled bundle. `FRONTEND_URL` is a
> runtime variable — it is read by the server process at startup, not during the build, so it can be
> set (or corrected) after the domain is known; doing so triggers only a container restart, not a
> full rebuild.

1. **Provision staging Supabase project** — new free-tier project; note its URL, anon key, service role key, and session-mode pooler URL.
2. **Configure Railway environments** — create staging and production environments in one Railway project. Set all `VITE_*` variables and all other env vars **except `FRONTEND_URL`** before the first build. `FRONTEND_URL` cannot be set yet because the Railway domain is not assigned until after the first deploy.
3. **First deploy (staging and production)** — trigger the initial Railway deploy. After the deploy completes, Railway assigns a stable domain (e.g., `myapp.up.railway.app`). Note this domain for each environment.
4. **Set FRONTEND_URL and configure Supabase Auth redirect URLs** — now that the Railway domain is known: (a) set `FRONTEND_URL` in each Railway environment; (b) add the staging `FRONTEND_URL` to the staging Supabase project's Auth → URL Configuration → Redirect URLs, and the production `FRONTEND_URL` to the production project's Redirect URLs. Trigger a redeploy (restart only, not a rebuild) for each environment.
5. **Verify production schema before baseline** — before running `--baseline` against production, manually verify that the production database's actual schema matches what the on-disk migration files are expected to have created. List tables and key columns (e.g., via `psql "$PROD_DATABASE_URL" -c "\dt"` and spot-checking column definitions) and cross-reference with each migration file. If any mismatch is found, reconcile it before proceeding. Do not run `--baseline` against a schema that diverges from the migration files.
6. **Bootstrap production ledger** — after schema verification, run `DATABASE_URL=<prod-url> node server/migrate.js --baseline` from `connect-four/`. This records all 39 currently-applied migration filenames in `schema_migrations` without re-executing any SQL.
7. **Staging schema bootstrap** — the first deploy to staging already runs `migrate.js` in normal mode against the empty staging DB (started in step 3); all 39 migrations apply in order automatically.
8. **Import puzzle data to staging** — `pg_dump / psql` pipeline per the research decision above.
9. **Smoke test staging** — load app → sign in via magic link → complete one puzzle.

---

## Documentation updates required (Principle VIII)

1. **`docs/architecture/server-conventions.md`** — add section: "Migration Runner (`migrate.js`)":
   - `DATABASE_URL` must use session-mode pooler, port 5432, `sslmode=require`
   - `schema_migrations` ledger table schema
   - `--baseline` flag semantics
   - Transaction rollback behavior on error

2. **`docs/deploy-runbook.md`** — new file covering:
   - How to deploy to staging
   - How to deploy to production
   - Promote staging → production flow
   - One-time production pre-seed (`--baseline`) step
   - Env var checklist per environment

3. **`specs/031-staging-production-deploy/contracts/migrate-js-cli.md`** — CLI interface contract (flags, exit codes, stdout/stderr contract).
