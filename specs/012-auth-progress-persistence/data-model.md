# Data Model: Auth & Progress Persistence (Epic 7)

**Branch**: `101-new-design` | **Date**: 2026-05-30

---

## Entities

### 1. Profile (IndexedDB — unchanged shape, reduced fields)

**Store**: `profile` (keyPath: `device_uuid`, version 1 — no change)

| Field | Type | Notes |
|---|---|---|
| `device_uuid` | string (UUID) | Primary key; generated once per device |
| `tier` | `'free'` | Changed from `'anonymous'` to `'free'` |

**Removed fields** (no longer stored): `deep_reveal_count`, `deep_reveal_reset_at`.

**Rationale**: FR-011 — anonymous users have no quota. `deep_reveal_count` and `deep_reveal_reset_at` are server-managed for authenticated users only.

---

### 2. LessonProgress (IndexedDB)

**New store**: `lesson_progress` (keyPath: `lessonId`, version 2)

| Field | Type | Notes |
|---|---|---|
| `lessonId` | string | Primary key (e.g., `'lesson-05-claimeven'`) |
| `status` | `'complete'` | Extensible; only `'complete'` used in MVP |

**Methods**: `saveLessonProgress(lessonId, status)` → upsert by `lessonId`; `getLessonProgress()` → `Array<{lessonId, status}>`.

---

### 3. SparringRecord (IndexedDB)

**New store**: `sparring_record` (keyPath: `id`, version 2)

| Field | Type | Notes |
|---|---|---|
| `id` | `'singleton'` | Fixed key; only one record exists |
| `W` | integer | Wins |
| `L` | integer | Losses |
| `D` | integer | Draws |

**Methods**: `saveSparringRecord(result: 'win'|'loss'|'draw')` → read-modify-write on singleton; `getSparringRecord()` → `{W, L, D}`, defaults to `{W:0, L:0, D:0}`.

---

### 4. ChallengeSession (IndexedDB — reuses `session_stats` store)

**Existing store**: `session_stats` (keyPath: `date`, version 1 — no change)

| Field | Type | Notes |
|---|---|---|
| `date` | string (`YYYY-MM-DD`) | Primary key; one row per calendar day |
| `category` | string | Puzzle category slug |
| `accuracy` | number | Fraction correct (0–1) |
| `optimalCount` | integer | Moves rated optimal |
| `blunderCount` | integer | Moves rated blunder |
| *(other fields)* | — | Existing shape preserved; `put` semantics overwrite |

**Methods**: `saveChallengeSession(session)` → `put` (overwrites by date); `getLastChallengeSession()` → most recent row or `null`.

**Note**: No new IndexedDB store for challenge sessions. `session_stats` already handles this.

---

### 5. Streak (IndexedDB)

**New store**: `streak` (keyPath: `id`, version 2)

| Field | Type | Notes |
|---|---|---|
| `id` | `'singleton'` | Fixed key |
| `streak_count` | integer | Current consecutive active days |
| `last_active_date` | string (`YYYY-MM-DD`) or `null` | Last day `recordActivityDay()` was called |

**Methods**: `recordActivityDay()` → streak logic (today=no-op, yesterday=+1, older=reset to 1); `getStreak()` → `{streak_count, last_active_date}`, defaults to `{streak_count:0, last_active_date:null}`.

---

### 6. users (Supabase — existing table, 3 new columns)

**Migration 020** adds:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `streak_count` | `INTEGER` | NO | `0` | Current streak |
| `last_active_date` | `DATE` | YES | — | Last activity date (nullable) |
| `sparring_record` | `JSONB` | NO | `'{"W":0,"L":0,"D":0}'` | Win/loss/draw counts |

**Existing columns unchanged**: `id`, `device_uuid`, `tier`, `deep_reveal_count`, `deep_reveal_reset_at`, `stripe_customer_id`, `created_at`, `updated_at`.

**`deep_reveal_reset_at` change** (Migration 022): Column already exists. Spec notes it is nullable after this migration. Current schema shows `NOT NULL` with a default. Migration 022 changes it to `nullable` — required so that existing users without a reset time are handled correctly by the `null → treat as expired` rule.

---

### 7. lesson_progress (Supabase — new table)

**Migration 021** creates:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK |
| `user_id` | `UUID FK → users(id) ON DELETE CASCADE` | NO | — | |
| `lesson_id` | `TEXT` | NO | — | Matches IndexedDB `lessonId` |
| `completed_at` | `TIMESTAMPTZ` | YES | — | Nullable; set on first completion |

**Constraint**: `UNIQUE(user_id, lesson_id)` — enables `ON CONFLICT` upsert.

**RLS**: Enable RLS; policy `auth.uid() = user_id` for SELECT, INSERT, UPDATE. Explicit GRANT: `GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO anon, authenticated`.

---

## IndexedDB Version Map

| Version | Stores |
|---|---|
| 1 (existing) | `profile`, `puzzle_attempts`, `session_stats` |
| 2 (new) | + `lesson_progress`, `sparring_record`, `streak` |

---

## SupabaseStore Method Extensions

All new methods mirror `IndexedDBStore` signatures exactly (Constitution §II — storage-agnostic interface):

| Method | DB target | Notes |
|---|---|---|
| `saveLessonProgress(lessonId, status)` | `lesson_progress` upsert on `(user_id, lesson_id)` | `completed_at = now()` |
| `getLessonProgress()` | `lesson_progress` SELECT WHERE `user_id` | Returns `Array<{lessonId, status}>` |
| `saveSparringRecord(result)` | `users.sparring_record` read-modify-write | `result ∈ 'win'|'loss'|'draw'` |
| `getSparringRecord()` | `users.sparring_record` SELECT | Returns `{W, L, D}` |
| `saveChallengeSession(session)` | `session_stats` upsert on `(user_id, date)` | `session.date` must be present |
| `getLastChallengeSession()` | `session_stats` SELECT ORDER BY date DESC LIMIT 1 | Returns row or `null` |
| `recordActivityDay()` | `users.streak_count + last_active_date` update | Same streak logic as IndexedDB |
| `getStreak()` | `users.streak_count + last_active_date` SELECT | Returns `{streak_count, last_active_date}` |
| `getAllSessionStats()` | `session_stats` SELECT all for user | Returns rows + `byPattern` aggregation |

**Modified method**: `saveSessionStats(stats)` — remove tier guard (`if (profile.tier !== 'paid') return`). Save for all authenticated users.

---

## Migration Sequence

| File | Number | Description |
|---|---|---|
| `020_users_progress_columns.sql` | 020 | Add `streak_count`, `last_active_date`, `sparring_record` to `users` |
| `021_lesson_progress_table.sql` | 021 | Create `lesson_progress` table with RLS + grants |
| `022_deep_reveal_reset_nullable.sql` | 022 | Make `users.deep_reveal_reset_at` nullable |

---

## Data Dependency Map (Constitution §VI)

Before any store method is implemented, every UI field is traced to its source:

| UI field | Store method | DB column/table | Notes |
|---|---|---|---|
| Stats: day streak | `getStreak()` | `users.streak_count` / `streak.streak_count` | |
| Stats: last active | `getStreak()` | `users.last_active_date` / `streak.last_active_date` | |
| Stats: sparring record | `getSparringRecord()` | `users.sparring_record` / `sparring_record.{W,L,D}` | |
| Stats: lessons done | `getLessonProgress()` | `lesson_progress` rows / `lesson_progress` store | Count `status='complete'` |
| Stats: avg accuracy | `getAllSessionStats()` | `session_stats.stats` JSONB | Aggregated in JS |
| Stats: per-pattern bars | `getAllSessionStats()` | `session_stats.stats.category` | `byPattern` map |
| Profile: tier | `getProfile()` | `users.tier` / `profile.tier` | |
| Deep Reveal quota | server-only | `users.deep_reveal_count`, `users.deep_reveal_reset_at` | Not in IndexedDB |
