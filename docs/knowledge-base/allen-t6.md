---
id: allen-t6
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 99 (Transformation Rules section, T6)"
  verbatim_quote: |
    T6: Red's isolated even-row threats have no value.

    Except as noted in other rules, Red even-row threats are worthless.

statement: |
  An isolated Red major threat on an even row (rows 2, 4, or 6) has zero strategic
  value for V1/V2/V3 counting. When all empty cells in a column with an even-row
  threat fill, the cells divide evenly between Red and Black — Red cannot use an
  even-row threat to control zugzwang. "Isolated" means not forming an adjacent pair
  with an odd-row threat (which would invoke T1) and not being the row-2 component of
  a row-2+row-5 pair (which would invoke T3). The exceptions ("as noted in other rules")
  are T1 (adjacent pair wins) and T3 (row-2+row-5 pair = double zugzwang control).
  Black's even-row threats are not worthless — they are the basis of Black's V4 winning
  condition.

preconditions:
  - "Red has a major threat on an even row (2, 4, or 6) in some column."
  - "The threat is not adjacent to a Red odd-row threat in the same column (T1 exception)."
  - "The threat is not the row-2 component of a Red row-2+row-5 pair (T3 exception)."

formal_predicate: |
  # Input: set of major threats T = {(player, col, row), ...}
  # Output: set of Red threats that are worthless via T6

  def t6_worthless(threats):
      worthless = set()
      red_threats = {(t.col, t.row): t for t in threats if t.player == RED}
      for (col, row), t in red_threats.items():
          if row % 2 == 0:  # even row
              # Check T1 exception: adjacent to a Red odd-row threat?
              has_adjacent_red_odd = (
                  (col, row-1) in red_threats and red_threats[(col,row-1)].row % 2 == 1
                  or
                  (col, row+1) in red_threats and red_threats[(col,row+1)].row % 2 == 1
              )
              # Check T3 exception: Red row-2 paired with Red row-5?
              is_t3_component = (row == 2 and (col, 5) in red_threats)
              if not has_adjacent_red_odd and not is_t3_component:
                  worthless.add((t.player, t.col, t.row))
      return worthless

  # Effect: worthless threats are removed from the threat set before V1–V5 counting.
  # They do not contribute to Red's odd-threated column count or any other metric.

worked_examples:
  - movestring: "30412536041"
    description: |
      Red has only a single major threat at col3 row2 — an even row. No other
      threats for Red. T6 predicts this Red threat is worthless. Black wins decisively
      (all column scores -9 to -15). This demonstrates that Red's even-row threat
      provides zero strategic value.
    expected_behavior: "solver confirms Black wins or draws; Red's even-row threat plays no role"
    solver_verified: 2026-05-18
  - movestring: "20202101145"
    description: |
      Red has threats at (col C, row 4) and (col D, row 3). The C4 threat is even-row.
      The D3 threat is odd-row in a different column. T6 applies to C4 (isolated even-row
      threat) — it's worthless. The outcome depends only on D3 (V3: Red wins with
      uncontested odd-row threat).
    expected_behavior: "solver confirms Red wins via D3; C4 is irrelevant to the outcome"
    solver_verified: 2026-05-18

false_positives:
  - movestring: PENDING
    why_not: |
      Red has threats at (col E, row 4) and (col E, row 5) — adjacent rows 4 and 5 in
      the same column. T6 would mark row-4 as worthless, but T1 fires first: adjacent
      same-player pair = guaranteed win. T6 explicitly states the exception "as noted
      in other rules" — T1 is one of those exceptions.
  - movestring: PENDING
    why_not: |
      Red has threats at (col F, row 2) and (col F, row 5). The row-2 threat is even-row,
      which T6 would mark as worthless. But T3 fires: Red row-2+row-5 in one column =
      equivalent to two odd-threated columns. T6 explicitly excludes this case via
      "except as noted in other rules." Implementation must check T3 before T6 for
      row-2 threats.

known_limitations:
  - "T6 applies ONLY to Red's isolated even-row threats. Black's even-row threats are NOT worthless — they are the basis of V4 (Black wins with an even-row threat if Red has no odd-row threats)."
  - "The exceptions (T1 and T3) must be checked before declaring a Red even-row threat worthless. Implementation order: T1 → T3 → T6."
  - "T5 provides a related but separate result for Red's row-6 threat specifically: T5 says Red's row-6 threat is always worthless even in the presence of a Red row-3 threat in the same column (the pair gives no bonus). T6 generalizes this to all even rows, but the row-6 special case is explicitly covered in T5."

related:
  - "[[allen-t1]] — adjacent pair exception: Red even-row threat adjacent to Red odd-row threat = T1 win, not T6 worthless"
  - "[[allen-t3]] — row-2+row-5 same-player exception: Red row-2 gains value as part of T3"
  - "[[allen-t5]] — T5 states Red's row-6 threat is always worthless (specialization of T6 for row 6)"
  - "[[allen-v4]] — Black wins with even-row threat (only if Red has no odd-row threat); Black even-row threats are NOT worthless"
  - "[[allen-v5]] — with no winning threats for either side, game is drawn"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 99:

> **T6: Red's isolated even-row threats have no value.**
>
> Except as noted in other rules, Red even-row threats are worthless.
>
> *[Diagram: multiple column sketches showing Red even-row markers (rows 2, 4, 6) being eliminated to empty columns.]*

Note: Allen's informal explanation appears in Chapter 3 (Diagram 37 and surrounding text): "Thus columns with even-row threats have no effect on zugzwang control." T6 is the formal transformation-rule statement of this principle.

## Notes

- **Why Red's even-row threats are worthless:** In a fully filled column, Red occupies odd rows and Black occupies even rows (Principle G1). An even-row threat means Black's "natural" row would complete the line — but Black, not Red, would have been filling that row anyway as the column filled. Red's even-row threat does not let Red take a row they wouldn't otherwise have gotten via zugzwang. A column with an even-row Red threat has an even number of empty cells above the current position, meaning Red and Black split them evenly — Red gains nothing from the threat.
- **Black's even-row threats are different:** Black's even-row threats ARE valuable (V4). When Black claims a row-4 or row-6 threat, Black is claiming a row they would normally receive anyway — but the threat makes it a forced win rather than a draw.
