---
name: bug_papergames_games_grants
description: papergames_games table missing anon/authenticated grants — GET /api/games returns 403 in local Supabase
metadata:
  type: project
---

`GET /api/games` returns `{"error":"permission denied for table papergames_games"}` in local Supabase.

**Root cause:** Migration `038_papergames_games.sql` creates the table with no grants. Migration `040_service_role_grants.sql` adds `GRANT ... TO service_role`, but in local Supabase the `service_role` PostgreSQL role may not exist or PostgREST doesn't resolve it. Other tables (`games`, `blunders`) work because their own migrations grant to `anon, authenticated`.

**Fix:** Migration `046_papergames_games_grants.sql` adds `GRANT SELECT ON public.papergames_games TO anon, authenticated`. Created 2026-06-17. Apply via SQL Editor at `http://127.0.0.1:54323` or `psql`:
```sql
GRANT SELECT ON public.papergames_games TO anon, authenticated;
```

**How to apply:** Whenever `GET /api/games` returns permission denied for papergames_games in local dev, apply this migration. New tables must always include grants to `anon, authenticated` in their creation migration — don't rely on a separate `040`-style catch-all.
