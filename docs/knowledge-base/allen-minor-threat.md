---
id: allen-minor-threat
type: definition
canonical: true
source:
  doc: allen_2010
  location: "Glossary; also Ch. 2 p. 418–419 (first usage)"
  verbatim_quote: |
    Glossary: "One of two (or three) empty cells in a partially completed four-in-row."
    Ch. 2 p. 418–419: "A minor threat is one of two cells needed to convert two aligned
    disks to four-in-row."
statement: |
  A minor threat is a 4-window containing exactly two discs of one player and two
  empty cells (and no opponent disc). It represents a developing setup: the player
  needs two more moves in the same window to complete four-in-a-row. Minor threats
  are weaker than major threats but still strategically significant — they indicate
  possible winning lines and constrain how both players develop the board. The board
  visualisation marks minor threat cells with lowercase: (gn) for Green's minor
  threats and (gy) for Gray's. A cell that is a minor threat for both players is
  marked (*). Minor threats rarely determine the immediate result of a position but
  guide long-term planning and threat-space analysis.

short_summary: |
  A minor threat is a four-cell window with two of your discs and two empty cells.
  It is a longer-range setup — two moves away from completing four-in-a-row — and
  signals a developing plan rather than an immediate danger.

preconditions:
  - "A 4-window exists (horizontal, vertical, or diagonal) with exactly 2 discs of player P."
  - "The remaining 2 cells in the window are both empty (no opponent disc in the window)."
formal_predicate: |
  # Input: board state, player P
  # Output: list of (col, row) empty cells that are minor threats for P

  def minor_threat_cells(board, player):
      results = []
      for each 4-window W in board:
          count_P     = number of cells in W occupied by player P
          count_other = number of cells in W occupied by opponent
          count_empty = number of empty cells in W
          if count_P == 2 and count_other == 0 and count_empty == 2:
              # Both empty cells in W are minor threat cells for P
              results.extend(all empty cells in W)
      return results
worked_examples:
  - movestring: "44"
    description: |
      After Red-col4, Yellow-col4 (2 moves). Red has 1 disc at c4r1; Yellow at c4r2.
      Neither player has 2 in a row yet. No minor threats exist.
      Provided as baseline.
    expected_behavior: "No minor threats; board shows no (gn) or (gy) cells."
    solver_verified: null
    notes: "PENDING — substitute a position that demonstrates minor threats clearly."
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has two discs in a horizontal window
      with two empty cells and no opponent disc. Verify the board shows (gn) on
      both empty cells.
    expected_behavior: "Board shows (gn) on both empty cells in the window."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      A 4-window with 2 discs of one player and 1 disc of the opponent (blocked window)
      is not a minor threat for either player — four-in-a-row through that window is
      impossible for both sides.
    notes: null
known_limitations:
  - "Minor threats are only meaningful if neither opponent disc occupies the same 4-window. A blocked window is dead for both players."
  - "Minor threats are not counted in Allen's victory rules (V1–V5), which operate on major threats only."
  - "A minor threat can become a major threat when one of its two empty cells is filled by the same player."
related:
  - "[[allen-major-threat]] — a stronger threat: three discs + one empty cell"
last_verified: 2026-06-19
---

## Verbatim source

> "One of two (or three) empty cells in a partially completed four-in-row." — Allen (2010), Glossary

> "A minor threat is one of two cells needed to convert two aligned disks to four-in-row." — Allen (2010), Ch. 2

## Notes

- Allen's parenthetical "(or three)" in the glossary definition accounts for 4-windows with only one player disc and three empty cells. The project's board visualisation does not specifically label single-disc windows; `(gn)` marks the two-disc variant.
- Minor threats provide the early-game threat-space structure that zugzwang reasoning builds on in later phases.
