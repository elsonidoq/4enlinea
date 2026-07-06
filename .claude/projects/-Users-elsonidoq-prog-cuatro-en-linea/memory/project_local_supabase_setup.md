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
- `SUPABASE_SERVICE_ROLE_KEY` = **JWT-format** `SERVICE_ROLE_KEY` (`eyJ...`) from `supabase status` — NOT the `sb_secret_*` key. PostgREST decodes the JWT to get `role: service_role`; `sb_secret_*` is an opaque token that PostgREST can't parse, so it falls back to `anon` role → 42501 on inserts. See [[bug-supabase-js-session-contamination]].
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


---

## (merged from `feedback_supabase_config_modifiable` — User CAN modify production Supabase configuration via the dashboard; never assume it's off-limits)

Both local and production Supabase configurations are modifiable. Do not assume production settings are locked.

**Why:** Claude assumed production Supabase config was off-limits and fell back to workarounds. The user confirmed they can change production settings via the Supabase dashboard.

**How to apply:** When a Supabase feature is disabled by default (e.g. aggregate functions, max_rows), propose enabling it in config rather than working around it in code.
