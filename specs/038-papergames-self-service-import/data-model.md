# Data Model: Papergames Self-Service Import

## DB Schema Changes

### `users` table (migration 047)

Two new nullable columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| `papergames_id` | `text` | YES | (none) |
| `last_import_at` | `timestamptz` | YES | (none) |

- `papergames_id`: the user's Papergames hex account ID, e.g. `"69e773d36bf9938bffc1509a"`.
  No UNIQUE constraint — two users may share the same account ID (edge case: shared device).
  No CHECK constraint — format validation is at the API layer only (non-empty, ≤64 chars).
- `last_import_at`: timestamp of the last completed import run. Used for incremental pagination:
  the importer stops fetching rooms whose `createdAt < last_import_at`. `null` on first run.

### `blunders` table (migration 047)

One new nullable column + one new partial unique index:

| Column | Type | Nullable | Default |
|---|---|---|---|
| `move_index` | `integer` | YES | (none) |

- `move_index`: the ply index at which the blunder occurred = `board_state.length`.
  Only populated for papergames-imported blunders; `null` for sparring game blunders and legacy
  rows. Set at insert time by `insertGameBlunder()`.

**New index**:
```sql
CREATE UNIQUE INDEX idx_blunders_papergames_unique
  ON blunders (papergames_game_id, move_index)
  WHERE papergames_game_id IS NOT NULL;
```

- Enforces idempotency for re-imports: inserting the same blunder for the same position in the
  same game is a no-op (23505 caught and silently skipped).
- The `WHERE` clause excludes sparring blunders (`papergames_game_id IS NULL`), so the index
  has no side-effects on the existing sparring path.

---

## In-Memory Entity: PapergamesImportJob

Not persisted to the DB. Lives in a module-level `Map<jobId, JobState>` in `userRoutes.js`
(or an extracted `papergamesJobMap.js` if the routes file grows too large).

```js
// JobState shape
{
  jobId:    string,   // uuid
  userId:   string,   // req.user.id — used for ownership checks + one-in-flight guard
  status:   'pending' | 'running' | 'done' | 'error',
  imported: number,   // count of new papergames_games rows written
  skipped:  number,   // count of rooms skipped (API error, no moves, etc.)
  error:    string | null,
}
```

Lifecycle:
1. `POST /api/user/papergames/import` inserts entry with `status: 'pending'`, returns `jobId`.
2. The async import sets `status: 'running'` before the first fetch.
3. On success: sets `status: 'done'`, updates `imported`/`skipped`.
4. On throw: sets `status: 'error'`, sets `error` string.
5. Map entries are never evicted — they persist for the server process lifetime.
   A server restart wipes the Map; subsequent polls return 404.

---

## `papergamesImporter.js` Exported API

```js
/**
 * Run a papergames import for one user.
 *
 * @param {object} supabase         - Supabase client (service-role key)
 * @param {string} userId           - Authenticated user's UUID
 * @param {string} papergamesId     - User's Papergames hex account ID
 * @param {number} gameLimit        - Max games to process this run (15 free / 50 paid)
 * @param {string|null} lastImportAt - ISO timestamp of previous import, or null
 * @returns {Promise<{ imported: number, skipped: number }>}
 * @throws on fatal error (e.g. Papergames API unreachable, solver spawn fails)
 */
export async function importForUser(supabase, userId, papergamesId, gameLimit, lastImportAt) { ... }
```

Internal helpers (not exported):
- `fetchRooms(papergamesId, start)` — same logic as existing CLI script
- `fetchReplay(uid)` — same logic as existing CLI script
- `parseMoves(replayData)` / `getUserSide(replayData, papergamesId)` / `getResult(...)` etc.
- `extractBlunders(solver, moveString, side, userId)` — same analysis loop as CLI script

All helpers are pure or deterministically async (no hidden global state).

---

## `GET /api/user/profile` Response Extension

The profile response adds two fields:

```json
{
  "device_uuid": "...",
  "tier": "free",
  "deep_reveal_count": 0,
  "deep_reveal_reset_at": null,
  "papergames_id": "69e773d36bf9938bffc1509a",
  "last_import_at": "2026-06-17T12:00:00Z"
}
```

- `papergames_id`: string or `null`.
- `last_import_at`: ISO 8601 timestamp or `null`.

These fields come from `req.user` (populated by `loadUser`'s extended SELECT) — no extra DB
query in the profile handler.
