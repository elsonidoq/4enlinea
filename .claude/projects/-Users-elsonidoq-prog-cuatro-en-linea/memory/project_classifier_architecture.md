---
name: classifier-architecture-and-score-convention
description: "How the pattern classifier works, c4solver score encoding, and category detection logic"
metadata: 
  node_type: memory
  type: project
  originSessionId: 78ca6d92-72fb-4121-b9ce-acf936d1b8e7
---

# Pattern classifier architecture

## File: `connect-four/server/classifier.js`

Classifies a Connect Four position given `(moves, candidateCol, scores)` where scores come from c4solver `-a` flag.

## c4solver score convention

Score from c4solver `-a` = from current player's perspective:
- Positive: current player wins eventually
- Negative: current player loses eventually
- `immediateWinScore(n) = floor((42 - n) / 2)` where n = number of moves already played
- If current player wins immediately (at move n+1): score = `floor((42 - n) / 2)`
- If opponent wins on their next turn (at move n+2 from current position): score = `-floor((41 - n) / 2)`

**Key invariant**: These are NOT symmetric around zero. `-(winScore - 1) ≠ opponentImmediateWin`.

## Category detection pipeline (in priority order)

**Original 5 categories:**
1. **immediate_threat**: `score >= floor((42-n)/2) && score > 0`
2. **forced_block**: `score >= 0` AND all other legal moves equal `opponentImmediateWin`
3. **double_threat**: `score > 0` AND after placing candidate, current player has ≥2 winning threats
4. **forced_win**: structural `detectForcedWin` — NOT score-based. Matches when: not already a `double_threat`; mover has exactly 1 immediate threat; opponent forced to block gains no threat; and a continuation wins / makes a `double_threat` / continues the forcing chain (recursion depth ≤ 8). No score gate. (Corrected 2026-06-25; the earlier "all scores ≤ 0, pick highest" was wrong.)
5. **forbidden_columns**: any column where opponent immediately wins if played directly above

**6 new tactical categories (added spec 008, phase 3):**
6. **z_threat**: unique column with odd empty-cell count to winning threat AND positive solver score
7. **undercut**: stacked threats in same column (current player R above, opponent R' below), scores[col] < 0
8. **overcut**: same structure as undercut but scores[col] > 0
9. **claimeven**: 1 or 2 odd-height columns; simulation confirms Yellow wins with baseinverse strategy
10. **figure_7**: convolution-based; detects fully-formed 5-piece shape via `F7`/`F7_FLIPPED` kernels (was: 4-of-5 pre-completion). No score gate, no zugzwang simulation.
11. **j_shape**: convolution-based; detects fully-formed 4-piece shape via `J`/`J_FLIPPED` kernels (was: 3-of-4 pre-completion). No score gate, no parity/anchor guards.

**Key undercut/overcut distinction**: Both find same structural pattern (cross-player stacked threats in one column). Undercut: playing that column LOSES (scores[col] < 0). Overcut: playing that column WINS (scores[col] > 0).

**Claimeven parity rule**: Uses `heights[col] % 2 === 1` (odd *empty-space* count), NOT `col % 2` (column index). Common bug to watch for.

## highlight_metadata schema by category
- `z_threat`: `{ type: 'capsule', column, fromRow, toRow, badgeCount }` (badgeCount always odd)
- `undercut`: `{ type: 'cells', cells: [{ column, row, role: 'killing_threat' }, { column, row, role: 'dead_threat' }] }`
- `overcut`: `{ type: 'cells', cells: [{ column, row, role: 'neutralised_threat' }, { column, row, role: 'major_threat' }] }`
- `figure_7`: `{ type: 'cells', cells: [5 × { column, row, role: 'pattern_piece' }] }`
- `j_shape`: `{ type: 'cells', cells: [4 × { column, row, role: 'pattern_piece' }] }`
- `claimeven`: `null` (no visual highlight)

## correct_col storage
- Stored on `puzzles` and `candidates` tables (added by migration `016_correct_col.sql`)
- Needed by: claimeven, figure_7, j_shape, odd_even_threat evaluators
- `detectFigure7` and `detectJShape` no longer return `correctCol` — the completing column is derived by `checkFigure7Predicate`/`checkJShapePredicate` via transition logic (simulate each legal column, check before/after pattern presence)
- undercut/overcut derive from `highlight_metadata` at eval time, `correct_col = null`


---

## (merged from `project_classifier_current_state`) — detector semantics & _scores trap

**`detectFigure7`/`detectJShape` evaluate the board AS-IS** — a pattern is fully present or not; they do NOT detect one-move-away states. The transition logic for puzzle generation (iterate legal columns, simulate, verify pattern was absent before) lives in `checkFigure7Predicate` / `checkJShapePredicate` in `candidate-generator.js`.

**`_scores` caller-signature trap:** both `detectFigure7` and `detectJShape` accept `_scores` and ignore it, but `classifyPattern` still passes it — do NOT remove the parameter or the call site breaks.


---

## (merged from `reference_highlight_metadata_null_categories` — Which puzzle categories have highlight_metadata = null vs non-null on the puzzles table, verified against classifier.js source)

## Categories with stored `highlight_metadata` (non-null on puzzles table)

| Category | Metadata type |
|---|---|
| `z_threat` | capsule |
| `undercut` | cells |
| `overcut` | cells |
| `figure_7` | cells |
| `j_shape` | cells |

## Categories with `highlight_metadata` = null on puzzles table

| Category | Why null |
|---|---|
| `immediate_threat` | No metadata path in evaluatePredicate (fallthrough) |
| `forced_block` | No metadata path in evaluatePredicate (fallthrough) |
| `double_threat` | No metadata path in evaluatePredicate (fallthrough) |
| `forced_win` | Classifier returns `{matched, cells:[]}` with no highlightMetadata; `highlight_cells` exists on candidates table only and is silently discarded at approval (approval endpoint writes `highlight_metadata: candidate.highlight_metadata ?? null` but never reads `highlight_cells`) |
| `claimeven` | Explicit null in candidate-generator |
| `forbidden_columns` | Uses `highlight_cells` column (different from `highlight_metadata`), not copied to puzzles table |
| `odd_even_threat` | Explicit null in candidate-generator |

## Key traps

- **forced_win is the trickiest**: `computeForcedWinHighlight` produces a 5-cell structure (`hint/loser/hint/loser/winner`) stored on `candidates.highlight_cells`. The approval endpoint copies `highlight_metadata` only — the 5-cell data is silently discarded. If you need forced_win highlights on puzzles, `highlight_cells` must be explicitly copied at approval time.
- **claimodd was removed entirely** — see [[project_category_cleanup]].

## Related

- [[project_classifier_architecture]] — detection pipeline & detector traps
- [[project_new_category_wiring_checklist]] — highlight_metadata schema design

---

## correct_col cannot be re-derived from highlight_metadata (claimeven/figure_7/j_shape)

`correct_col` (integer, in both `puzzles` and `candidates` — see `docs/architecture/db-schema.md`) stores the single correct column at candidate/puzzle creation time because it **cannot be re-derived from `highlight_metadata`** for claimeven, figure_7, and j_shape. Added by migration `016_correct_col.sql` (must run after 012's grants). Any query SELECTing/INSERTing `correct_col` in a fresh environment must confirm 016 was applied.
