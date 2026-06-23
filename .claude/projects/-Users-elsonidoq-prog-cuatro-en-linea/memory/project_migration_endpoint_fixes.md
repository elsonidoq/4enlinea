---
name: project_migration_endpoint_fixes
description: POST /api/user/migrate — known bugs fixed and current behavior
metadata: 
  node_type: memory
  type: project
  originSessionId: 477d4e49-b083-47b9-8ed4-3e917f0b9c34
---

Invariants for the `POST /api/user/migrate` endpoint — check these first if migration behaves unexpectedly.

1. **Silent write failures** — DB helpers return `{ error }` not throw; the migrate endpoint checks `results.find(r => r?.error)` and returns 500 if any write failed. Do not assume a missing throw means success.

2. **null device_uuid for new users** — the `on_auth_user_created` trigger inserts a `users` row with `device_uuid=null`. The migrate endpoint must generate a UUID server-side and update the profile before writing `puzzle_attempts`.

3. **FK violation on puzzle_attempts** — puzzle_ids from IndexedDB may not exist in the target DB (e.g. local dev without seed data). Bulk insert falls back to row-by-row, skipping rows with code `23503` (FK violation) and `23505` (unique violation).
