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
| papergames_id | text | YES | |
| last_import_at | timestamptz | YES | |
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
| shape_key | text | YES | |
| position | integer | YES | |
| highlight_cells | jsonb | YES | |
| created_at | timestamptz | NO | `now()` |

`puzzles` has no `approved`/`status` column — approval is `is_active` (boolean). `candidates` uses `status` (text) instead. Querying a nonexistent `approved` column returns Postgres `42703`.

**`shape_key`** / **`position`** / **`highlight_cells`** were added in migration 044. `shape_key` is the canonical shape fingerprint computed by `shapeKeyForPuzzle` (`server/shapeDescriptor.js`); `position` is the draw-order index that interleaves shapes for variety; both are assigned in bulk by the localhost-only `POST /api/admin/puzzles/reindex` endpoint (`server/index.js`), which groups a category's active puzzles by `shape_key` and round-robins `position` across the groups. `GET /api/puzzles/draw` returns puzzles `ORDER BY position`, so consecutive puzzles tend to differ in shape. Migration 044 grants `SELECT` on these three columns to `anon`/`authenticated`. `highlight_cells` mirrors the same column on `candidates`. The `shapeDescriptor.js` serializer MUST stay deterministic (sorted keys, `key=value|` fields, `(...)` nesting) — two different serializations of the same shape split identical shapes into separate `shape_key` groups and silently break the round-robin.

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

## `games`

AI sparring game records (migration 026; `accuracy real` added by 036; RLS by 037).

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid FK auth.users ON DELETE SET NULL | YES | |
| device_uuid | text | NO | |
| moves | text | NO | |
| difficulty | text CHECK in ('easy','medium','hard','perfect') | NO | |
| side | text CHECK in ('first','second') | NO | |
| result | text CHECK in ('win','loss','draw') | NO | |
| accuracy | real | YES | |
| created_at | timestamptz | NO | `now()` |

Index: `idx_games_device_created (device_uuid, created_at DESC)`. Grants: `SELECT, INSERT TO anon, authenticated` (required — without them PostgREST returns 42501).

`side` is stored as `'first'`/`'second'` — never color words. ALL completed games write a server row, anonymous users included (keyed by `device_uuid`): post-game analysis fetches movestrings server-side by `game_id`, so a localStorage-only record cannot serve it. The game `id` passed to `go('review', { id })` may be `null` if the insert failed — review flows must handle a missing game ID gracefully.

## `papergames_games`

Games imported from papergames.io. Separate from `games` (AI sparring) because the data shape differs: no `difficulty`, opponent metadata is stored.

PK: `id`
Unique: `(user_id, papergames_room_uid)` — composite, per-user (migration 053; was a global `UNIQUE(papergames_room_uid)` before). See "Per-user ownership" note below.
FK: `user_id` → `auth.users(id) ON DELETE SET NULL`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | YES | |
| papergames_room_uid | text | NO | |
| papergames_account_id | text | NO | |
| moves | text | NO | |
| side | text | NO | |
| result | text | NO | |
| opponent_name | text | NO | |
| opponent_account_id | text | NO | |
| opponent_avatar | text | YES | |
| opponent_country_code | text | YES | |
| opponent_elo | integer | YES | |
| finish_reason | text | YES | |
| duration_ms | integer | YES | |
| tournament_uid | text | YES | |
| played_at | timestamptz | NO | |
| accuracy | real | YES | |
| created_at | timestamptz | NO | `now()` |

Index: `(user_id, played_at DESC)` for per-user game listing.
RLS: Disabled (server accesses via service-role key).
`papergames_room_uid` is the deduplication key (papergames.io room identifier), scoped **per user** since migration 053 — see below.
`accuracy` is percentage of optimal user plies (0–100), computed during import; null for rows imported before migration 039.

**Per-user ownership (migration `053_papergames_ownership_and_blunder_index.sql`)**: `papergames_room_uid` was previously globally `UNIQUE`, so two different users importing the same external room (e.g. a shared/community papergames.io account) collided — the second user's import upsert (`onConflict: 'papergames_room_uid'`) silently reassigned the first user's row to the second user, transferring the game and all future blunder linkage away from user A with no visible error. Migration 053 drops that global constraint and adds `papergames_games_user_room_unique UNIQUE (user_id, papergames_room_uid)` instead, so each user gets their own row for the same room. `upsertGame()` (`server/papergamesImporter.js`) now upserts with `onConflict: 'user_id,papergames_room_uid'`. Two users importing the same room now produce two independent rows; the same user re-importing their own room still upserts in place (idempotent).

The `blunders` table links via `papergames_game_id uuid nullable FK → papergames_games(id) ON DELETE SET NULL`.

---

## `blunders`

PK: `id`  
FK: `user_id` → `users.id`, `puzzle_id` → `puzzles.id`, `papergames_game_id` → `papergames_games.id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | NO | |
| puzzle_id | uuid | YES | |
| board_state | text | NO | |
| move_played | integer | NO | |
| correct_move | integer | NO | |
| pattern_category | text | NO | |
| severity | integer | NO | `0` |
| blunder_severity | real | YES | |
| move_index | integer | YES | |
| papergames_game_id | uuid | YES | |
| game_id | uuid | YES | |
| reason | text | YES | |
| direction | text | YES | |
| quality | text | NO | `'blunder'` |
| resolved_at | timestamptz | YES | |
| created_at | timestamptz | NO | `now()` |

Indexes:
- `idx_blunders_user_unresolved` — `(user_id, created_at) WHERE resolved_at IS NULL`
- `idx_blunders_severity` — `(user_id, severity DESC) WHERE resolved_at IS NULL`
- `idx_blunders_papergames_unique` — UNIQUE `(user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` (deduplication per **user** + papergames game + ply; idempotent re-import). Re-scoped to include `user_id` by migration `053_papergames_ownership_and_blunder_index.sql` (was `(papergames_game_id, move_index)` before — a global index, ship alongside the `papergames_games` ownership fix above since each user now gets their own `papergames_game_id` for the same imported room, so `move_index` values legitimately repeat across users' rows for the same position).

> `idx_blunders_game_unique` was **dropped** in migration 041. It was a UNIQUE partial index on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`. It caused bulk imports to silently discard entire batches when any single row was a duplicate — the whole transaction rolled back, the error was treated as benign, and 0 rows were written. Duplicate blunder rows are now acceptable.

`severity` = `round((best_score − score) / 36 * 10)` — instant score-spread measure, [0, 10]. Computed at insert time; never recomputed on read.
`blunder_severity` = fraction of 3-ply post-blunder continuations ending in opponent win — graduated loss-of-control measure, [0, 1]. Computed by `computeBlunderSeverity()`.
`quality` = `'blunder'` (sign-crossing score drop) or `'suboptimal'` (same sign, strictly non-optimal). Added by migration 051. Both kinds are now persisted during `POST /api/games/analyze` and papergames import; previously only blunders were saved. Legacy rows default to `'blunder'`.

**CHECK constraint on `pattern_category`**: Must be one of 15 valid values:
`immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns` (legacy),
`z_threat`, `odd_even_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`,
`claimodd`, `claimeven`,
`drawing_move`, `suboptimal_move`
`unknown` is excluded (not a valid pattern_category). `forbidden_columns` is tolerated as a legacy value from earlier classifier versions.

**`reason`**: Free-text explanation of why the blunder was tagged this way, e.g. `"matched missed_own: forced_win"`. Populated by `tagBlunder()`. Nullable — older records or batch-inserted blunders may not have a reason.

**`direction`**: One of three known values (`missed_own`, `enabled_opponent`, `defensive_miss`) with no CHECK constraint for forward compatibility — future directions may be added. Nullable for older records.

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
| template_version | text | YES | (none) |
| audio_path | text | YES | (none) |
| audio_generated_at | timestamptz | YES | (none) |

**`audio_path`**: nullable TEXT (added in migration 050). Supabase Storage object path for the spoken (TTS) version of this deep-reveal explanation, e.g. `tts/deep-reveal/<sha256>.mp3`. A `null` value means TTS audio has not been generated yet. Keyed by `sha256(stripped_explanation_text)` — intentionally NOT keyed by `position_hash`, so a regenerated explanation gets its own audio.

**`audio_generated_at`**: nullable TIMESTAMPTZ (added in migration 050). Timestamp of when the TTS audio was generated. Used by the `POST /api/admin/tts/cleanup` endpoint for 30-day retention pruning.

**`template_version`**: nullable TEXT, no default. `'v2'` on all new rows written after Epic 3 (via the new `buildExplainContext` path). `NULL` on pre-existing rows — no backfill was performed. For operator inspection only (e.g., to identify rows generated by the old vs. new prompt builder). No index.

**`position_hash`** is `sha256('${movestring}:${col}')` where `col` is 0-indexed. Computed at write time in the `/api/explain-move-llm` endpoint.

**`deep_reveal_json`** shape: `{ explanation: string, prompt: string }`. The `prompt` field stores the full LLM system prompt used to generate the explanation (for cache-rebuild and debugging). May be `null` on very old rows (migration 023 made `llm_prompt` nullable before the field moved into `deep_reveal_json`).

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

---

## Security posture (established spec 030)

**Server-side service-role key**: All `/api/user/*` endpoints use the Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) server-side. The service-role key bypasses all Row-Level Security (RLS) policies. The browser anon key (`VITE_SUPABASE_ANON_KEY`) is now used exclusively for `supabase.auth.*` calls (sign-in, sign-up, token refresh). Data reads and writes never go through the anon key.

**Primary access control**: Every `/api/user/*` endpoint enforces ownership by filtering all queries with `user_id = req.user.id` (or `id = req.user.id` for the `users` table). The `req.user` object is populated by the `loadUser` middleware, which validates the JWT via `supabase.auth.getUser(token)` and fetches the user's profile row from `public.users`. If the token is invalid or absent, `req.user` is null and every data endpoint returns `401 Unauthorized`.

**Defense-in-depth**: Existing RLS policies on `session_stats`, `puzzle_attempts`, `lesson_progress`, and other tables remain in place as a second layer of protection. If a future code path bypasses the server-side ownership filter, RLS prevents cross-user data access. RLS is not relied upon as the primary access control mechanism.

**No new RLS policies**: This feature requires no new RLS policies. The existing policies are sufficient as defense-in-depth.

**PostgREST schema cache**: After any migration that adds columns, the PostgREST schema cache must be reloaded before Supabase client queries on the new column will work. Symptom: `{ error: { message: "Bad Request" } }` on a column that `information_schema.columns` confirms exists. Fix: run `NOTIFY pgrst, 'reload schema';` in the SQL editor, or use the Supabase dashboard at Settings → API → Reload schema cache.

**service_role table grants**: The service-role key bypasses RLS but still requires explicit table-level `GRANT` in Postgres. Every table the server reads or writes must include `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO service_role` in its migration. Without this, PostgREST returns "permission denied" even with a valid service-role key. See `040_service_role_grants.sql` for the full list. When adding a new table that the server accesses, always include this grant in the same migration.

**Client-side posture**: Zero `.from(...)` or `.rpc(...)` Supabase calls remain in the browser JavaScript bundle outside of `supabase.auth.*`. The browser communicates with the database exclusively through `/api/user/*` server endpoints, each of which enforces authentication and ownership server-side.
