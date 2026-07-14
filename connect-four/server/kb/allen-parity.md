---
id: allen-parity
type: definition
canonical: true
source:
  doc: allen_2010
  location: "Glossary; also Ch. 2 p. 425–427 (introduction of parity reasoning)"
  verbatim_quote: |
    Glossary: "The attribute of a threat determined by whether it lies on an
    even-numbered or odd-numbered row."
    Ch. 2 p. 425–426: "this attribute is called the threat's row parity. Remember
    that it is the empty cell needed to complete four-in-row that determines the
    threat's row parity."
    Glossary (odd-row threat): "A major or minor threat cell on the third or fifth row."
    Glossary (even-row threat): "A threat cell on the second, fourth, or sixth row."
statement: |
  Parity, in the context of Connect Four threats, is the attribute of a threat
  determined by whether its empty cell lies on an odd-numbered or even-numbered row
  (rows counted 1–6 from the bottom). Allen distinguishes two types of row parity
  and their strategic implications:

  Odd-row threats (rows 1, 3, 5): Favour the first player (Red/Green). Because Red
  moves first, in an empty board Red plays on odd rounds (1st, 3rd, 5th…) and lands
  on odd rows. Red's winning plan is typically to accumulate more uncancelled odd-row
  threats than Yellow can neutralise (see Allen V1, V3).

  Even-row threats (rows 2, 4, 6): Favour the second player (Yellow/Gray). Yellow's
  claimeven strategy guarantees access to even-row squares in pairs above odd-row
  squares, so Yellow can often neutralise even-row threats from both players.

  Column parity (the `par` row in the board visualisation) is a related but distinct
  concept: it is the count of empty cells remaining in a column, expressed as odd (O)
  or even (E). Column parity determines whether the first or second player is forced
  to fill the final cell in that column, which in turn affects zugzwang control.

short_summary: |
  Parity describes whether a threat cell sits on an odd or even row (1-indexed from
  the bottom). Threats on odd rows favour Green (first player); threats on even rows
  favour Gray (second player). The board's par row shows column parity — the count
  of remaining empty cells per column (O = odd, E = even).

preconditions:
  - "A threat cell exists (major or minor) at a specific (col, row)."
  - "Rows are numbered 1–6 from the bottom (1-indexed)."
formal_predicate: |
  # Input: threat cell (col, row) — row is 1-indexed
  # Output: 'odd' or 'even'

  def row_parity(row_1indexed):
      if row_1indexed % 2 == 1:
          return 'odd'   # rows 1, 3, 5 — favour first player (Red/Green)
      else:
          return 'even'  # rows 2, 4, 6 — favour second player (Yellow/Gray)

  # Column parity (separate concept):
  # Input: board state, column c
  # Output: 'odd' or 'even'

  def column_parity(board, col):
      empty_count = 6 - board.col_height(col)
      return 'odd' if empty_count % 2 == 1 else 'even'
worked_examples:
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has a major threat at an odd row and
      another at an even row. Verify that the odd-row threat yields a higher solver
      score when played (or that preserving it is preferred).
    expected_behavior: "Odd-row threat scores higher (or leads to a winning position); even-row threat does not."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      Parity reasoning breaks down in late-game positions where most columns are
      nearly full and claimeven resources are exhausted. Odd-row threats do not
      automatically win if zugzwang has already been resolved elsewhere.
    notes: null
known_limitations:
  - "Allen defines row parity for threats only — the row number of the empty cell in the window. The row on which a disc is placed is not parity-relevant by itself."
  - "Column parity (empty cell count) and threat parity (row of the threat cell) are related but distinct: a column with odd column parity tends to produce odd-row threats as it fills, but this is not guaranteed for all window configurations."
  - "Parity reasoning is most reliable from an empty-board or mid-game perspective. Near the endgame, specific column structures dominate over general parity heuristics."
related:
  - "[[allen-major-threat]] — parity is an attribute of a threat cell, not of the disc placed"
  - "[[allen-t6]] — odd-row threats can be partially cancelled by specific cross-column structures"
  - "[[allen-v1]] — Red wins if Red holds more uncancelled odd-row threats than Yellow"
  - "[[allen-v3]] — parity counting victory rule"
  - "[[allis-claimeven]] — Yellow's claimeven strategy exploits even-row parity"
  - "[[community-z-threat]] — Z-threat is the mid-game generalisation of odd-row threat parity"
last_verified: 2026-06-19
---

## Verbatim source

> "The attribute of a threat determined by whether it lies on an even-numbered or odd-numbered row." — Allen (2010), Glossary

> "this attribute is called the threat's row parity. Remember that it is the empty cell needed to complete four-in-row that determines the threat's row parity." — Allen (2010), Ch. 2

> Odd-row threat (Glossary): "A major or minor threat cell on the third or fifth row."

> Even-row threat (Glossary): "A threat cell on the second, fourth, or sixth row."

## Notes

- Allen's glossary entries for "odd-row threat" and "even-row threat" list rows 3 and 5 (odd) and rows 2, 4, 6 (even), implicitly excluding row 1. Row 1 threats win immediately when gravity-top, so they do not appear in Allen's parity framework (the game ends before parity matters).
- The `par` row in the board visualisation shows column parity as O/E — this is an operational tool derived from Allen's parity theory but operates at the column level rather than the threat level.
