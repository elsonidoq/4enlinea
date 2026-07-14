---
id: community-immediate-threat
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "implied by Allen glossary (major threat = 'not available for immediate play')"
  verbatim_quote: |
    No standalone definition in Allen or Allis; inferred as the complementary case:
    a major threat whose empty cell IS available for immediate play (gravity-top).
    Allen's glossary defines major threat as "An empty cell whose occupation would
    complete four-in-row, but which is not available for immediate play."
statement: |
  An immediate threat is a major threat whose empty cell is the gravity-top of its column —
  the next legally playable cell. Because discs fall under gravity, only the topmost empty
  cell in each column can be played on any given turn. When a player has three discs aligned
  with an empty gravity-top cell completing a four-in-a-row, playing that cell wins the game
  instantly before the opponent can respond. A player who holds an immediate threat on their
  turn wins unconditionally. A player facing an opponent's immediate threat must block it or
  lose — but if the opponent holds two immediate threats in different columns, no single move
  can block both.

short_summary: |
  An immediate threat is a major threat whose empty cell is directly playable right now —
  it is the topmost empty cell in its column (gravity-top). Playing there wins the game
  on this move.

preconditions:
  - "A 4-window (horizontal, vertical, or diagonal) contains exactly 3 discs of player P."
  - "The remaining cell in the window is empty."
  - "The empty cell is gravity-top: no empty cell exists below it in the same column."
formal_predicate: |
  # Input: board state, player P
  # Output: list of (col, row) cells that are immediate threats for P

  def immediate_threats(board, player):
      results = []
      for each 4-window W in board:
          count_P     = number of cells in W occupied by player P
          count_empty = number of empty cells in W
          if count_P == 3 and count_empty == 1:
              empty_cell = the single empty cell in W
              if board.col_height(empty_cell.col) == empty_cell.row:
                  results.append(empty_cell)
      return results
worked_examples:
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has three discs in a horizontal window
      with the fourth cell empty and gravity-top. Verify with visualize_board.sh that
      the empty cell appears as <Gn> (gravity-top major threat).
    expected_behavior: "Red's empty cell is shown as <Gn> in the board visualization; solver confirms immediate win."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      A 4-window with 3 discs and an empty cell that is NOT gravity-top (empty cells
      exist below it in the same column) is a latent major threat shown as [Gn], not
      an immediate threat. Playing another column first may eventually make it
      gravity-top, but it is not immediately playable.
    notes: null
known_limitations:
  - "Gravity restricts play to each column's topmost empty cell. Windows with a mid-column gap are latent major threats, not immediate threats."
  - "Two immediate threats in the same column are impossible simultaneously — only one gravity-top exists per column."
  - "An immediate threat that is blocked (opponent plays that column) is refuted and disappears."
related:
  - "[[allen-major-threat]] — an immediate threat is a gravity-top major threat"
  - "[[community-double-threat]] — two simultaneous immediate threats; opponent cannot block both"
  - "[[community-forced-block]] — the required response when the opponent holds an immediate threat"
  - "[[community-gravity-top]] — the gravity-top concept that distinguishes immediate from latent threats"
last_verified: 2026-06-19
---

## Verbatim source

Allen's glossary defines "major threat" as "An empty cell whose occupation would complete four-in-row, but which is **not available for immediate play**." The immediate threat is the complementary case — a major threat that IS available for immediate play — but Allen does not assign it a separate term.

## Notes

- Project-local terminology. In Allen (2010), an immediately-playable winning move is referred to contextually but not labelled "immediate threat" in the glossary.
- The board visualisation legend distinguishes the two: `<Gn>` marks a gravity-top major threat (= immediate threat); `[Gn]` marks a non-gravity latent major threat.
