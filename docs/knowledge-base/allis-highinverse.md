---
id: allis-highinverse
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.6, p. 40-41 (formal definition)"
  verbatim_quote: |
    Highinverse formally:

    Required: Two different columns, called the Highinverse columns. In each
    Highinverse column three squares, lying directly above each other. All six squares
    are empty. In both columns the upper square is even.

    Solutions: All groups which contain the two upper squares. All groups which contain
    the two middle squares. All (vertical) groups which contain the two highest squares
    of one of the Highinverse columns. If the lower square of the first column is
    directly playable: All groups which contain both the lower square of the first
    column and the upper square of the second column. If the lower square of the second
    column is directly playable: All groups which contain both the lower square of the
    second column and the upper square of the first column.

statement: |
  A Highinverse extends Lowinverse by including the even squares directly above each
  Lowinverse column's upper odd square. Where Lowinverse uses two pairs (4 squares),
  Highinverse uses two triples (6 squares) — in each column: lower, upper-odd, and
  upper-even. The controller of Zugzwang guarantees getting at least one square from
  multiple pairs: both upper-even squares (via Claimeven-like response), both
  upper-odd squares (via Lowinverse-like response), and — if either lower square is
  directly playable — a cross-column pair of (lower_col_X, upper_even_col_Y). The
  Highinverse refutes groups requiring both upper-even squares, both upper-odd squares,
  and the column-crossing pairs described by the playability conditions.

preconditions:
  - "Two different columns each contain three vertically adjacent empty squares."
  - "In both columns the topmost (upper) square is EVEN."
  - "All six squares are empty."
  - "The Zugzwang controller applies this rule."

formal_predicate: |
  # Input: board B, two columns each with (lower, middle_odd, upper_even)
  # Output: bool — can Highinverse be applied?

  def can_highinverse(board, col_a, row_a_lower, col_b, row_b_lower):
      row_a_mid = row_a_lower + 1
      row_a_top = row_a_lower + 2
      row_b_mid = row_b_lower + 1
      row_b_top = row_b_lower + 2
      return (
          col_a != col_b
          and row_a_top % 2 == 0    # upper of col_a is even
          and row_b_top % 2 == 0    # upper of col_b is even
          # (implies row_a_mid and row_b_mid are odd, row_a_lower and row_b_lower are even)
          and all(board[col_a][r] == EMPTY for r in [row_a_lower, row_a_mid, row_a_top])
          and all(board[col_b][r] == EMPTY for r in [row_b_lower, row_b_mid, row_b_top])
      )

  # Solutions:
  # Primary (always):
  #   1. All groups containing BOTH (col_a, row_a_top) AND (col_b, row_b_top) [two upper-even].
  #   2. All groups containing BOTH (col_a, row_a_mid) AND (col_b, row_b_mid) [two upper-odd].
  #   3. All vertical groups containing BOTH squares of one Highinverse column (two per column).
  # Conditional (if lower square is directly playable):
  #   4a. If (col_a, row_a_lower) is directly playable:
  #       All groups containing (col_a, row_a_lower) AND (col_b, row_b_top).
  #   4b. If (col_b, row_b_lower) is directly playable:
  #       All groups containing (col_b, row_b_lower) AND (col_a, row_a_top).

worked_examples:
  - movestring: PENDING
    description: |
      Highinverse at columns c and d with triples c2-c3-c4 and d2-d3-d4 (upper squares
      c4 and d4, both even row 4). White threatens groups needing both c4 and d4, and
      groups needing both c3 and d3. Highinverse refutes both simultaneously.
    expected_behavior: "solver confirms Black refutes both White threats; Highinverse covers both upper pairs"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Two column triples where the UPPER square is ODD in one column. Highinverse
      requires both upper squares to be even. Mixed parity (one upper odd, one upper
      even) doesn't form a Highinverse — the two Lowinverse (odd upper) requirement
      and Claimeven (even upper) requirement are not simultaneously satisfied in the
      same structure.

known_limitations:
  - "Highinverse has 3–5 solution types depending on the playability of lower squares, making it the most complex of the nine rules in terms of what it refutes."
  - "Combination constraints (Allis §7.4, code 4): Highinverse can be combined with other rules only if their sets of squares are disjoint AND the sets of columns used by any inverse rules (Lowinverse/Highinverse) are disjoint or equal."
  - "Highinverse was added to VICTOR specifically for positions where Lowinverse alone was insufficient — 'Special situations where the usage of the Lowinverse was necessary but resulted in problems just above the fields of the Lowinverse, resulted in the addition of the Highinverse' (Allis §6.10)."

related:
  - "[[allis-lowinverse]] — Highinverse extends Lowinverse by including the even squares above the odd upper squares"
  - "[[allis-claimeven]] — the even-upper squares of Highinverse behave like Claimeven uppers"
  - "[[allis-vertical]] — the odd-middle squares of Highinverse behave like Vertical pairs"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.6:

> **Highinverse formally:**
>
> Required: Two different columns, called the Highinverse columns. In each Highinverse column three squares, lying directly above each other. All six squares are empty. In both columns the upper square is even.
>
> Solutions: All groups which contain the two upper squares. All groups which contain the two middle squares. All (vertical) groups which contain the two highest squares of one of the Highinverse columns. If the lower square of the first column is directly playable: All groups which contain both the lower square of the first column and the upper square of the second column. If the lower square of the second column is directly playable: All groups which contain both the lower square of the second column and the upper square of the first column.

## Notes

- **Structure:** In each Highinverse column: lower square (even), middle square (odd), upper square (even). The middle is always odd because the upper is even and they are adjacent. The lower is even because the middle is odd and they are adjacent.
- **Motivation:** "Note that it is easy to achieve only one of the main goals by using Claimevens (c4 and d4) or a Lowinverse (c3 and d3), but for the combination of these goals a Highinverse is needed" (Allis §6.6). Highinverse is the rule for positions where both the Claimeven AND Lowinverse goals must be achieved simultaneously.
