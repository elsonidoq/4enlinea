# Data Model: Past Games & Mistakes — Server Data Integrity

No new tables. This feature changes two existing constraints and introduces one derived,
non-persisted aggregate (`Category Count`). All other entities (`Blunder`, `Imported Game`,
`Import Result`) already exist and are unchanged in shape — only their query/count paths change.

## Migration `053_papergames_ownership_and_blunder_index.sql`

Single migration file covering both constraint changes for User Story 4 (they ship together —
per the epic, the blunder-index fix alone is "necessary but not sufficient" without the
`papergames_games` ownership fix). DROP-before-ADD ordering (see `research.md` Decision 2).

```sql
-- 053_papergames_ownership_and_blunder_index.sql
-- Per-user ownership for imported papergames games + per-user blunder dedup index.
-- HUMAN REVIEW REQUIRED before applying to production.

-- 1. DROP old constraints (order matters: drop before add, per data-model.md convention).
--    Constraint/index names verified below — see "Constraint-name verification".
ALTER TABLE papergames_games DROP CONSTRAINT IF EXISTS papergames_games_papergames_room_uid_key;
DROP INDEX IF EXISTS idx_blunders_papergames_unique;

-- 1a. Post-drop guard: fail loudly, not silently, if a global (single-column) UNIQUE on
--     papergames_room_uid is still active under any other name (e.g. because the DROP above
--     was a no-op due to a name mismatch not caught by the pre-flight verification below).
--     `IF EXISTS` alone would let a wrong name pass through as a silent no-op that leaves the
--     QA-blocker (User Story 4) unfixed while this migration still reports success.
DO $$
DECLARE
  stray_name text;
BEGIN
  SELECT tc.constraint_name INTO stray_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'papergames_games'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.constraint_name
  HAVING count(*) = 1 AND string_agg(kcu.column_name, ',') = 'papergames_room_uid';

  IF stray_name IS NOT NULL THEN
    RAISE EXCEPTION 'papergames_games still has a global UNIQUE(papergames_room_uid) constraint (name: %) after the DROP step — migration aborted; the DROP CONSTRAINT name above is stale, re-verify against information_schema.table_constraints and fix before retrying', stray_name;
  END IF;
END $$;

-- 2. No data UPDATE step. Per spec 041 Out of Scope ("Historical-data repair"): the production
--    database has no real users yet; existing rows may be reset/recreated cleanly rather than
--    remapped. No UPDATE is required or performed here.

-- 3. ADD new composite unique constraints.
ALTER TABLE papergames_games
  ADD CONSTRAINT papergames_games_user_room_unique UNIQUE (user_id, papergames_room_uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_papergames_unique
  ON blunders (user_id, papergames_game_id, move_index)
  WHERE papergames_game_id IS NOT NULL;
```

**Constraint-name verification (performed, not merely planned)**: run against the target DB
before applying to production:

```sql
SELECT tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'papergames_games' AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type;
-- and:
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'blunders' AND indexname ILIKE '%papergames%';
```

Run 2026-07-07 against the reachable local Supabase instance (`connect-four/server/.env` →
`127.0.0.1:54322`, migration history identical to production — same `server/migrations/*.sql`
files applied via `server/migrate.js` in both environments, and Postgres's constraint
auto-naming is deterministic for identical DDL, so this is not merely a proxy check). Confirmed
output:

- `papergames_games`: exactly one `UNIQUE` constraint, `papergames_games_papergames_room_uid_key`,
  on column `papergames_room_uid` — matches the name already used in the DROP statement above.
- `blunders`: `idx_blunders_papergames_unique` — `UNIQUE, btree (papergames_game_id, move_index)
  WHERE (papergames_game_id IS NOT NULL)` — matches the name already used in the DROP statement
  above.

**Production is a physically separate database** from the local instance used above (no
`supabase start` / local-only setup exists per `db-schema.md`; production is the sole remote
`kxtqwsumojtexokrtlfp` project). Because the name match is not a coincidence but a deterministic
function of identical DDL, no divergence is expected — **but re-run the same two queries against
production** (session-pooler `DATABASE_URL`, see `reference_supabase_connection` memory) as a
pre-flight step immediately before applying this migration there, and rely on the DO-block guard
above (§1a) as the hard backstop if that pre-flight step is ever skipped or the names have
diverged for any reason.

**Idempotency**: safe to re-run — every DROP uses `IF EXISTS`/`IF NOT EXISTS`, the guard in §1a
is a no-op once the old constraint is genuinely gone, and the ADD statements match the migration
runner's normal one-shot-per-file execution model (`server/migrate.js`, transactional per file).

### `papergames_games` (constraint change only)

| Column | Before | After |
|---|---|---|
| `papergames_room_uid` | `UNIQUE` (global) | no longer independently unique |
| `(user_id, papergames_room_uid)` | not a constraint | `UNIQUE` — new |

`upsertGame()` (`server/papergamesImporter.js:163`) `onConflict` key changes from
`'papergames_room_uid'` to `'user_id,papergames_room_uid'`. Used by both the self-service batch
importer (`importForUser`) and the live-game save path (`saveLiveGame`) — one shared function,
one change point.

### `blunders` (index change only, no column change)

| Index | Before | After |
|---|---|---|
| `idx_blunders_papergames_unique` | `UNIQUE (papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` | `UNIQUE (user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` |

`insertGameBlunder()` (`server/insertGameBlunder.js`) is unaffected in logic — it already always
inserts `user_id` on every row and treats `23505` as success (idempotent re-import). Only the
underlying index definition changes; no caller-side code change is required for this half of the
fix (the collision the index prevents is now scoped correctly per-user).

## Category Count (new derived aggregate, not persisted)

Backs User Story 2 (`GET /api/coach/category-counts`, decision D2 in the epic).

| Field | Type | Description |
|---|---|---|
| `category` | string | one of `VALID_BLUNDER_TAGS` (`server/blunderTags.js`) |
| `count` | integer | true count of the authenticated user's rows in `blunders` for this category, DB-side `count()` grouped by `pattern_category`, no row cap. Same filter set as today's `/api/coach/queue` query for that user (`eq('user_id', ...)` only — no `quality` filter; `blunder`- and `suboptimal`-quality rows are both counted, matching current behavior). |

Computed live per request via `supabase.from('blunders').select('pattern_category,
count()').eq('user_id', ...)` (or equivalent grouped count query) — not cached, not persisted.
Only categories with `count ≥ 1` are returned (no zero-count rows), matching FR-005/Edge Cases
("cards are driven by actual data, not the static category list").

## `GET /api/coach/queue` — pagination fields (additive)

| Field | In/Out | Type | Notes |
|---|---|---|---|
| `limit` | query param, optional | integer | default 50 (preserves today's page size for callers not yet updated), max 200 |
| `offset` | query param, optional | integer | default 0 |
| `total` | response field | integer | **behavior change**: must become a true DB-side `count()` of all rows matching the current filters (status/category/game_id/papergames_game_id), not `enriched.length` (today's bug — see `research.md` Fragile-area finding). This is the field every "page to completion" consumer relies on to know when to stop. |

No other response field changes. Existing filters (`status`, `category`, `game_id`,
`papergames_game_id`) apply identically before pagination is layered on top.

## Import Result — surfaced fields (User Story 5, no new persistence)

`GET /api/user/papergames/import/status` already computes and stores `imported`/`skipped` on the
in-memory job map (`server/server-conventions.md` § In-Memory Job Map Pattern); `blunderErrors`
is already tracked (`server/userRoutes.js` job entry shape) but not surfaced in the documented
response contract in `api-conventions.md`. This feature surfaces the already-existing
`blunderErrors` count in the documented response shape — no new field is computed, only exposed.
