---
name: reference-postgrest-schema-cache
description: "PostgREST caches the DB schema — adding a column via SQL doesn't take effect until the cache is reloaded"
metadata: 
  node_type: memory
  type: reference
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
---

After running a migration that adds a column, PostgREST (the Supabase API layer) may still return "Bad Request" when querying that column — it hasn't seen the schema change yet.

**Fix:** In the Supabase dashboard → Settings → API → "Reload schema cache", or run:
```sql
NOTIFY pgrst, 'reload schema';
```

**Symptom:** Supabase client returns `{ error: { message: "Bad Request" } }` on a query that references the new column, even though `information_schema.columns` confirms the column exists.

This burned us 2026-06-11 after adding `blunders.papergames_game_id` — the column existed in the DB but PostgREST didn't know about it.
