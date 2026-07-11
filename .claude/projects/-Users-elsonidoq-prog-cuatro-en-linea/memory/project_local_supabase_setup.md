---
name: project_local_supabase_setup
description: "Local Supabase dev environment setup — key facts, gotchas, and workflow"
metadata: 
  node_type: memory
  type: project
  originSessionId: eb04b04c-5c28-44e5-99df-8eda3cff3c07
---

Local Supabase runs at `http://127.0.0.1:54321`. Keys are new-format (`sb_publishable_` / `sb_secret_`).

**Why:** project uses local Supabase for dev/staging testing before production deploy.

**How to apply:** when setting up or debugging local Supabase, use these facts to avoid known traps.

## Key facts

- `SUPABASE_URL` in `server/.env` must be `http://127.0.0.1:54321` (NOT the storage S3 URL `/storage/v1/s3`)
- `SUPABASE_SERVICE_ROLE_KEY` = **JWT-format** `SERVICE_ROLE_KEY` (`eyJ...`) from `supabase status` — NOT the `sb_secret_*` key. PostgREST decodes the JWT to get `role: service_role`; `sb_secret_*` is an opaque token that PostgREST can't parse, so it falls back to `anon` role → 42501 on inserts. See [[project_auth_flow_traps]].
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


---

## (merged from `bug_papergames_games_grants` — papergames_games table missing anon/authenticated grants — GET /api/games returns 403 in local Supabase)

`GET /api/games` returns `{"error":"permission denied for table papergames_games"}` in local Supabase.

**Root cause:** Migration `038_papergames_games.sql` creates the table with no grants. Migration `040_service_role_grants.sql` adds `GRANT ... TO service_role`, but in local Supabase the `service_role` PostgreSQL role may not exist or PostgREST doesn't resolve it. Other tables (`games`, `blunders`) work because their own migrations grant to `anon, authenticated`.

**Fix:** Migration `046_papergames_games_grants.sql` adds `GRANT SELECT ON public.papergames_games TO anon, authenticated`. Created 2026-06-17. Apply via SQL Editor at `http://127.0.0.1:54323` or `psql`:
```sql
GRANT SELECT ON public.papergames_games TO anon, authenticated;
```

**How to apply:** Whenever `GET /api/games` returns permission denied for papergames_games in local dev, apply this migration. New tables must always include grants to `anon, authenticated` in their creation migration — don't rely on a separate `040`-style catch-all.

Same trap recurred for the Stripe webhook (spec 045): `stripe_events` + `tracks` were missing `service_role` grants → 42501 on every webhook. Fixed by migration `055_stripe_events_tracks_grants.sql`. So the grants trail is now `040` (main batch) + `046`/`048` (papergames) + `055` (stripe_events/tracks) — `040` is NOT exhaustive. See [[project_stripe_webhook_live_testing]].
