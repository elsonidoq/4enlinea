---
id: allis-baseinverse
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.2, p. 37 (formal definition); Ch. 5 §5.1 (informal intro)"
  verbatim_quote: |
    A Baseinverse is based on the fact that a player cannot play two directly
    playable moves in one turn. Therefore, after the opponent has made his move
    the controller of the Zugzwang can still play at least one of the two squares.
    Since the opponent can move first, he is the one who can decide which square he
    gets, and which square will be taken by the controller of the Zugzwang. Therefore
    the controller of the Zugzwang can only be sure that he gets at least one of the
    two squares, in that way solving all groups which contain both squares.

    Baseinverse formally:

    Required: Two directly playable squares.

    Solutions: All groups which contain both squares.

statement: |
  A Baseinverse is a pair of directly playable squares (the bottom-most empty square
  in their respective columns) controlled by the Zugzwang controller (typically Black).
  Because the opponent can only play one square per turn, after the opponent plays one
  of the two squares, the controller immediately plays the other. The controller is
  guaranteed to get at least one of the two squares — whichever the opponent doesn't
  take. This refutes all White groups that require BOTH squares simultaneously. Unlike
  Claimeven (which guarantees a specific square), Baseinverse only guarantees one-of-two;
  the opponent chooses which one White gets, but Black always secures the other.

preconditions:
  - "Two distinct directly playable squares exist (the lowest empty cell in their columns)."
  - "Both squares are empty."
  - "At least one White group exists that requires both squares to complete it."
  - "The rule's squares do not overlap with another rule's squares (disjoint sets required)."

formal_predicate: |
  # Input: board state B, two squares (col_a, row_a) and (col_b, row_b)
  # Output: bool — can Baseinverse be applied at this pair?

  def can_baseinverse(board, col_a, col_b):
      # A square is "directly playable" if it is the lowest empty square in its column
      def playable(board, col):
          for row in range(1, 7):
              if board[col][row] == EMPTY:
                  return row
          return None  # column full

      row_a = playable(board, col_a)
      row_b = playable(board, col_b)
      if row_a is None or row_b is None:
          return False
      if col_a == col_b:
          return False  # must be different columns
      return True

  # Effect: all White groups requiring both (col_a, row_a) AND (col_b, row_b) are solved.
  # Strategy: if White plays (col_a, row_a), Black immediately plays (col_b, row_b),
  # and vice versa.
  #
  # Note: can_baseinverse only checks applicability. Finding USEFUL baseinverses
  # requires also checking that at least one White group contains both squares.

worked_examples:
  - movestring: PENDING
    description: |
      White threatens at a1-d1 (needs both a1 and d1, both directly playable). Black
      applies Baseinverse at (a1, d1): if White plays a1, Black plays d1; if White
      plays d1, Black plays a1. White can never complete a1-d1 because Black always
      secures one of the two needed squares.
    expected_behavior: "solver confirms Black refutes a1-d1; Baseinverse at a1-d1 is the refutation"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Two empty squares in the same column, both empty, but only the lower one is
      directly playable. Baseinverse requires BOTH squares to be directly playable
      (the lowest empty in their column). A non-playable upper square cannot form a
      Baseinverse — use Claimeven or Vertical instead.
  - movestring: PENDING
    why_not: |
      Two directly playable squares exist (a1, b1) but no White group contains both.
      Baseinverse requires at least one White group that needs both squares. A1-b1
      forms a valid Baseinverse pair structurally, but if no group is threatened via
      both squares, the rule solves nothing (Allis §6.2: "A Baseinverse like a1-c4 is
      also possible, but useless, since there are no groups which contain both a1 and c4").

known_limitations:
  - "Baseinverse is a Zugzwang-independent rule (Allis §7.2): unlike Claimeven, it does not depend on who controls Zugzwang. It can be combined with all other rules as long as the square sets are disjoint."
  - "Baseinverse guarantees one-of-two squares only, not a specific square. The opponent chooses which square to give up. This is weaker than Claimeven (which guarantees a specific square)."
  - "Cannot refute a White group that requires only ONE of the two squares — the opponent may simply avoid the other square. Baseinverse only works for groups requiring BOTH."
  - "Cannot be combined with another rule if the same square appears in both (sets must be disjoint, per §7.2 — exception: with another Baseclaim in a carefully described way that Allis notes is 'not interesting')."

related:
  - "[[allis-claimeven]] — stronger: guarantees specific even square (vs. one-of-two)"
  - "[[allis-vertical]] — same-column two-square rule (upper odd square; different from Baseinverse which uses same-column's lowest pair)"
  - "[[allis-baseclaim]] — combines two Baseinverses with a Claimeven"
  - "[[allis-lowinverse]] — two Verticals together (similar parity logic extended across columns)"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.2:

> A Baseinverse is based on the fact that a player cannot play two directly playable moves in one turn. Therefore, after the opponent has made his move the controller of the Zugzwang can still play at least one of the two squares. Since the opponent can move first, he is the one who can decide which square he gets, and which square will be taken by the controller of the Zugzwang. Therefore the controller of the Zugzwang can only be sure that he gets at least one of the two squares, in that way solving all groups which contain both squares.
>
> **Baseinverse formally:**
>
> Required: Two directly playable squares.
>
> Solutions: All groups which contain both squares.

(Introduced informally in §5.1: "if two squares are directly playable, and both squares are part of the same group, player A can always prevent player B from completing the group, by playing one square as soon as player B plays the other.")

## Notes

- **Zugzwang independence:** Allis §7.2 explicitly notes that Baseinverse does not depend on Zugzwang control, making it one of the two Zugzwang-independent rules (the other being Vertical). This means a Baseinverse can be combined with any other rule as long as square sets are disjoint — no constraints from Zugzwang parity.
- **Useless Baseinverses:** Allis notes explicitly that a Baseinverse between two squares that share no common White group is "possible, but useless." Implementations must filter Baseinverse instances to those that actually solve at least one problem (White group).
