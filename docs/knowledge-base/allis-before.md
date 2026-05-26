---
id: allis-before
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.8, p. 42-43 (formal definition)"
  verbatim_quote: |
    Before formally:

    Required: A group without men of the opponent, which is called the Before group.
    All empty squares of the Before group should not lie in the upper row of the board.

    Solutions: All groups which contain all squares which are successors of empty
    squares in the Before group.

    All groups which are solved by the Verticals which are part of the Before.
    All groups which are solved by the Claimevens which are part of the Before.

statement: |
  A Before is a White group (no opponent discs) whose empty squares are each covered
  by either a Claimeven or Vertical pair from the controller. The controller will
  eventually complete the Before group. The key insight: in the column where the
  controller plays the LAST disc completing the Before group, the opponent cannot
  then place any disc above that square — the game ends (the controller just won, or
  the Before group was completed allowing the controller to play the successor of each
  empty square). Therefore, any opponent group requiring ALL successors of the Before's
  empty squares (i.e., requiring a disc in each column directly above each empty square
  of the Before group) is refuted. Before is a generalization of Aftereven — where
  Aftereven uses only Claimevens, Before allows mixing Claimevens and Verticals. Use
  Aftereven when possible (it draws stronger conclusions); use Before only when a
  Vertical is needed instead of a Claimeven.

preconditions:
  - "A group G without opponent discs exists (the 'Before group')."
  - "All empty squares of G are not in the top row (row 6) of the board."
  - "Each empty square of G is covered by either a Claimeven or a Vertical pair."
  - "The combination of all Claimevens and Verticals used satisfies the compatibility constraints of Allis §7.3."

formal_predicate: |
  # Input: board B, Before group G, set of Claimeven CE and Vertical VE instances
  # Output: bool — can Before be applied to G?

  def can_before(board, group_squares, claimeven_instances, vertical_instances, controller):
      # controller = the player who applies Before (the Zugzwang controller)
      # The Before group must contain no opponent discs (Allis §6.8: "a group without
      # men of the opponent")
      opponent = WHITE if controller == BLACK else BLACK
      if any(board[sq.col][sq.row] == opponent for sq in group_squares):
          return False
      empty_in_group = [(sq.col, sq.row) for sq in group_squares
                        if board[sq.col][sq.row] == EMPTY]
      # Each empty square must be covered by either Claimeven (as upper) or Vertical (as upper)
      ce_uppers = {(ce.col, ce.row_upper) for ce in claimeven_instances}
      ve_uppers = {(ve.col, ve.row_upper) for ve in vertical_instances}
      covered = ce_uppers | ve_uppers
      for sq in empty_in_group:
          if sq not in covered:
              return False
      # Also check no empty square is in row 6
      return all(sq[1] != 6 for sq in empty_in_group)

  # Solutions:
  #   Primary: All opponent groups containing ALL successors of empty squares in G.
  #     (Successor of (col, row) = (col, row+1))
  #   Secondary: All groups solved by the Verticals within the Before.
  #   Secondary: All groups solved by the Claimevens within the Before.

worked_examples:
  - movestring: "25555"
    description: |
      Before group: "/" diagonal (col3,row1)→(col4,row2)→(col5,row3)→(col6,row4)
      (move 5, Yellow to move). Red discs at (col3,row1) and (col6,row4); empty squares
      at (col4,row2) and (col5,row3). No Yellow discs in the window. Neither empty square
      is in row 6. Coverage: (col4,row2) is even-row with (col4,row1) also empty →
      Claimeven pair col4 rows1-2. (col5,row3) is odd-row with (col5,row2) also empty →
      Vertical pair col5 rows2-3 (upper=row3 odd). Mixed Claimeven+Vertical → Before
      (not Aftereven). Successors of empty squares are (col4,row3) and (col5,row4);
      opponent groups requiring BOTH successors are refuted. All solver scores ≤ 0
      (range -1 to -13).
    expected_behavior: "solver confirms Black refutes groups requiring successors col4,row3 and col5,row4; Before fires with Claimeven+Vertical mix"
    solver_verified: true

false_positives:
  - movestring: PENDING
    why_not: |
      Before group has an empty square in row 6 (the top row). Before explicitly
      requires "all empty squares should not lie in the upper row of the board."
      A group with an empty square in row 6 cannot have that square covered by a
      Vertical (there is no row 7 successor). Aftereven may still apply if only
      Claimevens are needed, but not Before with row-6 empties.
  - movestring: PENDING
    why_not: |
      Group is a Claimeven-only Before (all empty squares covered by Claimevens,
      no Verticals). This is an Aftereven, not a Before. Allis: "If the Before would
      consist of Claimevens only, it would be equal to an Aftereven. In that case we
      can draw stronger conclusions from the Aftereven, and therefore we only use
      Befores, if an Aftereven cannot be used."

known_limitations:
  - "Before is only used when Aftereven cannot be used (Allis explicit). Implementations should prefer Aftereven over Before when applicable."
  - "Combination constraints (§7.3): a Before can be combined with another Before/Aftereven/Specialbefore if they are column-wise disjoint or equal. Cannot combine if a Vertical of one intersects a Claimeven of another."
  - "Before cannot combine with Lowinverse if a Claimeven part of the Before is lower in the same column than the Lowinverse (§7.3)."
  - "Before was the most impactful rule addition to VICTOR: '...it was after the Before was implemented that the general rules for all boards with at most 6 columns were encountered' (Allis §6.10). It is high-cost to implement (many instances) but high-value."

related:
  - "[[allis-aftereven]] — Aftereven is Before restricted to Claimevens only; preferred when applicable"
  - "[[allis-claimeven]] — component of Before"
  - "[[allis-vertical]] — component of Before (unlike Aftereven which uses only Claimeven)"
  - "[[allis-specialbefore]] — variant of Before with an extra directly playable square"
  - "[[allis-lowinverse]] — combination constraint: column-wise disjoint or equal required"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.8:

> **Before formally:**
>
> Required: A group without men of the opponent, which is called the Before group. All empty squares of the Before group should not lie in the upper row of the board.
>
> Solutions: All groups which contain all squares which are successors of empty squares in the Before group.
>
> All groups which are solved by the Verticals which are part of the Before.
> All groups which are solved by the Claimevens which are part of the Before.

(Informal from §6.8: "If White plays f2, Black can play f3, and if White does not play f2, Black will, sometime, and win before White can win. In both cases White cannot win at f3.")

## Notes

- **High-impact rule:** Allis §6.10: "Although the costs of the Before where very high in implementation (the number of different instances of the Before in most positions is about one-third of the total number of instances of solutions of all different types), this resulted in a major improvement of strength of the evaluation function."
- **Before vs. Aftereven:** Aftereven uses Claimevens only → stronger conclusion (the specific column where the group ends is well-defined). Before uses Claimevens AND Verticals → weaker conclusion (which column finishes last is less certain, since Vertical gives one-of-two, not a specific square). Only use Before when Aftereven cannot cover all empty squares.
- **"Before" naming:** The name comes from the controller completing the Before group *before* the game normally ends, making all successors inaccessible to the opponent.
