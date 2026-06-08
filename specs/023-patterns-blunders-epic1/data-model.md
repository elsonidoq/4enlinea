# Data Model: Patterns → Blunders Epic 1

**Branch**: `101-new-design`  
**Date**: 2026-06-06

---

## DB Changes

### `blunders` table — three migrations

**Migration 032 (`032_blunders_new_tags.sql`)** — atomic TRUNCATE + constraint update.

Replaces the existing `blunders_pattern_category_check` constraint. Opens with `TRUNCATE blunders;` to clear rows that would fail the new constraint (PostgreSQL validates all existing rows at `ADD CONSTRAINT` time). The TRUNCATE is intentional: existing rows were tagged with the old tagger and will be regenerated in Epic 2.

```sql
TRUNCATE public.blunders;

ALTER TABLE public.blunders
  DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;

ALTER TABLE public.blunders
  ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ));
```

Removed: `'unknown'` — breaking change; any insert of `'unknown'` will fail.  
Retained: `'forbidden_columns'` — legacy-tolerated, live tag still emitted by old scripts.  
Added: `'odd_even_threat'`, `'claimodd'`, `'drawing_move'`, `'suboptimal_move'`, `'forced_win'` (was already present), `'claimeven'` (was already present).

**Migration 033 (`033_blunders_reason.sql`)** — reason column.

```sql
ALTER TABLE public.blunders ADD COLUMN reason TEXT;
```

Nullable; no index; human-inspectable offline only.

**Migration 034 (`034_blunders_direction.sql`)** — direction column.

```sql
ALTER TABLE public.blunders ADD COLUMN direction TEXT;
```

Nullable; no CHECK constraint (values: `'missed_own'`, `'enabled_opponent'`, `'defensive_miss'` — deliberately unconstrained for forward compatibility); no index.

---

## Server-Side Function Contracts

### `classifyPattern(ms, perspective, solver)`

Location: `server/classifier.js` (new export)

```
classifyPattern(
  ms:          string,    // position movestring (0-indexed cols)
  perspective: 1 | 2,    // player whose patterns to evaluate
  solver:      object     // c4solver wrapper with .query(ms) method
) → Promise<Set<string>>
```

Returns the full set of pattern tag slugs held by `perspective` at position `ms`. Never includes `'unknown'`. Calls `solver.query(ms)` once for scores, then runs all 13 detectors with explicit `perspective`. For Yellow-only patterns (`claimeven`) called with `perspective = 1`: returns empty (detector guard fires). For Red-only patterns (`odd_even_threat`, `claimodd`) called with `perspective = 2`: returns empty (detector guard fires).

### `tagBlunder(moves, playedCol, correctCol, solver)`

Location: `server/classifier.js` (new export)

```
tagBlunder(
  moves:      string,          // movestring before the blunder move
  playedCol:  number,          // 0-indexed column played (the blunder)
  correctCol: number,          // 0-indexed column of the best move
  solver:     object           // c4solver wrapper
) → Promise<{ tag: string, direction: 'missed_own'|'enabled_opponent'|'defensive_miss', reason: string }>
```

Never throws. Returns a fallback object on any error. Degenerate-position detection (using `board.hasWon(player)` and `moves.length >= 42`) fires BEFORE any solver calls.

### Detector signature retrofit

Each of the 13 detector functions in `classifier.js` gains a `perspective` optional parameter:

```
detectXxx(board, scores?, perspective = board.currentPlayer) → result
detectClaimeven(board, solver, perspective = board.currentPlayer) → Promise<result>
```

The default ensures all existing callers (primarily `classify()` and `classifyAll()`) are behaviorally unchanged.

---

## Entity Relationships

No new tables. No new foreign keys. No new indexes. The three migrations are purely additive (one column each) plus one constraint replacement.

---

## Invariants

- `blunders.pattern_category` is constrained by DB CHECK. Any insert of an unknown tag fails immediately at the DB level.
- `blunders.reason` and `blunders.direction` are nullable; existing rows (after TRUNCATE, there are none) and future rows from Epic 1 code paths may have them null.
- `classifyPattern` result set never contains `'unknown'`.
- `tagBlunder` return value always has all three fields (`tag`, `direction`, `reason`) populated.
