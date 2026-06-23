---
name: project_spec030_server_mediated_data_access
description: Spec 030 (server-mediated data access) done and ready for implementation — key non-obvious invariants for the store rewrite
metadata:
  type: project
---

Spec 030: server-mediated data access — browser must never talk to Supabase directly; all reads/writes go through `/api/user/*` server endpoints. Read `specs/030-server-mediated-data-access/spec.md` before touching any SupabaseStore method or `/api/user/*` endpoints.

## Non-obvious invariants

**session_stats write asymmetry — the most dangerous trap:**
- `POST /api/user/session-stats` stores `req.body.stats` (the *inner* object) as the `stats` jsonb column. Its caller sends `{ date, stats: next }` — storing the whole body would double-nest and silently break two consumers.
- `POST /api/user/challenge-session` stores the *entire* `req.body` as the `stats` jsonb column. Its caller sends the session object directly.
- These two are asymmetric and BOTH correct. Never unify them with `||` jsonb merge — the two shapes are incompatible and a merge produces a corrupt hybrid blob.

**session_stats table shape (confirmed live):**
- Exactly 3 columns: `user_id (uuid)`, `date (date)`, `stats (jsonb)`. No flat stats columns.
- Both session-stats and challenge-session write to the same `(user_id, date)` row. Last writer wins (full-replace upsert only).

**device_uuid is server-derived:**
- `POST /api/user/puzzle-attempts` (FR-005): server uses `req.user.device_uuid`; client body does NOT include device_uuid.
- `POST /api/user/migrate` (FR-014): same — device_uuid added server-side per attempt, not from the body.

**migrate endpoint covers 5 write targets (not 3):**
`POST /api/user/migrate` body: `{ puzzle_attempts, session_stats, lesson_progress, sparring_record: { W, L, D }, streak: { streak_count, last_active_date } }`. sparring_record → `users.sparring_record` jsonb; streak → `users.streak_count` + `users.last_active_date`. Omitting these silently drops user data.

**GET /api/user/profile returns req.user directly:**
`loadUser` already populates `req.user` with the 4 profile fields. The handler projects to exactly `{ device_uuid: req.user.device_uuid ?? null, tier, deep_reveal_count, deep_reveal_reset_at }` — no second DB query. Do not return `req.user` verbatim (leaks `id` field).

**Shared write helpers in Phase A-0:**
Five helpers in `userHelpers.js` (`writeSessionStats`, `writeLessonProgress`, `writePuzzleAttempts`, `writeSparringRecord`, `writeStreak`) are used by both individual endpoints AND the migrate handler. Both write paths must call the same helpers — never duplicate the logic.
