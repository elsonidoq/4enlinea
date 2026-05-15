# Data Model: New Puzzle Categories (008)

## Migration 015 — new_puzzle_categories

File: `connect-four/server/migrations/015_new_puzzle_categories.sql`

### New columns

```sql
ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS category_evidence jsonb DEFAULT NULL;
```

### Updated slug constraints

The existing `CHECK (category IN (...))` on four tables must be replaced to
include the six new slugs. Each table gets a constraint drop + re-add:

Tables: `puzzles`, `candidates`, `false_positive_records`, `blunders`

New full slug list:
```
'immediate_threat', 'forced_block', 'double_threat',
'forced_win', 'forbidden_columns',
'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
```

Pattern (repeat for each table):
```sql
ALTER TABLE public.<table> DROP CONSTRAINT IF EXISTS <table>_category_check;
ALTER TABLE public.<table> ADD CONSTRAINT <table>_category_check
  CHECK (category IN (
    'immediate_threat', 'forced_block', 'double_threat',
    'forced_win', 'forbidden_columns',
    'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape'
  ));
```

> **Note**: Constraint name format must be checked against the actual DB;
> run `\d puzzles` to confirm names before writing the migration.

### Explicit grants (migration 012 pattern)

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.false_positive_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blunders TO anon, authenticated;
```

---

## Entities

### highlight_metadata (jsonb) — stored on `puzzles` and `candidates`

Shape varies by category:

```typescript
type HighlightMetadata =
  | { type: 'capsule'; column: number; fromRow: number; toRow: number; badgeCount: number }
  | { type: 'cells'; cells: Array<{ column: number; row: number; role: string }> }
  | null;
```

Role values:
- `z_threat` capsule: no cell roles (shape covers the column range)
- `undercut` cells: `"killing_threat"`, `"dead_threat"`
- `overcut` cells: `"neutralised_threat"`, `"major_threat"`
- `figure_7` / `j_shape` cells: `"pattern_piece"`

### category_evidence (jsonb) — stored on `candidates` only

```typescript
type CategoryEvidence =
  | {                              // claimeven
      subtype: 'A' | 'B';
      baseinverse_pair: [number, number];
      correct_col: number;
      simulation_trace: Array<{ col: number; row: number; player: 1 | 2 }>;
    }
  | {                              // figure_7
      pattern_cells: Array<{ column: number; row: number }>;
    }
  | {                              // j_shape
      pattern_cells: Array<{ column: number; row: number }>;
    }
  | {};                            // all other new categories
```

---

## Server-side module changes

### `connect-four/server/categories.js`

Add all six slugs to `VALID_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NAMES`.
Add `forbidden_columns` and the six new slugs to `PAID_CATEGORIES` as needed
(consult constitution Tier table: all eight pattern categories → paid: `forced_win`, `forbidden_columns`, plus the six new ones).

### `connect-four/server/classifier.js`

Add six new detection functions; each returns `{ matched: boolean, highlightMetadata, categoryEvidence }`:

| Function | Inputs | Key algorithm |
|---|---|---|
| `detectZThreat(moves, scores)` | board, heights, scores | Count empty cells from height to threat cell; odd count columns where solver confirms win |
| `detectClaimeven(moves, scores, solver)` | board, heights, solver | FR-004 simulation; returns subtype A or B |
| `detectUndercut(moves)` | board, colHeights | Threat enumeration: find R > R' in same col C where current player has R and opponent has R' |
| `detectOvercut(moves)` | board, colHeights | Inverse of undercut: opponent has lower threat, current player exploits above |
| `detectFigure7(moves, scores, solver)` | board, heights, scores | Match 4-of-5 cells in Figure-7 pattern (and mirror); solver confirms win on 5th |
| `detectJShape(moves, scores, solver)` | board, heights, scores | Match 3-of-4 cells in J-shape pattern (and mirror); solver confirms win on 4th |

### `connect-four/server/candidate-generator.js`

Add six new `check*` functions (parallel to `checkForcedWinPredicate`,
`checkForbiddenColumnsPredicate`). Each calls the classifier detection function,
populates `highlight_metadata` and `category_evidence`, and sets `correct_col`.

### `connect-four/server/predicates.js`

Add six new `eval*` functions and extend the `switch` in `evaluatePredicate`:

| Category | Evaluation logic |
|---|---|
| `z_threat` | `puzzle.highlightMetadata.column === candidateCol` |
| `claimeven` | `puzzle.correctCol === candidateCol` (unique by construction: subtype A requires a unique equalising move; subtype B has exactly one partner column) |
| `undercut` | `candidateCol !== puzzle.highlightMetadata.cells.find(c=>c.role==='killing_threat').column` |
| `overcut` | `candidateCol === puzzle.highlightMetadata.cells.find(c=>c.role==='major_threat').column` |
| `figure_7` | `puzzle.correctCol === candidateCol` |
| `j_shape` | `puzzle.correctCol === candidateCol` |

### `connect-four/src/lib/categories.js`

Mirror the server `categories.js` update (same slugs, names, order).

---

## Frontend rendering

### Board.jsx

New highlight overlay modes triggered by `highlightMetadata`:
- `type: 'capsule'` → render a vertical stadium div overlaid on column `column`, rows `fromRow..toRow`; a count badge absolutely positioned above the board above that column.
- `type: 'cells'` → render each cell with a colored ring/outline based on `role`:
  - `killing_threat` / `neutralised_threat` → orange outline
  - `dead_threat` / `major_threat` → purple outline
  - `pattern_piece` → teal outline

### CurationWorkspace.jsx

Render `highlight_metadata` from the candidate for each new category type. For
`claimeven`, convert `category_evidence.simulation_trace` to a sequence of
highlighted cells (player 1 → `role: "loser"`, player 2 → `role: "winner"`) and
show `baseinverse_pair` columns as `role: "hint"` at their current playable height.

---

## Test fixtures

### `connect-four/tests/predicates/fixtures/fixtures.json`

Add one positive and one negative fixture per new category (6 × 2 = 12 new entries).

### `connect-four/tests/classifier/fixtures/fixtures.json`

Add ≥20 manually-reviewed labeled positions per new category (SC-002 merge gate).
Each entry: `{ moveString, category, label: 'positive'|'negative' }`.

### New integration tests

- `connect-four/tests/integration/z_threat.test.js` — detect and evaluate z_threat end-to-end.
- `connect-four/tests/integration/claimeven.test.js` — detect and evaluate claimeven subtype A and B.
- `connect-four/tests/integration/figure7_jshape.test.js` — detect figure_7 and j_shape.
- `connect-four/tests/predicates/predicates.test.js` — extend existing file with new category cases.
