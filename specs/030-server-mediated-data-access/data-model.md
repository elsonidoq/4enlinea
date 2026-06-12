# Data Model: Server-Mediated Data Access

**Feature**: 030-server-mediated-data-access  
**Date**: 2026-06-12

No new tables or columns are introduced by this feature. The following documents which existing entities are touched, their read/write semantics, and any invariants that must be enforced by the new endpoints.

---

## Entities

### session_stats

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → users(id); part of composite PK |
| date | date | Part of composite PK |
| stats | jsonb | Full blob; shape varies by caller (saveSessionStats vs saveChallengeSession) |

**PK**: `(user_id, date)` — composite.

**Upsert semantics**: Full-replace on conflict. The `stats` column receives the entire request body. No jsonb merge. Last writer wins when two writes target the same `(user_id, date)`. This is the accepted trade-off (see research.md Decision 2).

**Two callers, one table**:
- `POST /api/user/session-stats` stores the result of a puzzle/challenge session.
- `POST /api/user/challenge-session` stores challenge session state. Different shape.
- Both upsert the same `stats` jsonb with full-replace. Mixing the two for the same date is unlikely in practice but produces last-writer-wins behavior intentionally.

---

### users (touched columns)

| Column | Type | Endpoint(s) |
|---|---|---|
| device_uuid | text | GET /api/user/profile |
| tier | text | GET /api/user/profile |
| deep_reveal_count | integer | GET /api/user/profile |
| deep_reveal_reset_at | timestamptz | GET /api/user/profile |
| sparring_record | jsonb `{ W, L, D }` | GET + POST /api/user/sparring-record, POST /api/user/migrate |
| streak_count | integer | GET /api/user/streak, POST /api/user/streak/record-day, POST /api/user/migrate |
| last_active_date | date | GET /api/user/streak, POST /api/user/streak/record-day, POST /api/user/migrate |

**Read-then-write for sparring_record**: GET current value → increment counter → UPDATE. Race condition negligible (per-user single-player counter).

**Record-day logic**: If `last_active_date === today` → no-op. If `last_active_date === yesterday` → `streak_count += 1`. Otherwise → reset to 1. Always set `last_active_date = today`.

---

### puzzle_attempts

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated server-side |
| puzzle_id | uuid | FK → puzzles(id) |
| user_id | uuid | Set to `req.user.id` server-side; never from client |
| device_uuid | text | Passed from client |
| moves_tried | integer[] | |
| outcome | text | |
| first_attempt_correct | boolean | |
| time_ms | integer | Nullable |
| created_at | timestamptz | Set server-side (`new Date().toISOString()`) |

**Append-only**: No upsert; each call inserts a new row.

---

### lesson_progress

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| user_id | uuid | FK → users(id) ON DELETE CASCADE |
| lesson_id | text | Maps from `lessonId` in API/client |
| completed_at | timestamptz | `null` → incomplete; `not null` → complete |

**Unique constraint**: `(user_id, lesson_id)` — upsert on conflict.

**Status derivation**: `completed_at != null → 'complete'`; `completed_at == null → 'incomplete'`. No `status` column in DB.

**Write guard**: Only write rows where `status === 'complete'`. The POST endpoint rejects other statuses with 400. The migrate endpoint silently skips non-complete entries.

---

## Security Posture (summary — full text in db-schema.md update)

All `/api/user/*` endpoints use the server-side service-role Supabase key, which bypasses RLS. Server-side ownership enforcement (`WHERE user_id = req.user.id`) is the primary access control layer. Existing RLS policies remain as defense-in-depth but are bypassed by the service-role key. No new RLS policies are required (no new tables).

After this feature ships, the browser anon key is used only for `supabase.auth.*` calls.
