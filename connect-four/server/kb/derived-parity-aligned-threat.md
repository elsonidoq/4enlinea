---
id: derived-parity-aligned-threat
type: heuristic
canonical: false
source:
  doc: allen_2010
  location: "Glossary (row parity, major threat); Ch. 2 p. 413–414, 425–426; Victory rules V1/V3"
  verbatim_quote: |
    Glossary (row parity): "The attribute of a threat determined by whether it lies on an
    even-numbered or odd-numbered row." Ch. 2 p. 425–426: "Remember that it is the empty
    cell needed to complete four-in-row that determines the threat's row parity."
    Glossary (major threat): "An empty cell whose occupation would complete four-in-row,
    but which is not available for immediate play."
    The parity-aligned major threat is a project-local composition of these two canonical
    definitions: a major threat whose empty cell lies on the owning player's natural row
    parity. Allen states the parity attribute and the value of holding more uncancelled
    odd-row threats (V1/V3) but does not name "parity-aligned major threat" as a unit.
statement: |
  A parity-aligned major threat is a latent major threat (a 4-window with exactly three
  of one player's discs and one empty cell, the empty cell NOT immediately playable) whose
  empty cell sits on that player's natural row parity. Because the first player (Green) lands
  on odd rows (1-indexed 1, 3, 5) and the second player (Gray) lands on even rows (1-indexed
  2, 4, 6) when a column fills in alternation, a threat on the owner's parity row is the kind
  the opponent's claimeven pairing cannot neutralize: gravity naturally delivers the owning
  player to that cell. A major threat on the OFF-parity row (see [[allen-t6]]) is far weaker —
  the opponent's pairing can answer it. This entry is the structural "fully formed" companion
  to the classifier's one-move-away odd_even_threat predicate: it describes a threat that
  already exists on the board and is aligned, not a choice between two candidate moves.

  Parity convention (0-indexed rows, as used throughout the codebase): a threat cell at row r
  is parity-aligned for perspective P iff `r % 2 === (P - 1)` — Green (P=1) on even 0-indexed
  rows (0, 2, 4 = 1-indexed 1, 3, 5), Gray (P=2) on odd 0-indexed rows (1, 3, 5 = 1-indexed
  2, 4, 6). This matches `classifier.js`'s `isGoodRow = row => row % 2 === (perspective - 1)`.

short_summary: |
  A parity-aligned major threat is a latent three-in-a-row whose empty winning cell sits on
  the owner's natural parity row (odd rows for Green, even rows for Gray, 1-indexed). Gravity
  delivers the owner to that cell, so the opponent's claimeven pairing cannot neutralize it —
  making it stronger than the same threat one row off-parity.

preconditions:
  - "A 4-window exists with exactly 3 discs of player P and exactly 1 empty cell (a major threat)."
  - "The empty cell is NOT immediately playable (row > current column height) — it is latent."
  - "The empty cell's row is parity-aligned for P: row % 2 === (P - 1) in 0-indexed rows."

formal_predicate: |
  # Input: board, perspective P ∈ {1, 2}
  # Output: list of (col, row) latent major-threat cells aligned to P's parity

  def parity_aligned_major_threats(board, P):
      results = []
      for (col, row) in major_threat_cells(board, P):      # 3 discs of P + 1 empty in a window
          if row == board.col_height(col):  continue       # immediately playable → immediate_threat, excluded
          if row % 2 == (P - 1):            results.append((col, row))   # 0-indexed parity alignment
      return results

worked_examples:
  - movestring: "3342652334"
    description: |
      Move 10, Green to move. Gray (P=2) holds a latent major threat at c3r4 (display;
      0-indexed col 2, row 3). Row 3 is odd → parity-aligned for Gray (row % 2 === 1).
      The cell is above the column-3 height (2), so it is latent, not immediately playable.
    expected_behavior: "Board shows [Gy] (non-gravity major threat) at col3 row4; categorizeThreats(board, 2).player.majorParityAligned.cells = ['c3r4']."
    solver_verified: 2026-06-25
    notes: "Sourced via gameSampling.playGame; confirmed with ./visualize_board.sh (Major threats: col3 row4 (Gy))."
false_positives:
  - movestring: "542344233"
    why_not: |
      Move 9, Gray to move. Green (P=1) holds a latent major threat at c3r4 (0-indexed col 2,
      row 3). Row 3 is ODD → off-parity for Green (Green's parity rows are even 0-indexed). This
      is a major_threat_nonparity, not parity-aligned — the opponent's pairing can answer it.
    notes: "Same display cell c3r4, opposite owner: alignment depends on (row parity XOR player), not the cell alone."
  - movestring: "PENDING"
    why_not: |
      A major threat whose empty cell is gravity-top (immediately playable) is an
      immediate_threat / forced win, not a latent parity-aligned threat. The latency
      precondition (row > column height) must hold.
    notes: null
known_limitations:
  - "Parity alignment is necessary but not sufficient for the threat to be decisive: it can still be a ghost threat (unreachable) or undercut by an opposing same-column threat at a lower row (see [[allen-t2]])."
  - "Near the endgame, when claimeven resources are exhausted, the parity heuristic weakens — specific column structures dominate (see [[allen-parity]] known_limitations)."
  - "Excludes immediately-playable major threats by design — those are covered by immediate_threat."
related:
  - "[[allen-parity]] — defines row parity; parity is an attribute of the threat's empty cell"
  - "[[allen-major-threat]] — the structural definition this entry specializes (3 discs + 1 empty, latent)"
  - "[[derived-parity-formula]] — the r % 2 alignment rule and its mid-game caveats"
  - "[[allen-t6]] — isolated off-parity threats are far weaker / worthless"
  - "[[allen-v1]] — Green wins holding more uncancelled odd-row (parity-aligned) threats"
  - "[[allis-claimeven]] — Gray's pairing strategy, which a parity-aligned threat circumvents"
last_verified: 2026-06-25
---

## Verbatim source

> "The attribute of a threat determined by whether it lies on an even-numbered or odd-numbered row." — Allen (2010), Glossary (row parity)

> "Remember that it is the empty cell needed to complete four-in-row that determines the threat's row parity." — Allen (2010), Ch. 2 p. 425–426

> "An empty cell whose occupation would complete four-in-row, but which is not available for immediate play." — Allen (2010), Glossary (major threat)

## Notes

- This entry is the "fully formed" structural companion to the classifier's one-move-away
  `odd_even_threat` predicate. `odd_even_threat` (kept as a puzzle category) is a *choice*
  between two candidate moves that each build a threat on opposite parities; the
  parity-aligned major threat described here is a threat that already exists and is aligned.
- The classifier detects this as the `major_threat_parity` tag (`detectMajorThreatParity` in
  `classifier.js`, built on `categorizeThreats`). Its off-parity sibling is
  `major_threat_nonparity` → [[allen-major-threat]]; the two-disc developing form is
  `minor_threat` → [[allen-minor-threat]].
- Coordinate convention: internal code is 0-indexed (row 0 = bottom). The `c{col+1}r{row+1}`
  cell strings used by detectors and the board visualizer are 1-indexed display coordinates.
