# Staging/Production Infrastructure Design

**Date:** 2026-06-12
**Epic:** Epic 2 — Staging/Production Infrastructure & Deploy

---

## Decisions

### Hosting model

**Server (Node + c4solver):** Railway PaaS.

- The c4solver binary runs as a persistent child process spawned at server startup (2-second load time). This rules out serverless. Railway supports long-running processes, handles SSL/DNS automatically, and has near-zero cost at MVP scale (usage-based billing).
- Express serves the built `dist/` as static files from the same service — no separate frontend host, no CORS configuration required.

**Static frontend:** Served by Express from the same Railway service. `npm run build` produces `dist/`; `express.static('dist/')` serves it at `/`.

**Topology:** One Railway project with two environments (`staging` and `production`). Each environment gets its own build (important because `VITE_*` vars are baked into the Vite bundle at build time), its own URL, and its own env var set.

**Per-environment topology:**

```
staging environment:
  Railway service (staging build) → Supabase project [staging]

production environment:
  Railway service (production build) → Supabase project [production]
```

### DB split mechanism

Two separate Supabase projects — `staging` and `production`.

- Full isolation: separate auth users, separate schema, separate RLS policies, separate service-role keys.
- Staging can remain on Supabase's free tier; production upgrades to Pro when needed.
- Independent migrations: applying a migration to staging does not touch production.

### Migration runner

Hand-rolled Node script (`server/migrate.js`) with a `schema_migrations` ledger table in each Supabase DB.

**`schema_migrations` table:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`server/migrate.js` behavior:**
1. Connect to the DB using `DATABASE_URL` from env.
2. Ensure `schema_migrations` table exists (idempotent `CREATE TABLE IF NOT EXISTS`).
3. Read all `.sql` files from `server/migrations/` sorted alphabetically.
4. For each file not already in `schema_migrations`, execute it in a transaction, then insert its filename into `schema_migrations`.
5. Exit 0 on success, non-zero on failure (blocks server start).

**Railway deploy command:**
```
node server/migrate.js && node server/index.js
```

Migrations run before the server starts. A failed migration aborts the deploy.

---

## Environment variables

Both environments share the same variable names; values differ per environment. Set in Railway's environment-specific config panel.

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | Project URL for this environment's Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side only) |
| `DATABASE_URL` | Pooler connection string (used by `migrate.js`) |
| `VITE_SUPABASE_URL` | Baked into frontend build at deploy time |
| `VITE_SUPABASE_ANON_KEY` | Baked into frontend build at deploy time |
| `OPENAI_API_KEY` | LLM key |
| `OPENAI_MODEL` | e.g. `gpt-5.4-mini` |
| `FRONTEND_URL` | Full origin URL for this environment (used in CORS / OG tags) |
| `PORT` | Railway sets this automatically; default 3001 |

---

## Promote staging → production flow

1. Feature branch merges to `main`.
2. Railway auto-deploys `main` to the `staging` environment: builds, runs `migrate.js` (applies new migrations to staging DB), starts server.
3. Smoke test: load app, sign in, complete one puzzle on the staging URL.
4. Manual redeploy (or Railway's "promote" button) deploys the same commit to the `production` environment: builds, runs `migrate.js` (applies same migrations to production DB), starts server.

---

## What is NOT included

- CDN/edge tuning or Cloudflare setup (post-MVP)
- Autoscaling, blue-green or canary deploys
- Secret manager (Railway's env var panel is the secrets store for MVP)
- Observability dashboards beyond existing Sentry
