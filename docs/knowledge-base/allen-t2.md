---
id: allen-t2
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 97 (Transformation Rules section, T2)"
  verbatim_quote: |
    T2: Threats may neutralize (undercut) opponents threats with opposite row parity.

    A Red even-row threat neutralizes any Black odd-row threat above it.

    A Black even-row threat neutralizes any Red odd-row threat above it.

    A Red odd-row threat neutralizes a Black even-row threat immediately above it.

statement: |
  When two major threats from opposite players share the same column and have
  opposite row parity (one odd, one even), the lower threat undercuts the upper.
  Because gravity forces the column to fill bottom-up, the player whose threat is
  lower will complete their winning line before the opponent reaches theirs above it.
  T2 covers three sub-cases: (1) Red even-row threat below any Black odd-row threat
  above it — Red's threat is reached first, neutralizing Black's; (2) Black even-row
  threat below any Red odd-row threat above it — Black's threat is reached first,
  neutralizing Red's; (3) Red odd-row threat immediately below a Black even-row threat
  at row r+1 — the Red threat at row r neutralizes the Black threat at row r+1 (this
  is the adjacent-row sub-case of cross-parity, complementary to T1 which covers
  same-player adjacent pairs).

preconditions:
  - "Two major threats exist in the same column, belonging to opposite players."
  - "The two threats are at rows with opposite parity (one odd, one even)."
  - "The lower threat is not itself already dead or undercut by a third threat below it."
  - "T1 has already been checked and does not apply (T1 requires same player)."

formal_predicate: |
  # Input: set of major threats T = {(player, col, row), ...}
  # Output: set of threats that are neutralized (undercut) by T2

  def t2_neutralized(threats):
      neutralized = set()
      by_col = {}
      for t in threats:
          by_col.setdefault(t.col, []).append(t)
      for col, col_threats in by_col.items():
          # Sort by row ascending (lower row = reached first)
          col_threats.sort(key=lambda t: t.row)
          for i in range(len(col_threats)):
              for j in range(i+1, len(col_threats)):
                  lower, upper = col_threats[i], col_threats[j]
                  if lower.player != upper.player:  # opposite players
                      if lower.row % 2 != upper.row % 2:  # opposite parity
                          # Sub-case 3 (lower=odd, upper=even) requires immediately adjacent rows
                          if lower.row % 2 == 1 and upper.row != lower.row + 1:
                              continue  # adjacency required for sub-case 3
                          # Lower threat neutralizes upper threat
                          neutralized.add((upper.player, upper.col, upper.row))
      return neutralized

  # Effect: neutralized threats are removed from the threat set before V1–V5 counting.
  # A neutralized threat contributes zero to its owner's odd-threated column count.
  # Sub-case 3 (Red odd at r, Black even at r+1) is included: parity check catches it
  # because odd ≠ even, and lower Red threat neutralizes upper Black threat.

worked_examples:
  - movestring: "442435355667716253"
    description: |
      Black has an even-row major threat at (col 4, row 4); Red has a major threat at
      (col 4, row 5). Black's row-4 threat undercuts Red's row-5 threat — Black
      reaches C4 first, winning before Red can use C5. T2 sub-case 2: Black even below
      Red odd. Additional Black threats at col2 row4 and col3 row4 also present; col4
      interaction is the decisive factor.
    expected_behavior: "solver confirms Black wins; Red's col4 row5 threat is rendered irrelevant by Black's col4 row4 threat"
    solver_verified: true

  - movestring: "123432411325112233"
    description: |
      Red has an even-row major threat at (col 4, row 4); Black has a major threat at
      (col 4, row 5). Red's row-4 threat undercuts Black's row-5 threat. T2 sub-case 1.
    expected_behavior: "solver confirms Red wins; Black's col4 row5 threat neutralized by Red's col4 row4 threat"
    solver_verified: true

false_positives:
  - movestring: "1115222555577773663636617"
    why_not: |
      Red has two odd-row threats in col 4 at rows 3 and 5 (same player, same parity).
      T2 requires OPPOSITE players; this is a same-player same-parity pair — T4 applies,
      not T2. A naive predicate checking only "two threats in same column with different
      rows" without checking (a) opposite players and (b) opposite parity would
      incorrectly fire T2 here.
  - movestring: PENDING
    why_not: |
      Two same-player threats with opposite parity in the same column (e.g., Red at row
      3 odd and Red at row 4 even). T2 requires OPPOSITE players. Same-player opposite-
      parity pair is T3 territory if rows are 2+5, otherwise unspecified (not T2).

known_limitations:
  - "T2 applies only to MAJOR threats. A minor threat below a major threat does not automatically neutralize it via T2 — the minor threat must first become a major threat through additional play."
  - "Neutralization is one-directional: the lower threat neutralizes the upper. The lower threat itself is NOT neutralized — it remains fully active."
  - "T2 does not apply when the two threats have the same parity — that is T4 territory (same parity, no interaction). Must verify opposite parity before applying T2."
  - "T1 must be checked first: if the two threats are same-player AND adjacent rows, T1 fires instead (guaranteed win, not neutralization)."

related:
  - "[[allen-t1]] — same-player adjacent pair (check T1 before T2; T1 gives a win, not just neutralization)"
  - "[[allen-t4]] — same-parity same-column pair (complementary: no interaction instead of undercut)"
  - "[[allen-t5]] — row 3 + row 6 special case (no interaction, though different parity; see T5 known_limitations)"
  - "[[allen-t7]] — cross-column odd-threat cancellation (different mechanism: zugzwang, not undercut)"
  - "[[allen-v3]] — surviving Red odd-row threat after T2 neutralizations is a V3 win"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 97:

> **T2: Threats may neutralize (undercut) opponents threats with opposite row parity.**
>
> A Red even-row threat neutralizes any Black odd-row threat above it.
>
> *[Diagram sub-case 1: column sketch with Red even-row marker low, Black odd-row marker high → reduced to Red even-row marker only.]*
>
> A Black even-row threat neutralizes any Red odd-row threat above it.
>
> *[Diagram sub-case 2: column sketch with Black even-row marker low, Red odd-row marker high → reduced to Black even-row marker only.]*
>
> A Red odd-row threat neutralizes a Black even-row threat immediately above it.
>
> *[Diagram sub-case 3: column sketch with Red odd-row marker low, Black even-row marker one row above → reduced to Red odd-row marker only.]*

## Notes

- **Three sub-cases:** Allen presents three distinct column diagrams for T2, one per sub-case. Sub-cases 1 and 2 cover any distance between the threats (Red/Black even-row threat neutralizes opponent's odd-row threat anywhere above). Sub-case 3 is restricted to the immediately-adjacent case (Red odd at r, Black even at r+1 only). This asymmetry is important: the "Black even neutralizes Red odd" direction works at any height separation; the "Red odd neutralizes Black even" direction only works when the Black even cell is *immediately* above.
- **Relationship to T5:** Row 3 (odd) + row 6 (even) in the same column are opposite parity, so T2 would naively fire and say the lower odd-row threat undercuts the upper even-row threat. But T5 says they *don't* interact. T5 is a special case that overrides T2's general claim for the specific row-3+row-6 combination. Implementation must check T5 before T2 for this specific pair.
