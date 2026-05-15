# Data Model: Interaction Mode & forced_win Refactor

## Modified Entity: Puzzle

**Table**: `public.puzzles`

### New Column

| Column | Type | Default | Constraint |
|--------|------|---------|-----------|
| `interaction_mode` | `text` | `'single_move'` | `CHECK (interaction_mode IN ('single_move', 'sequence'))` |

### Migration actions (014_interaction_mode.sql)

1. Add `interaction_mode` column with default `'single_move'` and CHECK constraint.
2. `UPDATE public.puzzles SET interaction_mode = 'sequence' WHERE category = 'forced_win'` — no-op in practice (those rows are deleted next); retained so a partial rollback that skips step 3 still leaves the column correct.
3. `DELETE FROM public.puzzles WHERE category = 'forced_win'` — drop stored-sequence puzzles.
4. `GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated` — required unconditionally, following the migration 012 pattern.

### Field semantics

- `single_move`: Learner clicks one column; the server evaluates it against the category predicate and returns `correct` / `wrong` / `tied`. The existing `/check` endpoint handles this.
- `sequence`: Learner plays multiple moves; each move is validated statelessly via `/sequence/move`. The puzzle ends when the learner achieves the goal (e.g., double threat in `forced_win`) or plays a non-forcing move.

---

## New Server Entity: CompletionStrategy (interface)

Not a DB entity — a JavaScript interface defined in `server/completionStrategies.js`.

```
interface CompletionStrategy {
  validateMove(position: string, col: number): { valid: boolean, reason?: string }
}
```

- `position`: Full column-sequence string representing the board state **before** the learner's move (includes the puzzle's base `move_string` plus any prior sequence moves).
- `col`: 0-indexed column the learner is playing.
- Returns `{ valid: true }` if the move satisfies the strategy's criterion, or `{ valid: false, reason: string }` on failure.

**ForcedWinStrategy** implements this interface:
- Checks (a) no immediate threat for learner exists in `position`.
- Checks (b) at least one immediate threat for learner exists after playing `col`.
- Both checks are bitboard-only (no solver).

---

## Sequence Move Response Shape (server-computed)

The `/sequence/move` endpoint returns:

```
{
  outcome: 'continue' | 'success' | 'fail',
  reason?: string,   // present when outcome === 'fail'
  aiCol?: number     // 0-indexed; present when outcome === 'continue'
}
```

- `continue`: Move was valid; AI response column provided; learner plays again.
- `success`: Move created a double threat (≥2 immediate threats); learner wins.
- `fail`: Move failed validation; reason string explains why.
