---
name: project_migration_endpoint_fixes
description: POST /api/user/migrate — known bugs fixed and current behavior
metadata:
  type: project
---

Three bugs fixed in the migrate endpoint during spec 030 testing (2026-06-13):

**Why:** these were discovered during first end-to-end test of the anonymous→registered migration flow.

**How to apply:** if migration behaves unexpectedly, check these invariants first.

1. **Silent write failures** — helpers return `{ error }` not throw; migrate endpoint now checks `results.find(r => r?.error)` and returns 500 if any write failed.

2. **null device_uuid for new users** — `on_auth_user_created` trigger inserts a `users` row with `device_uuid=null`. The migrate endpoint now generates a UUID server-side and updates the profile before writing `puzzle_attempts`.

3. **FK violation on puzzle_attempts** — if puzzle_ids from IndexedDB don't exist in the target DB (e.g. local dev with no seed data), bulk insert fails. Falls back to row-by-row insert, skipping rows with code `23503` (FK violation) alongside existing `23505` (unique violation) skip.
