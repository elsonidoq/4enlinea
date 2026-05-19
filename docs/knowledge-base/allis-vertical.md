---
id: allis-vertical
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.3, p. 38 (formal definition)"
  verbatim_quote: |
    A Vertical is based on the fact that a player cannot play two men in the same
    column in one turn, while by playing one men in the column, the square above
    that men becomes immediately playable. This means that a player can always claim
    one of two consecutive squares in a column: if the opponent plays the lower square,
    the claiming player can take the upper square immediately. If the opponent never
    plays the lower square, the player can take that square himself sometime (he might
    even be forced to do so). In both ways, at least one of the two squares will be
    occupied by the player in control of the Zugzwang. If the upper square is even,
    a stronger claim can be made which has been done by Claimeven. Therefore the
    Vertical rule is only used if the upper square is odd. Since the opponent can
    determine which square will be taken by which player, we can only be sure that
    groups which contain both squares are solved by this rule. The name of the rule is
    based on the observation that all groups which contain both squares are Vertical.

    Vertical formally:

    Required: Two squares directly above each other. Both squares should be empty.
    The upper square must be odd.

    Solutions: All groups which contain both squares.

statement: |
  A Vertical is a pair of vertically adjacent empty squares (lower and upper) where
  the upper square is ODD. The Zugzwang controller (typically Black) guarantees they
  will occupy at least one of the two squares: if the opponent plays the lower square,
  Black immediately plays the upper (which becomes directly playable); if the opponent
  never plays the lower square, Black can eventually play it themselves. Unlike
  Claimeven (upper square even → controller gets specifically the even square),
  Vertical only guarantees one-of-two (the opponent may choose which of the two
  squares to surrender). Vertical refutes all White groups that include BOTH squares.

preconditions:
  - "Two vertically adjacent empty squares at (col, row_lower) and (col, row_lower+1=row_upper)."
  - "The upper square (row_upper) is ODD."
  - "Both squares are empty."
  - "The controller of Zugzwang applies this rule."

formal_predicate: |
  # Input: board state B, column c, lower row index
  # Output: bool — can Vertical be applied at (c, row_lower)?

  def can_vertical(board, col, row_lower):
      row_upper = row_lower + 1
      return (
          row_upper % 2 == 1             # upper square must be ODD (not even — that's Claimeven)
          and 1 <= row_upper <= 6        # within board
          and board[col][row_lower] == EMPTY
          and board[col][row_upper] == EMPTY
      )

  # Effect: all White groups requiring BOTH (col, row_lower) AND (col, row_upper) are solved.
  # Strategy:
  #   - If opponent plays (col, row_lower), immediately play (col, row_upper).
  #   - If opponent never plays (col, row_lower), play it yourself when convenient;
  #     after playing row_lower, treat row_upper as a Claimeven-like follow-up.

worked_examples:
  - movestring: "41424"
    description: |
      Vertical pair at col4 rows4-5 (move 5, Yellow to move). Red has 3 discs stacked at
      col4 rows1-3; rows4 and 5 are empty. Lower=row4 (even), upper=row5 (odd) → valid
      Vertical (not Claimeven, because upper is odd). Red major threat [R] at col4 row4
      (3-in-a-row vertical window rows1-4). If Red plays col4 row4, Black immediately plays
      col4 row5, denying Red the vertical group rows2-5 (which needs both row4 and row5).
      All solver scores ≤ 0 (range -7 to -18); Black wins or draws everywhere.
    expected_behavior: "solver confirms Black refutes Red's vertical threat via Vertical at col4 rows4-5; all scr ≤ 0"
    solver_verified: true

false_positives:
  - movestring: PENDING
    why_not: |
      Two vertically adjacent empty squares where the upper square is EVEN. This is
      a Claimeven, not a Vertical. Allis explicitly states: "If the upper square is
      even, a stronger claim can be made which has been done by Claimeven. Therefore
      the Vertical rule is only used if the upper square is odd." Using Vertical where
      Claimeven applies misses the stronger guarantee (specific square vs. one-of-two).
  - movestring: PENDING
    why_not: |
      Upper square is odd but the lower square is already occupied (not empty). Vertical
      requires both squares to be empty. A square with a disc below it is already resolved.

known_limitations:
  - "Vertical only guarantees one-of-two squares (like Baseinverse), not a specific square. The opponent decides which of the two squares they surrender. Use Claimeven when possible (upper square even) for a stronger guarantee."
  - "Vertical is Zugzwang-independent (Allis §7.2): does not require Black to control Zugzwang — the claiming player can take the lower square themselves if the opponent never plays it. This makes Vertical combinable with all other rules when square sets are disjoint."
  - "Vertical only solves VERTICAL groups (groups containing both squares in the pair). Groups that include only one of the two squares are not refuted by a Vertical."

related:
  - "[[allis-claimeven]] — stronger version when upper square is even"
  - "[[allis-baseinverse]] — similar one-of-two guarantee, but for directly playable squares in different columns"
  - "[[allis-lowinverse]] — two Verticals combined across two columns"
  - "[[allis-before]] — combines Claimevens and Verticals for non-immediate groups"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.3:

> A Vertical is based on the fact that a player cannot play two men in the same column in one turn, while by playing one men in the column, the square above that men becomes immediately playable. This means that a player can always claim one of two consecutive squares in a column: if the opponent plays the lower square, the claiming player can take the upper square immediately. If the opponent never plays the lower square, the player can take that square himself sometime (he might even be forced to do so). In both ways, at least one of the two squares will be occupied by the player in control of the Zugzwang. If the upper square is even, a stronger claim can be made which has been done by Claimeven. Therefore the Vertical rule is only used if the upper square is odd. Since the opponent can determine which square will be taken by which player, we can only be sure that groups which contain both squares are solved by this rule. The name of the rule is based on the observation that all groups which contain both squares are Vertical.
>
> **Vertical formally:**
>
> Required: Two squares directly above each other. Both squares should be empty. The upper square must be odd.
>
> Solutions: All groups which contain both squares.

## Notes

- **Vertical vs. Claimeven:** The structural requirement is identical (two adjacent empty squares in one column) but the parity of the upper square distinguishes them. Even upper → Claimeven (stronger: specific square guaranteed). Odd upper → Vertical (weaker: one-of-two). This is why Allis defines Vertical as "only used if the upper square is odd."
- **Zugzwang independence:** Like Baseinverse, Vertical does not depend on Zugzwang control (§7.2). The claimer can take the lower square themselves if never forced — so the claim holds regardless of who controls Zugzwang at the time.
