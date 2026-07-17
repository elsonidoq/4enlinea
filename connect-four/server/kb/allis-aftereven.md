---
id: allis-aftereven
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.4, p. 38-39 (formal definition)"
  verbatim_quote: |
    Aftereven uses a special side-effect of the usage of one or more Claimevens. If a
    group can be completed by the controller of the Zugzwang, by filling squares which
    all can be claimed using Claimevens, then this player can be sure that he will
    eventually complete the group. In the column where he plays the last man which
    completes the group, no other man will be thrown. Therefore the opponent cannot
    get any of the squares above the last square of the Aftereven group. Which column
    will be the last, if the Aftereven group needs at this time more than one man,
    cannot be determined beforehand. The order in which those columns are filled can
    most of the time be determined by the opponent. For this reason the only thing we
    can conclude is, that in at least one of the columns which contain empty squares of
    the Aftereven group, no men will be put by the opponent, above the square of the
    Aftereven group. Therefore groups of the opponent, which have squares in all columns
    where a man of the Aftereven group is still missing, all higher than the Aftereven
    group, cannot be completed.

statement: |
  An Aftereven is a White winning group whose remaining empty squares can ALL be
  claimed by the Zugzwang controller via Claimeven pairs. Because the controller
  will eventually place the last disc completing the group (in whichever column
  goes last), no discs can be placed ABOVE that last square in that column — the
  game ends at that point. Since it's unknown which column will be last, we can
  only conclude: in AT LEAST ONE of the columns with empty Aftereven squares, no
  opponent disc will appear above the Aftereven square. Therefore, any opponent
  group requiring squares above the Aftereven level in ALL such columns is refuted.
  Aftereven is strictly stronger than Claimeven alone: it refutes groups that don't
  even include the Claimeven squares directly, but whose required squares all lie
  above them.

preconditions:
  - "A White group exists with one or more empty squares that remain to be filled."
  - "All empty squares of the group can be claimed via Claimeven pairs."
  - "The Zugzwang controller (Black) applies the rule."
  - "The Aftereven group itself will eventually be completed by the controller."

formal_predicate: |
  # Input: board B, a White group G (list of squares), Claimeven instances CE
  # Output: bool — can Aftereven be applied to group G?

  def can_aftereven(board, group_squares, claimeven_instances, controller):
      # controller = the player who applies Aftereven (the Zugzwang controller)
      # The Aftereven group must contain no discs belonging to the group owner's opponent
      # (Allis §6.4: "a group which can be completed by the controller of the Zugzwang")
      opponent = WHITE if controller == BLACK else BLACK
      if any(board[sq.col][sq.row] == opponent for sq in group_squares):
          return False
      empty_in_group = [sq for sq in group_squares if board[sq.col][sq.row] == EMPTY]
      # All empty squares must be claimable by Claimeven instances
      ce_uppers = {ce.upper_square for ce in claimeven_instances}
      return all(sq in ce_uppers for sq in empty_in_group)

  # Effect: all opponent groups that contain squares in ALL columns of empty_in_group,
  # all at rows strictly ABOVE the respective Aftereven square, are refuted.
  #
  # Side effect also noted by Allis: the Aftereven group itself is solved (the
  # controller completes it via the Claimeven responses).

worked_examples:
  - movestring: "60011"
    description: |
      Aftereven group at cols1-4 row2 (move 5, Yellow to move). Red occupies (col1,row2)
      and (col2,row2). The empty squares (col3,row2) and (col4,row2) are each the upper
      (even) square of a Claimeven pair: col3 rows1-2 and col4 rows1-2 (both row1 cells
      also empty). No Black discs in the window. Black will eventually fill both even
      squares via Claimeven responses, completing the group. In whichever column Black
      plays last, no further discs appear above — refuting Red groups requiring squares
      above row2 in all such columns. Scores: col1=-2, col2=+2, col3=-2, col4=0, col5=-2,
      col6=-2, col7=-2. Note: col2=+2 means Red wins if Red plays col2 immediately, so
      the overall position is not Black-winning; the example demonstrates the Aftereven
      structural coverage of the row-2 window.
    expected_behavior: "Aftereven covers cols1-4 row2; Claimeven pairs at col3 rows1-2 and col4 rows1-2 confirmed"
    solver_verified: true

false_positives:
  - movestring: PENDING
    why_not: |
      A White group with empty squares, but one of those squares is NOT covered by a
      Claimeven (e.g., it's an odd-row square with no empty square below it, making
      Claimeven inapplicable there). Aftereven requires ALL empty group squares to be
      claimable via Claimeven. A partial coverage does not make the group an Aftereven.
  - movestring: PENDING
    why_not: |
      All empty squares are covered by Claimeven, but the Claimeven instances are
      incompatible with each other (e.g., one Claimeven is below a Lowinverse in the
      same column, violating the combination constraint). Aftereven is only valid when
      the underlying Claimevens can be applied simultaneously.

known_limitations:
  - "Aftereven's conclusion is probabilistic in column: we know SOME column will be last, but not which one. The refutation applies to groups that need squares above the Aftereven level in ALL remaining columns — if a group only needs a square above the level in ONE column, it might still survive (via the other columns)."
  - "Aftereven implies completing the target group itself. If completing the group would allow the opponent to win elsewhere (rare, given the strategic framework), the Aftereven is not safely applicable in isolation."
  - "If the Aftereven group consists of Claimevens only (no Verticals), it is an Aftereven; if it mixes Claimevens and Verticals, it becomes a Before (Allis §6.8). Aftereven is the pure-Claimeven version."

related:
  - "[[allis-claimeven]] — prerequisite: all empty squares must be covered by Claimevens"
  - "[[allis-before]] — generalization of Aftereven that includes Verticals alongside Claimevens"
  - "[[allis-baseclaim]] — uses Claimeven plus Baseinverses (complementary)"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.4:

> Aftereven uses a special side-effect of the usage of one or more Claimevens. If a group can be completed by the controller of the Zugzwang, by filling squares which all can be claimed using Claimevens, then this player can be sure that he will eventually complete the group. In the column where he plays the last man which completes the group, no other man will be thrown. Therefore the opponent cannot get any of the squares above the last square of the Aftereven group. Which column will be the last, if the Aftereven group needs at this time more than one man, cannot be determined beforehand. The order in which those columns are filled can most of the time be determined by the opponent. For this reason the only thing we can conclude is, that in at least one of the columns which contain empty squares of the Aftereven group, no men will be put by the opponent, above the square of the Aftereven group. Therefore groups of the opponent, which have squares in all columns where a man of the Aftereven group is still missing, all higher than the Aftereven group, cannot be completed.

## Notes

- **Aftereven vs. Before:** Allis §6.8 explicitly states: "If the Before would consist of Claimevens only, it would be equal to an Aftereven. In that case we can draw stronger conclusions from the Aftereven, and therefore we only use Befores, if an Aftereven cannot be used." Aftereven is the preferred and stronger rule when only Claimevens are involved.
- **Practical impact:** Allis §6.10 notes that the addition of Aftereven to VICTOR's evaluation function "resulted in a significant improvement in performance" after basic Claimeven/Baseinverse were insufficient to solve certain positions.
