# Data Model Conventions

## Primary Keys

**MUST**: Use `uuid PRIMARY KEY DEFAULT gen_random_uuid()` for all domain tables.
Rationale: UUIDs are safe to expose in URLs and APIs; auto-increment integers leak row counts.

Exception: `tracks` uses `bigserial` because it is append-only and never referenced by client-facing URLs.

## Column Naming

**MUST**: Use `snake_case` for all column names.
**MUST**: Timestamp columns are named `created_at`, `updated_at`, `reviewed_at`, or `resolved_at` (whichever applies). All are `timestamptz NOT NULL`.
**MUST**: Boolean flags follow the pattern `is_<adjective>` (e.g., `is_active`).

## Category Representation

**MUST**: Categories are stored as `text` slugs, not integers (first established by migration 011, which replaced integer category columns; extended to the current 11 slugs by migration 015).
Valid slugs: `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`, `odd_even_threat`, `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`.
Migration 027 added `'unknown'` as a valid slug in the `blunders_pattern_category_check` constraint, used when the post-game review classifier returned no pattern. Migration `052_blunders_parity_threat_tags.sql` (the latest migration touching this constraint) **dropped `'unknown'`** and widened the set for the three parity-aware threat tags. The current valid set for the `blunders` table is:
`'immediate_threat'`, `'forced_block'`, `'forced_win'`, `'double_threat'`, `'undercut'`, `'overcut'`, `'figure_7'`, `'j_shape'`, `'z_threat'`, `'odd_even_threat'`, `'claimeven'`, `'claimodd'`, `'major_threat_parity'`, `'major_threat_nonparity'`, `'minor_threat'`, `'drawing_move'`, `'suboptimal_move'`, `'forbidden_columns'`.
The catch-all for unclassified blunders is `'suboptimal_move'` — `'unknown'` is never written. This CHECK-constraint set is broader than (and a superset of) `server-conventions.md`'s Blunder Tag Registry (`VALID_BLUNDER_TAGS`, exactly 16 tags): it also allows `'claimodd'` and `'odd_even_threat'`, retained here only so historical rows stay valid, per migration 052's comment ("Existing allowed values (odd_even_threat, claimodd) are retained so historical rows stay valid"). Neither is written by current code.

Migration 028 added `severity INTEGER NOT NULL DEFAULT 0` to the `blunders` table. Value is `round((best_score − score) / 36 * 10)`, normalized to [0, 10]: 36 is the maximum possible spread on a 7×6 board (from +18 to −18), and the result is scaled to 10. Computed at insert time from the solver scores that are already in scope. Legacy rows default to 0. Never recompute on read — the solver may be unavailable for positions past a winning move. An index on `(user_id, severity DESC) WHERE resolved_at IS NULL` supports the queue endpoint's `ORDER BY severity DESC` without a full table scan.

Migration 029 added `blunder_severity real` — a graduated loss-of-control measure: the fraction of depth-3 post-blunder continuations where the opponent wins (0–1 range). Unlike `severity` (instant score spread), `blunder_severity` captures how much the move *actually* increases losing scenarios vs winning scenarios. This is the primary quality gate for blunders from already-losing positions (i.e., virtually all second-player moves), replacing the former `bestScore < 0` skip. **Do NOT re-add the `bestScore < 0` guard** (to `POST /api/blunders`, `POST /api/games/analyze`, or `reprocess_blunders.mjs`) — it made the blunder system blind to virtually all second-player games, since the first player has a theoretical forced win from the opening; the losing-branch scorer already grades blunders in lost positions (`played < bestScore - 4`). `blunder_severity` is computed for ALL blunders in the analyze endpoint, not just `bestScore >= 0`. For per-ply blunder diagnostics on any movestring, use `connect-four/server/scripts/diagnose_blunders.mjs`.

Migration 030 added a partial unique index `idx_blunders_game_unique` on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`, enabling atomic upsert deduplication of game blunders at the DB level. The `POST /api/blunders` endpoint now uses `.upsert()` with `ignoreDuplicates: true` instead of a check-then-insert pattern.
Rationale: Slug-keyed constraints are self-documenting; integer IDs required cross-referencing a lookup table.

Migration 034 added `direction text` (nullable, no CHECK constraint — "deliberately unconstrained to allow future extensions without a migration," per the migration's own comment). `direction` refines a `pattern_category` with the tactical role the blunder played (`missed_own`, `enabled_opponent`, `defensive_miss`). Spec 052 (2026-07, Decision D39) added a fourth value, `forfeited_win`: a narrower sub-case of `pattern_category === 'drawing_move'` where the pre-move position was a forced win (`preScore > 0`) that the played move dropped to a draw (`postScore === 0`). Because `direction` carries no CHECK constraint and `forfeited_win` is not a new `pattern_category`, this required no migration and no change to `blunderTags.js`'s `VALID_BLUNDER_TAGS` (which tracks `pattern_category` only). On the stored path, `drawing_move` is now emitted exclusively for this forfeited-win case — a genuine draw-to-draw position never reached `drawing_move` even before this change; it falls through to `{ tag: 'suboptimal_move', direction: 'missed_own' }`.

Migration 036 added `game_id uuid` (nullable FK → `games(id)`, `ON DELETE SET NULL`) to the `blunders` table. This links blunders created during post-game analysis to their originating sparring game row. Blunders from puzzle attempts continue to use `puzzle_id`; `game_id` is `null` for those. `GET /api/games` uses `game_id` to compute per-game `blunder_count` in a single query.

Migration 051 added `quality text NOT NULL DEFAULT 'blunder' CHECK (quality IN ('suboptimal', 'blunder'))`. Both suboptimal and blunder plies from post-game analysis are now persisted. Existing rows (all blunders) default to `'blunder'`.

**Storage rule (2026-07, supersedes migration 051's "store every non-optimal ply")**: `server/mistakeStorageRule.js`'s `classifyStoredMistake(bestScore, playedScore, movestring)` is the single gate for all three game-mistake write paths (`POST /api/games/analyze`, `papergamesImporter.extractBlunders`, `POST /api/blunders`). A non-optimal ply is stored only when:
- it drops the game-theoretic outcome class (win→draw, win→loss, draw→loss), **or**
- both scores are negative (faster loss) **and** the mover is still *alive* — at least one 4-in-a-row window on the pre-move board contains no opponent disc (`playerHasPotentialWin`).

Slower wins (both scores positive) are never stored: the reason engine's case taxonomy treats `win_to_slower_win` as `notABlunder`, so a stored row would serve a contradictory "no better alternative" deep-reveal explanation. Stored rows are graded by solver score drop: `bestScore − playedScore > 4` → `'blunder'`, else `'suboptimal'` (same threshold precedent as `scoreMove`'s losing branch). `scoreMove`'s per-move `quality` is unchanged and still drives the analyze response's badges/counters — a ply can read `suboptimal` in the review timeline yet have no `blunders` row (ReviewScreen's `selectStep` falls back to a board preview for those). The aliveness gate is deliberately **not** the old `bestScore < 0` skip warned about above: solver-lost-but-alive positions (the norm for the second player) keep their mistakes stored; only truly dead positions are exempt.

Migration 058 (anon free deep reveal) made `blunders.user_id` nullable and added `device_uuid`. The storage rule above is unchanged; only the **owner keying** differs. `server/anonBlunderAccess.js#resolveGameBlunderOwner(reqUser, game)` decides it: an authenticated caller → `{user_id, device_uuid: null}` (prior behavior, byte-identical); an anonymous caller on a device-scoped game → `{user_id: null, device_uuid: game.device_uuid}` (stamped from the already-fetched game row — **never** compare `device_uuid` to `req.user.id`). `POST /api/user/migrate` re-associates anon blunders by the client's `body.device_uuid` (`.is('user_id', null)`), so after sign-up they behave like any authenticated blunder and light up Past Games / stats (both `user_id`-scoped) with no further change. Anon dedup uses `idx_blunders_device_game_unique` (see `db-schema.md`) since the `user_id`-keyed unique index doesn't dedup NULL-user rows.

## Soft Delete

**MUST**: Use `is_active boolean NOT NULL DEFAULT true` on `puzzles` for soft delete.
**MUST NOT**: Use a `deleted_at` timestamp column — `is_active` is the sole soft-delete signal.
Rationale: Puzzle deactivation must remain reversible; a boolean is simpler to query than a nullable timestamp.

## jsonb vs Normalized Columns

**MUST** use `jsonb` for: solver scores per candidate (`solver_scores`), classifier tag lists (`classifier_tags`), goal predicate parameters (`goal_predicate_params`), highlight metadata (`highlight_metadata`), category evidence (`category_evidence`), simulation trace (`simulation_trace`), analytics event data (`event_data`), Paddle webhook payloads (`payment_events.payload`), and explanation cache content (`deep_reveal_json`).
**MUST** use typed columns for: all scalar values (enums, integers, booleans, timestamps).
Rationale: jsonb for variable-shape structured data; typed columns for values used in queries/indexes.

## Foreign Keys

**MUST**: Declare `ON DELETE CASCADE` when the child row has no meaning without the parent (e.g., `users.id → auth.users(id)`).
**MUST**: Declare `ON DELETE SET NULL` when the child row should be retained without the parent (e.g., `puzzle_attempts.user_id → users(id)`).
**MUST NOT**: Leave FK behavior implicit.

**Delete-order gotcha:** `false_positive_records.candidate_id` references `candidates.id`, so a bulk `DELETE FROM candidates` fails with an FK violation unless `false_positive_records` rows are deleted first. Delete children before parents.

**Bulk-insert gotcha:** a single unique-constraint (`23505`) violation rolls back the **entire** `insert(rows)` batch (0 rows written), and the error is easily mistaken for a benign per-row dedup — a bulk import once mis-counted a full failed batch as "inserted," so games showed "no mistakes" despite having blunders. For bulk inserts where some rows may pre-exist, either drop the unique constraint or insert row-by-row and catch `error.code === '23505'` per row. (`insertGameBlunder` in `server-conventions.md` deliberately treats `23505` as success precisely because it inserts one row at a time.)

## RLS Policy Structure

Two access tiers:

**Backend-only tables** (`tracks`, `payment_events`, `explanation_cache`, `puzzles`, `candidates`, `false_positive_records`, `blunders`, `deep_reveal_failures`, `llm_usage`):
- Enable RLS.
- Define **no** public policies.
- The Express server accesses these exclusively via the service role key, which bypasses RLS.

**User-facing tables** (`users`, `puzzle_attempts`, `session_stats`):
- Enable RLS.
- Define policies scoped to `auth.uid() = user_id` or `auth.uid() = id`.
- Must also have explicit `GRANT` statements (see below).

## Explicit Grants

**MUST**: Any table accessed by the frontend (anon or authenticated PostgREST role) requires an explicit `GRANT` after the RLS policies. Use the pattern from migration 012:
```sql
GRANT SELECT, INSERT, UPDATE ON public.<table> TO authenticated;
```
Or for tables also read by anon:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO anon, authenticated;
```
Rationale: Supabase enforces explicit grants for all projects (deadline Oct 30 2026); PostgREST returns `42501` without them.

Per-table verbs actually granted to the frontend:

| Table | Verbs | Note |
|---|---|---|
| `users` | `SELECT, UPDATE` | No frontend `INSERT` — rows are auto-created by `loadUser` (GoTrue trigger), never by the frontend. |
| `session_stats` | `SELECT, INSERT, UPDATE` | |
| `puzzle_attempts` | `SELECT, INSERT` | |

## `llm_usage` (migration 056)

Append-only ledger of every OpenAI chat-completion call made through the unified `server/llmChat.js`
helper (spec 047 US5). One row per call attempt that **completed successfully**; a failed call is
logged via `logError` but never produces a row (no partial/fabricated records).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | no | PK, `gen_random_uuid()` default. |
| `endpoint` | `text` | no | Which feature/endpoint triggered the call — free-text, not an enum/FK, so new call sites add new values without a migration. Current values: `'explain-move-llm'` (production deep-reveal), `'run-eval'` (offline eval harness), `'compute-eval'` (offline compute/eval script). |
| `purpose` | `text` | no | Why the call was made. Current values: `'deep-reveal'`, `'offline-eval'`. |
| `user_id` | `uuid` | **yes** | Supabase user id, when known. Null for offline/CLI calls. No FK to `users` — deliberately decoupled from a live user row, same rationale as `tracks` (an analytics/ledger table, not a relational one). |
| `model` | `text` | no | The exact OpenAI model id string sent in the request (e.g. `'gpt-5.4-mini'`), never a display label. |
| `prompt_tokens` | `integer` | no | From the OpenAI response's `usage.prompt_tokens`. |
| `completion_tokens` | `integer` | no | From `usage.completion_tokens`. |
| `total_tokens` | `integer` | no | From `usage.total_tokens`, kept as its own column rather than derived (prompt+completion), in case OpenAI's total ever diverges, e.g. reasoning tokens. |
| `cost_usd` | `numeric` | **yes** | Derived via `server/llmPricing.js`'s in-repo rate table for `model`. Null only when `model` has no rate-table entry — the row is still written; a missing price is a data-quality gap surfaced via a `logError` warning, never a reason to drop the row. |
| `created_at` | `timestamptz` | no | `now()` default. |

**Indexes**: none beyond the PK — no dashboard/query FR consumes this table yet. A future consumer
can add `(endpoint, created_at)` or `(user_id, created_at)` without touching this table's shape.

**RLS**: enabled, deny-by-default, **no policies** — a backend-only table per the tier above
(migrations `010`/`037`/`055` precedent). All access is server-side via the service-role client;
writes go through `server/llmUsageLedger.js`'s `recordUsage(...)`, never a direct client-side insert.

**Lifecycle — append-only, contrasted with `explanation_cache`**: `llm_usage` is **never truncated or
purged by deploy** — this is the defining difference from `explanation_cache`, which the deploy
pipeline `TRUNCATE`s before each release (rows cached before a `deep_reveal_json` shape change — e.g.
the addition of `terms` — error out on read, so the cache must be cleared as part of any deploy that
changes that shape). No
migration or deploy script may add a `TRUNCATE`/`DELETE` against `llm_usage`; it is a permanent,
growing cost ledger, not a cache to be invalidated on redeploy.

**Write path**: `server/llmUsageLedger.js` exports `recordUsage({ endpoint, purpose, userId, model,
usage, costUsd })`, called fire-and-forget (never awaited) from `server/llmChat.js`'s
`callOpenAIChat` after a successful OpenAI response — see server-conventions.md's "LLM Coach
Helpers" section for the caller contract. Errors inside `recordUsage` are caught and logged via
`logError('[llm-usage-ledger]', err, { endpoint, purpose })` internally; they never propagate to the
LLM caller, so a ledger-write failure cannot fail or delay the user-facing LLM response.

## `onboarding_status` (migration 057, Epic 8 — Onboarding Experience)

A single `text` field present on **both** the anonymous local profile record and the server-side
`users` row. Not a new entity/table — a field added to two existing records. **Three-state model**
(aha/coach-reaction detection was dropped by owner decision; there is no fourth "engaged but no
move" bucket):

| Value | Set by | Meaning |
|---|---|---|
| `not_encountered` | default (new profile / new `users` row) | Auto-show onboarding routing is active. |
| `seen` | first user move played in the onboarding sparring game | Suppresses auto-show; the engagement signal this feature measures. |
| `skipped` | explicit skip (mid-game or on the import offer) | Suppresses auto-show. |

There is no transition FROM `seen`/`skipped` back to `not_encountered` — the only writers are the
`seen`/`skipped` transitions above, neither of which ever writes `not_encountered`.

**Storage location 1 — anonymous local profile (`IndexedDBStore`, object store `profile`, keyPath
`device_uuid`)**: `{ device_uuid: string, tier: 'free' | 'paid', onboarding_status?: 'not_encountered' | 'seen' | 'skipped' }`.
`onboarding_status` is `undefined` on any profile created before this feature shipped — all read
sites MUST treat `undefined`/`null` the same as `'not_encountered'`. No IndexedDB version bump was
needed (plain field addition to an existing keyPath row, no new object store/index).

**Storage location 2 — server `users` row** (migration `057_users_onboarding_status.sql`):
```sql
onboarding_status text NOT NULL DEFAULT 'not_encountered'
  CHECK (onboarding_status IN ('not_encountered', 'seen', 'skipped'))
```
`NOT NULL DEFAULT` means every existing and future `users` row is well-formed with no backfill step
required. No new grants needed — `012_explicit_grants.sql` and `040_service_role_grants.sql` are
table-level and already cover `users`.

**Server population seam**: `onboarding_status` is included in both `USER_PROFILE_SELECT_COLUMNS`
and `defaultUserProfile()` (`server/userHelpers.js`) — see that file's doc comment for why both
must stay in sync (`req.user.onboarding_status` is `undefined` if either is missed, regardless of
whether the DB column exists). `server/userHelpers.js` also exports the single shared enum
validator `isValidOnboardingStatus(value)`, imported by `PUT /api/user/profile` and
`POST /api/user/migrate` — this is the ONE place the 3-value enum is validated; no other call site
may duplicate the check inline.

**Client store interface**: both `IndexedDBStore` and `SupabaseStore` (`connect-four/src/store/`)
expose `async updateProfile(patch)`, matching the existing `getProfile()` pairing. `IndexedDBStore`
merges `patch` into the existing single `profile` row and persists it; `SupabaseStore` `PUT`s
`patch` to `/api/user/profile` with `credentials: 'include'`, swallowing errors client-side
(fire-and-forget — must never block a user-facing render). Callers use the identical shape on
either backend: `await store.updateProfile({ onboarding_status: 'seen' })`.

**The one-time "show the import offer once" marker is NOT part of this field.** It is a plain
device-scoped `localStorage` boolean (`onboarding_offer_shown_v1`), independent of
`onboarding_status` and never synced to the server — see
`specs/048-onboarding-experience/data-model.md` for the full rationale (a fourth persisted value
would blur the three-state model above).

## Migration Naming

**MUST**: Use sequential 3-digit numeric prefix: `NNN_slug.sql` (e.g., `015_new_puzzle_categories.sql`).
**MUST**: Each migration file begins with a comment block: migration number, description, and `-- HUMAN REVIEW REQUIRED before applying to production.`
**MUST NOT**: Skip numbers in the sequence.
**MUST**: When a migration changes constrained values, order it **(1) DROP old constraints, (2) UPDATE data, (3) ADD new constraints**. Never run an `UPDATE` before the `DROP CONSTRAINT` when the new value isn't in the old allowed set — the `UPDATE` violates the still-active CHECK and leaves the DB in a partial state (migration 013 hit this writing `forced_win` into a column whose CHECK still only allowed `zugzwang`).

## Deep Reveal Failures (`deep_reveal_failures`)

Records LLM outputs that failed annotation validation after retry, for offline analysis.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `position_hash` | `text` | NOT NULL — `sha256(movestring:col)` |
| `movestring` | `text` | NOT NULL — 0-indexed column digits |
| `col` | `integer` | NOT NULL — 0-indexed column that was explained |
| `endpoint` | `text` | NOT NULL, DEFAULT `'/api/explain-move-llm'` |
| `llm_prompt` | `text` | NOT NULL — full prompt sent to the LLM |
| `raw_llm_output` | `text` | NOT NULL — the retry attempt's raw LLM output (which failed) |
| `failure_reason` | `text` | NOT NULL — JSON-serialized `string[]` of failure codes from `validateAnnotation` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

Access pattern: Backend-only. Server writes via Supabase service-role-key client (bypasses RLS). No public SELECT policies. Never read at runtime by the application.

Migration: `031_deep_reveal_failures.sql`.

## Games (`games`)

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | nullable FK → `auth.users(id)`, `ON DELETE SET NULL` |
| `device_uuid` | `text` | NOT NULL |
| `moves` | `text` | NOT NULL, 0-indexed movestring `[0-6]*` |
| `difficulty` | `text` | NOT NULL, CHECK IN ('easy','medium','hard','perfect') |
| `side` | `text` | NOT NULL, CHECK IN ('first','second') |
| `result` | `text` | NOT NULL, CHECK IN ('win','loss','draw') |
| `accuracy` | `real` | nullable — percentage of optimal user plies (0–100); written by `POST /api/games/analyze`; null until analyzed |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

`accuracy` is added by migration 036. It is `null` for games that have not been analyzed. `GET /api/games` returns it as-is (null passes through).

Index: `(device_uuid, created_at DESC)` for per-device game listing (Epic 3b).
RLS: Disabled (server accesses via service-role key).
Grants: `GRANT SELECT, INSERT ON public.games TO anon, authenticated;`

**Anonymous → account re-association (Feature 3, 2026-07-13):** an anonymous sparring game is inserted with `user_id: null`, keyed by `device_uuid`. On first sign-in, `POST /api/user/migrate` claims it: `UPDATE games SET user_id = <id> WHERE device_uuid = <client body.device_uuid> AND user_id IS NULL` — see the Migrate Endpoint section in `api-conventions.md`. The `(device_uuid, created_at DESC)` index also serves this WHERE. There is no `games` object store in IndexedDB; games are server-only (unlike `puzzle_attempts`/`lesson_progress`, which are replicated locally and migrate as row payloads).

## PaperGames Games (`papergames_games`)

Games imported from papergames.io via `scripts/import_papergames_blunders.mjs`. Separate from `games` (AI sparring) because the data shape is different: no `difficulty`, and opponent metadata is stored.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | nullable FK → `auth.users(id)`, `ON DELETE SET NULL` |
| `papergames_room_uid` | `text` | NOT NULL, part of composite `UNIQUE (user_id, papergames_room_uid)` since migration 053 — deduplication key (e.g. `"BfsnYZBT5"`), scoped per user (was a global `UNIQUE` before 053) |
| `papergames_account_id` | `text` | NOT NULL — user's papergames account ID |
| `moves` | `text` | NOT NULL, 0-indexed movestring |
| `side` | `text` | NOT NULL, CHECK IN ('first','second') |
| `result` | `text` | NOT NULL, CHECK IN ('win','loss','draw') |
| `opponent_name` | `text` | NOT NULL |
| `opponent_account_id` | `text` | NOT NULL |
| `opponent_avatar` | `text` | nullable — UUID; avatar URL = `https://papergames.io/en/assets/images/avatars/{uuid}.svg` |
| `opponent_country_code` | `text` | nullable — ISO 2-letter code |
| `opponent_elo` | `integer` | nullable — Elo rating at time of game |
| `finish_reason` | `text` | nullable — observed values are `'winner'`, `'time-up'`, `'resignation'` (see note below) |
| `duration_ms` | `integer` | nullable — total game duration |
| `tournament_uid` | `text` | nullable — papergames tournament identifier |
| `played_at` | `timestamptz` | NOT NULL — `createdAt` from the papergames room |
| `accuracy` | `real` | nullable — % of optimal user plies (0–100); computed during import by `import_papergames_blunders.mjs`; null for rows imported before migration 039 |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` — import timestamp |

Index: `(user_id, played_at DESC)` for per-user game listing.
RLS: Disabled (server accesses via service-role key).
Migrations: `038_papergames_games.sql` (table + `blunders.papergames_game_id`), `039_papergames_accuracy.sql` (accuracy column), `053_papergames_ownership_and_blunder_index.sql` (per-user ownership — see below).

The `blunders` table has `papergames_game_id uuid nullable FK → papergames_games(id) ON DELETE SET NULL` (added by migration 038). This is separate from `game_id` which links to AI sparring games.

**Migration 053 — per-user ownership (spec 041, User Story 4)**: Before this migration, `papergames_room_uid` was globally `UNIQUE`, so when a second user imported a room a first user had already imported, `upsertGame()`'s upsert (`onConflict: 'papergames_room_uid'`) reassigned the existing row's `user_id` to the second user — silently transferring the game (and its future blunder linkage) away from the first user, with no error. This migration:
1. Drops `papergames_games_papergames_room_uid_key` (the old global `UNIQUE(papergames_room_uid)`), with a post-drop `DO $$` guard that hard-fails the migration if any other global single-column `UNIQUE(papergames_room_uid)` constraint is still present under a different name.
2. Adds `papergames_games_user_room_unique UNIQUE (user_id, papergames_room_uid)`.
3. Drops and recreates `idx_blunders_papergames_unique` on `blunders` as `UNIQUE (user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` (was `(papergames_game_id, move_index)`), so the per-move dedup guarantee is scoped per user as well — necessary because each user now has their own `papergames_game_id` row for the same external room, so `move_index` values legitimately repeat across users for the same board position.

No historical-data repair was performed (Out of Scope for spec 041 — the production DB had no real users at the time). `upsertGame()` (`server/papergamesImporter.js`) was updated in the same change to upsert with `onConflict: 'user_id,papergames_room_uid'`; this single change point covers both `importForUser` (self-service batch import) and `saveLiveGame` (live-game save), which share the function. `insertGameBlunder()` (`server/insertGameBlunder.js`) required no code change — it already inserts `user_id` on every row and treats `23505` as success; only the underlying index's column scope changed.

`import_papergames_blunders.mjs` computes accuracy in the same solver pass as blunder extraction (optimal/scored plies ratio), then upserts it into the game row. Re-import is required to populate accuracy for rows created before migration 039.

**`finish_reason` values and their relationship to `result`** (measured over a 342-row import, 2026-08-01). The stored value comes straight from `replayData.game.outcome.finishReason`; the three values that actually occur are:

| `finish_reason` | Meaning | `result` values seen |
|---|---|---|
| `'winner'` | Decided on the board — a four-in-a-row, **or a full-board draw** | `win`, `loss`, `draw` |
| `'time-up'` | Decided by the clock | `win`, `loss` |
| `'resignation'` | A player resigned | `win`, `loss` |

Two traps. First, a **full-board draw carries `finish_reason = 'winner'`** with `result = 'draw'` — the column names the *termination rule*, not the existence of a winner, so `finish_reason === 'winner'` is exactly the predicate for "decided on the board" (wins, losses, and drawn full boards alike). Second, the doc previously listed `'connect4'` as a value; that string appears in the importer's API-shape comment but is **not** what papergames stores.

**`scored` is computed at import and then discarded.** `extractBlunders()` derives `accuracy = optimalCount / scored` and returns only the ratio; there is no `scored_moves` column on `papergames_games`. Any consumer needing the denominator must either add a column plus a backfill, or derive an upper bound from `moves` and `side` (`side === 'first' ? ceil(len/2) : floor(len/2)`) — an *upper* bound because the importer skips forced plies (`legalCount <= 1`) from scoring. Contrast the in-app path, where `GameAnalysis.scored` is available directly to the client.

## GameAnalysis (ephemeral — not persisted)

`GameAnalysis` is computed on demand by `POST /api/games/analyze` and never stored. Shape:

| Field | Type | Description |
|---|---|---|
| `moves` | `AnalyzedMove[]` | Per-user-ply quality breakdown (see below) |
| `accuracy` | `number` | % of scored plies that were optimal |
| `optimalCount` | `number` | Count of optimal plies |
| `suboptimalCount` | `number` | Count of suboptimal plies |
| `blunderCount` | `number` | Count of blunder plies |
| `scored` | `number` | Plies counted toward accuracy (forced plies excluded) |
| `summaryPhraseKey` | `string` | i18n key for the overall quality phrase |
| `fullMovestring` | `string` | Complete movestring from the game row |
| `difficulty` | `string` | Difficulty from the game row |
| `side` | `'first' \| 'second'` | Side from the game row |

### AnalyzedMove

| Field | Type | Description |
|---|---|---|
| `moveIndex` | `number` | 1-based index into the full movestring |
| `col` | `number` | 0-indexed column played |
| `quality` | `'optimal' \| 'suboptimal' \| 'blunder'` | Quality label |
| `score` | `number` | Solver score for the played column |
| `bestScore` | `number` | Best available solver score at that ply |
| `bestCol` | `number` | 0-indexed column with the best score |
| `patternTag` | `string \| null` | Classifier slug, or `null` if no pattern matched |
| `blunderSeverity` | `number \| null` | Tree-scan fraction (0–1), computed for all blunders since 2026-06-03 |

Forced moves (only 1 legal column) are included in `moves` with a quality label but excluded from `scored`.

## Navigation Params Contracts (screen-to-screen)

Screen navigation passes typed param objects via the screen registry. Contracts for screens introduced in Epic 3b:

| Screen key | Params | Source |
|---|---|---|
| `review` | `{ id: string }` — the `gameId` | `GameScreen.saveGame` after game ends |
| `blunderDetail` | `{ id: string, blunderNavList: object[], index: number, mistakeContext: string, mistakeSource: object\|null, difficulty: string\|null }` | `ReviewScreen` on any non-optimal move node |
| `game` | `{ initialMoves?: string, side?: string, difficulty?: string }` | `MistakeDetailScreen` on "Start new game from here"; original params remain supported |

`initialMoves` on the `game` screen is the truncated movestring returned by `POST /api/games/from-position`. The `game` screen passes it to `useGameBoard` as `initialMoves` to pre-seed the board state before the AI/player moves begin.

The `explorer` screen was removed. `ReviewScreen` now routes all non-optimal move nodes to `blunderDetail` (unified `MistakeDetailScreen`). Suboptimal and blunder plies are treated identically: both are persisted to `blunders`, both are navigated by prev/next, and both can be marked as reviewed.

## Interaction Mode

**MUST**: `puzzles.interaction_mode` is `'single_move'` or `'sequence'`. Currently, `forced_win` is the only `sequence`-mode category. All others are `single_move`.

`interaction_mode` is set automatically by the approve endpoint (`connect-four/server/index.js:3224,3290`: `interaction_mode: candidate.category === 'forced_win' ? 'sequence' : 'single_move'`). Do not set it manually in puzzle data — it is always derived from `category` at approval time, not authored.

## Correct Column Storage

`puzzles.correct_col` and `candidates.correct_col` store the 0-indexed correct column for categories where it is computed at generation time (`claimeven`, `figure_7`, `j_shape`).
`z_threat` and `undercut`/`overcut` store their answer inside `highlight_metadata` (column or cells array with role annotations).

### `correct_cols` — the stored answer set (spec 051, Epic 1, FR-013–FR-019)

`puzzles.correct_cols` and `candidates.correct_cols` (migration `061_correct_cols.sql`, `integer[]
DEFAULT NULL`) store the **full, solver-gated answer set** for a row — every 0-indexed column that
grades `correct`/`tied` for that row's category, computed once at generation or backfill time and
read directly at grading time rather than re-derived (FR-024/FR-025 — see
`api-conventions.md`'s "Move Evaluation Endpoint" for the two grading branches this enables).

- **Type**: `integer[]`, nullable, `DEFAULT NULL`.
- **Population timing**: written by `checkPredicate` (`server/candidate-generator.js`) at
  generation time — through `generateCandidates`'s in-memory `correctCols` field, the real
  `candidates`-table insert in `POST /api/admin/generate`, both promotion routes (`POST
  /api/admin/candidates/:id/approve`, `POST /api/admin/candidates/approve-batch`), and
  `audit_answer_ambiguity.mjs#repairPuzzles`'s replacement-row insert — and, for rows that predate
  this feature, by the one-time `server/scripts/backfill-correct-cols.mjs` script, which calls the
  same `checkPredicate` a fresh `solver.query(move_string)` feeds, never a simplified
  re-derivation.
- **Ascending-order guarantee (FR-016a)**: `checkPredicate` sorts `correctCols` ascending
  (`[...correctCols].sort((a, b) => a - b)`) immediately before returning, so every writer above
  inherits sorted order for free — no writer sorts independently.
- **`correct_col` sync-and-carve-out (FR-017/FR-019)**: the same `checkPredicate` call also
  writes the legacy scalar `correct_col = correctCols[0]`, keeping it in sync rather than
  retiring it (retirement is deferred, tracked as `docs/open_issues.md` OI-81, out of scope for
  this feature). **Carve-out**: for `undercut` and `overcut`, `correct_col` is always written as
  `NULL` regardless of `correctCols[0]` — both categories deliberately store no single correct
  column (there is no canonical "the" answer among several safe non-killing columns), so syncing
  a scalar from an arbitrary array element would fabricate a false canonical answer.
- **`NULL` vs `{}` (FR-016b)**: these are two different, non-interchangeable states, never
  conflated:
  - `correct_cols IS NULL` — **not yet backfilled**. The row predates this feature and hasn't
    been reached by the backfill script yet. Grading falls through to the pre-existing
    computed-live branch (FR-024a) — this is fail-open, not an error, so a live drill is never
    broken by a row not yet backfilled.
  - `correct_cols = '{}'` (empty array) — **would mean** "this category legitimately has zero
    solver-safe answer columns for this board," which is a data defect for an *active* row, not a
    valid served state. The backfill (and generation-time writes) never leave a row in this state:
    when `checkPredicate` comes back with an empty `correctCols`, the row is **deactivated**
    (`is_active = false`) instead of writing the empty array to an active row.

See `api-conventions.md`'s "Move Evaluation Endpoint" section for how `/api/evaluate-move`'s
stored-set grading branch reads `correct_cols` directly, and `server-conventions.md`'s §Predicate
Evaluator paragraph for the tri-state `{ result, correctCol, tiedWith }` contract every evaluator
now returns on the computed-live branch.

### Where puzzle/candidate answer columns are written (verified at source 2026-07-29)

**MUST**: adding a new column to `puzzles` or `candidates` requires editing **every** write path below. None of them uses a shared row-builder, and `INSERT` does not carry a new column automatically — a missed site yields `NULL` for every row it creates.

`connect-four/server/candidate-generator.js` does **not** touch Supabase at all. `generateCandidates` only builds an in-memory object; the DB write happens in the route that calls it. Do not look for the insert there.

| # | Site | Writes | Shape |
|---|------|--------|-------|
| 1 | `server/index.js` `POST /api/admin/generate` (~:2981-2992) | `candidates` | hand-enumerated field list |
| 2 | `server/index.js` `POST /api/admin/candidates/:id/approve` (~:3272) | `puzzles` | hand-enumerated field list |
| 3 | `server/index.js` `POST /api/admin/candidates/approve-batch` (~:3338) | `puzzles` | hand-enumerated field list |
| 4 | `server/scripts/audit_answer_ambiguity.mjs#repairPuzzles` (~:298) | `puzzles` | its own row build, outside the server |
| 5 | `server/index.js` `POST /api/admin/seed-puzzles` (~:3485) | `puzzles` | inserts `server/data/placeholder_puzzles.json` **verbatim** — dev seed only, so a new column appears only if the JSON file carries it |

Sites 2 and 3 are the promotion path (candidate → puzzle) and are the ones that matter for anything a player is served. Site 4 is easy to miss because it lives in a script, not the server.

**`claimeven` puzzle format:** single-move, Black (player 2) to move. The correct answer is the column Red (player 1) played in on the previous move — the UI highlights Red's last-played cell with the `trigger` highlight role so the learner sees why that column is the answer. **No uniqueness enforcement**: positions where multiple columns are independently valid claimeven responses are acceptable (unlike `z_threat`/`overcut`, which require exactly one correct column — see `server-conventions.md` §Generation-quality guards).

## Puzzle Attempts — `outcome` values and the serving pool

`puzzle_attempts.outcome` is constrained (migration `063_puzzle_attempts_outcome_narrow.sql`,
narrowing the original five-value list from `003_puzzles.sql`) to exactly four values:
`'correct_first' | 'tied' | 'incorrect' | 'abandoned'`. `'correct_retry'` is retired: a
correct-on-retry attempt is now stored as `'correct_first'`, and `first_attempt_correct`
(already a separate boolean column) is the sole first-vs-retry signal — do not read the retired
value as a sign of a missed case. `'revealed'` was also dropped from the CHECK; no writer emits it.

`GET /api/puzzles/draw`'s non-exclusion of solved/revealed puzzles is a **deliberate, closed
design decision** (see `docs/open_issues.md` OI-49, resolved), not an open question: the query
filters only on `category`, `is_active`, and non-null `position`, ordered by `position` — it never
joins `puzzle_attempts`, and no attempt-history exclusion, exhaustion policy, or unseen-first
ordering is planned. A player can be served (and re-answer) a puzzle they already solved or gave
up on.
