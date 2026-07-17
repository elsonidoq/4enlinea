---
id: community-gravity-top
type: definition
canonical: false
source:
  doc: allen_2010
  location: "Ch. 1 (move notation); gravity rule stated at p. 333"
  verbatim_quote: |
    "Gravity makes the disk drop down to the first (bottommost) row."
    (Allen, Ch. 1, p. 333. The term "gravity-top" does not appear in Allen or Allis;
    it is a project-local label for the lowest empty cell in a column.)
statement: |
  In Connect Four, gravity causes every dropped disc to fall to the lowest empty cell
  in the chosen column. The gravity-top of a column is the lowest empty cell — the
  only cell that can be legally filled on the current turn. All cells above the
  gravity-top in the same column are not yet reachable; they become playable only
  after the gravity-top is filled and the column height advances by one. A major
  threat whose empty cell is the gravity-top is an immediate threat (wins the game
  this turn). A major threat whose empty cell is above the gravity-top is a latent
  threat — it will become immediate only after the intervening cells are filled by
  either player. The board visualisation distinguishes these: <Gn>/<Gy> marks a
  gravity-top major threat (immediately playable); [Gn]/[Gy] marks a non-gravity
  major threat.

short_summary: |
  The gravity-top of a column is the next legally playable cell — the lowest empty
  row in that column. Only gravity-top cells can be played immediately; all cells
  above them require filling the rows below first.

preconditions:
  - "The column is not full (column height < 6)."
formal_predicate: |
  # Input: board state, column index c (0-indexed)
  # Output: (col, row) of the gravity-top cell, or None if column is full

  def gravity_top(board, col):
      h = board.col_height(col)   # number of discs in the column (0-indexed height)
      if h >= 6:
          return None             # column is full; no playable cell
      return (col, h)             # 0-indexed row = number of discs already there
worked_examples:
  - movestring: ""
    description: |
      Empty board. Every column has height 0. The gravity-top of every column is
      row 0 (bottom row, 0-indexed) = row 1 in 1-indexed display.
    expected_behavior: "All seven columns show gravity-top at row 1 (bottom). ht row shows 0 for all columns."
    solver_verified: null
    notes: "No solver needed for this definition example."
  - movestring: "444"
    description: |
      After Red-col4, Yellow-col4, Red-col4 (3 moves). Column 4 has 3 discs.
      The gravity-top of column 4 is now row 3 (0-indexed row index 3 = 1-indexed row 4).
      All other columns remain at row 1.
    expected_behavior: "Column 4 ht=3; gravity-top is row 4 (1-indexed). All other columns ht=0."
    solver_verified: null
    notes: "No solver needed; height arithmetic only."
false_positives:
  - movestring: "PENDING"
    why_not: |
      Cells above the gravity-top are not playable on the current turn, even if they
      are empty. Only the exact lowest empty cell counts as gravity-top.
    notes: null
known_limitations:
  - "A full column (all 6 rows occupied) has no gravity-top — it is illegal to play there."
  - "The gravity-top advances by one row each time a disc is placed in that column, by either player."
related:
  - "[[community-immediate-threat]] — an immediate threat is a major threat whose empty cell is gravity-top"
  - "[[allen-major-threat]] — major threats are categorised by whether their empty cell is gravity-top or above"
last_verified: 2026-06-19
---

## Verbatim source

> "Gravity makes the disk drop down to the first (bottommost) row." — Allen (2010), Ch. 1

The term "gravity-top" does not appear in Allen (2010), Allis (1988), or other external references in this project. It is a project-local label for the lowest empty cell in a column, derived from the universal gravity rule.

## Notes

- The board visualisation header shows `ht` (height = disc count per column) which allows computing the gravity-top directly: gravity-top row index (0-indexed) = `ht` value for that column.
- "Gravity-top" is important in coaching explanations because it distinguishes what the player *can* do right now from what they are *building toward*.
