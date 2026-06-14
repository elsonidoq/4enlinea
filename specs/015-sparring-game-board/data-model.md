# Data Model: Sparring Game Board (Epic 3a)

**Feature**: `specs/015-sparring-game-board`  
**Date**: 2026-06-01

---

## New Entity: `games`

**Purpose**: Persist completed sparring game records for Epic 3b Post-Game Review and Epic 3c analytics.

### Schema (migration `026_games.sql`)

```sql
CREATE TABLE IF NOT EXISTS games (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  device_uuid TEXT        NOT NULL,
  moves       TEXT        NOT NULL,
  difficulty  TEXT        NOT NULL CHECK (difficulty IN ('easy','medium','hard','perfect')),
  side        TEXT        NOT NULL CHECK (side IN ('first','second')),
  result      TEXT        NOT NULL CHECK (result IN ('win','loss','draw')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX games_device_uuid_idx ON games (device_uuid, created_at DESC);

-- Supabase explicit grants required (project_supabase_grants.md)
GRANT SELECT, INSERT ON games TO anon, authenticated;
```

### Field Semantics

| Field | Description |
|---|---|
| `id` | UUID generated server-side. Returned to client and passed as navigation param to `review` screen. |
| `user_id` | Supabase auth user ID. `null` for anonymous sessions (no Authorization header). |
| `device_uuid` | Device-local UUID from `store.getProfile().device_uuid`. Always present (anonymous or authenticated). |
| `moves` | 0-indexed movestring `[0-6]*`, max 42 chars. Alternates Red(0)/Yellow(1) by position parity. |
| `difficulty` | One of `'easy'`, `'medium'`, `'hard'`, `'perfect'`. Stored lowercase (internal enum). |
| `side` | `'first'` = user played as Red (moves 0,2,4…); `'second'` = user played as Yellow (moves 1,3,5…). |
| `result` | `'win'` = user 4-in-a-row; `'loss'` = AI 4-in-a-row or user resigned; `'draw'` = board full. |
| `created_at` | Server timestamp at insert time. |

### Relationships

- FK → `auth.users(id) ON DELETE SET NULL`: if user account deleted, game row preserved with `user_id = null`.  
- Epic 3b: `POST /api/games/analyze` fetches `moves` from `games` by `id`.  
- Epic 3b: Blunder records written to `blunders` table (already exists) reference game position but NOT a FK to `games`.

---

## Existing Entities Used (no schema change)

### `tracks` table

Used via `track('game_started', { difficulty, side })` and `track('game_ended', { result, moveCount, difficulty })`. No schema changes.

### Store: `sparring_record` (IndexedDB / Supabase `users` column)

`store.saveSparringRecord(result)` updates the W/L/D counts. `result` is `'win'`/`'loss'`/`'draw'` — matching the `games.result` enum. No schema changes needed for Epic 3a (store interface already exists per Epic 7).

### Store: `streak` (IndexedDB / Supabase `users` columns)

`store.recordActivityDay()` bumps daily streak on game completion. No schema changes.

---

## Client-side State Model (GameScreen)

The Game Board screen maintains the following state (derived, not persisted until game end):

| State Variable | Type | Source |
|---|---|---|
| `moveHistory` | `number[]` | User/AI column choices (0-indexed) |
| `board` | `string[][]` | `buildBoard(moveHistory.join('')).board` |
| `heights` | `number[]` | `buildBoard(moveHistory.join('')).heights` |
| `coachMessages` | `{text, faded?, lead?, mood}[]` | Updated after each move |
| `hintOverlays` | `{c,r,type}[]` | Empty unless hint active |
| `lastDrop` | `{c,r} | null` | Coordinates of most recent disc placement |
| `aiThinking` | `boolean` | True while AI fetch is in-flight |
| `gameOver` | `{result, winnerColor} | null` | Set when win/draw detected |

**Derived state (not stored)**:
- `userTurn: boolean` = `moveHistory.length % 2 === (side === 'first' ? 0 : 1)`
- `userColor: string` = `side === 'first' ? 'red' : 'yellow'`
- `aiColor: string` = `side === 'first' ? 'yellow' : 'red'`
- `movesString: string` = `moveHistory.join('')`
- `fullCols: number[]` = `heights.map((h, i) => h >= 6 ? i : -1).filter(i => i >= 0)`

---

## Difficulty Picker Screen State

Local only — not persisted:

| State Variable | Type | Initial |
|---|---|---|
| `diff` | `'easy'|'medium'|'hard'|'perfect'` | `'medium'` |
| `side` | `'first'|'second'` | `'first'` |
