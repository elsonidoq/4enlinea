---
id: allen-v1
type: victory_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 100 (Victory Rules section, V1)"
  verbatim_quote: |
    V1: Red wins with three major odd-row threats in separate columns.

    Red (First Player) likes odd numbers.

    (With major odd-row threats in four separate columns, Black wins, but this
    situation will be rarer than a four-leaf clover.)

statement: |
  After applying T1–T7 to simplify all major threats, if Red holds three (or any
  odd count ≥ 3) uncancelled odd-row threats in separate columns and Black holds
  none, Red wins. The mechanism is G3: Red likes odd numbers — with an odd count of
  uncancelled odd-threated columns, Red controls zugzwang and will complete one of
  their threats before all columns are exhausted. V1 is scanned first among V1–V5;
  only if V1 does not apply do we proceed to V2. Allen parenthetically notes that
  four separate odd-row threats (an even count) favors Black — "rarer than a
  four-leaf clover" — which is the edge case where V2 fires instead.

preconditions:
  - "T1–T7 have been applied and all threats simplified."
  - "Red holds ≥ 3 uncancelled major odd-row threats in separate columns (odd count)."
  - "This rule is checked FIRST among V1–V5. If it fires, the game is Red's win."

formal_predicate: |
  # Input: simplified threat set after T1–T7
  # Output: bool — does V1 apply (Red wins)?

  def v1_red_wins(threats_after_t1_t7):
      red_odd_cols = {t.col for t in threats_after_t1_t7
                      if t.player == RED and t.row % 2 == 1}
      # V1: odd count ≥ 3 of uncancelled Red odd-row threats in separate columns
      return len(red_odd_cols) >= 3 and len(red_odd_cols) % 2 == 1

  # Note: T7 cancellation is already applied in the input. The count here is
  # the POST-T7 uncancelled count. "Separate columns" is guaranteed because T4
  # has already collapsed same-column same-parity pairs to a single effective
  # threat per column.

worked_examples:
  - movestring: "16213263616"
    description: |
      0-indexed movestring (spec 044 / FR-020a backfill, independently re-verified
      via `optimal_line.mjs`'s solver query against `TOOLS/` conventions and
      `./visualize_board.sh`, not copied from the memory-only table uncritically —
      the memory table's original movestring for V1 (`44452556366`) was checked and
      found NOT to reproduce this pattern on re-verification, so this replacement
      example was constructed and independently solver-confirmed instead). Red holds
      three uncancelled major odd-row threats in separate columns: col0 row0, col4
      row0 (both from a Red horizontal triple at row0 cols1-3), and col6 row4 (from
      a Red vertical triple at col6 rows1-3, atop a single unrelated Black disc at
      col6 row0). Black holds two EVEN-row threats (col0 row1, col4 row1) — these do
      not count toward V1's Red-odd-count and do not block V1. Black to move; the
      solver scores every column -15 for Black (Black loses regardless), consistent
      with V1: Red wins via three separate uncancelled odd-row threats.
    expected_behavior: "solver: all 7 columns score -15 for Black (mover) — Black loses regardless of move; major threats list shows exactly col0 row0 (X), col4 row0 (X), col6 row4 (X) as the odd-row threats (plus two even-row Black threats that don't affect V1's count)"
    solver_verified: 2026-07-11

false_positives:
  - movestring: PENDING
    why_not: |
      Red holds two uncancelled odd-row threats in separate columns after T7 (even
      count). V1 requires an odd count (1 or 3+). Two Red odd-row threats yield a
      Draw, not a Red win (G3: Red likes odd numbers — even count means Red is forced
      first and sacrifices both threats pairwise). V5 fires instead: Draw.
  - movestring: PENDING
    why_not: |
      Red holds three odd-row threats, but two are in the same column. T4 has already
      collapsed same-column same-parity threats, so this scenario shouldn't arise
      post-T4. If pre-simplification, the same-column pair does NOT count as two
      separate odd-threated columns (T4: no cumulative bonus). Post-simplification,
      the column contributes only one effective odd-row threat to V1 counting.

known_limitations:
  - "V1 is checked first among V1–V5. If it fires, no further V rules are evaluated."
  - "The parenthetical about four odd-row threats favoring Black is the V2/V1 boundary: V1 fires at 1 or 3 (odd); at 4 (even) V2 fires for Black. Allen calls 4-threat positions 'rarer than a four-leaf clover.'"
  - "V1 applies only after T1–T7 transformation. Applying V1 to raw threats without prior simplification will produce wrong results."

related:
  - "[[allen-t7]] — cancels Red-Black odd-row threat pairs; must be applied before V1 counting"
  - "[[allen-t4]] — collapses same-column same-parity pairs to a single effective threat"
  - "[[allen-t3]] — row-2+row-5 same player counts as TWO odd-threated columns in V1"
  - "[[allen-v2]] — Black's winning condition (two uncancelled odd-row threats)"
  - "[[allen-v3]] — Red's simpler winning condition (one uncancelled odd-row threat)"
  - "[[allen-v5]] — Draw when neither V1–V4 applies"

last_verified: 2026-07-11
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 100:

> **V1: Red wins with three major odd-row threats in separate columns.**
>
> Red (First Player) likes odd numbers.
>
> *(With major odd-row threats in four separate columns, Black wins, but this situation will be rarer than a four-leaf clover.)*
>
> *[Diagram: three separate columns each with a Red odd-row threat marker → Red wins.]*

## Notes

- **Odd count ≥ 3:** Allen states V1 as "three major odd-row threats." The parenthetical confirms that four (even) favors Black — implying that five would again favor Red. The general rule is "odd count of uncancelled Red odd-row threats = Red wins via V1." In practice three is the only realistic case; five is extremely rare.
- **V1 vs V3:** V3 also gives Red a win (single uncontested odd-row threat). V3 is a strict subset of V1 when we count one as "an odd number." Allen lists them separately because V3 is the most common winning scenario and V1 covers the rarer multi-threat case. The scan order V1→V2→V3→V4→V5 means V1 fires first.
