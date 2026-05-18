---
id: allen-v4
type: victory_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 101 (Victory Rules section, V4)"
  verbatim_quote: |
    V4: Black wins with an even-row threat.

    Black's even-row threat wins only if neither player has a winning odd-row threat.

statement: |
  After T1–T7 simplification, if Black holds at least one major even-row threat and
  neither player has a winning odd-row threat (V1, V2, V3 all failed to fire), Black
  wins. Black's even-row threats are the basis of Black's claimeven strategy: by
  guaranteeing access to even rows, Black wins if no odd-row threat overrides the
  parity advantage. V4 is checked fourth among V1–V5, only after all odd-row victory
  conditions have been evaluated. A Black even-row threat is meaningless if Red holds
  an odd-row threat (V3 fires first); V4 is the tiebreaker in "no odd-row threats for
  either player" positions.

preconditions:
  - "T1–T7 have been applied."
  - "V1, V2, and V3 did not fire (neither player has a winning odd-row configuration)."
  - "Black holds at least one major even-row threat."

formal_predicate: |
  # Input: simplified threat set after T1–T7, after V1/V2/V3 checks failed
  # Output: bool — does V4 apply (Black wins)?

  def v4_black_wins(threats_after_t1_t7):
      red_odd_cols = {t.col for t in threats_after_t1_t7
                      if t.player == RED and t.row % 2 == 1}
      black_odd_cols = {t.col for t in threats_after_t1_t7
                        if t.player == BLACK and t.row % 2 == 1}
      black_even = any(t for t in threats_after_t1_t7
                       if t.player == BLACK and t.row % 2 == 0)
      # V4: no winning odd-row configuration for either player, Black has even-row threat
      no_v1 = not (len(red_odd_cols) >= 3 and len(red_odd_cols) % 2 == 1)
      no_v2 = not (len(black_odd_cols) >= 2 and len(black_odd_cols) % 2 == 0)
      no_v3 = not (len(red_odd_cols) == 1 and len(black_odd_cols) == 0)
      return no_v1 and no_v2 and no_v3 and black_even

worked_examples:
  - movestring: PENDING
    description: |
      After T1–T7, neither player has any odd-row threats. Black holds a major even-row
      threat at (col C, row 4). Red holds no threats. V4 fires: Black wins via the
      even-row claimeven advantage.
    expected_behavior: "solver confirms Black wins; V4 is the deciding rule"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Black holds an even-row threat AND Red holds one odd-row threat (in a different
      column). V3 fires (Red wins with odd-row threat), not V4. V4 explicitly requires
      "neither player has a winning odd-row threat" — Red's odd-row threat overrides
      Black's even-row advantage.
  - movestring: PENDING
    why_not: |
      Red holds an even-row threat, not Black. T6 marks Red's even-row threat as
      worthless; it does not contribute to any V rule. V4 is Black's even-row win
      specifically. Red's even-row threat is irrelevant.

known_limitations:
  - "V4 applies ONLY when no odd-row threats survive T1–T7 for either player. If any player has surviving odd-row threats, V1/V2/V3 will fire before V4 is reached."
  - "Red's even-row threats are worthless (T6); V4 is asymmetric — only Black benefits from even-row threats."
  - "V4 is the formal encoding of Black's claimeven advantage: Black wins in an all-even position because Black naturally fills even rows via the claimeven pairing argument."

related:
  - "[[allen-t6]] — Red's isolated even-row threats are worthless; V4 is not available to Red"
  - "[[allen-v3]] — Red's odd-row win (checked before V4; overrides V4)"
  - "[[allen-v5]] — Draw when even V4 does not fire"
  - "[[allis-claimeven]] — the strategic construction that guarantees Black achieves even rows and fires V4"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 101:

> **V4: Black wins with an even-row threat.**
>
> Black's even-row threat wins only if neither player has a winning odd-row threat.

## Notes

- **V4 is Black's claimeven payoff:** Allis's claimeven strategy (Allis 1988 §6.1) guarantees Black access to even rows. V4 is the endgame formalization of that guarantee: when Black's even-row threat survives to the simplified position without any overriding odd-row threats, Black wins.
- **Asymmetry with T6:** Red's even-row threats are worthless (T6); Black's are decisive (V4). The asymmetry stems from parity: Black moves second, and in a fully filled column Black fills even rows. Red fills odd rows — so Red's even-row threats go against Red's natural parity.
