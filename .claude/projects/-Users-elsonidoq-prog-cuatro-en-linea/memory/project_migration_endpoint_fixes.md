---
name: project_migration_endpoint_fixes
description: POST /api/user/migrate — known bugs fixed and current behavior
metadata: 
  node_type: memory
  type: project
  originSessionId: 477d4e49-b083-47b9-8ed4-3e917f0b9c34
---

Five bugs fixed in the migrate endpoint (spec 030 + production debugging 2026-06-13):

**Why:** these were discovered during first end-to-end test of the anonymous→registered migration flow.

**How to apply:** if migration behaves unexpectedly, check these invariants first.

1. **Silent write failures** — helpers return `{ error }` not throw; migrate endpoint now checks `results.find(r => r?.error)` and returns 500 if any write failed.

2. **null device_uuid for new users** — `on_auth_user_created` trigger inserts a `users` row with `device_uuid=null`. The migrate endpoint now generates a UUID server-side and updates the profile before writing `puzzle_attempts`.

3. **FK violation on puzzle_attempts** — if puzzle_ids from IndexedDB don't exist in the target DB (e.g. local dev with no seed data), bulk insert fails. Falls back to row-by-row insert, skipping rows with code `23503` (FK violation) alongside existing `23505` (unique violation) skip.

4. **`trust proxy` missing — 500 on Railway** — `express-rate-limit` throws `ValidationError` when `X-Forwarded-For` is set but `trust proxy` is false. All requests from Railway returned 500 before adding `app.set('trust proxy', 1)` in `index.js`. See [[bug_railway_trust_proxy]].

5. **Missing `public.users` row — FK violation on `lesson_progress`** — Supabase GoTrue doesn't fire the `on_auth_user_created` trigger, so new auth users have no `public.users` row. `writeLessonProgress` FK-referenced `users.id` and failed. Fixed by: (a) backfilling all existing users in production, (b) `loadUser` middleware now auto-creates the row if missing. See [[bug_supabase_trigger_not_firing]].
