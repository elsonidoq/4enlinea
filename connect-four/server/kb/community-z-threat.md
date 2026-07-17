---
id: community-z-threat
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§5.4 Zugzwang Axis"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  A Z-Threat is a major threat at cell (c, r) where the number of empty cells in
  column c from the current column height up to and including row r is odd. Owning a
  Z-Threat means the owner can "toggle" zugzwang control: the opponent must eventually
  play into that column, but the odd empty-cell count ensures the owner lands on row r
  rather than the opponent. A Z-Threat is the parity-aware counterpart to "odd-row
  threat" in Allen's framework; the count formulation generalises across mid-game
  positions where the column is partially filled.

short_summary: |
  A Z-Threat is a major threat where the count of empty cells from column height to
  the threat row is odd, letting the owner toggle zugzwang control.

preconditions:
  - "A major threat exists at (c, r) for player P."
  - "Column c is not full: height(c) < r."
  - "The count of empty cells from row height(c)+1 to row r inclusive is odd: (r - height(c)) % 2 == 1."

formal_predicate: |
  # Input: board state, major threat T = (player, col, row)
  # Output: bool — whether T is a Z-Threat

  def is_z_threat(T, board):
      h = board.height(T.col)      # index of topmost occupied cell (0 if column empty)
      empty_count = T.row - h      # cells from h+1 to T.row inclusive
      return (empty_count % 2) == 1

  # Note: empty_count == T.row - h because rows are 1-indexed and h is the count
  # of occupied cells in the column (equivalent to the row index of the top disc).
  # For an empty column, h == 0 and empty_count == T.row.

worked_examples:
  - movestring: "0004111444466662552525506"
    description: |
      After 25 moves (Yellow to move). Column 4 is entirely empty; height = 0.
      Red has a major threat at col4 row3.
      empty_count = 3 - 0 = 3 (odd) → Z-Threat.
      Red also has a major threat at col4 row5; empty_count = 5 - 0 = 5 (odd) → also Z-Threat.
      Solver score for col4 is -6 (Yellow wins by playing col4), confirming both threats are
      zugzwang-relevant but Yellow controls the game through external structure.
    expected_behavior: "col4 row3 and col4 row5 are both Z-Threats (odd empty-cell counts 3 and 5); par row shows col4 as 6E but the individual threat counts to each threat cell are 3O and 5O"
    solver_verified: 2026-05-17
    notes: |
      The overall column parity (6E) tells you who is forced to play the column last,
      not who reaches a specific row. The Z-Threat count (to the threat cell) is the
      operative value for zugzwang toggling.

false_positives: null

known_limitations:
  - "The Z-Threat count is relative to current column height, not row number alone. A threat at row3 in a column with height 2 has empty_count = 1 (Z-Threat); the same threat cell in an empty column has empty_count = 3 (still Z-Threat). The raw row number is insufficient."
  - "The label is project-local (§5.4 note); the underlying concept appears in Allen as 'odd-row threat' and in Allis §3.3 as parity control. The count formulation is an operational extension for mid-game positions."
  - "A Z-Threat column that is itself losing (opponent wins by playing there before the owner can) is still structurally a Z-Threat — it just does not function as a zugzwang tool in that specific line. Solver verification of the threat's effectiveness is separate from detecting its Z-Threat status."
  - "Does not apply to minor threats or vertical threats (Allis threat taxonomy)."

related:
  - "[[allen-t7]] — odd-threat cancellation across columns; T7 applies when two Z-Threats in separate columns (one per player) cancel each other"
  - "[[allen-v1]] — Red wins with odd count of uncancelled odd-row / Z-Threats"
  - "[[community-ghost-threat]] — a threat that appears reachable but is neutralised by the opponent's Z-Threat flipping zugzwang ownership"
  - "[[community-parity-trap]] — the structural consequence when a player has no Z-Threat to counter the opponent's"
  - "[[derived-dead-space-parity]] — formula that determines which player is forced first after dead-space exhaustion"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §5.4 (Zugzwang Axis):

> **Z-Threat** — Odd number of empty cells between the current column height and the threat cell (inclusive). Owning this threat lets the player toggle zugzwang control.
>
> **0-Threat** — Even number of empty cells to reach it — zugzwang-inert unless directly terminal.
>
> **#-Threat** — A mutual terminal threat pair; whoever is forced to play that column loses.

*Note: "Z-Threat", "0-Threat", "#-Threat" are project-local labels (Allen's Expert Play and Allis 1988 do not use these terms). The underlying parity concept — odd-empty-count threats toggle zugzwang — is canonical in Allis §3.3 and Allen V1/V3.*

## Notes

- **Relationship to Allen's odd-row threats:** Allen's T-rules operate on row parity at endgame (all columns empty). The Z-Threat count formulation generalises this to mid-game where columns are partially filled: the count of empty cells to the threat cell is the operative parity signal, replacing the raw row number.
- **Why the term is useful:** During puzzle construction and explanation, "Z-Threat" is more precise than "odd-row threat" because it remains accurate after partial column fills. An odd-row threat with an even number of cells below it (because some are already filled) is NOT a Z-Threat.
