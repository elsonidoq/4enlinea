---
id: allen-t5
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 99 (Transformation Rules section, T5)"
  verbatim_quote: |
    T5: Third-row and sixth-row threats do not influence each other.

    A Red third-row threat has no effect on a Black sixth-row threat.

    Red's sixth-row threat is always worthless (unless it is part of an adjacent pair).

    There's no bonus for two odd-row threats in the same column.

    Black's sixth-row threat is independent of the third-row threat in the same column.

statement: |
  Threats at rows 3 (odd) and 6 (even) in the same column — regardless of player —
  do not interact with each other. This is a non-interaction rule parallel to T4
  (same parity), but for different parity (odd + even). The mechanism differs from T4:
  T4's non-interaction is a parity consequence; T5's non-interaction is a playability
  consequence — by the time the column fills to row 6, the row-3 threat has long since
  been resolved (taken, blocked, or made irrelevant). Additionally, Red's row-6 threat
  is worthless in isolation (even row, same as T6 generalization), and a same-player
  row-3+row-6 pair gives no cumulative V1 bonus over a single row-3 threat. The
  opposite-player row-3+row-6 pairing also does not constitute a T2 undercut — the
  typical T2 logic (lower undercuts upper) does not apply here.

preconditions:
  - "Threats exist at row 3 and row 6 in the same column."
  - "Both threat cells are empty."
  - "T1 does not apply (rows 3 and 6 are not adjacent)."

formal_predicate: |
  # Input: set of major threats T = {(player, col, row), ...}
  # Output: bool indicating whether T5 applies for a given column

  def t5_applies(threats, col):
      column_threats = [t for t in threats if t.col == col]
      rows = {t.row for t in column_threats}
      return 3 in rows and 6 in rows

  # Effect on V1/V2 counting when t5_applies():
  #   Case A (same player, row 3 + row 6 in one column):
  #     Count only the row-3 threat for that player. The row-6 threat is worthless
  #     (even row for any player in this column configuration). No cumulative bonus.
  #   Case B (opposite players, row 3 + row 6 in one column):
  #     Both threats remain independently active. UNLIKE T2, the row-3 threat does
  #     NOT undercut the row-6 threat (T5 explicitly overrides T2 for this pair).
  #     Each threat is counted for its owner.
  #
  # Red's row-6 threat specifically: always worthless per T5/T6, even when paired
  # with a Red row-3 threat in the same column. Treat as if Red had only the row-3
  # threat.

worked_examples:
  - movestring: "100221001122001122"
    description: |
      Red has a major threat at (col 4, row 3) and Black has a major threat at
      (col 4, row 6). T5 predicts these do not interact — Black's row-6 threat is
      independent of Red's row-3 threat. Red wins via the row-3 odd-row threat;
      Black's row-6 even threat gives Black no zugzwang leverage here. (Col 4 also
      has Black row-4 and Red row-5 threats; all four threats coexist in the column.)
    expected_behavior: "solver confirms Red wins; Black's col4 row6 threat plays no role in the outcome"
    solver_verified: true
  - movestring: "123021133024412334311224"
    description: |
      Red has major threats at (col 1, row 3) and (col 1, row 6) — same player.
      T5 Case A: Red's row-6 threat is worthless, giving no bonus over the single
      row-3 threat. Additional threats present in col5 and col6; col1 row3+row6
      is the T5 illustration.
    expected_behavior: "solver score equivalent to position with only Red's col1 row3 threat; col1 row6 does not add value"
    solver_verified: true

false_positives:
  - movestring: PENDING
    why_not: |
      Opposite players with threats at rows 3 and 5 in the same column — same parity
      (both odd). T5 requires rows 3 AND 6 specifically. Row-3+row-5 same-column is
      a T4 case (same parity, no interaction — but for a different reason than T5).
      A naive predicate checking "rows 3 and any even row" would incorrectly apply T5
      to row-3+row-4 (which is actually T2, cross-parity undercut).
  - movestring: PENDING
    why_not: |
      Same player has threats at rows 2 and 5 in the same column. T5 requires rows
      3+6 specifically. Row-2+row-5 same player is T3 (double zugzwang control) —
      the opposite of T5's "no interaction" conclusion. A predicate matching "any
      even+odd same-column pair" would fire T5 here, which is wrong.

known_limitations:
  - "T5 overrides T2 for the specific row-3+row-6 pair. Even though rows 3 and 6 have opposite parity, T2's undercut logic does NOT apply — these threats are non-interacting, not neutralizing."
  - "Red's isolated row-6 threat is always worthless (whether or not a row-3 threat exists in the same column). This is consistent with T6 (Red isolated even-row threats have no value)."
  - "The non-interaction is a playability argument specific to row 6: by the time the column fills to row 6, the row-3 situation is already resolved. This argument does not generalize to other even rows — row 2 and 4 can be reached much earlier."
  - "T5 applies to both same-player and opposite-player configurations, but the implications differ (Case A vs. Case B above)."

related:
  - "[[allen-t1]] — check adjacency before T5; rows 5+6 are adjacent (T1), rows 3+6 are not"
  - "[[allen-t2]] — cross-parity undercut; T5 is the exception to T2 for the row-3+row-6 specific pair"
  - "[[allen-t3]] — row-2+row-5 same player (opposite conclusion: double zugzwang control)"
  - "[[allen-t4]] — same-parity non-interaction (T4 is the parity-based version; T5 is the playability-based version)"
  - "[[allen-t6]] — Red even-row threats worthless; T5 specializes this for row-6 in the presence of row-3"
  - "[[community-overcut]] — implementation: `detectOvercutCore`'s `isT5Exception` rescue branch
    emits `reason: 't5_row3_row6'` (renamed from the misapplied `'active_forcing'` — spec 052 Epic 2
    US2, `docs/architecture/reason-DECISIONS.md` D38); do not confuse this branch with the KB's own
    distinct `'active_forcing'` mechanism (case (e) in `community-overcut.md`'s `formal_predicate`),
    which is a different, non-theorem sub-case gated additionally on `scores[col] > 0`"

last_verified: 2026-07-30
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 99:

> **T5: Third-row and sixth-row threats do not influence each other.**
>
> A Red third-row threat has no effect on a Black sixth-row threat.
>
> *[Diagram sub-case 1: Red odd-row marker at row 3, Black even-row marker at row 6 → each remains independently.]*
>
> Red's sixth-row threat is always worthless (unless it is part of an adjacent pair).
>
> *[Diagram sub-case 2: Red marker at row 6 only → worthless.]*
>
> There's no bonus for two odd-row threats in the same column.
>
> *[Diagram sub-case 3: same-player markers at rows 3 and row 6 in one column → count as one.]*
>
> Black's sixth-row threat is independent of the third-row threat in the same column.
>
> *[Diagram sub-case 4: Black marker at row 6, Red at row 3 → no interaction.]*

Note: Allen presents T5 with four sub-case diagrams, more than any other T rule. The extra diagrams emphasize that unlike T2 (which might naively seem to apply to this opposite-parity pair), T5 asserts non-interaction.

## Notes

- **Why T5 is not T2:** Rows 3 and 6 have opposite parity (odd + even), so T2's general rule "lower threat undercuts upper" might seem to apply — the row-3 threat is lower and would "undercut" the row-6 threat. T5 explicitly denies this: the mechanism that makes row-2 undercut row-3 (T2) does not extend to row-3 vs. row-6. The reason is playability: by the time column fills to row 6, the row-3 situation is already decided. T5 is a known exception to T2's general principle.
- **Relationship to T4:** T4 covers same-parity non-interaction (e.g., both odd). T5 covers a specific opposite-parity non-interaction case. Both conclude "no interaction" but for different reasons.
