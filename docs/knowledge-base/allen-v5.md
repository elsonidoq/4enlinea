---
id: allen-v5
type: victory_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 102 (Victory Rules section, V5)"
  verbatim_quote: |
    V5: Otherwise the game is drawn.

    Without a winning threat, no one wins.

statement: |
  If none of V1–V4 applies after T1–T7 simplification, the game is a draw: neither
  player can force a win from the remaining major threat configuration. V5 is the
  catch-all: it fires when the endgame major-threat analysis leaves neither player
  with a decisive advantage. A draw via V5 occurs when all odd-row threats have been
  cancelled by T7, no even-row threats for Black survive, or the position is entirely
  without major threats. It is the formal statement that the T/V framework is
  exhaustive — every simplified position falls into exactly one of V1–V5.

preconditions:
  - "T1–T7 have been applied."
  - "None of V1, V2, V3, or V4 fired."

formal_predicate: |
  # V5 is the else branch of the V1–V4 decision tree.
  # Input: simplified threat set after T1–T7
  # Output: bool — does V5 apply (Draw)?

  def v5_draw(threats_after_t1_t7):
      return (
          not v1_red_wins(threats_after_t1_t7) and
          not v2_black_wins(threats_after_t1_t7) and
          not v3_red_wins(threats_after_t1_t7) and
          not v4_black_wins(threats_after_t1_t7)
      )

  # Concrete conditions that lead to V5:
  # - All odd-row threats cancelled by T7 (e.g., 1 Red odd + 1 Black odd → both gone)
  # - Zero remaining threats of any kind
  # - Black even-row threat exists but was already counted (V4 fired) — V5 doesn't
  #   coexist with V4

worked_examples:
  - movestring: PENDING
    description: |
      After T1–T7, Red has one odd-row threat and Black has one odd-row threat in a
      different column. T7 cancels both. Remaining: no threats. V1/V2/V3/V4 all fail.
      V5: Draw.
    expected_behavior: "solver confirms Draw; T7 cancellation leaves no winning threats for either player"
    solver_verified: PENDING
  - movestring: PENDING
    description: |
      After T1–T7, neither player has any remaining major threats. Position will play
      out with no decisive winner. V5: Draw.
    expected_behavior: "solver score 0 (Draw)"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Red has one odd-row threat with no Black odd-row threats. V3 fires (Red wins),
      not V5. V5 only applies when V3 explicitly did not fire. A naive check that
      looks for "no threats" before checking all V rules would miss this.

known_limitations:
  - "V5 is the exhaustive catch-all. The T/V framework does not predict every draw — only draws arising from simplified major-threat configurations. Mid-game positions may require deeper search."
  - "V5 covers the case where the position has no major threats at all (empty threat set after T1–T7 — a fully quiescent position with no latent winning lines)."

related:
  - "[[allen-v1]] — Red win (checked before V5)"
  - "[[allen-v2]] — Black win (checked before V5)"
  - "[[allen-v3]] — Red win (checked before V5)"
  - "[[allen-v4]] — Black even-row win (checked before V5)"
  - "[[allen-t7]] — the most common cause of V5: T7 cancels all remaining odd-row threats"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 102:

> **V5: Otherwise the game is drawn.**
>
> Without a winning threat, no one wins.

## Notes

- **V5 as the completeness statement:** The existence of V5 as the final rule confirms that Allen's T/V framework is exhaustive — every simplified endgame position maps to exactly one outcome (Red wins, Black wins, or Draw). The framework's predictive power depends on correctly applying T1–T7 first.
- **Most common cause:** V5 most often fires after T7 cancellation of a single Red-Black odd-row pair. The endgame table row "1 Red odd, 1 Black odd → Draw" is V5 after T7.
