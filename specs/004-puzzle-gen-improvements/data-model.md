# Data Model: Puzzle Generator Improvements

## Schema Changes

### Migration 008 — `user_player` column

**File**: `connect-four/server/migrations/008_user_player.sql`

#### `candidates` table (addition)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_player` | `smallint` | NOT NULL, DEFAULT 1, CHECK IN (1,2) | 1 = player-1 (RED), 2 = player-2 (RED after swap). Derived from `length(move_string) % 2 = 0 → 1, else 2`. |

#### `puzzles` table (addition)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_player` | `smallint` | NOT NULL, DEFAULT 1, CHECK IN (1,2) | Same semantics as `candidates.user_player`. |

**Backfill**: Both tables are backfilled on migration with:
```sql
UPDATE candidates SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;
UPDATE puzzles    SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;
```

---

## Entities Updated

### Candidate (in-memory, `candidate-generator.js`)

No structural change to the JS object shape — `user_player` is computed and inserted server-side from `move_string.length`. The `generateCandidates` return value is unchanged.

The bulk-insert in `index.js` (`POST /api/admin/generate`) gains one additional column:

```js
user_player: moveString.length % 2 === 0 ? 1 : 2
```

### Board Renderer (`CurationWorkspace.jsx`)

`buildBoard(moves, userPlayer)` — gains a second argument. Color assignment:

```
piece color = (i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow'
```

This is a pure display transformation; the stored `move_string` and solver scores are unchanged.
