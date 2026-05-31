# Database Schema

Live schema for the DecodeC4 Supabase project (`kxtqwsumojtexokrtlfp`).  
Connection: pooler at `aws-1-us-west-2.pooler.supabase.com:5432`, database `postgres`.  
**Note:** table names use underscores; `false_positives` in conversation → `false_positive_records` in DB; column names use `snake_case` (e.g. `move_string`, not `movestring`).

---

## `users`

PK: `id` (uuid, FK → auth.users)  
Unique: `device_uuid`, `stripe_customer_id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | |
| device_uuid | text | YES | |
| tier | text | NO | `'free'` |
| deep_reveal_count | integer | NO | `0` |
| deep_reveal_reset_at | timestamptz | YES | (nullable, no default — null treated as "already expired") |
| stripe_customer_id | text | YES | |
| streak_count | integer | NO | `0` |
| last_active_date | date | YES | |
| sparring_record | jsonb | NO | `'{"W":0,"L":0,"D":0}'` |
| created_at | timestamptz | NO | `now()` |
| updated_at | timestamptz | NO | `now()` |

---

## `puzzles`

PK: `id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| category | text | NO | |
| move_string | text | NO | |
| goal_prompt | text | NO | |
| goal_predicate_type | text | NO | |
| goal_predicate_params | jsonb | NO | `{}` |
| cooperative_ai_moves | integer[] | NO | `{}` |
| difficulty | integer | NO | `1` |
| is_active | boolean | NO | `true` |
| user_player | smallint | NO | `1` |
| interaction_mode | text | NO | `'single_move'` |
| highlight_metadata | jsonb | YES | |
| correct_col | integer | YES | |
| simulation_trace | jsonb | NO | `'[]'` |
| created_at | timestamptz | NO | `now()` |

---

## `candidates`

PK: `id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| category | text | NO | |
| move_string | text | NO | |
| solver_scores | jsonb | NO | |
| classifier_tags | jsonb | NO | `[]` |
| status | text | NO | `'pending'` |
| rejection_reason | text | YES | |
| generation_run_id | text | NO | |
| seed | bigint | NO | |
| user_player | smallint | NO | `1` |
| highlight_cells | jsonb | YES | |
| highlight_metadata | jsonb | YES | |
| category_evidence | jsonb | YES | |
| debug_trace | jsonb | YES | |
| correct_col | integer | YES | |
| reviewed_at | timestamptz | YES | |
| created_at | timestamptz | NO | `now()` |

---

## `false_positive_records`

PK: `id`  
FK: `candidate_id` → `candidates.id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| candidate_id | uuid | NO | |
| category | text | NO | |
| move_string | text | NO | |
| solver_scores | jsonb | NO | |
| annotator_note | text | YES | |
| created_at | timestamptz | NO | `now()` |

---

## `lesson_progress`

PK: `id`  
FK: `user_id` → `users(id) ON DELETE CASCADE`  
Unique: `(user_id, lesson_id)`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | NO | |
| lesson_id | text | NO | |
| completed_at | timestamptz | YES | |

RLS: `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.  
GRANT: `SELECT, INSERT, UPDATE, DELETE` to `authenticated` only (not `anon`).  
Note: no `status` column — completion state is derived at read time: `completed_at != null → 'complete'`.

---

## `puzzle_attempts`

PK: `id`  
FK: `puzzle_id` → `puzzles.id`, `user_id` → `users.id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| puzzle_id | uuid | NO | |
| user_id | uuid | YES | |
| device_uuid | text | NO | |
| moves_tried | integer[] | NO | `{}` |
| outcome | text | NO | |
| first_attempt_correct | boolean | NO | |
| time_ms | integer | YES | |
| created_at | timestamptz | NO | `now()` |

---

## `blunders`

PK: `id`  
FK: `user_id` → `users.id`, `puzzle_id` → `puzzles.id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | NO | |
| puzzle_id | uuid | YES | |
| board_state | text | NO | |
| move_played | integer | NO | |
| correct_move | integer | NO | |
| pattern_category | text | NO | |
| resolved_at | timestamptz | YES | |
| created_at | timestamptz | NO | `now()` |

---

## `session_stats`

PK: `(user_id, date)`  
FK: `user_id` → `users.id`

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| date | date | NO |
| stats | jsonb | NO |

---

## `explanation_cache`

PK: `position_hash`

| Column | Type | Nullable | Default |
|---|---|---|---|
| position_hash | text | NO | |
| one_liner | text | NO | |
| deep_reveal_json | jsonb | NO | |
| created_at | timestamptz | NO | `now()` |

---

## `tracks`

PK: `id`  
FK: `user_id` → `users.id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | NO | `nextval(...)` |
| uid | text | NO | |
| user_id | uuid | YES | |
| path | text | NO | |
| event | text | NO | |
| event_data | jsonb | NO | `{}` |
| created_at | timestamptz | NO | `now()` |

---

## `llm_feedback`

PK: `id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| movestring | text | NO | |
| llm_prompt | text | NO | |
| llm_response | text | NO | |
| human_note | text | NO | |
| feature | text | NO | |
| created_at | timestamptz | NO | `now()` |

---

## `stripe_events`

PK: `id`  
Unique: `stripe_event_id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| stripe_event_id | text | NO | |
| type | text | NO | |
| payload | jsonb | NO | |
| processed_at | timestamptz | YES | |
| created_at | timestamptz | NO | `now()` |
