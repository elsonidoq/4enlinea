---
id: allis-baseclaim
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.7, p. 41-42 (formal definition)"
  verbatim_quote: |
    Baseclaim formally:

    Required: Three directly playable squares and the square above the second
    playable square. The non-playable square must be even.

    Solutions: All groups which contain the first playable square and the square
    above the second playable square. All groups which contain the second and third
    playable square.

statement: |
  A Baseclaim combines a Claimeven with two Baseinverses to refute groups that
  neither Claimeven nor Baseinverse alone can handle. It requires three directly
  playable squares (call them P1, P2, P3) and the non-playable even square directly
  above P2 (call it E). The controller guarantees: whichever of P1, P2, or P3 White
  plays first, Black can respond to ensure both relevant groups are blocked. The rule
  is named for its "Base" (directly playable square) plus "claim" (even square above):
  the second playable square P2 participates in both a Claimeven (with E above it)
  and a Baseinverse (with P3). Either mechanism fires depending on White's first move.

preconditions:
  - "Three directly playable squares P1, P2, P3 (bottom-most empty in their columns) exist."
  - "The square E directly above P2 is empty and EVEN."
  - "E is NOT directly playable (P2 must be played first to reveal E)."
  - "P1, P2, P3 are in different columns."

formal_predicate: |
  # Input: three directly playable squares P1, P2, P3 and the even square E above P2
  # Output: bool — can Baseclaim be applied?

  def can_baseclaim(board, col_p1, col_p2, col_p3):
      def playable_row(board, col):
          for r in range(1, 7):
              if board[col][r] == EMPTY:
                  return r
          return None

      r1 = playable_row(board, col_p1)
      r2 = playable_row(board, col_p2)
      r3 = playable_row(board, col_p3)
      if r1 is None or r2 is None or r3 is None:
          return False
      r2_above = r2 + 1
      return (
          len({col_p1, col_p2, col_p3}) == 3  # distinct columns
          and r2_above <= 6
          and r2_above % 2 == 0               # E = square above P2 must be even
          and board[col_p2][r2_above] == EMPTY
      )

  # Solutions:
  #   1. All groups containing P1 AND E (= col_p2, r2+1).
  #   2. All groups containing P2 AND P3.
  #
  # Strategy (from Allis §6.7):
  #   - If White plays P1: Black plays E; then Baseinverse at P2-P3 handles remaining.
  #   - If White plays P2: Black plays E (Claimeven fires); then Baseinverse at P1-P2... 
  #     wait — P2 is taken, so Baseinverse at P1-col_p2 row r2_above? 
  #     Actually: Black plays E, then Baseinverse at P1-(col_p2,above) applies.
  #     Actually per Allis: "White plays c1. Black plays e1 and a Claimeven at c1-c2 can be used."
  #   - If White plays P3: Black plays P2; Claimeven at P2-E then handles P1-related groups.

worked_examples:
  - movestring: PENDING
    description: |
      Three directly playable squares at b1, c1, e1 with e2 being the even square
      above c1 (=E). White threatens b1-e4 (needs b1 and e4) and c1-f1 (needs c1
      and f1). Baseclaim at b1, c1, e1 with E=c2 handles both: 
      - White plays b1 → Black plays e1 + Claimeven at c1-c2 solves b1-e4.
      - White plays c1 → Black plays e1 + Baseinverse at b1-c2 solves b1-e4.
      - White plays e1 → Black plays c1 + Baseinverse at b1-c2 solves b1-e4.
    expected_behavior: "solver confirms Black refutes both White threats; Baseclaim is the refutation"
    solver_verified: PENDING

false_positives:
  - movestring: PENDING
    why_not: |
      Three directly playable squares but the square above P2 is ODD (not even).
      Baseclaim requires E to be even. An odd square above P2 would mean the pair
      P2-E forms a Vertical, not a Claimeven — the Baseclaim structure breaks.
  - movestring: PENDING
    why_not: |
      The square above P2 is even but NOT empty (already occupied by a disc).
      Baseclaim requires E to be empty and non-playable. An occupied square cannot
      serve as the Claimeven target.

known_limitations:
  - "Baseclaim is a compound rule — it requires exactly the P1-P2-P3-E configuration. It cannot be generalized to more than three playable squares or to non-adjacent column arrangements without separate analysis."
  - "Allis §6.10 notes that Baseclaim was added specifically for 'special positions encountered where the evaluation function did not find a solution.' Its practical frequency is low: 'The impact of these two rules is probably not significant.'"
  - "Combination constraints (§7.4): Baseclaim can be combined with other rules if their square sets are disjoint. The two special squares (P1 and E, P2 and P3) are 'said never to equal the squares of the other rule' for Specialbefore-type combinations."

related:
  - "[[allis-claimeven]] — the Claimeven component of Baseclaim (P2-E pair)"
  - "[[allis-baseinverse]] — the two Baseinverse components of Baseclaim (P1-P3 and P1-E pairings)"
  - "[[allis-specialbefore]] — added at the same time as Baseclaim for similar 'special positions'"

last_verified: 2026-05-17
---

## Verbatim source

From Allis 1988, *A Knowledge-based Approach of Connect-Four*, Chapter 6 §6.7:

> **Baseclaim formally:**
>
> Required: Three directly playable squares and the square above the second playable square. The non-playable square must be even.
>
> Solutions: All groups which contain the first playable square and the square above the second playable square. All groups which contain the second and third playable square.

(Informal context from §6.7: "Since b1-e4 is solved sometimes by a Claimeven and sometimes by a Baseinverse, the name Baseclaim is chosen. In general we need three directly playable squares and an even square directly above one of these squares.")

## Notes

- **Low-frequency rule:** Allis explicitly notes Baseclaim was added for edge cases: "Detailed analysis then showed the general conditions for these rules. The impact of these two rules is probably not significant. The costs are low also, and therefore this knowledge has been added to the evaluation function." Implementers can skip Baseclaim for initial versions with low risk of missing many positions.
- **Naming:** "Base" = bottom (directly playable = base of column); "claim" = the even square above P2 that gets claimed via Claimeven.
