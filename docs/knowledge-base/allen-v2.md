---
id: allen-v2
type: victory_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 101 (Victory Rules section, V2)"
  verbatim_quote: |
    V2: Black wins with two odd-row threats in separate columns.

    Black needs two odd-row threats (that weren't removed earlier by rule T7) to win.

    Black's two odd-row threats win despite Red's threats in the same columns.
    (Black likes even numbers.)

statement: |
  After T1–T7 simplification, if Black holds two (or any even count ≥ 2) uncancelled
  odd-row threats in separate columns, Black wins. The mechanism is the complement of
  G3: an even count of uncancelled odd-threated columns gives zugzwang control to the
  player who does NOT move first — Black. The parenthetical "(Black likes even numbers)"
  mirrors the Red mantra. The phrase "despite Red's threats in the same columns" means
  Black's two odd threats remain decisive even if Red also has odd-row threats in those
  same columns — T4 (same column, same parity) does not neutralize Black's threats here.
  V2 is checked second (after V1); it is Black's primary winning condition.

preconditions:
  - "T1–T7 have been applied and all threats simplified."
  - "Black holds ≥ 2 uncancelled major odd-row threats in separate columns (even count ≥ 2)."
  - "V1 did not fire (Red does not hold an odd count ≥ 3 of uncancelled odd-row threats)."

formal_predicate: |
  # Input: simplified threat set after T1–T7
  # Output: bool — does V2 apply (Black wins)?

  def v2_black_wins(threats_after_t1_t7):
      black_odd_cols = {t.col for t in threats_after_t1_t7
                        if t.player == BLACK and t.row % 2 == 1}
      # V2: even count ≥ 2 of uncancelled Black odd-row threats in separate columns
      return len(black_odd_cols) >= 2 and len(black_odd_cols) % 2 == 0

  # Note: Allen presents V2 as specifically "two" odd-row threats. The even-count
  # generalization (4, 6, ...) is implied by G3/Allen's parenthetical in V1
  # ("four separate columns → Black wins"). In practice two is nearly universal.

worked_examples:
  - movestring: PENDING
    description: |
      After T1–T7, Black holds uncancelled odd-row threats in columns A (row 3) and
      G (row 5). Red holds no odd-row threats. V2 fires: Black wins despite being
      second player. Solver should confirm Black wins.
    expected_behavior: "solver confirms Black wins; two Black odd-row threats remain uncancelled after T1–T7"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Black holds one uncancelled odd-row threat (after T7 cancelled one of Black's
      two against Red's one). V2 requires two surviving threats. With one Black odd
      and zero Red odd remaining, V3 applies for Red... wait — V3 is Red's rule. With
      zero Red odd and one Black odd remaining, we check: V1 (no), V2 (no, only one),
      V3 (no, Red has no odd), V4 (no Black even threat given), V5: Draw. One Black
      odd-row threat is insufficient for V2.
  - movestring: PENDING
    why_not: |
      Black holds two odd-row threats in the SAME column. V2 requires SEPARATE
      columns. T4 has already collapsed same-column same-parity pairs to a single
      effective threat — so post-T4 this shouldn't arise. Pre-simplification, the
      same-column pair is a T4 case (no cumulative bonus), not two independent threats.

known_limitations:
  - "V2 is applied AFTER T7 cancellation. Black needs to hold two surviving odd-row threats — meaning Black may need to start with 3+ odd threats if Red also has odd threats, since T7 cancels one pair per Red odd threat."
  - "Allen's diagram label '(Black likes even numbers)' confirms V2 is the even-count analog of V1's odd-count rule."
  - "V2 is checked second among V1–V5. Only if V1 (Red's 3+ threat win) does not apply do we check V2."
  - "T3 can contribute to Black's V2 count: a Black row-2+row-5 pair in one column counts as two virtual odd-threated columns, satisfying V2 from a single physical column."

related:
  - "[[allen-t7]] — cancels one Red-Black pair; reduces Black's count by 1 per Red odd threat"
  - "[[allen-t3]] — Black row-2+row-5 in one column counts as two odd-threated columns for V2"
  - "[[allen-v1]] — Red's 3-threat win (checked first; V2 only fires if V1 does not)"
  - "[[allen-v4]] — Black's alternative win with even-row threat (checked after V2)"
  - "[[allis-claimeven]] — Black's claimeven strategy guarantees the even rows that make odd-row threats effective"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 101:

> **V2: Black wins with two odd-row threats in separate columns.**
>
> Black needs two odd-row threats (that weren't removed earlier by rule T7) to win.
>
> *[Diagram: two separate columns, one with a Black odd-row marker and a Red odd-row marker in the same column → Black wins despite Red's same-column threat.]*
>
> Black's two odd-row threats win despite Red's threats in the same columns. (Black likes even numbers.)

Note: The phrase "despite Red's threats in the same columns" appears in the V2 diagram caption. It refers to a configuration where Black's two odd-row threats occupy columns where Red also has odd-row threats — T4 (same-parity same-column, no interaction) means those Red threats don't cancel Black's. The two Black threats remain decisive.

## Notes

- **"Black likes even numbers":** The complement of G3 ("Red likes odd numbers"). With two uncancelled odd-threated columns, the combined empty-cell count is even, forcing Red to move first into one of them, sacrificing that column's threat — Black wins the other.
- **Why two threats and not one:** With one Black odd-row threat, Red's odd-row threat in a separate column cancels via T7 (odd+odd=even, Red forced first → both cancelled → Draw). Black needs two to survive T7 cancellation while retaining one.
