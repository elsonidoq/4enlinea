---
name: spec-031-staging-production-deploy
description: Railway + two Supabase projects + migrate.js deployment architecture gotchas
metadata: 
  node_type: memory
  type: project
  originSessionId: 11bfc8cc-cbaf-4157-9b04-8ccfc5e53ae3
---

**Deployment architecture gotchas:**

- **Host:** Railway PaaS, one project with `staging` and `production` environments. Express serves `dist/` as static files from the same service (no separate frontend host).
- **DB:** Two separate Supabase projects. The **existing** Supabase project is production (zero data migration); a new free-tier project is staging.
- **Migration runner:** `connect-four/server/migrate.js`. Uses `pg` driver + `DATABASE_URL` (session-mode pooler, port 5432, `sslmode=require`). Tracks applied files in a `schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)` ledger table self-bootstrapped by the script.
- **Baseline mode:** `node server/migrate.js --baseline` reads all `.sql` filenames from `server/migrations/` dynamically and INSERTs them `ON CONFLICT DO NOTHING` — records what's already applied on production without re-running any SQL. Must run before the first Railway production deploy.
- **nixpacks.toml:** `connect-four/nixpacks.toml`. Build command: `cd ../solver-src && make && npm run build` (`solver-src/` is at repo root, not inside `connect-four/`). Start command: `node server/migrate.js && node server/index.js`. Packages: `gcc`, `gnumake`.
- **`pg` must be in `dependencies`** (not `devDependencies`) — Railway's production build prunes devDeps.
- **VITE_\* vars** are build-time (must be in Railway before first build); `FRONTEND_URL` is runtime (set after domain assigned, triggers restart not rebuild).
- **Staging env vars:** Stripe, OpenAI, Anthropic, Sentry keys are optional on staging (app degrades to 503); 7 core vars required on both environments.
- **Puzzle data:** `pg_dump --data-only --table=puzzles` from production → import into staging as a one-time manual op. Requires Postgres 15 client locally (version must match Supabase server version).
- **Auth redirect:** Each Supabase project needs its own magic-link redirect URL allowlisted in Auth → URL Configuration → Redirect URLs (see `project_magic_link_auth_race.md`).

**Pre-existing test failure (unrelated to this deploy work):** `classifier.test.js` — `forbidden_columns board-based: col5 gives opponent gravity-top win` — was failing before this spec; do not treat as a regression.


---

## (merged from `bug_railway_trust_proxy` — express-rate-limit throws ValidationError on Railway unless trust proxy is set)

Railway injects `X-Forwarded-For` on every request. `express-rate-limit` detects this and throws a `ValidationError` if Express's `trust proxy` is false (the default), causing every rate-limited endpoint to return 500.

**Why:** Discovered 2026-06-13 from Railway access logs showing 500 on `/api/user/migrate`.

**How to apply:** `app.set('trust proxy', 1)` must appear right after `const app = express()` in `index.js`. Already fixed. If deploying to a new Railway service, verify this line is present before any other middleware.


---

## (merged from `project_railway_solver_clock_skew` — Railway builds fail when .depend file timestamp is ahead of builder clock; make skips linking silently, binary absent → all solver queries timeout)

## Trap

Railway's builder clock can be skewed relative to `.depend` file timestamps. When `.depend` is
in the future, `make` prints "Clock skew detected. Your build may be incomplete." and silently
skips the linking step — no `c4solver` binary is produced, but the build exits 0. Result: every
solver query times out at 30 s with `[solver.query] TIMEOUT`.

## Required build command in `railpack.json`

```json
"cd solver-src && make -B SERVER_DIR=../server && test -f ../server/c4solver"
```
- `-B`: unconditionally rebuild, ignoring timestamps
- `test -f ../server/c4solver`: fails the build immediately if the binary is absent

## Guard to add in `c4solver-wrapper.js`

```js
if (!existsSync(BINARY_PATH)) throw new Error('Solver binary not found: ' + BINARY_PATH);
process.on('error', (err) => { /* reject all queued entries */ });
```
Without this, a missing binary produces a silent dead process and 30 s timeouts on every query.

## Verification

Before deploying: check Railway build logs for `make -B` output showing the link step completed.
After deploying: `ls -la server/c4solver` in the container should show a recent binary.
