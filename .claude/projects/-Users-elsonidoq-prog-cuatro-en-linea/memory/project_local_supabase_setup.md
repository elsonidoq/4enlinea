---
name: project_local_supabase_setup
description: Local Supabase dev environment setup — key facts, gotchas, and workflow
metadata:
  type: project
---

Local Supabase runs at `http://127.0.0.1:54321`. Keys are new-format (`sb_publishable_` / `sb_secret_`).

**Why:** project uses local Supabase for dev/staging testing before production deploy.

**How to apply:** when setting up or debugging local Supabase, use these facts to avoid known traps.

## Key facts

- `SUPABASE_URL` in `server/.env` must be `http://127.0.0.1:54321` (NOT the storage S3 URL `/storage/v1/s3`)
- `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...` key from `supabase status`
- `VITE_SUPABASE_URL` = `http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_...` key from `supabase status`
- Emails are captured by Mailpit at `http://127.0.0.1:54324` — they are NOT sent externally
- `supabase/config.toml` is committed so teammates can run `supabase start` without `supabase init`
- `supabase/migrations/` is NOT committed — `connect-four/server/migrations/` is the source of truth

## Local dev workflow

`supabase db reset` (wipes DB) → run migration script (applies all from `server/migrations/`) → `npm run dev`

No migration tracking needed locally since reset starts from zero every time.

## service_role grants

Migration `040_service_role_grants.sql` adds `SELECT/INSERT/UPDATE/DELETE` for `service_role` on all server-accessed tables. Required because local Supabase does not auto-grant these — without it, `loadUser` profile queries and all write helpers return "permission denied".
