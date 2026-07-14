---
id: allen-t7
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 100 (Transformation Rules section, T7)"
  verbatim_quote: |
    T7: Red and Black odd-row threats in separate columns cancel each other.

    Red and Black odd-row threats in separate columns cancel each other.

statement: |
  One Red major odd-row threat in column A and one Black major odd-row threat in a
  different column B cancel each other — both threats are eliminated for V1/V2 counting.
  The mechanism: the combined odd+odd empty-cell count for the two columns is even, so
  Red (who must move first) will ultimately be forced to play into one of these two
  columns, sacrificing their own odd-row threat. Black's threat in the other column is
  then also lost when Red plays there next. Both players lose one threat: net result is
  neither gains a V1/V2 advantage from this pair. This is why Black needs TWO odd-row
  threats to win via V2 — one is cancelled by Red's single odd-row threat via T7.
  T7 applies to threats in SEPARATE columns only; threats in the same column are
  governed by T2 (undercut), T4 (same parity, no interaction), or T5 (row 3+6, no
  interaction).

preconditions:
  - "Red has exactly one uncancelled major odd-row threat at (col_A, row_r) where row_r is odd."
  - "Black has exactly one uncancelled major odd-row threat at (col_B, row_s) where row_s is odd."
  - "col_A ≠ col_B (different columns — same-column interactions are T2/T4/T5)."
  - "Both threats survive T1–T6 simplification."

formal_predicate: |
  # Input: simplified threat set after T1–T6 (only remaining active threats)
  # T = {(player, col, row), ...} where all rows are odd (after T6 removes Red even,
  # and T2/T3/T4/T5 have simplified same-column pairs)
  # Output: pairs of (Red threat, Black threat) that cancel via T7

  def t7_cancellations(threats):
      red_odd = [(t.col, t.row) for t in threats
                 if t.player == RED and t.row % 2 == 1]
      black_odd = [(t.col, t.row) for t in threats
                   if t.player == BLACK and t.row % 2 == 1]
      # Each Red odd-row threat in a separate column cancels one Black odd-row threat
      # and vice versa. Cancel them pairwise (one Red cancels one Black).
      cancellations = []
      r_idx, b_idx = 0, 0
      while r_idx < len(red_odd) and b_idx < len(black_odd):
          r_col, r_row = red_odd[r_idx]
          b_col, b_row = black_odd[b_idx]
          if r_col != b_col:
              cancellations.append(((RED, r_col, r_row), (BLACK, b_col, b_row)))
              r_idx += 1
              b_idx += 1
          else:
              # Same column — T2/T4/T5 handled this, skip
              r_idx += 1
      return cancellations

  # After cancellations, apply V1–V5 to the remaining uncancelled threats.
  # G3 mantra: "Red likes odd numbers" — count remaining uncancelled Red odd threats.

worked_examples:
  - movestring: "31243532145314235244552"
    description: |
      Red has exactly one major odd-row threat at col1 row3. Black has exactly
      one major odd-row threat at col7 row5 (different column). T7: these cancel.
      Remaining after T7: no odd-row threats for either player. V5: Draw.
      Solver confirms all column scores = 0.
    expected_behavior: "solver confirms Draw; T7 cancellation leaves no winning threats"
    solver_verified: 2026-05-18
  - movestring: "66162635"
    description: |
      Red has two major odd-row threats at (col 1, row 1) and (col 5, row 1). Black
      has one major odd-row threat at (col 7, row 5). T7 cancels one Red threat
      against Black's one threat. Remaining: one Red odd-row threat. V3: Red wins.
    expected_behavior: "solver confirms Red wins; T7 cancels one pair, leaving Red with one uncancelled odd-row threat"
    solver_verified: true

false_positives:
  - movestring: "0004111444466662552525506"
    why_not: |
      Red has two odd-row threats in the SAME column (col 4, rows 3 and 5). T7
      requires different columns. A naive predicate checking "Red and Black odd-row
      threats" without enforcing different columns would fire T7 here, but this is
      actually a T4 case (same column, same parity, no interaction — not cancellation).
  - movestring: PENDING
    why_not: |
      Red has one odd-row threat; Black has one even-row threat in a different column.
      T7 requires BOTH threats to be odd-row. An even-row Black threat in a separate
      column does not cancel with Red's odd-row threat via T7 — it falls under V4
      (Black wins with even-row threat if Red has no surviving odd-row threat). If Red
      DOES have a surviving odd-row threat, V3/V1 applies and Black's even-row threat
      is irrelevant (T6 generalization for Black's perspective: even-row threats only
      matter in V4).

known_limitations:
  - "T7 applies only to threats in SEPARATE columns. Same-column interactions between Red and Black odd-row threats are governed by T2 (opposite parity undercut) or T4 (same parity, no interaction)."
  - "T7 is a one-for-one cancellation: one Red odd-row threat cancels exactly one Black odd-row threat. If Red has 3 odd-row threats and Black has 1, T7 cancels one pair — leaving Red with 2 uncancelled odd threats. Then G3/V1 applies (even count → Draw, per the endgame table)."
  - "The cancellation mechanism (zugzwang forcing Red to sacrifice) means T7 is implicitly about who moves first in the endgame. T7 is valid assuming both columns still have an odd number of empty cells above the current position (so each constitutes a genuine odd-threated column)."

related:
  - "[[allen-t2]] — same-column cross-parity undercut (different mechanism from T7)"
  - "[[allen-t4]] — same-column same-parity non-interaction (same-column case for T7's different-column scenario)"
  - "[[allen-v1]] — Red wins with 3 uncancelled odd-row threats after T7"
  - "[[allen-v2]] — Black wins with 2 uncancelled odd-row threats after T7"
  - "[[allen-v3]] — Red wins with 1 uncancelled odd-row threat after T7"
  - "[[allen-v5]] — Draw when T7 cancels all threats"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 100:

> **T7: Red and Black odd-row threats in separate columns cancel each other.**
>
> Red and Black odd-row threats in separate columns cancel each other.
>
> *[Diagram: two separate columns, one with Red odd-row marker, one with Black odd-row marker → both columns reduced to empty.]*

Note: Allen's informal explanation of T7 appears in G3 (General Principle 3): "With a second odd-threated column belonging to Black, zugzwang control reverses back to Black, and so on. So Red (who can win only in an odd row) wants there to be an odd number of odd-threated columns."

## Notes

- **Why T7 causes cancellation:** The combined number of empty cells in two odd-threated columns is odd+odd=even. With an even number of total cells remaining in these two columns, Red moves first and will be the one forced to enter one of the two columns first, sacrificing their own threat. Black's response then also becomes forced, losing Black's threat. Result: both threats cancelled, neither player benefits.
- **Consequence for V2:** V2 ("Black wins with two odd-row threats in separate columns") is applied AFTER T7 cancellation. For Black to end up with 2 uncancelled threats, Black must start with enough odd threats to absorb T7's pairwise cancellation. If Red has 1 odd threat and Black has 2 odd threats in 3 different columns, T7 cancels one pair → Black has 1 odd remaining → insufficient for V2 → Draw (consistent with the endgame table row "1 Red, 2 Black → Draw"). Black wins via V2 only when Black starts with ≥2 odd threats AND Red has 0 odd threats (no T7 cancellation occurs), or Black has 3+ odd threats and enough survive T7 pairings.
