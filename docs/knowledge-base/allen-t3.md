---
id: allen-t3
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 97 (Transformation Rules section, T3)"
  verbatim_quote: |
    T3: Second-row and fifth-row threats of the same player in the same column
    will exert zugzwang control twice.

    A second-row threat and a fifth-row threat in the same column are equivalent to
    two odd-row threats in separate columns.

    (Most of the other rules are simple, but this peculiar rule, where a second-row
    threat can sometimes be considered equivalent to an odd-row threat, may seem
    surprising. This important rule also applies to minor threats.)

statement: |
  When the same player has major threats at both row 2 (even) and row 5 (odd) in
  the same column, this pair is equivalent — for V1/V2 counting purposes — to two
  independent odd-row threats in separate columns. The row-2 threat normally has no
  strategic value (it's even-row, so worthless to Red via T6), but paired with a
  row-5 threat in the same column it becomes a zugzwang lever: the player can
  sacrifice the row-2 threat and then use the row-5 threat to toggle zugzwang a
  second time, functioning as if the player held two separate odd-threated columns.
  T3 is a same-player rule; opposite-player row-2+row-5 is handled by T2 (the
  row-2 threat undercuts row-5). T3 also applies to minor threats (explicit Allen note).

preconditions:
  - "Same player owns both threats."
  - "One threat is at row 2 (even) and the other at row 5 (odd) in the same column."
  - "Both threat cells are empty."
  - "T1 does not apply (rows 2 and 5 are not adjacent; |5-2| = 3 ≠ 1)."
  - "The opposite-player case (cross-player row-2+row-5) has been handled by T2 first."

formal_predicate: |
  # Input: set of major threats T = {(player, col, row), ...}
  # Output: set of (col, player) pairs where T3 applies

  def t3_pairs(threats):
      result = []
      by_player_col = {}
      for t in threats:
          key = (t.player, t.col)
          by_player_col.setdefault(key, set()).add(t.row)
      for (player, col), rows in by_player_col.items():
          if 2 in rows and 5 in rows:
              result.append((col, player))
      return result

  # Effect on V1/V2 counting when t3_pairs() returns (col, player):
  #   Replace the single column (col) in the player's threat list with TWO
  #   virtual separate odd-threated columns. This doubles the zugzwang leverage
  #   from this column — as if the player held two independent odd-row threats.
  #
  # Concrete implication:
  #   - If Red has row-2 + row-5 in column C, it counts as 2 odd-threated columns.
  #   - If Black has row-2 + row-5 in column C, it counts as 2 odd-threated columns.
  #   So Black with only a single column containing row-2+row-5 satisfies V2 alone.

worked_examples:
  - movestring: PENDING
    description: |
      Red has major threats at (col D, row 2) and (col D, row 5). No other threats.
      T3 predicts this is equivalent to two odd-threated columns for Red, satisfying
      V1 (three odd-threated columns) is NOT met, but it IS equivalent to one V2-level
      Black situation flipped. With perfect play Red wins because T3 gives Red
      zugzwang control twice — same as holding two separate odd-row threats.
    expected_behavior: "solver confirms Red wins; T3 is the reason (one column acts as two odd-threated columns)"
    solver_verified: PENDING
  - movestring: PENDING
    description: |
      Black has major threats at (col E, row 2) and (col E, row 5). No other major
      threats. T3 gives Black two virtual odd-threated columns, satisfying V2
      (Black wins with two odd-row threats in separate columns).
    expected_behavior: "solver confirms Black wins; T3 gives Black the equivalent of two odd-row threats"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Same player has threats at row 2 and row 4 in the same column. Rows 2 and 4
      are both even — T3 specifically requires row 2 AND row 5 (even + odd). A
      naive predicate checking "same player, same column, one even + one odd" would
      fire here, but T3 does not apply; this is a T4 (same parity would be wrong) or
      uncovered case. Only the exact row-2+row-5 pairing triggers T3.
  - movestring: PENDING
    why_not: |
      Opposite players have threats at row 2 and row 5 in the same column. T3
      requires same player. Cross-player row-2+row-5 is T2: the row-2 threat undercuts
      row-5 (sub-case: even below odd, opposite players → undercut).

known_limitations:
  - "T3 is restricted to the exact row 2 + row 5 combination. Other even+odd pairings in the same column (e.g., row 2+row 3, row 4+row 5) are NOT T3 — they are either T1 (adjacent) or T2 (cross-player undercut) or T4/T5."
  - "Allen explicitly notes T3 also applies to minor threats: 'This important rule also applies to minor threats.' No other T rule carries this extension. Implementation must handle the minor-threat variant separately."
  - "The equivalence is for V1/V2 counting only. The physical column still has only one threat per row; the 'two odd-threated columns' is a logical equivalence for outcome prediction, not a board transformation."
  - "G5 (General Principle 5) is the informal statement of T3: 'G5: Second-row and fifth-row threats work together.' T3 is the actionable form."

related:
  - "[[allen-t1]] — adjacent pair (rows 1+2, 2+3, etc.); T1 must be checked before T3"
  - "[[allen-t2]] — cross-player row-2+row-5 is T2's undercut case, not T3"
  - "[[allen-t4]] — same-parity same-column (no bonus); T3 is the exception where an even-row threat DOES gain value"
  - "[[allen-t6]] — Red isolated even-row threats worthless; T3 is the exception where row-2 gains value when paired with row-5"
  - "[[allen-v1]] — T3 doubles the odd-threated column count for V1 evaluation"
  - "[[allen-v2]] — T3 can give Black two effective odd-threated columns from a single physical column"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 97:

> **T3: Second-row and fifth-row threats of the same player in the same column will exert zugzwang control twice.**
>
> A second-row threat and a fifth-row threat in the same column are equivalent to two odd-row threats in separate columns.
>
> *(Most of the other rules are simple, but this peculiar rule, where a second-row threat can sometimes be considered equivalent to an odd-row threat, may seem surprising. This important rule also applies to minor threats.)*
>
> *[Diagram: column sketch with same-colored markers at rows 2 and 5 → equivalence symbol → two separate columns each with an odd-row marker.]*

Note: Allen also states T3 informally as General Principle G5: "G5: Second-row and fifth-row threats work together. When the two threats at these two points are of two different colors, the second-row threat has maximum value; the fifth-row threat is undercut and so is worthless. When the two threats are both one player's, he or she can force the opposing player into zugzwang, later forfeit the second-row threat, and use the fifth-row threat to force the opposing player into zugzwang a second time."

## Notes

- **Why row 2 + row 5 specifically:** The row-2 threat is even-row (normally worthless for Red via T6), but when paired with a row-5 threat the player can intentionally sacrifice the row-2 threat to consume an opponent move, then use the row-5 threat to toggle zugzwang a second time. No other even+odd pairing in the same column has this property — the key is the specific distance (3 rows) that creates two successive zugzwang moments.
- **Minor threat extension:** Allen's parenthetical "this important rule also applies to minor threats" is the only such extension in T1–T7. This likely matters in endgame positions where a minor row-2 threat + major row-5 threat in the same column still counts as two virtual odd-threated columns.
