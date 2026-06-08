# Data Model: Patterns → Blunders Epic 2 — Production Wiring

**No new DB migrations in this epic.** All schema changes (`reason`, `direction` columns,
updated CHECK constraint) were applied in Epic 1 (migrations 032–034). This document
describes the final shape of the entities this epic writes to and the new module that
centralizes the valid-tag contract.

---

## Entity: `blunders` row (game blunder shape)

Written by the analyze endpoint (`POST /api/games/analyze`) and `reprocess_blunders.mjs`.
**Authoritative DB schema**: `docs/architecture/db-schema.md`.

| Column | Type | Nullable | Source (this epic) |
|---|---|---|---|
| `id` | uuid PK | NO | auto-generated |
| `user_id` | uuid | NO | `req.user.id` / `games.user_id` |
| `puzzle_id` | uuid | YES | always NULL for game blunders |
| `board_state` | text | NO | `movesBeforeThisPly` (string prefix of game movestring) |
| `move_played` | integer | NO | `col` — 0-indexed column the user played |
| `correct_move` | integer | NO | `bestCol` — 0-indexed column with highest solver score |
| `pattern_category` | text | NO | `tag` from `tagBlunder`, after `VALID_BLUNDER_TAGS` guard |
| `reason` | text | YES | `reason` from `tagBlunder` result |
| `direction` | text | YES | `direction` from `tagBlunder` result |
| `severity` | integer | NO | `computeSeverity(bestScore, score)` — local helper |
| `blunder_severity` | real | YES | fraction from `computeBlunderSeverity` tree scan |
| `created_at` | timestamptz | NO | DEFAULT now() |

**Columns that do NOT exist and must NOT appear in any INSERT**: `game_id`, `move_number`.

**Unique constraint** (migration 030): `idx_blunders_game_unique ON (user_id, board_state, move_played) WHERE puzzle_id IS NULL`.
Treat pg error `23505` on this index as success (idempotent insert).

---

## Module: `server/blunderTags.js` (new file)

The single authoritative set of valid blunder tag strings, mirroring the DB CHECK constraint
from migration 032. Exported as a named `Set` so callers can call `.has(tag)`.

```js
// server/blunderTags.js
export const VALID_BLUNDER_TAGS = new Set([
  'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
  'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
  'odd_even_threat', 'claimeven', 'claimodd',
  'drawing_move', 'suboptimal_move',
  'forbidden_columns',
]);
```

**Consumers**:
- `server/index.js` — analyze endpoint pre-INSERT guard
- `server/scripts/reprocess_blunders.mjs` — replaces local `VALID_PATTERN_CATEGORIES`
- `server/scripts/import_papergames_blunders.mjs` — replaces local `VALID_PATTERN_CATEGORIES`

---

## Analyze endpoint response shape change

The `POST /api/games/analyze` response `moves` array gains two new fields per blunder ply:

```js
// Before (Epic 1 shape)
{ moveIndex, col, quality, score, bestScore, bestCol, patternTag, blunderSeverity }

// After (this epic's shape)
{ moveIndex, col, quality, score, bestScore, bestCol, patternTag, reason, direction, blunderSeverity }
```

`reason` and `direction` are strings when `quality === 'blunder'` and `null` otherwise.
Existing consumers (`ReviewScreen.jsx`) only read `patternTag` — they are unaffected by the
new fields.

---

## tagBlunder result type (pass-through contract)

```ts
{
  tag: string,      // one of VALID_BLUNDER_TAGS
  direction: 'missed_own' | 'enabled_opponent' | 'defensive_miss',
  reason: string    // human-readable explanation, never null
}
```

`tagBlunder` never throws. All error cases resolve to
`{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }`.
