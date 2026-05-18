---
id: allis-lowinverse
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.5, p. 39-40 (formal definition)"
  verbatim_quote: |
    Lowinverse formally:

    Required: Two different columns, called the Lowinverse columns. In each Lowinverse
    column two squares, lying directly above each other. All four squares must be empty.
    In both columns the upper of the two squares is odd.

    Solutions: All groups which contain both upper squares. All groups which are solved
    by the Verticals, which are part of the Lowinverse.

statement: |
  A Lowinverse consists of two pairs of vertically adjacent empty squares, one pair
  per column, where the upper square in each pair is ODD. The controller of Zugzwang
  gets at least one square from each of three pairs: the lower pair in column A, the
  lower pair in column B, and the two upper squares (one per column). The mechanism:
  whenever the opponent plays a lower square in either column, the controller plays
  the upper square in that column (same as a Vertical). Because the Lowinverse spans
  two columns, the total forbidden squares (from Zugzwang's perspective) is even —
  the rule does not change who controls Zugzwang. Lowinverse refutes all groups that
  include both upper squares, plus all vertical groups refuted by the two embedded
  Verticals.

preconditions:
  - "Two different columns (Lowinverse columns) each contain two vertically adjacent empty squares."
  - "In each column, the upper of the two squares is ODD."
  - "All four squares are empty."
  - "The Zugzwang controller applies this rule."

formal_predicate: |
  # Input: board B, two columns (col_a, col_b), their Lowinverse rows
  # Output: bool — can Lowinverse be applied?

  def can_lowinverse(board, col_a, row_a_lower, col_b, row_b_lower):
      row_a_upper = row_a_lower + 1
      row_b_upper = row_b_lower + 1
      return (
          col_a != col_b                          # different columns
          and row_a_upper % 2 == 1                # upper of col_a is odd
          and row_b_upper % 2 == 1                # upper of col_b is odd
          and board[col_a][row_a_lower] == EMPTY
          and board[col_a][row_a_upper] == EMPTY
          and board[col_b][row_b_lower] == EMPTY
          and board[col_b][row_b_upper] == EMPTY
      )

  # Solutions:
  #   1. All groups containing BOTH (col_a, row_a_upper) AND (col_b, row_b_upper).
  #   2. All groups solved by Vertical (col_a, row_a_lower)-(col_a, row_a_upper).
  #   3. All groups solved by Vertical (col_b, row_b_lower)-(col_b, row_b_upper).
  #
  # Note: the upper squares do NOT need to be in the same row (Allis: "there is no
  # restriction which states that the upper squares must lie in the same row").

worked_examples:
  - movestring: PENDING
    description: |
      Lowinverse at c2-c3 and d2-d3 (upper squares c3 and d3, both odd row 3). White
      threatens at a3-d3 (needs both c3 and d3). Lowinverse refutes a3-d3 because the
      controller guarantees getting at least one of c3/d3 from each column. Additionally
      both Verticals c2-c3 and d2-d3 are active side effects.
    expected_behavior: "solver confirms Black refutes a3-d3; Lowinverse at c2-c3-d2-d3 is the refutation"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Two adjacent pairs in two columns, but the upper square in one column is EVEN.
      Lowinverse requires BOTH upper squares to be odd. An even upper square means
      Claimeven applies to that column (stronger rule) — but Lowinverse cannot use
      it. A naive check on "two pairs in two columns" without the odd-upper constraint
      would fire incorrectly.
  - movestring: PENDING
    why_not: |
      Lowinverse proposed alongside a Claimeven where the Claimeven's lower square
      lies below the Lowinverse's lower square in the same column. This combination
      is invalid: a Claimeven below a Lowinverse in the same column changes Zugzwang
      incorrectly (Allis §7.1). The Lowinverse fires first (lower squares reachable
      earlier), and then the Claimeven would try to fire in a column where Zugzwang
      has already been affected.

known_limitations:
  - "Upper squares need not be in the same row — a Lowinverse on a2-a3 and c4-c5 is valid (Allis explicit note). This is a common surprise for implementers who assume both pairs must be at the same height."
  - "Combination constraint: a Lowinverse cannot be combined with a Claimeven if the Claimeven lies below the Lowinverse in the same column (Allis §7.1 constraint 2). Also cannot be combined with a Highinverse using overlapping columns."
  - "Lowinverse is Zugzwang-dependent: it requires the controller to have Zugzwang control (unlike Baseinverse and Vertical which are independent)."

related:
  - "[[allis-vertical]] — each column pair of Lowinverse is a Vertical; Lowinverse combines two Verticals"
  - "[[allis-highinverse]] — extends Lowinverse by also including the even squares above the upper odd squares"
  - "[[allis-claimeven]] — combination constraint: Claimeven below Lowinverse in same column is forbidden"
  - "[[allis-before]] — can be combined with Lowinverse if column-wise disjoint or equal (§7.3)"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.5:

> **Lowinverse formally:**
>
> Required: Two different columns, called the Lowinverse columns. In each Lowinverse column two squares, lying directly above each other. All four squares must be empty. In both columns the upper of the two squares is odd.
>
> Solutions: All groups which contain both upper squares. All groups which are solved by the Verticals, which are part of the Lowinverse.

(Informal intro from §6.5: "The result of this is, that Black gets at least one of the squares c3 and d3. This effect is the goal of the Lowinverse. This rule has a side-effect, too. The rule can be seen as consisting of two Verticals.")

## Notes

- **Key non-obvious fact:** The upper squares do not need to be in the same row. Allis explicitly states: "It is necessary to see that there is no restriction which states that the upper squares must lie in the same row. A Lowinverse on, for instance, a2-a3-c4-c5 is very well possible."
- **Zugzwang parity:** Each Lowinverse column forbids an odd number of squares from the opponent's perspective. But since there are TWO columns, the total forbidden is even — Zugzwang control is preserved, which is why Lowinverse can be combined with Claimeven and other Zugzwang-dependent rules (with the column-ordering constraint).
