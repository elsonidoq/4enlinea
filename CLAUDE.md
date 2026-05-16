<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
specs/008-new-puzzle-categories/plan.md
<!-- SPECKIT END -->

## Documentation index

- `docs/index.md` — all design, architecture, and product docs
- `specs/index.md` — all feature specs (001–008) with status and decisions

Read the relevant index before starting any task that touches architecture, data model, API contracts, or product decisions.

## Working with movestrings

When working with Connect Four movestrings: before reasoning about a position, writing a test, or making claims about board state, run `./visualize_board.sh <movestring>` from the project root to get an ASCII board. Never reason about a movestring blindly.

The script prints two boards followed by analysis rows:

1. **Raw board** — compact view showing `R` / `Y` / empty for each cell.
2. **Annotated board** — each cell is one of:
   - `R 1` / `Y42` — disc with the move number that placed it (odd move# = Red, even = Yellow)
   - `[R]` / `[Y]` — major threat (3 discs of that player + 1 empty in a 4-window)
   - `(r)` / `(y)` — minor threat (2 discs + 2 empty)
   - `[*]` / `(*)` — both players have a major/minor threat on that cell
   - Threats are shown for **all** empty cells, including ones not yet reachable in one move.
3. **`par` row** — empty-cell count per column with parity: `O` = odd, `E` = even (key for zugzwang reasoning).
4. **`scr` row** — c4solver score for each column (`--` = full column).
5. **Major threats list** — explicit enumeration of every `[R]`/`[Y]`/`[*]` cell as `colC rowR (player)`, sorted by column then row.
