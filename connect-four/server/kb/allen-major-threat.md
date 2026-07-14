---
id: allen-major-threat
type: definition
canonical: true
source:
  doc: allen_2010
  location: "Glossary; also Ch. 2 p. 413–414 (first usage)"
  verbatim_quote: |
    Glossary: "An empty cell whose occupation would complete four-in-row, but which
    is not available for immediate play."
    Ch. 2 p. 413–414: "Black's threat at b4 is shown with an uppercase T and called
    a major threat because Black already has three of the four disks needed for
    four-in-row."
statement: |
  A major threat is a 4-window (horizontal, vertical, or diagonal) containing exactly
  three discs of one player and exactly one empty cell. Allen's glossary definition
  specifies that the empty cell is "not available for immediate play" — i.e., it is not
  the column's gravity-top. In the board visualisation used by this project, the
  distinction is made explicit: <Gn>/<Gy> marks a major threat whose empty cell IS
  gravity-top (immediately playable); [Gn]/[Gy] marks a major threat whose empty cell
  is above gravity (latent). Both are major threats in the structural sense — three discs
  plus one empty in a four-window — but only the gravity-top variant wins immediately.
  Major threats that are not gravity-top must be respected strategically because gravity
  will eventually make them playable as columns fill up.

short_summary: |
  A major threat is a four-cell window containing three of your discs and one empty cell.
  If that empty cell is the next playable cell in its column (gravity-top), it wins the
  game immediately; otherwise it is a latent threat that will become decisive as the
  board fills.

preconditions:
  - "A 4-window exists (horizontal, vertical, or diagonal) with exactly 3 discs of player P."
  - "The remaining cell in the window is empty."
formal_predicate: |
  # Input: board state, player P
  # Output: list of (col, row) empty cells that are major threats for P

  def major_threat_cells(board, player):
      results = []
      for each 4-window W in board:
          count_P     = number of cells in W occupied by player P
          count_other = number of cells in W occupied by opponent
          count_empty = number of empty cells in W
          if count_P == 3 and count_other == 0 and count_empty == 1:
              results.append(the single empty cell in W)
      return results
worked_examples:
  - movestring: "4455663"
    description: |
      After 7 moves (Red to move). Red has discs at c4r1, c6r1, c3r1. No 3-in-a-row
      for either player yet. Provided as a "before" baseline.
    expected_behavior: "No major threats visible yet."
    solver_verified: null
    notes: "PENDING — substitute a real position that clearly demonstrates a major threat."
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has exactly three discs in a horizontal
      or diagonal window with the fourth cell empty. Show both the gravity-top variant
      (<Gn>) and the latent variant ([Gn]) of the board visualisation.
    expected_behavior: "Board shows <Gn> for gravity-top major threat and [Gn] for above-gravity major threat."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      A 4-window with 2 discs and 2 empty cells is a minor threat, not a major threat.
      The count must be exactly 3 discs + 1 empty.
    notes: null
  - movestring: "PENDING"
    why_not: |
      A 4-window with 3 discs of one player and 1 disc of the opponent is a blocked
      window — neither player can complete four-in-a-row through it. It is not a threat
      of any kind.
    notes: null
known_limitations:
  - "Allen's canonical definition excludes gravity-top major threats (he calls them 'available for immediate play' without a separate term). This project uses 'major threat' for both variants and distinguishes them via the <Gn>/<Gy> vs [Gn]/[Gy] board notation."
  - "A major threat can be neutralised (undercut) by an opposing threat with opposite row parity in the same column — see [[allen-t2]]."
  - "Major threats count in Allen's victory rules (V1–V5) only if they are uncancelled by opposing threats."
related:
  - "[[community-immediate-threat]] — a major threat whose empty cell is gravity-top"
  - "[[allen-minor-threat]] — two discs + two empty cells; a weaker, longer-range setup"
  - "[[community-gravity-top]] — the gravity-top concept that separates immediate from latent major threats"
  - "[[allen-t2]] — cross-parity undercut: opposing major threats in the same column cancel each other"
last_verified: 2026-06-19
---

## Verbatim source

> "An empty cell whose occupation would complete four-in-row, but which is not available for immediate play." — Allen (2010), Glossary

> "Black's threat at b4 is shown with an uppercase T and called a major threat because Black already has three of the four disks needed for four-in-row." — Allen (2010), Ch. 2

## Notes

- The project's board visualisation uses uppercase `T` in the legend (`[Gn]` / `<Gn>`) consistent with Allen's uppercase-T notation.
- Allen's narrow definition (non-gravity-top only) is preserved in `statement`. `short_summary` uses the broader project definition for clarity in coaching explanations.
