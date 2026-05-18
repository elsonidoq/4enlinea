---
id: allis-claimeven
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.1, p. 36 (formal definition); Ch. 5 §5.2 (informal intro)"
  verbatim_quote: |
    A Claimeven makes direct use of the fact that the controller of the Zugzwang
    can get all empty even squares (which are not directly playable), by letting
    the opponent play all empty odd squares. So in individual cases, the controller
    gets an even square, for the price of the odd square below the even square. A
    Claimeven is therefore concerned with two squares, an odd and an even square,
    both empty, lying directly above each other. All groups which contain the even
    square are solved by the Claimeven.

    Claimeven formally:

    Required: Two squares, directly above each other. Both squares should be empty.
    The upper square must be even.

    Solutions: All groups which contain the upper square.

statement: |
  A Claimeven is a pair of vertically adjacent empty squares (lower odd, upper even)
  controlled by the player controlling Zugzwang (Black in standard play). Whenever
  White plays the lower (odd) square, Black immediately plays the upper (even) square.
  If White never plays the lower square, Black can eventually take it and then respond
  above. Either way, Black guarantees access to the upper even square. All White
  winning groups that include the upper square are thereby refuted. Claimeven is the
  most fundamental of Allis's nine rules — if an entire board position can be covered
  by non-overlapping Claimevens (a "claimeven position"), Black wins immediately via
  the pairing argument without any further search.

preconditions:
  - "The controller of Zugzwang (typically Black) is applying the rule."
  - "Two vertically adjacent empty squares exist at (col, row_odd) and (col, row_odd+1=even)."
  - "The upper square row_odd+1 is even (rows 2, 4, 6)."
  - "Both squares are empty."
  - "The square is not already part of a Baseinverse or other conflicting rule on the same squares."

formal_predicate: |
  # Input: board state B, column c, row r (the lower/odd square of the pair)
  # Output: bool — can Claimeven be applied at (c, r)?

  def can_claimeven(board, col, row_lower):
      row_upper = row_lower + 1
      return (
          row_lower % 2 == 1             # lower square must be odd
          and row_upper % 2 == 0         # upper square must be even
          and 1 <= row_upper <= 6        # upper square within board
          and board[col][row_lower] == EMPTY
          and board[col][row_upper] == EMPTY
      )

  # Strategy: whenever opponent plays (col, row_lower), immediately play (col, row_upper).
  # Solved groups: all White groups that include (col, row_upper) are refuted.

  # Combination constraint (from Allis Ch.7):
  #   Multiple Claimevens can be combined if their sets of squares are disjoint AND
  #   if applying one Claimeven does not release an odd number of squares that would
  #   change Zugzwang control before another Claimeven fires. Specifically, a
  #   Claimeven cannot be placed below a Lowinverse or Highinverse in the same column.

worked_examples:
  - movestring: PENDING
    description: |
      Position where all columns have even numbers of empty squares. Black applies
      Claimeven pairs across the entire board, covering every White winning group.
      Solver confirms Black wins or draws.
    expected_behavior: "solver confirms Black wins; all White threats refuted by Claimeven pairing"
    solver_verified: PENDING
  - movestring: PENDING
    description: |
      Single Claimeven application: White threatens via a group including (col C, row 4).
      Black has a Claimeven at (col C, row 3)–(col C, row 4). Whenever White plays C3,
      Black plays C4 — White's threat through C4 is permanently refuted.
    expected_behavior: "solver confirms Black refutes the White threat; Claimeven fires correctly"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      A pair of adjacent empty squares where the UPPER square is ODD (not even).
      This is a Vertical (Allis rule 3), not a Claimeven. Claimeven requires the
      upper square to be even. A naive predicate checking only "two adjacent empty
      squares" would conflate Claimeven and Vertical.
  - movestring: PENDING
    why_not: |
      Even upper square exists, but the lower (odd) square is already occupied by
      Black. The Claimeven requires BOTH squares to be empty. If the lower square
      is occupied, there is no "respond above" trigger — the pair is irrelevant.
  - movestring: PENDING
    why_not: |
      Claimeven at (col A, row 1)–(col A, row 2) is proposed alongside a Lowinverse
      that uses col A, row 1. The combination is invalid: a Claimeven below a Lowinverse
      in the same column would cause Zugzwang to change incorrectly after one rule fires
      (Allis §7.1). A naive combinator that ignores this interaction would produce a
      faulty strategy.

known_limitations:
  - "Claimeven guarantees the controller of Zugzwang gets the upper (even) square — it does NOT guarantee Black wins the game. It refutes specific White groups. All White groups must be covered by some rule combination for Black to guarantee a draw or win."
  - "Claimeven cannot be stacked in a column such that a Claimeven's lower square coincides with another Claimeven's upper square from below — the sets of squares must be disjoint (Allis §7.1)."
  - "Claimeven cannot be combined with a Lowinverse if the Claimeven lies below the Lowinverse in the same column (Allis §7.1 constraint 2)."
  - "If White has an unrefuted odd-row threat elsewhere, White — not Black — controls Zugzwang. In that case Claimeven's precondition (controller of Zugzwang = Black) may fail. However, Allis shows that if a complete set of rules covers all White groups, the Zugzwang precondition is self-fulfilling (§5.4)."

related:
  - "[[allis-baseinverse]] — alternative rule for directly playable square pairs"
  - "[[allis-vertical]] — same structure but upper square is odd (Vertical, not Claimeven)"
  - "[[allis-aftereven]] — group of empty squares all coverable by Claimevens; stronger conclusion"
  - "[[allis-baseclaim]] — combines Claimeven with two Baseinverses"
  - "[[allis-before]] — combination of Claimevens and Verticals for non-immediate groups"
  - "[[allen-v4]] — V4 is the Allen endgame counterpart: Black wins with even-row threat when no odd threats remain"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.1:

> A Claimeven makes direct use of the fact that the controller of the Zugzwang can get all empty even squares (which are not directly playable), by letting the opponent play all empty odd squares. So in individual cases, the controller gets an even square, for the price of the odd square below the even square. A Claimeven is therefore concerned with two squares, an odd and an even square, both empty, lying directly above each other. All groups which contain the even square are solved by the Claimeven.
>
> **Claimeven formally:**
>
> Required: Two squares, directly above each other. Both squares should be empty. The upper square must be even.
>
> Solutions: All groups which contain the upper square.

(Also introduced informally in §5.2: "if Black controls the Zugzwang, he can claim an even square, if the odd square below the even square is still empty. In that case he will take the even square as soon as White has played the odd square below.")

## Notes

- **Foundational rule:** Claimeven is the most elementary of the nine rules. Allis §6.10 notes: "The most elementary rules are the Claimeven, Baseinverse, Lowinverse and Vertical. These four rules are based on simple observations which can be made by any experienced player of the game."
- **Combination constraint summary (from §7.1):** Multiple Claimevens can be applied simultaneously if (a) their square sets are disjoint and (b) applying one does not release an odd number of squares in a shared column before another fires. Claimevens can coexist with Baseinverses and Verticals freely (if squares are disjoint). Cannot be placed below Lowinverse or Highinverse in the same column.
- **Allen connection:** Allen's V4 ("Black wins with an even-row threat") is the macroscopic consequence of Claimeven — if all White groups are refuted by Claimevens, Black wins via V4. T6 ("Red's isolated even-row threats are worthless") mirrors Claimeven from the Red perspective: Red cannot use even rows strategically.
