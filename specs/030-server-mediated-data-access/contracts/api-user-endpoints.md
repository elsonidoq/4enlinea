# API Contracts: /api/user/* Endpoints

**Feature**: 030-server-mediated-data-access  
**Date**: 2026-06-12

## Common rules

- **Route prefix**: `/api/user/`
- **Auth**: Required on every endpoint. `loadUser` middleware runs globally; check `req.user` at the start of each handler and return `401 { "error": "Unauthorized" }` if null.
- **Ownership**: Every query filters `user_id = req.user.id` (or `id = req.user.id` for `users` table).
- **Supabase client**: Use the server-side service-role `supabase` client. Return `503 { "error": "Supabase not configured" }` if `!supabase`.
- **Error shape**: `{ "error": "<message string>" }` — no extra keys.
- **Route registration order**: Register `GET /api/user/session-stats/all` before `GET /api/user/session-stats` (defensive measure per api-conventions.md).

---

## GET /api/user/profile

**Purpose**: Replaces `SupabaseStore.getProfile()`

**Response** (200):
```json
{ "device_uuid": "...", "tier": "free", "deep_reveal_count": 0, "deep_reveal_reset_at": "..." }
```
If the `users` row does not exist, return the safe default:
```json
{ "device_uuid": null, "tier": "free", "deep_reveal_count": 0, "deep_reveal_reset_at": null }
```

**DB query**: `SELECT device_uuid, tier, deep_reveal_count, deep_reveal_reset_at FROM users WHERE id = req.user.id`

---

## GET /api/user/session-stats

**Purpose**: Replaces `SupabaseStore.getSessionStats(date)`

**Query param**: `date` — required, format `YYYY-MM-DD`. Return 400 if missing or does not match `/^\d{4}-\d{2}-\d{2}$/`.

**Response** (200):  
Full row object `{ "user_id": "...", "date": "...", "stats": {...} }`, or `null` if no row exists.

**DB query**: `SELECT * FROM session_stats WHERE user_id = req.user.id AND date = date_param`

---

## POST /api/user/session-stats

**Purpose**: Replaces `SupabaseStore.saveSessionStats(stats)`

**Body**: `{ "date": "YYYY-MM-DD", ...statsFields }` — the entire body is stored as the `stats` jsonb.  
Return 400 if `date` is missing from body.

**Response**: 204 No Content

**DB operation**: Upsert `{ user_id: req.user.id, date: body.date, stats: body }` on conflict `(user_id, date)` with full-replace (no `||` merge).

---

## GET /api/user/session-stats/all

**Purpose**: Replaces `SupabaseStore.getAllSessionStats()`

**MUST be registered before `GET /api/user/session-stats`** in Express.

**Response** (200):
```json
{
  "rows": [ { "user_id": "...", "date": "...", "stats": {...} }, ... ],
  "byPattern": {
    "immediate_threat": { "accuracy": 0.72, "attempted": 5 }
  }
}
```

`byPattern` computation (same as current `getAllSessionStats` in SupabaseStore):
- For each `session_stats` row, read `stats.category` and `stats.accuracy`.
- Weight = `(stats.optimalCount ?? 0) + (stats.blunderCount ?? 0) + (stats.suboptimalCount ?? 0) || 1`
- Accumulate weighted accuracy; finalize as weighted mean.

**DB query**: `SELECT * FROM session_stats WHERE user_id = req.user.id`

---

## POST /api/user/puzzle-attempts

**Purpose**: Replaces `SupabaseStore.recordPuzzleAttempt(attempt)`

**Body**: `{ "puzzle_id": "uuid", "device_uuid": "...", "moves_tried": [], "outcome": "...", "first_attempt_correct": true, "time_ms": 1234 }`

Return 400 if any required field is missing.

**Response**: 204 No Content

**DB operation**: Insert `{ ...body, user_id: req.user.id, created_at: new Date().toISOString() }` into `puzzle_attempts`.

---

## GET /api/user/lesson-progress

**Purpose**: Replaces `SupabaseStore.getLessonProgress()`

**Response** (200):
```json
[
  { "lessonId": "lesson-01-immediate-threat", "status": "complete" },
  { "lessonId": "lesson-02-block-before-build", "status": "incomplete" }
]
```

**DB query**: `SELECT lesson_id, completed_at FROM lesson_progress WHERE user_id = req.user.id`  
Map `lesson_id → lessonId`; `completed_at != null → 'complete'`, else `'incomplete'`.

---

## POST /api/user/lesson-progress

**Purpose**: Replaces `SupabaseStore.saveLessonProgress(lessonId, status)`

**Body**: `{ "lessonId": "...", "status": "complete" }`

Return 400 `{ "error": "status must be 'complete'" }` if `body.status !== 'complete'`.  
Return 400 if `lessonId` is missing.

**Response**: 204 No Content

**DB operation**: Upsert `{ user_id: req.user.id, lesson_id: body.lessonId, completed_at: new Date().toISOString() }` on conflict `(user_id, lesson_id)`.

---

## GET /api/user/sparring-record

**Purpose**: Replaces `SupabaseStore.getSparringRecord()`

**Response** (200):
```json
{ "W": 3, "L": 1, "D": 0 }
```
Default `{ W: 0, L: 0, D: 0 }` if the `users` row is missing or `sparring_record` is null.

**DB query**: `SELECT sparring_record FROM users WHERE id = req.user.id`

---

## POST /api/user/sparring-record

**Purpose**: Replaces `SupabaseStore.saveSparringRecord(result)`

**Body**: `{ "result": "win" | "loss" | "draw" }`

Return 400 if `result` is not one of the three valid values.

**Response**: 204 No Content

**DB operation**: Read-then-write:
1. `SELECT sparring_record FROM users WHERE id = req.user.id`
2. Increment `W`, `L`, or `D` in the returned jsonb.
3. `UPDATE users SET sparring_record = <new> WHERE id = req.user.id`

---

## GET /api/user/challenge-session

**Purpose**: Replaces `SupabaseStore.getLastChallengeSession()`

**Response** (200): The `stats` jsonb from the most-recent `session_stats` row (by date descending), or `null` if none.

**DB query**: `SELECT stats FROM session_stats WHERE user_id = req.user.id ORDER BY date DESC LIMIT 1`

---

## POST /api/user/challenge-session

**Purpose**: Replaces `SupabaseStore.saveChallengeSession(session)`

**Body**: `{ "date": "YYYY-MM-DD", ...sessionFields }` — the entire body is stored as the `stats` jsonb.  
Return 400 if `date` is missing.

**Response**: 204 No Content

**DB operation**: Upsert `{ user_id: req.user.id, date: body.date, stats: body }` on conflict `(user_id, date)` with full-replace (no `||` merge).

---

## GET /api/user/streak

**Purpose**: Replaces `SupabaseStore.getStreak()`

**Response** (200):
```json
{ "streak_count": 5, "last_active_date": "2026-06-12" }
```
Default `{ streak_count: 0, last_active_date: null }` if no row.

**DB query**: `SELECT streak_count, last_active_date FROM users WHERE id = req.user.id`

---

## POST /api/user/streak/record-day

**Purpose**: Replaces `SupabaseStore.recordActivityDay()`

**Body**: `{}` (empty, ignored)

**Response**: 204 No Content

**Logic** (same as current `recordActivityDay`):
1. Read `streak_count, last_active_date` from `users`.
2. Compute `today = new Date().toLocaleDateString('en-CA')` and `yesterday`.
3. If `last_active_date === today` → no-op, return 204.
4. If `last_active_date === yesterday` → `streak_count += 1`.
5. Otherwise → `streak_count = 1`.
6. `UPDATE users SET streak_count = ..., last_active_date = today WHERE id = req.user.id`

---

## POST /api/user/migrate

**Purpose**: Replaces the direct-Supabase writes in `IndexedDBStore.migrateToSupabase()`

**Body**:
```json
{
  "puzzle_attempts": [...],
  "session_stats": [...],
  "lesson_progress": [...],
  "sparring_record": { "W": 0, "L": 0, "D": 0 },
  "streak": { "streak_count": 0, "last_active_date": null }
}
```

All 5 fields are required but may be empty arrays / default objects. Return 400 if the body is missing.

**Response**: 204 No Content on full success; 500 if any write fails.

**Write-target mappings**:

| Body field | DB operation |
|---|---|
| `puzzle_attempts` | Bulk insert into `puzzle_attempts`; set `user_id = req.user.id` on every row; set `created_at = now()` if absent; use `ignoreDuplicates: true` |
| `session_stats` | For each element: upsert `{ user_id: req.user.id, date: el.date, stats: el }` on conflict `(user_id, date)` |
| `lesson_progress` | For each element where `status === 'complete'`: upsert `{ user_id: req.user.id, lesson_id: el.lessonId, completed_at: now() }` on conflict `(user_id, lesson_id)` |
| `sparring_record` | `UPDATE users SET sparring_record = body.sparring_record WHERE id = req.user.id` |
| `streak` | `UPDATE users SET streak_count = body.streak.streak_count, last_active_date = body.streak.last_active_date WHERE id = req.user.id` |

All 5 writes execute in `Promise.all([...])` inside a `try/catch`. If any throws, return 500 immediately. IndexedDB is cleared only on 204 response (client-side guard).
