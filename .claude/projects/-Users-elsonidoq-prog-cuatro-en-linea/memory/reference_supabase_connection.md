---
name: Supabase connection details — DecodeC4
description: How to connect to the DecodeC4 Supabase project; new key format and pooler hostname
type: reference
originSessionId: 5719c43c-8011-4e5d-a333-7894384b241b
---
**Project ref:** `kxtqwsumojtexokrtlfp`
**Dashboard:** https://supabase.com (project: DecodeC4)

**New Supabase key format (this project uses it):**
- Anon/publishable key: `sb_publishable_...` (used as VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_PUBLISHABLE_KEY)
- Service role/secret key: `sb_secret_...` (used as SUPABASE_SERVICE_ROLE_KEY)
- Old JWT format (`eyJ...`) is under "Legacy anon, service_role API keys" tab in Settings → API Keys

**This project has a REMOTE Supabase instance only — no local Supabase.** There is no `supabase start` / local setup. All migrations must be applied via psql against the remote pooler.

**Applying migrations:**
```
psql "$DATABASE_URL" -f connect-four/server/migrations/NNN_slug.sql
```
`DATABASE_URL` is in `connect-four/server/.env` — it already points to the pooler.

**Direct DB connection:**
- Hostname `db.kxtqwsumojtexokrtlfp.supabase.co` does NOT resolve (new platform)
- Use the session pooler instead: `aws-1-us-west-2.pooler.supabase.com:5432`
- Full format: `postgresql://postgres.kxtqwsumojtexokrtlfp:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
- Get connection string from dashboard → Connect button → URI tab
