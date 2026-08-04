# Database Schema

Live schema for the DecodeC4 Supabase project (`kxtqwsumojtexokrtlfp`).  
Connection: pooler at `aws-1-us-west-2.pooler.supabase.com:5432`, database `postgres`.  
**Note:** table names use underscores; `false_positives` in conversation → `false_positive_records` in DB; column names use `snake_case` (e.g. `move_string`, not `movestring`).

---

## `users`

PK: `id` (uuid, FK → auth.users)  
Unique: `device_uuid`, `paddle_customer_id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | |
| device_uuid | text | YES | |
| tier | text | NO | `'free'` |
| deep_reveal_count | integer | NO | `0` |
| deep_reveal_reset_at | timestamptz | YES | (nullable, no default — null treated as "already expired") |
| paddle_customer_id | text | YES | (renamed from `stripe_customer_id` by migration 060, spec 050) |
| papergames_id | text | YES | |
| last_import_at | timestamptz | YES | |
| streak_count | integer | NO | `0` |
| last_active_date | date | YES | |
| sparring_record | jsonb | NO | `'{"W":0,"L":0,"D":0}'` |
| onboarding_status | text | NO | `'not_encountered'` |
| created_at | timestamptz | NO | `now()` |
| updated_at | timestamptz | NO | `now()` |

**`onboarding_status`** (migration `057_users_onboarding_status.sql`, Epic 8 — Onboarding
Experience): `CHECK (onboarding_status IN ('not_encountered', 'seen', 'skipped'))`. `NOT NULL
DEFAULT 'not_encountered'` means no backfill step was required. No new grants needed — `012` and
`040` are table-level and already cover `users`. See `data-model.md`'s `onboarding_status` section
for the full three-state model and the local-profile mirror.

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
| correct_cols | integer[] | YES | `NULL` |
| simulation_trace | jsonb | NO | `'[]'` |
| shape_key | text | YES | |
| position | integer | YES | |
| highlight_cells | jsonb | YES | |
| created_at | timestamptz | NO | `now()` |

`puzzles` has no `approved`/`status` column — approval is `is_active` (boolean). `candidates` uses `status` (text) instead. Querying a nonexistent `approved` column returns Postgres `42703`.

**`correct_cols`** (migration `061_correct_cols.sql`, spec 051 Epic 1): the **sole** stored, solver-gated **answer set** for a row — an ascending-sorted `integer[]` of every 0-indexed column that grades `correct`/`tied` for that puzzle's category. `NULL` means "not yet backfilled" (fail-open at grading time — see `data-model.md`'s "Correct Column Storage" section for the full `NULL` vs `{}` distinction). The legacy scalar `correct_col` column was dropped by migration `064_drop_correct_col.sql` (spec 056, closing `docs/open_issues.md` OI-81) and no longer exists on this table.

**Stale-content disposition policy (D1, spec 057, resolved 2026-08-03): retire, never repair in
place.** When a detector change makes a live `overcut`/`undercut`/`z_threat` row's stored
`highlight_metadata` disagree with the current detector (or the row no longer matches the
predicate at all — see `docs/open_issues.md` OI-92), the row is **retired**
(`puzzles.is_active = false` / `candidates.status = 'rejected'`) and its category is refilled back
to the N=20 serving floor with fresh content — never patched in place with a rewritten
`highlight_metadata`. `server/scripts/fill-candidate-pools.mjs --apply` is this policy's one
mechanism (owner-run against staging/production; see `docs/deployment_steps.md` § "Spec 057 —
content pools"). This supersedes the narrower, in-place-repair approach
`repair-overcut-highlight-metadata.js` used for `overcut` only (spec 052/OI-92's original repair) —
that script is not extended to `undercut`/`z_threat`; any future detector change to these three
categories should retire-and-refill via `fill-candidate-pools.mjs`, not grow a second repair script.

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
| correct_cols | integer[] | YES | `NULL` |
| reviewed_at | timestamptz | YES | |
| created_at | timestamptz | NO | `now()` |

**Unique index `idx_candidates_run_move_unique` on `(generation_run_id, move_string)`** (migration 062, spec 054). It makes the `POST /api/admin/generate` insert-retry idempotent: the retry loop re-sends the identical batch after any error, including one that arrives *after* Postgres committed the first attempt. The insert therefore uses `.upsert(rows, { onConflict: 'generation_run_id,move_string', ignoreDuplicates: true })`, **not** `.insert(rows)` — a bare insert would violate the index and, because it is one batched multi-row statement, fail *atomically*, discarding every good row rather than just the duplicate.

`candidates.id` is a random `gen_random_uuid()`, so **never order by `id` to pick "the first" row** — for dedupe use `(created_at, ctid)`; a batch insert can share one `created_at`.

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
| outcome | text | NO | CHECK: `correct_first` \| `tied` \| `incorrect` \| `abandoned` |
| first_attempt_correct | boolean | NO | |
| time_ms | integer | YES | |
| created_at | timestamptz | NO | `now()` |

**`outcome` was narrowed by migration 063** (spec 054) from five values to four: `'revealed'` and `'correct_retry'` were dropped (no code path wrote them) and `'incorrect'` was added for a submitted-but-wrong answer, distinct from `'abandoned'` (the user left without answering). A correct-on-retry attempt is now stored as `'correct_first'`; **`first_attempt_correct` is the only remaining first-vs-retry signal.** Historical rows are deliberately not backfilled for the incorrect-vs-abandoned distinction — it is unrecoverable.

**`moves_tried` is an ARRAY.** Passing a scalar (a count, a single column index) is rejected by Postgres with `malformed array literal`, and every writer of this table is fire-and-forget, so the rejection is silent and the row is simply lost. Three client sites did exactly this until spec 054. Always pass `[col]` / the column list.

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
| user_id | uuid | YES | |
| device_uuid | text | YES | |
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

`user_id` was made **nullable** and `device_uuid text` added by migration `058_blunders_device_uuid.sql` (anon free deep reveal). An anonymous onboarding user's blunders are written with `user_id NULL` + `device_uuid` set (mirrors `games`); `POST /api/user/migrate` re-keys them to `user_id` on sign-up. Authenticated rows keep `user_id` set, `device_uuid NULL`. The table stays backend-only (service-role writes; RLS unchanged).

Indexes:
- `idx_blunders_device_game_unique` — UNIQUE `(device_uuid, game_id, move_index) WHERE user_id IS NULL AND device_uuid IS NOT NULL AND game_id IS NOT NULL` (migration `058`). Dedups **anon** AI-sparring rows — the `idx_blunders_game_unique` below does NOT, because Postgres treats NULL `user_id` as distinct. AI-sparring only; no anon papergames index.
- `idx_blunders_device_created` — `(device_uuid, created_at DESC) WHERE user_id IS NULL` (migration `058`) — anon coach-queue read path.
- `idx_blunders_user_unresolved` — `(user_id, created_at) WHERE resolved_at IS NULL`
- `idx_blunders_severity` — `(user_id, severity DESC) WHERE resolved_at IS NULL`
- `idx_blunders_papergames_unique` — UNIQUE `(user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` (deduplication per **user** + papergames game + ply; idempotent re-import). Re-scoped to include `user_id` by migration `053_papergames_ownership_and_blunder_index.sql` (was `(papergames_game_id, move_index)` before — a global index, ship alongside the `papergames_games` ownership fix above since each user now gets their own `papergames_game_id` for the same imported room, so `move_index` values legitimately repeat across users' rows for the same position).
- `idx_blunders_game_unique` — UNIQUE `(user_id, game_id, move_index) WHERE game_id IS NOT NULL` (migration `054_blunders_ai_game_unique.sql`). The AI-sparring counterpart of the papergames index above: prevents duplicate blunder rows when `POST /api/games/analyze` double-fires for the same game (StrictMode double-mount, network retry, double-tab). `insertGameBlunder`'s existing `23505` handler treats a conflict as success. **Name-reuse trap**: this reuses the name of the migration-030 index that migration 041 dropped (see below) — `CREATE UNIQUE INDEX IF NOT EXISTS` silently no-ops if a same-named index still exists, so the 041 drop must have run first. Migration 054 also runs a pre-flight dedup DELETE (tiebreak on `created_at`; can't separate same-millisecond dups).

> `idx_blunders_game_unique` (the migration-030 definition) was **dropped** in migration 041. That one was a UNIQUE partial index on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`, and it caused bulk imports to silently discard entire batches when any single row was a duplicate (whole transaction rolled back, error treated as benign, 0 rows written). Migration 054 re-uses the *name* but with a safe column set: `(user_id, game_id, move_index)` — `move_index` is unique per game by construction, so no cross-game collision. Duplicate rows are otherwise still acceptable at the DB level everywhere the index's partial predicate does not apply.

`severity` = `round((best_score − score) / 36 * 10)` — instant score-spread measure, [0, 10]. Computed at insert time; never recomputed on read.
`blunder_severity` = fraction of 3-ply post-blunder continuations ending in opponent win — graduated loss-of-control measure, [0, 1]. Computed by `computeBlunderSeverity()`.
`quality` = `'blunder'` or `'suboptimal'`. Added by migration 051, `NOT NULL DEFAULT 'blunder'` with a `CHECK (quality IN ('suboptimal', 'blunder'))`.

**Post spec-057 T035 (FR-019a, owner directive 2026-08-03 — "there must be exactly ONE criterion"): `scoreMove` (`server/moveQualityScorer.js`) is the SOLE grader of the game-move `quality` label in the repository.** It grades by outcome-class change: any win→draw or win→loss is `'blunder'` regardless of magnitude; a same-class-but-worse move is `'suboptimal'`; only in the all-columns-losing branch does it fall back to a `>4` score-drop threshold. This superseded a second, independently-computed grade that `classifyStoredMistake` used to produce for stored rows (`bestScore - playedScore > 4 ? 'blunder' : 'suboptimal'`) — the two disagreed on any move where a win/draw/loss class changed by ≤4 points (worked case: `bestScore=2, playedScore=0` — a won game thrown away — `scoreMove` says `'blunder'`, the deleted rule said `'suboptimal'`; this is OI-104's boundary case, now a regression test at `connect-four/tests/unit/qualitySingleCriterion.test.js`).

`classifyStoredMistake` (`server/mistakeStorageRule.js`) now decides storage **eligibility only** — whether a non-optimal move is stored at all — not its grade. Eligibility rules unchanged: slower wins (both scores > 0) and dead-position faster losses (the mover has no remaining four-in-a-row window) are skipped; see the storage-rule paragraph in `data-model.md`. All write paths (`POST /api/games/analyze`, papergames import) now take `quality` from `scoreMove` and pass it through verbatim to `insertGameBlunder`. (`POST /api/blunders` — the third write path this paragraph used to name — was retired in the same change: it had no client caller and no in-scope solver-scores array to grade with; see `server/index.js`'s comment where the route used to be.)

Two producers that used to be able to *invent* this label were removed as part of making `scoreMove` the sole grader, so no second place in the tree can produce a `quality` value: `server/insertGameBlunder.js`'s write-seam coercion (`row.quality === 'suboptimal' ? 'suboptimal' : 'blunder'`, which silently turned `undefined`/a typo into a `'blunder'` row) now validates against the two legal values and fails loudly (`console.error` + no insert) instead of defaulting; and `server/index.js`'s `GET /api/coach/queue` serve-seam fallback (`quality: b.quality ?? 'blunder'`) was deleted as dead code — the column's `NOT NULL DEFAULT` and the query's explicit `SELECT quality` already guarantee the key is always present.

Legacy rows written before this change may carry a `quality` graded by the deleted magnitude rule and are **not** repaired in place — see "Deploy: `blunders.quality` regenerate (post spec-057 T035)" in `docs/deployment_steps.md`.

**Domain boundary (owner scope ruling, 2026-08-03 — "game moves only, but NAME the boundary"): the `'optimal'|'suboptimal'|'blunder'` vocabulary is used by two unrelated domains sharing the same three words. This is deliberate, not a defect.**
1. **Game-move label** (this section): graded solely by `scoreMove`, stored in `blunders.quality` for AI-sparring/papergames plies.
2. **Puzzle-answer label**: graded **client-side**, by set-selection accuracy, in `src/screens/ChallengeScreen.jsx:586` (`const quality = allCorrect ? 'optimal' : noFalsePositives ? 'suboptimal' : 'blunder';`) — a different question ("did the player pick the right answer set?"), using **no solver scores**, and explicitly OUT of the FR-019a single-criterion unification. Two related puzzle-domain sites reuse the same vocabulary: `ChallengeScreen.jsx:492` (`quality: evaluation?.quality ?? 'blunder'`, a session-results fallback feeding `PostSetSummaryScreen.jsx:76`), and the puzzle-attempt `blunders` INSERT at `server/index.js:2647-2654`, which sets **no `quality` column at all** and therefore takes the migration-051 `NOT NULL DEFAULT 'blunder'` — a puzzle-attempt row's `quality` is a DB default, not a grading verdict.

A third, separate spec-049/Epic-9 **display override** exists in the puzzle domain's "accepted gate" (`ChallengeScreen.jsx:386,407`) — it overrides the *server's* label for display only and never writes a `blunders` row. It is recorded, not fixed, as `docs/open_issues.md` OI-134 (T057).

**CHECK constraint on `pattern_category`**: Must be one of 15 valid values:
`immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns` (legacy),
`z_threat`, `odd_even_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`,
`claimodd`, `claimeven`,
`drawing_move`, `suboptimal_move`
`unknown` is excluded (not a valid pattern_category). `forbidden_columns` is tolerated as a legacy value from earlier classifier versions.

**`reason`**: Free-text explanation of why the blunder was tagged this way, e.g. `"matched missed_own: forced_win"`. Populated by `tagBlunder()`. Nullable — older records or batch-inserted blunders may not have a reason.

**`direction`**: One of three known values (`missed_own`, `enabled_opponent`, `defensive_miss`), plus a fourth, narrower value `forfeited_win` (added 2026-07, spec 052 Decision D39) — emitted only by `tagBlunder`'s Phase E score-based fallback when `tag === 'drawing_move'` and the position was a forced win (`preScore > 0`) that dropped to a draw (`postScore === 0`). No CHECK constraint governs this column (verified: `migrations/034_blunders_direction.sql` is a bare `ALTER TABLE ... ADD COLUMN direction TEXT` with an explicit "deliberately unconstrained" comment), so `forfeited_win` required no migration. Nullable for older records.

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

PK: `(position_hash, locale)` — composite (migration 059). Was `position_hash` alone through migration 058.

| Column | Type | Nullable | Default |
|---|---|---|---|
| position_hash | text | NO | |
| locale | text | NO | `'en'` |
| one_liner | text | NO | |
| deep_reveal_json | jsonb | NO | |
| created_at | timestamptz | NO | `now()` |
| template_version | text | YES | (none) |
| audio_path | text | YES | (none) |
| audio_generated_at | timestamptz | YES | (none) |

**`locale`**: NOT NULL, default `'en'` (added in migration 059, which also promoted the PK to `(position_hash, locale)`). Language of the cached explanation — one of `'en'`/`'es'`. English and Spanish explanations for the same position are **distinct rows** sharing a `position_hash`. Existing rows backfilled to `'en'` via the default. **Trap:** any reader querying by `position_hash` alone with `.single()`/`.maybeSingle()` now risks matching two rows — every single-row reader must either scope by locale (use `buildCacheFilter(hash, locale)` from `server/explainCacheKey.mjs`) or `.limit(1)`. Locale reaches the endpoint via `req.locale` (from the `Accept-Language` header) except the TTS audio GET, which reads an explicit `?lang=` query param (see `api-conventions.md`).

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

## `payment_events`

Renamed from `stripe_events` by migration 060 (spec 050) — `event_id`/`event_type` renamed
from `stripe_event_id`/`type` at the same time. Same physical table (rename preserves RLS and
grants), now the Paddle webhook's idempotency ledger (`server/paddleProcessor.js`'s
`handleWebhook`).

PK: `id`  
Unique: `event_id`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| event_id | text | NO | |
| event_type | text | NO | |
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

**service_role table grants**: The service-role key bypasses RLS but still requires explicit table-level `GRANT` in Postgres. Every table the server reads or writes must include `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO service_role` in its migration. Without this, PostgREST returns "permission denied" even with a valid service-role key. `040_service_role_grants.sql` is the largest batch but is **not exhaustive** — tables added or first written after it were granted in follow-up migrations (e.g. `048` `papergames_games`, `055` the table now named `payment_events` (then `stripe_events`) + `tracks`, both of which the Paddle webhook writes to). When adding a new table that the server accesses, always include this grant in the same migration rather than assuming the `040` catch-all covers it.

**Client-side posture**: Zero `.from(...)` or `.rpc(...)` Supabase calls remain in the browser JavaScript bundle outside of `supabase.auth.*`. The browser communicates with the database exclusively through `/api/user/*` server endpoints, each of which enforces authentication and ownership server-side.
