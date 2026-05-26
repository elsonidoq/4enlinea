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

  Extended Claimeven (two-odd-columns variant, source: 2swap/WeakC4 video): if exactly
  two columns have odd parity, those two columns are treated as a cross-column pair.
  When White plays into one odd-parity column, Black responds in the other odd-parity
  column (not above). After that one exchange both columns become even-parity, and
  standard Claimeven resumes for all remaining columns. The condition for this to work
  is the same as for the all-even case: after the cross-column exchange, no White
  winning group on an odd row may remain unrefuted by a lower Yellow group.

preconditions:
  - "The controller of Zugzwang (typically Black) is applying the rule."
  - "Two vertically adjacent empty squares exist at (col, row_odd) and (col, row_odd+1=even)."
  - "The upper square row_odd+1 is even (rows 2, 4, 6)."
  - "Both squares are empty."
  - "The square is not already part of a Baseinverse or other conflicting rule on the same squares."
  - "(Extended variant) Exactly two columns have odd parity, and after the cross-column exchange those two columns reduce to even parity with no unrefuted White odd-row threats remaining."

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

  # Strategy (standard): whenever opponent plays (col, row_lower), immediately play (col, row_upper).
  # Solved groups: all White groups that include (col, row_upper) are refuted.

  # Strategy (extended — two odd-parity columns col_A and col_B):
  #   If opponent plays into col_A → Black plays into col_B (and vice versa).
  #   Both columns then have even parity; standard Claimeven applies to all columns thereafter.

  # Combination constraint (from Allis Ch.7):
  #   Multiple Claimevens can be combined if their sets of squares are disjoint AND
  #   if applying one Claimeven does not release an odd number of squares that would
  #   change Zugzwang control before another Claimeven fires. Specifically, a
  #   Claimeven cannot be placed below a Lowinverse or Highinverse in the same column.

worked_examples:
  - movestring: "3233253335"
    description: |
      Board-wide Claimeven position (move 10, Red to move). All six non-full columns
      have even empty counts (par: 6E 6E 4E 0E 6E 4E 6E). No major threats for either
      player. Red has no tactical shortcut. All solver scores are negative (-2 to -11),
      confirming Yellow wins regardless of where Red plays. Yellow wins purely by
      responding directly above every Red move — the entire remaining board is covered
      by Claimeven pairs.
    expected_behavior: "all solver scores negative for Yellow; no major threats; Yellow wins via pure Claimeven pairing"
    solver_verified: true
  - movestring: "3233333556"
    description: |
      Extended Claimeven with two odd-parity columns (move 10, Red to move).
      Col3 and col7 each have 5 empty cells (5O) — odd parity. All other non-full
      columns are even (col1=6E, col2=6E, col5=6E, col6=4E). No major threats for
      either player. All solver scores are -2 (Yellow wins in every column).
      Yellow's strategy: cols 1, 2, 5, 6 are covered by standard Claimeven (respond
      above Red). For cols 3 and 7, Yellow uses the cross-column pair: if Red plays
      col3, Yellow plays col7 (and vice versa), consuming the bottommost even cell
      in each and reducing both to even parity. Standard Claimeven then covers the
      rest. Source for the two-odd-columns extension: 2swap/WeakC4 Claimeven video.
    expected_behavior: "all solver scores -2; no major threats; Yellow wins via Claimeven + cross-column pairing of the two odd-parity columns"
    solver_verified: true

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
- **Two-odd-columns extension (2swap/WeakC4):** The WeakC4 Claimeven video (subtitles 93–99) demonstrates that exactly-two-odd-columns positions can be reduced to the standard all-even case by treating the two odd columns as a cross-column pair. This extension is not in Allis; it is sourced from `docs/external_references/Claimeven_video_subtitles.srt`.
