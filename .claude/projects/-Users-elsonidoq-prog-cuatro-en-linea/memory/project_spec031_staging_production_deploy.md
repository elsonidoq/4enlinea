---
name: spec-031-staging-production-deploy
description: Spec/plan/tasks done at specs/031-staging-production-deploy/; Railway + two Supabase projects + migrate.js; 24 tasks
metadata: 
  node_type: memory
  type: project
  originSessionId: 11bfc8cc-cbaf-4157-9b04-8ccfc5e53ae3
---

Spec, plan, and tasks complete at `specs/031-staging-production-deploy/`. 24 tasks total; not yet implemented.

**Why:** Epic 2 of TODOs_epics.md — the team needs isolated staging and production environments before shipping.

**Key architectural decisions locked in spec:**

- **Host:** Railway PaaS, one project with `staging` and `production` environments. Express serves `dist/` as static files from the same service (no separate frontend host).
- **DB:** Two separate Supabase projects. The **existing** Supabase project becomes production (zero data migration); a new free-tier project is provisioned for staging.
- **Migration runner:** Hand-rolled `connect-four/server/migrate.js` (does not exist yet — T002's deliverable). Uses `pg` driver + `DATABASE_URL` (session-mode pooler, port 5432, `sslmode=require`). Tracks applied files in a `schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)` ledger table self-bootstrapped by the script.
- **Baseline mode:** `node server/migrate.js --baseline` reads all `.sql` filenames from `server/migrations/` dynamically and INSERTs them `ON CONFLICT DO NOTHING` — records what's already applied on production without re-running any SQL. Must run before the first Railway production deploy.
- **nixpacks.toml:** `connect-four/nixpacks.toml` must be created. Build command: `cd ../solver-src && make && npm run build` (`solver-src/` is at repo root, not inside `connect-four/`). Start command: `node server/migrate.js && node server/index.js`. Packages: `gcc`, `gnumake`.
- **`pg` must move to `dependencies`** (currently in `devDependencies`) — T001.
- **VITE_\* vars** are build-time (must be in Railway before first build); `FRONTEND_URL` is runtime (set after domain assigned, triggers restart not rebuild).
- **Staging env vars:** Stripe, OpenAI, Anthropic, Sentry keys are optional on staging (app degrades to 503); 7 core vars required on both environments.
- **Puzzle data:** `pg_dump --data-only --table=puzzles` from production → import into staging as a one-time manual op. Requires Postgres 15 client locally (version must match Supabase server version).
- **Auth redirect:** Each Supabase project needs its own magic-link redirect URL allowlisted in Auth → URL Configuration → Redirect URLs (fixes `bug_auth_magic_link_redirect.md`).

**Migration count:** 39 `.sql` files on disk (001–040, file 004 absent).

**Pre-existing test failure (unrelated):** `classifier.test.js` — `forbidden_columns board-based: col5 gives opponent gravity-top win` — was failing before this spec work began; do not treat as a regression.

**How to apply:** Run `/coordinate-implementation specs/031-staging-production-deploy` to start implementation. See handoff prompt in session for non-obvious details (Railway build sandbox test, real Postgres DB required for migrate.test.js, T012/T013 write-conflict risk).
