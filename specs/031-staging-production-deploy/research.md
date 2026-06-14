# Research: Staging/Production Infrastructure & Deploy

## Decision 1: nixpacks.toml format for Railway

**Decision**: Use Railway's Nixpacks `[phases.build]` / `[start]` table format.

```toml
[phases.build]
nixPkgs = ["gcc", "gnumake"]
cmds = ["cd ../solver-src && make && npm run build"]

[start]
cmd = "node server/migrate.js && node server/index.js"
```

**Path note**: The spec (FR-002) says `cd solver-src && make` "from `connect-four/`". However, `solver-src/` is a sibling of `connect-four/` at the repo root. The correct relative path from `connect-four/` (Railway root) is `../solver-src`. This plan implements the corrected path.

**Rationale**:
- `gcc` nixpkg provides the full GCC toolchain including `g++`.
- `gnumake` provides `make`.
- `cmds` run after `npm install` (automatic in nixpacks) and before the `start` phase.
- Solver binary is produced at `connect-four/server/c4solver` (Makefile `SERVER_DIR` confirms this).
- `&&` in start cmd blocks `index.js` if `migrate.js` exits non-zero.

**Alternatives considered**:
- `Dockerfile`: More control but not needed; Railway manages the OS/runtime. Adds maintenance burden.
- `Procfile`: Only covers start, not build. Cannot provision Nixpkgs.
- Nixpkgs alternative `gpp`: Works but `gcc` is more canonical on NixOS for the full toolchain.

## Decision 2: Makefile portability audit

**Decision**: The `solver-src/Makefile` is Linux-portable. No changes required.

**Evidence**: Flags are `--std=c++17 -W -Wall -O3 -DNDEBUG`. No `-arch arm64`, no `-mmacos-version-min`, no macOS SDK paths, no `xcrun`. The Makefile uses only standard `g++` and `$(CXXFLAGS)`.

**The macOS binary problem**: The committed `c4solver` binary in the repo is a macOS ARM64 Mach-O executable (as stated in FR-001b). It cannot execute on Railway's Linux x86-64 containers. The `nixpacks.toml` build phase recompiles the solver from source, overwriting the committed binary with a Linux ELF executable. The `7x6.book` file is platform-independent binary data and does not need regeneration.

## Decision 3: pg connection via DATABASE_URL

**Decision**: `pg.Pool({ connectionString: process.env.DATABASE_URL })` with SSL inferred from `sslmode=require` in the URL.

**Session-mode pooler URL format**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Why session-mode (port 5432)**:
- Multi-statement transactions (`BEGIN … COMMIT`) require a single persistent server connection.
- `pg_dump` requires a session connection.
- The transaction-mode pooler (port 6543) maps each statement to a potentially different server connection, breaking `BEGIN/COMMIT` semantics.

## Decision 4: migrate.js --baseline mode

**Decision**: Dynamic filename discovery — no hardcoded filename list.

```js
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();
for (const filename of files) {
  await client.query(
    `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
    [filename]
  );
}
```

**Rationale**: 
- Any hardcoded list would go stale as new epics add migrations between when the list is written and when the operator runs `--baseline` on deploy day.
- `ON CONFLICT DO NOTHING` makes the operation idempotent.
- After `--baseline`, a normal `migrate.js` run computes `pending = disk_files - ledger_set = ∅` → exits 0 with "0 pending migrations."

## Decision 5: pg dependency placement

**Decision**: Move `pg` from `devDependencies` to `dependencies` in `connect-four/package.json`.

**Rationale**: Railway's build process installs ALL dependencies (including devDependencies) so that `vite build` runs. After the build phase, Railway prunes devDependencies before starting the runtime container. `pg` is needed at runtime by `migrate.js` and by server endpoints that use a pg connection pool. It must survive the prune step.

## Decision 6: pg_dump puzzle data export

**Decision**: Use the Supabase session-mode pooler (port 5432) for both source and destination.

```bash
pg_dump "$PROD_DATABASE_URL" \
  --data-only --table=puzzles \
  --no-acl --no-owner \
  -f puzzles_export.sql

psql "$STAGING_DATABASE_URL" -f puzzles_export.sql
```

**Rationale**: `pg_dump` requires a session connection (cannot work over transaction-mode pooler). `--data-only` skips DDL; staging schema is already in place. `--no-acl --no-owner` prevents role errors across Supabase projects.

## Decision 7: Supabase Auth redirect URL configuration

**Decision**: Operator configures Supabase Auth → URL Configuration → Redirect URLs manually in each project's dashboard.

- Staging project: add staging `FRONTEND_URL`
- Production project: add production `FRONTEND_URL`

**Rationale**: Supabase rejects magic link redirects to URLs not in the allowlist (`bug_auth_magic_link_redirect.md` in memory). This is a one-time dashboard action per environment. No code change required.

## Decision 8: Two Railway environments, one project

**Decision**: One Railway project with two environments (staging, production). Each environment has its own complete set of env vars pointing to separate Supabase projects.

**Rationale**: FR-010 explicitly prohibits Supabase branching or schema separation. Two fully independent Supabase projects provide complete data isolation. Railway environments provide independent build pipelines and runtime configurations.
