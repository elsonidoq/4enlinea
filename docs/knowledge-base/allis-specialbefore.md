---
id: allis-specialbefore
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.9, p. 43-44 (formal definition)"
  verbatim_quote: |
    Specialbefore formally:

    Required: A group without men of the opponent, which is called the Specialbefore
    group. A directly playable square in another column. All empty squares of the
    Specialbefore group should not lie in the upper row of the board. One empty square
    of the Before group must be playable.

    Solutions: All groups which contain all successors of empty squares of the
    Specialbefore group and the extra playable square.

    All groups which contain the two playable squares.
    All groups which are solved by one of the Claimevens.
    All groups which are solved by one of the Verticals.

statement: |
  A Specialbefore is a Before with an additional directly playable square in a
  different column. Unlike a plain Before, one empty square of the Specialbefore
  group must itself be directly playable. The extra directly playable square enables
  a Baseinverse-like response when the opponent plays either of the two directly
  playable squares, and allows the controller to answer the opponent's move into a
  Vertical-covered square with the extra square rather than the Vertical's successor
  (avoiding a conflict). This solves an additional class of opponent groups that Before
  alone cannot refute: those requiring all successors of the Before group's empty squares
  AND the extra playable square. Named "Specialbefore" because it is a special variant
  of Before for positions where a Baseclaim-like conflict makes plain Before insufficient.

preconditions:
  - "A Before group G without opponent discs exists, with at least one empty square that is directly playable."
  - "An additional directly playable square exists in a column not used by the Before group."
  - "All empty squares of G are not in row 6 (top row)."
  - "The applicable Claimevens and Verticals within the Before satisfy Allis §7 combination rules."

formal_predicate: |
  # Input: board B, Specialbefore group G, extra playable square EP,
  #        Claimeven CE and Vertical VE instances for the Before part
  # Output: bool — can Specialbefore be applied?

  def can_specialbefore(board, group_squares, extra_playable_col, ce_instances, ve_instances):
      empty_in_group = [(sq.col, sq.row) for sq in group_squares
                        if board[sq.col][sq.row] == EMPTY]
      # At least one empty square of the group must be directly playable
      def is_directly_playable(board, col, row):
          return row == 1 or board[col][row-1] != EMPTY  # lowest empty in column
      has_playable_empty = any(is_directly_playable(board, c, r) for c, r in empty_in_group)
      if not has_playable_empty:
          return False
      # Extra square must be in a different column, directly playable
      extra_playable_row = None
      for r in range(1, 7):
          if board[extra_playable_col][r] == EMPTY:
              extra_playable_row = r
              break
      if extra_playable_row is None:
          return False
      if extra_playable_col in {sq.col for sq in group_squares}:
          return False  # must be in another column
      # Check all empty group squares covered by CE or VE
      ce_uppers = {(ce.col, ce.row_upper) for ce in ce_instances}
      ve_uppers = {(ve.col, ve.row_upper) for ve in ve_instances}
      covered = ce_uppers | ve_uppers
      return all(sq in covered or is_directly_playable(board, sq[0], sq[1])
                 for sq in empty_in_group)

  # Solutions:
  #   1. All groups containing ALL successors of empty squares in G AND the extra playable square.
  #   2. All groups containing the two directly playable squares (Baseinverse-like).
  #   3. All groups solved by the Claimevens within the Before.
  #   4. All groups solved by the Verticals within the Before.

worked_examples:
  - movestring: PENDING
    description: |
      Specialbefore group d2-g2 with Claimevens at f1-f2 and g1-g2 and a Vertical
      at e2-e3. Extra playable square: b1. The Before group d2-g2 has e2 as a directly
      playable empty square. When White plays e2, instead of playing e3 (Vertical's
      response), Black plays d3 (completing the Before group's last empty square early)
      — this is the "special" move that makes it a Specialbefore. The extra square b1
      then handles the Baseinverse-like refutation of a1-d1.
    expected_behavior: "solver confirms Black refutes both the Before-successor groups and the Baseinverse group"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      A Before group where one empty square is directly playable, but no additional
      directly playable square in a DIFFERENT column exists. This is a plain Before
      (possibly with a Vertical covering the playable square), not a Specialbefore.
      Specialbefore requires a distinct extra square outside the Before group's columns.
  - movestring: PENDING
    why_not: |
      The extra directly playable square is in the SAME column as one of the Before
      group's squares. Specialbefore requires a "directly playable square in another
      column" — same column would create a within-column conflict with the Claimeven
      or Vertical covering that column's Before square.

known_limitations:
  - "Allis §6.10: 'The impact of these two rules [Baseclaim, Specialbefore] is probably not significant.' Low-frequency rule; can be deferred in initial implementations."
  - "Combination constraints (§7.4, code from N.B. (ii)): 'For the Specialbefore, the two special squares are said never to equal the squares of the other rule. This means that they can only be combined with another Before, Claimeven or Aftereven if they share exactly some Verticals or Claimevens.'"
  - "The 'one empty square must be playable' requirement is the key structural difference from Before. Without a playable empty square in the Before group, the extra-square Baseinverse-like mechanism cannot work."

related:
  - "[[allis-before]] — Specialbefore extends Before with an extra directly playable square"
  - "[[allis-baseinverse]] — the Baseinverse-like sub-goal solved by the two directly playable squares"
  - "[[allis-claimeven]] — component of the Before part of Specialbefore"
  - "[[allis-vertical]] — component of the Before part of Specialbefore"
  - "[[allis-baseclaim]] — added at the same time; similar edge-case motivation"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.9:

> **Specialbefore formally:**
>
> Required: A group without men of the opponent, which is called the Specialbefore group. A directly playable square in another column. All empty squares of the Specialbefore group should not lie in the upper row of the board. One empty square of the Before group must be playable.
>
> Solutions: All groups which contain all successors of empty squares of the Specialbefore group and the extra playable square.
>
> All groups which contain the two playable squares.
> All groups which are solved by one of the Claimevens.
> All groups which are solved by one of the Verticals.

(Informal from §6.9: "In general we need a normal Before group, of which one of the empty squares is directly playable. Furthermore we need another playable square. All groups are solved which contain the successors of the empty squares of the Before group and the extra playable square. Furthermore all groups which contain both directly playable squares, are solved, since at least one of these is taken (some kind of a Baseinverse).")

## Notes

- **Motivation from §6.9:** In the example position, a normal Before at d2-g2 would conflict with the Vertical at e2-e3 when Black tries to also use a Claimeven at e3-e4. Specialbefore resolves this by allowing Black to play d3 instead of e3 when responding to White's e2 — the extra playable square enables the flexibility.
- **Low-frequency rule:** Like Baseclaim, Specialbefore was added for edge cases. Initial implementations can safely skip it.
