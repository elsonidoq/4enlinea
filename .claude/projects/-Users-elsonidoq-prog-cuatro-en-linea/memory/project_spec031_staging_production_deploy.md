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
